// Playback oscillator, and the shared AudioContext singleton used by both
// tone playback and the mic analyser (mic.ts imports ensureAudioContext).
//
// Gotcha: on Safari the AudioContext must be created and resume()d
// synchronously inside the user-gesture click handler, before any await —
// resume() hangs if the gesture has already been "spent" (e.g. by an
// intervening permission prompt). Callers must call resumeAudioContext()
// directly from their click handler, not from inside an async function.

import { midiToFreq } from '../music/notes';

export const TONE_MUTE_MS = 1600;

let ctx: AudioContext | null = null;

export function ensureAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export function resumeAudioContext(): AudioContext {
  const c = ensureAudioContext();
  c.resume();
  return c;
}

function playOscillator(ctx: AudioContext, freq: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.5);
}

export function playTone(midi: number): void {
  try {
    const c = resumeAudioContext();
    playOscillator(c, midiToFreq(midi));
  } catch {
    // audio unavailable; nothing to do
  }
}

/** Plays several notes at once (e.g. a chord) as simultaneous oscillators. */
export function playChord(midis: number[]): void {
  try {
    const c = resumeAudioContext();
    for (const midi of midis) playOscillator(c, midiToFreq(midi));
  } catch {
    // audio unavailable; nothing to do
  }
}
