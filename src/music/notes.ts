// Pure MIDI <-> note-name/frequency helpers. No DOM.

export const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
export const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const;

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function pitchClassName(midi: number, useFlats: boolean): string {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[(((midi % 12) + 12) % 12) as number];
}

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function noteName(midi: number, useFlats: boolean): string {
  return pitchClassName(midi, useFlats) + octaveOf(midi);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

// cents deviation of a fractional MIDI value from its nearest rounded note.
export function centsOffset(fractionalMidi: number, roundedMidi: number): number {
  return (fractionalMidi - roundedMidi) * 100;
}
