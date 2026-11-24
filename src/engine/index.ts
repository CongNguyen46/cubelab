// Cube engine: pure TypeScript cube state, moves and notation parser.
// No React and no three.js imports here, so it stays easy to test.

/** Face order used across the app: +x R, -x L, +y U, -y D, +z F, -z B. */
export const FACES = ['R', 'L', 'U', 'D', 'F', 'B'] as const
export type Face = (typeof FACES)[number]

export type { Axis, Mat3, Vec3 } from './math.ts'
export { solvedState, cubieId, type Cubie, type CubeState } from './state.ts'
export {
  applyAlg,
  applyMove,
  moveGeometry,
  MOVE_BASES,
  MOVE_DEFS,
  type Layer,
  type Move,
  type MoveBase,
  type MoveGeometry,
} from './moves.ts'
export {
  formatAlg,
  formatMove,
  invertAlg,
  invertMove,
  ParseError,
  parseAlg,
  parseMove,
} from './notation.ts'
export {
  FACELET_ORDER,
  isSolved,
  normalizeOrientation,
  spatialFacelets,
  toFacelets,
} from './facelets.ts'
export {
  createCube,
  type ApplyOptions,
  type Cube,
  type CubeEvent,
  type Listener,
  type Step,
} from './cube.ts'
export { isCubeRotation, remapAlg, remapMove } from './remap.ts'
export { IDENTITY, matEquals, mulMat, rotation, transpose } from './math.ts'
