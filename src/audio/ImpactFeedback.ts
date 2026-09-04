import { feedbackForImpulse, type ImpactFeedbackBand } from './feedbackBands'

type TonePlayer = (feedback: ImpactFeedbackBand) => void
type Vibrate = (pattern: number | number[]) => boolean

export type ImpactFeedbackOptions = {
  tonePlayer?: TonePlayer
  vibrate?: Vibrate
  now?: () => number
}

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

export class ImpactFeedback {
  private readonly now: () => number
  private readonly vibrate?: Vibrate
  private readonly injectedTonePlayer?: TonePlayer
  private readonly lastImpactByBody = new Map<string, number>()
  private audioContext: AudioContext | null = null
  private soundEnabled = true
  private hapticsEnabled = true

  constructor(options: ImpactFeedbackOptions = {}) {
    this.now = options.now ?? (() => performance.now())
    this.vibrate = options.vibrate ?? globalThis.navigator?.vibrate?.bind(globalThis.navigator)
    this.injectedTonePlayer = options.tonePlayer
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled
  }

  setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled
  }

  async unlock(): Promise<void> {
    if (!this.soundEnabled || this.injectedTonePlayer) return
    const context = this.ensureAudioContext()
    if (context?.state === 'suspended') {
      try {
        await context.resume()
      } catch {
        // Audio is optional; a denied unlock must not block dice physics.
      }
    }
  }

  hit(impulse: number, bodyId = 'world'): ImpactFeedbackBand {
    const feedback = feedbackForImpulse(impulse)
    if (feedback.band === 'none') return feedback

    const timestamp = this.now()
    const lastImpact = this.lastImpactByBody.get(bodyId) ?? Number.NEGATIVE_INFINITY
    if (timestamp - lastImpact < 55) return feedback
    this.lastImpactByBody.set(bodyId, timestamp)

    if (this.soundEnabled) {
      try {
        if (this.injectedTonePlayer) this.injectedTonePlayer(feedback)
        else this.playBrowserTone(feedback)
      } catch {
        // Feedback is deliberately isolated from the roll lifecycle.
      }
    }

    if (this.hapticsEnabled && feedback.vibration.length > 0) {
      try {
        this.vibrate?.(feedback.vibration)
      } catch {
        // WebViews may expose vibration and still reject an individual call.
      }
    }

    return feedback
  }

  dispose(): void {
    this.lastImpactByBody.clear()
    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined)
      this.audioContext = null
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext
    if (typeof window === 'undefined') return null
    const AudioContextCtor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!AudioContextCtor) return null
    this.audioContext = new AudioContextCtor()
    return this.audioContext
  }

  private playBrowserTone(feedback: ImpactFeedbackBand): void {
    const context = this.ensureAudioContext()
    if (!context || context.state !== 'running') return

    const start = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(feedback.pitch, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(65, feedback.pitch * 0.42), start + 0.075)
    gain.gain.setValueAtTime(feedback.volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.1)
  }
}
