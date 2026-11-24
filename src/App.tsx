import { useEffect } from 'react'
import { useCubeStore } from './ui/cubeStore.ts'
import { Header } from './ui/Header.tsx'
import { Hero } from './ui/Hero.tsx'
import { HintLine } from './ui/HintLine.tsx'
import { Menu, Toast } from './ui/Menu.tsx'
import { MoveHistory } from './ui/MoveHistory.tsx'
import { PillButton } from './ui/PillButton.tsx'
import { usePlayStore, warmUpSolverWhenIdle } from './ui/playStore.ts'
import { SolveButton } from './ui/SolveButton.tsx'
import { ScrambleIcon, TimerIcon } from './ui/icons.tsx'
import { useCubeKeys } from './ui/useCubeKeys.ts'

export function App() {
  useCubeKeys()
  useEffect(() => warmUpSolverWhenIdle(), [])

  const mode = usePlayStore((s) => s.mode)
  const solvePhase = usePlayStore((s) => s.solvePhase)
  const scramble = usePlayStore((s) => s.scramble)
  const solve = usePlayStore((s) => s.solve)
  const solved = useCubeStore((s) => s.solved)

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
            disabled={mode === 'solving'}
            aria-label={mode === 'scrambling' ? 'Skip to the scrambled cube' : 'Scramble'}
          >
            Scramble
          </PillButton>
          {/* While a solve plays, tapping Solve again skips to solved (FR-3.3). */}
          <SolveButton
            phase={solvePhase}
            disabled={mode === 'scrambling' || (mode === 'idle' && solvePhase === 'idle' && solved)}
            disabledReason={solved ? 'Already solved' : 'Wait for the scramble to finish'}
            onClick={() => void solve()}
          />
          {/* The timer arrives in Sprint 3. */}
          <PillButton icon={<TimerIcon />} disabled>
            Timer
          </PillButton>
        </div>
        <MoveHistory />
      </main>
      <Menu />
      <Toast />
    </div>
  )
}
