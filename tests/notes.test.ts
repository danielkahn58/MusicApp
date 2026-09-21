import { describe, expect, it } from 'vitest';
import { midiToFreq, freqToMidi, noteName, pitchClassName, octaveOf, centsOffset } from '../src/music/notes';

describe('notes', () => {
  it('A4 is MIDI 69 at 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(freqToMidi(440)).toBeCloseTo(69, 6);
  });

  it('C2 is MIDI 36', () => {
    expect(noteName(36, false)).toBe('C2');
  });

  it('names sharps', () => {
    expect(pitchClassName(61, false)).toBe('C♯'); // C#4
    expect(octaveOf(61)).toBe(4);
  });

  it('names flats', () => {
    expect(pitchClassName(61, true)).toBe('D♭');
  });

  it('computes cents offset from a fractional MIDI value', () => {
    expect(centsOffset(69.5, 69)).toBeCloseTo(50, 6);
    expect(centsOffset(68.9, 69)).toBeCloseTo(-10, 6);
    expect(centsOffset(69, 69)).toBe(0);
  });
});
