// getUserMedia, AudioContext wiring, the analyser polling loop, and error
// mapping. This module is intentionally impure (browser APIs); pitch
// detection itself lives in yin.ts and note stabilization in stabilizer.ts.

import { ensureAudioContext, resumeAudioContext } from './tone';
import { yinDetect, YIN_WINDOW } from './yin';

const POLL_INTERVAL_MS = 40;
const CLARITY_THRESHOLD = 0.85;
const CONTEXT_RESUME_TIMEOUT_MS = 1500;

/** RMS gate a frame must clear to be considered for pitch detection. Sensitivity is 1 (quiet) to 10 (loud). */
export function sensitivityGate(sensitivity: number): number {
  return 0.0015 * Math.pow(1.45, 10 - sensitivity);
}

interface SelfTop {
  self: unknown;
  top: unknown;
}

export function isEmbedded(win: SelfTop = window): boolean {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

export function checkMicSupport(nav: Navigator = navigator): string | null {
  if (!nav.mediaDevices || !nav.mediaDevices.getUserMedia) {
    return 'This browser cannot open a microphone on this page. Try Chrome, Safari, or Firefox over https.';
  }
  return null;
}

interface PermissionsPolicyLike {
  allowsFeature?: (feature: string) => boolean;
}

export function checkPermissionsPolicy(doc: Document = document): string | null {
  const anyDoc = doc as Document & {
    permissionsPolicy?: PermissionsPolicyLike;
    featurePolicy?: PermissionsPolicyLike;
  };
  const pp = anyDoc.permissionsPolicy || anyDoc.featurePolicy;
  if (pp && typeof pp.allowsFeature === 'function' && !pp.allowsFeature('microphone')) {
    return 'The page hosting this artifact does not allow microphone access. Open it in its own browser tab, or save the page and open the file directly. Tapping piano keys still works.';
  }
  return null;
}

export function mapGetUserMediaError(err: unknown, embedded: boolean): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : undefined;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return embedded
      ? 'Microphone access was blocked. This page is embedded, so the host may not allow the mic. Open it in its own tab, or allow the microphone in your browser’s site settings.'
      : 'Microphone access was blocked. Allow the microphone in your browser’s site settings, then press Start again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone found. Plug one in and press Start again.';
  }
  return 'The microphone could not start (' + (name || 'unknown error') + '). Press Start again.';
}

export const AUDIO_SUSPENDED_MESSAGE =
  'The browser paused audio for this page. Press Start listening once more.';

export interface MicHandlers {
  /** Called on every loop tick (~every 40ms), before gating — drives hold-timeout checks. */
  onTick(nowMs: number): void;
  /** Normalized 0..1-ish input level, for the level meter. */
  onLevel(level: number): void;
  /** Called only for frames that pass the sensitivity gate and clarity threshold. */
  onFrame(freq: number, nowMs: number): void;
  onError(message: string): void;
  onStatusChange(running: boolean): void;
}

export interface MicController {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  /** Ignore mic input for `ms` — call after playing a tone so the app doesn't listen to its own speaker. */
  muteFor(ms: number): void;
}

export function createMicController(
  getSensitivityGate: () => number,
  handlers: MicHandlers,
): MicController {
  let stream: MediaStream | null = null;
  let analyser: AnalyserNode | null = null;
  let buf: Float32Array<ArrayBuffer> | null = null;
  let running = false;
  let mutedUntil = 0;
  let lastPoll = 0;

  function muteFor(ms: number): void {
    mutedUntil = performance.now() + ms;
  }

  function loop(t: number): void {
    if (!running) return;
    requestAnimationFrame(loop);
    if (t - lastPoll < POLL_INTERVAL_MS) return;
    lastPoll = t;

    handlers.onTick(t);

    const a = analyser;
    const b = buf;
    if (!a || !b) return;
    a.getFloatTimeDomainData(b);

    let sum = 0;
    for (let i = 0; i < YIN_WINDOW; i++) sum += b[i] * b[i];
    const rms = Math.sqrt(sum / YIN_WINDOW);
    handlers.onLevel(Math.min(1, Math.sqrt(rms / 0.15)));

    if (performance.now() < mutedUntil) return;
    if (rms > getSensitivityGate()) {
      const ctx = ensureAudioContext();
      const result = yinDetect(b, ctx.sampleRate);
      if (result && result.clarity > CLARITY_THRESHOLD) {
        handlers.onFrame(result.freq, t);
      }
    }
  }

  async function start(): Promise<void> {
    const supportError = checkMicSupport();
    if (supportError) {
      handlers.onError(supportError);
      return;
    }
    const policyError = checkPermissionsPolicy();
    if (policyError) {
      handlers.onError(policyError);
      return;
    }

    // Must create/resume the context synchronously, before the getUserMedia
    // await, or Safari drops the user-gesture and resume() hangs.
    let ctx: AudioContext | null = null;
    try {
      ctx = resumeAudioContext();
    } catch {
      // handled by the state check below
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      handlers.onError(mapGetUserMediaError(err, isEmbedded()));
      return;
    }

    try {
      if (ctx && ctx.state !== 'running') {
        await Promise.race([
          ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, CONTEXT_RESUME_TIMEOUT_MS)),
        ]);
      }
      if (!ctx || ctx.state !== 'running') throw new Error('suspended');

      const source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      buf = new Float32Array(analyser.fftSize);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
      handlers.onError(AUDIO_SUSPENDED_MESSAGE);
      return;
    }

    running = true;
    handlers.onStatusChange(true);
    requestAnimationFrame(loop);
  }

  function stop(): void {
    running = false;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    analyser = null;
    buf = null;
    handlers.onStatusChange(false);
  }

  function isRunning(): boolean {
    return running;
  }

  return { start, stop, isRunning, muteFor };
}
