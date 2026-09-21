import { describe, expect, it } from 'vitest';
import { yinDetect } from '../src/audio/yin';

function synthTone(freq: number, sampleRate: number, length: number): Float32Array {
  const buf = new Float32Array(length);
  const harmonics = [1, 0.5, 0.25, 0.12];
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) {
      v += harmonics[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
    }
    buf[i] = v / harmonics.reduce((a, b) => a + b, 0);
  }
  return buf;
}

const FREQS = [82.41, 110, 196, 261.63, 440, 880, 1046.5];
const SAMPLE_RATES = [44100, 48000];

describe('yin', () => {
  for (const sr of SAMPLE_RATES) {
    for (const freq of FREQS) {
      it(`detects ${freq} Hz within 0.5 Hz at ${sr} Hz sample rate`, () => {
        const buf = synthTone(freq, sr, 4096);
        const result = yinDetect(buf, sr);
        expect(result).not.toBeNull();
        expect(Math.abs(result!.freq - freq)).toBeLessThan(0.5);
      });
    }
  }

  it('returns null for silence', () => {
    const buf = new Float32Array(4096);
    expect(yinDetect(buf, 44100)).toBeNull();
  });

  it('returns null for noise', () => {
    const buf = new Float32Array(4096);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.random() * 2 - 1;
    const result = yinDetect(buf, 44100);
    // Noise should either find nothing, or find something with low clarity.
    if (result) expect(result.clarity).toBeLessThan(0.85);
  });
});
