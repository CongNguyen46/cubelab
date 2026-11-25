import { useEffect } from 'react'
import { isActive, isShown, useTimerStore } from './timer/index.ts'
import { useCubeStore } from './ui/cubeStore.ts'
import { Header } from './ui/Header.tsx'
import { Hero } from './ui/Hero.tsx'
import { HintLine } from './ui/HintLine.tsx'
import { Menu, Toast } from './ui/Menu.tsx'
import { MoveHistory } from './ui/MoveHistory.tsx'
import { PillButton } from './ui/PillButton.tsx'
import { usePlayStore, warmUpSolverWhenIdle } from './ui/playStore.ts'
import { SessionPanel } from './ui/SessionPanel.tsx'
import { useSessionStore } from './ui/sessionStore.ts'
import { SolveButton } from './ui/SolveButton.tsx'
import { ScrambleIcon, TimerIcon } from './ui/icons.tsx'
import { useCubeKeys } from './ui/useCubeKeys.ts'
import { useTimerKeys } from './ui/useTimerKeys.ts'

export function App() {
  useCubeKeys()
  useTimerKeys()
  useEffect(() => warmUpSolverWhenIdle(), [])
  useEffect(() => useSessionStore.getState().start(), [])

  const mode = usePlayStore((s) => s.mode)
  const solvePhase = usePlayStore((s) => s.solvePhase)
  const scramble = usePlayStore((s) => s.scramble)
  const solve = usePlayStore((s) => s.solve)
  const solved = useCubeStore((s) => s.solved)
  const timer = useTimerStore((s) => s.timer)
  const sendTimer = useTimerStore((s) => s.send)
  // Scramble and Solve wait while the timer is held or running.
  const timing = isActive(timer)

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-col items-center px-4 pb-7">
        <Hero />
        <HintLine />
        <div className="mt-[18px] flex flex-wrap justify-center gap-3">
          {/* While a scramble plays, tapping Scramble again skips to the end (FR-2.2). */}
          <PillButton
            icon={<ScrambleIcon />}
            onClick={() => void scramble()}
            disabled={mode === 'solving' || timing}
            aria-label={mode === 'scrambling' ? 'Skip to the scrambled cube' : 'Scramble'}
          >
            Scramble
          </PillButton>
          {/* While a solve plays, tapping Solve again skips to solved (FR-3.3). */}
          <SolveButton
            phase={solvePhase}
            disabled={
              timing ||
              mode === 'scrambling' ||
              (mode === 'idle' && solvePhase === 'idle' && solved)
            }
            disabledReason={
              timing
                ? 'Stop the timer first'
                : solved
                  ? 'Already solved'
                  : 'Wait for the scramble to finish'
            }
            onClick={() => void solve()}
          />
          {/* Timer button cycles start, stop, hide (FR-4.1). */}
          <PillButton
            icon={<TimerIcon />}
            onClick={() => sendTimer({ type: 'button' })}
            disabled={mode !== 'idle'}
            aria-pressed={isShown(timer)}
          >
            Timer
          </PillButton>
        </div>
        <MoveHistory />
        <SessionPanel />
      </main>
      <Menu />
      <Toast />
    </div>
  )
}
