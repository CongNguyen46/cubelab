import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'zustand'
import { initialTimer, type TimerPhase } from '../timer/index.ts'
import { createTimerStore } from '../timer/store.ts'
import type { Line } from './play.ts'
import { createSolvedFlash, SOLVED_FLASH_MS } from './solvedFlash.ts'

function setup(phase: TimerPhase) {
  const timer = createTimerStore(() => 0)
  timer.setState({ timer: { ...initialTimer, phase, lastMs: 12_340 } })
  const play = create<{ line: Line }>()(() => ({ line: { kind: 'hint' } }))
  const flash = createSolvedFlash({ timer, play })
  const stop = flash.getState().start()
  const solve = (count = 21) => play.setState({ line: { kind: 'solved', count } })
  const showing = () => flash.getState().showing
  return { timer, play, flash, stop, solve, showing }
}

describe('"Solved in N moves" while the timer is shown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each<TimerPhase>(['idle', 'stopped'])(
    'with the digits shown (%s), the message holds the slot for 1.5 s, then the digits return',
    (phase) => {
      const { timer, solve, showing } = setup(phase)
      solve()
      expect(showing()).toBe(true)
      vi.advanceTimersByTime(SOLVED_FLASH_MS - 1)
      expect(showing()).toBe(true)
      vi.advanceTimersByTime(1)
      expect(showing()).toBe(false)
      // The digits keep their value and phase (and so their colour).
      expect(timer.getState().timer).toMatchObject({ phase, lastMs: 12_340 })
    },
  )

  it('with the timer hidden nothing swaps: the line shows the message as before', () => {
    const { solve, showing } = setup('hidden')
    solve()
    expect(showing()).toBe(false)
  })

  it.each<TimerPhase>(['hold', 'ready', 'running'])('no swap while the timer is %s', (phase) => {
    const { solve, showing } = setup(phase)
    solve()
    expect(showing()).toBe(false)
  })

  it('Space cancels it and goes straight to the timer', () => {
    const { timer, solve, showing } = setup('stopped')
    solve()
    timer.getState().send({ type: 'press' })
    expect(showing()).toBe(false)
    expect(timer.getState().timer.phase).toBe('hold')
  })

  it('the Timer button cancels it', () => {
    const { timer, solve, showing } = setup('idle')
    solve()
    timer.getState().send({ type: 'button' })
    expect(showing()).toBe(false)
    expect(timer.getState().timer.phase).toBe('running')
  })

  it('Esc cancels it and hides the timer', () => {
    const { timer, solve, showing } = setup('stopped')
    solve()
    timer.getState().send({ type: 'escape' })
    expect(showing()).toBe(false)
    expect(timer.getState().timer.phase).toBe('hidden')
  })

  it('a second solve restarts the 1.5 s', () => {
    const { solve, showing } = setup('stopped')
    solve(20)
    vi.advanceTimersByTime(1000)
    solve(18)
    vi.advanceTimersByTime(1000)
    expect(showing()).toBe(true)
    vi.advanceTimersByTime(500)
    expect(showing()).toBe(false)
  })

  it('stops listening when stopped', () => {
    const { stop, solve, showing } = setup('stopped')
    stop()
    solve()
    expect(showing()).toBe(false)
  })
})
