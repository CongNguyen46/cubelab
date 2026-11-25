import { displayMs, INSPECT_MS, type Penalty, type TimerState } from './machine.ts'

/**
 * Timer digits as the design shows them: `ss.cc` under a minute, `m:ss.cc` from 60 s.
 * Hundredths are floored, never rounded up, so a time never reads faster than it was.
 */
export function formatTime(ms: number): string {
  const centis = Math.floor(Math.max(0, ms) / 10)
  const seconds = Math.floor(centis / 100)
  const cc = String(centis % 100).padStart(2, '0')
  if (seconds < 60) return `${String(seconds).padStart(2, '0')}.${cc}`
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${cc}`
}

/** A recorded time with its penalty: `12.34`, `14.34+` for +2, or `DNF`. */
export function formatResult(ms: number, penalty: Penalty): string {
  if (penalty === 'dnf') return 'DNF'
  if (penalty === 'plus2') return `${formatTime(ms + 2000)}+`
  return formatTime(ms)
}

/**
 * What the digits read at `now`. During inspection, the whole seconds left (15 down to 1), then
 * `+2` from 15 s to 17 s. A stopped solve shows its penalty.
 */
export function digitsText(s: TimerState, now: number): string {
  if (s.inspectAt !== null) {
    const left = INSPECT_MS - (now - s.inspectAt)
    return left > 0 ? String(Math.ceil(left / 1000)) : '+2'
  }
  if (s.phase === 'stopped' && s.lastMs !== null) return formatResult(s.lastMs, s.penalty)
  return formatTime(displayMs(s, now))
}
