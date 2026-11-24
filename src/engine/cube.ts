import { applyMove, type Move } from './moves.ts'
import { formatMove, invertMove } from './notation.ts'
import { solvedState, type CubeState } from './state.ts'

/** One applied move and the state right after it, so a renderer can check itself step by step. */
export type Step = { readonly move: Move; readonly state: CubeState }

export type CubeEvent =
  | {
      readonly type: 'moves'
      readonly steps: readonly Step[]
      /** True when the view already showed these turns (a finished drag): just sync, don't animate. */
      readonly animated: boolean
      /** Milliseconds per quarter turn for these moves, when the caller wants a set pace. */
      readonly tempo?: number
    }
  | { readonly type: 'reset'; readonly state: CubeState }

export type Listener = (event: CubeEvent) => void

export type ApplyOptions = {
  /**
   * What to show in the history for each move, for example the key the user pressed in their
   * view. Defaults to the engine notation. Must be the same length as the moves.
   */
  labels?: readonly string[]
  /** The view already animated these turns (see CubeEvent). */
  animated?: boolean
  /** Pace for the renderer, in ms per quarter turn: Scramble and Solve play at a set speed. */
  tempo?: number
}

type Entry = { readonly move: Move; readonly label: string }

export type Cube = {
  readonly state: CubeState
  /** Moves applied so far in the engine frame, oldest first. Undo removes from the end. */
  readonly history: readonly Move[]
  /** Display label for each history entry, same order and length as history. */
  readonly labels: readonly string[]
  readonly canUndo: boolean
  readonly canRedo: boolean
  apply(moves: readonly Move[], options?: ApplyOptions): void
  undo(): void
  redo(): void
  reset(): void
  subscribe(listener: Listener): () => void
}

/** The single source of truth for one cube. The UI calls it; the renderer listens to it. */
export function createCube(initial: CubeState = solvedState()): Cube {
  let state = initial
  let history: Entry[] = []
  let future: Entry[] = []
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
      return history.map((e) => e.move)
    },
    get labels() {
      return history.map((e) => e.label)
    },
    get canUndo() {
      return history.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
    apply(moves, options = {}) {
      if (moves.length === 0) return
      const { labels, animated = false, tempo } = options
      if (labels && labels.length !== moves.length) {
        throw new Error(`Got ${labels.length} labels for ${moves.length} moves`)
      }
      history = [
        ...history,
        ...moves.map((move, i) => ({ move, label: labels?.[i] ?? formatMove(move) })),
      ]
      future = []
      emit({ type: 'moves', steps: run(moves), animated, ...(tempo ? { tempo } : {}) })
    },
    undo() {
      const last = history.at(-1)
      if (!last) return
      history = history.slice(0, -1)
      future = [...future, last]
      emit({ type: 'moves', steps: run([invertMove(last.move)]), animated: false })
    },
    redo() {
      const next = future.at(-1)
      if (!next) return
      future = future.slice(0, -1)
      history = [...history, next]
      emit({ type: 'moves', steps: run([next.move]), animated: false })
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
