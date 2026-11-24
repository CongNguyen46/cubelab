import { useEffect, useRef } from 'react'
import { MenuIcon } from './icons.tsx'
import { Logo } from './Logo.tsx'
import { useUiStore } from './uiStore.ts'
import { isActive, useTimerStore } from '../timer/index.ts'

export function Header() {
  const open = useUiStore((s) => s.menuOpen)
  const setOpen = useUiStore((s) => s.setMenuOpen)
  const button = useRef<HTMLButtonElement>(null)
  // The menu waits while the timer is held or running.
  const timerActive = useTimerStore((s) => isActive(s.timer))
  const wasOpen = useRef(false)

  // Give focus back to the hamburger when the menu closes.
  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus({ preventScroll: true })
    wasOpen.current = open
  }, [open])

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-[max(4vw,16px)] py-[18px]">
      <Logo />
      <button
        ref={button}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        disabled={timerActive}
        className="inline-grid size-11 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-text"
      >
        <MenuIcon />
      </button>
    </header>
  )
}
