import { AXIS_INDEX, mulMat, mulVec, rotation, type Axis } from './math.ts'
import type { CubeState } from './state.ts'

export type MoveBase = 'R' | 'L' | 'U' | 'D' | 'F' | 'B' | 'M' | 'E' | 'S' | 'x' | 'y' | 'z'

/** One move. `turns` counts clockwise quarter turns: 1 is R, 2 is R2, 3 is R'. */
export type Move = { readonly base: MoveBase; readonly turns: 1 | 2 | 3 }

export type Layer = -1 | 0 | 1

type MoveDef = { axis: Axis; layers: readonly Layer[]; dir: 1 | -1 }

// `dir` is the sign of one clockwise turn as a rotation about the +axis (right-hand rule).
// Same table as the prototype's DEF: M turns like L, E like D, S like F; x, y, z like R, U, F.
export const MOVE_DEFS: Readonly<Record<MoveBase, MoveDef>> = {
  R: { axis: 'x', layers: [1], dir: -1 },
  L: { axis: 'x', layers: [-1], dir: 1 },
  M: { axis: 'x', layers: [0], dir: 1 },
  x: { axis: 'x', layers: [-1, 0, 1], dir: -1 },
  U: { axis: 'y', layers: [1], dir: -1 },
  D: { axis: 'y', layers: [-1], dir: 1 },
  E: { axis: 'y', layers: [0], dir: 1 },
  y: { axis: 'y', layers: [-1, 0, 1], dir: -1 },
  F: { axis: 'z', layers: [1], dir: -1 },
  B: { axis: 'z', layers: [-1], dir: 1 },
  S: { axis: 'z', layers: [0], dir: -1 },
  z: { axis: 'z', layers: [-1, 0, 1], dir: -1 },
}

export const MOVE_BASES = Object.keys(MOVE_DEFS) as MoveBase[]

export type MoveGeometry = {
  readonly axis: Axis
  readonly layers: readonly Layer[]
  /** Signed quarter turns about +axis, -2 to 2. A prime move is -1 x dir, not 3 x dir, so it animates the short way. */
  readonly quarterTurns: number
}

/** What a move does in space. The renderer uses this to pick and turn the right cubies. */
export function moveGeometry(move: Move): MoveGeometry {
  const def = MOVE_DEFS[move.base]
  const signed = move.turns === 3 ? -1 : move.turns
  return { axis: def.axis, layers: def.layers, quarterTurns: def.dir * signed }
}

export function applyMove(state: CubeState, move: Move): CubeState {
  const { axis, layers, quarterTurns } = moveGeometry(move)
  const r = rotation(axis, quarterTurns)
  const i = AXIS_INDEX[axis]
  return state.map((c) =>
    (layers as readonly number[]).includes(c.pos[i])
      ? { ...c, pos: mulVec(r, c.pos), rot: mulMat(r, c.rot) }
      : c,
  )
}

export function applyAlg(state: CubeState, moves: readonly Move[]): CubeState {
  return moves.reduce(applyMove, state)
}
