# CubeLab design system (v0.3)

Source of truth for look and feel. Brand canvas: https://claude.ai/artifact/LVd2gKju5u7rWWMRqWRbkq
Working reference: `prototype/index.html` (the "CubeLab dark minimal" homepage).
Where the canvas and the prototype disagree, **the prototype wins** (see "Changes since the canvas").

## Direction

Dark, minimal, one accent. Black page, a lit 3D cube as the hero, almost no chrome. Motion is quick and eased, never bouncy.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#000000` | Page background (prototype). Canvas value `#09090B` is fine for panels |
| `surface` | `#111113` | Buttons, menus, cards |
| `surface-2` | `#18181B` | Hover, raised surfaces |
| `border` | `#27272A` | 1px lines and button borders |
| `text` | `#FAFAFA` | Primary text |
| `text-muted` | `#A1A1AA` | Secondary text |
| `text-subtle` | `#8A8A93` | Hints, captions, idle timer digits |
| `accent` (Lab Orange) | `#FF6A1A` | Solve button, logo slot, key hints, running timer, move counts |
| `accent-line` | `#FF6A1A` at 40% | Accent borders |
| `accent-soft` | `#FF6A1A` at 12% | Accent tints |
| `success` (mint) | `#7EE8C0` | Solve done state, timer "ready" state |

Cube sticker colours (standard scheme):

| Face | Colour | Hex |
| --- | --- | --- |
| U | White | `#F5F5F1` |
| D | Yellow | `#FFE01A` |
| F | Green | `#2FCF5A` |
| B | Blue | `#1B6BFF` |
| R | Red | `#F0232C` |
| L | Orange | `#FF8A1C` |

## Type

- **Geist** 600 for headings and buttons, 400 for body.
- **Geist Mono** for notation, timer digits, move counts and key hints.
- Timer digits: Geist Mono 30px, tabular, format `00.00`, `m:ss.cc` after 60 s.

## Logo: Grid C v0.2

A 3x3 grid on a 100-unit box: cell 26, gap 7, outer corner radius 4.5, inner radius 11 (the corners that face the centre are rounder). The cell at column 2, row 1 is an empty slot drawn as a dashed Lab Orange outline: the missing piece. Wordmark "Cube" in text colour plus "Lab" in `text-subtle`. Favicon at 16px uses plain corners. Files: `public/brand/logo-mark.svg`, `logo-mark-on-light.svg`, `favicon.svg`.

## Buttons

- Default: `surface` fill, 1px `border`, `text` label, radius 999 (pill), height about 40px.
- Primary (Solve): Lab Orange fill, near-black label. Click runs the loading-to-done animation (based on Lucian #438, MIT, credit Seokwoooo): label morphs to a spinner while solving, then a mint check with a ring pulse, then back to idle. Width animates; measure it only on click and reset to auto afterwards (pinning width at load collapsed the button once).
- Disabled while an animation plays.

## Homepage layout

1. Header: logo left, hamburger right. Hamburger opens a full-screen menu: Play, Cube Builder, Learn, Advanced (Coming soon), Settings, How CubeLab works, GitHub.
2. Hero: a large LED-style "CUBELAB" word behind the cube (solid fill, lit from one side with a soft halo, not a neon outline), a soft glow behind the cube that takes the colour of the centre piece facing the camera, then the cube with a faded floor reflection.
3. Under the cube: one line that holds either the hint "Hold [Space] to start the timer" (Space key chip in orange) or the timer digits, or "Solved in N moves" with N in orange.
4. Buttons: Scramble, Solve, Timer. Move history chips and Undo below.

## Motion

- Ease `cubic-bezier(.2,.8,.2,1)` everywhere.
- UI transitions 150 to 400 ms. Respect `prefers-reduced-motion`.
- Face turn about 200 ms; scramble and solve play faster and continuous.
- Glow follows the front centre with hysteresis 0.12 and a frame-rate-independent blend `1 - 0.002^dt`.

## Changes since the canvas

- Solve is now **orange-filled**. The canvas still says orange never fills a button; ignore that rule for Solve only.
- Timer is inline digits, not a slide-in panel.
- Page background is pure black `#000`.
