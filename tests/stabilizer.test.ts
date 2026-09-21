import { describe, expect, it } from 'vitest';
import { Stabilizer, HOLD_TIMEOUT_MS } from '../src/audio/stabilizer';
import { midiToFreq } from '../src/music/notes';

const A4 = midiToFreq(69); // 440

describe('Stabilizer', () => {
  it('needs 3 consecutive frames to switch to a new note', () => {
    const s = new Stabilizer();
    expect(s.pushFrame(A4, 0)).toBeNull();
    expect(s.pushFrame(A4, 40)).toBeNull();
    const third = s.pushFrame(A4, 80);
    expect(third).not.toBeNull();
    expect(third!.midi).toBe(69);
    expect(s.midi).toBe(69);
  });

  it('median rejects a single octave-error frame', () => {
    const s = new Stabilizer();
    // establish A4 as current
    s.pushFrame(A4, 0);
    s.pushFrame(A4, 40);
    s.pushFrame(A4, 80);
    expect(s.midi).toBe(69);

    // one bad octave-doubled frame among a 5-frame history dominated by A4
    // frames must not pull the median (and therefore the displayed note)
    // up to A5
    const octaveUp = midiToFreq(81); // A5
    s.pushFrame(A4, 120);
    const result = s.pushFrame(octaveUp, 160);
    expect(result).not.toBeNull();
    expect(result!.midi).toBe(69);
    expect(s.midi).toBe(69);
  });

  it('cents update every frame once the note is current, without needing consensus again', () => {
    const s = new Stabilizer();
    s.pushFrame(A4, 0);
    s.pushFrame(A4, 40);
    s.pushFrame(A4, 80);
    const slightlySharp = midiToFreq(69.05);
    const result = s.pushFrame(slightlySharp, 120);
    expect(result).not.toBeNull();
    expect(result!.midi).toBe(69);
  });

  it('goes to held after 350ms of silence', () => {
    const s = new Stabilizer();
    s.pushFrame(A4, 0);
    s.pushFrame(A4, 40);
    s.pushFrame(A4, 80);
    expect(s.isLive).toBe(true);

    expect(s.checkHold(80 + HOLD_TIMEOUT_MS)).toBe(false); // exactly at timeout: not yet
    expect(s.checkHold(80 + HOLD_TIMEOUT_MS + 1)).toBe(true); // just past: transitions
    expect(s.isLive).toBe(false);
    expect(s.midi).toBe(69); // last note stays, just dimmed by the UI layer
  });
});
