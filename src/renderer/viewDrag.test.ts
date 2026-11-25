import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { createCube, parseAlg, solvedState } from '../engine/index.ts'
import { TurnAnimator } from './animator.ts'
import { CubeInteraction, type InteractionDeps } from './interaction.ts'
import { syncToState, type CubieView } from './turn.ts'
import { nearestOrientation, ViewController } from './view.ts'

const SCRAMBLE = parseAlg("R U F' L2 D B' R2 U'")
const SIZE = 600

/** A canvas stand-in: collects the listeners so the test can send pointer events. */
function fakeDom() {
  const listeners = new Map<string, (e: unknown) => void>()
  return {
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: SIZE, height: SIZE }),
    setPointerCapture: () => {},
    send(type: string, x: number, y: number) {
      listeners.get(type)?.({
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: x,
        clientY: y,
      })
    },
  }
}

/** 26 box meshes the raycaster can hit, inside the view group, with a camera straight on. */
function setup(options: Partial<InteractionDeps> = {}) {
  const view = new ViewController({ reduceMotion: () => true })
  const root = new Group()
  view.group.add(root)
  const views = new Map<number, CubieView>()
  const geometry = new BoxGeometry(0.95, 0.95, 0.95)
  for (const c of solvedState()) {
    const mesh = new Mesh(geometry, new MeshBasicMaterial())
    mesh.position.set(...c.home)
    root.add(mesh)
    views.set(c.id, { object: mesh, base: mesh.quaternion.clone() })
  }
  const camera = new PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 0, 14)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  view.group.updateMatrixWorld(true)

  const cube = createCube()
  const animator = new TurnAnimator(root, views, { turnMs: 200 })
  syncToState(views, cube.state)
  cube.subscribe((e) => animator.handle(e))
  const dom = fakeDom()
  const interaction = new CubeInteraction({
    dom: dom as unknown as HTMLElement,
    camera: () => camera,
    view,
    root,
    views,
    animator,
    cube,
    reduceMotion: () => true,
    ...options,
  })
  interaction.attach()
  /** Drag from the middle of the canvas (on the front face) to the right. */
  const dragAcross = () => {
    const mid = SIZE / 2
    dom.send('pointerdown', mid, mid)
    for (let x = mid; x <= mid + 150; x += 15) dom.send('pointermove', x, mid)
  }
  return { view, cube, animator, interaction, dom, dragAcross }
}

describe('view drags while moves play (Scramble and Solve)', () => {
  it('a drag on a face turns the view, not the layer, while moves are queued', () => {
    const { view, cube, animator, interaction, dom, dragAcross } = setup({
      turnsLocked: () => true,
    })
    cube.apply(SCRAMBLE, { tempo: 120 })
    const state = cube.state
    const history = cube.history
    const before = view.group.quaternion.clone()
    expect(animator.busy).toBe(true)

    dragAcross()
    expect(interaction.turning).toBe(false)
    expect(view.group.quaternion.angleTo(before)).toBeGreaterThan(0.5)
    dom.send('pointerup', SIZE / 2 + 150, SIZE / 2)

    // The engine and the queued moves are untouched, and the view settled upright.
    expect(cube.state).toEqual(state)
    expect(cube.history).toEqual(history)
    expect(animator.busy).toBe(true)
    expect(view.settled).toBe(true)
    const q = view.group.quaternion
    expect(nearestOrientation(q).angleTo(q)).toBeLessThan(1e-6)
    // Every queued move still plays to the end.
    for (let t = 0; t < 60 && animator.busy; t++) animator.update(performance.now() + t * 1000)
    expect(animator.busy).toBe(false)
    expect(cube.state).toEqual(state)
  })

  it('while turns are locked (Solve waiting for the solver), a face drag still only turns the view', () => {
    const { view, cube, interaction, dom, dragAcross } = setup({ turnsLocked: () => true })
    const before = view.group.quaternion.clone()
    dragAcross()
    expect(interaction.turning).toBe(false)
    dom.send('pointerup', SIZE / 2 + 150, SIZE / 2)
    expect(view.group.quaternion.angleTo(before)).toBeGreaterThan(0.5)
    expect(cube.history).toEqual([])
  })

  it('with nothing playing, the same drag turns the layer', () => {
    const { cube, interaction, dom, dragAcross } = setup({ turnsLocked: () => false })
    dragAcross()
    expect(interaction.turning).toBe(true)
    dom.send('pointerup', SIZE / 2 + 150, SIZE / 2)
    expect(cube.history).toHaveLength(1)
  })

  it('when the page owns input (timer running), nothing moves', () => {
    const { view, cube, dom, dragAcross } = setup({ inputLocked: () => true })
    const before = view.group.quaternion.clone()
    dragAcross()
    dom.send('pointerup', SIZE / 2 + 150, SIZE / 2)
    expect(view.group.quaternion.angleTo(before)).toBe(0)
    expect(cube.history).toEqual([])
  })
})
