import { afterEach, describe, expect, it } from 'vitest'
import { initialTimer, isActive, useTimerStore, type TimerPhase } from '../timer/index.ts'
import { inputLocked, pointerLocked, turnsLocked, usePlayStore } from './playStore.ts'

const setPhase = (phase: TimerPhase) =>
  useTimerStore.setState({ timer: { ...initialTimer, phase } })

describe('input locks and the timer', () => {
  afterEach(() => {
    setPhase('hidden')
    usePlayStore.setState({ mode: 'idle' })
  })

  it('nothing is locked with the timer hidden', () => {
    expect(inputLocked()).toBe(false)
    expect(pointerLocked()).toBe(false)
    expect(turnsLocked()).toBe(false)
  })

  it.each<TimerPhase>(['pressing', 'hold', 'ready'])(
    'while the timer is held (%s), keys, Undo and every drag wait',
    (phase) => {
      setPhase(phase)
      expect(inputLocked()).toBe(true)
      expect(pointerLocked()).toBe(true)
    },
  )

  it('while the timer runs, keys, Undo and drags (mouse and touch) work: you solve the cube', () => {
    setPhase('running')
    expect(inputLocked()).toBe(false)
    expect(pointerLocked()).toBe(false)
    expect(turnsLocked()).toBe(false)
    // Scramble, Solve and the menu still wait while it runs.
    expect(isActive(useTimerStore.getState().timer)).toBe(true)
  })

  it.each<TimerPhase>(['idle', 'stopped'])(
    'with the digits shown (%s), touch on the cube turns the cube: no timer pad there',
    (phase) => {
      setPhase(phase)
      expect(inputLocked()).toBe(false)
      expect(pointerLocked()).toBe(false)
      expect(isActive(useTimerStore.getState().timer)).toBe(false)
    },
  )

  it('Scramble or Solve playing locks keys, Undo and layer turns, but not view drags', () => {
    for (const mode of ['scrambling', 'solving'] as const) {
      usePlayStore.setState({ mode })
      expect(inputLocked()).toBe(true)
      expect(turnsLocked()).toBe(true)
      expect(pointerLocked()).toBe(false)
    }
  })
})
