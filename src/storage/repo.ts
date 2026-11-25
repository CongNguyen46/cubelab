import Dexie, { type EntityTable } from 'dexie'
import type { Penalty } from '../timer/machine.ts'

/** One timed solve, as saved. `ms` is the raw time; the penalty is applied when shown. */
export type Solve = {
  id: number
  sessionId: number
  ms: number
  penalty: Penalty
  /** The scramble shown when the solve started, in notation. Empty if none was ready. */
  scramble: string
  /** When it finished, ms since the epoch. */
  at: number
}

export type NewSolve = Omit<Solve, 'id'>

type Session = { id: number; name: string; createdAt: number }
type Setting = { key: string; value: unknown }

export type Settings = { inspection: boolean }
export const defaultSettings: Settings = { inspection: false }

/** What the session needs from storage, so tests and the fallback can swap it. */
export interface SolveRepo {
  /** The current session's id and its solves, oldest first, plus the settings. */
  load(): Promise<{ sessionId: number; solves: Solve[]; settings: Settings }>
  add(solve: NewSolve): Promise<number>
  setPenalty(id: number, penalty: Penalty): Promise<void>
  remove(id: number): Promise<void>
  saveSettings(settings: Settings): Promise<void>
}

class CubeLabDb extends Dexie {
  sessions!: EntityTable<Session, 'id'>
  solves!: EntityTable<Solve, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name: string) {
    super(name)
    // Indexed fields only; the rest of each record is stored as is.
    this.version(1).stores({
      sessions: '++id, createdAt',
      solves: '++id, sessionId, at',
      settings: 'key',
    })
  }
}

/** Solves in IndexedDB through Dexie (FR-4.6). One session for now; the schema allows more. */
export function createDexieRepo(name = 'cubelab'): SolveRepo & { close(): void } {
  const db = new CubeLabDb(name)

  const currentSession = async () => {
    const latest = await db.sessions.orderBy('createdAt').last()
    if (latest) return latest.id
    return db.sessions.add({ name: 'Session 1', createdAt: Date.now() } as Session)
  }

  return {
    async load() {
      const sessionId = await currentSession()
      const solves = await db.solves.where('sessionId').equals(sessionId).sortBy('at')
      const saved = await db.settings.get('settings')
      const settings = { ...defaultSettings, ...(saved?.value as Partial<Settings> | undefined) }
      return { sessionId, solves, settings }
    },
    add: (solve) => db.solves.add(solve as Solve),
    async setPenalty(id, penalty) {
      await db.solves.update(id, { penalty })
    },
    remove: (id) => db.solves.delete(id),
    async saveSettings(settings) {
      await db.settings.put({ key: 'settings', value: settings })
    },
    close: () => db.close(),
  }
}

/** Keeps solves in memory only: the fallback when IndexedDB is unavailable, and for tests. */
export function createMemoryRepo(): SolveRepo {
  let solves: Solve[] = []
  let settings = defaultSettings
  let nextId = 1
  return {
    load: async () => ({ sessionId: 1, solves: [...solves].sort((a, b) => a.at - b.at), settings }),
    async add(solve) {
      const id = nextId++
      solves.push({ ...solve, id })
      return id
    },
    async setPenalty(id, penalty) {
      solves = solves.map((s) => (s.id === id ? { ...s, penalty } : s))
    },
    async remove(id) {
      solves = solves.filter((s) => s.id !== id)
    },
    async saveSettings(next) {
      settings = next
    },
  }
}
