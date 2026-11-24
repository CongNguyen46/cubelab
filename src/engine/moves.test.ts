import { describe, expect, it } from 'vitest'
import { applyAlg, applyMove, MOVE_BASES, MOVE_DEFS, moveGeometry, type Move } from './moves.ts'
import { solvedState } from './state.ts'

const m = (base: Move['base'], turns: Move['turns'] = 1): Move => ({ base, turns })

describe('moves', () => {
  it.each(MOVE_BASES)('%s applied 4 times returns the exact starting state', (base) => {
    const s = applyAlg(solvedState(), [m(base), m(base), m(base), m(base)])
    expect(s).toEqual(solvedState())
  })

  it.each(MOVE_BASES)('%s then its inverse is the identity', (base) => {
    expect(applyAlg(solvedState(), [m(base, 1), m(base, 3)])).toEqual(solvedState())
    expect(applyAlg(solvedState(), [m(base, 2), m(base, 2)])).toEqual(solvedState())
  })

  it.each(MOVE_BASES)('%s2 equals %s twice', (base) => {
    expect(applyMove(solvedState(), m(base, 2))).toEqual(applyAlg(solvedState(), [m(base), m(base)]))
  })

  it('R moves the UFR corner to UBR', () => {
    const ufr = solvedState().find((c) => c.home.join() === '1,1,1')!
    const after = applyMove(solvedState(), m('R')).find((c) => c.id === ufr.id)!
    expect(after.pos).toEqual([1, 1, -1])
  })

  it('a face move only touches its 9 cubies', () => {
    const before = solvedState()
    const after = applyMove(before, m('U'))
    const moved = after.filter((c, i) => c !== before[i])
    expect(moved).toHaveLength(9)
    expect(moved.every((c) => c.home[1] === 1)).toBe(true)
  })

  it('a slice move touches 8 cubies and a rotation touches all 26', () => {
    const before = solvedState()
    expect(applyMove(before, m('E')).filter((c, i) => c !== before[i])).toHaveLength(8)
    expect(applyMove(before, m('y')).filter((c, i) => c !== before[i])).toHaveLength(26)
  })

  it('primes and doubles animate the short way', () => {
    expect(moveGeometry(m('R', 1)).quarterTurns).toBe(-1)
    expect(moveGeometry(m('R', 3)).quarterTurns).toBe(1)
    expect(moveGeometry(m('R', 2)).quarterTurns).toBe(-2)
    expect(moveGeometry(m('L', 3)).quarterTurns).toBe(-1)
  })
})

describe('slices and rotations follow the prototype', () => {
  it('M follows L, E follows D, S follows F', () => {
    for (const [slice, face] of [
      ['M', 'L'],
      ['E', 'D'],
      ['S', 'F'],
    ] as const) {
      expect(MOVE_DEFS[slice].axis).toBe(MOVE_DEFS[face].axis)
      expect(MOVE_DEFS[slice].dir).toBe(MOVE_DEFS[face].dir)
      expect(MOVE_DEFS[slice].layers).toEqual([0])
    }
  })

  it('x = R M\' L\'', () => {
    expect(applyMove(solvedState(), m('x'))).toEqual(
      applyAlg(solvedState(), [m('R'), m('M', 3), m('L', 3)]),
    )
  })

  it("y = U E' D'", () => {
    expect(applyMove(solvedState(), m('y'))).toEqual(
      applyAlg(solvedState(), [m('U'), m('E', 3), m('D', 3)]),
    )
  })

  it("z = F S B'", () => {
    expect(applyMove(solvedState(), m('z'))).toEqual(
      applyAlg(solvedState(), [m('F'), m('S'), m('B', 3)]),
    )
  })
})
