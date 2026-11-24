import { create } from 'zustand'
import { createCube, isSolved, type ApplyOptions, type Cube, type Move } from '../engine/index.ts'

type CubeStore = {
  /** The engine instance. The renderer subscribes to it directly. */
  cube: Cube
  /** Move labels as the user saw them, oldest first, for the chips under the cube. */
  history: string[]
  canUndo: boolean
  canRedo: boolean
  solved: boolean
  apply: (moves: readonly Move[], options?: ApplyOptions) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

/** React-facing view of one engine cube. The engine stays the source of truth. */
export function createCubeStore(cube: Cube = createCube()) {
  return create<CubeStore>()((set) => {
    const snapshot = () => ({
      history: [...cube.labels],
      canUndo: cube.canUndo,
      canRedo: cube.canRedo,
      solved: isSolved(cube.state),
    })
    cube.subscribe(() => set(snapshot()))
    return {
      cube,
      ...snapshot(),
      apply: (moves, options) => cube.apply(moves, options),
      undo: () => cube.undo(),
      redo: () => cube.redo(),
      reset: () => cube.reset(),
    }
  })
}

export const useCubeStore = createCubeStore()
