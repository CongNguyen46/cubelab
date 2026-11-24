// Types for the vendored cubejs 1.3.2 (see README.md). Only what CubeLab uses.
declare class Cube {
  constructor()
  /** Build a cube from a 54-character URFDLB facelet string. */
  static fromString(facelets: string): Cube
  /** A uniformly random solvable cube. */
  static random(): Cube
  /** Two-phase setup: move and pruning tables, about a second. Call once. */
  static initSolver(): void
  /** Inverse of a space-separated move sequence. */
  static inverse(alg: string): string
  /** A random-state scramble (solve a random cube and invert). Needs initSolver. */
  static scramble(): string
  move(alg: string): this
  isSolved(): boolean
  asString(): string
  clone(): Cube
  /** Two-phase solution, face moves only, at most maxDepth (default 22). Needs initSolver. */
  solve(maxDepth?: number): string
}
export default Cube
