// Solver: two-phase cubejs (vendored) in a Web Worker. core.ts holds what the worker runs, so
// it can be tested without a Worker. The page imports client.ts and shorter.ts directly, never
// this file or core.ts, so the solver tables stay out of the first bundle.
export { SolverClient, solver } from './client.ts'
export { MAX_SOLUTION_LENGTH, solveState } from './core.ts'
export { shorterSolution } from './shorter.ts'
