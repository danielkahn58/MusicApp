import { describe, expect, it } from 'vitest';
import { computeFretboardPositions } from '../src/music/fretboard-positions';
import { findTuning } from '../src/music/tunings';
import { chordTones } from '../src/music/chords';

const FRETS = 17;

describe('fretboard-positions', () => {
  it('finds A3 on standard tuning', () => {
    const std = findTuning('std');
    const { exact } = computeFretboardPositions(std, [57], FRETS); // A3 = 57
    // string numbers in musical convention are 6 - index
    const named = exact.map((p) => ({ string: 6 - p.string, fret: p.fret }));
    expect(named).toEqual(
      expect.arrayContaining([
        { string: 3, fret: 2 },
        { string: 4, fret: 7 },
        { string: 5, fret: 12 },
        { string: 6, fret: 17 },
      ]),
    );
    expect(named).toHaveLength(4);
  });

  it('drops the 6th-string fret-17 spot for A3 in drop D', () => {
    const dropD = findTuning('dropd');
    const { exact } = computeFretboardPositions(dropD, [57], FRETS);
    const named = exact.map((p) => ({ string: 6 - p.string, fret: p.fret }));
    expect(named).not.toContainEqual({ string: 6, fret: 17 });
    expect(named).toEqual(
      expect.arrayContaining([
        { string: 3, fret: 2 },
        { string: 4, fret: 7 },
        { string: 5, fret: 12 },
      ]),
    );
  });

  it('C2 is out of range for standard tuning', () => {
    const std = findTuning('std');
    const { exact, inRange } = computeFretboardPositions(std, [36], FRETS); // C2 = 36
    expect(exact).toHaveLength(0);
    expect(inRange).toBe(false);
  });

  it('finds multiple exact positions at once for a chord (C major)', () => {
    const std = findTuning('std');
    const cMajor = chordTones({ root: 0, quality: 'major' }); // [60, 64, 67]
    const { exact } = computeFretboardPositions(std, cMajor, FRETS);
    expect(exact.length).toBeGreaterThan(0);
    for (const pos of exact) {
      expect(cMajor).toContain(pos.midi);
      expect(std.notes[pos.string] + pos.fret).toBe(pos.midi);
    }
  });
});
