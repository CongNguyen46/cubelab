import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createDexieRepo, createMemoryRepo, type SolveRepo } from '../storage/index.ts'
import { createTimerStore } from '../timer/store.ts'
import { createSessionStore } from './session.ts'

let dbCount = 0

function setup(openRepo: () => SolveRepo = createMemoryRepo) {
  let clock = 0
  const timer = createTimerStore(() => clock)
  let n = 0
  const nextScramble = vi.fn(async () => `R U${++n}`)
  const onError = vi.fn()
  const session = createSessionStore({ openRepo, nextScramble, timer, onError, now: () => clock })
  const stop = session.getState().start()
  /** Time one solve of `ms` with the Timer button, once its scramble is on screen. */
  const timeSolve = async (ms: number) => {
    const count = session.getState().solves.length
    if (timer.getState().timer.phase === 'stopped') timer.getState().send({ type: 'button' }) // hide
    timer.getState().send({ type: 'button' }) // start
    await vi.waitFor(() => expect(session.getState().scramble).not.toBeNull())
    clock += ms
    timer.getState().send({ type: 'button' }) // stop
    await vi.waitFor(() => {
      expect(session.getState().solves).toHaveLength(count + 1)
      expect(session.getState().scramble).not.toBeNull()
    })
  }
  return {
    timer,
    session,
    nextScramble,
    onError,
    stop,
    timeSolve,
    tick: (ms: number) => (clock += ms),
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('timing session', () => {
  it('fetches a scramble when the digits first show, not before', async () => {
    const { timer, session, nextScramble } = setup()
    await flush()
    expect(nextScramble).not.toHaveBeenCalled()
    timer.getState().send({ type: 'button' })
    await vi.waitFor(() => expect(session.getState().scramble).toBe('R U1'))
  })

  it('records each solve with the scramble it was timed on, then shows a new one (FR-4.4)', async () => {
    const { session, timeSolve } = setup()
    await timeSolve(12_340)
    await timeSolve(9_870)
    const { solves, scramble } = session.getState()
    expect(solves.map((s) => [s.ms, s.penalty])).toEqual([
      [12_340, 'none'],
      [9_870, 'none'],
    ])
    expect(solves.map((s) => s.scramble)).toEqual(['R U1', 'R U2'])
    expect(scramble).toBe('R U3')
  })

  it('a failed scramble request is retried on the next timer event', async () => {
    const { timer, session, nextScramble } = setup()
    nextScramble.mockRejectedValueOnce(new Error('worker failed'))
    timer.getState().send({ type: 'button' })
    await flush()
    expect(session.getState().scramble).toBeNull()
    timer.getState().send({ type: 'button' })
    await vi.waitFor(() => expect(session.getState().scramble).toBe('R U1'))
  })

  it('Esc while running records nothing', async () => {
    const { timer, session, tick } = setup()
    timer.getState().send({ type: 'button' })
    tick(5_000)
    timer.getState().send({ type: 'escape' })
    await flush()
    expect(session.getState().solves).toEqual([])
  })

  it('changes a penalty and deletes a solve (FR-4.5)', async () => {
    const { session, timeSolve } = setup()
    await timeSolve(10_000)
    await timeSolve(11_000)
    const [a, b] = session.getState().solves
    await session.getState().setPenalty(a!.id, 'dnf')
    await session.getState().remove(b!.id)
    expect(session.getState().solves.map((s) => [s.ms, s.penalty])).toEqual([[10_000, 'dnf']])
  })

  it('the inspection switch reaches the timer', async () => {
    const { timer, session } = setup()
    await session.getState().setInspection(true)
    expect(timer.getState().timer.inspection).toBe(true)
    timer.getState().send({ type: 'button' })
    expect(timer.getState().timer.phase).toBe('inspecting')
  })

  it('solves and settings survive a reload (FR-4.6)', async () => {
    const name = `session-${++dbCount}`
    const first = setup(() => createDexieRepo(name))
    await vi.waitFor(() => expect(first.session.getState().loaded).toBe(true))
    await first.timeSolve(13_000)
    await first.session.getState().setInspection(true)
    first.stop()

    const again = setup(() => createDexieRepo(name))
    await vi.waitFor(() => expect(again.session.getState().loaded).toBe(true))
    expect(again.session.getState().solves.map((s) => s.ms)).toEqual([13_000])
    expect(again.session.getState().inspection).toBe(true)
    expect(again.timer.getState().timer.inspection).toBe(true)
  })

  it('if storage fails, solves stay in memory and the user is told once', async () => {
    const broken: SolveRepo = {
      load: () => Promise.reject(new Error('no IndexedDB')),
      add: () => Promise.reject(new Error('no')),
      setPenalty: () => Promise.reject(new Error('no')),
      remove: () => Promise.reject(new Error('no')),
      saveSettings: () => Promise.reject(new Error('no')),
    }
    const { session, onError, timeSolve } = setup(() => broken)
    await vi.waitFor(() => expect(session.getState().loaded).toBe(true))
    await timeSolve(8_000)
    await timeSolve(9_000)
    expect(session.getState().solves.map((s) => s.ms)).toEqual([8_000, 9_000])
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith('Times are kept for this visit only')
  })

  it('stops listening to the timer when stopped', async () => {
    const { session, stop, timer, tick } = setup()
    stop()
    timer.getState().send({ type: 'button' })
    tick(7_000)
    timer.getState().send({ type: 'button' })
    await flush()
    expect(session.getState().solves).toEqual([])
  })
})
