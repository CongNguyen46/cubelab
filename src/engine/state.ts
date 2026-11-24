import { IDENTITY, type Mat3, type Vec3 } from './math.ts'

/**
 * One of the 26 visible pieces. `home` is where it sits on a solved cube and never changes.
 * `pos` is where it is now and `rot` is how it has been turned since it left home.
 * Coordinates: +x R, -x L, +y U, -y D, +z F, -z B.
 */
export type Cubie = {
  readonly id: number
  readonly home: Vec3
  readonly pos: Vec3
  readonly rot: Mat3
}

/** The whole cube: 26 cubies ordered by id. Never mutated; every move returns a new state. */
export type CubeState = readonly Cubie[]

/** Stable id from a home position, 0 to 26 (13, the hidden core, is never used). */
export function cubieId(home: Vec3): number {
  return (home[0] + 1) * 9 + (home[1] + 1) * 3 + (home[2] + 1)
}

const SOLVED: CubeState = (() => {
  const cubies: Cubie[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        const home: Vec3 = [x, y, z]
        cubies.push({ id: cubieId(home), home, pos: home, rot: IDENTITY })
      }
    }
  }
  return cubies
})()

export function solvedState(): CubeState {
  return SOLVED
}
