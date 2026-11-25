// Storage: IndexedDB through Dexie for solve history (FR-4.6, NFR-9).
export {
  createDexieRepo,
  createMemoryRepo,
  defaultSettings,
  type NewSolve,
  type Settings,
  type Solve,
  type SolveRepo,
} from './repo.ts'
