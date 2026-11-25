import { create } from 'zustand'
import {
  initialTimer,
  nextTickAt,
  timerReducer,
  type TimerEvent,
  type TimerResult,
  type TimerState,
} from './machine.ts'

/** An event without its time: the store stamps it with the clock. */
type Input =
  | { type: 'press' }
  | { type: 'release' }
  | { type: 'button' }
  | { type: 'clickDigits' }
  | { type: 'escape' }
  | { type: 'setInspection'; on: boolean }

type TimerStore = {
  timer: TimerState
  send: (input: Input) => void
  /** Called with each finished solve. Returns an unsubscribe function. */
  onResult: (listener: (result: TimerResult) => void) => () => void
}

/**
 * Drives the timer machine with a real clock. `now` is performance.now() in the app: a
 * monotonic, high-resolution clock, so system clock changes cannot skew a solve (FR-4).
 */
export function createTimerStore(now: () => number = () => performance.now()) {
  const listeners = new Set<(result: TimerResult) => void>()
  let tickTimer: ReturnType<typeof setTimeout> | null = null

  return create<TimerStore>()((set, get) => {
    const apply = (event: TimerEvent) => {
      const { state, result } = timerReducer(get().timer, event)
      set({ timer: state })
      if (result) listeners.forEach((l) => l(result))
      // Wake up when the next hold threshold (150 ms, 400 ms) is due.
      if (tickTimer) clearTimeout(tickTimer)
      tickTimer = null
      const at = nextTickAt(state)
      if (at !== null) {
        tickTimer = setTimeout(() => apply({ type: 'tick', now: now() }), Math.max(0, at - now()))
      }
    }

    return {
      timer: initialTimer,
      send: (input) => apply({ ...input, now: now() } as TimerEvent),
      onResult: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
  })
}

export const useTimerStore = createTimerStore()
