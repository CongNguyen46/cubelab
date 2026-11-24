import { useLayoutEffect, useRef, type PointerEvent } from 'react'
import { SolveIcon } from './icons.tsx'
import type { SolvePhase } from './play.ts'

type Props = {
  phase: SolvePhase
  disabled: boolean
  /** Why it is disabled, for the tooltip. */
  disabledReason?: string
  onClick: () => void
}

const GROW_MS = 700

/**
 * The orange Solve button with the prototype's loading-to-done animation (based on Lucian UX/UI
 * Prompt #438, MIT, credit Seokwoooo). Idle shows the label; busy shrinks to a circle with a
 * spinner; ok turns mint with a check and a ring pulse; then it grows back.
 *
 * Width is measured only on click and reset to auto afterwards. Pinning it at load once
 * collapsed the button.
 */
export function SolveButton({ phase, disabled, disabledReason, onClick }: Props) {
  const button = useRef<HTMLButtonElement>(null)
  const fullWidth = useRef(0)
  const previous = useRef<SolvePhase>(phase)

  useLayoutEffect(() => {
    const el = button.current
    const from = previous.current
    previous.current = phase
    if (!el || from === phase) return
    if (phase === 'busy') {
      el.classList.remove('is-down', 'is-grow')
      if (fullWidth.current) {
        el.style.setProperty('--w', `${fullWidth.current}px`)
        void el.offsetWidth // commit the full width so the shrink animates from it
      }
      el.style.setProperty('--w', '52px')
    }
    if (phase === 'idle' && from === 'ok') {
      // Grow back to the measured width, then let it size itself again.
      el.classList.add('is-grow')
      el.style.setProperty('--w', fullWidth.current ? `${fullWidth.current}px` : 'auto')
      const t = setTimeout(() => {
        el.classList.remove('is-grow')
        el.style.setProperty('--w', 'auto')
      }, GROW_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'idle' && from === 'busy') el.style.setProperty('--w', 'auto')
  }, [phase])

  const handleClick = () => {
    if (phase === 'ok') return
    if (phase === 'idle') {
      // Measure now, while the button is surely on screen at its natural width.
      const w = button.current?.getBoundingClientRect().width ?? 0
      fullWidth.current = w > 60 ? Math.ceil(w) : 0
    }
    onClick()
  }

  const press = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button === 0 && phase === 'idle' && !disabled) e.currentTarget.classList.add('is-down')
  }
  const release = (e: PointerEvent<HTMLButtonElement>) =>
    e.currentTarget.classList.remove('is-down')

  return (
    <button
      ref={button}
      type="button"
      className="solve-btn"
      data-s={phase}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-busy={phase === 'busy' || undefined}
      aria-label={phase === 'busy' ? 'Solving' : phase === 'ok' ? 'Solved' : 'Solve'}
      onClick={handleClick}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      <span className="sl">
        <SolveIcon />
        Solve
      </span>
      <i className="ssp" aria-hidden="true" />
      <svg className="sck" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5.5 12.5 4.5 4.5 8.5-9.5" />
      </svg>
      <i className="sring" aria-hidden="true" />
    </button>
  )
}
