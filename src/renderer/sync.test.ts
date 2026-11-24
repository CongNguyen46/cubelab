import { Group, Object3D, Quaternion } from 'three'
import { describe, expect, it } from 'vitest'
import {
  applyMove,
  createCube,
  formatAlg,
  moveGeometry,
  MOVE_BASES,
  parseAlg,
  solvedState,
  type CubeState,
  type Move,
} from '../engine/index.ts'
import { TurnAnimator, turnDuration } from './animator.ts'
import { finishTurn, matToQuaternion, startTurn, type CubieView } from './turn.ts'

/** 26 plain objects standing in for the GLB cubies, each with its own starting rotation. */
function buildScene() {
  const root = new Group()
  const views = new Map<number, CubieView>()
  for (const c of solvedState()) {
    const o = new Object3D()
    o.position.set(...c.home)
    // A non-trivial base rotation, like a model exported from a Z-up tool.
    o.quaternion.setFromAxisAngle({ x: 1, y: 0, z: 0 } as never, -Math.PI / 2)
    root.add(o)
    views.set(c.id, { object: o, base: o.quaternion.clone() })
  }
  return { root, views }
}

function expectInSync(views: Map<number, CubieView>, state: CubeState, label: string) {
  const want = new Quaternion()
  for (const c of state) {
    const o = views.get(c.id)!.object
    const pos = [o.position.x, o.position.y, o.position.z].map((v) => Math.round(v * 1e6) / 1e6 + 0)
    expect(pos, `${label}: position of cubie ${c.id}`).toEqual([...c.pos])
    matToQuaternion(c.rot, want).multiply(views.get(c.id)!.base)
    expect(o.quaternion.angleTo(want), `${label}: rotation of cubie ${c.id}`).toBeLessThan(1e-6)
  }
}

/** Seeded random generator, so a failure can be reproduced. */
function rng(seed: number) {
  seed = Math.imul(seed, 2654435761) >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

function randomAlg(n: number, rand: () => number): Move[] {
  return Array.from({ length: n }, () => ({
    base: MOVE_BASES[Math.floor(rand() * MOVE_BASES.length)]!,
    turns: (1 + Math.floor(rand() * 3)) as Move['turns'],
  }))
}

describe('renderer stays in sync with the engine', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('random sequence %i, turned by the renderer alone', (seed) => {
    const { root, views } = buildScene()
    const objects = [...views.values()].map((v) => v.object)
    const alg = randomAlg(40, rng(seed))
    let state = solvedState()
    for (const move of alg) {
      const g = moveGeometry(move)
      finishTurn(root, startTurn(root, objects, g), g)
      state = applyMove(state, move)
      expectInSync(views, state, `seed ${seed} after ${formatAlg([move])}`)
    }
  })

  it('every move on its own matches the engine', () => {
    for (const base of MOVE_BASES) {
      for (const turns of [1, 2, 3] as const) {
        const { root, views } = buildScene()
        const g = moveGeometry({ base, turns })
        finishTurn(
          root,
          startTurn(
            root,
            [...views.values()].map((v) => v.object),
            g,
          ),
          g,
        )
        expectInSync(views, applyMove(solvedState(), { base, turns }), `${base}${turns}`)
      }
    }
  })
})

describe('TurnAnimator', () => {
  it('plays queued moves over time and ends in the engine state', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 200 })
    cube.subscribe((e) => anim.handle(e))

    cube.apply(parseAlg("R U2 M' x"))
    expect(anim.busy).toBe(true)
    anim.update(0)
    anim.update(100) // halfway through R
    expect(root.children.length).toBe(18) // 17 cubies plus the pivot holding the 9 of R
    let t = 100
    while (anim.busy) anim.update((t += 50))
    expect(root.children.length).toBe(26)
    expectInSync(views, cube.state, 'after animation')
  })

  it('half turns take 1.5 times as long', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 200 })
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg('R2'))
    anim.update(0)
    anim.update(250)
    expect(anim.busy).toBe(true)
    anim.update(300)
    expect(anim.busy).toBe(false)
  })

  it('reduced motion lands every move in one update', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { reduceMotion: () => true })
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg("R U R' U' F2 S E M"))
    anim.update(0)
    expect(anim.busy).toBe(false)
    expectInSync(views, cube.state, 'reduced motion')
  })

  it('reset mid-turn drops the queue and snaps to solved', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views)
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg('R U F'))
    anim.update(0)
    anim.update(90)
    cube.reset()
    expect(anim.busy).toBe(false)
    expect(root.children.length).toBe(26)
    expectInSync(views, solvedState(), 'after reset')
  })

  it('undo animates the inverse move', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { reduceMotion: () => true })
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg("R U F' M"))
    cube.undo()
    cube.undo()
    anim.update(0)
    expectInSync(views, cube.state, 'after undo')
    expectInSync(
      views,
      applyMove(applyMove(solvedState(), parseAlg('R')[0]!), parseAlg('U')[0]!),
      'is R U',
    )
  })
})

describe('backlog speed-up', () => {
  const quarter = moveGeometry({ base: 'R', turns: 1 })
  const half = moveGeometry({ base: 'R', turns: 2 })

  it('plays turns at 60% of turnMs when more than 2 are waiting', () => {
    expect(turnDuration(200, quarter, 1)).toBe(200)
    expect(turnDuration(200, quarter, 2)).toBe(200)
    expect(turnDuration(200, quarter, 3)).toBe(120)
    expect(turnDuration(200, half, 2)).toBe(300)
    expect(turnDuration(200, half, 5)).toBe(180)
  })

  it('speeds up a typed burst, then slows back down as the queue drains', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 200 })
    cube.subscribe((e) => anim.handle(e))
    for (const m of parseAlg('R U F L')) cube.apply([m])

    // R and U start with 4 and 3 waiting: 120 ms each. F and L start with 2 and 1: 200 ms each.
    // Step 1 ms at a time and note when each turn finishes.
    const ends: number[] = []
    anim.update(0)
    for (let t = 1; t <= 1000 && anim.busy; t++) {
      anim.update(t)
      const finished = 4 - countQueued(anim) - (anim.busy ? 1 : 0)
      if (finished > ends.length) ends.push(t)
    }
    expect(ends).toEqual([120, 240, 440, 640])
    expectInSync(views, cube.state, 'after burst')
  })

  it('two waiting turns keep the normal speed', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 200 })
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg('R U'))
    anim.update(0)
    anim.update(199)
    expect(countQueued(anim)).toBe(1)
    anim.update(200)
    anim.update(399)
    expect(anim.busy).toBe(true)
    anim.update(400)
    expect(anim.busy).toBe(false)
  })
})

/** Turns still queued behind the active one. */
function countQueued(anim: TurnAnimator): number {
  return (anim as unknown as { queue: unknown[] }).queue.length
}

describe('moves the view already animated', () => {
  it('sync at once without turning anything', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views)
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg("R U'"), { animated: true })
    expect(anim.busy).toBe(false)
    expect(root.children.length).toBe(26)
    expectInSync(views, cube.state, 'animated')
  })

  it('wait their turn behind queued animations', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 100 })
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg('F'))
    cube.apply(parseAlg('R'), { animated: true })
    anim.update(0)
    expect(anim.busy).toBe(true)
    anim.update(100)
    expect(anim.busy).toBe(false)
    expectInSync(views, cube.state, 'after F then shown R')
  })
})

describe('playback: tempo, skip and idle', () => {
  it('plays moves at a set tempo, with half turns 1.5 times as long and no backlog speed-up', () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 200 })
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg('R U2 F L'), { tempo: 100 })
    anim.update(0)
    anim.update(99)
    expect(countQueued(anim)).toBe(3)
    anim.update(100) // R done, U2 starts
    anim.update(249)
    expect(countQueued(anim)).toBe(2)
    anim.update(250) // U2 done after 150 ms
    expect(countQueued(anim)).toBe(1)
    anim.update(350)
    anim.update(450)
    expect(anim.busy).toBe(false)
    expectInSync(views, cube.state, 'after tempo')
  })

  it('skip lands on the final state at once', async () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views)
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg("R U R' U' M2 x F"), { tempo: 120 })
    anim.update(0)
    anim.update(50)
    const idle = anim.whenIdle()
    anim.skip()
    expect(anim.busy).toBe(false)
    expect(root.children.length).toBe(26)
    expectInSync(views, cube.state, 'after skip')
    await idle
  })

  it('whenIdle resolves after the last turn, and at once when nothing plays', async () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views, { turnMs: 100 })
    cube.subscribe((e) => anim.handle(e))
    await anim.whenIdle()
    cube.apply(parseAlg('R U'))
    let done = false
    void anim.whenIdle().then(() => (done = true))
    anim.update(0)
    anim.update(100)
    await Promise.resolve()
    expect(done).toBe(false)
    anim.update(200)
    await Promise.resolve()
    expect(done).toBe(true)
  })

  it('reset also releases anyone waiting for idle', async () => {
    const { root, views } = buildScene()
    const cube = createCube()
    const anim = new TurnAnimator(root, views)
    cube.subscribe((e) => anim.handle(e))
    cube.apply(parseAlg('R U F'))
    anim.update(0)
    const idle = anim.whenIdle()
    cube.reset()
    await idle
    expectInSync(views, cube.state, 'after reset')
  })
})
