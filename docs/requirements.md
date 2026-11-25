# CubeLab: Requirements Analysis and Project Plan

Nov 24, 2026 · Cong Bao Nguyen

> Exported from the Docs artifact (rev 60). A few items were updated to match decisions made during the design phase; they are marked **(updated)**. CLAUDE.md lists every decision that supersedes this doc.

## 1. Summary and assumptions

CubeLab is a web app with a playable 3D Rubik's cube at the centre of the home page and three buttons under it: Scramble, Solve and Timer. Around that core sit three feature areas: Cube Builder for solving a real cube you are stuck on, a beginner guide for the layer-by-layer method, and an advanced library for CFOP that shows Coming soon in v1. Version 1 should be one frontend app with a modular codebase. Microservices are not needed, see section 2.

The vision: one place to play, learn and get unstuck.

Working assumptions:

- **Platform:** web app that runs in the browser, with code on GitHub and deployed to a cloud host. It is responsive, so it also works in phone browsers. A native mobile app is out of scope until a later version.
- **Team:** Bao as the only developer, with Claude as pair programmer and reviewer.
- **Timeline:** no fixed deadline. Work moves sprint by sprint, and section 9 sets the order with rough sizes as a guide.
- **Puzzle scope:** 3x3x3 only in v1.
- **Budget:** free tiers only for hosting and CI.
- **Data:** no user accounts in v1. Solve history and progress are stored in the browser, with JSON export.

## 2. Architecture decision: no microservices in v1

Build v1 as a single frontend app split into well-defined modules, a modular monolith. Every v1 feature can run in the browser, so there is nothing for separate services to do.

Why microservices don't fit here:

- **No server work exists.** Rendering, the move engine, the solver and the timer all run client-side. A JavaScript two-phase solver returns a solution in roughly 100 ms after a one-time table setup of about 2 seconds, so a solve server adds latency and buys nothing.
- **The costs land on one person.** Microservices pay off when several teams deploy independently or parts need to scale separately. For one developer they add Docker setup, network calls, API contracts, inter-service auth and more failure points.
- **The timer must be local.** Timing a solve through a network round trip would hurt accuracy.

What to do instead:

- Keep modules separated behind clear interfaces: **cube-engine**, **solver**, **renderer**, **timer**, **learn** and **storage**.
- Write the cube engine as pure TypeScript with no UI code. It holds the single source of truth for cube state, which makes it easy to test and easy to extract into a package or service later.
- Run the solver in a Web Worker so its setup never freezes the UI.

When a backend becomes worth it, in v2: accounts, cloud sync of solve history and leaderboards. One small API covers that, built with FastAPI or a hosted option like Supabase. A camera-scan feature that reads a real cube with a Python computer-vision model would be a fair reason for a separate service, since it needs a different runtime.

## 3. Target users

| Persona | Situation | What they need | Main features |
| --- | --- | --- | --- |
| Beginner | Has never solved a cube | Clear steps, notation explained, practice on screen | Beginner guide, 3D cube |
| Stuck solver | Holding a real cube, stuck on the last layer | Copy the cube into the app and see how to finish | Cube Builder, Solve |
| Improver | Solves with layer-by-layer, moving to CFOP | Organised algorithms, recognition help, progress tracking | Advanced library |
| Speedcuber | Practises for speed | Fair scrambles, an accurate timer, averages | Timer, Scramble |

## 4. Features and priority

v1 ships every Must and as many Shoulds as time allows. Priority uses MoSCoW: Must, Should, Could, Won't for now.

| Feature | Priority | Release |
| --- | --- | --- |
| Interactive 3D cube on the home page | Must | v1 |
| Scramble button | Must | v1 |
| Solve button with a one-tap animated solve | Must | v1 |
| Timer button with an inline timer under the cube **(updated)** | Must | v1 |
| Cube Builder: drag pieces into an empty cube to match a real one, then solve it | Must | v1 |
| Beginner guide: layer-by-layer method | Must | v1 |
| Notation tutorial | Must | v1 |
| Advanced library: Coming soon page | Must | v1 |
| Advanced library: CFOP with 2-look and full OLL and PLL | Could | later |
| Method-based solutions that teach, alongside the fastest solution | Should | v1 |
| Solve history and averages | Should | v1 |
| Learning progress tracking | Should | v1 |
| Dark and light themes, colour-blind sticker labels | Should | v1 |
| Algorithm trainer with random cases | Could | later |
| Roux and ZZ methods | Could | v2 |
| Camera scan of a real cube | Could | v2 |
| Accounts, cloud sync, leaderboards | Won't for now | v2 |
| Other puzzles such as 2x2 and 4x4 | Won't for now | later |

Feature name for the empty-cube feature: **Cube Builder**, with its action called **Build and Solve**.

## 5. Functional requirements

Each feature has a user story, numbered requirements and acceptance criteria. The IDs carry into the backlog, the tests and commit messages.

### FR-1 Home page and 3D cube

*As a user, I want to turn the on-screen cube like a real one, so the app feels like holding a cube.*

- **FR-1.1** Render a 3x3x3 cube in the centre of the home page, with Scramble, Solve and Timer buttons below it.
- **FR-1.2** Drag on a face to turn that layer. Drag on the background to rotate the whole cube; on release it settles to the nearest of the 24 axis-aligned orientations **(updated)**. Support mouse and touch.
- **FR-1.3** Accept keyboard moves in standard notation: R, U, F, L, D, B, their inverses and double turns, slice moves M, E, S and cube rotations x, y, z.
- **FR-1.4** Animate each turn and snap it to 90 degrees. Animation speed is adjustable.
- **FR-1.5** Provide undo and redo (reset removed from the UI by decision).
- **FR-1.6** Show the move history in notation under the cube.

Acceptance: a turn finishes in 200 ms or less at default speed. After any move sequence, the rendered cube matches the engine's state, checked by automated tests.

### FR-2 Scramble

*As a speedcuber, I want a fair scramble, so practice matches competition conditions.*

- **FR-2.1** Generate a random-state 3x3 scramble of about 20 moves.
- **FR-2.2** Animate the scramble on the cube with fast, smooth turns in the same motion style as Solve, and display it in notation. Scramble and Solve are disabled while it plays, and tapping Scramble again skips to the scrambled state. With reduced motion turned on, the scramble applies instantly.
- **FR-2.3** Allow copying the scramble and requesting a new one.

Acceptance: applying the displayed scramble to a solved cube gives the state on screen. No scramble turns the same face twice in a row.

### FR-3 Solve button on the home page

*As a user, I want one tap to solve the cube with smooth motion, so it is satisfying to watch.* Step-by-step solutions belong to Cube Builder, see FR-5.8.

- **FR-3.1** Compute a solution for the current state with the two-phase algorithm, 22 moves or fewer.
- **FR-3.2** Play the whole solution as one continuous animation with eased turns, at a pace that looks good rather than one slow enough to follow.
- **FR-3.3** Disable Scramble and Solve while the animation runs. Tapping Solve again skips to the solved state.
- **FR-3.4** The Solve button shows a loading state while solving and a mint done state at the end. The line under the cube reads "Solved in N moves", with N in Lab Orange. No toast **(updated)**.
- **FR-3.5** If the cube is already solved, say so and disable the button.

Acceptance: after warm-up, the animation starts within 1 second of the tap on a mid-range phone and runs at 60 fps. In a test of 1,000 random states, every solution ends in the solved state.

### FR-4 Timer

*As a speedcuber, I want a timer that follows competition rules, so my times are comparable.*

- **FR-4.1** **(updated)** The timer is inline under the cube: digits only (00.00), no panel, no labels. The Timer button cycles start, stop, hide. Esc or clicking the digits hides it.
- **FR-4.2** **(updated)** Hold Space on desktop, or press and hold on touch screens. The digits appear grey while held and turn mint after 400 ms. Release to start. A quick tap does nothing. Space or the Timer button stops it. Digits stay Lab Orange while running and after stopping.
- **FR-4.3** Optional 15-second inspection with spoken or visual warnings at 8 and 12 seconds. Starting after 15 seconds adds a +2 penalty; after 17 seconds the solve is a DNF.
- **FR-4.4** Show a new scramble after each solve.
- **FR-4.5** Keep a session list with best time, mean, ao5 and ao12. Users can delete a time or change its penalty.
- **FR-4.6** Save sessions in the browser and keep them across visits.

Acceptance: times display to 0.01 s, measured with a high-resolution clock. ao5 drops the best and worst of five and averages the other three.

### FR-5 Cube Builder

*As a cuber stuck on the last layer, I want to rebuild my real cube in the app piece by piece, so it shows me how to finish.*

- **FR-5.1** Builder mode shows an empty 3D cube frame with 20 slots: 8 corner slots and 12 edge slots. The 6 centres are fixed and define each face's colour. The frame can be rotated so every slot is reachable.
- **FR-5.2** A piece tray shows 3D models of all 20 pieces: 8 corners with three colours and 12 edges with two. Each piece can be used once and leaves the tray when placed.
- **FR-5.3** Drag a piece from the tray into a slot. Corners snap only into corner slots and edges only into edge slots. On touch screens, tapping a piece and then a slot works as an alternative to dragging.
- **FR-5.4** Tap a placed piece to rotate it in its slot: a corner cycles through its 3 orientations and an edge flips between its 2. Drag a piece back to the tray to remove it.
- **FR-5.5** Auto-fill buttons save work. **Fill first two layers** places the 12 bottom and middle pieces correctly with an animation, leaving only the 8 last-layer pieces, 4 corners and 4 edges, in the tray. **Fill first layer** and **Clear** are also available.
- **FR-5.6** Before auto-fill, the user confirms how they hold the real cube: the bottom colour, white by default, and the front colour. Auto-fill and the solution follow that orientation.
- **FR-5.7** Validate the finished cube: all 20 pieces placed, corner twists add up to a multiple of 3, edge flips add up to an even number, and corner and edge permutations have matching parity. If a check fails, point to the likely piece with a plain message such as "One corner is twisted. Tap it to rotate."
- **FR-5.8** When the cube is valid, enable **Build and Solve**. This is where users see every step: the solution in notation with the current move highlighted, playback controls for play, pause, step forward, step back and speed, and a follow-along view that waits for the user to confirm each move on their real cube. Two modes: **Fastest**, the two-phase solution, and **Teach me**, a layer-by-layer solution split into named stages. Teach me is a Should.

Acceptance: after Fill first two layers, a user can enter any last-layer case by placing 8 pieces. A state with one twisted corner is rejected with a specific message. Every valid built state solves, and replaying the solution on the 3D cube ends solved.

### FR-6 Beginner guide

*As a beginner, I want short lessons with demos, so I can solve my first cube.*

- **FR-6.1** Start with a notation lesson that explains each move with a 3D demo.
- **FR-6.2** Teach the layer-by-layer method in seven stages: white cross, white corners, middle-layer edges, yellow cross, yellow edges, position yellow corners, orient yellow corners.
- **FR-6.3** Each stage reads top to bottom: an image of the stage's goal, written instructions, then an interactive 3D demo of the stage. The goal image is rendered from the cube engine, so no image files are needed.
- **FR-6.4** The demo has controls: **Reset** to the stage's starting state, **Previous** and **Next** for one move at a time, **Play all** to run every move of the stage, and a speed setting. The stage's algorithm is shown in notation with the current move highlighted.
- **FR-6.5** Users move between stages by scrolling down or with **Next stage** and **Previous stage** buttons. A progress bar shows the current stage out of 7.
- **FR-6.6** Track which stages the user has completed.

Acceptance: every algorithm in the guide, applied to its practice case, reaches the stage's goal state. A test checks this for each one.

### FR-7 Advanced library, coming soon

In v1, the Advanced section shows a Coming soon page. The requirements below are kept for a later version.

*As an improver, I want CFOP algorithms organised by case, so I can learn them in order.*

- **FR-7.1** Cover CFOP in four parts: cross, F2L with 41 cases, OLL with 57 cases and PLL with 21 cases.
- **FR-7.2** Offer a bridge set first: 2-look OLL with 10 algorithms and 2-look PLL with 6.
- **FR-7.3** Each case shows a top-view diagram, recognition tips, one to three algorithms and an animated preview.
- **FR-7.4** Users mark each case as Not started, Learning or Learned, and filter by status.
- **FR-7.5** Store algorithms as JSON data, so adding Roux or ZZ later needs no code change.

Acceptance: each stored algorithm, applied to its case, solves that case. A test checks every entry.

### FR-8 Settings

- **FR-8.1** Theme: dark, light or system.
- **FR-8.2** Animation speed and an option to reduce motion.
- **FR-8.3** Colour-blind mode that adds a letter to each sticker.
- **FR-8.4** Export and import all saved data as a JSON file.

## 6. Non-functional requirements

| ID | Category | Requirement | Target |
| --- | --- | --- | --- |
| NFR-1 | Performance | Smooth 3D rendering and UI animation | 60 fps on a mid-range laptop and phone |
| NFR-2 | Performance | Fast first load | Under 3 s on 4G; initial bundle under 500 KB gzipped, solver and cube model loaded later |
| NFR-3 | Performance | Solver never blocks the UI | Runs in a Web Worker; solve under 1 s after warm-up |
| NFR-4 | Usability | A first-time user can play without help | Scramble and solve within 30 s of landing |
| NFR-5 | UI and motion | Consistent design system | One set of colour, type and spacing tokens; every transition 150 to 400 ms |
| NFR-6 | Responsiveness | Works on phones through large monitors | 360 px to 2560 px wide |
| NFR-7 | Accessibility | Usable by more people | WCAG 2.2 AA contrast, full keyboard control, honours the reduced-motion setting |
| NFR-8 | Offline | Works without a connection | PWA, fully usable offline after the first visit |
| NFR-9 | Reliability | No lost solve history | Saved after every solve; JSON export and import |
| NFR-10 | Maintainability | Code stays easy to change | TypeScript strict mode; cube engine test coverage of 90% or more; lint and format checks in CI |
| NFR-11 | Compatibility | Runs on current browsers | Latest two versions of Chrome, Safari, Firefox and Edge, with WebGL 2 |
| NFR-12 | Privacy | No personal data collected | No accounts or tracking in v1 |

## 7. Recommended tech stack

Use React with Three.js for the cube, and write your own cube engine. A library handles only the solver and scrambles, the parts that would take months to do well. Owning the engine and the 3D interaction is what makes this a strong portfolio project.

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript | Type safety for cube state and move logic |
| Framework and build | React with Vite | Fast dev server, large ecosystem |
| 3D | Three.js through React Three Fiber and drei | Declarative 3D scene inside React |
| UI motion | Motion, formerly Framer Motion | Page transitions, the timer reveal, button feedback **(updated)** |
| Styling | Tailwind CSS | Quick, consistent design tokens |
| State | Zustand | Small store shared by the cube, timer and settings |
| Cube engine | Your own TypeScript module | Single source of truth, fully unit tested |
| Solver | [cubejs](https://github.com/ldez/cubejs) in a Web Worker | MIT licensed two-phase solver, 22 moves or fewer |
| Teach-me and step solvers | [cube-solver](https://github.com/torjusti/cube-solver), to evaluate | Also solves single steps such as the CFOP cross |
| Scrambles | [cubing.js](https://js.cubing.net/cubing/) scramble module | Fair random-state scrambles |
| Storage | IndexedDB through Dexie | Solve history and progress kept in the browser |
| Testing | Vitest for unit tests, Playwright for end-to-end tests | Fast, works with Vite |
| PWA | vite-plugin-pwa | Offline support and install prompt |
| CI/CD | GitHub Actions, deploying to Vercel or Cloudflare Pages | Free tier, preview link for every pull request |
| v2 backend | FastAPI or Supabase | Accounts and sync once they are needed |

Check each library's licence before release. The cubing.js documentation describes it as usable under MPL terms when used as a library.

## 8. Risks and mitigations

The two biggest risks are drag-to-turn interaction and keeping the 3D view in sync with the cube state. Both get tackled in the first two sprints. The prototype in `prototype/` already proves drag-to-turn works.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Drag-to-turn is hard: working out which layer and direction from a mouse drag | High | Keyboard and button turns first, then port the raycast drag from the prototype |
| 3D view and cube state drift apart | High | The engine owns state; the renderer only animates what the engine reports; automated sync tests |
| Scope creep from too many methods and extras | High | Stick to MoSCoW; anything new goes into the v2 backlog |
| Solver setup freezes the page | Medium | Web Worker, warmed up while the page is idle |
| Cube Builder input mistakes frustrate users, and dragging is fiddly on small screens | Medium | Auto-fill buttons, slots that accept only the right piece type, tap-to-place on touch, validation messages that point to the wrong piece |
| Two-phase solutions are hard for humans to follow | Medium | Teach me mode with layer-by-layer stages |
| Wrong algorithms in the guide or library | Medium | Every stored algorithm is tested against its case |
| Momentum fades with no deadline | Medium | Reach the core MVP early; set one goal at the start of each sprint and demo it at the end |

## 9. Project plan

There is no deadline, so the plan sets the order of work and a rough size for each sprint. v1.0 goes live when the Release row is done.

How the SDLC phases map to the work:

1. **Planning and requirements:** this doc. Done.
2. **Design:** brand canvas, homepage prototype (`prototype/index.html`), Blender cube model. Done.
3. **Implementation:** sprints 1 to 5, Agile style with a backlog built from the FR IDs.
4. **Testing:** continuous. Unit tests ship with every feature; end-to-end tests are added per sprint.
5. **Deployment:** CI/CD from sprint 0, so every merge to main deploys a live preview.
6. **Maintenance:** after v1.0, bug fixes from user feedback and the v2 backlog.

| Sprint | Rough size | Scope | Done when |
| --- | --- | --- | --- |
| Sprint 0 | 1 week | Repo, prototype live on Vercel, Vite + React + TS scaffold, CI pipeline | Prototype and empty app both deploy automatically |
| Sprint 1 | About 2 weeks | Cube engine: state model, moves, notation parser, tests. 3D cube rendered from the GLB with keyboard and button turns | Any move sequence renders correctly and passes sync tests |
| Sprint 2 | About 2 weeks | Drag-to-turn, whole-cube rotation, Scramble, solver in a Web Worker, animated Solve | **Milestone: core MVP.** Home page cube with working Scramble and Solve |
| Sprint 3 | About 2 weeks | Inline timer, inspection and penalties, session stats, local storage | Full timed solve flow saves and survives a reload |
| Sprint 4 | About 2 weeks | Cube Builder: 3D piece models, piece tray, drag and drop, rotate pieces, auto-fill, validation, Build and Solve, Teach me mode | Built states validate and solve |
| Sprint 5 | About 2 weeks | Notation lesson, beginner guide, progress tracking, Coming soon page for the advanced library | Every algorithm passes its test |
| Release | About 1 week | UI and motion polish, accessibility pass, PWA, performance tuning, bug fixes, retrospective | **Milestone: v1.0 live** |

Each sprint ends with a short review: a demo of what works, what slipped, and what moves to the next sprint.

## 10. Open questions

- [x] Platform: browser web app on GitHub and a cloud host first; native mobile app later.
- [x] Timeline: no fixed deadline, sprint by sprint.
- [x] App name: CubeLab.
- [ ] Colour scheme: standard (white opposite yellow, green in front) for now; revisit while building.
- [ ] Teach me mode: decide during Sprint 4, once Cube Builder is working.
