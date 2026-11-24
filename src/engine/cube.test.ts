import { describe, expect, it, vi } from 'vitest'
import { createCube, type CubeEvent } from './cube.ts'
import { isSolved } from './facelets.ts'
import { applyAlg } from './moves.ts'
import { formatAlg, parseAlg } from './notation.ts'
import { solvedState } from './state.ts'

describe('createCube', () => {
  it('starts solved with empty history', () => {
    const cube = createCube()
    expect(cube.state).toEqual(solvedState())
    expect(cube.history).toEqual([])
    expect(cube.canUndo).toBe(false)
    expect(cube.canRedo).toBe(false)
  })

  it('applies moves and records them', () => {
    const cube = createCube()
    cube.apply(parseAlg("R U R'"))
    expect(formatAlg(cube.history)).toBe("R U R'")
    expect(cube.state).toEqual(applyAlg(solvedState(), parseAlg("R U R'")))
    expect(cube.canUndo).toBe(true)
  })

  it('undo and redo walk the history one move at a time', () => {
    const cube = createCube()
    cube.apply(parseAlg('R U'))
    cube.undo()
    expect(formatAlg(cube.history)).toBe('R')
    expect(cube.canRedo).toBe(true)
    cube.undo()
    expect(isSolved(cube.state)).toBe(true)
    expect(cube.canUndo).toBe(false)
    cube.redo()
    cube.redo()
    expect(formatAlg(cube.history)).toBe('R U')
    expect(cube.state).toEqual(applyAlg(solvedState(), parseAlg('R U')))
    expect(cube.canRedo).toBe(false)
  })

  it('a new move clears the redo stack', () => {
    const cube = createCube()
    cube.apply(parseAlg('R U'))
    cube.undo()
    cube.apply(parseAlg('F'))
    expect(cube.canRedo).toBe(false)
    expect(formatAlg(cube.history)).toBe('R F')
  })

  it('undo, redo and empty apply do nothing when there is nothing to do', () => {
    const cube = createCube()
    const listener = vi.fn()
    cube.subscribe(listener)
    cube.undo()
    cube.redo()
    cube.apply([])
    expect(listener).not.toHaveBeenCalled()
  })

  it('reset returns to solved and clears history', () => {
    const cube = createCube()
    cube.apply(parseAlg('R U F'))
    cube.undo()
    cube.reset()
    expect(cube.state).toEqual(solvedState())
    expect(cube.canUndo).toBe(false)
    expect(cube.canRedo).toBe(false)
  })

  it('reports each step with the state after it', () => {
    const cube = createCube()
    const events: CubeEvent[] = []
    const stop = cube.subscribe((e) => events.push(e))
    cube.apply(parseAlg('R U'))
    cube.undo()
    cube.reset()
    stop()
    cube.apply(parseAlg('F'))

    expect(events.map((e) => e.type)).toEqual(['moves', 'moves', 'reset'])
    const first = events[0]
    if (first?.type !== 'moves') throw new Error('expected moves')
    expect(formatAlg(first.steps.map((s) => s.move))).toBe('R U')
    expect(first.steps[0]!.state).toEqual(applyAlg(solvedState(), parseAlg('R')))
    expect(first.steps[1]!.state).toEqual(applyAlg(solvedState(), parseAlg('R U')))
    const undo = events[1]
    if (undo?.type !== 'moves') throw new Error('expected moves')
    expect(formatAlg(undo.steps.map((s) => s.move))).toBe("U'")
  })
})

describe('labels and animated moves', () => {
  it('records a label per move, defaulting to engine notation', () => {
    const cube = createCube()
    cube.apply(parseAlg('R U'))
    cube.apply(parseAlg('B'), { labels: ['R'] })
    expect(formatAlg(cube.history)).toBe('R U B')
    expect(cube.labels).toEqual(['R', 'U', 'R'])
  })

  it('undo and redo keep labels with their moves', () => {
    const cube = createCube()
    cube.apply(parseAlg("F M'"), { labels: ['R', "S'"] })
    cube.undo()
    expect(cube.labels).toEqual(['R'])
    cube.redo()
    expect(cube.labels).toEqual(['R', "S'"])
    expect(formatAlg(cube.history)).toBe("F M'")
  })

  it('rejects a label list of the wrong length', () => {
    expect(() => createCube().apply(parseAlg('R U'), { labels: ['R'] })).toThrow(
      'Got 1 labels for 2 moves',
    )
  })

  it('marks events as animated only when asked', () => {
    const cube = createCube()
    const flags: boolean[] = []
    cube.subscribe((e) => e.type === 'moves' && flags.push(e.animated))
    cube.apply(parseAlg('R'))
    cube.apply(parseAlg('U'), { animated: true })
    cube.undo()
    cube.redo()
    expect(flags).toEqual([false, true, false, false])
  })
})

describe('tempo', () => {
  it('passes a set pace through to listeners, and only when asked', () => {
    const cube = createCube()
    const tempos: (number | undefined)[] = []
    cube.subscribe((e) => e.type === 'moves' && tempos.push(e.tempo))
    cube.apply(parseAlg('R U'), { tempo: 120 })
    cube.apply(parseAlg('F'))
    cube.undo()
    expect(tempos).toEqual([120, undefined, undefined])
  })
})
