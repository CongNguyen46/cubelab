// Integer vector and rotation maths for a 3x3x3 cube. Every value is -1, 0 or 1,
// so equality checks are exact and nothing drifts.

export type Axis = 'x' | 'y' | 'z'

/** A position or direction, each component in {-1, 0, 1}. */
export type Vec3 = readonly [number, number, number]

/** A 3x3 rotation matrix in row-major order. Always one of the 24 cube rotations. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number]

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

export const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 }

// Positive quarter turn about each axis, right-hand rule (counter-clockwise seen from +axis).
const QUARTER: Record<Axis, Mat3> = {
  x: [1, 0, 0, 0, 0, -1, 0, 1, 0],
  y: [0, 0, 1, 0, 1, 0, -1, 0, 0],
  z: [0, -1, 0, 1, 0, 0, 0, 0, 1],
}

export function mulMat(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push(a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!)
    }
  }
  return out as unknown as Mat3
}

export function mulVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

/** The inverse of a rotation matrix is its transpose. */
export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/** Rotation by `quarterTurns` x 90 degrees about `axis` (any integer, positive is counter-clockwise). */
export function rotation(axis: Axis, quarterTurns: number): Mat3 {
  const n = ((quarterTurns % 4) + 4) % 4
  let m = IDENTITY
  for (let i = 0; i < n; i++) m = mulMat(QUARTER[axis], m)
  return m
}

/** Matrix whose columns are a, b, c. */
export function fromColumns(a: Vec3, b: Vec3, c: Vec3): Mat3 {
  return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function vecEquals(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function matEquals(a: Mat3, b: Mat3): boolean {
  return a.every((v, i) => v === b[i])
}
