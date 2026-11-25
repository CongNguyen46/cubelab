import { Color, Vector3, type Object3D } from 'three'
import { cubieId } from '../engine/index.ts'

/** Sticker colours in face order R L U D F B (design-system.md). */
export const FACE_COLOURS = [0xf0232c, 0xff8a1c, 0xf5f5f1, 0xffe01a, 0x2fcf5a, 0x1b6bff] as const

const NORMALS: readonly [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

/** Engine ids of the six centre cubies, in face order R L U D F B. */
export const CENTRE_IDS = NORMALS.map((n) => cubieId(n))

/**
 * Another face must face the camera this much more squarely before the glow switches. Below 0.113,
 * the margin between the front and side face in any settled view, so the front face always wins
 * once the cube settles (for example after double-click back home).
 */
export const GLOW_HYSTERESIS = 0.1

/**
 * Which face colour the glow should show. `scores` is how squarely each face's centre faces the
 * camera (dot product, face order R L U D F B). Switches only when another face is clearly ahead,
 * so a cube sitting on a diagonal does not flicker.
 */
export function pickGlowFace(scores: readonly number[], current: number): number {
  let best = current
  let bestScore = -Infinity
  scores.forEach((s, i) => {
    if (s > bestScore) {
      best = i
      bestScore = s
    }
  })
  return best !== current && bestScore > scores[current]! + GLOW_HYSTERESIS ? best : current
}

/** Blend factor for a frame of `dt` seconds: about 0.4 s to settle at any frame rate. */
export const glowBlend = (dt: number) => 1 - Math.pow(0.002, dt)

/**
 * Follows the centre piece facing the camera. Scores the real centre cubies' world positions,
 * not cube-local axes, so slice moves and whole-cube turns are handled for free.
 */
export class GlowTracker {
  /** Current face index, R L U D F B. Starts on orange (L), the face toward the camera at home. */
  face = 1
  readonly colour = new Color(FACE_COLOURS[1])
  private readonly target = new Color()
  private readonly p = new Vector3()
  private readonly camDir = new Vector3()

  update(
    centres: readonly (Object3D | undefined)[],
    cameraPosition: Vector3,
    dt: number,
    instant = false,
  ): Color {
    this.camDir.copy(cameraPosition).normalize()
    const scores = centres.map((c) =>
      c ? c.getWorldPosition(this.p).normalize().dot(this.camDir) : -Infinity,
    )
    this.face = pickGlowFace(scores, this.face)
    this.colour.lerp(this.target.setHex(FACE_COLOURS[this.face]!), instant ? 1 : glowBlend(dt))
    return this.colour
  }
}
