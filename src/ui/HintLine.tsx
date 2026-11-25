import { isShown, useTimerStore } from '../timer/index.ts'
import { TimerDigits } from '../timer/TimerDigits.tsx'
import { usePlayStore } from './playStore.ts'
import { useSessionStore } from './sessionStore.ts'

/**
 * The one slot under the cube. It holds the timer digits while the timer is shown (FR-4.1), with
 * the scramble to do next under them (FR-4.4). Otherwise one line: the timer hint, the scramble in notation, or "Solved in N moves" with N
 * in Lab Orange (FR-3.4).
 */
export function HintLine() {
  const line = usePlayStore((s) => s.line)
  const timerShown = useTimerStore((s) => isShown(s.timer))
  const nextScramble = useSessionStore((s) => s.scramble)
  return (
    <div className="mt-1 grid min-h-11 place-items-center">
      {timerShown ? (
        <div className="flex flex-col items-center gap-1.5">
          <TimerDigits />
          {/* Text only: you scramble your real cube, the 3D cube stays as it is. */}
          <p
            className="m-0 min-h-[1.55em] max-w-[720px] text-center font-mono text-sm leading-normal font-medium text-text-subtle"
            aria-label={nextScramble ? `Next scramble ${nextScramble}` : undefined}
          >
            {nextScramble ? <span className="text-text">{nextScramble}</span> : null}
          </p>
        </div>
      ) : (
        <p
          className="m-0 max-w-[720px] text-center font-mono text-[15px] leading-normal font-medium text-text-subtle"
          aria-live="polite"
        >
          {line.kind === 'hint' && (
            <>
              Hold{' '}
              <span className="mx-0.5 inline-block rounded-md border border-accent-line px-[7px] py-0.5 text-[13px] leading-[1.3] text-accent">
                Space
              </span>{' '}
              to start the timer
            </>
          )}
          {line.kind === 'scramble' && (
            <>
              Scramble <b className="font-medium text-text">{line.moves}</b>
            </>
          )}
          {line.kind === 'solved' && (
            <>
              Solved in <b className="font-medium text-accent">{line.count}</b>{' '}
              {line.count === 1 ? 'move' : 'moves'}
            </>
          )}
          {line.kind === 'error' && line.text}
        </p>
      )}
    </div>
  )
}
