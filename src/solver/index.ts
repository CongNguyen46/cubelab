// Solver: two-phase cubejs (vendored) in a Web Worker. The page uses `solver` from client.ts;
// core.ts holds the pure logic the worker runs, so it can be tested without a Worker.
export { SolverClient, solver } from './client.ts'
export { MAX_SOLUTION_LENGTH, shorterSolution, solveState } from './core.ts'
