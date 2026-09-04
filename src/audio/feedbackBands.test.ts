import { describe, expect, it, vi } from 'vitest'

import { feedbackForImpulse } from './feedbackBands'
import { ImpactFeedback } from './ImpactFeedback'

describe('feedbackForImpulse', () => {
  it.each([
    [0.4, 'none'],
    [1.1, 'light'],
    [3, 'medium'],
    [7, 'heavy'],
  ] as const)('maps impulse %s to %s', (impulse, band) => {
    expect(feedbackForImpulse(impulse).band).toBe(band)
  })

  it('clamps volume and exposes progressively stronger haptics', () => {
    expect(feedbackForImpulse(999).volume).toBeLessThanOrEqual(0.36)
    expect(feedbackForImpulse(1.1).vibration).toEqual([8])
    expect(feedbackForImpulse(7).vibration).toEqual([18, 18, 10])
  })
})

describe('ImpactFeedback', () => {
  it('plays and vibrates according to the physical impulse', () => {
    const tonePlayer = vi.fn()
    const vibrate = vi.fn(() => true)
    const feedback = new ImpactFeedback({ tonePlayer, vibrate, now: () => 100 })

    feedback.hit(7, 'die-1')

    expect(tonePlayer).toHaveBeenCalledWith(expect.objectContaining({ band: 'heavy' }))
    expect(vibrate).toHaveBeenCalledWith([18, 18, 10])
  })

  it('throttles contact chatter per body', () => {
    const tonePlayer = vi.fn()
    let now = 100
    const feedback = new ImpactFeedback({ tonePlayer, now: () => now })

    feedback.hit(3, 'die-1')
    now = 130
    feedback.hit(3, 'die-1')
    now = 160
    feedback.hit(3, 'die-1')

    expect(tonePlayer).toHaveBeenCalledTimes(2)
  })

  it('respects sound and haptic toggles independently', () => {
    const tonePlayer = vi.fn()
    const vibrate = vi.fn(() => true)
    const feedback = new ImpactFeedback({ tonePlayer, vibrate, now: () => 100 })
    feedback.setSoundEnabled(false)

    feedback.hit(7, 'die-1')

    expect(tonePlayer).not.toHaveBeenCalled()
    expect(vibrate).toHaveBeenCalledOnce()
  })
})
