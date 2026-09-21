// Builds and updates the SVG guitar fretboard.
// Fret count and geometry are the owner-tunable config for this instrument.

import { computeFretboardPositions, type FretPosition } from '../music/fretboard-positions';
import type { Tuning } from '../music/tunings';
import { noteName, pitchClassName } from '../music/notes';
import { svgEl, centerInScroller } from './svg';

export const FRET_COUNT = 17;

const NUT_X = 70;
const BOARD_LEN = 900;
const SCALE = BOARD_LEN / (1 - Math.pow(2, -FRET_COUNT / 12));
const fx = (n: number) => NUT_X + SCALE * (1 - Math.pow(2, -n / 12));
const STRING_TOP = 30;
const STRING_GAP = 30;
const strY = (i: number) => STRING_TOP + (5 - i) * STRING_GAP; // i=0 is the lowest string, drawn at the bottom
const OPEN_X = 46;
const STRING_WIDTHS = [2.8, 2.3, 1.9, 1.5, 1.2, 1.0];

export interface Fretboard {
  svg: SVGSVGElement;
  dotsGroup: SVGGElement;
  stringLabels: SVGTextElement[];
}

export function buildFretboard(svg: SVGSVGElement): Fretboard {
  svg.textContent = '';
  svg.setAttribute('viewBox', '0 0 1000 236');

  svgEl('rect', { class: 'board', x: NUT_X, y: 14, width: 985 - NUT_X, height: 182, rx: 6 }, svg);
  [3, 5, 7, 9, 15].forEach((n) => {
    svgEl('circle', { class: 'inlay', cx: (fx(n - 1) + fx(n)) / 2, cy: 105, r: 7 }, svg);
  });
  [75, 135].forEach((cy) => {
    svgEl('circle', { class: 'inlay', cx: (fx(11) + fx(12)) / 2, cy, r: 7 }, svg);
  });
  for (let n = 1; n <= FRET_COUNT; n++) {
    svgEl('line', { class: 'fretwire', x1: fx(n), y1: 14, x2: fx(n), y2: 196 }, svg);
  }
  svgEl('rect', { class: 'nut', x: NUT_X - 5, y: 12, width: 7, height: 186, rx: 2 }, svg);
  for (let i = 0; i < 6; i++) {
    svgEl(
      'line',
      { class: 'gstring', x1: NUT_X, y1: strY(i), x2: 985, y2: strY(i), 'stroke-width': STRING_WIDTHS[i] },
      svg,
    );
  }
  for (let n = 1; n <= FRET_COUNT; n++) {
    const t = svgEl('text', { class: 'fretnum', x: (fx(n - 1) + fx(n)) / 2, y: 224 }, svg);
    t.textContent = String(n);
  }
  const stringLabels: SVGTextElement[] = [];
  for (let i = 0; i < 6; i++) {
    stringLabels.push(svgEl('text', { class: 'stringname', x: 8, y: strY(i) + 4 }, svg));
  }
  const dotsGroup = svgEl('g', {}, svg);

  return { svg, dotsGroup, stringLabels };
}

function fretLabel(p: FretPosition): string {
  return p.fret === 0 ? `open string ${6 - p.string}` : `string ${6 - p.string}, fret ${p.fret}`;
}

// midis: 0 notes (nothing active), 1 note (sung/tapped), or several (a chord).
export function renderFretboard(
  board: Fretboard,
  hintEl: HTMLElement,
  tuning: Tuning,
  midis: number[],
  useFlats: boolean,
): SVGCircleElement | null {
  for (let i = 0; i < 6; i++) board.stringLabels[i].textContent = pitchClassName(tuning.notes[i], useFlats);
  board.dotsGroup.textContent = '';

  if (midis.length === 0) {
    hintEl.textContent = 'Sing or tap a key, or pick a chord, to see where the note lives.';
    return null;
  }

  const { exact, echoes } = computeFretboardPositions(tuning, midis, FRET_COUNT);
  let firstDot: { fret: number; node: SVGCircleElement } | null = null;

  for (const { string: s, fret: f } of echoes) {
    const x = f === 0 ? OPEN_X : (fx(f - 1) + fx(f)) / 2;
    svgEl('circle', { class: 'ring', cx: x, cy: strY(s), r: 8 }, board.dotsGroup);
  }
  for (const pos of exact) {
    const x = pos.fret === 0 ? OPEN_X : (fx(pos.fret - 1) + fx(pos.fret)) / 2;
    const y = strY(pos.string);
    const c = svgEl('circle', { class: 'dot', cx: x, cy: y, r: 11 }, board.dotsGroup);
    const t = svgEl('text', { class: 'dotlabel', x, y }, board.dotsGroup);
    t.textContent = pitchClassName(pos.midi, useFlats);
    if (!firstDot || pos.fret < firstDot.fret) firstDot = { fret: pos.fret, node: c };
  }

  if (midis.length === 1) {
    const midi = midis[0];
    if (exact.length) {
      const sorted = [...exact].sort((a, b) => a.fret - b.fret);
      hintEl.textContent = noteName(midi, useFlats) + ': ' + sorted.map(fretLabel).join('  ·  ');
    } else {
      const lo = tuning.notes[0];
      const hi = tuning.notes[5] + FRET_COUNT;
      hintEl.textContent = `${noteName(midi, useFlats)} is outside this tuning (${noteName(lo, useFlats)} to ${noteName(hi, useFlats)}). Rings show the same note in other octaves.`;
    }
  } else if (exact.length) {
    const byMidi = new Map<number, FretPosition[]>();
    for (const pos of exact) {
      const list = byMidi.get(pos.midi) ?? [];
      list.push(pos);
      byMidi.set(pos.midi, list);
    }
    hintEl.textContent = midis
      .filter((m) => byMidi.has(m))
      .map((m) => {
        const sorted = [...byMidi.get(m)!].sort((a, b) => a.fret - b.fret);
        return `${noteName(m, useFlats)}: ` + sorted.map(fretLabel).join(' · ');
      })
      .join('   |   ');
  } else if (echoes.length) {
    hintEl.textContent = "This chord's notes fall outside this tuning here — rings show them in other octaves.";
  } else {
    hintEl.textContent = "This chord doesn't fall on this tuning's neck.";
  }

  return firstDot ? firstDot.node : null;
}

export function centerFretboardOn(wrap: Element, node: Element | null, reduceMotion: boolean): void {
  if (node) centerInScroller(wrap, node, reduceMotion);
}
