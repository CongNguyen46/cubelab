import { describe, expect, it } from 'vitest'
import { createCube, parseAlg } from '../engine/index.ts'
import type { TimerResult } from '../timer/index.ts'
import { createTimerStore } from '../timer/store.ts'
import { watchAutoStop } from './autoStop.ts'

function setup(start = "R U R' U'") {
  let clock = 0
  const cube = createCube()
  if (start) cube.apply(parseAlg(start))
  const timer = createTimerStore(() => clock)
  const results: TimerResult[] = []
  timer.getState().onResult((r) => results.push(r))
  const stop = watchAutoStop({ cube, timer })
  const phase = () => timer.getState().timer.phase
  const button = () => timer.getState().send({ type: 'button' })
  return { cube, timer, results, stop, phase, button, tick: (ms: number) => (clock += ms) }
}

describe('auto-stop when the cube is solved', () => {
  it('stops the timer the moment the last move reaches the engine, and records that time', () => {
    const { cube, results, phase, button, tick } = setup()
    button() // start at 0
    tick(4_000)
    cube.apply(parseAlg('U R'))
    expect(phase()).toBe('running') // not solved yet
    tick(2_340)
    cube.apply(parseAlg("U' R'")) // solved: applied to the engine now, animation still to come
    expect(phase()).toBe('stopped')
    expect(results).toEqual([{ ms: 6_340 }])
  })

  it('also stops when Undo solves it', () => {
    const { cube, results, phase, button, tick } = setup('R')
    button()
    tick(1_000)
    cube.undo()
    expect(phase()).toBe('stopped')
    expect(results).toHaveLength(1)
  })

  it('does not stop a timer started on a solved cube', () => {
    const { cube, results, phase, button, tick } = setup('')
    button()
    tick(1_000)
    cube.apply(parseAlg("R R'"))
    expect(phase()).toBe('running')
    expect(results).toEqual([])
  })

  it('after Esc discards the run, solving records nothing', () => {
    const { cube, timer, results, phase, button } = setup()
    button()
    timer.getState().send({ type: 'escape' })
    cube.apply(parseAlg("U R U' R'"))
    expect(phase()).toBe('hidden')
    expect(results).toEqual([])
  })

  it('does nothing when the timer is not running', () => {
    const { cube, results, phase } = setup()
    cube.apply(parseAlg("U R U' R'"))
    expect(phase()).toBe('hidden')
    expect(results).toEqual([])
  })

  it('only once per run: a stopped timer ignores later solves', () => {
    const { cube, results, button } = setup()
    button()
    cube.apply(parseAlg("U R U' R'"))
    cube.apply(parseAlg("R R'"))
    expect(results).toHaveLength(1)
  })

  it('stops listening when stopped', () => {
    const { cube, results, phase, button, stop } = setup()
    stop()
    button()
    cube.apply(parseAlg("U R U' R'"))
    expect(phase()).toBe('running')
    expect(results).toEqual([])
  })
})
