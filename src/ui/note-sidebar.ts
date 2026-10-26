// Builds and updates the notes sidebar: one button per pitch class.

import { pitchClassName } from '../music/notes';

export interface NoteSidebarElements {
  grid: HTMLElement;
}

export type NoteButtons = Map<number, HTMLButtonElement>;

export function buildNoteSidebar(
  els: NoteSidebarElements,
  useFlats: boolean,
  onSelect: (pitchClass: number) => void,
): NoteButtons {
  const buttons: NoteButtons = new Map();

  for (let pc = 0; pc < 12; pc++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chordBtn';
    btn.textContent = pitchClassName(pc, useFlats);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => onSelect(pc));
    els.grid.appendChild(btn);
    buttons.set(pc, btn);
  }

  return buttons;
}

export function relabelNoteButtons(buttons: NoteButtons, useFlats: boolean): void {
  for (const [pc, btn] of buttons) {
    btn.textContent = pitchClassName(pc, useFlats);
  }
}

export function setActiveNoteButton(buttons: NoteButtons, activePitchClass: number | null): void {
  for (const [pc, btn] of buttons) {
    btn.setAttribute('aria-pressed', String(pc === activePitchClass));
  }
}
