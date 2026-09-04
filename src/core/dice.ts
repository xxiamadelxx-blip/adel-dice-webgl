import { randomIntInclusive, type EntropySource } from './random'

export const STANDARD_DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const

export type StandardDieType = (typeof STANDARD_DIE_TYPES)[number]
export type DieType = StandardDieType | 'd100'

export type StandardRoll = {
  kind: 'standard'
  type: StandardDieType
  values: number[]
  total: number
}

export type PercentilePair = {
  tens: number
  units: number
  value: number
}

export type PercentileRoll = {
  kind: 'percentile'
  type: 'd100'
  pairs: PercentilePair[]
  values: number[]
  total: number
}

export type RollResult = StandardRoll | PercentileRoll

const DIE_SIDES: Record<StandardDieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 6) {
    throw new RangeError('Dice quantity must be an integer from 1 to 6')
  }
}

export function combinePercentile(tens: number, units: number): number {
  if (tens === 0 && units === 0) return 100
  return tens + units
}

export function rollDice(
  type: DieType,
  quantity = 1,
  entropy?: EntropySource,
): RollResult {
  assertQuantity(quantity)

  if (type === 'd100') {
    const pairs = Array.from({ length: quantity }, (): PercentilePair => {
      const tens = randomIntInclusive(0, 9, entropy) * 10
      const units = randomIntInclusive(0, 9, entropy)
      return { tens, units, value: combinePercentile(tens, units) }
    })
    const values = pairs.map((pair) => pair.value)
    return {
      kind: 'percentile',
      type,
      pairs,
      values,
      total: values.reduce((sum, value) => sum + value, 0),
    }
  }

  const sides = DIE_SIDES[type]
  if (!sides) throw new RangeError(`Unsupported die type: ${type}`)
  const values = Array.from({ length: quantity }, () => randomIntInclusive(1, sides, entropy))
  return {
    kind: 'standard',
    type,
    values,
    total: values.reduce((sum, value) => sum + value, 0),
  }
}

export type FormattedRoll = {
  notation: string
  detail: string
  total: string
}

export function formatRoll(result: RollResult): FormattedRoll {
  const notation = `${result.values.length === 1 ? '' : result.values.length}${result.type}`
  return {
    notation,
    detail: result.values.join(' + '),
    total: String(result.total),
  }
}
