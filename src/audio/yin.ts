// YIN pitch detector. Pure and DOM-free: takes a time-domain buffer and a
// sample rate, returns a frequency estimate or null. Keep this file free of
// browser APIs so it stays unit-testable.

export const YIN_WINDOW = 2048;
export const YIN_THRESHOLD = 0.15;
export const FREQ_MIN = 60;
export const FREQ_MAX = 1200;

export interface YinResult {
  freq: number;
  clarity: number;
}

// Scratch buffer reused across calls purely for performance (the mic loop
// calls this every ~40ms); it holds no state between independent calls.
const dBuf = new Float32Array(YIN_WINDOW);

export function yinDetect(buffer: Float32Array, sampleRate: number): YinResult | null {
  const tauMin = Math.max(2, Math.floor(sampleRate / FREQ_MAX));
  const tauMax = Math.min(
    Math.floor(sampleRate / FREQ_MIN),
    buffer.length - YIN_WINDOW - 1,
    dBuf.length - 2,
  );
  if (tauMax <= tauMin) return null;

  let runningSum = 0;
  dBuf[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let j = 0; j < YIN_WINDOW; j++) {
      const diff = buffer[j] - buffer[j + tau];
      sum += diff * diff;
    }
    runningSum += sum;
    dBuf[tau] = runningSum === 0 ? 1 : (sum * tau) / runningSum;
  }

  let tau = -1;
  for (let t = tauMin; t < tauMax; t++) {
    if (dBuf[t] < YIN_THRESHOLD) {
      while (t + 1 < tauMax && dBuf[t + 1] < dBuf[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  const a = dBuf[tau - 1];
  const b = dBuf[tau];
  const c = dBuf[tau + 1];
  const denominator = a - 2 * b + c;
  const shift = denominator !== 0 ? (a - c) / (2 * denominator) : 0;

  return { freq: sampleRate / (tau + shift), clarity: 1 - b };
}
