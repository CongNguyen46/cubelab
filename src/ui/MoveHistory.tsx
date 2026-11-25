import { useCubeStore } from './cubeStore.ts'
import { UndoIcon } from './icons.tsx'
import { inputLocked, usePlayStore } from './playStore.ts'
import { useUiStore } from './uiStore.ts'
import { isActive, useTimerStore } from '../timer/index.ts'

/** Chips shown: 10, or 6 on narrow screens (the track clips the oldest four there). */
export const SHOWN = 10

/**
 * Fixed-width chip track, newest chip next to Undo. Chips have one fixed width (38 px, 8 px gaps),
 * so U and U2 take the same room and nothing jitters. 6 chips below 640 px, 10 above; the track
 * never wraps. Older chips overflow on the left and are clipped.
 */
export const TRACK =
  'm-0 flex h-11 w-[268px] shrink-0 list-none items-center justify-end gap-2 overflow-hidden p-0 sm:w-[452px]'
export const CHIP =
  'w-[38px] shrink-0 rounded-lg border border-border bg-surface py-[7px] text-center font-mono text-sm leading-none font-medium'

const iconButton =
  'inline-grid size-11 cursor-pointer place-items-center rounded-xl border border-border bg-transparent text-text-subtle transition-[color,opacity] duration-200 ease-lab hover:text-text disabled:cursor-not-allowed disabled:hover:text-text-subtle'

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
  return <MoveHistoryRow history={history} undoDisabled={!canUndo || playing} onUndo={undo} />
}

type RowProps = {
  /** Every move label, oldest first. The row shows the last SHOWN. */
  history: readonly string[]
  undoDisabled: boolean
  onUndo: () => void
}

/** The chips and Undo, without the stores, so the layout can be tested on its own. */
export function MoveHistoryRow({ history, undoDisabled, onUndo }: RowProps) {
  const shown = history.slice(-SHOWN)
  const offset = history.length - shown.length
  const empty = shown.length === 0

  return (
    // One fixed-width block, centred: the chip track, then Undo. Undo never moves, so it can be
    // clicked again and again without moving the mouse (FR-1.5).
    <div
      className="mt-4 flex min-h-11 items-center justify-center gap-2 select-none"
      aria-live="polite"
    >
      <ol className={TRACK} aria-label="Move history">
        {shown.map((m, i) => (
          <li
            key={offset + i}
            className={`${CHIP} ${i === shown.length - 1 ? 'text-text' : 'text-text-subtle'}`}
          >
            {m}
          </li>
        ))}
      </ol>
      {/* With no history Undo fades out but keeps its place, so nothing shifts. */}
      <button
        type="button"
        className={`${iconButton} ${empty ? 'pointer-events-none opacity-0' : 'disabled:opacity-40'}`}
        onClick={onUndo}
        disabled={empty || undoDisabled}
        aria-hidden={empty || undefined}
        tabIndex={empty ? -1 : undefined}
        aria-label="Undo last move"
      >
        <UndoIcon />
      </button>
    </div>
  )
}
