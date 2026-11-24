import { solver } from '../solver/client.ts'
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

/** True while Scramble or Solve is playing: keys, drags, undo and reset wait. */
export const inputLocked = () => usePlayStore.getState().mode !== 'idle'

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
