# CubeLab

A web app with a playable 3D Rubik's cube at the centre of the home page and three buttons under it: Scramble, Solve, Timer. Later areas: Cube Builder (rebuild a real stuck cube piece by piece, then solve it), a beginner layer-by-layer guide, and an Advanced CFOP library that shows Coming soon in v1.

Owner: Cong Bao Nguyen (GitHub `CongNguyen46`). Solo personal project, no deadline, built sprint by sprint following the SDLC. Claude is the pair programmer and reviewer.

## Read these first

1. `docs/requirements.md`: requirements (FR-1 to FR-8, NFR-1 to NFR-12), stack, risks, sprint plan.
2. `docs/design-system.md`: tokens, type, logo, buttons, layout, motion.
3. `prototype/index.html`: the approved homepage design, working end to end. It is the visual and behavioural spec for the homepage. Open it in a browser before changing anything visual.

## Where the project is now

- Requirements and plan: done.
- Design: done for the homepage. Brand canvas, prototype and Blender model are approved.
- Sprint 0 done: scaffold, tokens, CI, Vercel. Production: https://cubelab-nine.vercel.app (prototype at `/prototype/`).
- Sprint 1 done: cube engine (`src/engine`), R3F renderer driven by the engine (`src/renderer`), keyboard turns, move history, undo and reset on the home page.
- Sprint 2a done: drag-to-turn, whole-cube drag with settle-to-24, auto-spin, double-click reset, hero (LED word, glow, floor reflection, shadow), full-screen menu.
- Sprint 2b done: two-phase solver (vendored cubejs) in a Web Worker, Scramble and animated Solve with the loading-to-done button. **Milestone: core MVP.**
- Sprint 3a done: inline timer (state machine in `src/timer`), Space, Timer button, Esc, touch pad, input locks.
- Homepage fixes after testing (fix/homepage-behaviour): home view, Scramble from the current state and view, view drags during playback, no Reset, fixed Undo, no scramble line, solved message over the timer.
- Next is **Sprint 3b**: inspection, new scramble after each solve, session panel, Dexie storage.

Engine notes:

- `isSolved` is sticker-based: every face one colour. Whole-cube rotations and centres spun in place still count as solved.
- `toFacelets` normalises orientation first (white centre up, green front), so the URFDLB string is valid for cubejs after x/y/z and slice moves.
- cubejs returns a solution in that normalised frame. Before animating it (Sprint 2), remap each face letter to the current orientation: replace letter X with the face where the X centre sits now. For example, after `x` the F (green) centre is on top, so a solution move F becomes U. Without this, Solve breaks after any x/y/z or slice move. Test it: scramble, apply `x y` or `M`, solve, and check `isSolved`.
- `remapMove(move, m)` renames a move between frames (one of the 24 rotations). It serves the keyboard, history labels and the solver remap.

Solver notes:

- cubejs 1.3.2 is vendored in `src/solver/vendor/` (its npm package depends on npm@6). See the README there for the three ES-module patches. Excluded from lint, Prettier and coverage.
- The page imports only `solver/client.ts` and `solver/shorter.ts`. Importing `solver/core.ts` or `solver/index.ts` from page code would pull the solver into the first bundle.
- Two-phase is not optimal near solved (a single R gets 8 moves), so Solve plays the shorter of the solver answer and the undone history. History always starts from solved.
- Scramble plays on top of the current state, from the current view: no cube reset, no view reset. Its moves go into the history (Undo steps back through them) with labels in the viewer's frame at the moment Scramble was pressed. There is no scramble text line; the chips show the moves.
- `npm run test:slow` runs the 1,000-state FR-3 acceptance (about 100 s). CI runs it on pushes to main only; normal runs check 200 states.

Timer notes:

- `src/timer/machine.ts` is a pure reducer ported from the prototype; the store stamps events with `performance.now()` and schedules the 150 ms and 400 ms ticks.
- Space is handled in the capture phase and always `preventDefault`ed, so it never scrolls, clicks a focused button or reaches the cube keys.
- Locks live in `ui/playStore.ts`. `inputLocked(pointerType?)`: Scramble/Solve playing or the timer held/running locks keys, Undo, the buttons and the menu. On the canvas, `pointerLocked` locks only for the timer (held/running, or touch while the digits show), and `turnsLocked` (Scramble/Solve playing) turns every drag into a view drag, so you can turn the whole cube while the moves play. Move labels are fixed when the play starts, so a view drag mid-play does not change them.
- After a Solve with the digits shown (idle or stopped), "Solved in N moves" covers them for 1.5 s, then they fade back (`ui/solvedFlash.ts`). Any timer input ends it.
- Esc while running discards the solve (no result).

View and input notes:

- The whole-cube view (`ViewController`) is a view rotation only. The engine never sees it.
- Home view (`HOME_VIEW`): white up, the orange (L) face toward the camera, a quarter turn about y from the engine frame (white up, green front). The page loads there and double-click returns there. The glow starts on orange (CSS default and `GlowTracker`), so the first frame is orange.
- Glow hysteresis is 0.1, below the 0.113 margin between the front and side face in a settled view, so the front face always wins once the cube settles.
- Keys name faces in the viewer's frame: R is the face on your right. The key move is mapped through the settled view to an engine move. History stores the engine move plus a display label (what the user pressed, or a drag named in the view frame); chips show the label, undo uses the engine move.
- A finished drag goes to the engine with `{ animated: true }`, so the animator only syncs instead of turning the layer again. Keyboard turns and undo wait while a layer is being dragged.
- With current three.js, set `envMap` on each material. If only `scene.environment` is set, three ignores the per-material `envMapIntensity` and the tiles wash out. Light intensities are the prototype's times PI (legacy to physical units).

## Decisions that override the requirements doc

These were made during design. If the doc and this list disagree, this list wins.

- **Timer** is inline under the cube, digits only (`00.00`, Geist Mono 30px), no panel and no labels.
  - Hold Space: digits appear grey, turn mint after 400 ms. Release starts. A quick tap does nothing.
  - Running and stopped digits are Lab Orange.
  - Space or the Timer button stops it. Timer button cycles start, stop, hide. Esc or clicking the digits hides it.
  - Idle hint line: "Hold [Space] to start the timer", with the Space key chip in orange.
- **Solve result** is the line "Solved in N moves" with N in Lab Orange. No toast.
- **Solve button** is Lab Orange `#FF6A1A` with a loading-to-done animation and a mint `#7EE8C0` done state. Measure its width only on click and reset to auto after.
- **Whole-cube drag** settles to the nearest of the 24 axis-aligned orientations, so the cube never stays tilted and any face can be brought to the top. Dragging a face turns that layer. Double-click resets the view to home (white up, orange front).
- **Hero**: LED-style "CUBELAB" word behind the cube (solid, lit from one side), and a glow that follows the colour of the centre piece facing the camera. Compute the glow from the real centre pieces' world positions, not from cube-local axes (slice moves break that).
- **Under the cube**: the move chips and Undo only, no Reset. The chips sit in a fixed-width track (10 chips, 6 below 640 px), newest next to Undo, so Undo never moves. With no history Undo fades out but keeps its place.
- **Header**: Grid C v0.2 logo plus a hamburger that opens a full-screen menu.
- Fonts: Geist and Geist Mono.

## Cube model

- `public/models/cubelab_cube.glb`: about 1 MB, 26 cubies, black bevelled bodies with GAN-style tiles, clearcoat. Built by `tools/blender/cubelab_cube.py` (Blender 5.2/5.3) and exported with `tools/blender/export_glb.py`.
- Node names are `Cubie_x_y_z` in Blender coordinates (Z up). glTF is Y up, so do not trust the names for position. Read each cubie's world position after load and round it, as the prototype does in `onModel`.
- Face order used in code: +x R, -x L, +y U, -y D, +z F, -z B.
- Renderer settings that make the colours right: `ColorManagement.enabled = true` (legacy mode off), ACES filmic tone mapping, exposure about 0.86, RoomEnvironment for reflections, low `envMapIntensity` (0.2 body, 0.35 tiles).

## Prototype vs real app

The prototype is a design reference, not code to keep. Known gaps the real app must fix:

- Solve only reverses the move history. Use a real solver (cubejs two-phase in a Web Worker).
- There is no cube state engine. The 3D view is the state. The real app needs a pure TypeScript engine that owns state; the renderer only animates what the engine reports.
- One 1.4 MB file with the model embedded as base64. In the app, load the GLB from `public/models/`.
- Three.js 0.147 from a CDN. Use the npm package, current version, through React Three Fiber.
- Move notation after whole-cube flips is relative to the starting orientation. The engine should track orientation so notation stays correct.

Port behaviour and feel from the prototype (drag-to-turn raycast, settle-to-24, glow logic, timer states, Solve button animation), but rewrite the code cleanly.

## Stack

React + Vite + TypeScript (strict), Three.js via React Three Fiber and drei, Zustand, Tailwind CSS, Motion, cubejs (solver, Web Worker), cubing.js (scrambles), Dexie (IndexedDB), Vitest, Playwright, vite-plugin-pwa, GitHub Actions, Vercel.

Planned layout:

```
src/
  engine/     pure TS cube state, moves, notation parser (no React, no three)
  solver/     worker wrapper around cubejs
  renderer/   R3F scene, cube model, drag, glow
  timer/      timer logic and UI
  learn/      guide content (later)
  storage/    Dexie
  ui/         buttons, header, menu
```

Modules talk through small typed interfaces. Keep `engine/` free of UI imports so it stays easy to test.

## Known issues

- On Windows, a Vitest run started right after a command rewrites test files can fail every suite with "Cannot read properties of undefined (reading 'config')". Running it again passes. Not seen in CI.

## Rules

- Style for any text written to the user or in the UI: concise, plain, no em dashes.
- Every feature ships with tests. Target 90% coverage on `engine/`.
- Small commits, Conventional Commits with the FR ID when there is one, for example `feat(engine): parse slice moves (FR-1.3)`.
- Work on a branch per task and open a PR to `main`; `main` deploys to Vercel.
- Ask before adding a dependency that is not in the stack above.
- Do not change the look of the homepage without checking it against `prototype/index.html` side by side.
- Never commit secrets or `.env` files.
- No Claude attribution anywhere: no Co-Authored-By trailers in commits, no 'Generated with Claude Code' line in PR descriptions.

## Commands (after Sprint 0)

```
npm install
npm run dev        # local dev server
npm run test       # Vitest
npm run lint
npm run test:slow  # 1,000-state solver acceptance, about 100 s
npm run build
```
