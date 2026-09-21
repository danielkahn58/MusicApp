import { describe, expect, it } from 'vitest';
import { MAJOR_CHORDS, MINOR_CHORDS, chordTones, chordName, chordKey } from '../src/music/chords';

describe('chords', () => {
  it('has all 12 major and 12 minor chords, one per pitch class', () => {
    expect(MAJOR_CHORDS).toHaveLength(12);
    expect(MINOR_CHORDS).toHaveLength(12);
    expect(MAJOR_CHORDS.map((c) => c.root)).toEqual([...Array(12).keys()]);
    expect(MINOR_CHORDS.map((c) => c.root)).toEqual([...Array(12).keys()]);
  });

  it('builds a C major triad', () => {
    expect(chordTones({ root: 0, quality: 'major' })).toEqual([60, 64, 67]);
  });

  it('builds an A minor triad', () => {
    expect(chordTones({ root: 9, quality: 'minor' })).toEqual([69, 72, 76]);
  });

  it('names chords with sharps and flats', () => {
    expect(chordName({ root: 0, quality: 'major' }, false)).toBe('C');
    expect(chordName({ root: 9, quality: 'minor' }, false)).toBe('Am');
    expect(chordName({ root: 1, quality: 'major' }, false)).toBe('C♯');
    expect(chordName({ root: 1, quality: 'major' }, true)).toBe('D♭');
  });

  it('produces a stable, unique key per chord', () => {
    expect(chordKey({ root: 0, quality: 'major' })).not.toBe(chordKey({ root: 0, quality: 'minor' }));
    expect(chordKey({ root: 0, quality: 'major' })).toBe(chordKey({ root: 0, quality: 'major' }));
  });
});
