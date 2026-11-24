import { describe, expect, it } from 'vitest'
import {
  IDENTITY,
  cross,
  fromColumns,
  matEquals,
  mulMat,
  mulVec,
  rotation,
  transpose,
  type Axis,
  type Vec3,
} from './math.ts'
import { cubieId, solvedState } from './state.ts'

describe('rotation maths', () => {
  it('a positive quarter turn follows the right-hand rule', () => {
    expect(mulVec(rotation('x', 1), [0, 1, 0])).toEqual([0, 0, 1])
    expect(mulVec(rotation('y', 1), [0, 0, 1])).toEqual([1, 0, 0])
    expect(mulVec(rotation('z', 1), [1, 0, 0])).toEqual([0, 1, 0])
  })

  it.each<Axis>(['x', 'y', 'z'])('four quarter turns about %s are the identity', (axis) => {
    expect(rotation(axis, 4)).toEqual(IDENTITY)
    expect(rotation(axis, -1)).toEqual(rotation(axis, 3))
    expect(mulMat(rotation(axis, 1), transpose(rotation(axis, 1)))).toEqual(IDENTITY)
  })

  it('builds a matrix from columns and takes cross products', () => {
    const x: Vec3 = [1, 0, 0]
    const y: Vec3 = [0, 1, 0]
    expect(cross(x, y)).toEqual([0, 0, 1])
    expect(fromColumns(x, y, cross(x, y))).toEqual(IDENTITY)
    expect(matEquals(IDENTITY, rotation('x', 1))).toBe(false)
  })
})

describe('solved state', () => {
  it('has 26 cubies at home with no rotation and unique ids', () => {
    const s = solvedState()
    expect(s).toHaveLength(26)
    expect(new Set(s.map((c) => c.id)).size).toBe(26)
    for (const c of s) {
      expect(c.pos).toEqual(c.home)
      expect(c.rot).toEqual(IDENTITY)
      expect(c.id).toBe(cubieId(c.home))
    }
  })

  it('is ordered by id and has no core piece', () => {
    const ids = solvedState().map((c) => c.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
    expect(ids).not.toContain(cubieId([0, 0, 0]))
  })
})
