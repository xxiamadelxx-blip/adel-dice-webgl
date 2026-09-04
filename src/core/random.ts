export type EntropySource = () => number

const UINT32_RANGE = 0x100000000

export function cryptoUint32(): number {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Cryptographic randomness is unavailable on this device')
  }

  const value = new Uint32Array(1)
  cryptoApi.getRandomValues(value)
  return value[0] ?? 0
}

export function randomIntInclusive(
  min: number,
  max: number,
  entropy: EntropySource = cryptoUint32,
): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('Random integer bounds must be integers')
  }
  if (max < min) {
    throw new RangeError('Random integer bounds are reversed')
  }

  const span = max - min + 1
  if (span <= 0 || span > UINT32_RANGE) {
    throw new RangeError('Random integer bounds exceed uint32 range')
  }

  const limit = Math.floor(UINT32_RANGE / span) * span
  let value = entropy() >>> 0
  while (value >= limit) value = entropy() >>> 0
  return min + (value % span)
}
