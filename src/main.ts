// Wiring only: DOM lookups, event listeners, and glueing the pure modules
// (music/, audio/) to the UI modules (ui/).

import './styles/tokens.css';
import './styles/app.css';

import { TUNINGS, findTuning } from './music/tunings';
import { Stabilizer } from './audio/stabilizer';
import { createMicController, sensitivityGate, type MicHandlers } from './audio/mic';
import { playTone, TONE_MUTE_MS } from './audio/tone';
import { buildPiano, renderPiano, centerPianoOn } from './ui/piano';
import { buildFretboard, renderFretboard, centerFretboardOn } from './ui/fretboard';
import {
  setUIState,
  renderNoteName,
  showCents,
  clearCents,
  showAlert,
  setLevel,
  type ReadoutElements,
  type UIState,
} from './ui/readout';
import { setupControls, applyAccidentals, type ControlsElements } from './ui/controls';
import { createStore, loadInitialState, saveTuning, saveFlats, saveSensitivity } from './ui/state';

const $ = <T extends Element>(selector: string): T => document.querySelector(selector) as T;

const reduceMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readoutEls: ReadoutElements = {
  readoutEl: $('#readout'),
  noteNameEl: $('#noteName'),
  noteOctEl: $('#noteOct'),
  hzEl: $('#hz'),
  meterEl: $('#meter'),
  needleEl: $('#needle'),
  verdictEl: $('#verdict'),
  statusEl: $('#status'),
  levelEl: $('#level'),
  playBtn: $('#playBtn'),
  alertEl: $('#alert'),
};

const controlsEls: ControlsElements = {
  tuningEl: $('#tuning'),
  sharpBtn: $('#sharpBtn'),
  flatBtn: $('#flatBtn'),
  sensEl: $('#sens'),
  playBtn: $('#playBtn'),
};

const pianoWrap = $('#pianoWrap');
const pianoHintEl = $<HTMLElement>('#pianoNote');
const guitarWrap = $('#guitarWrap');
const guitarHintEl = $<HTMLElement>('#spots');
const startBtn = $<HTMLButtonElement>('#startBtn');

const piano = buildPiano($('#piano'));
const fretboard = buildFretboard($('#guitar'));

const store = createStore(loadInitialState());
const stabilizer = new Stabilizer();

function setState(state: UIState, override?: string): void {
  store.set({ uiState: state });
  setUIState(readoutEls, state, override);
}

function render(): SVGCircleElement | null {
  const s = store.get();
  renderNoteName(readoutEls, s.curMidi, s.useFlats);
  renderPiano(piano, pianoHintEl, s.curMidi, s.useFlats);
  return renderFretboard(fretboard, guitarHintEl, s.tuning, s.curMidi, s.useFlats);
}

function showNote(midi: number, centerScrollers: boolean): void {
  const changed = store.get().curMidi !== midi;
  store.set({ curMidi: midi });
  const firstDot = render();
  if (changed && centerScrollers) {
    centerPianoOn(pianoWrap, piano, midi, reduceMotion);
    centerFretboardOn(guitarWrap, firstDot, reduceMotion);
  }
}

function pickNote(midi: number): void {
  showNote(midi, true);
  setState('picked');
  clearCents(readoutEls, midi);
  playTone(midi);
  mic.muteFor(TONE_MUTE_MS);
}

piano.svg.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const midiAttr = target?.getAttribute?.('data-midi');
  if (midiAttr === null || midiAttr === undefined) return;
  pickNote(parseInt(midiAttr, 10));
});

const micHandlers: MicHandlers = {
  onTick(nowMs) {
    if (stabilizer.checkHold(nowMs)) {
      setState('held');
    }
  },
  onLevel(level) {
    setLevel(readoutEls, level);
  },
  onFrame(freq, nowMs) {
    const result = stabilizer.pushFrame(freq, nowMs);
    if (!result) return;
    showNote(result.midi, true);
    if (store.get().uiState !== 'live') setState('live');
    showCents(readoutEls, result.cents, result.freq);
  },
  onError(message) {
    showAlert(readoutEls, message);
    resetStartButton();
  },
  onStatusChange(running) {
    if (running) {
      startBtn.disabled = false;
      startBtn.textContent = 'Stop';
      startBtn.classList.add('ghost');
      setState(store.get().curMidi === null ? 'empty' : 'held', 'Listening. Sing a steady note.');
    } else {
      resetStartButton();
      setState(store.get().curMidi === null ? 'empty' : 'held', 'Microphone off.');
      setLevel(readoutEls, 0);
    }
  },
};

const mic = createMicController(() => sensitivityGate(store.get().sensitivity), micHandlers);

function resetStartButton(): void {
  startBtn.disabled = false;
  startBtn.textContent = 'Start listening';
  startBtn.classList.remove('ghost');
}

startBtn.addEventListener('click', () => {
  if (mic.isRunning()) {
    mic.stop();
    return;
  }
  showAlert(readoutEls, '');
  startBtn.disabled = true;
  startBtn.textContent = 'Waiting for microphone…';
  void mic.start();
});

setupControls(
  controlsEls,
  TUNINGS,
  { tuningId: store.get().tuning.id, useFlats: store.get().useFlats, sensitivity: store.get().sensitivity },
  {
    onTuningChange(id) {
      store.set({ tuning: findTuning(id) });
      saveTuning(id);
      render();
    },
    onAccidentalsChange(useFlats) {
      store.set({ useFlats });
      saveFlats(useFlats);
      applyAccidentals(controlsEls, useFlats);
      render();
    },
    onSensitivityChange(value) {
      store.set({ sensitivity: value });
      saveSensitivity(value);
    },
    onPlay() {
      const midi = store.get().curMidi;
      if (midi !== null) {
        playTone(midi);
        mic.muteFor(TONE_MUTE_MS);
      }
    },
  },
);

render();

window.addEventListener('pagehide', () => {
  if (mic.isRunning()) mic.stop();
});
