import { usePlayStore } from './playStore.ts'

/**
 * The one line under the cube: the timer hint, the scramble in notation, or "Solved in N moves"
 * with N in Lab Orange (FR-3.4). The timer digits will share this slot in Sprint 3.
 */
export function HintLine() {
  const line = usePlayStore((s) => s.line)
  return (
    <div className="mt-1 grid min-h-11 place-items-center">
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
    </div>
  )
}
