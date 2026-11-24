import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, Color, MathUtils, PMREMGenerator, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Cube } from '../engine/index.ts'
import { CubeModel } from './CubeModel.tsx'

// Camera direction from the prototype. Distance is worked out from the canvas size.
const CAM_DIR = new Vector3(6.4, 3.6, 7.6).normalize()
// The cube's corners reach about 2.7 units from the centre at any tilt; 2.95 leaves a margin.
const FIT_RADIUS = 2.95
const FOV = 27

// The prototype used three r147 legacy lighting. Current three uses physical units, so
// light intensities are multiplied by PI to keep the same look.
const PI = Math.PI
// Rim lights take the glow colour (green front centre for now) mixed 35% with white.
const RIM = new Color(0x2fcf5a).lerp(new Color(0xffffff), 0.35)

/** Reflections from three's RoomEnvironment, attached as scene.environment. */
function RoomLighting() {
  const gl = useThree((s) => s.gl)
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const texture = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    pmrem.dispose()
    return texture
  }, [gl])
  useEffect(() => () => env.dispose(), [env])
  return <primitive object={env} attach="environment" />
}

function FitCamera() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useLayoutEffect(() => {
    if (!('fov' in camera)) return
    const aspect = size.width / size.height
    const half = MathUtils.degToRad(camera.fov / 2)
    const halfMin = Math.min(half, Math.atan(Math.tan(half) * aspect))
    camera.position.copy(CAM_DIR).multiplyScalar(FIT_RADIUS / Math.sin(halfMin))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export default function CubeScene({ cube }: { cube: Cube }) {
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
      aria-label="3D Rubik's cube. Use the keyboard to turn it: R L U D F B, M E S, X Y Z, Shift for prime."
      role="img"
    >
      <FitCamera />
      <RoomLighting />
      <directionalLight position={[-4, 7, 6]} intensity={1.05 * PI} />
      <directionalLight position={[5, 2, 6]} intensity={0.2 * PI} />
      <spotLight
        position={[3.5, 3, -6]}
        intensity={3.2 * PI}
        distance={20}
        angle={0.5}
        penumbra={0.8}
        decay={1.2}
        color={RIM}
      />
      <spotLight
        position={[-5, 1.5, -4.5]}
        intensity={2.2 * PI}
        distance={20}
        angle={0.6}
        penumbra={0.9}
        decay={1.2}
        color={RIM}
      />
      <ambientLight intensity={0.06 * PI} />
      <Suspense fallback={null}>
        <CubeModel cube={cube} />
      </Suspense>
    </Canvas>
  )
}
