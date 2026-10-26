// Pure chord data and helpers. No DOM.

import { pitchClassName, DEFAULT_OCTAVE_MIDI } from './notes';

export type ChordQuality = 'major' | 'minor';

export interface Chord {
  root: number; // pitch class, 0 = C
  quality: ChordQuality;
}

const CHORD_INTERVALS: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
};

export function chordTones(chord: Chord, rootOctaveMidi: number = DEFAULT_OCTAVE_MIDI): number[] {
  const root = rootOctaveMidi + chord.root;
  return CHORD_INTERVALS[chord.quality].map((interval) => root + interval);
}

export function chordName(chord: Chord, useFlats: boolean): string {
  return pitchClassName(chord.root, useFlats) + (chord.quality === 'minor' ? 'm' : '');
}

export function chordKey(chord: Chord): string {
  return `${chord.root}:${chord.quality}`;
}

export const MAJOR_CHORDS: Chord[] = Array.from({ length: 12 }, (_, root) => ({
  root,
  quality: 'major' as const,
}));

export const MINOR_CHORDS: Chord[] = Array.from({ length: 12 }, (_, root) => ({
  root,
  quality: 'minor' as const,
}));
