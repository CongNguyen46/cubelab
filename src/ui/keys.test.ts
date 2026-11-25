import { describe, expect, it } from 'vitest'
import { createCube, formatAlg, formatMove, IDENTITY, rotation } from '../engine/index.ts'
import { createCubeStore } from './cubeStore.ts'
import { keyMoveToEngine, keyToAction, type KeyInput } from './keys.ts'

const key = (code: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  code,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  ...mods,
})

describe('keyToAction', () => {
  it('maps letters to moves and Shift to prime', () => {
    expect(keyToAction(key('KeyR'))).toEqual({ type: 'move', move: { base: 'R', turns: 1 } })
    expect(keyToAction(key('KeyU', { shiftKey: true }))).toEqual({
      type: 'move',
      move: { base: 'U', turns: 3 },
    })
    expect(keyToAction(key('KeyM'))).toEqual({ type: 'move', move: { base: 'M', turns: 1 } })
  })

  it('maps X, Y, Z to whole-cube rotations', () => {
    for (const [code, base] of [
      ['KeyX', 'x'],
      ['KeyY', 'y'],
      ['KeyZ', 'z'],
    ]) {
      expect(keyToAction(key(code!))).toEqual({ type: 'move', move: { base, turns: 1 } })
    }
  })

  it('maps Ctrl/Cmd+Z to undo and Ctrl+Shift+Z or Ctrl+Y to redo', () => {
    expect(keyToAction(key('KeyZ', { ctrlKey: true }))).toEqual({ type: 'undo' })
    expect(keyToAction(key('KeyZ', { metaKey: true }))).toEqual({ type: 'undo' })
    expect(keyToAction(key('KeyZ', { ctrlKey: true, shiftKey: true }))).toEqual({ type: 'redo' })
    expect(keyToAction(key('KeyY', { ctrlKey: true }))).toEqual({ type: 'redo' })
  })

  it('ignores other keys, other shortcuts, Alt and key repeat', () => {
    expect(keyToAction(key('KeyQ'))).toBeNull()
    expect(keyToAction(key('Space'))).toBeNull()
    expect(keyToAction(key('KeyR', { ctrlKey: true }))).toBeNull()
    expect(keyToAction(key('KeyR', { altKey: true }))).toBeNull()
    expect(keyToAction(key('KeyR', { repeat: true }))).toBeNull()
  })
})

describe('cube store', () => {
  it('mirrors engine history, undo, redo and solved state', () => {
    const useStore = createCubeStore(createCube())
    const s = () => useStore.getState()
    expect(s().solved).toBe(true)
    s().apply([
      { base: 'R', turns: 1 },
      { base: 'U', turns: 3 },
    ])
    expect(s().history).toEqual(['R', "U'"])
    expect(s().solved).toBe(false)
    s().undo()
    expect(s().history).toEqual(['R'])
    expect(s().canRedo).toBe(true)
    s().redo()
    expect(formatAlg(s().cube.history)).toBe("R U'")
    s().cube.reset() // engine reset, kept for internal use; the store follows its event
    expect(s().history).toEqual([])
    expect(s().solved).toBe(true)
    expect(s().canUndo).toBe(false)
  })
})

describe('keyMoveToEngine', () => {
  it('in the starting view, keys are engine moves', () => {
    const r = keyMoveToEngine({ base: 'R', turns: 3 }, IDENTITY)
    expect(formatMove(r.move)).toBe("R'")
    expect(r.label).toBe("R'")
  })

  it('after the view turned like y, R turns the engine face now on the right and keeps its label', () => {
    // A y-like view turn sends F to the left and brings B round to the right.
    const view = rotation('y', -1)
    const r = keyMoveToEngine({ base: 'R', turns: 1 }, view)
    expect(formatMove(r.move)).toBe('B')
    expect(r.label).toBe('R')
    expect(formatMove(keyMoveToEngine({ base: 'F', turns: 1 }, view).move)).toBe('R')
    // M turns like the viewer's left face, which is now engine F: S.
    expect(formatMove(keyMoveToEngine({ base: 'M', turns: 1 }, view).move)).toBe('S')
  })

  it('after the view turned upside down (like x2), U turns the engine D face', () => {
    const r = keyMoveToEngine({ base: 'U', turns: 1 }, rotation('x', 2))
    expect(formatMove(r.move)).toBe('D')
    expect(r.label).toBe('U')
  })

  it('history shows labels while the engine keeps its own frame', () => {
    const useStore = createCubeStore(createCube())
    const { move, label } = keyMoveToEngine({ base: 'R', turns: 1 }, rotation('y', -1))
    useStore.getState().apply([move], { labels: [label] })
    expect(useStore.getState().history).toEqual(['R'])
    expect(formatAlg(useStore.getState().cube.history)).toBe('B')
    useStore.getState().undo()
    expect(useStore.getState().solved).toBe(true)
  })
})
