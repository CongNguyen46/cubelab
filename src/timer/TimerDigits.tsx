import { useEffect, useRef } from 'react'
import { formatTime } from './format.ts'
import { displayMs, isShown } from './machine.ts'
import { useTimerPad } from './useTimerPad.ts'
import { useTimerStore } from './store.ts'

/**
 * The timer digits: 00.00, Geist Mono 30px, tabular figures (FR-4.1). Grey while held, mint when
 * ready, Lab Orange while running and stopped. While running the text is updated every frame
 * straight on the element, so React does not re-render 60 times a second.
 */
export function TimerDigits() {
  const timer = useTimerStore((s) => s.timer)
  const send = useTimerStore((s) => s.send)
  const text = useRef<HTMLDivElement>(null)
  const lastPointer = useRef('mouse')
  const pad = useTimerPad()

  useEffect(() => {
    const el = text.current
    if (!el) return
    if (timer.phase !== 'running') {
      el.textContent = formatTime(displayMs(timer, performance.now()))
      return
    }
    let frame = 0
    const loop = () => {
      el.textContent = formatTime(displayMs(timer, performance.now()))
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(frame)
  }, [timer])

  if (!isShown(timer)) return null
  return (
    <div
      ref={text}
      role="timer"
      aria-live="off"
      data-t={timer.phase}
      className="timer-digits"
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType
        pad.onPointerDown?.(e)
      }}
      onPointerUp={pad.onPointerUp}
      onPointerCancel={pad.onPointerCancel}
      // A mouse click hides the stopped time. Touch taps go through the pad instead, so a tap
      // that stops the timer does not also hide it.
      onClick={() => lastPointer.current !== 'touch' && send({ type: 'clickDigits' })}
    />
  )
}
