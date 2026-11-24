import { describe, expect, it } from 'vitest'
import {
  applyAlg,
  formatAlg,
  isSolved,
  parseAlg,
  solvedState,
  toFacelets,
  type CubeState,
} from '../engine/index.ts'
import { SolverClient } from './client.ts'
import {
  handleRequest,
  initSolver,
  MAX_SOLUTION_LENGTH,
  randomScramble,
  shorterSolution,
  solveState,
  type SolverRequest,
} from './core.ts'
import { randomState } from './testing.ts'

const run = (alg: string, from: CubeState = solvedState()) => applyAlg(from, parseAlg(alg))

/** Random states checked in every test run. The full 1,000 run in solve.slow.test.ts. */
const QUICK_STATES = 200

describe('solveState', () => {
  it('builds its tables once', () => {
    const t = performance.now()
    initSolver()
    initSolver()
    expect(performance.now() - t).toBeLessThan(10_000)
  })

  it('returns no moves for a solved or only rotated cube', () => {
    expect(solveState(solvedState())).toEqual([])
    expect(solveState(run("x y' z2"))).toEqual([])
  })

  it.each([
    "R U R' U'",
    "R U R' U' R' F R2 U' R' U' R U R' F'",
    "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2",
  ])('solves %s within 22 moves', (alg) => {
    const state = run(alg)
    const solution = solveState(state)
    expect(solution.length).toBeLessThanOrEqual(MAX_SOLUTION_LENGTH)
    expect(isSolved(applyAlg(state, solution))).toBe(true)
  })

  // The solver works with white up and green front. These states are turned away from that,
  // so a solution that is not remapped would leave them unsolved.
  it.each([
    "R U F' x",
    "R U F' y'",
    "R U F' z2",
    "L' D2 B x y",
    "R U F' M",
    "R U F' E' S",
    "M2 E S' R U",
    "x M R y E' F z S2 B'",
  ])('remaps the solution after rotations and slices: %s', (alg) => {
    const state = run(alg)
    const solution = solveState(state)
    expect(solution.every((m) => 'RLUDFB'.includes(m.base))).toBe(true)
    expect(isSolved(applyAlg(state, solution)), formatAlg(solution)).toBe(true)
  })

  it(`solves ${QUICK_STATES} random states, each in 22 moves or fewer`, () => {
    const lengths: number[] = []
    for (let seed = 1; seed <= QUICK_STATES; seed++) {
      const { state } = randomState(seed)
      const solution = solveState(state)
      lengths.push(solution.length)
      expect(isSolved(applyAlg(state, solution)), `seed ${seed}: ${formatAlg(solution)}`).toBe(true)
    }
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_SOLUTION_LENGTH)
  }, 120_000)
})

describe('randomScramble (FR-2)', () => {
  const scrambles = Array.from({ length: 20 }, () => randomScramble())

  it('is about 20 moves, face turns only', () => {
    for (const s of scrambles) {
      expect(s.length).toBeGreaterThanOrEqual(15)
      expect(s.length).toBeLessThanOrEqual(MAX_SOLUTION_LENGTH)
      expect(s.every((m) => 'RLUDFB'.includes(m.base))).toBe(true)
    }
  })

  it('never turns the same face twice in a row', () => {
    for (const s of scrambles) {
      for (let i = 1; i < s.length; i++) {
        expect(s[i]!.base, formatAlg(s)).not.toBe(s[i - 1]!.base)
      }
    }
  })

  it('round-trips through notation and scrambles a solved cube', () => {
    for (const s of scrambles) {
      expect(parseAlg(formatAlg(s))).toEqual(s)
      const state = applyAlg(solvedState(), s)
      expect(isSolved(state)).toBe(false)
      expect(isSolved(applyAlg(state, solveState(state)))).toBe(true)
    }
  })

  it('gives a different scramble each time', () => {
    expect(new Set(scrambles.map(formatAlg)).size).toBe(scrambles.length)
  })
})

describe('shorterSolution', () => {
  it('prefers undoing a short history over a longer solver answer', () => {
    const solver = parseAlg("R U2 D2 R2 L2 U2 D2 L2'")
    expect(formatAlg(shorterSolution(solver, parseAlg('R')))).toBe("R'")
  })

  it('keeps the solver answer when it is shorter or the same length', () => {
    const solver = parseAlg("R' U'")
    expect(formatAlg(shorterSolution(solver, parseAlg('U R')))).toBe("R' U'")
    expect(formatAlg(shorterSolution(solver, parseAlg('U R F2 B')))).toBe("R' U'")
  })
})

describe('worker protocol', () => {
  it('answers init, solve and scramble, and reports errors', () => {
    expect(handleRequest({ id: 1, type: 'init' })).toEqual({ id: 1, ok: true, moves: '' })
    const solved = handleRequest({ id: 2, type: 'solve', facelets: toFacelets(run("R U R' U'")) })
    expect(solved.ok && isSolved(run(solved.moves, run("R U R' U'")))).toBe(true)
    const scramble = handleRequest({ id: 3, type: 'scramble' })
    expect(scramble.ok && parseAlg(scramble.moves).length).toBeGreaterThan(10)
    const bad = handleRequest({ id: 4, type: 'nope' } as unknown as SolverRequest)
    expect(bad).toEqual({ id: 4, ok: false, error: 'Unknown request: nope' })
  })

  it('the client remaps solutions and matches replies to requests', async () => {
    // A stand-in Worker that answers asynchronously, like the real one.
    const fake = {
      onmessage: null as ((e: MessageEvent) => void) | null,
      onerror: null,
      postMessage(req: SolverRequest) {
        setTimeout(() => fake.onmessage?.({ data: handleRequest(req) } as MessageEvent), 0)
      },
      terminate() {},
    }
    const client = new SolverClient(() => fake as unknown as Worker)
    await client.warmUp()
    const a = run("R U F' x M")
    const b = run("L2 D' y")
    const [sa, sb] = await Promise.all([client.solve(a), client.solve(b)])
    expect(isSolved(applyAlg(a, sa))).toBe(true)
    expect(isSolved(applyAlg(b, sb))).toBe(true)
    expect(await client.solve(solvedState())).toEqual([])
    expect((await client.scramble()).length).toBeGreaterThan(10)
  })

  it('the client rejects pending requests when the worker fails', async () => {
    const fake = {
      onmessage: null,
      onerror: null as ((e: { message: string }) => void) | null,
      postMessage() {
        setTimeout(() => fake.onerror?.({ message: 'boom' }), 0)
      },
      terminate() {},
    }
    const client = new SolverClient(() => fake as unknown as Worker)
    await expect(client.scramble()).rejects.toThrow('boom')
  })
})
