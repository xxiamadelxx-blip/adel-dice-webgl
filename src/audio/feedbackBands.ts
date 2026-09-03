export type FeedbackBand = 'none' | 'light' | 'medium' | 'heavy'

export type ImpactFeedbackBand = {
  band: FeedbackBand
  volume: number
  pitch: number
  vibration: number[]
}

export function feedbackForImpulse(impulse: number): ImpactFeedbackBand {
  const safeImpulse = Math.max(0, Number.isFinite(impulse) ? impulse : 0)
  if (safeImpulse < 0.8) {
    return { band: 'none', volume: 0, pitch: 0, vibration: [] }
  }
  if (safeImpulse < 2.2) {
    return {
      band: 'light',
      volume: Math.min(0.12, 0.04 + safeImpulse * 0.03),
      pitch: 235 + safeImpulse * 15,
      vibration: [8],
    }
  }
  if (safeImpulse < 5) {
    return {
      band: 'medium',
      volume: Math.min(0.24, 0.1 + safeImpulse * 0.035),
      pitch: 195 + safeImpulse * 8,
      vibration: [12],
    }
  }
  return {
    band: 'heavy',
    volume: Math.min(0.36, 0.2 + safeImpulse * 0.02),
    pitch: Math.max(110, 175 - safeImpulse * 2),
    vibration: [18, 18, 10],
  }
}
