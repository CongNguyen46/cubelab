import { CubeStage } from './ui/CubeStage.tsx'
import { Header } from './ui/Header.tsx'
import { MoveHistory } from './ui/MoveHistory.tsx'
import { PillButton } from './ui/PillButton.tsx'
import { ScrambleIcon, SolveIcon, TimerIcon } from './ui/icons.tsx'
import { useCubeKeys } from './ui/useCubeKeys.ts'

export function App() {
  useCubeKeys()
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-col items-center px-4 pb-7">
        <CubeStage />
        <div className="mt-1 grid h-11 place-items-center">
          <p className="m-0 text-center font-mono text-[15px] font-medium text-text-subtle">
            Hold{' '}
            <span className="mx-0.5 inline-block rounded-md border border-accent-line px-[7px] py-0.5 text-[13px] leading-[1.3] text-accent">
              Space
            </span>{' '}
            to start the timer
          </p>
        </div>
        {/* Scramble and Solve arrive in Sprint 2, the timer in Sprint 3. */}
        <div className="mt-[18px] flex flex-wrap justify-center gap-3">
          <PillButton icon={<ScrambleIcon />} disabled>
            Scramble
          </PillButton>
          <PillButton variant="primary" icon={<SolveIcon />} disabled>
            Solve
          </PillButton>
          <PillButton icon={<TimerIcon />} disabled>
            Timer
          </PillButton>
        </div>
        <MoveHistory />
      </main>
    </div>
  )
}
