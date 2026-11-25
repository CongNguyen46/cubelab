import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CHIP, MoveHistoryRow, SHOWN, TRACK } from './MoveHistory.tsx'

/** The row's markup with `n` moves in the history. */
function render(n: number) {
  const history = Array.from({ length: n }, (_, i) => (i % 2 ? 'U2' : 'R'))
  const html = renderToStaticMarkup(
    <MoveHistoryRow history={history} undoDisabled={false} onUndo={() => {}} />,
  )
  return { html, chips: (html.match(/<li /g) ?? []).length }
}

/** The markup with chip contents and counts taken out: what decides where Undo sits. */
const frame = (html: string) => html.replace(/<li [^>]*>[^<]*<\/li>/g, '')

describe('move history row (FR-1.5, FR-1.6)', () => {
  it('shows at most the last 10 chips, newest last (next to Undo)', () => {
    expect(render(3).chips).toBe(3)
    const { html, chips } = render(14)
    expect(chips).toBe(SHOWN)
    expect(html.lastIndexOf('<li')).toBeLessThan(html.indexOf('<button'))
  })

  it('has no Reset button', () => {
    expect(render(5).html).not.toMatch(/Reset/i)
  })

  it('Undo stays in one place as the history shrinks: the same fixed track, then Undo', () => {
    const frames = [12, 10, 9, 5, 1].map((n) => frame(render(n).html))
    expect(new Set(frames).size).toBe(1)
    // Fixed width at both sizes, right-aligned, never wraps.
    for (const c of ['w-[268px]', 'sm:w-[452px]', 'justify-end', 'overflow-hidden', 'shrink-0']) {
      expect(TRACK).toContain(c)
    }
    expect(TRACK).not.toContain('flex-wrap')
    // Every chip has one fixed width, so U and U2 take the same room.
    expect(CHIP).toContain('w-[38px]')
  })

  it('with no history Undo fades out but keeps its place', () => {
    const tags = (html: string) =>
      frame(html)
        .match(/<\/?\w+/g)!
        .join('')
    const empty = render(0).html
    expect(tags(empty)).toBe(tags(render(4).html))
    expect(empty).toContain('pointer-events-none opacity-0')
    expect(empty).toContain('aria-hidden="true"')
    expect(render(4).html).not.toContain('opacity-0')
  })
})
