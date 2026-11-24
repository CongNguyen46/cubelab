import { useEffect } from 'react'
import { useCubeStore } from './cubeStore.ts'
import { keyToAction } from './keys.ts'

/** Global keyboard turns (FR-1.3), undo and redo. Ignored while typing in a field. */
export function useCubeKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const action = keyToAction(e)
      if (!action) return
      e.preventDefault()
      const store = useCubeStore.getState()
      if (action.type === 'move') store.apply([action.move])
      else if (action.type === 'undo') store.undo()
      else store.redo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
