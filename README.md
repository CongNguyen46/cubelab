# CubeLab

A web app for playing, learning and solving the Rubik's cube, with a 3D cube you can turn by hand.

The home page has a playable 3D cube with three buttons under it: Scramble, Solve and Timer. Later areas: Cube Builder (rebuild a real cube you are stuck on, then solve it), a beginner layer-by-layer guide, and an Advanced CFOP library.

Status: Sprint 2 done (core MVP). Turn the cube by dragging or with the keyboard, Scramble and Solve. Live at https://cubelab-nine.vercel.app.

## Prototype

The approved homepage design is [prototype/index.html](prototype/index.html). It works end to end and is the visual spec for the home page.

- Locally: open the file in a browser, or run `npm run dev` and go to `/prototype/`.
- Live: `/prototype/` on the deployed site.

## Docs

- Requirements and plan: [docs/requirements.md](docs/requirements.md)
- Design system: [docs/design-system.md](docs/design-system.md)
- Notes for Claude Code: [CLAUDE.md](CLAUDE.md)

## Commands

Needs Node.js 22 or later.

```
npm install
npm run dev        # local dev server at http://localhost:5173
npm run test       # Vitest
npm run test:coverage  # Vitest with the 90% engine coverage gate
npm run test:slow      # 1,000 random states must solve (about 100 s)
npm run lint       # ESLint and Prettier check
npm run format     # Prettier, rewrite files
npm run build      # type check and production build into dist/
npm run preview    # serve the production build
```

## Stack

React, Vite, TypeScript (strict), Tailwind CSS, Vitest, ESLint, Prettier. Three.js via React Three Fiber, Zustand, cubejs, cubing.js and Dexie come in later sprints.

Built by Cong Bao Nguyen.
