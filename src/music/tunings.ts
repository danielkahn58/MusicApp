// Guitar tuning data. Notes are MIDI numbers, low string to high string.
// To add a tuning, add one entry here — the select in the UI and the
// fretboard logic both pick it up automatically.

export interface Tuning {
  id: string;
  name: string;
  notes: number[];
}

export const TUNINGS: Tuning[] = [
  { id: 'std', name: 'Standard (E A D G B E)', notes: [40, 45, 50, 55, 59, 64] },
  { id: 'dropd', name: 'Drop D (D A D G B E)', notes: [38, 45, 50, 55, 59, 64] },
  { id: 'half', name: 'Half step down (E♭ tuning)', notes: [39, 44, 49, 54, 58, 63] },
  { id: 'full', name: 'Whole step down (D tuning)', notes: [38, 43, 48, 53, 57, 62] },
  { id: 'dadgad', name: 'DADGAD', notes: [38, 45, 50, 55, 57, 62] },
  { id: 'opg', name: 'Open G (D G D G B D)', notes: [38, 43, 50, 55, 59, 62] },
  { id: 'opd', name: 'Open D (D A D F♯ A D)', notes: [38, 45, 50, 54, 57, 62] },
];

export const DEFAULT_TUNING = TUNINGS[0];

export function findTuning(id: string): Tuning {
  return TUNINGS.find((t) => t.id === id) || DEFAULT_TUNING;
}
