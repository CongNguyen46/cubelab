import { MenuIcon } from './icons.tsx'

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-[max(4vw,16px)] py-[18px]">
      <a
        href="/"
        aria-label="CubeLab home"
        className="flex items-center gap-2.5 text-xl leading-none font-semibold tracking-[-0.01em] no-underline"
      >
        <img src="/brand/logo-mark.svg" width={26} height={26} alt="" />
        <span>
          Cube<span className="text-text-subtle">Lab</span>
        </span>
      </a>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded="false"
        className="inline-grid size-11 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-text"
      >
        <MenuIcon />
      </button>
    </header>
  )
}
