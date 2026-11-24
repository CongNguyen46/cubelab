import { invertAlg, type Move } from '../engine/index.ts'

/**
 * The shorter of two ways to solve: the two-phase solution, or undoing the move history (which
 * always starts from solved). Two-phase is not optimal for nearly-solved cubes, for example it
 * answers a single R with eight moves, so a short history wins there. Ties go to the solver.
 *
 * Kept apart from core.ts so the page can use it without loading the solver itself.
 */
export function shorterSolution(solver: readonly Move[], history: readonly Move[]): Move[] {
  const undo = invertAlg(history)
  return undo.length < solver.length ? undo : [...solver]
}
