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
  /**
   * Queued steps. `shown` steps were already animated by the view (a drag): they only sync.
   * `tempo` is a set pace in ms per quarter turn (Scramble, Solve), else the normal timing.
   */
  private queue: { step: Step; shown: boolean; tempo?: number }[] = []
  private active: Active | null = null
  private idleWaiters: (() => void)[] = []
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
    // A finished drag is already on screen. With nothing queued, place the cubies now.
    if (event.animated && !this.busy) {
      for (const step of event.steps) syncToState(this.views, step.state)
      return
    }
    this.queue.push(
      ...event.steps.map((step) => ({ step, shown: event.animated, tempo: event.tempo })),
    )
  }

  /** Resolves once every queued turn has finished (at once if nothing is playing). */
  whenIdle(): Promise<void> {
    if (!this.busy) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  /** Jump to the end: finish the current turn and land on the last queued state. */
  skip() {
    const last = this.queue.at(-1)?.step ?? this.active?.step
    this.cancel()
    if (last) syncToState(this.views, last.state)
  }

  /** Advance the animation. `now` is in milliseconds, for example from performance.now(). */
  update(now: number) {
    this.advance(now)
    if (!this.busy) this.notifyIdle()
  }

  private advance(now: number) {
    // Instant moves can finish several per frame; cap the loop so a long queue never hangs a frame.
    for (let guard = 0; guard < 64; guard++) {
      if (!this.active) {
        const waiting = this.queue.length
        const next = this.queue.shift()
        if (!next) return
        const { step } = next
        if (next.shown) {
          syncToState(this.views, step.state)
          continue
        }
        const g = moveGeometry(step.move)
        const objects = [...this.views.values()].map((v) => v.object)
        const duration = this.reduceMotion()
          ? 0
          : next.tempo
            ? next.tempo * (Math.abs(g.quarterTurns) === 2 ? 1.5 : 1)
            : turnDuration(this.turnMs, g, waiting)
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

  private notifyIdle() {
    const waiters = this.idleWaiters
    this.idleWaiters = []
    for (const w of waiters) w()
  }

  /** Drop queued moves and put any cubies in mid-turn back under the root. */
  cancel() {
    this.queue = []
    if (this.active) {
      finishTurn(this.root, this.active.pivot, this.active.g)
      this.active = null
    }
    this.notifyIdle()
  }
}
