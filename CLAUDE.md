# CLAUDE.md

Guidance for working in this repo.

## Architecture, in a few lines

Vite + TypeScript, no framework. `src/main.ts` is wiring only: it looks up DOM nodes,
builds the piano/fretboard SVGs, and connects pure logic to UI renderers. Everything
that can be pure is pure:

- `music/notes.ts`, `music/tunings.ts`, `music/chords.ts`, `music/fretboard-positions.ts`
  — MIDI/note math, chord data, and fretboard geometry, no DOM.
  `fretboard-positions.ts` and the piano/fretboard renderers all take an array of
  target MIDI notes (`number[]`), not a single note — one note for singing/tapping,
  several for a chord. Same code path for both; don't fork it.
- `audio/yin.ts` — the YIN pitch detector, takes a `Float32Array` + sample rate,
  returns `{ freq, clarity } | null`. No DOM.
- `audio/stabilizer.ts` — turns a stream of raw frequency estimates into a stable
  displayed note (median-of-5, 3-frame consensus, 350ms hold timeout). Time is passed
  in explicitly (`nowMs`) rather than read from `Date.now()`, so it's testable without
  faking timers. No DOM.

Everything else is intentionally impure and un(der)tested by design:

- `audio/mic.ts` — `getUserMedia`, the `AnalyserNode` polling loop (every ~40ms),
  RMS gating, and error-message mapping. Calls into `yin.ts` for detection.
- `audio/tone.ts` — the playback oscillator, and owns the single shared
  `AudioContext` (mic.ts imports `ensureAudioContext` from here so mic input and tone
  playback share one context, matching how the original reference worked).
- `ui/*.ts` — builds and updates the SVG piano/fretboard, the note readout, the
  controls, and the chord sidebar (`ui/chord-sidebar.ts`). Take data in, render it; no
  logic that would need a unit test lives here.

State: `ui/state.ts`'s `AppState` holds `curMidi` (sung/tapped note) and
`activeChord` as mutually exclusive — picking one clears the other (`main.ts`'s
`showNote`/`pickChord`). `activeMidis(state)` derives the actual MIDI notes to
highlight/play from whichever is set (via `chordTones()` for a chord), and is what
`render()` passes to the piano/fretboard renderers.

## Commands

```bash
npm run dev         # dev server
npm run build       # typecheck + production build
npm test            # vitest run
npm run test:watch
npm run lint
npm run typecheck
npm run format       # prettier --write
```

## Rule: keep detection logic pure

`music/*.ts`, `audio/yin.ts`, and `audio/stabilizer.ts` must stay DOM-free and take
all inputs as arguments (including time, via `nowMs` — never call `Date.now()` or
`performance.now()` inside them). This is what makes them unit-testable without a
browser. If a change to pitch detection or note stabilization seems to require
`document` or `AudioContext`, that's a sign the change belongs in `mic.ts` instead.

## Gotchas (do not regress)

1. **AudioContext creation/`resume()` must happen synchronously inside the click
   handler, before any `await`.** Safari drops the user gesture across an intervening
   `await` (e.g. the permission prompt), and `resume()` then hangs. `mic.ts`'s
   `start()` and `tone.ts`'s `playTone()` both call `resumeAudioContext()` before
   their first `await` — keep it that way. Also guard with a timeout (see
   `CONTEXT_RESUME_TIMEOUT_MS` in `mic.ts`) and show an error if the context is still
   suspended.
2. Every mic failure must show a visible alert (not just the status line): permission
   denied, no device, no `mediaDevices`, a Permissions-Policy block
   (`document.permissionsPolicy.allowsFeature('microphone')`), and audio staying
   suspended. Embedded-in-an-iframe gets its own message.
3. Start button reads "Waiting for microphone…" while the permission prompt is open.
4. Stop all mic tracks on Stop and on `pagehide`.
5. Guitar positions use **sounding pitch** (MIDI arithmetic), not written pitch. Keep
   the footnote explaining that guitar music is written an octave higher than it
   sounds.
6. Notes outside a tuning's range (or outside the piano's range) must say so in text
   instead of showing nothing.
7. Mute the mic for ~1.6s (`TONE_MUTE_MS` in `tone.ts`) after playing a tone, so the
   app doesn't pick up its own speaker output.
