/**
 * The inline timer as a pure state machine, ported from prototype/index.html.
 *
 * Phases:
 * - hidden: no digits, the hint line shows.
 * - pressing: Space (or a touch) went down while hidden; nothing shows for the first 150 ms,
 *   so a quick tap does nothing.
 * - idle: digits shown at 00.00 (or the last time), not timing.
 * - inspecting: the optional 15 s inspection countdown (FR-4.3).
 * - hold: held, digits grey. ready: held for 400 ms, digits mint; letting go starts.
 * - running: timing, digits Lab Orange. stopped: the time stays, Lab Orange.
 *
 * Times are passed in (performance.now() in the app) so every transition can be tested.
 */

export type TimerPhase =
  'hidden' | 'pressing' | 'idle' | 'inspecting' | 'hold' | 'ready' | 'running' | 'stopped'

/** A solve's penalty: none, +2 seconds, or did not finish. */
export type Penalty = 'none' | 'plus2' | 'dnf'

/** Inspection warnings passed so far: none, 8 s, 12 s, or past 15 s (+2 zone). */
export type InspectStage = 0 | 8 | 12 | 15

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
  /** Inspection is switched on. */
  readonly inspection: boolean
  /** When the current inspection began. Kept while the solve is held to start. */
  readonly inspectAt: number | null
  readonly inspectStage: InspectStage
  /** The penalty of the running or last solve, from how long inspection took. */
  readonly penalty: Penalty
}

export type TimerEvent =
  | { type: 'press'; now: number }
  | { type: 'release'; now: number }
  /** Lets the thresholds pass (hold 150 / 400 ms, inspection 8 / 12 / 15 / 17 s). */
  | { type: 'tick'; now: number }
  /** The Timer button: start (or inspect), then stop, then hide. */
  | { type: 'button'; now: number }
  /** A click on the digits: hides them once stopped. */
  | { type: 'clickDigits' }
  /** Esc: hides the digits. A running solve or inspection is discarded. */
  | { type: 'escape' }
  | { type: 'setInspection'; on: boolean }

/** A solve that just finished, to record. `ms` is the raw time, before any +2. */
export type TimerResult = { ms: number; penalty: Penalty }

export const SHOW_AFTER_MS = 150
export const READY_AFTER_MS = 400
/** WCA inspection: 15 s, warnings at 8 and 12, +2 after 15, DNF after 17. */
export const INSPECT_MS = 15_000
export const INSPECT_DNF_MS = 17_000
const STAGES: readonly [InspectStage, number][] = [
  [8, 8_000],
  [12, 12_000],
  [15, INSPECT_MS],
]

export const initialTimer: TimerState = {
  phase: 'hidden',
  pressedAt: null,
  pressFromHidden: false,
  startedAt: null,
  lastMs: null,
  swallowRelease: false,
  inspection: false,
  inspectAt: null,
  inspectStage: 0,
  penalty: 'none',
}

/** Digits are on screen (the hint line is not). */
export const isShown = (s: TimerState) => s.phase !== 'hidden' && s.phase !== 'pressing'

/** The timer owns input: cube keys, drags, Scramble, Solve and the menu wait. */
export const isActive = (s: TimerState) =>
  s.phase === 'pressing' ||
  s.phase === 'inspecting' ||
  s.phase === 'hold' ||
  s.phase === 'ready' ||
  s.phase === 'running'

/** Inspection is counting, including while the solve is held to start. */
export const isInspecting = (s: TimerState) => s.inspectAt !== null

/** What the digits read at `now`, in ms. */
export function displayMs(s: TimerState, now: number): number {
  if (s.phase === 'running' && s.startedAt !== null) return now - s.startedAt
  if (s.phase === 'stopped' || s.phase === 'idle') return s.lastMs ?? 0
  return 0
}

/** When the next threshold falls, so the caller can schedule a tick. Null if none is pending. */
export function nextTickAt(s: TimerState): number | null {
  const at: number[] = []
  if (s.pressedAt !== null) {
    if (s.phase === 'pressing') at.push(s.pressedAt + SHOW_AFTER_MS)
    if (s.phase === 'hold') at.push(s.pressedAt + READY_AFTER_MS)
  }
  if (s.inspectAt !== null) {
    const next = STAGES.find(([stage]) => stage > s.inspectStage)
    at.push(s.inspectAt + (next ? next[1] : INSPECT_DNF_MS))
  }
  return at.length ? Math.min(...at) : null
}

const inspectPenalty = (s: TimerState, now: number): Penalty => {
  if (s.inspectAt === null) return 'none'
  const took = now - s.inspectAt
  if (took > INSPECT_DNF_MS) return 'dnf'
  return took > INSPECT_MS ? 'plus2' : 'none'
}

const start = (s: TimerState, now: number): TimerState => ({
  ...s,
  phase: 'running',
  pressedAt: null,
  pressFromHidden: false,
  startedAt: now,
  penalty: inspectPenalty(s, now),
  inspectAt: null,
  inspectStage: 0,
})

const inspect = (s: TimerState, now: number): TimerState => ({
  ...s,
  phase: 'inspecting',
  pressedAt: null,
  pressFromHidden: false,
  inspectAt: now,
  inspectStage: 0,
})

/** Start the solve, or the inspection first when it is switched on. */
const go = (s: TimerState, now: number): TimerState =>
  s.inspection && s.inspectAt === null ? inspect(s, now) : start(s, now)

const stop = (s: TimerState, now: number): [TimerState, TimerResult] => {
  const ms = now - (s.startedAt ?? now)
  return [
    { ...s, phase: 'stopped', startedAt: null, lastMs: ms },
    { ms, penalty: s.penalty },
  ]
}

const hide = (s: TimerState): TimerState => ({
  ...s,
  phase: 'hidden',
  pressedAt: null,
  pressFromHidden: false,
  startedAt: null,
  swallowRelease: false,
  inspectAt: null,
  inspectStage: 0,
})

/** Back to showing the countdown, the last time or 00.00 after a hold that did not start. */
const settleShown = (s: TimerState): TimerState => ({
  ...s,
  phase: s.inspectAt !== null ? 'inspecting' : s.lastMs === null ? 'idle' : 'stopped',
  pressedAt: null,
  pressFromHidden: false,
})

/** Apply the thresholds that have passed by `now`. Inspection past 17 s ends as a DNF. */
function advance(s: TimerState, now: number): { state: TimerState; result?: TimerResult } {
  let next = s
  if (s.pressedAt !== null) {
    const held = now - s.pressedAt
    let phase = s.phase
    if (phase === 'pressing' && held >= SHOW_AFTER_MS) phase = 'hold'
    if (phase === 'hold' && held >= READY_AFTER_MS) phase = 'ready'
    if (phase !== s.phase) next = { ...next, phase }
  }
  if (next.inspectAt !== null) {
    const took = now - next.inspectAt
    if (took >= INSPECT_DNF_MS) {
      const result: TimerResult = { ms: 0, penalty: 'dnf' }
      return {
        state: {
          ...next,
          phase: 'stopped',
          lastMs: 0,
          penalty: 'dnf',
          inspectAt: null,
          inspectStage: 0,
          // Still held: the release that follows must not start anything.
          swallowRelease: next.pressedAt !== null,
          pressedAt: null,
          pressFromHidden: false,
        },
        result,
      }
    }
    let stage: InspectStage = 0
    for (const [st, ms] of STAGES) if (took >= ms) stage = st
    if (stage !== next.inspectStage) next = { ...next, inspectStage: stage }
  }
  return { state: next }
}

export function timerReducer(
  state: TimerState,
  event: TimerEvent,
): { state: TimerState; result?: TimerResult } {
  switch (event.type) {
    case 'press': {
      const passed = advance(state, event.now)
      if (passed.result) return passed
      const s = passed.state
      if (s.phase === 'running') {
        const [stopped, result] = stop(s, event.now)
        return { state: { ...stopped, swallowRelease: true }, result }
      }
      if (s.pressedAt !== null) return { state: s } // already held
      // With inspection on, a tap on the shown digits starts the countdown straight away.
      if (s.inspection && (s.phase === 'idle' || s.phase === 'stopped')) {
        return { state: { ...inspect(s, event.now), swallowRelease: true } }
      }
      const fromHidden = !isShown(s)
      return {
        state: {
          ...s,
          phase: fromHidden ? 'pressing' : 'hold',
          pressedAt: event.now,
          pressFromHidden: fromHidden,
        },
      }
    }

    case 'release': {
      if (state.swallowRelease) return { state: { ...state, swallowRelease: false } }
      if (state.pressedAt === null) return { state }
      const passed = advance(state, event.now)
      if (passed.result) {
        return { state: { ...passed.state, swallowRelease: false }, result: passed.result }
      }
      const s = passed.state
      if (s.phase === 'ready') return { state: go(s, event.now) }
      if (s.pressFromHidden) return { state: hide(s) } // quick tap, or let go before ready
      return { state: settleShown(s) }
    }

    case 'tick':
      return advance(state, event.now)

    case 'button': {
      const passed = advance(state, event.now)
      if (passed.result) return passed
      const s = passed.state
      if (s.phase === 'running') return wrap(stop(s, event.now))
      if (s.phase === 'stopped') return { state: hide(s) }
      return { state: go({ ...s, pressedAt: null }, event.now) }
    }

    case 'clickDigits':
      return { state: state.phase === 'stopped' ? hide(state) : state }

    case 'escape':
      // Hides from any phase. A running solve or inspection is dropped, not recorded.
      return { state: state.phase === 'hidden' ? state : hide(state) }

    case 'setInspection':
      return { state: { ...state, inspection: event.on } }
  }
}

const wrap = ([state, result]: [TimerState, TimerResult]) => ({ state, result })
