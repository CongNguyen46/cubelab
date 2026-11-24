# Sprint 0 prompt for Claude Code

Paste the block below into Claude Code after the starter files are committed.

---

Read CLAUDE.md, docs/requirements.md and docs/design-system.md, then open prototype/index.html to see the approved homepage. Summarise in a few lines what CubeLab is and where it stands, so I know you have the context.

Then do Sprint 0 on a branch called `sprint-0`:

1. Scaffold a Vite + React + TypeScript (strict) app in the repo root. Add Tailwind and set up the colour tokens and fonts (Geist, Geist Mono) from docs/design-system.md. Add ESLint and Prettier.
2. Keep `prototype/index.html` as is and make it reachable at `/prototype/` in the built site, so the approved design stays online for reference.
3. Make the app's home page a placeholder that uses the real tokens: black page, the logo from `public/brand/logo-mark.svg` with the "Cube" + "Lab" wordmark, the hamburger, and the three buttons (Scramble, Solve in orange, Timer) with no behaviour yet. Add the favicon.
4. Add Vitest with one sample test, and create the empty folders from the planned layout in CLAUDE.md with an index file each.
5. Add a GitHub Actions workflow that runs lint, test and build on every push and pull request.
6. Add a README with what the project is, a link to the prototype, and the commands.
7. Commit in small Conventional Commits, push the branch, and open a PR to `main`.

After that, tell me the exact steps to connect the repo to Vercel so `main` deploys automatically and each PR gets a preview link. Do not start Sprint 1 until I say so.
