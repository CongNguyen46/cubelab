import { describe, expect, it } from 'vitest'
import { FACES } from './index.ts'

describe('engine', () => {
  it('lists the six faces once each, in the order the code uses', () => {
    expect(FACES).toEqual(['R', 'L', 'U', 'D', 'F', 'B'])
    expect(new Set(FACES).size).toBe(6)
  })
})
