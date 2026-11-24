import { describe, expect, it } from 'vitest'
import { applyAlg } from './moves.ts'
import {
  formatAlg,
  formatMove,
  invertAlg,
  invertMove,
  ParseError,
  parseAlg,
  parseMove,
} from './notation.ts'
import { solvedState } from './state.ts'

describe('parseAlg', () => {
  it('parses face, slice and rotation moves with primes and doubles', () => {
    expect(parseAlg("R U R' U' M2 x")).toEqual([
      { base: 'R', turns: 1 },
      { base: 'U', turns: 1 },
      { base: 'R', turns: 3 },
      { base: 'U', turns: 3 },
      { base: 'M', turns: 2 },
      { base: 'x', turns: 1 },
    ])
  })

  it('accepts no spaces, extra whitespace, curly quotes and upper-case rotations', () => {
    expect(formatAlg(parseAlg("RUR'U'"))).toBe("R U R' U'")
    expect(formatAlg(parseAlg("  F\tS'\nB  "))).toBe("F S' B")
    expect(formatAlg(parseAlg('R’ X Y Z'))).toBe("R' x y z")
  })

  it("normalises counts: R3 is R', R2' is R2, R4 disappears", () => {
    expect(formatAlg(parseAlg("R3 U2' F5 D4 L"))).toBe("R' U2 F L")
  })

  it('returns an empty list for empty input', () => {
    expect(parseAlg('')).toEqual([])
    expect(parseAlg('   ')).toEqual([])
  })

  it('reports the position of an unknown move', () => {
    expect(() => parseAlg('R U Q')).toThrow(ParseError)
    try {
      parseAlg('R U Q')
    } catch (e) {
      expect((e as ParseError).index).toBe(4)
      expect((e as ParseError).message).toBe('Unknown move "Q" at position 5')
    }
  })

  it('rejects wide moves for now', () => {
    expect(() => parseAlg('r')).toThrow(ParseError)
  })
})

describe('parseMove', () => {
  it('parses exactly one move', () => {
    expect(parseMove("M'")).toEqual({ base: 'M', turns: 3 })
    expect(() => parseMove('R U')).toThrow(ParseError)
    expect(() => parseMove('')).toThrow(ParseError)
  })
})

describe('format and invert', () => {
  it('round-trips through format', () => {
    const text = "R U2 R' D' x y2 z' M E2 S'"
    expect(formatAlg(parseAlg(text))).toBe(text)
  })

  it('inverts single moves', () => {
    expect(formatMove(invertMove(parseMove('R')))).toBe("R'")
    expect(formatMove(invertMove(parseMove("R'")))).toBe('R')
    expect(formatMove(invertMove(parseMove('R2')))).toBe('R2')
  })

  it('inverts sequences in reverse order', () => {
    expect(formatAlg(invertAlg(parseAlg("R U F' M2")))).toBe("M2 F U' R'")
  })

  it('a sequence followed by its inverse is the identity', () => {
    const alg = parseAlg("R U2 F' M E' S2 x y' z2 B L' D")
    expect(applyAlg(applyAlg(solvedState(), alg), invertAlg(alg))).toEqual(solvedState())
  })
})
