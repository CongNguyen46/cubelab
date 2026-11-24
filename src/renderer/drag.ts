import { Vector2, Vector3 } from 'three'
import { MOVE_DEFS, MOVE_BASES, type Axis, type Move } from '../engine/index.ts'

/** Pixels the pointer must move before a face drag picks its direction. */
export const DRAG_THRESHOLD = 8
/** A drag of this share of a cubie's on-screen size turns the layer 90 degrees. */
export const DRAG_GAIN = 0.9

/** The axis a vector points along most, with its sign. */
export function snapAxis(v: Vector3): { axis: Axis; sign: 1 | -1 } {
  const axis = (['x', 'y', 'z'] as const).reduce(
    (m, k) => (Math.abs(v[k]) > Math.abs(v[m]) ? k : m),
    'x' as Axis,
  )
  return { axis, sign: v[axis] < 0 ? -1 : 1 }
}

/**
 * Of the in-face directions, the one whose on-screen direction best matches the drag.
 * `screen` is where a half-cubie step along that axis lands on screen, relative to the hit point.
 */
export function pickDragAxis(
  candidates: readonly { axis: Axis; screen: Vector2 }[],
  drag: Vector2,
): { axis: Axis; along: 1 | -1; screen: Vector2 } {
  const d = drag.clone().normalize()
  let best = candidates[0]!
  let bestScore = -1
  for (const c of candidates) {
    const score = Math.abs(c.screen.clone().normalize().dot(d))
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return { axis: best.axis, along: best.screen.dot(drag) < 0 ? -1 : 1, screen: best.screen }
}

/**
 * Name the single-layer turn of `layer` on `axis` by `angle` radians about the +axis.
 * Returns null when the angle rounds to no turn at all.
 */
export function moveForLayerTurn(axis: Axis, layer: number, angle: number): Move | null {
  const base = MOVE_BASES.find((b) => {
    const d = MOVE_DEFS[b]
    return d.axis === axis && d.layers.length === 1 && d.layers[0] === layer
  })
  if (!base) return null
  const q = Math.round(angle / ((MOVE_DEFS[base].dir * Math.PI) / 2))
  const turns = ((q % 4) + 4) % 4
  return turns === 0 ? null : { base, turns: turns as Move['turns'] }
}

/** Nearest whole number of quarter turns for a drag angle. */
export function snapQuarterTurns(angle: number): number {
  return Math.round(angle / (Math.PI / 2)) + 0
}
