import { describe, expect, it } from 'vitest'
import { digitsText, formatResult } from './format.ts'
import {
  initialTimer,
  isActive,
  isShown,
  nextTickAt,
  timerReducer,
  type TimerEvent,
  type TimerResult,
  type TimerState,
} from './machine.ts'

function run(events: TimerEvent[], from: TimerState) {
  let state = from
  const results: TimerResult[] = []
  for (const e of events) {
    const out = timerReducer(state, e)
    state = out.state
    if (out.result) results.push(out.result)
  }
  return { state, results }
}

const press = (now: number): TimerEvent => ({ type: 'press', now })
const release = (now: number): TimerEvent => ({ type: 'release', now })
const tick = (now: number): TimerEvent => ({ type: 'tick', now })
const button = (now: number): TimerEvent => ({ type: 'button', now })

const on: TimerState = { ...initialTimer, inspection: true }
/** Digits shown at 00.00 with inspection on. */
const shown: TimerState = { ...on, phase: 'idle' }

/** Inspect from `at`, hold 500 ms and let go at `startAt`, stop at `stopAt`. */
const solveAfter = (startAt: number, stopAt: number) =>
  run(
    [
      press(0),
      release(50),
      press(startAt - 500),
      tick(startAt - 100),
      release(startAt),
      press(stopAt),
      release(stopAt + 50),
    ],
    shown,
  )

describe('inspection (FR-4.3)', () => {
  it('is off by default', () => {
    expect(initialTimer.inspection).toBe(false)
    expect(run([{ type: 'setInspection', on: true }], initialTimer).state.inspection).toBe(true)
  })

  it('a tap on the shown digits starts the countdown, and its release is ignored', () => {
    const { state } = run([press(0), release(60)], shown)
    expect(state.phase).toBe('inspecting')
    expect(state.inspectAt).toBe(0)
    expect(isShown(state)).toBe(true)
    expect(isActive(state)).toBe(true)
  })

  it('from hidden, the hold to mint starts inspection, not the solve', () => {
    const { state } = run([press(0), tick(150), tick(400), release(450)], on)
    expect(state.phase).toBe('inspecting')
    expect(state.inspectAt).toBe(450)
    expect(state.startedAt).toBeNull()
  })

  it('the Timer button starts inspection, then the solve, then stops', () => {
    let s = run([button(0)], on).state
    expect(s.phase).toBe('inspecting')
    s = run([button(5000)], s).state
    expect(s.phase).toBe('running')
    expect(s.penalty).toBe('none')
    const { state, results } = run([button(15_000)], s)
    expect(state.phase).toBe('stopped')
    expect(results).toEqual([{ ms: 10_000, penalty: 'none' }])
  })

  it('warns at 8 and 12 seconds, then enters the +2 zone at 15', () => {
    const s = run([press(0), release(50)], shown).state
    expect(run([tick(7_999)], s).state.inspectStage).toBe(0)
    expect(run([tick(8_000)], s).state.inspectStage).toBe(8)
    expect(run([tick(12_000)], s).state.inspectStage).toBe(12)
    expect(run([tick(15_000)], s).state.inspectStage).toBe(15)
  })

  it('schedules a tick for each warning, then for the DNF at 17 s', () => {
    let s = run([press(0), release(50)], shown).state
    expect(nextTickAt(s)).toBe(8_000)
    s = run([tick(8_000)], s).state
    expect(nextTickAt(s)).toBe(12_000)
    s = run([tick(12_000)], s).state
    expect(nextTickAt(s)).toBe(15_000)
    s = run([tick(15_000)], s).state
    expect(nextTickAt(s)).toBe(17_000)
  })

  it('a hold during inspection keeps counting and needs the 400 ms', () => {
    let s = run([press(0), release(50), press(3_000)], shown).state
    expect(s.phase).toBe('hold')
    expect(nextTickAt(s)).toBe(3_400)
    s = run([release(3_200)], s).state
    expect(s.phase).toBe('inspecting') // let go early: back to the countdown
    expect(s.inspectAt).toBe(0)
  })

  it('starting within 15 s has no penalty', () => {
    expect(solveAfter(15_000, 25_000).results).toEqual([{ ms: 10_000, penalty: 'none' }])
  })

  it('starting after 15 s adds +2', () => {
    expect(solveAfter(15_001, 25_000).results).toEqual([{ ms: 9_999, penalty: 'plus2' }])
  })

  it('inspection past 17 s ends as a DNF on its own', () => {
    const s = run([press(0), release(50)], shown).state
    const { state, results } = run([tick(17_000)], s)
    expect(state.phase).toBe('stopped')
    expect(state.penalty).toBe('dnf')
    expect(results).toEqual([{ ms: 0, penalty: 'dnf' }])
    expect(nextTickAt(state)).toBeNull()
  })

  it('a DNF while held ignores the release that follows', () => {
    const s = run([press(0), release(50), press(16_800)], shown).state
    const { state, results } = run([tick(17_000), release(17_100)], s)
    expect(results).toEqual([{ ms: 0, penalty: 'dnf' }])
    expect(state.phase).toBe('stopped')
    expect(state.swallowRelease).toBe(false)
  })

  it('a late release after 17 s, before any tick, still records a DNF', () => {
    const s = run([press(0), release(50), press(16_000), tick(16_400)], shown).state
    const { state, results } = run([release(17_500)], s)
    expect(results).toEqual([{ ms: 0, penalty: 'dnf' }])
    expect(state.phase).toBe('stopped')
  })

  it('Esc during inspection discards it', () => {
    const s = run([press(0), release(50)], shown).state
    const { state, results } = run([{ type: 'escape' }], s)
    expect(state.phase).toBe('hidden')
    expect(state.inspectAt).toBeNull()
    expect(results).toEqual([])
  })

  it('after a solve, the next tap inspects again', () => {
    const { state } = solveAfter(5_000, 12_000)
    const next = run([press(20_000), release(20_050)], state).state
    expect(next.phase).toBe('inspecting')
    expect(next.inspectAt).toBe(20_000)
  })
})

describe('digits text', () => {
  const inspecting = run([press(0), release(50)], shown).state

  it.each([
    [0, '15'],
    [999, '15'],
    [1_000, '14'],
    [14_001, '1'],
    [15_000, '+2'],
    [16_900, '+2'],
  ])('inspection at %i ms reads %s', (now, text) => {
    expect(digitsText(inspecting, now)).toBe(text)
  })

  it('keeps the countdown while held to start', () => {
    const held = run([press(4_000), tick(4_400)], inspecting).state
    expect(held.phase).toBe('ready')
    expect(digitsText(held, 4_500)).toBe('11')
  })

  it('shows the running time, then the result with its penalty', () => {
    const running: TimerState = { ...initialTimer, phase: 'running', startedAt: 1_000 }
    expect(digitsText(running, 13_345)).toBe('12.34')
    const stopped: TimerState = { ...initialTimer, phase: 'stopped', lastMs: 12_340 }
    expect(digitsText(stopped, 0)).toBe('12.34')
    expect(digitsText({ ...stopped, penalty: 'plus2' }, 0)).toBe('14.34+')
    expect(digitsText({ ...stopped, penalty: 'dnf' }, 0)).toBe('DNF')
    expect(digitsText({ ...initialTimer, phase: 'idle' }, 0)).toBe('00.00')
  })

  it('formats a result', () => {
    expect(formatResult(9_870, 'none')).toBe('09.87')
    expect(formatResult(59_000, 'plus2')).toBe('1:01.00+')
    expect(formatResult(1, 'dnf')).toBe('DNF')
  })
})
