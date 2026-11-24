import { afterEach, describe, expect, it } from 'vitest'
import { initialTimer, useTimerStore, type TimerPhase } from '../timer/index.ts'
import { inputLocked, usePlayStore } from './playStore.ts'

const setPhase = (phase: TimerPhase) =>
  useTimerStore.setState({ timer: { ...initialTimer, phase } })

describe('input locks while timing', () => {
  afterEach(() => {
    setPhase('hidden')
    usePlayStore.setState({ mode: 'idle' })
  })

  it('nothing is locked with the timer hidden', () => {
    expect(inputLocked()).toBe(false)
    expect(inputLocked('touch')).toBe(false)
    expect(inputLocked('mouse')).toBe(false)
  })

  it.each<TimerPhase>(['pressing', 'hold', 'ready', 'running'])(
    'keys and every pointer are locked while %s',
    (phase) => {
      setPhase(phase)
      expect(inputLocked()).toBe(true)
      expect(inputLocked('mouse')).toBe(true)
      expect(inputLocked('touch')).toBe(true)
    },
  )

  it.each<TimerPhase>(['idle', 'stopped'])(
    'while the digits show (%s), only touch belongs to the timer',
    (phase) => {
      setPhase(phase)
      expect(inputLocked()).toBe(false)
      expect(inputLocked('mouse')).toBe(false)
      expect(inputLocked('touch')).toBe(true)
    },
  )

  it('Scramble or Solve playing still locks everything', () => {
    usePlayStore.setState({ mode: 'solving' })
    expect(inputLocked()).toBe(true)
  })
})
