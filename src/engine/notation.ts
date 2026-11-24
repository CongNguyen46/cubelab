import type { Move, MoveBase } from './moves.ts'

export class ParseError extends Error {
  /** Index in the input where the problem starts. */
  readonly index: number

  constructor(message: string, index: number) {
    super(message)
    this.name = 'ParseError'
    this.index = index
  }
}

const BASE: Readonly<Record<string, MoveBase>> = {
  R: 'R',
  L: 'L',
  U: 'U',
  D: 'D',
  F: 'F',
  B: 'B',
  M: 'M',
  E: 'E',
  S: 'S',
  x: 'x',
  y: 'y',
  z: 'z',
  X: 'x',
  Y: 'y',
  Z: 'z',
}

// A base letter, an optional count, and an optional prime (straight or curly quote).
const TOKEN = /([RLUDFBMESxyzXYZ])(\d*)(['’]?)/y
const SPACE = /\s+/y

function toTurns(count: number, prime: boolean): Move['turns'] {
  const n = (((prime ? -count : count) % 4) + 4) % 4
  return n as Move['turns']
}

/**
 * Parse a sequence such as "R U R' U' M2 x". Spaces are optional ("RUR'U'" works),
 * x/y/z may be upper or lower case, R3 means R', and R2' means R2.
 * Moves that cancel to nothing, like R4, are dropped.
 */
export function parseAlg(input: string): Move[] {
  const moves: Move[] = []
  let i = 0
  while (i < input.length) {
    SPACE.lastIndex = i
    if (SPACE.exec(input)) {
      i = SPACE.lastIndex
      continue
    }
    TOKEN.lastIndex = i
    const m = TOKEN.exec(input)
    if (!m) throw new ParseError(`Unknown move "${input[i]}" at position ${i + 1}`, i)
    const count = m[2] === '' ? 1 : Number(m[2])
    const turns = toTurns(count, m[3] !== '')
    if (turns !== (0 as number)) moves.push({ base: BASE[m[1]!]!, turns })
    i = TOKEN.lastIndex
  }
  return moves
}

/** Parse exactly one move, for example "R'" or "M2". */
export function parseMove(input: string): Move {
  const moves = parseAlg(input)
  if (moves.length !== 1) throw new ParseError(`Expected one move, got "${input}"`, 0)
  return moves[0]!
}

export function formatMove(move: Move): string {
  return move.base + (move.turns === 2 ? '2' : move.turns === 3 ? "'" : '')
}

export function formatAlg(moves: readonly Move[]): string {
  return moves.map(formatMove).join(' ')
}

export function invertMove(move: Move): Move {
  return { base: move.base, turns: (4 - move.turns) as Move['turns'] }
}

/** The sequence that undoes `moves`: each move inverted, in reverse order. */
export function invertAlg(moves: readonly Move[]): Move[] {
  return moves.toReversed().map(invertMove)
}
