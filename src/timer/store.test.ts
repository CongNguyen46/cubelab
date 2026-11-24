import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimerStore } from './store.ts'

describe('timer store', () => {
  let clock = 0
  beforeEach(() => {
    vi.useFakeTimers()
    clock = 0
  })
  afterEach(() => vi.useRealTimers())

  const make = () => createTimerStore(() => clock)
  const advance = async (ms: number) => {
    clock += ms
    await vi.advanceTimersByTimeAsync(ms)
  }

  it('shows grey at 150 ms and mint at 400 ms on its own, then times the solve', async () => {
    const store = make()
    const results: number[] = []
    store.getState().onResult((r) => results.push(r.ms))
    store.getState().send({ type: 'press' })
    await advance(149)
    expect(store.getState().timer.phase).toBe('pressing')
    await advance(1)
    expect(store.getState().timer.phase).toBe('hold')
    await advance(250)
    expect(store.getState().timer.phase).toBe('ready')
    await advance(100)
    store.getState().send({ type: 'release' })
    expect(store.getState().timer.phase).toBe('running')
    await advance(12_340)
    store.getState().send({ type: 'press' })
    store.getState().send({ type: 'release' })
    expect(store.getState().timer.phase).toBe('stopped')
    expect(results).toEqual([12_340])
  })

  it('a quick tap leaves nothing scheduled and nothing shown', async () => {
    const store = make()
    store.getState().send({ type: 'press' })
    await advance(80)
    store.getState().send({ type: 'release' })
    await advance(1000)
    expect(store.getState().timer.phase).toBe('hidden')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('Esc while running discards the solve: no result', async () => {
    const store = make()
    const listener = vi.fn()
    const stop = store.getState().onResult(listener)
    store.getState().send({ type: 'button' })
    await advance(5000)
    store.getState().send({ type: 'escape' })
    expect(store.getState().timer.phase).toBe('hidden')
    expect(listener).not.toHaveBeenCalled()
    stop()
  })

  it('unsubscribed listeners hear nothing', async () => {
    const store = make()
    const listener = vi.fn()
    store.getState().onResult(listener)()
    store.getState().send({ type: 'button' })
    await advance(1000)
    store.getState().send({ type: 'button' })
    expect(listener).not.toHaveBeenCalled()
  })
})
