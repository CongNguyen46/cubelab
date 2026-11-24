// Full FR-3 acceptance: 1,000 random states all solve. About a minute, so it runs with
// `npm run test:slow` (CI runs it on main only). Normal runs check 200 states in solver.test.ts.
import { describe, expect, it } from 'vitest'
import { applyAlg, formatAlg, isSolved } from '../engine/index.ts'
import { initSolver, MAX_SOLUTION_LENGTH, solveState } from './core.ts'
import { randomState } from './testing.ts'

const STATES = 1000

describe('FR-3 acceptance', () => {
  it(`solves ${STATES} random states in ${MAX_SOLUTION_LENGTH} moves or fewer`, () => {
    initSolver()
    const times: number[] = []
    for (let seed = 1; seed <= STATES; seed++) {
      // Different seeds from the quick test, and longer sequences.
      const { state } = randomState(100_000 + seed, 40)
      const t = performance.now()
      const solution = solveState(state)
      times.push(performance.now() - t)
      expect(solution.length).toBeLessThanOrEqual(MAX_SOLUTION_LENGTH)
      expect(isSolved(applyAlg(state, solution)), `seed ${seed}: ${formatAlg(solution)}`).toBe(true)
    }
    times.sort((a, b) => a - b)
    console.log(
      `${STATES} solves: median ${times[STATES / 2]!.toFixed(0)} ms, ` +
        `p99 ${times[Math.floor(STATES * 0.99)]!.toFixed(0)} ms, max ${times.at(-1)!.toFixed(0)} ms`,
    )
  }, 600_000)
})
