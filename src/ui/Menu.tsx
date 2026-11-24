import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { ArrowIcon, CloseIcon } from './icons.tsx'
import { Logo } from './Logo.tsx'
import { useUiStore } from './uiStore.ts'

type Item = { label: string; note?: string; soon?: boolean }

const BIG: Item[] = [
  { label: 'Play' },
  { label: 'Cube Builder', note: 'Rebuild and solve' },
  { label: 'Learn', note: '7 stages' },
  { label: 'Advanced', note: 'Coming soon', soon: true },
]
const ROWS: Item[] = [
  { label: 'Settings' },
  { label: 'How CubeLab works' },
  { label: 'Source on GitHub' },
]

const stagger = (i: number) => ({ '--i': i }) as CSSProperties

/** Full-screen menu from the prototype. Only Play works for now; the rest say they come later. */
export function Menu() {
  const open = useUiStore((s) => s.menuOpen)
  const setOpen = useUiStore((s) => s.setMenuOpen)
  const showToast = useUiStore((s) => s.showToast)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeButton.current?.focus({ preventScroll: true })
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  const close = (e?: MouseEvent) => {
    e?.preventDefault()
    setOpen(false)
  }
  const later = (item: Item) => (e: MouseEvent) => {
    e.preventDefault()
    showToast(`${item.label} comes in a later version`)
  }

  return (
    <div
      className="menu"
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 py-[18px]">
        <Logo onClick={close} />
        <button
          ref={closeButton}
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="inline-grid size-11 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-text"
        >
          <CloseIcon />
        </button>
      </div>
      <nav aria-label="Main" className="mt-[clamp(12px,4vh,40px)] flex flex-col gap-1.5">
        {BIG.map((item, i) => (
          <a
            key={item.label}
            href="/"
            style={stagger(i)}
            aria-current={i === 0 ? 'page' : undefined}
            onClick={i === 0 ? close : later(item)}
            className={`menu-item flex min-h-14 items-baseline gap-3 text-[clamp(34px,7vw,52px)] leading-[1.1] font-semibold tracking-[-0.02em] no-underline ${
              item.soon ? 'text-[#5d5d66]' : 'text-text hover:text-[#c9c9cf]'
            }`}
          >
            {item.label}
            {item.note && (
              <small className="text-sm leading-none font-medium tracking-normal text-text-subtle">
                {item.note}
              </small>
            )}
          </a>
        ))}
      </nav>
      <div className="mt-[clamp(20px,5vh,48px)] flex max-w-[720px] flex-col">
        {ROWS.map((item, i) => (
          <a
            key={item.label}
            href="/"
            style={stagger(BIG.length + i)}
            onClick={later(item)}
            className="menu-item flex min-h-[52px] items-center justify-between border-b border-border text-[17px] text-text no-underline"
          >
            {item.label}
            <ArrowIcon />
          </a>
        ))}
      </div>
    </div>
  )
}

/** Short message at the bottom of the screen, gone after 2.2 s. */
export function Toast() {
  const toast = useUiStore((s) => s.toast)
  const hide = useUiStore((s) => s.hideToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(hide, 2200)
    return () => clearTimeout(t)
  }, [toast, hide])
  return (
    <div className="toast" data-on={toast !== null} role="status">
      {toast?.text}
    </div>
  )
}
