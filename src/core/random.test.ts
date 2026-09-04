import { describe, expect, it } from 'vitest'

import { randomIntInclusive, type EntropySource } from './random'

function sequenceEntropy(values: number[]): EntropySource {
  let cursor = 0
  return () => values[Math.min(cursor++, values.length - 1)] ?? 0
}

describe('randomIntInclusive', () => {
  it('returns both inclusive bounds from injected entropy', () => {
    expect(randomIntInclusive(1, 20, sequenceEntropy([0]))).toBe(1)
    expect(randomIntInclusive(1, 20, sequenceEntropy([19]))).toBe(20)
  })

  it('rejects entropy outside the largest even range', () => {
    expect(randomIntInclusive(1, 6, sequenceEntropy([0xffffffff, 5]))).toBe(6)
  })

  it('rejects invalid bounds', () => {
    expect(() => randomIntInclusive(4, 1, sequenceEntropy([0]))).toThrow(/bounds/i)
    expect(() => randomIntInclusive(1.5, 6, sequenceEntropy([0]))).toThrow(/integer/i)
  })
})
