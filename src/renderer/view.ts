import { Group, Matrix4, Quaternion, Vector3 } from 'three'
import type { Mat3 } from '../engine/index.ts'

const Y_AXIS = new Vector3(0, 1, 0)
const AXES = ['x', 'y', 'z'] as const
type AxisKey = (typeof AXES)[number]
const UNIT: Readonly<Record<AxisKey, Vector3>> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
}

/**
 * The home view: white up, the orange (L) face toward the camera. A quarter turn about the vertical
 * axis from the engine frame (white up, green front). It turns the view only; the engine frame
 * never changes.
 */
export const HOME_VIEW: Readonly<Quaternion> = new Quaternion().setFromAxisAngle(
  new Vector3(0, 1, 0),
  Math.PI / 2,
)

/** Auto-spin speed in radians per second, as in the prototype. */
export const AUTO_SPIN_SPEED = 0.35
/** Radians of whole-cube turn per pixel dragged. */
export const SPIN_PER_PIXEL = 0.009

function nearestAxis(v: Vector3, avoid?: AxisKey): { key: AxisKey; v: Vector3 } {
  let best: AxisKey | null = null
  for (const k of AXES) {
    if (k === avoid) continue
    if (!best || Math.abs(v[k]) > Math.abs(v[best])) best = k
  }
  const key = best!
  return { key, v: UNIT[key].clone().multiplyScalar(Math.sign(v[key]) || 1) }
}

/**
 * The closest of the 24 axis-aligned orientations: the cube upright with one face on top.
 * Same method as the prototype: snap the first basis column, then the second avoiding the first.
 */
export function nearestOrientation(q: Quaternion): Quaternion {
  const m = new Matrix4().makeRotationFromQuaternion(q)
  const c0 = nearestAxis(new Vector3().setFromMatrixColumn(m, 0))
  const c1 = nearestAxis(new Vector3().setFromMatrixColumn(m, 1), c0.key)
  const c2 = new Vector3().crossVectors(c0.v, c1.v)
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(c0.v, c1.v, c2))
}

/** An axis-aligned quaternion as an integer rotation matrix (engine frame to view frame). */
export function quaternionToMat3(q: Quaternion): Mat3 {
  const e = new Matrix4().makeRotationFromQuaternion(q).elements
  const r = (v: number) => Math.round(v) + 0
  // Matrix4 elements are column-major; Mat3 is row-major.
  return [r(e[0]!), r(e[4]!), r(e[8]!), r(e[1]!), r(e[5]!), r(e[9]!), r(e[2]!), r(e[6]!), r(e[10]!)]
}

/**
 * The whole-cube view: free spin while dragging, settling to the nearest upright orientation on
 * release, a slow auto-spin until the first touch, and reset on double-click. It only turns the
 * view. The engine never hears about it.
 */
export class ViewController {
  readonly group = new Group()
  private autoSpin: boolean
  private settleTarget: Quaternion | null = null
  private dragging = false
  private readonly reduceMotion: () => boolean
  private readonly tmp = new Quaternion()
  private settledWaiters: (() => void)[] = []

  constructor(options: { reduceMotion?: () => boolean } = {}) {
    this.reduceMotion = options.reduceMotion ?? (() => false)
    this.autoSpin = !this.reduceMotion()
    this.group.quaternion.copy(HOME_VIEW)
  }

  get spinning() {
    return this.autoSpin
  }

  /** Stop the auto-spin and settle upright. Called on the first pointer or key input. */
  stopAutoSpin() {
    if (!this.autoSpin) return
    this.autoSpin = false
    this.settle()
  }

  beginDrag() {
    this.stopAutoSpin()
    this.dragging = true
    this.settleTarget = null
  }

  /** Turn by a pointer movement: dx about the world up axis, dy about the camera's right axis. */
  dragBy(dxPixels: number, dyPixels: number, cameraRight: Vector3) {
    const right = cameraRight.clone().setY(0).normalize()
    this.group.quaternion.premultiply(this.tmp.setFromAxisAngle(Y_AXIS, dxPixels * SPIN_PER_PIXEL))
    this.group.quaternion.premultiply(this.tmp.setFromAxisAngle(right, dyPixels * SPIN_PER_PIXEL))
  }

  endDrag() {
    this.dragging = false
    this.settle()
  }

  /** Ease back to the home view: white up, orange front. Resolves once it is there. */
  reset(): Promise<void> {
    this.autoSpin = false
    this.dragging = false
    this.settleTarget = HOME_VIEW.clone()
    const settled = this.whenSettled()
    if (this.reduceMotion()) this.update(0)
    return settled
  }

  /** Resolves when the view is upright and still (at once if it already is). */
  whenSettled(): Promise<void> {
    if (this.settled) return Promise.resolve()
    return new Promise((resolve) => this.settledWaiters.push(resolve))
  }

  private settle() {
    this.settleTarget = nearestOrientation(this.group.quaternion)
    if (this.reduceMotion()) this.update(0)
  }

  /**
   * The orientation keys and labels should use (engine frame to view frame). Stops the auto-spin
   * so the cube holds still while the user types.
   */
  orientationForInput(): Mat3 {
    this.stopAutoSpin()
    const q = this.settleTarget ?? nearestOrientation(this.group.quaternion)
    return quaternionToMat3(q)
  }

  /** Advance auto-spin or settling. `dt` is in seconds. */
  update(dt: number) {
    if (this.autoSpin) {
      this.group.rotateOnWorldAxis(Y_AXIS, dt * AUTO_SPIN_SPEED)
      return
    }
    if (!this.settleTarget || this.dragging) return
    const blend = this.reduceMotion() ? 1 : 1 - Math.pow(0.0005, dt)
    this.group.quaternion.slerp(this.settleTarget, blend)
    if (this.group.quaternion.angleTo(this.settleTarget) < 0.002) {
      this.group.quaternion.copy(this.settleTarget)
      this.settleTarget = null
      const waiters = this.settledWaiters
      this.settledWaiters = []
      for (const w of waiters) w()
    }
  }

  /** True when the view is upright and still. */
  get settled() {
    return !this.autoSpin && !this.dragging && this.settleTarget === null
  }
}
