import { applyMove, type Move } from './moves.ts'
import { invertMove } from './notation.ts'
import { solvedState, type CubeState } from './state.ts'

/** One applied move and the state right after it, so a renderer can check itself step by step. */
export type Step = { readonly move: Move; readonly state: CubeState }

export type CubeEvent =
  | { readonly type: 'moves'; readonly steps: readonly Step[] }
  | { readonly type: 'reset'; readonly state: CubeState }

export type Listener = (event: CubeEvent) => void

export type Cube = {
  readonly state: CubeState
  /** Moves applied so far, oldest first. Undo removes from the end. */
  readonly history: readonly Move[]
  readonly canUndo: boolean
  readonly canRedo: boolean
  apply(moves: readonly Move[]): void
  undo(): void
  redo(): void
  reset(): void
  subscribe(listener: Listener): () => void
}

/** The single source of truth for one cube. The UI calls it; the renderer listens to it. */
export function createCube(initial: CubeState = solvedState()): Cube {
  let state = initial
  let history: Move[] = []
  let future: Move[] = []
  const listeners = new Set<Listener>()

  const emit = (event: CubeEvent) => listeners.forEach((l) => l(event))

  const run = (moves: readonly Move[]): Step[] =>
    moves.map((move) => {
      state = applyMove(state, move)
      return { move, state }
    })

  return {
    get state() {
      return state
    },
    get history() {
      return history
    },
    get canUndo() {
      return history.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
    apply(moves) {
      if (moves.length === 0) return
      history = [...history, ...moves]
      future = []
      emit({ type: 'moves', steps: run(moves) })
    },
    undo() {
      const last = history.at(-1)
      if (!last) return
      history = history.slice(0, -1)
      future = [...future, last]
      emit({ type: 'moves', steps: run([invertMove(last)]) })
    },
    redo() {
      const next = future.at(-1)
      if (!next) return
      future = future.slice(0, -1)
      history = [...history, next]
      emit({ type: 'moves', steps: run([next]) })
    },
    reset() {
      state = solvedState()
      history = []
      future = []
      emit({ type: 'reset', state })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
