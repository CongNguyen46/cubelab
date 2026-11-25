import { create } from 'zustand'
import { isActive, isShown, type TimerState } from '../timer/index.ts'
import type { Line } from './play.ts'

/** How long "Solved in N moves" holds the slot before the timer digits come back. */
export const SOLVED_FLASH_MS = 1500

type Subscribable<S> = {
  getState(): S
  subscribe(listener: (state: S, prev: S) => void): () => void
}

export type SolvedFlashDeps = {
  timer: Subscribable<{ timer: TimerState }>
  play: Subscribable<{ line: Line }>
}

type SolvedFlash = {
  /** "Solved in N moves" is covering the timer digits right now. */
  showing: boolean
  /** Start listening. Returns a stop function. */
  start: () => () => void
}

/**
 * With the timer digits on screen, a finished Solve still says "Solved in N moves" in the slot
 * under the cube for SOLVED_FLASH_MS, then the digits come back with their value and colour.
 * Only when the timer is shown and not held or running. Any timer input (Space, the Timer
 * button, Esc) ends it at once. With the timer hidden the line simply shows the message.
 */
export function createSolvedFlash({ timer, play }: SolvedFlashDeps) {
  return create<SolvedFlash>()((set, get) => {
    let timeout: ReturnType<typeof setTimeout> | null = null

    const end = () => {
      if (timeout) clearTimeout(timeout)
      timeout = null
      if (get().showing) set({ showing: false })
    }

    return {
      showing: false,
      start() {
        const offPlay = play.subscribe((s, prev) => {
          if (s.line === prev.line || s.line.kind !== 'solved') return
          const t = timer.getState().timer
          if (!isShown(t) || isActive(t)) return
          end()
          set({ showing: true })
          timeout = setTimeout(end, SOLVED_FLASH_MS)
        })
        // Every timer input changes its state: that cancels the message.
        const offTimer = timer.subscribe((s, prev) => {
          if (s.timer !== prev.timer) end()
        })
        return () => {
          offPlay()
          offTimer()
          end()
        }
      },
    }
  })
}
