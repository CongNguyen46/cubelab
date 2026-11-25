import { useCubeStore } from './cubeStore.ts'
import { UndoIcon } from './icons.tsx'
import { inputLocked, usePlayStore } from './playStore.ts'
import { useUiStore } from './uiStore.ts'
import { isActive, useTimerStore } from '../timer/index.ts'

const SHOWN = 10

const iconButton =
  'inline-grid size-11 cursor-pointer place-items-center rounded-xl border border-border bg-transparent text-text-subtle transition-colors duration-200 ease-lab hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-subtle'

/** The last few moves as chips (FR-1.6), with Undo (FR-1.5). Reset was removed by decision. */
export function MoveHistory() {
  const history = useCubeStore((s) => s.history)
  const canUndo = useCubeStore((s) => s.canUndo)
  const undoMove = useCubeStore((s) => s.undo)
  // Wait for a dragged layer to land before changing the cube.
  const timerActive = useTimerStore((s) => isActive(s.timer))
  const idle = () => !useUiStore.getState().view?.isTurning() && !inputLocked()
  const playing = usePlayStore((s) => s.mode !== 'idle') || timerActive
  const undo = () => idle() && undoMove()
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
            disabled={!canUndo || playing}
            aria-label="Undo last move"
          >
            <UndoIcon />
          </button>
        </>
      )}
    </div>
  )
}
