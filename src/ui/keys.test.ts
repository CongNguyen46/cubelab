import { describe, expect, it } from 'vitest'
import { createCube, formatAlg } from '../engine/index.ts'
import { createCubeStore } from './cubeStore.ts'
import { keyToAction, type KeyInput } from './keys.ts'

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
    s().reset()
    expect(s().history).toEqual([])
    expect(s().solved).toBe(true)
    expect(s().canUndo).toBe(false)
  })
})
