import { describe, expect, it } from 'vitest'
import { formatTime } from './format.ts'
import {
  displayMs,
  initialTimer,
  isActive,
  isShown,
  nextTickAt,
  READY_AFTER_MS,
  SHOW_AFTER_MS,
  timerReducer,
  type TimerEvent,
  type TimerState,
} from './machine.ts'

/** Run events in order; returns the final state and any results recorded. */
function run(events: TimerEvent[], from: TimerState = initialTimer) {
  let state = from
  const results: number[] = []
  for (const e of events) {
    const out = timerReducer(state, e)
    state = out.state
    if (out.result) results.push(out.result.ms)
  }
  return { state, results }
}

const press = (now: number): TimerEvent => ({ type: 'press', now })
const release = (now: number): TimerEvent => ({ type: 'release', now })
const tick = (now: number): TimerEvent => ({ type: 'tick', now })
const button = (now: number): TimerEvent => ({ type: 'button', now })

describe('formatTime', () => {
  it.each([
    [0, '00.00'],
    [9, '00.00'],
    [10, '00.01'],
    [1234, '01.23'],
    [9999, '09.99'],
    [12_345, '12.34'],
    [59_999, '59.99'],
    [60_000, '1:00.00'],
    [61_005, '1:01.00'],
    [83_456, '1:23.45'],
    [600_000, '10:00.00'],
    [-5, '00.00'],
  ])('%i ms reads %s', (ms, text) => {
    expect(formatTime(ms)).toBe(text)
  })
})

describe('hold Space from hidden', () => {
  it('a quick tap does nothing', () => {
    const { state, results } = run([press(0), tick(100), release(120)])
    expect(state.phase).toBe('hidden')
    expect(results).toEqual([])
  })

  it('digits appear grey at 150 ms and turn mint at 400 ms', () => {
    let s = run([press(0)]).state
    expect(s.phase).toBe('pressing')
    expect(isShown(s)).toBe(false)
    s = run([tick(SHOW_AFTER_MS - 1)], s).state
    expect(s.phase).toBe('pressing')
    s = run([tick(SHOW_AFTER_MS)], s).state
    expect(s.phase).toBe('hold')
    expect(isShown(s)).toBe(true)
    s = run([tick(READY_AFTER_MS - 1)], s).state
    expect(s.phase).toBe('hold')
    s = run([tick(READY_AFTER_MS)], s).state
    expect(s.phase).toBe('ready')
  })

  it('letting go while mint starts the timer at that moment', () => {
    const { state } = run([press(0), tick(150), tick(400), release(700)])
    expect(state.phase).toBe('running')
    expect(state.startedAt).toBe(700)
    expect(displayMs(state, 2700)).toBe(2000)
  })

  it('letting go after 150 ms but before mint hides the digits again', () => {
    const { state } = run([press(0), tick(150), release(300)])
    expect(state.phase).toBe('hidden')
  })

  it('a release counts the time held even if no tick arrived', () => {
    // Ticks can be late; the release itself checks the 400 ms threshold.
    expect(run([press(0), release(450)]).state.phase).toBe('running')
    expect(run([press(0), release(399)]).state.phase).toBe('hidden')
  })

  it('key repeat while held is ignored', () => {
    const { state } = run([press(0), press(50), press(100), tick(400), release(500)])
    expect(state.startedAt).toBe(500)
  })
})

describe('stopping', () => {
  const running = run([press(0), release(500)]).state

  it('Space stops it, records the time, and the matching release is ignored', () => {
    const { state, results } = run([press(10_500), release(10_600)], running)
    expect(results).toEqual([10_000])
    expect(state.phase).toBe('stopped')
    expect(state.lastMs).toBe(10_000)
    expect(displayMs(state, 99_999)).toBe(10_000)
  })

  it('a second hold from stopped shows grey straight away, and an early release keeps the time', () => {
    const stopped = run([press(3500), release(3600)], running).state
    let s = run([press(5000)], stopped).state
    expect(s.phase).toBe('hold')
    expect(displayMs(s, 5100)).toBe(0) // reads 00.00 while held
    s = run([release(5200)], s).state
    expect(s.phase).toBe('stopped')
    expect(s.lastMs).toBe(3000)
  })

  it('holding again to mint from stopped starts a new solve', () => {
    const stopped = run([press(3500), release(3600)], running).state
    const { state } = run([press(5000), tick(5400), release(5450)], stopped)
    expect(state.phase).toBe('running')
    expect(state.startedAt).toBe(5450)
  })
})

describe('Timer button', () => {
  it('cycles start, stop, hide', () => {
    let out = run([button(1000)])
    expect(out.state.phase).toBe('running')
    out = run([button(4210)], out.state)
    expect(out.state.phase).toBe('stopped')
    expect(out.results).toEqual([3210])
    out = run([button(5000)], out.state)
    expect(out.state.phase).toBe('hidden')
    expect(out.state.lastMs).toBe(3210)
  })

  it('starts from shown idle too', () => {
    const idle: TimerState = { ...initialTimer, phase: 'idle' }
    expect(run([button(0)], idle).state.phase).toBe('running')
  })
})

describe('hiding', () => {
  it('clicking the stopped digits hides them', () => {
    const stopped = run([button(0), button(1000)]).state
    expect(run([{ type: 'clickDigits' }], stopped).state.phase).toBe('hidden')
  })

  it('clicking the digits does nothing while running', () => {
    const running = run([button(0)]).state
    expect(run([{ type: 'clickDigits' }], running).state.phase).toBe('running')
  })

  it('Esc hides from any shown phase', () => {
    const stopped = run([button(0), button(1000)]).state
    expect(run([{ type: 'escape' }], stopped).state.phase).toBe('hidden')
    const hold = run([press(0), tick(200)]).state
    expect(run([{ type: 'escape' }], hold).state.phase).toBe('hidden')
    expect(run([{ type: 'escape' }]).state).toEqual(initialTimer)
  })

  it('Esc while running discards the solve', () => {
    const stopped = run([button(0), button(1000)]).state
    const running = run([button(2000)], stopped).state
    const { state, results } = run([{ type: 'escape' }], running)
    expect(results).toEqual([])
    expect(state.phase).toBe('hidden')
    expect(state.lastMs).toBe(1000) // the previous time, not the discarded one
  })

  it('a release after Esc is ignored', () => {
    const s = run([press(0), tick(400), { type: 'escape' }, release(500)]).state
    expect(s.phase).toBe('hidden')
  })
})

describe('helpers', () => {
  it('isActive covers pressing, hold, ready and running only', () => {
    const phases = ['hidden', 'pressing', 'idle', 'hold', 'ready', 'running', 'stopped'] as const
    const active = phases.filter((phase) => isActive({ ...initialTimer, phase }))
    expect(active).toEqual(['pressing', 'hold', 'ready', 'running'])
  })

  it('nextTickAt points at the next threshold', () => {
    expect(nextTickAt(initialTimer)).toBeNull()
    expect(nextTickAt(run([press(100)]).state)).toBe(250)
    expect(nextTickAt(run([press(100), tick(250)]).state)).toBe(500)
    expect(nextTickAt(run([press(100), tick(500)]).state)).toBeNull()
  })

  it('displayMs is 0 when hidden or held', () => {
    expect(displayMs(initialTimer, 1000)).toBe(0)
  })
})
