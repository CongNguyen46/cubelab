import { useEffect } from 'react'
import { isShown, useTimerStore } from '../timer/index.ts'
import { usePlayStore } from './playStore.ts'
import { useUiStore } from './uiStore.ts'

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"]')

/**
 * Space and Esc for the timer (FR-4.2). Listens in the capture phase and always cancels Space's
 * default, so Space never scrolls the page, clicks a focused button or reaches the cube keys.
 * Ignored while typing, while the menu is open, and while Scramble or Solve plays.
 */
export function useTimerKeys() {
  useEffect(() => {
    const send = useTimerStore.getState().send
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || useUiStore.getState().menuOpen) return
      if (e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        if (e.repeat || usePlayStore.getState().mode !== 'idle') return
        send({ type: 'press' })
      } else if (e.key === 'Escape') {
        const { timer } = useTimerStore.getState()
        if (timer.phase === 'hidden') return
        e.preventDefault()
        send({ type: 'escape' })
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      send({ type: 'release' })
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
    }
  }, [])
}

/** The digits are on screen: touch on the cube area and the digits drives the timer. */
export const timerPadActive = () => isShown(useTimerStore.getState().timer)
