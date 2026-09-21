// Small typed state store. Preferences (tuning, flats, sensitivity) persist
// to localStorage; curMidi/uiState do not.

import { DEFAULT_TUNING, findTuning, type Tuning } from '../music/tunings';
import type { UIState } from './readout';

const storage = {
  get(key: string, fallback: string): string {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable; preference just won't persist
    }
  },
};

export interface AppState {
  curMidi: number | null;
  uiState: UIState;
  tuning: Tuning;
  useFlats: boolean;
  sensitivity: number;
}

export function loadInitialState(): AppState {
  return {
    curMidi: null,
    uiState: 'empty',
    tuning: findTuning(storage.get('sn-tuning', DEFAULT_TUNING.id)),
    useFlats: storage.get('sn-flats', '0') === '1',
    sensitivity: parseInt(storage.get('sn-sens', '6'), 10),
  };
}

export function saveTuning(id: string): void {
  storage.set('sn-tuning', id);
}
export function saveFlats(useFlats: boolean): void {
  storage.set('sn-flats', useFlats ? '1' : '0');
}
export function saveSensitivity(value: number): void {
  storage.set('sn-sens', String(value));
}

export type Listener = (state: AppState) => void;

export function createStore(initial: AppState) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get(): AppState {
      return state;
    },
    set(patch: Partial<AppState>): void {
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state));
    },
    subscribe(fn: Listener): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
