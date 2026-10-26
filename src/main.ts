// Wiring only: DOM lookups, event listeners, and glueing the pure modules
// (music/, audio/) to the UI modules (ui/).

import './styles/tokens.css';
import './styles/app.css';

import { TUNINGS, findTuning } from './music/tunings';
import { MAJOR_CHORDS, MINOR_CHORDS, chordTones, type Chord } from './music/chords';
import { DEFAULT_OCTAVE_MIDI } from './music/notes';
import { Stabilizer } from './audio/stabilizer';
import { createMicController, sensitivityGate, type MicHandlers } from './audio/mic';
import { playTone, playChord, TONE_MUTE_MS } from './audio/tone';
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
import { setupControls, applyAccidentals, applyInstrument, type ControlsElements } from './ui/controls';
import {
  buildChordSidebar,
  relabelChordButtons,
  setActiveChordButton,
  type ChordSidebarElements,
} from './ui/chord-sidebar';
import { buildNoteSidebar, relabelNoteButtons, setActiveNoteButton, type NoteSidebarElements } from './ui/note-sidebar';
import {
  createStore,
  loadInitialState,
  activeMidis,
  saveTuning,
  saveFlats,
  saveInstrument,
  saveSensitivity,
  type AppState,
} from './ui/state';

const ALL_CHORDS: Chord[] = [...MAJOR_CHORDS, ...MINOR_CHORDS];

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
  pianoBtn: $('#pianoBtn'),
  guitarBtn: $('#guitarBtn'),
  sensEl: $('#sens'),
  playBtn: $('#playBtn'),
};

const chordEls: ChordSidebarElements = {
  majorGrid: $('#majorChords'),
  minorGrid: $('#minorChords'),
};

const noteEls: NoteSidebarElements = {
  grid: $('#notesGrid'),
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

const chordButtons = buildChordSidebar(chordEls, MAJOR_CHORDS, MINOR_CHORDS, store.get().useFlats, pickChord);
const noteButtons = buildNoteSidebar(noteEls, store.get().useFlats, (pc) => pickNote(DEFAULT_OCTAVE_MIDI + pc));

function setState(state: UIState, override?: string): void {
  store.set({ uiState: state });
  setUIState(readoutEls, state, override);
}

function render(): SVGCircleElement | null {
  const s = store.get();
  const midis = activeMidis(s);
  renderNoteName(readoutEls, s.curMidi, s.activeChord, s.useFlats);
  renderPiano(piano, pianoHintEl, midis, s.useFlats);
  const firstDot = renderFretboard(fretboard, guitarHintEl, s.tuning, midis, s.useFlats);
  const activePc = s.activeChord === null && s.curMidi !== null ? (((s.curMidi % 12) + 12) % 12) : null;
  setActiveNoteButton(noteButtons, activePc);
  return firstDot;
}

function showNote(midi: number, centerScrollers: boolean): void {
  const prev = store.get();
  const changed = prev.curMidi !== midi || prev.activeChord !== null;
  store.set({ curMidi: midi, activeChord: null });
  if (prev.activeChord !== null) setActiveChordButton(chordButtons, null);
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
  playTone(midi, store.get().instrument);
  mic.muteFor(TONE_MUTE_MS);
}

function pickChord(chord: Chord): void {
  store.set({ curMidi: null, activeChord: chord });
  setActiveChordButton(chordButtons, chord);
  setState('chord');
  clearCents(readoutEls, null);
  const firstDot = render();
  const midis = chordTones(chord);
  centerPianoOn(pianoWrap, piano, midis[0], reduceMotion);
  centerFretboardOn(guitarWrap, firstDot, reduceMotion);
  playChord(midis, store.get().instrument);
  mic.muteFor(TONE_MUTE_MS);
}

piano.svg.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const midiAttr = target?.getAttribute?.('data-midi');
  if (midiAttr === null || midiAttr === undefined) return;
  pickNote(parseInt(midiAttr, 10));
});

fretboard.svg.addEventListener('click', (e) => {
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
      setState(defaultUiState(store.get()), 'Listening. Sing a steady note.');
    } else {
      resetStartButton();
      setState(defaultUiState(store.get()), 'Microphone off.');
      setLevel(readoutEls, 0);
    }
  },
};

function defaultUiState(s: AppState): UIState {
  if (s.activeChord) return 'chord';
  return s.curMidi === null ? 'empty' : 'held';
}

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
  {
    tuningId: store.get().tuning.id,
    useFlats: store.get().useFlats,
    instrument: store.get().instrument,
    sensitivity: store.get().sensitivity,
  },
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
      relabelChordButtons(chordButtons, ALL_CHORDS, useFlats);
      relabelNoteButtons(noteButtons, useFlats);
      render();
    },
    onInstrumentChange(instrument) {
      store.set({ instrument });
      saveInstrument(instrument);
      applyInstrument(controlsEls, instrument);
    },
    onSensitivityChange(value) {
      store.set({ sensitivity: value });
      saveSensitivity(value);
    },
    onPlay() {
      const s = store.get();
      if (s.activeChord) {
        playChord(chordTones(s.activeChord), s.instrument);
        mic.muteFor(TONE_MUTE_MS);
      } else if (s.curMidi !== null) {
        playTone(s.curMidi, s.instrument);
        mic.muteFor(TONE_MUTE_MS);
      }
    },
  },
);

render();

window.addEventListener('pagehide', () => {
  if (mic.isRunning()) mic.stop();
});
