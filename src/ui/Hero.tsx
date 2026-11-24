import { useCallback, useRef } from 'react'
import type { Color } from 'three'
import { CubeStage } from './CubeStage.tsx'

/**
 * The hero from the prototype: a large LED-style CUBELAB word behind the cube, lit from one side,
 * and a soft glow that takes the colour of the centre piece facing the camera.
 */
export function Hero() {
  const hero = useRef<HTMLDivElement>(null)
  const last = useRef('')

  // Runs every frame; only touches the DOM when the colour actually changes. Only type imports
  // from three here, so three.js stays out of the first bundle.
  const onGlow = useCallback((colour: Color) => {
    const hex = colour.getHexString()
    if (hex === last.current || !hero.current) return
    last.current = hex
    hero.current.style.setProperty('--glow', `#${hex}`)
    hero.current.style.setProperty(
      '--neon-core',
      `#${colour.clone().lerp(colour.clone().setHex(0xffffff), 0.6).getHexString()}`,
    )
  }, [])

  return (
    <div ref={hero} className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <svg className="led-word" viewBox="0 0 1000 230" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ledFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: '#1d1d23' }} />
            <stop offset="0.38" style={{ stopColor: '#1d1d23' }} />
            <stop offset="0.78" style={{ stopColor: 'var(--glow)' }} />
            <stop offset="1" style={{ stopColor: 'var(--neon-core)' }} />
          </linearGradient>
          <linearGradient id="ledHalo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--glow)', stopOpacity: 0 }} />
            <stop offset="0.45" style={{ stopColor: 'var(--glow)', stopOpacity: 0 }} />
            <stop offset="1" style={{ stopColor: 'var(--glow)', stopOpacity: 1 }} />
          </linearGradient>
          <filter
            id="ledGlow"
            x="-10%"
            y="-40%"
            width="120%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="wide" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="near" />
            <feMerge>
              <feMergeNode in="wide" />
              <feMergeNode in="near" />
            </feMerge>
          </filter>
        </defs>
        <text
          x="500"
          y="175"
          textAnchor="middle"
          fontSize="210"
          textLength="960"
          lengthAdjust="spacingAndGlyphs"
          fill="url(#ledHalo)"
          filter="url(#ledGlow)"
        >
          CUBELAB
        </text>
        <text
          x="500"
          y="175"
          textAnchor="middle"
          fontSize="210"
          textLength="960"
          lengthAdjust="spacingAndGlyphs"
          fill="url(#ledFill)"
        >
          CUBELAB
        </text>
      </svg>
      <CubeStage onGlow={onGlow} />
    </div>
  )
}
