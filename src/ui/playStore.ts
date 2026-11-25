import { solver } from '../solver/client.ts'
import { isActive, isShown, useTimerStore } from '../timer/index.ts'
import { useCubeStore } from './cubeStore.ts'
import { createPlayStore } from './play.ts'
import { useUiStore } from './uiStore.ts'

/** The page's Scramble and Solve state, wired to the real cube, view and solver worker. */
export const usePlayStore = createPlayStore({
  cube: useCubeStore.getState().cube,
  solver,
  view: () => useUiStore.getState().view,
  reduceMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  onError: (text) => useUiStore.getState().showToast(text),
})

/**
 * True while the page owns input: Scramble or Solve playing, or the timer held or running. Keys,
 * drags, undo and reset wait. With `pointerType` 'touch', also true while the timer digits are
 * shown, because the cube area is then a pad for the timer.
 */
export function inputLocked(pointerType?: string): boolean {
  const { timer } = useTimerStore.getState()
  if (usePlayStore.getState().mode !== 'idle' || isActive(timer)) return true
  return pointerType === 'touch' && isShown(timer)
}

/**
 * The lock for pointers on the cube canvas. Like inputLocked, except that Scramble and Solve
 * playing leave the view free: you can drag the whole cube round while the moves play (layer
 * turns still wait, see turnsLocked).
 */
export function pointerLocked(pointerType: string): boolean {
  const { timer } = useTimerStore.getState()
  if (isActive(timer)) return true
  return pointerType === 'touch' && isShown(timer)
}

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
