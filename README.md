# Sing a note

A browser tool for a singer/composer: sing a note into the microphone and see it as a
note name, frequency, cents-in-tune meter, a 61-key piano (C2–C7), and a guitar
fretboard (frets 0–17, any of 7 tunings). Tap a piano key to hear it and locate it,
even without a microphone.

Built with Vite + TypeScript, no UI framework — the DOM here is small and the
instruments are generated SVG, so a framework would add weight without adding
much help.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

## Test, lint, typecheck

```bash
npm test          # vitest run
npm run test:watch
npm run lint
npm run typecheck
```

`npm run build` runs `typecheck` before bundling, so a broken type check fails the build.

## Deploy

The build is static output (`dist/`) and can be hosted anywhere. A GitHub Pages
workflow is included at `.github/workflows/deploy.yml`; it builds on push to `main`
and deploys `dist/`. If you deploy to a project site (`https://user.github.io/repo/`,
not a custom domain or user/org root site), set the `BASE_PATH` repository variable
(Settings → Secrets and variables → Actions → Variables) to `/repo/` — `vite.config.ts`
reads `BASE_PATH` for the `base` option, defaulting to `/`.

## Project layout

```
src/
  main.ts                       wiring only — DOM lookups, event listeners, glue
  audio/
    yin.ts                      pure YIN pitch detector
    mic.ts                      getUserMedia, AudioContext, analyser loop, error mapping
    tone.ts                     playback oscillator + shared AudioContext singleton
    stabilizer.ts                median + 3-frame note switching + hold logic (pure)
  music/
    notes.ts                    MIDI <-> name/frequency, sharps/flats, cents
    tunings.ts                  tuning definitions (data only)
    fretboard-positions.ts      pure: (tuning, midi, frets) -> exact[] + echoes[]
  ui/
    piano.ts                    builds/updates the SVG keyboard
    fretboard.ts                builds/updates the SVG fretboard
    readout.ts                  note, Hz, cents meter, status, alert
    controls.ts                 tuning select, accidentals, sensitivity, hear button
    state.ts                    small typed state store + localStorage persistence
    svg.ts                      tiny SVG element helper + scroll-into-view
  styles/
    tokens.css                  all colors/sizes/fonts as CSS variables (light + dark)
    app.css
tests/
```

`music/` and `audio/yin.ts` / `audio/stabilizer.ts` are pure and DOM-free by design —
they take data in and return data out, with no `document` or `AudioContext` access, so
they're unit-testable without a browser. Keep it that way: if you need to add browser
APIs to test pitch/note logic, that logic belongs in `mic.ts` instead.

## Configuration the owner is likely to tweak

Each lives in one obvious place:

- **Keyboard range**: `PIANO_LOW` / `PIANO_HIGH` in `src/ui/piano.ts` (MIDI numbers).
- **Fret count**: `FRET_COUNT` in `src/ui/fretboard.ts`.
- **Detection thresholds**: `src/audio/yin.ts` (`YIN_WINDOW`, `YIN_THRESHOLD`,
  `FREQ_MIN`/`FREQ_MAX`), `src/audio/mic.ts` (`sensitivityGate`, `CLARITY_THRESHOLD`),
  `src/audio/stabilizer.ts` (`HOLD_TIMEOUT_MS` and the two constants at the top of the
  file for history size / consensus frames).
- **Tunings**: `src/music/tunings.ts` — add a tuning.
- **Colors**: `src/styles/tokens.css` — CSS custom properties, light and dark.

### Adding a guitar tuning

Add one entry to the `TUNINGS` array in `src/music/tunings.ts` (id, display name, and
six MIDI numbers low string to high string). It appears in the select automatically —
no UI code to touch.

## Gotchas (do not regress these)

1. **AudioContext creation/`resume()` must happen synchronously inside the click
   handler, before any `await`.** Safari drops the user gesture once a permission
   prompt (or any other await) intervenes, and `resume()` then hangs forever. See
   `resumeAudioContext()` in `src/audio/tone.ts` and how `src/audio/mic.ts`'s
   `start()` calls it before its first `await`.
2. Every mic failure shows a visible alert banner (not just a status line):
   permission denied, no device, no `mediaDevices`, a Permissions-Policy block, and
   audio staying suspended. When embedded in an iframe, the message says the host may
   be blocking the mic.
3. The Start button shows "Waiting for microphone…" while the permission prompt is
   open.
4. All mic tracks are stopped on Stop and on `pagehide`.
5. Guitar positions use **sounding pitch** (MIDI arithmetic), not written pitch —
   guitar music is written an octave higher than it sounds. Keep the footnote.
6. Notes outside a tuning's range (or outside C2–C7 on the piano) say so in text
   instead of just showing nothing.

## What's deliberately not here yet

Pitch-history trace, scale/key detection, bass/ukulele/left-handed layouts, capo
support, MIDI/note-list export, PWA/offline install. The module boundaries above
(especially `stabilizer.ts` and `fretboard-positions.ts` being pure) are meant to make
these easy to add later without restructuring.
