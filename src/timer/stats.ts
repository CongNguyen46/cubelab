import type { Penalty } from './machine.ts'

/** What the statistics need from a solve. */
export type Timed = { readonly ms: number; readonly penalty: Penalty }

/** A statistic: a time in ms, DNF, or null when there are not enough solves. */
export type Stat = number | 'dnf' | null

/** The time that counts: +2 adds two seconds, a DNF counts as infinitely slow. */
export const effectiveMs = (s: Timed): number =>
  s.penalty === 'dnf' ? Infinity : s.penalty === 'plus2' ? s.ms + 2000 : s.ms

/** The best single, ignoring DNFs. */
export function best(solves: readonly Timed[]): Stat {
  const ok = solves.map(effectiveMs).filter(Number.isFinite)
  return ok.length ? Math.min(...ok) : solves.length ? 'dnf' : null
}

/** The mean of every finished solve (DNFs left out). */
export function mean(solves: readonly Timed[]): Stat {
  const ok = solves.map(effectiveMs).filter(Number.isFinite)
  if (!ok.length) return solves.length ? 'dnf' : null
  return ok.reduce((a, b) => a + b, 0) / ok.length
}

/**
 * Average of the last `n` solves, WCA style: drop the best and the worst, average the rest.
 * One DNF is dropped as the worst; two or more make the average a DNF.
 * `solves` is oldest first, as the session keeps them.
 */
export function averageOf(n: number, solves: readonly Timed[]): Stat {
  if (solves.length < n) return null
  const times = solves
    .slice(-n)
    .map(effectiveMs)
    .sort((a, b) => a - b)
  const middle = times.slice(1, -1)
  if (middle.some((t) => !Number.isFinite(t))) return 'dnf'
  return middle.reduce((a, b) => a + b, 0) / middle.length
}

export type SessionStats = { best: Stat; mean: Stat; ao5: Stat; ao12: Stat }

export const sessionStats = (solves: readonly Timed[]): SessionStats => ({
  best: best(solves),
  mean: mean(solves),
  ao5: averageOf(5, solves),
  ao12: averageOf(12, solves),
})
