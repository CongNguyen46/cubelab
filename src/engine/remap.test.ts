import { describe, expect, it } from 'vitest'
import {
  AXIS_INDEX,
  IDENTITY,
  matEquals,
  mulMat,
  mulVec,
  rotation,
  transpose,
  vecEquals,
  type Mat3,
  type Vec3,
} from './math.ts'
import { applyMove, moveGeometry, MOVE_BASES, type Move } from './moves.ts'
import { formatMove, parseMove } from './notation.ts'
import { isCubeRotation, remapAlg, remapMove } from './remap.ts'
import { solvedState } from './state.ts'

/** All 24 rotations of the cube, built from quarter turns about x and y. */
function allRotations(): Mat3[] {
  const out: Mat3[] = [IDENTITY]
  for (let i = 0; i < out.length; i++) {
    for (const g of [rotation('x', 1), rotation('y', 1)]) {
      const next = mulMat(g, out[i]!)
      if (!out.some((m) => matEquals(m, next))) out.push(next)
    }
  }
  return out
}

const ROTATIONS = allRotations()
const ALL_MOVES: Move[] = MOVE_BASES.flatMap((base) =>
  ([1, 2, 3] as const).map((turns) => ({ base, turns })),
)

/** Where a move sends a cubie position, and the rotation it applies there. */
function effect(move: Move, p: Vec3): { pos: Vec3; rot: Mat3 } {
  const g = moveGeometry(move)
  if (!(g.layers as readonly number[]).includes(p[AXIS_INDEX[g.axis]])) {
    return { pos: p, rot: IDENTITY }
  }
  const r = rotation(g.axis, g.quarterTurns)
  return { pos: mulVec(r, p), rot: r }
}

describe('remapMove', () => {
  it('there are 24 cube rotations', () => {
    expect(ROTATIONS).toHaveLength(24)
    expect(ROTATIONS.every(isCubeRotation)).toBe(true)
  })

  it('the remapped move turns the mapped pieces the same way, for every rotation and move', () => {
    const positions = solvedState().map((c) => c.pos)
    for (const m of ROTATIONS) {
      for (const move of ALL_MOVES) {
        const mapped = remapMove(move, m)
        for (const p of positions) {
          const before = effect(move, p)
          const after = effect(mapped, mulVec(m, p))
          const label = `${formatMove(move)} -> ${formatMove(mapped)}`
          expect(vecEquals(after.pos, mulVec(m, before.pos)), label).toBe(true)
          // Rotation seen in the new frame: m * r * m^T.
          expect(after.rot, label).toEqual(mulMat(mulMat(m, before.rot), transpose(m)))
        }
      }
    }
  })

  it('identity leaves every move alone, and the inverse rotation undoes a remap', () => {
    for (const move of ALL_MOVES) {
      expect(remapMove(move, IDENTITY)).toEqual(move)
      for (const m of ROTATIONS) {
        expect(remapMove(remapMove(move, m), transpose(m))).toEqual(move)
      }
    }
  })

  it("named examples: a quarter turn about y sends R to B, M to S and x to z'", () => {
    const m = rotation('y', 1)
    expect(formatMove(remapMove(parseMove('R'), m))).toBe('B')
    expect(formatMove(remapMove(parseMove("M'"), m))).toBe("S'")
    expect(formatMove(remapMove(parseMove('x'), m))).toBe("z'")
    expect(formatMove(remapMove(parseMove('U2'), m))).toBe('U2')
  })

  it('pressing R after the view turned like y turns the engine face now on the right', () => {
    // The view shows the cube turned like a y rotation: F went to the left, B came round to the right.
    const view = rotation('y', -1)
    const engineMove = remapMove(parseMove('R'), transpose(view))
    expect(formatMove(engineMove)).toBe('B')
    // And the label for that engine move, seen through the view, is R again.
    expect(formatMove(remapMove(engineMove, view))).toBe('R')
  })

  it('remapAlg maps every move', () => {
    const m = rotation('x', 1)
    expect(remapAlg([parseMove('U'), parseMove('F')], m).map(formatMove)).toEqual(['F', 'D'])
  })

  it('a remapped move on a rotated cube matches the original on an unrotated cube', () => {
    // Turning the whole cube with x then doing U is the same as doing the remapped move first.
    const m = rotation('x', -1) // the engine rotation x as a matrix
    for (const move of ALL_MOVES.filter((mv) => !'xyz'.includes(mv.base))) {
      const rotatedThenMove = applyMove(applyMove(solvedState(), parseMove('x')), move)
      const remapped = remapMove(move, transpose(m))
      const moveThenRotated = applyMove(applyMove(solvedState(), remapped), parseMove('x'))
      expect(rotatedThenMove, formatMove(move)).toEqual(moveThenRotated)
    }
  })
})

describe('isCubeRotation', () => {
  it('rejects non-rotations', () => {
    expect(isCubeRotation([1, 0, 0, 0, 1, 0, 0, 0, -1])).toBe(false) // a mirror
    expect(isCubeRotation([1, 1, 0, 0, 1, 0, 0, 0, 1])).toBe(false)
    expect(isCubeRotation([2, 0, 0, 0, 1, 0, 0, 0, 1])).toBe(false)
  })
})
