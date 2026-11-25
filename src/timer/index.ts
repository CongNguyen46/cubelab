// Timer: the inline timer from the design (FR-4). machine.ts is the pure state machine,
// ported from the prototype; the store and components drive it with performance.now().
export { digitsText, formatResult, formatTime } from './format.ts'
export {
  displayMs,
  initialTimer,
  isActive,
  isInspecting,
  isShown,
  timerReducer,
  type InspectStage,
  type Penalty,
  type TimerEvent,
  type TimerPhase,
  type TimerResult,
  type TimerState,
} from './machine.ts'
export { createTimerStore, useTimerStore } from './store.ts'
export { averageOf, sessionStats, type SessionStats, type Stat } from './stats.ts'
