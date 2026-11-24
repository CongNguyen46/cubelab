import { Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import type { CubeState, Mat3, MoveGeometry } from '../engine/index.ts'

/** Ease-in-out cubic, the prototype's turn easing. */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Signed angle in radians for a move, about its +axis. */
export const moveAngle = (g: MoveGeometry) => (g.quarterTurns * Math.PI) / 2

/** Cubies whose current (rounded) position is in one of the move's layers. */
export function pickLayer(cubies: Iterable<Object3D>, g: MoveGeometry): Object3D[] {
  const out: Object3D[] = []
  for (const c of cubies) {
    if ((g.layers as readonly number[]).includes(Math.round(c.position[g.axis]))) out.push(c)
  }
  return out
}

/** Put a layer's cubies into a fresh pivot under `root`, ready to be turned. */
export function startTurn(root: Object3D, cubies: Iterable<Object3D>, g: MoveGeometry): Object3D {
  const pivot = new Object3D()
  root.add(pivot)
  root.updateMatrixWorld(true)
  for (const c of pickLayer(cubies, g)) pivot.attach(c)
  return pivot
}

export function setTurnAngle(pivot: Object3D, g: MoveGeometry, angle: number) {
  pivot.rotation.set(0, 0, 0)
  pivot.rotation[g.axis] = angle
}

/** Finish the turn at its full angle, hand the cubies back to `root` and snap them to the grid. */
export function finishTurn(root: Object3D, pivot: Object3D, g: MoveGeometry) {
  setTurnAngle(pivot, g, moveAngle(g))
  pivot.updateMatrixWorld(true)
  for (const c of [...pivot.children]) {
    root.attach(c)
    snap(c)
  }
  root.remove(pivot)
}

const ROT_INDICES = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]

/** Round position and rotation to whole numbers, as the prototype does, so float error never builds up. */
export function snap(o: Object3D) {
  o.updateMatrix()
  const e = o.matrix.elements
  for (const i of ROT_INDICES) e[i] = Math.round(e[i]!)
  o.matrix.decompose(o.position, o.quaternion, o.scale)
}

const m4 = new Matrix4()

export function matToQuaternion(rot: Mat3, target = new Quaternion()): Quaternion {
  m4.set(
    rot[0],
    rot[1],
    rot[2],
    0,
    rot[3],
    rot[4],
    rot[5],
    0,
    rot[6],
    rot[7],
    rot[8],
    0,
    0,
    0,
    0,
    1,
  )
  return target.setFromRotationMatrix(m4)
}

/** A rendered cubie: its object plus the rotation it had in the solved position. */
export type CubieView = { readonly object: Object3D; readonly base: Quaternion }

const q = new Quaternion()

/** Place every cubie exactly where the engine says it is. */
export function syncToState(views: ReadonlyMap<number, CubieView>, state: CubeState) {
  for (const c of state) {
    const view = views.get(c.id)
    if (!view) continue
    view.object.position.set(c.pos[0], c.pos[1], c.pos[2])
    view.object.quaternion.copy(matToQuaternion(c.rot, q)).multiply(view.base)
  }
}

/** Round a world-ish position to a home coordinate, for mapping GLB nodes to engine cubies. */
export function roundedPosition(v: Vector3): [number, number, number] {
  return [Math.round(v.x), Math.round(v.y), Math.round(v.z)]
}
