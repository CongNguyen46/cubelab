// Helpers shared by the solver tests. Not used by the app.
import { applyAlg, MOVE_BASES, solvedState, type CubeState, type Move } from '../engine/index.ts'

/** Seeded random numbers, so a failing state can be reproduced from its seed. */
export function rng(seed: number) {
  let s = Math.imul(seed, 2654435761) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/**
 * A random state reached by `length` random moves, including slices and whole-cube rotations,
 * so the solver's orientation remap is exercised too.
 */
export function randomState(seed: number, length = 30): { state: CubeState; moves: Move[] } {
  const rand = rng(seed)
  const moves = Array.from({ length }, () => ({
    base: MOVE_BASES[Math.floor(rand() * MOVE_BASES.length)]!,
    turns: (1 + Math.floor(rand() * 3)) as Move['turns'],
  }))
  return { state: applyAlg(solvedState(), moves), moves }
}
