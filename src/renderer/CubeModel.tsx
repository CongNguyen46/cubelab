import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { cubieId, type Cube } from '../engine/index.ts'
import { TurnAnimator } from './animator.ts'
import { roundedPosition, syncToState, type CubieView } from './turn.ts'

export const MODEL_URL = '/models/cubelab_cube.glb'

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Builds the cube from the GLB. Node names are in Blender's Z-up frame, so they are ignored:
 * each cubie is identified by its rounded world position after load, as in the prototype.
 */
function buildCube(scene: Object3D) {
  const source = scene.clone(true)
  source.updateMatrixWorld(true)
  const root = new Group()
  const views = new Map<number, CubieView>()
  const nodes: Object3D[] = []
  source.traverse((o) => {
    if (o.name.startsWith('Cubie')) nodes.push(o)
  })
  const p = new Vector3()
  for (const node of nodes) {
    const id = cubieId(roundedPosition(node.getWorldPosition(p)))
    node.traverse((m) => {
      if (m instanceof Mesh && m.material instanceof MeshStandardMaterial) {
        m.material.envMapIntensity = m.material.name === 'Body' ? 0.2 : 0.35
      }
    })
    root.attach(node)
    views.set(id, { object: node, base: node.quaternion.clone() })
  }
  return { root, views }
}

export function CubeModel({ cube, turnMs = 200 }: { cube: Cube; turnMs?: number }) {
  const { scene } = useGLTF(MODEL_URL)
  const { root, views } = useMemo(() => buildCube(scene), [scene])
  const animator = useMemo(
    () => new TurnAnimator(root, views, { turnMs, reduceMotion }),
    [root, views, turnMs],
  )

  useEffect(() => {
    // Start from whatever the engine holds now, then follow its events.
    animator.cancel()
    syncToState(views, cube.state)
    return cube.subscribe((e) => animator.handle(e))
  }, [cube, animator, views])

  useFrame(() => animator.update(performance.now()))

  return <primitive object={root} />
}

useGLTF.preload(MODEL_URL)
