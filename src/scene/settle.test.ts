import { describe, expect, it } from 'vitest'

import { createSettleState, updateSettleState, type BodyMotion } from './settle'

const quiet: BodyMotion[] = [{ linearSpeed: 0.08, angularSpeed: 0.12 }]
const spinning: BodyMotion[] = [{ linearSpeed: 0.08, angularSpeed: 1.4 }]

describe('settle state', () => {
  it('settles after every body is quiet for 550ms', () => {
    let state = createSettleState()
    state = updateSettleState(state, quiet, 300)
    state = updateSettleState(state, quiet, 251)

    expect(state.phase).toBe('settled')
    expect(state.reason).toBe('quiet')
  })

  it('resets quiet time when a body moves again', () => {
    let state = updateSettleState(createSettleState(), quiet, 400)
    state = updateSettleState(state, spinning, 20)
    state = updateSettleState(state, quiet, 200)

    expect(state.phase).toBe('rolling')
    expect(state.quietMs).toBe(200)
  })

  it('forces settling at 5200ms even while a body spins', () => {
    const state = updateSettleState(createSettleState(), spinning, 5201)

    expect(state.phase).toBe('settled')
    expect(state.reason).toBe('timeout')
  })

  it('does not settle an empty world', () => {
    const state = updateSettleState(createSettleState(), [], 6000)
    expect(state.phase).toBe('rolling')
  })
})
