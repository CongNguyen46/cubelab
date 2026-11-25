import { solver } from '../solver/client.ts'
import { isHeld, useTimerStore } from '../timer/index.ts'
import { useCubeStore } from './cubeStore.ts'
import { createPlayStore } from './play.ts'
import { createSolvedFlash } from './solvedFlash.ts'
import { useUiStore } from './uiStore.ts'

/** The page's Scramble and Solve state, wired to the real cube, view and solver worker. */
export const usePlayStore = createPlayStore({
  cube: useCubeStore.getState().cube,
  solver,
  view: () => useUiStore.getState().view,
  reduceMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  onError: (text) => useUiStore.getState().showToast(text),
})

/** "Solved in N moves" over the timer digits for a moment after a Solve. */
export const useSolvedFlash = createSolvedFlash({ timer: useTimerStore, play: usePlayStore })

/** Space (or a touch on the digits) is held before a timer start: cube input waits. */
const timerHeld = () => isHeld(useTimerStore.getState().timer)

/**
 * True while cube keys and Undo must wait: Scramble or Solve playing, or the timer held (grey
 * or mint), so a hold is not spoiled by a turn. While the timer runs the cube is free: you time
 * a solve of the on-screen cube. Scramble, Solve and the menu have their own locks.
 */
export const inputLocked = () => usePlayStore.getState().mode !== 'idle' || timerHeld()

/**
 * The lock for pointers on the cube canvas: only while the timer is held. Touch and mouse drags
 * always turn the cube otherwise. Scramble and Solve playing leave the view free (layer turns
 * still wait, see turnsLocked).
 */
export const pointerLocked = () => timerHeld()

/** Scramble or Solve is playing: a drag on a face turns the view, not the layer. */
export const turnsLocked = () => usePlayStore.getState().mode !== 'idle'

/** Build the solver tables while the page is idle, so the first Solve is quick (NFR-3). */
export function warmUpSolverWhenIdle() {
  const start = () => void solver.warmUp().catch(() => {})
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(start, { timeout: 4000 })
    return () => cancelIdleCallback(id)
  }
  const t = setTimeout(start, 1500)
  return () => clearTimeout(t)
}
