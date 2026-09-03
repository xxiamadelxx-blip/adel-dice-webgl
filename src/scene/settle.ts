export type BodyMotion = {
  linearSpeed: number
  angularSpeed: number
}

export type SettleState = {
  phase: 'rolling' | 'settled'
  elapsedMs: number
  quietMs: number
  reason?: 'quiet' | 'timeout'
}

const LINEAR_SPEED_THRESHOLD = 0.18
const ANGULAR_SPEED_THRESHOLD = 0.32
const REQUIRED_QUIET_MS = 550
const MAX_ROLL_MS = 5200

export function createSettleState(): SettleState {
  return { phase: 'rolling', elapsedMs: 0, quietMs: 0 }
}

export function updateSettleState(
  state: SettleState,
  bodies: BodyMotion[],
  deltaMs: number,
): SettleState {
  if (state.phase === 'settled' || bodies.length === 0) return state

  const safeDelta = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0)
  const elapsedMs = state.elapsedMs + safeDelta
  const allQuiet = bodies.every(
    ({ linearSpeed, angularSpeed }) =>
      linearSpeed < LINEAR_SPEED_THRESHOLD && angularSpeed < ANGULAR_SPEED_THRESHOLD,
  )
  const quietMs = allQuiet ? state.quietMs + safeDelta : 0

  if (elapsedMs >= MAX_ROLL_MS) {
    return { phase: 'settled', elapsedMs, quietMs, reason: 'timeout' }
  }
  if (quietMs >= REQUIRED_QUIET_MS) {
    return { phase: 'settled', elapsedMs, quietMs, reason: 'quiet' }
  }
  return { phase: 'rolling', elapsedMs, quietMs }
}
