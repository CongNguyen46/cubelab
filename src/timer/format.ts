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
