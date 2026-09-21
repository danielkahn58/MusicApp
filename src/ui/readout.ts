// The big note readout: name, Hz, cents meter, status line, and alert box.

import { midiToFreq, octaveOf, pitchClassName } from '../music/notes';
import type { Chord } from '../music/chords';

export type UIState = 'empty' | 'live' | 'held' | 'picked' | 'chord';

const STATUS_TEXT: Record<UIState, string> = {
  empty: 'Press Start, then sing a note. You can also tap a piano key or pick a chord.',
  live: 'Listening.',
  held: 'Last note. Sing again to update.',
  picked: 'Tapped note. Sing to switch to your voice.',
  chord: 'Chord picked. Sing to switch to your voice.',
};

export interface ReadoutElements {
  readoutEl: HTMLElement;
  noteNameEl: HTMLElement;
  noteOctEl: HTMLElement;
  hzEl: HTMLElement;
  meterEl: HTMLElement;
  needleEl: HTMLElement;
  verdictEl: HTMLElement;
  statusEl: HTMLElement;
  levelEl: HTMLElement;
  playBtn: HTMLButtonElement;
  alertEl: HTMLElement;
}

export function setUIState(els: ReadoutElements, state: UIState, override?: string): void {
  els.readoutEl.setAttribute('data-state', state);
  els.statusEl.textContent = override ?? STATUS_TEXT[state];
  if (state !== 'live') els.meterEl.classList.add('off');
}

export function renderNoteName(
  els: ReadoutElements,
  curMidi: number | null,
  activeChord: Chord | null,
  useFlats: boolean,
): void {
  if (activeChord) {
    els.noteNameEl.textContent = pitchClassName(activeChord.root, useFlats);
    els.noteOctEl.textContent = activeChord.quality === 'minor' ? 'm' : '';
    els.playBtn.disabled = false;
  } else if (curMidi === null) {
    els.noteNameEl.textContent = '–';
    els.noteOctEl.textContent = '';
    els.playBtn.disabled = true;
  } else {
    els.noteNameEl.textContent = pitchClassName(curMidi, useFlats);
    els.noteOctEl.textContent = String(octaveOf(curMidi));
    els.playBtn.disabled = false;
  }
}

export function showCents(els: ReadoutElements, cents: number, freq: number): void {
  els.meterEl.classList.remove('off');
  const clamped = Math.max(-50, Math.min(50, cents));
  els.needleEl.style.left = 50 + clamped + '%';
  els.hzEl.textContent = freq.toFixed(1) + ' Hz';
  els.verdictEl.textContent =
    Math.abs(cents) < 10 ? 'In tune' : Math.round(Math.abs(cents)) + ' cents ' + (cents > 0 ? 'sharp' : 'flat');
}

export function clearCents(els: ReadoutElements, curMidi: number | null): void {
  els.meterEl.classList.add('off');
  els.verdictEl.textContent = '';
  els.hzEl.textContent = curMidi === null ? '' : midiToFreq(curMidi).toFixed(1) + ' Hz';
}

export function showAlert(els: ReadoutElements, message: string): void {
  els.alertEl.textContent = message || '';
  els.alertEl.hidden = !message;
}

export function setLevel(els: ReadoutElements, level: number): void {
  els.levelEl.style.transform = `scaleX(${level})`;
}
