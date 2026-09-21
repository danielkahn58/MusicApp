// Builds and updates the SVG piano keyboard.
// Range and geometry are the owner-tunable config for this instrument.

import { isBlackKey, octaveOf, pitchClassName } from '../music/notes';
import { svgEl, centerInScroller } from './svg';

export const PIANO_LOW = 36; // C2
export const PIANO_HIGH = 96; // C7

const WHITE_W = 24;
const WHITE_H = 150;
const BLACK_W = 15;
const BLACK_H = 92;

export interface Piano {
  svg: SVGSVGElement;
  keyEls: Map<number, SVGRectElement>;
  activeLabel: SVGTextElement;
}

export function buildPiano(svg: SVGSVGElement): Piano {
  svg.textContent = '';
  let whiteCount = 0;
  for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) if (!isBlackKey(m)) whiteCount++;
  svg.setAttribute('viewBox', `0 0 ${whiteCount * WHITE_W} ${WHITE_H + 2}`);

  const gWhite = svgEl('g', {}, svg);
  const gBlack = svgEl('g', {}, svg);
  const gLabels = svgEl('g', {}, svg);

  const keyEls = new Map<number, SVGRectElement>();
  const blacks: { midi: number; x: number }[] = [];
  let idx = 0;
  for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
    if (!isBlackKey(m)) {
      const rect = svgEl(
        'rect',
        { x: idx * WHITE_W, y: 1, width: WHITE_W, height: WHITE_H, rx: 3, class: 'wkey', 'data-midi': m },
        gWhite,
      );
      keyEls.set(m, rect);
      if (m % 12 === 0) {
        const t = svgEl('text', { x: idx * WHITE_W + WHITE_W / 2, y: WHITE_H - 8, 'text-anchor': 'middle', class: 'klabel' }, gLabels);
        t.textContent = 'C' + octaveOf(m);
      }
      idx++;
    } else {
      blacks.push({ midi: m, x: idx * WHITE_W - BLACK_W / 2 });
    }
  }
  for (const b of blacks) {
    const rect = svgEl(
      'rect',
      { x: b.x, y: 1, width: BLACK_W, height: BLACK_H, rx: 2, class: 'bkey', 'data-midi': b.midi },
      gBlack,
    );
    keyEls.set(b.midi, rect);
  }

  const activeLabel = svgEl('text', { id: 'activeLabel', x: 0, y: 0 }, gLabels);

  return { svg, keyEls, activeLabel };
}

export function renderPiano(
  piano: Piano,
  hintEl: HTMLElement,
  curMidi: number | null,
  useFlats: boolean,
): void {
  for (const [midi, el] of piano.keyEls) {
    const base = isBlackKey(midi) ? 'bkey' : 'wkey';
    let cls = base;
    if (curMidi !== null) {
      if (midi === curMidi) cls += ' on';
      else if (((midi % 12) + 12) % 12 === (((curMidi % 12) + 12) % 12)) cls += ' echo';
    }
    el.setAttribute('class', cls);
  }

  piano.activeLabel.textContent = '';
  if (curMidi === null) {
    hintEl.textContent = '';
    return;
  }
  if (curMidi < PIANO_LOW || curMidi > PIANO_HIGH) {
    hintEl.textContent = `${pitchClassName(curMidi, useFlats)}${octaveOf(curMidi)} is outside this keyboard (${pitchClassName(PIANO_LOW, useFlats)}${octaveOf(PIANO_LOW)} to ${pitchClassName(PIANO_HIGH, useFlats)}${octaveOf(PIANO_HIGH)}).`;
    return;
  }
  hintEl.textContent = '';
  const rect = piano.keyEls.get(curMidi);
  if (!rect) return;
  const x = parseFloat(rect.getAttribute('x')!) + parseFloat(rect.getAttribute('width')!) / 2;
  const y = isBlackKey(curMidi) ? BLACK_H - 10 : WHITE_H - 24;
  piano.activeLabel.setAttribute('x', String(x));
  piano.activeLabel.setAttribute('y', String(y));
  piano.activeLabel.textContent = pitchClassName(curMidi, useFlats);
}

export function centerPianoOn(wrap: Element, piano: Piano, midi: number, reduceMotion: boolean): void {
  const el = piano.keyEls.get(midi);
  if (el) centerInScroller(wrap, el, reduceMotion);
}
