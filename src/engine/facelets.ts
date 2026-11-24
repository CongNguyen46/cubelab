import {
  cross,
  fromColumns,
  mulMat,
  mulVec,
  transpose,
  vecEquals,
  type Mat3,
  type Vec3,
} from './math.ts'
import { cubieId, type CubeState } from './state.ts'

/** Facelet face letters in the order cubejs (Kociemba) expects. */
export const FACELET_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type FaceletFace = (typeof FACELET_ORDER)[number]

const NORMAL: Readonly<Record<FaceletFace, Vec3>> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
}

// For each face, the cubie position of sticker 1..9, read row by row in Kociemba's layout:
// U from back to front, D from front to back, side faces with U on top. R's left column is
// the front, L's left column is the back, and B is seen from behind (its left column is +x).
const POSITIONS: Readonly<Record<FaceletFace, (row: number, col: number) => Vec3>> = {
  U: (r, c) => [c - 1, 1, r - 1],
  R: (r, c) => [1, 1 - r, 1 - c],
  F: (r, c) => [c - 1, 1 - r, 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  L: (r, c) => [-1, 1 - r, c - 1],
  B: (r, c) => [1 - c, 1 - r, -1],
}

function faceOf(normal: Vec3): FaceletFace {
  return FACELET_ORDER.find((f) => vecEquals(NORMAL[f], normal))!
}

/**
 * The 54 stickers as they are in space right now, URFDLB, each letter naming the colour
 * by its home face (U is white, F is green, and so on). After a rotation or slice move the
 * centres are no longer in their home places, so the letters at the centres change too.
 */
export function spatialFacelets(state: CubeState): string {
  const byPos = new Map(state.map((c) => [c.pos.join(), c]))
  let out = ''
  for (const face of FACELET_ORDER) {
    const n = NORMAL[face]
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cubie = byPos.get(POSITIONS[face](r, c).join())!
        // The sticker now facing `n` started out facing rot^-1 * n.
        out += faceOf(mulVec(transpose(cubie.rot), n))
      }
    }
  }
  return out
}

/**
 * Where the centres sit now, as a rotation from the home frame: column x is where the R centre
 * is, column y the U centre, column z the F centre. The identity for a cube that has not been
 * rotated (x, y, z) or slice-turned (M, E, S).
 *
 * A solution computed in the normalised frame (white up, green front) is turned into moves for
 * the current cube with remapMove(move, centreOrientation(state)).
 */
export function centreOrientation(state: CubeState): Mat3 {
  const u = state.find((c) => c.id === cubieId(NORMAL.U))!.pos
  const f = state.find((c) => c.id === cubieId(NORMAL.F))!.pos
  return fromColumns(cross(u, f), u, f)
}

/**
 * Turn the whole cube so the U centre is back on top and the F centre is in front, without
 * changing which pieces are where relative to each other. Centres spun in place stay spun.
 */
export function normalizeOrientation(state: CubeState): CubeState {
  const back = transpose(centreOrientation(state))
  return state.map((c) => ({ ...c, pos: mulVec(back, c.pos), rot: mulMat(back, c.rot) }))
}

/**
 * The 54-facelet string cubejs needs, URFDLB. The cube is normalised first (white centre up,
 * green centre front), so whole-cube rotations and slice moves still give a valid string.
 */
export function toFacelets(state: CubeState): string {
  return spatialFacelets(normalizeOrientation(state))
}

/**
 * True when every face shows one colour. Based on stickers, not cubie orientation, so a cube
 * that has only been rotated (x, y, z) counts as solved, and so does one whose centres have
 * been spun in place, since a centre looks the same at any angle.
 */
export function isSolved(state: CubeState): boolean {
  const s = spatialFacelets(state)
  for (let f = 0; f < 6; f++) {
    const face = s.slice(f * 9, f * 9 + 9)
    if (face !== face[0]!.repeat(9)) return false
  }
  return true
}
