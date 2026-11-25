import { create } from 'zustand'
import {
  formatMove,
  IDENTITY,
  isSolved,
  remapMove,
  type Cube,
  type CubeState,
  type Move,
} from '../engine/index.ts'
import type { CubeViewHandle } from '../renderer/CubeModel.tsx'
import { shorterSolution } from '../solver/shorter.ts'

/** Scramble and Solve pace, ms per quarter turn (half turns take 1.5 times as long). */
export const SCRAMBLE_TEMPO = 120
export const SOLVE_TEMPO = 170
/** How long the mint "done" state shows before the Solve button grows back. */
export const SOLVE_DONE_MS = 1000

export type PlayMode = 'idle' | 'scrambling' | 'solving'
export type SolvePhase = 'idle' | 'busy' | 'ok'
/** The line under the cube. */
export type Line =
  { kind: 'hint' } | { kind: 'solved'; count: number } | { kind: 'error'; text: string }

type Solver = {
  solve(state: CubeState): Promise<Move[]>
  scramble(): Promise<Move[]>
}

export type PlayDeps = {
  cube: Cube
  solver: Solver
  /** The 3D view, or null before it loads (moves then just apply). */
  view: () => CubeViewHandle | null
  reduceMotion?: () => boolean
  /** Shown when the solver fails. */
  onError?: (text: string) => void
}

export type PlayStore = {
  mode: PlayMode
  solvePhase: SolvePhase
  line: Line
  scramble: () => Promise<void>
  solve: () => Promise<void>
  /** Back to the hint line, for example after Reset. */
  clearLine: () => void
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Scramble (FR-2) and Solve (FR-3). Input is locked while either plays. */
export function createPlayStore(deps: PlayDeps) {
  const { cube, solver, view } = deps
  const reduceMotion = deps.reduceMotion ?? (() => false)

  return create<PlayStore>()((set, get) => ({
    mode: 'idle',
    solvePhase: 'idle',
    line: { kind: 'hint' },
    clearLine: () => set({ line: { kind: 'hint' } }),

    async scramble() {
      const { mode } = get()
      // Tapping Scramble again while it plays jumps to the scrambled state.
      if (mode === 'scrambling') return view()?.skip()
      if (mode !== 'idle') return
      set({ mode: 'scrambling', line: { kind: 'hint' } })
      // Chips name the moves as the viewer saw the cube when Scramble was pressed, like keys do.
      const orientation = view()?.orientationForInput() ?? IDENTITY
      try {
        const moves = await solver.scramble()
        // On top of the current state, from the current view. A random-state scramble applied
        // to any state still gives a uniformly random state, and Undo can step back through it.
        const labels = moves.map((m) => formatMove(remapMove(m, orientation)))
        cube.apply(moves, { tempo: SCRAMBLE_TEMPO, labels })
        await view()?.whenIdle()
      } catch {
        deps.onError?.('Could not make a scramble. Try again.')
      } finally {
        set({ mode: 'idle' })
      }
    },

    async solve() {
      const { mode, solvePhase } = get()
      // Tapping Solve again while it plays jumps to solved.
      if (mode === 'solving') return view()?.skip()
      if (mode !== 'idle' || solvePhase !== 'idle' || isSolved(cube.state)) return
      set({ mode: 'solving', solvePhase: 'busy' })
      try {
        const found = await solver.solve(cube.state)
        // Two-phase is not optimal for nearly-solved cubes; undoing a short history can win.
        const moves = shorterSolution(found, cube.history)
        const v = view()
        const orientation = v?.orientationForInput() ?? IDENTITY
        const labels = moves.map((m) => formatMove(remapMove(m, orientation)))
        cube.apply(moves, { tempo: SOLVE_TEMPO, labels })
        await v?.whenIdle()
        set({ mode: 'idle', solvePhase: 'ok', line: { kind: 'solved', count: moves.length } })
        await wait(reduceMotion() ? 600 : SOLVE_DONE_MS)
        set({ solvePhase: 'idle' })
      } catch {
        set({ mode: 'idle', solvePhase: 'idle' })
        deps.onError?.('Could not solve this cube. Try again.')
      }
    },
  }))
}
