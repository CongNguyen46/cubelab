import type { Object3D } from 'three'
import { moveGeometry, type CubeEvent, type MoveGeometry, type Step } from '../engine/index.ts'
import {
  ease,
  finishTurn,
  moveAngle,
  setTurnAngle,
  startTurn,
  syncToState,
  type CubieView,
} from './turn.ts'

type Active = { step: Step; g: MoveGeometry; pivot: Object3D; t0: number; duration: number }

/** With more than this many turns waiting, turns play faster so typing does not lag behind. */
export const BACKLOG_THRESHOLD = 2
/** Speed-up for a backlog: each turn takes this share of its normal time. */
export const BACKLOG_FACTOR = 0.6

/**
 * How long one turn takes. Half turns take 1.5 times as long. `waiting` counts the turns
 * queued when this one starts, including itself.
 */
export function turnDuration(turnMs: number, g: MoveGeometry, waiting: number): number {
  const half = Math.abs(g.quarterTurns) === 2 ? 1.5 : 1
  const backlog = waiting > BACKLOG_THRESHOLD ? BACKLOG_FACTOR : 1
  return turnMs * half * backlog
}

export type AnimatorOptions = {
  /** Milliseconds for a quarter turn. See turnDuration for half turns and backlogs. */
  turnMs?: number
  /** When true every move lands instantly. */
  reduceMotion?: () => boolean
}

/**
 * Plays the moves the engine reports, one after another. It never decides what the cube looks
 * like: after each turn it places every cubie from the engine state that came with that move.
 */
export class TurnAnimator {
  private queue: Step[] = []
  private active: Active | null = null
  private readonly root: Object3D
  private readonly views: ReadonlyMap<number, CubieView>
  turnMs: number
  private readonly reduceMotion: () => boolean

  constructor(
    root: Object3D,
    views: ReadonlyMap<number, CubieView>,
    options: AnimatorOptions = {},
  ) {
    this.root = root
    this.views = views
    this.turnMs = options.turnMs ?? 200
    this.reduceMotion = options.reduceMotion ?? (() => false)
  }

  get busy() {
    return this.active !== null || this.queue.length > 0
  }

  handle(event: CubeEvent) {
    if (event.type === 'reset') {
      this.cancel()
      syncToState(this.views, event.state)
      return
    }
    this.queue.push(...event.steps)
  }

  /** Advance the animation. `now` is in milliseconds, for example from performance.now(). */
  update(now: number) {
    // Instant moves can finish several per frame; cap the loop so a long queue never hangs a frame.
    for (let guard = 0; guard < 64; guard++) {
      if (!this.active) {
        const waiting = this.queue.length
        const step = this.queue.shift()
        if (!step) return
        const g = moveGeometry(step.move)
        const objects = [...this.views.values()].map((v) => v.object)
        const duration = this.reduceMotion() ? 0 : turnDuration(this.turnMs, g, waiting)
        this.active = { step, g, pivot: startTurn(this.root, objects, g), t0: now, duration }
      }
      const a = this.active
      const t = a.duration > 0 ? Math.min(1, (now - a.t0) / a.duration) : 1
      if (t < 1) {
        setTurnAngle(a.pivot, a.g, moveAngle(a.g) * ease(t))
        return
      }
      finishTurn(this.root, a.pivot, a.g)
      syncToState(this.views, a.step.state)
      this.active = null
    }
  }

  /** Drop queued moves and put any cubies in mid-turn back under the root. */
  cancel() {
    this.queue = []
    if (this.active) {
      finishTurn(this.root, this.active.pivot, this.active.g)
      this.active = null
    }
  }
}
