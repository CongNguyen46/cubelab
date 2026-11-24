import { Object3D, Raycaster, Vector2, Vector3, type Camera } from 'three'
import { formatMove, remapMove, type Axis, type Cube, type MoveGeometry } from '../engine/index.ts'
import type { TurnAnimator } from './animator.ts'
import {
  DRAG_GAIN,
  DRAG_THRESHOLD,
  moveForLayerTurn,
  pickDragAxis,
  snapAxis,
  snapQuarterTurns,
} from './drag.ts'
import { ease, finishTurn, setTurnAngle, startTurn, type CubieView } from './turn.ts'
import type { ViewController } from './view.ts'

const UNIT: Readonly<Record<Axis, Vector3>> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
}

/** Time for a released layer to snap to the nearest 90 degrees. */
export const SNAP_MS = 150

type TurnDrag = {
  kind: 'turn'
  pointerId: number
  cubie: Object3D
  point: Vector3
  normal: { axis: Axis; sign: 1 | -1 }
  start: Vector2
  layer?: { g: MoveGeometry; pivot: Object3D; sign: 1 | -1; dir: Vector2; pixelsPerTurn: number }
  angle: number
}
type SpinDrag = { kind: 'spin'; pointerId: number; last: Vector2 }
type Snap = {
  g: MoveGeometry
  pivot: Object3D
  from: number
  to: number
  layer: number
  t0: number
  duration: number
}

export type InteractionDeps = {
  dom: HTMLElement
  camera: () => Camera
  view: ViewController
  root: Object3D
  views: ReadonlyMap<number, CubieView>
  animator: TurnAnimator
  cube: Cube
  reduceMotion: () => boolean
}

/**
 * Pointer input on the canvas, ported from the prototype. Dragging a face turns its layer and the
 * finished turn goes to the engine as a normal move. Dragging empty space turns the view, and a
 * double-click resets it. Mouse and touch both arrive as pointer events.
 */
export class CubeInteraction {
  private drag: TurnDrag | SpinDrag | null = null
  private snap: Snap | null = null
  private readonly ray = new Raycaster()
  private readonly ndc = new Vector2()
  private readonly cubies: Set<Object3D>
  private readonly deps: InteractionDeps

  constructor(deps: InteractionDeps) {
    this.deps = deps
    this.cubies = new Set([...deps.views.values()].map((v) => v.object))
  }

  /** A layer is being dragged or snapping into place. Keyboard turns wait until it is done. */
  get turning() {
    return this.drag?.kind === 'turn' || this.snap !== null
  }

  attach() {
    const { dom } = this.deps
    dom.addEventListener('pointerdown', this.onDown)
    dom.addEventListener('pointermove', this.onMove)
    dom.addEventListener('pointerup', this.onUp)
    dom.addEventListener('pointercancel', this.onUp)
    dom.addEventListener('dblclick', this.onDoubleClick)
    return () => {
      dom.removeEventListener('pointerdown', this.onDown)
      dom.removeEventListener('pointermove', this.onMove)
      dom.removeEventListener('pointerup', this.onUp)
      dom.removeEventListener('pointercancel', this.onUp)
      dom.removeEventListener('dblclick', this.onDoubleClick)
      this.cancel()
    }
  }

  /** Advance the release snap. `now` is in milliseconds. */
  update(now: number) {
    const s = this.snap
    if (!s) return
    const t = s.duration > 0 ? Math.min(1, (now - s.t0) / s.duration) : 1
    setTurnAngle(s.pivot, s.g, s.from + (s.to - s.from) * ease(t))
    if (t < 1) return
    this.snap = null
    finishTurn(this.deps.root, s.pivot, s.g)
    const move = moveForLayerTurn(s.g.axis, s.layer, s.to)
    if (!move) return
    const label = formatMove(remapMove(move, this.deps.view.orientationForInput()))
    this.deps.cube.apply([move], { animated: true, labels: [label] })
  }

  /** Drop any drag in progress and put a lifted layer straight back. */
  cancel() {
    if (this.drag?.kind === 'turn' && this.drag.layer) {
      const { g, pivot } = this.drag.layer
      finishTurn(this.deps.root, pivot, { ...g, quarterTurns: 0 })
    }
    if (this.drag?.kind === 'spin') this.deps.view.endDrag()
    this.drag = null
    if (this.snap) this.update(Infinity)
  }

  private pointer(e: PointerEvent): Vector2 {
    const r = this.deps.dom.getBoundingClientRect()
    return new Vector2(e.clientX - r.left, e.clientY - r.top)
  }

  private toScreen(world: Vector3): Vector2 {
    const p = world.clone().project(this.deps.camera())
    const r = this.deps.dom.getBoundingClientRect()
    return new Vector2(((p.x + 1) / 2) * r.width, ((1 - p.y) / 2) * r.height)
  }

  private onDown = (e: PointerEvent) => {
    if (this.drag || this.snap || (e.pointerType === 'mouse' && e.button !== 0)) return
    const { view, animator, dom } = this.deps
    view.stopAutoSpin()
    const at = this.pointer(e)
    const r = dom.getBoundingClientRect()
    this.ndc.set((at.x / r.width) * 2 - 1, -(at.y / r.height) * 2 + 1)
    this.ray.setFromCamera(this.ndc, this.deps.camera())
    const hit = this.ray.intersectObject(this.deps.root, true)[0]
    let cubie: Object3D | null = hit?.object ?? null
    while (cubie && !this.cubies.has(cubie)) cubie = cubie.parent

    if (hit?.face && cubie && !animator.busy) {
      // Face normal in the cube's own frame, which is the engine frame.
      const n = hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld)
        .applyQuaternion(view.group.quaternion.clone().invert())
      this.drag = {
        kind: 'turn',
        pointerId: e.pointerId,
        cubie,
        point: hit.point.clone(),
        normal: snapAxis(n),
        start: at,
        angle: 0,
      }
    } else {
      view.beginDrag()
      this.drag = { kind: 'spin', pointerId: e.pointerId, last: at }
    }
    dom.setPointerCapture(e.pointerId)
  }

  private onMove = (e: PointerEvent) => {
    const d = this.drag
    if (!d || d.pointerId !== e.pointerId) return
    const at = this.pointer(e)
    if (d.kind === 'spin') {
      const right = new Vector3().setFromMatrixColumn(this.deps.camera().matrixWorld, 0)
      this.deps.view.dragBy(at.x - d.last.x, at.y - d.last.y, right)
      d.last = at
      return
    }
    const moved = at.clone().sub(d.start)
    if (!d.layer) {
      if (moved.length() < DRAG_THRESHOLD) return
      this.liftLayer(d, moved)
    }
    const layer = d.layer!
    const turns = moved.dot(layer.dir) / layer.pixelsPerTurn / DRAG_GAIN
    d.angle = layer.sign * turns * (Math.PI / 2)
    setTurnAngle(layer.pivot, layer.g, d.angle)
  }

  /** Work out which layer the drag turns and lift its cubies into a pivot. */
  private liftLayer(d: TurnDrag, moved: Vector2) {
    const { view, root, views } = this.deps
    const p0 = this.toScreen(d.point)
    const candidates = (['x', 'y', 'z'] as const)
      .filter((a) => a !== d.normal.axis)
      .map((axis) => {
        const step = UNIT[axis].clone().applyQuaternion(view.group.quaternion).multiplyScalar(0.5)
        return { axis, screen: this.toScreen(d.point.clone().add(step)).sub(p0) }
      })
    const pick = pickDragAxis(candidates, moved)
    const n = UNIT[d.normal.axis].clone().multiplyScalar(d.normal.sign)
    const dragDir = UNIT[pick.axis].clone().multiplyScalar(pick.along)
    const rot = snapAxis(new Vector3().crossVectors(n, dragDir))
    const layer = Math.round(d.cubie.position[rot.axis]) as -1 | 0 | 1
    const g: MoveGeometry = { axis: rot.axis, layers: [layer], quarterTurns: 0 }
    const objects = [...views.values()].map((v) => v.object)
    d.layer = {
      g,
      pivot: startTurn(root, objects, g),
      sign: rot.sign,
      dir: pick.screen.clone().normalize().multiplyScalar(pick.along),
      pixelsPerTurn: pick.screen.length() * 2,
    }
  }

  private onUp = (e: PointerEvent) => {
    const d = this.drag
    if (!d || d.pointerId !== e.pointerId) return
    this.drag = null
    if (d.kind === 'spin') {
      this.deps.view.endDrag()
      return
    }
    if (!d.layer) return
    const quarter = snapQuarterTurns(d.angle)
    const { g, pivot } = d.layer
    this.snap = {
      g: { ...g, quarterTurns: quarter },
      pivot,
      from: d.angle,
      to: (quarter * Math.PI) / 2,
      layer: g.layers[0]!,
      t0: performance.now(),
      duration: this.deps.reduceMotion() ? 0 : SNAP_MS,
    }
    if (this.snap.duration === 0) this.update(this.snap.t0)
  }

  private onDoubleClick = () => {
    if (!this.drag) this.deps.view.reset()
  }
}
