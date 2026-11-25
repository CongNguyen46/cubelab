import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createDexieRepo, createMemoryRepo, type NewSolve, type SolveRepo } from './repo.ts'

const solve = (ms: number, at: number): NewSolve => ({
  sessionId: 0,
  ms,
  penalty: 'none',
  scramble: "R U R' U'",
  at,
})

let dbCount = 0
const opened: { close(): void }[] = []
const dexie = (name = `test-${++dbCount}`) => {
  const repo = createDexieRepo(name)
  opened.push(repo)
  return repo
}

afterEach(() => {
  opened.splice(0).forEach((r) => r.close())
})

describe.each<[string, () => SolveRepo]>([
  ['Dexie', () => dexie()],
  ['memory', createMemoryRepo],
])('%s repo', (_, make) => {
  it('starts empty with default settings', async () => {
    const { solves, settings } = await make().load()
    expect(solves).toEqual([])
    expect(settings).toEqual({ inspection: false })
  })

  it('adds, changes the penalty of and deletes solves', async () => {
    const repo = make()
    const { sessionId } = await repo.load()
    const a = await repo.add({ ...solve(12_340, 2), sessionId })
    const b = await repo.add({ ...solve(9_870, 1), sessionId })
    await repo.setPenalty(a, 'plus2')
    let { solves } = await repo.load()
    // Oldest first.
    expect(solves.map((s) => [s.id, s.ms, s.penalty])).toEqual([
      [b, 9_870, 'none'],
      [a, 12_340, 'plus2'],
    ])
    await repo.remove(b)
    ;({ solves } = await repo.load())
    expect(solves.map((s) => s.id)).toEqual([a])
    expect(solves[0]!.scramble).toBe("R U R' U'")
  })

  it('saves the settings', async () => {
    const repo = make()
    await repo.saveSettings({ inspection: true })
    expect((await repo.load()).settings).toEqual({ inspection: true })
  })
})

describe('Dexie repo across visits (FR-4.6)', () => {
  it('a reopened database has the same session, solves and settings', async () => {
    const first = dexie('visits')
    const { sessionId } = await first.load()
    await first.add({ ...solve(11_110, 1), sessionId })
    await first.saveSettings({ inspection: true })
    first.close()

    const again = await dexie('visits').load()
    expect(again.sessionId).toBe(sessionId)
    expect(again.solves.map((s) => s.ms)).toEqual([11_110])
    expect(again.settings.inspection).toBe(true)
  })
})
