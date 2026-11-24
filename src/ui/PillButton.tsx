import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary'
  icon?: ReactNode
}

const base =
  'inline-flex min-h-[52px] cursor-pointer items-center gap-[9px] rounded-full border px-[26px] text-base font-semibold transition-[transform,background-color,opacity] duration-200 ease-lab active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  default: 'border-border bg-surface text-text hover:bg-surface-2',
  primary: 'border-accent bg-accent text-on-accent hover:bg-accent-hover',
}

export function PillButton({
  variant = 'default',
  icon,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}
