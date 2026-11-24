import type { MouseEvent } from 'react'

/** Grid C v0.2 mark with the Cube + Lab wordmark. */
export function Logo({ onClick }: { onClick?: (e: MouseEvent) => void }) {
  return (
    <a
      href="/"
      aria-label="CubeLab home"
      onClick={onClick}
      className="flex items-center gap-2.5 text-xl leading-none font-semibold tracking-[-0.01em] no-underline"
    >
      <img src="/brand/logo-mark.svg" width={26} height={26} alt="" />
      <span>
        Cube<span className="text-text-subtle">Lab</span>
      </span>
    </a>
  )
}
