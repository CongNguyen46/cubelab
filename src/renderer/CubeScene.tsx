import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useLayoutEffect, useRef } from 'react'
import { ACESFilmicToneMapping, Color, MathUtils, Vector3, type SpotLight } from 'three'
import type { Cube } from '../engine/index.ts'
import { CubeModel, type CubeViewHandle } from './CubeModel.tsx'
import { Floor } from './Floor.tsx'

// Camera direction from the prototype. Distance is worked out from the canvas size.
const CAM_DIR = new Vector3(6.4, 3.6, 7.6).normalize()
// The cube's corners reach about 2.7 units from the centre at any tilt; 2.95 leaves a margin.
const FIT_RADIUS = 2.95
const FOV = 27

// The prototype used three r147 legacy lighting. Current three uses physical units, so
// light intensities are multiplied by PI to keep the same look.
const PI = Math.PI
const WHITE = new Color(0xffffff)

function FitCamera() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useLayoutEffect(() => {
    if (!('fov' in camera)) return
    const aspect = size.width / size.height
    const half = MathUtils.degToRad(camera.fov / 2)
    // Fit the narrower of the two directions so a tilted cube never clips.
    const halfMin = Math.min(half, Math.atan(Math.tan(half) * aspect))
    camera.position.copy(CAM_DIR).multiplyScalar(FIT_RADIUS / Math.sin(halfMin))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

type Props = {
  cube: Cube
  /** Glow colour every frame, for the page's CSS glow and LED word. */
  onGlow?: (colour: Color) => void
  onReady?: (handle: CubeViewHandle | null) => void
}

export default function CubeScene({ cube, onGlow, onReady }: Props) {
  const rimA = useRef<SpotLight>(null)
  const rimB = useRef<SpotLight>(null)

  // Rim lights take the glow colour mixed 35% with white, as in the prototype.
  const handleGlow = useCallback(
    (colour: Color) => {
      rimA.current?.color.copy(colour).lerp(WHITE, 0.35)
      rimB.current?.color.copy(colour).lerp(WHITE, 0.35)
      onGlow?.(colour)
    },
    [onGlow],
  )

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 0.86
        gl.setClearColor(0x000000, 0)
      }}
      aria-label="3D Rubik's cube. Drag a face to turn it, drag empty space to turn the whole cube, double-click to reset the view. Keys: R L U D F B, M E S, X Y Z, Shift for prime."
      role="img"
      style={{ cursor: 'grab' }}
    >
      <FitCamera />
      <directionalLight position={[-4, 7, 6]} intensity={1.05 * PI} />
      <directionalLight position={[5, 2, 6]} intensity={0.2 * PI} />
      <spotLight
        ref={rimA}
        position={[3.5, 3, -6]}
        intensity={3.2 * PI}
        distance={20}
        angle={0.5}
        penumbra={0.8}
        decay={1.2}
      />
      <spotLight
        ref={rimB}
        position={[-5, 1.5, -4.5]}
        intensity={2.2 * PI}
        distance={20}
        angle={0.6}
        penumbra={0.9}
        decay={1.2}
      />
      <ambientLight intensity={0.06 * PI} />
      <Suspense fallback={null}>
        <CubeModel cube={cube} onGlow={handleGlow} onReady={onReady} />
        <Floor />
      </Suspense>
    </Canvas>
  )
}
