// Tiny SVG element helper shared by piano.ts and fretboard.ts.

export const SVGNS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVGNS, name);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

export function centerInScroller(wrap: Element, node: Element, reduceMotion: boolean): void {
  if (wrap.scrollWidth <= wrap.clientWidth + 1) return;
  const nr = node.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  wrap.scrollBy({
    left: nr.left + nr.width / 2 - (wr.left + wr.width / 2),
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
}
