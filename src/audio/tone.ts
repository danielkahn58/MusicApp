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

export type Instrument = 'piano' | 'guitar';

function playPianoVoice(ctx: AudioContext, freq: number): void {
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

// A plucked-string approximation: a brighter sawtooth run through a
// lowpass filter whose cutoff starts high and decays quickly (the
// harmonics of a plucked string die out faster than the fundamental),
// with a quicker amplitude decay than the piano voice. Pure synthesis, no
// sampled instruments anywhere in this app.
function playGuitarVoice(ctx: AudioContext, freq: number): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.Q.value = 0.7;
  const t = ctx.currentTime;
  filter.frequency.setValueAtTime(Math.min(freq * 10, 9000), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 300), t + 0.35);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.2);
}

function playVoice(ctx: AudioContext, freq: number, instrument: Instrument): void {
  if (instrument === 'guitar') playGuitarVoice(ctx, freq);
  else playPianoVoice(ctx, freq);
}

export function playTone(midi: number, instrument: Instrument = 'piano'): void {
  try {
    const c = resumeAudioContext();
    playVoice(c, midiToFreq(midi), instrument);
  } catch {
    // audio unavailable; nothing to do
  }
}

/** Plays several notes at once (e.g. a chord) as simultaneous oscillators. */
export function playChord(midis: number[], instrument: Instrument = 'piano'): void {
  try {
    const c = resumeAudioContext();
    for (const midi of midis) playVoice(c, midiToFreq(midi), instrument);
  } catch {
    // audio unavailable; nothing to do
  }
}
