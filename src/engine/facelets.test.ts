import { describe, expect, it } from 'vitest'
import { isSolved, normalizeOrientation, spatialFacelets, toFacelets } from './facelets.ts'
import { rotation } from './math.ts'
import { applyAlg } from './moves.ts'
import { parseAlg } from './notation.ts'
import { cubieId, solvedState, type CubeState } from './state.ts'

const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const run = (alg: string, from: CubeState = solvedState()) => applyAlg(from, parseAlg(alg))

describe('facelets', () => {
  it('solved cube gives the solved URFDLB string', () => {
    expect(toFacelets(solvedState())).toBe(SOLVED)
  })

  it('matches the known cubejs string after each face move', () => {
    expect(toFacelets(run('R'))).toBe('UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB')
    expect(toFacelets(run('U'))).toBe('UUUUUUUUUBBBRRRRRRRRRFFFFFFDDDDDDDDDFFFLLLLLLLLLBBBBBB')
    expect(toFacelets(run('F'))).toBe('UUUUUULLLURRURRURRFFFFFFFFFRRRDDDDDDLLDLLDLLDBBBBBBBBB')
  })

  it('normalises whole-cube rotations away', () => {
    for (const r of ['x', 'y', 'z', "x y'", 'z2 x']) {
      expect(toFacelets(run(r))).toBe(SOLVED)
      expect(spatialFacelets(run(r))).not.toBe(SOLVED)
    }
    // After x the old front face is on top, so U turns it: same as F on an unrotated cube.
    expect(toFacelets(run('x U'))).toBe(toFacelets(run('F')))
    expect(toFacelets(run('x R'))).toBe(toFacelets(run('R')))
  })

  it('normalises slice moves so centres are in their home places', () => {
    const s = toFacelets(run('M'))
    expect([4, 13, 22, 31, 40, 49].map((i) => s[i]).join('')).toBe('URFDLB')
    // M is L' R x' up to orientation.
    expect(s).toBe(toFacelets(run("L' R")))
  })

  it('M moves the front middle column down, like L', () => {
    const s = spatialFacelets(run('M'))
    expect([1, 4, 7].map((i) => s[i]).join('')).toBe('BBB')
  })

  it('superflip flips every edge in place', () => {
    const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2"
    expect(toFacelets(run(superflip))).toBe(
      'UBULURUFURURFRBRDRFUFLFRFDFDFDLDRDBDLULBLFLDLBUBRBLBDB',
    )
    const once = run(superflip)
    for (const c of once) expect(c.pos).toEqual(c.home)
    expect(isSolved(once)).toBe(false)
    expect(isSolved(run(superflip, once))).toBe(true)
  })
})

describe('isSolved', () => {
  it('is true for solved and rotated cubes', () => {
    expect(isSolved(solvedState())).toBe(true)
    expect(isSolved(run("x y2 z'"))).toBe(true)
  })

  it('is false after any single face or slice move', () => {
    for (const m of ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S', "R'", 'U2']) {
      expect(isSolved(run(m))).toBe(false)
    }
  })

  it('is true when a slice sequence leaves the cube visually solved but turned', () => {
    expect(isSolved(run("M' R L' "))).toBe(true)
    expect(isSolved(run("E' U D'"))).toBe(true)
  })

  it('is true when a centre has been spun in place', () => {
    const uCentre = cubieId([0, 1, 0])
    const spun = solvedState().map((c) => (c.id === uCentre ? { ...c, rot: rotation('y', 1) } : c))
    expect(isSolved(spun)).toBe(true)
    expect(toFacelets(spun)).toBe(SOLVED)
  })

  it('sexy move x6 returns to solved, x1 to x5 do not', () => {
    let s = solvedState()
    for (let i = 1; i <= 6; i++) {
      s = run("R U R' U'", s)
      expect(isSolved(s)).toBe(i === 6)
    }
    expect(s).toEqual(solvedState())
  })

  it('T-perm swaps two edges and two corners, and twice is solved', () => {
    const tperm = "R U R' U' R' F R2 U' R' U' R U R' F'"
    const once = run(tperm)
    expect(isSolved(once)).toBe(false)
    const moved = once.filter((c) => c.pos.join() !== c.home.join()).map((c) => c.home.join())
    // UR and UL edges, UFR and UBR corners.
    expect(moved.sort()).toEqual(['-1,1,0', '1,1,-1', '1,1,0', '1,1,1'])
    // First two layers untouched.
    const f = spatialFacelets(once)
    expect(f.slice(27, 36)).toBe('DDDDDDDDD')
    for (const face of [1, 2, 4, 5])
      expect(f.slice(face * 9 + 3, face * 9 + 9)).toMatch(/^(.)\1{5}$/)
    expect(isSolved(run(tperm, once))).toBe(true)
  })
})

describe('normalizeOrientation', () => {
  it('puts the U and F centres back home', () => {
    const s = normalizeOrientation(run("x y' R M"))
    expect(s.find((c) => c.id === cubieId([0, 1, 0]))!.pos).toEqual([0, 1, 0])
    expect(s.find((c) => c.id === cubieId([0, 0, 1]))!.pos).toEqual([0, 0, 1])
  })
})
