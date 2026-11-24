import { useEffect } from 'react'
import { IDENTITY } from '../engine/index.ts'
import { useCubeStore } from './cubeStore.ts'
import { keyMoveToEngine, keyToAction } from './keys.ts'
import { inputLocked } from './playStore.ts'
import { useUiStore } from './uiStore.ts'

/**
 * Global keyboard turns (FR-1.3), undo and redo. Keys follow the current view: R turns the face
 * on your right. Ignored while typing in a field, while the menu is open, while a layer is
 * being dragged, and while Scramble or Solve plays.
 */
export function useCubeKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const ui = useUiStore.getState()
      if (ui.menuOpen) return
      const action = keyToAction(e)
      if (!action) return
      e.preventDefault()
      if (ui.view?.isTurning() || inputLocked()) return
      const store = useCubeStore.getState()
      if (action.type === 'move') {
        const view = ui.view?.orientationForInput() ?? IDENTITY
        const { move, label } = keyMoveToEngine(action.move, view)
        store.apply([move], { labels: [label] })
      } else if (action.type === 'undo') store.undo()
      else store.redo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
