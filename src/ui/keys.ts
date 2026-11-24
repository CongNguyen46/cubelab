import {
  formatMove,
  remapMove,
  transpose,
  type Mat3,
  type Move,
  type MoveBase,
} from '../engine/index.ts'

const KEY_TO_BASE: Readonly<Record<string, MoveBase>> = {
  KeyR: 'R',
  KeyL: 'L',
  KeyU: 'U',
  KeyD: 'D',
  KeyF: 'F',
  KeyB: 'B',
  KeyM: 'M',
  KeyE: 'E',
  KeyS: 'S',
  KeyX: 'x',
  KeyY: 'y',
  KeyZ: 'z',
}

export type KeyInput = Pick<
  KeyboardEvent,
  'code' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'
>

export type KeyAction = { type: 'move'; move: Move } | { type: 'undo' } | { type: 'redo' } | null

/**
 * Keyboard map (FR-1.3). Letters turn the matching layer, Shift makes it prime.
 * X, Y and Z rotate the whole cube. Ctrl or Cmd + Z undoes, with Shift (or Ctrl + Y) it redoes.
 * Uses `code`, not `key`, so it works the same on any keyboard layout and with Shift held.
 */
export function keyToAction(e: KeyInput): KeyAction {
  if (e.altKey) return null
  if (e.ctrlKey || e.metaKey) {
    if (e.code === 'KeyZ') return { type: e.shiftKey ? 'redo' : 'undo' }
    if (e.code === 'KeyY') return { type: 'redo' }
    return null
  }
  if (e.repeat) return null
  const base = KEY_TO_BASE[e.code]
  if (!base) return null
  return { type: 'move', move: { base, turns: e.shiftKey ? 3 : 1 } }
}

/**
 * Turn a key move into the engine move and the label the user should see. Keys name faces in
 * the viewer's frame (R is the face on your right), so the move is mapped through the view
 * orientation. The engine records its own frame; the label keeps what the user pressed.
 */
export function keyMoveToEngine(move: Move, view: Mat3): { move: Move; label: string } {
  return { move: remapMove(move, transpose(view)), label: formatMove(move) }
}
