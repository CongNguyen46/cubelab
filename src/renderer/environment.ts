import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Mesh, MeshStandardMaterial, PMREMGenerator, type Object3D, type Texture } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Prefiltered reflections from three's RoomEnvironment, as in the prototype. */
export function useRoomEnvironment(): Texture {
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
  return env
}

/**
 * Give every standard material its own envMap with the prototype's low intensity.
 * Setting it per material matters: with only scene.environment, current three.js replaces
 * each material's envMapIntensity with scene.environmentIntensity, and the tiles wash out.
 */
export function applyEnvironment(root: Object3D, env: Texture) {
  root.traverse((m) => {
    if (m instanceof Mesh && m.material instanceof MeshStandardMaterial) {
      m.material.envMap = env
      m.material.envMapIntensity = m.material.name === 'Body' ? 0.2 : 0.35
      m.material.needsUpdate = true
    }
  })
}
