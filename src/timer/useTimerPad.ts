import type { PointerEvent } from 'react'
import { isShown } from './machine.ts'
import { useTimerStore } from './store.ts'

/**
 * Touch handlers that make the timer digits act like Space while they are shown: hold to start,
 * tap to stop. Only the digits use it; touch on the cube always turns the cube.
 */
export function useTimerPad() {
  const send = useTimerStore((s) => s.send)
  const shown = useTimerStore((s) => isShown(s.timer))
  if (!shown) return {}
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      send({ type: 'press' })
    },
    onPointerUp: (e: PointerEvent) => {
      if (e.pointerType === 'touch') send({ type: 'release' })
    },
    onPointerCancel: (e: PointerEvent) => {
      if (e.pointerType === 'touch') send({ type: 'release' })
    },
  }
}
