// Pure function mapping sung/played pitches onto guitar fretboard positions.
// Guitar positions use sounding pitch (MIDI arithmetic), not written pitch:
// guitar music is written an octave higher than it sounds.
//
// Takes an array of target MIDI notes so it works for both a single note and
// a chord (multiple simultaneous notes) with the same logic.

import type { Tuning } from './tunings';

export interface FretPosition {
  string: number; // 0-indexed, 0 = lowest string (tuning.notes[0])
  fret: number;
  /** Which target MIDI note this position matches exactly (see `exact`/`echoes`). */
  midi: number;
}

export interface FretboardPositions {
  /** Positions that are an exact target MIDI pitch. */
  exact: FretPosition[];
  /** Positions that share a target's pitch class, in a different octave. */
  echoes: FretPosition[];
  /** Whether every target MIDI pitch falls within the tuning's overall range. */
  inRange: boolean;
}

export function computeFretboardPositions(
  tuning: Tuning,
  targets: number[],
  frets: number,
): FretboardPositions {
  const exact: FretPosition[] = [];
  const echoes: FretPosition[] = [];
  const targetSet = new Set(targets);
  const targetClasses = new Set(targets.map((m) => ((m % 12) + 12) % 12));

  for (let s = 0; s < tuning.notes.length; s++) {
    for (let f = 0; f <= frets; f++) {
      const m = tuning.notes[s] + f;
      const pitchClass = ((m % 12) + 12) % 12;
      if (!targetClasses.has(pitchClass)) continue;
      if (targetSet.has(m)) {
        exact.push({ string: s, fret: f, midi: m });
      } else {
        echoes.push({ string: s, fret: f, midi: m });
      }
    }
  }

  const lo = tuning.notes[0];
  const hi = tuning.notes[tuning.notes.length - 1] + frets;
  const inRange = targets.length > 0 && targets.every((m) => m >= lo && m <= hi);

  return { exact, echoes, inRange };
}
