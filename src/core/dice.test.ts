import { describe, expect, it } from 'vitest'

import type { EntropySource } from './random'
import { combinePercentile, formatRoll, rollDice } from './dice'

function sequenceEntropy(values: number[]): EntropySource {
  let cursor = 0
  return () => values[Math.min(cursor++, values.length - 1)] ?? 0
}

describe('dice results', () => {
  it.each([4, 6, 8, 10, 12, 20] as const)('rolls d%s within range', (sides) => {
    const result = rollDice(`d${sides}`, 3, sequenceEntropy([0, 1, sides - 1]))
    expect(result.kind).toBe('standard')
    expect(result.values).toHaveLength(3)
    expect(result.values.every((value) => value >= 1 && value <= sides)).toBe(true)
  })

  it('treats 00 and 0 as 100', () => {
    expect(combinePercentile(0, 0)).toBe(100)
  })

  it('combines percentile tens and units', () => {
    expect(combinePercentile(70, 4)).toBe(74)
  })

  it('builds percentile pairs and totals their values', () => {
    const result = rollDice('d100', 2, sequenceEntropy([7, 4, 0, 0]))
    expect(result).toEqual({
      kind: 'percentile',
      type: 'd100',
      pairs: [
        { tens: 70, units: 4, value: 74 },
        { tens: 0, units: 0, value: 100 },
      ],
      values: [74, 100],
      total: 174,
    })
  })

  it('formats a compact readable result', () => {
    const result = rollDice('d20', 2, sequenceEntropy([19, 4]))
    expect(formatRoll(result)).toEqual({ notation: '2d20', detail: '20 + 5', total: '25' })
  })

  it('rejects unsupported quantities', () => {
    expect(() => rollDice('d6', 0, sequenceEntropy([0]))).toThrow(/quantity/i)
    expect(() => rollDice('d6', 7, sequenceEntropy([0]))).toThrow(/quantity/i)
  })
})
