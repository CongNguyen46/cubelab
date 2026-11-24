import { mulVec, vecEquals, type Mat3, type Vec3 } from './math.ts'
import type { Move, MoveBase } from './moves.ts'

type Face = 'R' | 'L' | 'U' | 'D' | 'F' | 'B'

const NORMAL: Readonly<Record<Face, Vec3>> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}
const FACES = Object.keys(NORMAL) as Face[]

// Slices and rotations are named after the face they turn with (M like L, x like R, ...).
// Each entry: the face it tracks, and the base/inverted pair to use for each face it can map to.
const TRACKS: Readonly<Record<Exclude<MoveBase, Face>, Face>> = {
  M: 'L',
  E: 'D',
  S: 'F',
  x: 'R',
  y: 'U',
  z: 'F',
}

const SLICE_FOR: Readonly<Record<Face, { base: MoveBase; invert: boolean }>> = {
  L: { base: 'M', invert: false },
  R: { base: 'M', invert: true },
  D: { base: 'E', invert: false },
  U: { base: 'E', invert: true },
  F: { base: 'S', invert: false },
  B: { base: 'S', invert: true },
}

const ROTATION_FOR: Readonly<Record<Face, { base: MoveBase; invert: boolean }>> = {
  R: { base: 'x', invert: false },
  L: { base: 'x', invert: true },
  U: { base: 'y', invert: false },
  D: { base: 'y', invert: true },
  F: { base: 'z', invert: false },
  B: { base: 'z', invert: true },
}

function mapFace(face: Face, m: Mat3): Face {
  const n = mulVec(m, NORMAL[face])
  return FACES.find((f) => vecEquals(NORMAL[f], n))!
}

const isFace = (b: MoveBase): b is Face => b in NORMAL

/**
 * Re-express a move from one frame in another. `m` maps directions in the move's frame to
 * directions in the target frame (one of the 24 cube rotations). The physical turn is the same;
 * only its name changes. For example, with m a quarter turn about y, R becomes F or B.
 *
 * Keyboard: the key names a face in the viewer's frame; m = transpose(view) gives the engine move.
 * Labels: m = view turns an engine move back into what the viewer saw.
 * Solver: m = orientation of the centres turns a normalised-frame solution into the current frame.
 */
export function remapMove(move: Move, m: Mat3): Move {
  if (isFace(move.base)) return { base: mapFace(move.base, m), turns: move.turns }
  const target = mapFace(TRACKS[move.base], m)
  const pick =
    move.base === 'x' || move.base === 'y' || move.base === 'z' ? ROTATION_FOR : SLICE_FOR
  const { base, invert } = pick[target]
  return { base, turns: invert ? ((4 - move.turns) as Move['turns']) : move.turns }
}

export function remapAlg(moves: readonly Move[], m: Mat3): Move[] {
  return moves.map((mv) => remapMove(mv, m))
}

/** True when m is one of the 24 rotations of the cube (integer entries, det +1). */
export function isCubeRotation(m: Mat3): boolean {
  if (!m.every((v) => v === -1 || v === 0 || v === 1)) return false
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  const rows = [m.slice(0, 3), m.slice(3, 6), m.slice(6, 9)]
  return det === 1 && rows.every((r) => r.filter((v) => v !== 0).length === 1)
}
