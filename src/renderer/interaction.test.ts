import { Object3D, Quaternion, Vector2, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { formatMove, IDENTITY, rotation } from '../engine/index.ts'
import { moveForLayerTurn, pickDragAxis, snapAxis, snapQuarterTurns } from './drag.ts'
import { CENTRE_IDS, GlowTracker, glowBlend, GLOW_HYSTERESIS, pickGlowFace } from './glow.ts'
import {
  CAM_DIR,
  HOME_VIEW,
  nearestOrientation,
  quaternionToMat3,
  SPIN_PER_PIXEL,
  ViewController,
} from './view.ts'

const deg = (d: number) => (d * Math.PI) / 180
const RIGHT = new Vector3(1, 0, 0)

describe('drag helpers', () => {
  it('snapAxis picks the largest component and its sign', () => {
    expect(snapAxis(new Vector3(0.2, -0.9, 0.1))).toEqual({ axis: 'y', sign: -1 })
    expect(snapAxis(new Vector3(0.7, 0.1, -0.6))).toEqual({ axis: 'x', sign: 1 })
  })

  it('pickDragAxis chooses the in-face direction closest to the drag', () => {
    const candidates = [
      { axis: 'x' as const, screen: new Vector2(40, 5) },
      { axis: 'y' as const, screen: new Vector2(-3, -38) },
    ]
    expect(pickDragAxis(candidates, new Vector2(-30, 4))).toMatchObject({ axis: 'x', along: -1 })
    expect(pickDragAxis(candidates, new Vector2(2, 25))).toMatchObject({ axis: 'y', along: -1 })
    expect(pickDragAxis(candidates, new Vector2(1, -25))).toMatchObject({ axis: 'y', along: 1 })
  })

  it('moveForLayerTurn names face and slice turns like the engine', () => {
    const name = (axis: 'x' | 'y' | 'z', layer: number, a: number) => {
      const m = moveForLayerTurn(axis, layer, deg(a))
      return m && formatMove(m)
    }
    expect(name('x', 1, -90)).toBe('R')
    expect(name('x', 1, 90)).toBe("R'")
    expect(name('x', 1, 180)).toBe('R2')
    expect(name('x', -1, 90)).toBe('L')
    expect(name('x', 0, 90)).toBe('M')
    expect(name('y', 0, -90)).toBe("E'")
    expect(name('z', 0, -90)).toBe('S')
    expect(name('z', -1, 270)).toBe("B'")
    expect(name('y', 1, 0)).toBeNull()
    expect(name('y', 1, 360)).toBeNull()
    expect(name('y', 1, 30)).toBeNull()
    expect(moveForLayerTurn('x', 5, deg(90))).toBeNull()
  })

  it('snapQuarterTurns rounds to the nearest 90 degrees', () => {
    expect(snapQuarterTurns(deg(50))).toBe(1)
    expect(snapQuarterTurns(deg(40))).toBe(0)
    expect(snapQuarterTurns(deg(-140))).toBe(-2)
    expect(Object.is(snapQuarterTurns(deg(-10)), 0)).toBe(true)
  })
})

describe('view orientation', () => {
  it('nearestOrientation snaps a tilted view upright', () => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), deg(80))
    q.premultiply(new Quaternion().setFromAxisAngle(RIGHT, deg(20)))
    expect(quaternionToMat3(nearestOrientation(q))).toEqual(rotation('y', 1))
  })

  it('every upright orientation is its own nearest, and there are 24 of them', () => {
    const seen = new Set<string>()
    for (const ax of [0, 1, 2, 3]) {
      for (const ay of [0, 1, 2, 3]) {
        for (const az of [0, 1]) {
          const q = new Quaternion()
            .setFromAxisAngle(RIGHT, deg(90 * ax))
            .premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), deg(90 * ay)))
            .premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), deg(90 * az)))
          const m = quaternionToMat3(q)
          expect(quaternionToMat3(nearestOrientation(q))).toEqual(m)
          seen.add(m.join())
        }
      }
    }
    expect(seen.size).toBe(24)
  })

  it('quaternionToMat3 of identity is the identity', () => {
    expect(quaternionToMat3(new Quaternion())).toEqual(IDENTITY)
  })
})

/** Home: a quarter turn about y, so the engine's L face is toward the camera. */
const HOME = rotation('y', 1)
const yTurn = (d: number) => new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), deg(d))

describe('ViewController', () => {
  const settle = (view: ViewController) => {
    for (let i = 0; i < 300 && !view.settled; i++) view.update(1 / 60)
  }

  it('starts at home: white up, the orange (L) face toward the camera', () => {
    const view = new ViewController({ reduceMotion: () => true })
    const home = quaternionToMat3(view.group.quaternion)
    expect(home).toEqual(HOME)
    // The engine's L face (-x) is turned to the camera side (+z); U stays up.
    const l = new Vector3(-1, 0, 0).applyQuaternion(view.group.quaternion)
    expect(l.z).toBeCloseTo(1)
    expect(new Vector3(0, 1, 0).applyQuaternion(view.group.quaternion).y).toBeCloseTo(1)
  })

  it('auto-spins until the first input, then settles upright', () => {
    const view = new ViewController()
    expect(view.spinning).toBe(true)
    view.update(1)
    expect(view.group.quaternion.angleTo(HOME_VIEW)).toBeGreaterThan(0.3)
    expect(view.orientationForInput()).toEqual(HOME) // 0.35 rad is still nearest home
    expect(view.spinning).toBe(false)
    settle(view)
    expect(view.settled).toBe(true)
    expect(quaternionToMat3(view.group.quaternion)).toEqual(HOME)
  })

  it('settles to the nearest of the 24 after a drag', () => {
    const view = new ViewController()
    view.beginDrag()
    view.dragBy(deg(100) / SPIN_PER_PIXEL, 0, RIGHT)
    expect(view.settled).toBe(false)
    view.endDrag()
    // Home is a quarter turn about y; 100 degrees more settles on the half turn.
    expect(view.orientationForInput()).toEqual(quaternionToMat3(yTurn(180)))
    settle(view)
    expect(view.settled).toBe(true)
  })

  it('reset (double-click) goes back to home', () => {
    const view = new ViewController({ reduceMotion: () => true })
    view.beginDrag()
    view.dragBy(deg(-90) / SPIN_PER_PIXEL, 0, RIGHT)
    view.endDrag()
    expect(quaternionToMat3(view.group.quaternion)).toEqual(IDENTITY)
    view.reset()
    expect(quaternionToMat3(view.group.quaternion)).toEqual(HOME)
    expect(view.settled).toBe(true)
  })

  it('with reduced motion there is no auto-spin and settles are instant', () => {
    const view = new ViewController({ reduceMotion: () => true })
    expect(view.spinning).toBe(false)
    view.beginDrag()
    view.dragBy(deg(30) / SPIN_PER_PIXEL, deg(-20) / SPIN_PER_PIXEL, RIGHT)
    view.endDrag()
    expect(view.settled).toBe(true)
    expect(quaternionToMat3(view.group.quaternion)).toEqual(HOME)
  })
})

describe('glow', () => {
  it('pickGlowFace switches only past the hysteresis', () => {
    expect(pickGlowFace([0.1, 0, 0, 0, 0.6, 0], 4)).toBe(4)
    expect(pickGlowFace([0.65, 0, 0, 0, 0.6, 0], 4)).toBe(4)
    expect(pickGlowFace([0.6 + GLOW_HYSTERESIS + 0.01, 0, 0, 0, 0.6, 0], 4)).toBe(0)
  })

  it('glowBlend is frame-rate independent', () => {
    expect(glowBlend(0)).toBe(0)
    const leftAfter = (fps: number, seconds: number) => {
      let left = 1
      for (let i = 0; i < fps * seconds; i++) left *= 1 - glowBlend(1 / fps)
      return left
    }
    // 0.5 s is a whole number of frames at both rates, so the totals must match.
    expect(leftAfter(30, 0.5)).toBeCloseTo(leftAfter(144, 0.5), 9)
    expect(leftAfter(60, 0.5)).toBeCloseTo(Math.sqrt(0.002), 9)
  })

  it('GlowTracker follows the centre cubie that faces the camera', () => {
    const root = new Object3D()
    const homes: [number, number, number][] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]
    const centres = CENTRE_IDS.map((_, i) => {
      const o = new Object3D()
      o.position.set(...homes[i]!)
      root.add(o)
      return o
    })
    root.updateMatrixWorld(true)
    const glow = new GlowTracker()
    // Starts on orange, the face toward the camera at home.
    expect(glow.face).toBe(1)
    expect(glow.colour.getHex()).toBe(0xff8a1c)
    const camera = new Vector3(10, 0, 1)
    glow.update(centres, camera, 0.016, true)
    expect(glow.face).toBe(0) // red faces the camera
    expect(glow.colour.getHex()).toBe(0xf0232c)
    // Turn the whole cube so blue faces that camera: world positions decide, not local axes.
    root.rotation.y = -Math.PI / 2
    root.updateMatrixWorld(true)
    glow.update(centres, camera, 0.016, true)
    expect(glow.face).toBe(5)
  })
})

describe('glow at a settled view', () => {
  /** The six centres placed as the view `q` shows them. */
  const centresAt = (q: Quaternion) => {
    const root = new Object3D()
    root.quaternion.copy(q)
    const normals: [number, number, number][] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]
    const centres = normals.map((n) => {
      const o = new Object3D()
      o.position.set(...n)
      root.add(o)
      return o
    })
    root.updateMatrixWorld(true)
    return centres
  }

  it('back at home (double-click), the glow returns to orange whatever it showed before', () => {
    for (let from = 0; from < 6; from++) {
      const glow = new GlowTracker()
      glow.face = from
      glow.update(centresAt(HOME_VIEW as Quaternion), CAM_DIR.clone(), 0.016, true)
      expect(glow.face, `from face ${from}`).toBe(1)
    }
  })

  it('in every settled view the glow ends on the face toward the camera', () => {
    const turns = [0, 1, 2, 3]
    for (const a of turns)
      for (const b of turns) {
        const q = yTurn(90 * a).multiply(
          new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), deg(90 * b)),
        )
        const centres = centresAt(q)
        const scores = centres.map((c) => c.getWorldPosition(new Vector3()).dot(CAM_DIR))
        const front = scores.indexOf(Math.max(...scores))
        for (let from = 0; from < 6; from++) {
          const glow = new GlowTracker()
          glow.face = from
          glow.update(centres, CAM_DIR.clone(), 0.016, true)
          expect(glow.face).toBe(front)
        }
      }
  })
})

describe('ViewController.reset as a promise', () => {
  it('resolves once the view is back at home', async () => {
    const view = new ViewController()
    view.beginDrag()
    view.dragBy(deg(120) / SPIN_PER_PIXEL, 0, RIGHT)
    view.endDrag()
    let done = false
    const p = view.reset().then(() => (done = true))
    view.update(1 / 60)
    await Promise.resolve()
    expect(done).toBe(false)
    for (let i = 0; i < 300 && !view.settled; i++) view.update(1 / 60)
    await p
    expect(quaternionToMat3(view.group.quaternion)).toEqual(HOME)
  })

  it('resolves at once with reduced motion, and whenSettled resolves at once when still', async () => {
    const view = new ViewController({ reduceMotion: () => true })
    await view.whenSettled()
    view.beginDrag()
    view.dragBy(deg(-200) / SPIN_PER_PIXEL, 0, RIGHT)
    await view.reset()
    expect(view.settled).toBe(true)
    expect(quaternionToMat3(view.group.quaternion)).toEqual(HOME)
  })
})
