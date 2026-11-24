import { Component, lazy, Suspense, type ReactNode } from 'react'
import type { Color } from 'three'
import { useCubeStore } from './cubeStore.ts'
import { useUiStore } from './uiStore.ts'

// three.js and the scene load after the first paint, keeping the first bundle small (NFR-2).
const CubeScene = lazy(() => import('../renderer/CubeScene.tsx'))

function Message({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6 text-center text-text-subtle">
      {children}
    </div>
  )
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <Message>
          The 3D cube could not load here. Open the page in a recent Chrome, Safari or Firefox.
        </Message>
      )
    }
    return this.props.children
  }
}

/** The 3D cube. `onGlow` receives the glow colour every frame. */
export function CubeStage({ onGlow }: { onGlow?: (colour: Color) => void }) {
  const cube = useCubeStore((s) => s.cube)
  const setView = useUiStore((s) => s.setView)
  return (
    <div className="relative h-[clamp(380px,70vh,760px)] w-[min(900px,100%)] touch-none">
      <SceneErrorBoundary>
        <Suspense fallback={<Message>Loading the cube…</Message>}>
          <CubeScene cube={cube} onGlow={onGlow} onReady={setView} />
        </Suspense>
      </SceneErrorBoundary>
    </div>
  )
}
