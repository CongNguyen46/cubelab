# Vendored cubejs

Source: [cubejs](https://github.com/ldez/cubejs) version **1.3.2** from npm (`npm pack cubejs@1.3.2`), files `lib/cube.js` and `lib/solve.js`. MIT licence, see `LICENSE`.

Why vendored: the npm package lists `npm@^6` as a runtime dependency, which would pull the whole npm 6 CLI into the project. The two files below are all the solver needs.

Changes from upstream, each marked with a `CubeLab patch` comment:

1. `cube.js`: `export default` the module IIFE instead of a CommonJS/global wrapper.
2. `cube.js`: `return Cube` instead of setting `module.exports` or `this.Cube`.
3. `solve.js`: `import CubeModule from "./cube.js"` instead of `this.Cube || require('./cube')`, and run the IIFE without `.call(this)`.

Nothing else is changed. The folder is excluded from lint, Prettier and coverage. Types are in `cube.d.ts` and `solve.d.ts`.

To update: `npm pack cubejs@<version>`, copy `lib/cube.js` and `lib/solve.js`, reapply the three patches, run `npm run test:slow`.
