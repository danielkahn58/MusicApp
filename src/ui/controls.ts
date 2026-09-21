// Wires the tuning select, accidentals toggle, sensitivity slider, and
// "Hear this note" button.

import type { Tuning } from '../music/tunings';

export interface ControlsElements {
  tuningEl: HTMLSelectElement;
  sharpBtn: HTMLButtonElement;
  flatBtn: HTMLButtonElement;
  sensEl: HTMLInputElement;
  playBtn: HTMLButtonElement;
}

export interface ControlsCallbacks {
  onTuningChange(tuningId: string): void;
  onAccidentalsChange(useFlats: boolean): void;
  onSensitivityChange(value: number): void;
  onPlay(): void;
}

export interface ControlsInitial {
  tuningId: string;
  useFlats: boolean;
  sensitivity: number;
}

export function setupControls(
  els: ControlsElements,
  tunings: Tuning[],
  initial: ControlsInitial,
  callbacks: ControlsCallbacks,
): void {
  for (const t of tunings) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    els.tuningEl.appendChild(opt);
  }
  els.tuningEl.value = initial.tuningId;
  els.tuningEl.addEventListener('change', () => callbacks.onTuningChange(els.tuningEl.value));

  els.sensEl.value = String(initial.sensitivity);
  els.sensEl.addEventListener('input', () => callbacks.onSensitivityChange(parseInt(els.sensEl.value, 10)));

  applyAccidentals(els, initial.useFlats);
  els.sharpBtn.addEventListener('click', () => callbacks.onAccidentalsChange(false));
  els.flatBtn.addEventListener('click', () => callbacks.onAccidentalsChange(true));

  els.playBtn.addEventListener('click', () => callbacks.onPlay());
}

export function applyAccidentals(els: ControlsElements, useFlats: boolean): void {
  els.sharpBtn.setAttribute('aria-pressed', String(!useFlats));
  els.flatBtn.setAttribute('aria-pressed', String(useFlats));
}
