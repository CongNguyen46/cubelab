import { useEffect, useMemo } from 'react'
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, type ShaderMaterial } from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

/** Floor height: low enough that a tilted cube floats clear of it. */
export const FLOOR_Y = -2.75

// The prototype's reflection shader: the mirror fades out with distance from the centre, so
// only the cube shows. Tone mapping and colour space are applied here because the reflection is
// rendered into a linear render target.
const mirrorShader = {
  name: 'FadingReflector',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vPos;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vPos = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    varying vec2 vPos;
    void main() {
      vec4 base = texture2DProj(tDiffuse, vUv);
      float a = (1.0 - smoothstep(0.6, 3.8, length(vPos))) * 0.32;
      gl_FragColor = vec4(base.rgb * color, a * base.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}

function radialTexture(stops: [number, string][]) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  for (const [o, col] of stops) gr.addColorStop(o, col)
  g.fillStyle = gr
  g.fillRect(0, 0, 256, 256)
  return new CanvasTexture(c)
}

/** Faded mirror floor plus a soft contact shadow, as in the prototype. */
export function Floor() {
  const mirror = useMemo(() => {
    const m = new Reflector(new PlaneGeometry(9, 9), {
      clipBias: 0.003,
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0xffffff,
      shader: mirrorShader,
    })
    const mat = m.material as ShaderMaterial
    mat.transparent = true
    mat.depthWrite = false
    m.rotation.x = -Math.PI / 2
    m.position.y = FLOOR_Y
    return m
  }, [])

  const shadow = useMemo(() => {
    const map = radialTexture([
      [0, 'rgba(0,0,0,0.7)'],
      [0.5, 'rgba(0,0,0,0.3)'],
      [1, 'rgba(0,0,0,0)'],
    ])
    const s = new Mesh(
      new PlaneGeometry(6.5, 6.5),
      new MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
    )
    s.rotation.x = -Math.PI / 2
    s.position.y = FLOOR_Y + 0.01
    return s
  }, [])

  useEffect(
    () => () => {
      mirror.dispose()
      shadow.geometry.dispose()
      shadow.material.map?.dispose()
      shadow.material.dispose()
    },
    [mirror, shadow],
  )

  return (
    <>
      <primitive object={mirror} />
      <primitive object={shadow} />
    </>
  )
}
