import { formatAlg } from '../engine/index.ts'
import { solver } from '../solver/client.ts'
import { createDexieRepo } from '../storage/index.ts'
import { useTimerStore } from '../timer/index.ts'
import { createSessionStore } from './session.ts'
import { useUiStore } from './uiStore.ts'

/** The page's timing session, saved in IndexedDB, with scrambles from the solver worker. */
export const useSessionStore = createSessionStore({
  openRepo: () => createDexieRepo(),
  nextScramble: async () => formatAlg(await solver.scramble()),
  timer: useTimerStore,
  onError: (text) => useUiStore.getState().showToast(text),
})
