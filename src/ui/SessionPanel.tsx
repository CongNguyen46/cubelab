import { useState } from 'react'
import type { Penalty } from '../timer/machine.ts'
import { formatResult, formatTime, isActive, isShown, useTimerStore } from '../timer/index.ts'
import { sessionStats, type Stat } from '../timer/stats.ts'
import { useSessionStore } from './sessionStore.ts'

const statText = (s: Stat) => (s === null ? '-' : s === 'dnf' ? 'DNF' : formatTime(s))

const PENALTIES: [Penalty, string][] = [
  ['none', 'OK'],
  ['plus2', '+2'],
  ['dnf', 'DNF'],
]

const small =
  'cursor-pointer rounded-lg border border-border bg-transparent px-2.5 py-1.5 font-mono text-[13px] leading-none font-medium text-text-subtle transition-colors duration-200 ease-lab hover:text-text disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Session stats and times (FR-4.5). Shown only while the timer is: with the timer hidden the
 * page is exactly the design. The list of times is collapsed behind the Session toggle.
 */
export function SessionPanel() {
  const timer = useTimerStore((s) => s.timer)
  const solves = useSessionStore((s) => s.solves)
  const inspection = useSessionStore((s) => s.inspection)
  const setPenalty = useSessionStore((s) => s.setPenalty)
  const remove = useSessionStore((s) => s.remove)
  const setInspection = useSessionStore((s) => s.setInspection)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  if (!isShown(timer)) return null
  const busy = isActive(timer)
  const stats = sessionStats(solves)
  const newestFirst = [...solves].reverse()
  const chosen = solves.find((s) => s.id === picked) ?? null

  return (
    <section
      aria-label="Session"
      className="mt-3 flex w-full max-w-[720px] flex-col items-center gap-3"
    >
      <dl className="m-0 flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-[13px]">
        {(
          [
            ['Best', stats.best],
            ['Mean', stats.mean],
            ['ao5', stats.ao5],
            ['ao12', stats.ao12],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex gap-1.5">
            <dt className="text-text-subtle">{label}</dt>
            <dd className="m-0 text-text tabular-nums">{statText(value)}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        className={small}
        aria-expanded={open}
        aria-controls="session-times"
        onClick={() => {
          setOpen(!open)
          setPicked(null)
        }}
      >
        Session {solves.length > 0 && <span className="text-text">{solves.length}</span>}{' '}
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div id="session-times" className="flex flex-col items-center gap-3">
          {newestFirst.length === 0 ? (
            <p className="m-0 font-mono text-[13px] text-text-subtle">No times yet</p>
          ) : (
            <ol
              className="m-0 flex list-none flex-wrap justify-center gap-2 p-0"
              aria-label="Times, newest first"
            >
              {newestFirst.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`${small} ${s.id === picked ? 'border-accent-line text-text' : ''}`}
                    aria-pressed={s.id === picked}
                    aria-label={`Solve ${solves.length - i}: ${formatResult(s.ms, s.penalty)}`}
                    disabled={busy}
                    onClick={() => setPicked(s.id === picked ? null : s.id)}
                  >
                    {formatResult(s.ms, s.penalty)}
                  </button>
                </li>
              ))}
            </ol>
          )}

          {chosen && (
            <div
              role="group"
              aria-label={`Edit ${formatResult(chosen.ms, chosen.penalty)}`}
              className="flex flex-wrap justify-center gap-2"
            >
              {PENALTIES.map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  className={`${small} ${chosen.penalty === p ? 'border-accent-line text-accent' : ''}`}
                  aria-pressed={chosen.penalty === p}
                  disabled={busy}
                  onClick={() => void setPenalty(chosen.id, p)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={small}
                disabled={busy}
                onClick={() => {
                  setPicked(null)
                  void remove(chosen.id)
                }}
              >
                Delete
              </button>
            </div>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={inspection}
            className={`${small} flex items-center gap-2`}
            disabled={busy}
            onClick={() => void setInspection(!inspection)}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-full ${inspection ? 'bg-success' : 'bg-border'}`}
            />
            15 s inspection {inspection ? 'on' : 'off'}
          </button>
        </div>
      )}
    </section>
  )
}
