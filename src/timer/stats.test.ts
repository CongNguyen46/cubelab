import { describe, expect, it } from 'vitest'
import type { Penalty } from './machine.ts'
import { averageOf, best, effectiveMs, mean, sessionStats } from './stats.ts'

const t = (ms: number, penalty: Penalty = 'none') => ({ ms, penalty })
const ok = (...ms: number[]) => ms.map((m) => t(m))

describe('session statistics (FR-4.5)', () => {
  it('a +2 counts two seconds more and a DNF is infinitely slow', () => {
    expect(effectiveMs(t(10_000))).toBe(10_000)
    expect(effectiveMs(t(10_000, 'plus2'))).toBe(12_000)
    expect(effectiveMs(t(10_000, 'dnf'))).toBe(Infinity)
  })

  it('nothing yet: every stat is empty', () => {
    expect(sessionStats([])).toEqual({ best: null, mean: null, ao5: null, ao12: null })
  })

  it('best and mean skip DNFs', () => {
    const solves = [t(12_000), t(9_000, 'dnf'), t(10_000, 'plus2'), t(15_000)]
    expect(best(solves)).toBe(12_000)
    expect(mean(solves)).toBe(13_000)
  })

  it('best and mean of only DNFs are DNF', () => {
    expect(best([t(1, 'dnf')])).toBe('dnf')
    expect(mean([t(1, 'dnf')])).toBe('dnf')
  })

  it('ao5 drops the best and worst of five and averages the other three', () => {
    // FR-4 acceptance: 10, 11, 12, 13, 20 -> (11 + 12 + 13) / 3 = 12
    expect(averageOf(5, ok(10_000, 13_000, 20_000, 11_000, 12_000))).toBe(12_000)
  })

  it('ao5 needs five solves and uses the last five', () => {
    expect(averageOf(5, ok(1, 2, 3, 4))).toBeNull()
    expect(averageOf(5, ok(99_000, 10_000, 11_000, 12_000, 13_000, 14_000))).toBe(12_000)
  })

  it('one DNF in five is dropped as the worst; two make a DNF', () => {
    const one = [...ok(10_000, 11_000, 12_000, 13_000), t(5_000, 'dnf')]
    expect(averageOf(5, one)).toBe(12_000)
    const two = [...ok(10_000, 11_000, 12_000), t(5_000, 'dnf'), t(6_000, 'dnf')]
    expect(averageOf(5, two)).toBe('dnf')
  })

  it('a +2 is counted in the average', () => {
    const solves = [...ok(10_000, 11_000, 12_000, 30_000), t(11_000, 'plus2')]
    // effective 10, 11, 12, 13, 30 -> 12
    expect(averageOf(5, solves)).toBe(12_000)
  })

  it('ao12 drops one best and one worst of twelve', () => {
    const solves = ok(1_000, ...Array.from({ length: 10 }, () => 10_000), 50_000)
    expect(averageOf(12, solves)).toBe(10_000)
    expect(averageOf(12, solves.slice(1))).toBeNull()
  })
})
