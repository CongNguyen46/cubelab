import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Group, Vector3, type Color, type Object3D } from 'three'
import { cubieId, type Cube, type Mat3 } from '../engine/index.ts'
import { TurnAnimator } from './animator.ts'
import { applyEnvironment, useRoomEnvironment } from './environment.ts'
import { CENTRE_IDS, GlowTracker } from './glow.ts'
import { CubeInteraction } from './interaction.ts'
import { roundedPosition, syncToState, type CubieView } from './turn.ts'
import { ViewController } from './view.ts'

export const MODEL_URL = '/models/cubelab_cube.glb'

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** What the page needs from the 3D view: input orientation, turn state, and view reset. */
export type CubeViewHandle = {
  /** Engine frame to view frame, one of the 24 rotations. Stops the auto-spin. */
  orientationForInput(): Mat3
  /** A layer is being dragged or snapping: keyboard turns should wait. */
  isTurning(): boolean
  /** Ease back to the starting view (white up, green front). Resolves once it is there. */
  resetView(): Promise<void>
  /** Resolves when every queued turn has played. */
  whenIdle(): Promise<void>
  /** Jump to the end of whatever is playing. */
  skip(): void
}

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
    root.attach(node)
    views.set(id, { object: node, base: node.quaternion.clone() })
  }
  return { root, views }
}

type Props = {
  cube: Cube
  turnMs?: number
  /** Called every frame with the glow colour (follows the centre facing the camera). */
  onGlow?: (colour: Color) => void
  /** Called once the cube is ready, with the handle the page uses for input. */
  onReady?: (handle: CubeViewHandle | null) => void
}

export function CubeModel({ cube, turnMs = 200, onGlow, onReady }: Props) {
  const { scene } = useGLTF(MODEL_URL)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const { root, views } = useMemo(() => buildCube(scene), [scene])
  const env = useRoomEnvironment()
  useEffect(() => applyEnvironment(root, env), [root, env])

  const view = useMemo(() => new ViewController({ reduceMotion }), [])
  const animator = useMemo(
    () => new TurnAnimator(root, views, { turnMs, reduceMotion }),
    [root, views, turnMs],
  )
  const glow = useMemo(() => new GlowTracker(), [])
  const centres = useMemo(() => CENTRE_IDS.map((id) => views.get(id)?.object), [views])

  // Start from whatever the engine holds now, then follow its events.
  useEffect(() => {
    animator.cancel()
    syncToState(views, cube.state)
    return cube.subscribe((e) => animator.handle(e))
  }, [cube, animator, views])

  const interaction = useMemo(
    () =>
      new CubeInteraction({
        dom: gl.domElement,
        camera: () => camera,
        view,
        root,
        views,
        animator,
        cube,
        reduceMotion,
      }),
    [gl, camera, view, root, views, animator, cube],
  )
  useEffect(() => interaction.attach(), [interaction])

  useEffect(() => {
    onReady?.({
      orientationForInput: () => view.orientationForInput(),
      isTurning: () => interaction.turning,
      resetView: () => view.reset(),
      whenIdle: () => animator.whenIdle(),
      skip: () => animator.skip(),
    })
    return () => onReady?.(null)
  }, [onReady, view, interaction, animator])

  useFrame((state, dt) => {
    const now = performance.now()
    view.update(Math.min(dt, 0.05))
    interaction.update(now)
    animator.update(now)
    view.group.updateMatrixWorld(true)
    onGlow?.(glow.update(centres, state.camera.position, dt, reduceMotion()))
  })

  return (
    <primitive object={view.group}>
      <primitive object={root} />
    </primitive>
  )
}

useGLTF.preload(MODEL_URL)
