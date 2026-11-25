import { useEffect, useRef } from 'react'
import { digitsText } from './format.ts'
import { isShown } from './machine.ts'
import { useInspectionVoice } from './useInspectionVoice.ts'
import { useTimerPad } from './useTimerPad.ts'
import { useTimerStore } from './store.ts'

/**
 * The timer digits: 00.00, Geist Mono 30px, tabular figures (FR-4.1). Grey while held, mint when
 * ready, Lab Orange while running and stopped. During inspection they count 15 down to 1, then
 * show +2 (FR-4.3). While running or inspecting the text is updated every frame straight on the
 * element, so React does not re-render 60 times a second.
 */
export function TimerDigits() {
  const timer = useTimerStore((s) => s.timer)
  const send = useTimerStore((s) => s.send)
  const text = useRef<HTMLDivElement>(null)
  const lastPointer = useRef('mouse')
  const pad = useTimerPad()
  useInspectionVoice(timer.inspectAt === null ? 0 : timer.inspectStage)

  useEffect(() => {
    const el = text.current
    if (!el) return
    if (timer.phase !== 'running' && timer.inspectAt === null) {
      el.textContent = digitsText(timer, performance.now())
      return
    }
    let frame = 0
    const loop = () => {
      el.textContent = digitsText(timer, performance.now())
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
      data-w={timer.inspectAt === null ? undefined : timer.inspectStage}
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
