import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  applyAlg,
  createCube,
  formatMove,
  IDENTITY,
  isSolved,
  parseAlg,
  rotation,
  type CubeState,
} from '../engine/index.ts'
import type { CubeViewHandle } from '../renderer/CubeModel.tsx'
import { initSolver, solveState } from '../solver/core.ts'
import { createPlayStore, SCRAMBLE_TEMPO, SOLVE_TEMPO } from './play.ts'

const SCRAMBLE = parseAlg("D' L2 D2 B2 R2 D' B2 F2 L2 D2 F R D2 L' D' F' D2 R B2 L' U'")

function fakeView(orientation = IDENTITY) {
  const calls: string[] = []
  let release: () => void = () => {}
  const handle: CubeViewHandle = {
    orientationForInput: () => orientation,
    isTurning: () => false,
    whenIdle: () => {
      calls.push('whenIdle')
      return new Promise<void>((r) => (release = r))
    },
    skip: () => {
      calls.push('skip')
      release()
    },
  }
  return { handle, calls, finish: () => release() }
}

const solver = {
  solve: async (state: CubeState) => solveState(state),
  scramble: async () => SCRAMBLE,
}

const flush = () => new Promise((r) => setTimeout(r, 0))

// Build the solver tables once, up front: about a second, longer under coverage.
beforeAll(() => initSolver(), 60_000)

describe('Scramble (FR-2)', () => {
  it('plays on top of the current state, from the current view, at scramble pace', async () => {
    const cube = createCube()
    cube.apply(parseAlg('R U x'))
    const before = cube.state
    const tempos: (number | undefined)[] = []
    cube.subscribe((e) => e.type === 'moves' && tempos.push(e.tempo))
    const view = fakeView()
    const play = createPlayStore({ cube, solver, view: () => view.handle })
    play.setState({ line: { kind: 'solved', count: 3 } })

    const done = play.getState().scramble()
    await flush()
    expect(play.getState().mode).toBe('scrambling')
    // No view reset and no cube reset: the scramble continues from what is on screen.
    expect(view.calls).toEqual(['whenIdle'])
    expect(cube.state).toEqual(applyAlg(before, SCRAMBLE))
    expect(cube.history).toEqual([...parseAlg('R U x'), ...SCRAMBLE])
    // No scramble line: the chips show the moves; the line goes back to the hint.
    expect(play.getState().line).toEqual({ kind: 'hint' })
    expect(tempos).toEqual([SCRAMBLE_TEMPO])
    view.finish()
    await done
    expect(play.getState().mode).toBe('idle')
  })

  it('a second Scramble continues from the scrambled cube, and Undo steps back through it', async () => {
    const cube = createCube()
    const play = createPlayStore({ cube, solver, view: () => null })
    await play.getState().scramble()
    const first = cube.state
    await play.getState().scramble()
    expect(cube.state).toEqual(applyAlg(first, SCRAMBLE))
    expect(cube.history).toHaveLength(2 * SCRAMBLE.length)
    for (let i = 0; i < SCRAMBLE.length; i++) cube.undo()
    expect(cube.state).toEqual(first)
  })

  it("labels the scramble in the viewer's frame when Scramble was pressed", async () => {
    const cube = createCube()
    // A y-like view turn: the engine's B face is on the viewer's right.
    const view = fakeView(rotation('y', -1))
    const play = createPlayStore({ cube, solver, view: () => view.handle })
    const done = play.getState().scramble()
    await flush()
    const map: Record<string, string> = { B: 'R', R: 'F', F: 'L', L: 'B', U: 'U', D: 'D' }
    cube.history.forEach((m, i) => {
      expect(cube.labels[i]).toBe(map[m.base] + formatMove(m).slice(1))
    })
    view.finish()
    await done
  })

  it('tapping Scramble again skips to the end', async () => {
    const view = fakeView()
    const play = createPlayStore({ cube: createCube(), solver, view: () => view.handle })
    const done = play.getState().scramble()
    await flush()
    await play.getState().scramble()
    await done
    expect(view.calls).toContain('skip')
    expect(play.getState().mode).toBe('idle')
  })

  it('Solve does nothing while a scramble plays', async () => {
    const view = fakeView()
    const cube = createCube()
    const play = createPlayStore({ cube, solver, view: () => view.handle })
    const done = play.getState().scramble()
    await flush()
    await play.getState().solve()
    expect(play.getState().solvePhase).toBe('idle')
    view.finish()
    await done
  })

  it('reports a failed scramble and goes back to idle', async () => {
    const onError = vi.fn()
    const play = createPlayStore({
      cube: createCube(),
      solver: { ...solver, scramble: () => Promise.reject(new Error('x')) },
      view: () => null,
      onError,
    })
    await play.getState().scramble()
    expect(onError).toHaveBeenCalledWith('Could not make a scramble. Try again.')
    expect(play.getState().mode).toBe('idle')
  })
})

describe('Solve (FR-3)', () => {
  it('solves at solve pace, says how many moves, then shows done and returns to idle', async () => {
    vi.useFakeTimers()
    const cube = createCube()
    cube.apply(SCRAMBLE)
    const tempos: (number | undefined)[] = []
    cube.subscribe((e) => e.type === 'moves' && tempos.push(e.tempo))
    const play = createPlayStore({ cube, solver, view: () => null })
    const done = play.getState().solve()
    expect(play.getState().solvePhase).toBe('busy')
    await vi.advanceTimersByTimeAsync(0)
    expect(isSolved(cube.state)).toBe(true)
    const { line } = play.getState()
    expect(line.kind).toBe('solved')
    expect(line.kind === 'solved' && line.count).toBeLessThanOrEqual(22)
    expect(play.getState().solvePhase).toBe('ok')
    expect(tempos).toEqual([SOLVE_TEMPO])
    await vi.advanceTimersByTimeAsync(1000)
    await done
    expect(play.getState().solvePhase).toBe('idle')
    vi.useRealTimers()
  })

  it('does nothing when the cube is already solved', async () => {
    const solve = vi.fn(solver.solve)
    const play = createPlayStore({
      cube: createCube(),
      solver: { ...solver, solve },
      view: () => null,
    })
    await play.getState().solve()
    expect(solve).not.toHaveBeenCalled()
    expect(play.getState().solvePhase).toBe('idle')
  })

  it('a nearly solved cube is solved by undoing the history', async () => {
    vi.useFakeTimers()
    const cube = createCube()
    cube.apply(parseAlg('R'))
    const play = createPlayStore({ cube, solver, view: () => null })
    const done = play.getState().solve()
    await vi.advanceTimersByTimeAsync(1000)
    await done
    expect(play.getState().line).toEqual({ kind: 'solved', count: 1 })
    expect(isSolved(cube.state)).toBe(true)
    vi.useRealTimers()
  })

  it("labels the solution in the viewer's frame", async () => {
    vi.useFakeTimers()
    const cube = createCube()
    cube.apply(SCRAMBLE)
    // A y-like view turn: the engine's B face is on the viewer's right.
    const view = fakeView(rotation('y', -1))
    const play = createPlayStore({ cube, solver, view: () => view.handle })
    const done = play.getState().solve()
    await vi.advanceTimersByTimeAsync(0)
    const n = SCRAMBLE.length
    const engine = cube.history.slice(n)
    const labels = cube.labels.slice(n)
    expect(engine.length).toBe(labels.length)
    // Every engine move on B shows as R, and so on round the cube.
    const map: Record<string, string> = { B: 'R', R: 'F', F: 'L', L: 'B', U: 'U', D: 'D' }
    engine.forEach((m, i) => expect(labels[i]![0]).toBe(map[m.base]))
    view.finish()
    await vi.advanceTimersByTimeAsync(1000)
    await done
    vi.useRealTimers()
  })

  it('tapping Solve again while it plays skips to solved', async () => {
    const cube = createCube()
    cube.apply(SCRAMBLE)
    const view = fakeView()
    const play = createPlayStore({ cube, solver, view: () => view.handle })
    const done = play.getState().solve()
    await flush()
    expect(play.getState().mode).toBe('solving')
    await play.getState().solve()
    expect(view.calls).toContain('skip')
    await done
  })

  it('reports a failed solve and resets the button', async () => {
    const onError = vi.fn()
    const cube = createCube()
    cube.apply(parseAlg('R U'))
    const play = createPlayStore({
      cube,
      solver: { ...solver, solve: () => Promise.reject(new Error('x')) },
      view: () => null,
      onError,
    })
    await play.getState().solve()
    expect(onError).toHaveBeenCalledWith('Could not solve this cube. Try again.')
    expect(play.getState()).toMatchObject({ mode: 'idle', solvePhase: 'idle' })
  })

  it('clearLine goes back to the hint', () => {
    const play = createPlayStore({ cube: createCube(), solver, view: () => null })
    play.setState({ line: { kind: 'solved', count: 3 } })
    play.getState().clearLine()
    expect(play.getState().line).toEqual({ kind: 'hint' })
  })
})
