import { create } from 'zustand'
import { createMemoryRepo, type Solve, type SolveRepo } from '../storage/index.ts'
import type { Penalty, TimerResult, TimerState } from '../timer/machine.ts'
import { isShown } from '../timer/machine.ts'

/** The parts of the timer store the session uses. */
type TimerApi = {
  getState(): {
    timer: TimerState
    send(input: { type: 'setInspection'; on: boolean }): void
    onResult(listener: (r: TimerResult) => void): () => void
  }
  subscribe(listener: (s: { timer: TimerState }) => void): () => void
}

export type SessionDeps = {
  /** Where solves are kept. Opening it may fail (private windows, old browsers). */
  openRepo: () => SolveRepo
  /** A new random-state scramble in notation. */
  nextScramble: () => Promise<string>
  timer: TimerApi
  now?: () => number
  onError?: (text: string) => void
}

export type SessionStore = {
  /** Oldest first. */
  solves: Solve[]
  /** The scramble to do next, shown under the digits. Null while one is on its way. */
  scramble: string | null
  inspection: boolean
  loaded: boolean
  /** Load saved solves and start listening to the timer. Returns a stop function. */
  start: () => () => void
  setPenalty: (id: number, penalty: Penalty) => Promise<void>
  remove: (id: number) => Promise<void>
  setInspection: (on: boolean) => Promise<void>
}

const NOT_SAVED = 'Times are kept for this visit only'

/**
 * The timing session (FR-4.4 to FR-4.6): saves each finished solve with its scramble, shows a new
 * scramble after it, and keeps penalty edits, deletes and the inspection switch in storage.
 */
export function createSessionStore(deps: SessionDeps) {
  const now = deps.now ?? (() => Date.now())
  let repo: SolveRepo = createMemoryRepo()
  let sessionId = 1
  let fetching = false
  let warned = false
  /** The switch was flipped before the saved settings arrived: keep the user's choice. */
  let touched = false

  /** Storage failed: carry on in memory and say so once. */
  const fallBack = () => {
    repo = createMemoryRepo()
    if (!warned) deps.onError?.(NOT_SAVED)
    warned = true
  }

  return create<SessionStore>()((set, get) => {
    const refreshScramble = async () => {
      if (fetching) return
      fetching = true
      set({ scramble: null })
      try {
        set({ scramble: await deps.nextScramble() })
      } catch {
        // Left empty: the next timer event while the digits show asks again.
        set({ scramble: null })
      } finally {
        fetching = false
      }
    }

    const record = async (result: TimerResult) => {
      const solve = {
        sessionId,
        ms: Math.round(result.ms),
        penalty: result.penalty,
        scramble: get().scramble ?? '',
        at: now(),
      }
      void refreshScramble()
      let id: number
      try {
        id = await repo.add(solve)
      } catch {
        fallBack()
        id = await repo.add(solve)
      }
      set({ solves: [...get().solves, { ...solve, id }] })
    }

    /** Write through to storage; on failure keep the change in memory. */
    const write = async (op: (r: SolveRepo) => Promise<void>) => {
      try {
        await op(repo)
      } catch {
        fallBack()
      }
    }

    return {
      solves: [],
      scramble: null,
      inspection: false,
      loaded: false,

      start() {
        const { timer } = deps
        const offResult = timer.getState().onResult((r) => void record(r))
        // The first scramble comes when the digits first show.
        const offShown = timer.subscribe(({ timer: t }) => {
          if (isShown(t) && get().scramble === null && !fetching) void refreshScramble()
        })
        void (async () => {
          try {
            repo = deps.openRepo()
            const saved = await repo.load()
            sessionId = saved.sessionId
            // Solves finished before the load completed stay, after the saved ones.
            const ids = new Set(saved.solves.map((s) => s.id))
            const early = get().solves.filter((s) => !ids.has(s.id))
            set({ solves: [...saved.solves, ...early] })
            if (!touched) {
              set({ inspection: saved.settings.inspection })
              timer.getState().send({ type: 'setInspection', on: saved.settings.inspection })
            }
          } catch {
            fallBack()
          }
          set({ loaded: true })
        })()
        return () => {
          offResult()
          offShown()
        }
      },

      async setPenalty(id, penalty) {
        set({ solves: get().solves.map((s) => (s.id === id ? { ...s, penalty } : s)) })
        await write((r) => r.setPenalty(id, penalty))
      },

      async remove(id) {
        set({ solves: get().solves.filter((s) => s.id !== id) })
        await write((r) => r.remove(id))
      },

      async setInspection(on) {
        touched = true
        set({ inspection: on })
        deps.timer.getState().send({ type: 'setInspection', on })
        await write((r) => r.saveSettings({ inspection: on }))
      },
    }
  })
}
