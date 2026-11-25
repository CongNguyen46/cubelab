import { afterEach, describe, expect, it } from 'vitest'
import { initialTimer, useTimerStore, type TimerPhase } from '../timer/index.ts'
import { inputLocked, pointerLocked, turnsLocked, usePlayStore } from './playStore.ts'

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

  it('Scramble or Solve playing locks keys, Undo and layer turns, but not view drags', () => {
    for (const mode of ['scrambling', 'solving'] as const) {
      usePlayStore.setState({ mode })
      expect(inputLocked()).toBe(true)
      expect(turnsLocked()).toBe(true)
      expect(pointerLocked('mouse')).toBe(false)
      expect(pointerLocked('touch')).toBe(false)
    }
  })

  it('the canvas follows the timer: locked while held or running, touch only while shown', () => {
    expect(turnsLocked()).toBe(false)
    setPhase('running')
    expect(pointerLocked('mouse')).toBe(true)
    setPhase('stopped')
    expect(pointerLocked('mouse')).toBe(false)
    expect(pointerLocked('touch')).toBe(true)
  })
})
