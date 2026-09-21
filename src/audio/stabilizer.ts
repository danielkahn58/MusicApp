// Turns a stream of raw frequency estimates into a stable displayed note.
// Pure and DOM-free: time is passed in explicitly so it is unit-testable
// without faking timers.
//
// Rules (see brief): keep a median of the last 5 fractional-MIDI frames;
// only switch the displayed note once the same rounded note wins 3 frames
// in a row (or it already matches the current note, so cents can update
// every frame); after `holdTimeoutMs` without an accepted frame, go held.

import { freqToMidi, centsOffset } from '../music/notes';

const HISTORY_SIZE = 5;
const CONSENSUS_FRAMES = 3;
export const HOLD_TIMEOUT_MS = 350;

export interface StabilizerResult {
  midi: number;
  cents: number;
  freq: number;
}

interface HistoryFrame {
  midi: number;
  freq: number;
}

export class Stabilizer {
  private history: HistoryFrame[] = [];
  private candidateMidi = -1;
  private candidateCount = 0;
  private currentMidi: number | null = null;
  private lastAcceptedTime = 0;
  private live = false;

  /** Feed one accepted (gate + clarity passed) frequency estimate. */
  pushFrame(freq: number, nowMs: number): StabilizerResult | null {
    const fractionalMidi = freqToMidi(freq);
    this.history.push({ midi: fractionalMidi, freq });
    if (this.history.length > HISTORY_SIZE) this.history.shift();
    this.lastAcceptedTime = nowMs;

    const sorted = [...this.history].sort((a, b) => a.midi - b.midi);
    const median = sorted[sorted.length >> 1];
    const rounded = Math.round(median.midi);

    if (rounded === this.candidateMidi) this.candidateCount++;
    else {
      this.candidateMidi = rounded;
      this.candidateCount = 1;
    }

    if (this.candidateCount >= CONSENSUS_FRAMES || rounded === this.currentMidi) {
      this.currentMidi = rounded;
      this.live = true;
      return { midi: rounded, cents: centsOffset(median.midi, rounded), freq: median.freq };
    }
    return null;
  }

  /** Call every loop tick; returns true the moment it transitions to held. */
  checkHold(nowMs: number, timeoutMs: number = HOLD_TIMEOUT_MS): boolean {
    if (this.live && nowMs - this.lastAcceptedTime > timeoutMs) {
      this.live = false;
      this.history = [];
      this.candidateMidi = -1;
      this.candidateCount = 0;
      return true;
    }
    return false;
  }

  get isLive(): boolean {
    return this.live;
  }

  get midi(): number | null {
    return this.currentMidi;
  }

  /** Force the current note (e.g. a tapped piano key), bypassing consensus. */
  setMidi(midi: number): void {
    this.currentMidi = midi;
    this.history = [];
    this.candidateMidi = -1;
    this.candidateCount = 0;
    this.live = false;
  }

  reset(): void {
    this.history = [];
    this.candidateMidi = -1;
    this.candidateCount = 0;
    this.currentMidi = null;
    this.live = false;
  }
}
