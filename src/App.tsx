import { Header } from './ui/Header.tsx'
import { PillButton } from './ui/PillButton.tsx'
import { ScrambleIcon, SolveIcon, TimerIcon } from './ui/icons.tsx'

// Sprint 0 placeholder. The real hero (3D cube, LED word, glow) arrives in Sprint 1.
export function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <div
          aria-hidden="true"
          className="grid aspect-square w-[min(60vw,320px)] place-items-center rounded-3xl border border-dashed border-border text-sm text-text-subtle"
        >
          Cube goes here
        </div>
        <p className="m-0 text-center font-mono text-[15px] font-medium text-text-subtle">
          Hold{' '}
          <span className="mx-0.5 inline-block rounded-md border border-accent-line px-[7px] py-0.5 text-[13px] leading-[1.3] text-accent">
            Space
          </span>{' '}
          to start the timer
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PillButton icon={<ScrambleIcon />}>Scramble</PillButton>
          <PillButton variant="primary" icon={<SolveIcon />}>
            Solve
          </PillButton>
          <PillButton icon={<TimerIcon />}>Timer</PillButton>
        </div>
      </main>
    </div>
  )
}
