// Icons copied from prototype/index.html so the buttons match the approved design.

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function ScrambleIcon() {
  return (
    <svg {...stroke} className="size-[18px]">
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  )
}

export function SolveIcon() {
  return (
    <svg {...stroke} className="size-[18px]">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  )
}

export function TimerIcon() {
  return (
    <svg {...stroke} className="size-[18px]">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6" />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg {...stroke} className="size-6">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function UndoIcon() {
  return (
    <svg {...stroke} className="size-[18px]">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

export function ResetIcon() {
  return (
    <svg {...stroke} className="size-[18px]">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg {...stroke} className="size-6">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function ArrowIcon() {
  return (
    <svg {...stroke} className="size-[18px] text-text-subtle">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
