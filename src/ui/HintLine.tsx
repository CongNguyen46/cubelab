import { isShown, useTimerStore } from '../timer/index.ts'
import { TimerDigits } from '../timer/TimerDigits.tsx'
import { usePlayStore, useSolvedFlash } from './playStore.ts'

const LINE =
  'm-0 max-w-[720px] text-center font-mono text-[15px] leading-normal font-medium text-text-subtle'

/** Crossfade layer: both sit in the same grid cell, 250 ms with the design's ease. */
const LAYER = 'col-start-1 row-start-1 transition-opacity duration-[250ms] ease-lab'

function Solved({ count }: { count: number }) {
  return (
    <>
      Solved in <b className="font-medium text-accent">{count}</b> {count === 1 ? 'move' : 'moves'}
    </>
  )
}

/**
 * The one slot under the cube. It holds the timer digits while the timer is shown (FR-4.1),
 * otherwise one line: the timer hint, or "Solved in N moves" with N in Lab Orange (FR-3.4).
 * A Solve that finishes with the digits shown says "Solved in N moves" for 1.5 s, then the
 * digits fade back in.
 */
export function HintLine() {
  const line = usePlayStore((s) => s.line)
  const timerShown = useTimerStore((s) => isShown(s.timer))
  const flash = useSolvedFlash((s) => s.showing)
  return (
    <div className="mt-1 grid min-h-11 place-items-center select-none">
      {timerShown ? (
        <>
          <div
            className={`${LAYER} ${flash ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
            aria-hidden={flash || undefined}
          >
            <TimerDigits />
          </div>
          <p
            className={`${LINE} ${LAYER} pointer-events-none ${flash ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!flash || undefined}
          >
            {/* Stays rendered while it fades out; only its opacity changes. */}
            {line.kind === 'solved' && <Solved count={line.count} />}
          </p>
        </>
      ) : (
        <p className={LINE} aria-live="polite">
          {line.kind === 'hint' && (
            <>
              Hold{' '}
              <span className="mx-0.5 inline-block rounded-md border border-accent-line px-[7px] py-0.5 text-[13px] leading-[1.3] text-accent">
                Space
              </span>{' '}
              to start the timer
            </>
          )}
          {line.kind === 'solved' && <Solved count={line.count} />}
          {line.kind === 'error' && line.text}
        </p>
      )}
    </div>
  )
}
