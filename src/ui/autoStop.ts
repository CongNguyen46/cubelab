import { isSolved, type Cube } from '../engine/index.ts'
import type { TimerState } from '../timer/index.ts'

type TimerApi = {
  getState(): { timer: TimerState; send(input: { type: 'solved' }): void }
  subscribe(listener: (s: { timer: TimerState }, prev: { timer: TimerState }) => void): () => void
}

/**
 * Auto-stop: if the cube was unsolved when the timer started and becomes solved during the run,
 * stop the timer at once. The engine reports each move as it is applied (before its animation
 * plays), so the time is taken when the last move lands in the engine. Returns a stop function.
 */
export function watchAutoStop({ cube, timer }: { cube: Cube; timer: TimerApi }) {
  let armed = false
  const offTimer = timer.subscribe((s, prev) => {
    const running = s.timer.phase === 'running'
    if (running && prev.timer.phase !== 'running') armed = !isSolved(cube.state)
    else if (!running) armed = false
  })
  const offCube = cube.subscribe(() => {
    if (!armed || !isSolved(cube.state)) return
    armed = false
    timer.getState().send({ type: 'solved' })
  })
  return () => {
    offTimer()
    offCube()
  }
}
