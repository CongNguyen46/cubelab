import {
  centreOrientation,
  formatAlg,
  isSolved,
  parseAlg,
  remapAlg,
  toFacelets,
  type CubeState,
  type Move,
} from '../engine/index.ts'
import Cube from './vendor/cube.js'
import './vendor/solve.js'

/** Two-phase solutions are at most this long (FR-3.1). */
export const MAX_SOLUTION_LENGTH = 22

let ready = false

/** Build the solver tables (about a second). Safe to call more than once. */
export function initSolver() {
  if (ready) return
  Cube.initSolver()
  ready = true
}

/**
 * Solve a URFDLB facelet string in the normalised frame (white up, green front), as given by
 * the engine's toFacelets. Returns face moves in that frame.
 */
export function solveFacelets(facelets: string): Move[] {
  initSolver()
  return parseAlg(Cube.fromString(facelets).solve(MAX_SOLUTION_LENGTH))
}

/**
 * Moves that solve `state` from where it is now. The solver works in the normalised frame, so the
 * solution is remapped through the current centre orientation (after x, y, z or slice moves).
 * Returns [] for a cube that already looks solved.
 */
export function solveState(state: CubeState): Move[] {
  if (isSolved(state)) return []
  return remapAlg(solveFacelets(toFacelets(state)), centreOrientation(state))
}

/**
 * A random-state scramble (FR-2.1): a uniformly random cube, solved, and the solution inverted.
 * Applied to a solved cube in the starting orientation it gives that random state. Two-phase
 * solutions never turn the same face twice in a row, so neither does the scramble.
 */
export function randomScramble(): Move[] {
  initSolver()
  return parseAlg(Cube.scramble())
}

/** Messages the solver worker understands, and its replies. */
export type SolverRequestBody =
  { type: 'init' } | { type: 'solve'; facelets: string } | { type: 'scramble' }

export type SolverRequest = SolverRequestBody & { id: number }

export type SolverResponse =
  { id: number; ok: true; moves: string } | { id: number; ok: false; error: string }

/** The worker's message handler, kept here so it can be tested without a Worker. */
export function handleRequest(req: SolverRequest): SolverResponse {
  try {
    if (req.type === 'init') {
      initSolver()
      return { id: req.id, ok: true, moves: '' }
    }
    if (req.type === 'solve') {
      return { id: req.id, ok: true, moves: formatAlg(solveFacelets(req.facelets)) }
    }
    if (req.type === 'scramble') return { id: req.id, ok: true, moves: formatAlg(randomScramble()) }
    throw new Error(`Unknown request: ${(req as { type: string }).type}`)
  } catch (e) {
    return { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export { shorterSolution } from './shorter.ts'
