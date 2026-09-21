// Pure function mapping a sung pitch onto guitar fretboard positions.
// Guitar positions use sounding pitch (MIDI arithmetic), not written pitch:
// guitar music is written an octave higher than it sounds.

import type { Tuning } from './tunings';

export interface FretPosition {
  string: number; // 0-indexed, 0 = lowest string (tuning.notes[0])
  fret: number;
}

export interface FretboardPositions {
  /** Positions that are the exact MIDI pitch sung. */
  exact: FretPosition[];
  /** Positions that share the same pitch class, in a different octave. */
  echoes: FretPosition[];
  /** Whether the exact MIDI pitch falls within the tuning's overall range. */
  inRange: boolean;
}

export function computeFretboardPositions(
  tuning: Tuning,
  midi: number,
  frets: number,
): FretboardPositions {
  const exact: FretPosition[] = [];
  const echoes: FretPosition[] = [];
  const targetClass = ((midi % 12) + 12) % 12;

  for (let s = 0; s < tuning.notes.length; s++) {
    for (let f = 0; f <= frets; f++) {
      const m = tuning.notes[s] + f;
      if (((m % 12) + 12) % 12 !== targetClass) continue;
      if (m === midi) {
        exact.push({ string: s, fret: f });
      } else {
        echoes.push({ string: s, fret: f });
      }
    }
  }

  const lo = tuning.notes[0];
  const hi = tuning.notes[tuning.notes.length - 1] + frets;
  const inRange = midi >= lo && midi <= hi;

  return { exact, echoes, inRange };
}
