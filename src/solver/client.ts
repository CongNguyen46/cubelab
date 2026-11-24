import {
  centreOrientation,
  isSolved,
  parseAlg,
  remapAlg,
  toFacelets,
  type CubeState,
  type Move,
} from '../engine/index.ts'
import type { SolverRequestBody, SolverResponse } from './core.ts'

type Pending = { resolve: (moves: Move[]) => void; reject: (e: Error) => void }

/**
 * Talks to the solver worker. The worker starts on first use; call warmUp() when the page is
 * idle so the one-second table setup is done before anyone presses Solve. Requests sent while it
 * is still warming up simply wait in the worker's queue.
 */
export class SolverClient {
  private worker: Worker | null = null
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private readonly createWorker: () => Worker

  constructor(
    createWorker: () => Worker = () =>
      new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' }),
  ) {
    this.createWorker = createWorker
  }

  private request(req: SolverRequestBody): Promise<Move[]> {
    if (!this.worker) {
      this.worker = this.createWorker()
      this.worker.onmessage = (e: MessageEvent<SolverResponse>) => this.onResponse(e.data)
      this.worker.onerror = (e) => this.failAll(new Error(e.message || 'Solver worker failed'))
    }
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker!.postMessage({ ...req, id })
    })
  }

  private onResponse(res: SolverResponse) {
    const p = this.pending.get(res.id)
    if (!p) return
    this.pending.delete(res.id)
    if (res.ok) p.resolve(parseAlg(res.moves))
    else p.reject(new Error(res.error))
  }

  private failAll(error: Error) {
    for (const p of this.pending.values()) p.reject(error)
    this.pending.clear()
    this.worker?.terminate()
    this.worker = null
  }

  /** Start the worker and build its tables. */
  async warmUp(): Promise<void> {
    await this.request({ type: 'init' })
  }

  /** Moves that solve `state` from its current orientation. [] if it already looks solved. */
  async solve(state: CubeState): Promise<Move[]> {
    if (isSolved(state)) return []
    const moves = await this.request({ type: 'solve', facelets: toFacelets(state) })
    return remapAlg(moves, centreOrientation(state))
  }

  /** A random-state scramble for a solved cube in the starting orientation. */
  scramble(): Promise<Move[]> {
    return this.request({ type: 'scramble' })
  }
}

export const solver = new SolverClient()
