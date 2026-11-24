import { useCubeStore } from './cubeStore.ts'
import { ResetIcon, UndoIcon } from './icons.tsx'

const SHOWN = 10

const iconButton =
  'inline-grid size-11 cursor-pointer place-items-center rounded-xl border border-border bg-transparent text-text-subtle transition-colors duration-200 ease-lab hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-subtle'

/** The last few moves as chips (FR-1.6), with Undo and Reset (FR-1.5). */
export function MoveHistory() {
  const history = useCubeStore((s) => s.history)
  const canUndo = useCubeStore((s) => s.canUndo)
  const undo = useCubeStore((s) => s.undo)
  const reset = useCubeStore((s) => s.reset)
  const shown = history.slice(-SHOWN)
  const offset = history.length - shown.length

  return (
    <div
      className="mt-4 flex min-h-11 flex-wrap items-center justify-center gap-2"
      aria-live="polite"
    >
      {shown.length > 0 && (
        <ol
          className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0"
          aria-label="Move history"
        >
          {shown.map((m, i) => (
            <li
              key={offset + i}
              className={`rounded-lg border border-border bg-surface px-[9px] py-[7px] font-mono text-sm leading-none font-medium ${
                i === shown.length - 1 ? 'text-text' : 'text-text-subtle'
              }`}
            >
              {m}
            </li>
          ))}
        </ol>
      )}
      {shown.length > 0 && (
        <>
          <button
            type="button"
            className={iconButton}
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo last move"
          >
            <UndoIcon />
          </button>
          <button type="button" className={iconButton} onClick={reset} aria-label="Reset to solved">
            <ResetIcon />
          </button>
        </>
      )}
    </div>
  )
}
