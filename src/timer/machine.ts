/**
 * The inline timer as a pure state machine, ported from prototype/index.html.
 *
 * Phases:
 * - hidden: no digits, the hint line shows.
 * - pressing: Space (or a touch) went down while hidden; nothing shows for the first 150 ms,
 *   so a quick tap does nothing.
 * - idle: digits shown at 00.00 (or the last time), not timing.
 * - hold: held, digits grey. ready: held for 400 ms, digits mint; letting go starts.
 * - running: timing, digits Lab Orange. stopped: the time stays, Lab Orange.
 *
 * Times are passed in (performance.now() in the app) so every transition can be tested.
 */

export type TimerPhase = 'hidden' | 'pressing' | 'idle' | 'hold' | 'ready' | 'running' | 'stopped'

export type TimerState = {
  readonly phase: TimerPhase
  /** When the current press began. */
  readonly pressedAt: number | null
  /** The press began with the digits hidden: an early release hides them again. */
  readonly pressFromHidden: boolean
  /** When the running solve began. */
  readonly startedAt: number | null
  /** The last finished time in ms, shown while stopped. */
  readonly lastMs: number | null
  /** A press stopped the timer, so the matching release is ignored. */
  readonly swallowRelease: boolean
}

export type TimerEvent =
  | { type: 'press'; now: number }
  | { type: 'release'; now: number }
  /** Lets the 150 ms and 400 ms thresholds pass. Call on a timer or every frame. */
  | { type: 'tick'; now: number }
  /** The Timer button: start, then stop, then hide. */
  | { type: 'button'; now: number }
  /** A click on the digits: hides them once stopped. */
  | { type: 'clickDigits' }
  /** Esc: hides the digits. A running solve is discarded. */
  | { type: 'escape' }

/** A solve that just finished, to record. */
export type TimerResult = { ms: number }

export const SHOW_AFTER_MS = 150
export const READY_AFTER_MS = 400

export const initialTimer: TimerState = {
  phase: 'hidden',
  pressedAt: null,
  pressFromHidden: false,
  startedAt: null,
  lastMs: null,
  swallowRelease: false,
}

/** Digits are on screen (the hint line is not). */
export const isShown = (s: TimerState) => s.phase !== 'hidden' && s.phase !== 'pressing'

/** The timer owns input: cube keys, drags, Scramble, Solve and the menu wait. */
export const isActive = (s: TimerState) =>
  s.phase === 'pressing' || s.phase === 'hold' || s.phase === 'ready' || s.phase === 'running'

/** What the digits read at `now`. */
export function displayMs(s: TimerState, now: number): number {
  if (s.phase === 'running' && s.startedAt !== null) return now - s.startedAt
  if (s.phase === 'stopped' || s.phase === 'idle') return s.lastMs ?? 0
  return 0
}

/** When the next threshold falls, so the caller can schedule a tick. Null if none is pending. */
export function nextTickAt(s: TimerState): number | null {
  if (s.pressedAt === null) return null
  if (s.phase === 'pressing') return s.pressedAt + SHOW_AFTER_MS
  if (s.phase === 'hold') return s.pressedAt + READY_AFTER_MS
  return null
}

const start = (s: TimerState, now: number): TimerState => ({
  ...s,
  phase: 'running',
  pressedAt: null,
  pressFromHidden: false,
  startedAt: now,
})

const stop = (s: TimerState, now: number): [TimerState, TimerResult] => {
  const ms = now - (s.startedAt ?? now)
  return [{ ...s, phase: 'stopped', startedAt: null, lastMs: ms }, { ms }]
}

const hide = (s: TimerState): TimerState => ({
  ...s,
  phase: 'hidden',
  pressedAt: null,
  pressFromHidden: false,
  startedAt: null,
  swallowRelease: false,
})

/** Back to showing the last time (or 00.00) after a hold that did not start. */
const settleShown = (s: TimerState): TimerState => ({
  ...s,
  phase: s.lastMs === null ? 'idle' : 'stopped',
  pressedAt: null,
  pressFromHidden: false,
})

/** Apply the thresholds that have passed by `now`. */
function advance(s: TimerState, now: number): TimerState {
  if (s.pressedAt === null) return s
  const held = now - s.pressedAt
  let phase = s.phase
  if (phase === 'pressing' && held >= SHOW_AFTER_MS) phase = 'hold'
  if (phase === 'hold' && held >= READY_AFTER_MS) phase = 'ready'
  return phase === s.phase ? s : { ...s, phase }
}

export function timerReducer(
  state: TimerState,
  event: TimerEvent,
): { state: TimerState; result?: TimerResult } {
  switch (event.type) {
    case 'press': {
      if (state.phase === 'running') {
        const [stopped, result] = stop(state, event.now)
        return { state: { ...stopped, swallowRelease: true }, result }
      }
      if (state.pressedAt !== null) return { state } // already held
      const fromHidden = !isShown(state)
      return {
        state: {
          ...state,
          phase: fromHidden ? 'pressing' : 'hold',
          pressedAt: event.now,
          pressFromHidden: fromHidden,
        },
      }
    }

    case 'release': {
      if (state.swallowRelease) return { state: { ...state, swallowRelease: false } }
      if (state.pressedAt === null) return { state }
      const s = advance(state, event.now)
      if (s.phase === 'ready') return { state: start(s, event.now) }
      if (s.pressFromHidden) return { state: hide(s) } // quick tap, or let go before ready
      return { state: settleShown(s) }
    }

    case 'tick':
      return { state: advance(state, event.now) }

    case 'button': {
      if (state.phase === 'running') return wrap(stop(state, event.now))
      if (state.phase === 'stopped') return { state: hide(state) }
      return { state: start(state, event.now) }
    }

    case 'clickDigits':
      return { state: state.phase === 'stopped' ? hide(state) : state }

    case 'escape':
      // Hides from any phase. A running solve is dropped, not recorded.
      return { state: state.phase === 'hidden' ? state : hide(state) }
  }
}

const wrap = ([state, result]: [TimerState, TimerResult]) => ({ state, result })
