// Timer: the inline timer from the design (FR-4). machine.ts is the pure state machine,
// ported from the prototype; the store and components drive it with performance.now().
export { formatTime } from './format.ts'
export {
  displayMs,
  initialTimer,
  isActive,
  isShown,
  timerReducer,
  type TimerEvent,
  type TimerPhase,
  type TimerResult,
  type TimerState,
} from './machine.ts'
