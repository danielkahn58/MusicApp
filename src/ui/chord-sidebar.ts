// Builds and updates the chord sidebar: one button per major/minor chord.

import { chordKey, chordName, type Chord } from '../music/chords';

export interface ChordSidebarElements {
  majorGrid: HTMLElement;
  minorGrid: HTMLElement;
}

export type ChordButtons = Map<string, HTMLButtonElement>;

export function buildChordSidebar(
  els: ChordSidebarElements,
  majorChords: Chord[],
  minorChords: Chord[],
  useFlats: boolean,
  onSelect: (chord: Chord) => void,
): ChordButtons {
  const buttons: ChordButtons = new Map();

  const addButton = (grid: HTMLElement, chord: Chord): void => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chordBtn';
    btn.textContent = chordName(chord, useFlats);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => onSelect(chord));
    grid.appendChild(btn);
    buttons.set(chordKey(chord), btn);
  };

  for (const chord of majorChords) addButton(els.majorGrid, chord);
  for (const chord of minorChords) addButton(els.minorGrid, chord);

  return buttons;
}

export function relabelChordButtons(buttons: ChordButtons, allChords: Chord[], useFlats: boolean): void {
  for (const chord of allChords) {
    const btn = buttons.get(chordKey(chord));
    if (btn) btn.textContent = chordName(chord, useFlats);
  }
}

export function setActiveChordButton(buttons: ChordButtons, active: Chord | null): void {
  const activeKey = active ? chordKey(active) : null;
  for (const [key, btn] of buttons) {
    btn.setAttribute('aria-pressed', String(key === activeKey));
  }
}
