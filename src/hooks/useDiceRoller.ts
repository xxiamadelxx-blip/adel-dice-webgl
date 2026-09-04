import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react'

import { rollDice, type DieType, type RollResult } from '../core/dice'
import type { EntropySource } from '../core/random'
import {
  DiceWorld,
  type DiceWorldOptions,
  type RollPhase,
  type ThrowMode,
} from '../scene/DiceWorld'
import {
  DEFAULT_SKINS,
  resolveSkinSelection,
  type SkinSelection,
} from '../scene/skins'

const SETTINGS_KEY = 'adel-dice-webgl:settings:v1'

export type DiceWorldController = Pick<
  DiceWorld,
  | 'roll'
  | 'setSkins'
  | 'setThrowMode'
  | 'setSoundEnabled'
  | 'setHapticsEnabled'
  | 'unlockFeedback'
  | 'resize'
  | 'dispose'
>

export type DiceWorldFactory = (
  host: HTMLElement,
  options: Pick<DiceWorldOptions, 'onPhase' | 'onSettled'>,
) => DiceWorldController

export type HistoryEntry = {
  id: string
  createdAt: number
  result: RollResult
}

type PersistedSettings = {
  skins: SkinSelection
  throwMode: ThrowMode
  soundEnabled: boolean
  hapticsEnabled: boolean
}

export type UseDiceRollerOptions = {
  worldFactory?: DiceWorldFactory
  entropy?: EntropySource
}

function loadSettings(): PersistedSettings {
  const defaults: PersistedSettings = {
    skins: { ...DEFAULT_SKINS },
    throwMode: 'direct',
    soundEnabled: true,
    hapticsEnabled: true,
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      skins: resolveSkinSelection(parsed.skins ?? {}),
      throwMode: parsed.throwMode === 'tower' ? 'tower' : 'direct',
      soundEnabled: parsed.soundEnabled !== false,
      hapticsEnabled: parsed.hapticsEnabled !== false,
    }
  } catch {
    return defaults
  }
}

function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Private or storage-restricted WebViews can still run without persistence.
  }
}

export function useDiceRoller(options: UseDiceRollerOptions = {}) {
  const persisted = useRef<PersistedSettings | null>(null)
  if (!persisted.current) persisted.current = loadSettings()

  const worldRef = useRef<DiceWorldController | null>(null)
  const [sceneHost, setSceneHost] = useState<HTMLDivElement | null>(null)
  const [selectedDie, setSelectedDie] = useState<DieType>('d20')
  const [quantity, setQuantityState] = useState(1)
  const [throwMode, setThrowMode] = useState<ThrowMode>(persisted.current.throwMode)
  const [skins, setSkins] = useState<SkinSelection>(persisted.current.skins)
  const [soundEnabled, setSoundEnabled] = useState(persisted.current.soundEnabled)
  const [hapticsEnabled, setHapticsEnabled] = useState(persisted.current.hapticsEnabled)
  const [phase, setPhase] = useState<RollPhase>('idle')
  const [result, setResult] = useState<RollResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null)

  const settleResult = useCallback((settledResult: RollResult) => {
    const createdAt = Date.now()
    setPhase('settled')
    setResult(settledResult)
    setHistory((current) => [
      { id: `${createdAt}-${current.length}`, createdAt, result: settledResult },
      ...current,
    ])
  }, [])

  const sceneRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    setSceneHost(node)
  }, [])

  useEffect(() => {
    if (!sceneHost) return
    let world: DiceWorldController | null = null
    try {
      const factory: DiceWorldFactory =
        options.worldFactory ?? ((host, worldOptions) => new DiceWorld(host, worldOptions))
      world = factory(sceneHost, {
        onPhase: setPhase,
        onSettled: settleResult,
      })
      worldRef.current = world
      world.setSkins(skins)
      world.setThrowMode(throwMode)
      world.setSoundEnabled(soundEnabled)
      world.setHapticsEnabled(hapticsEnabled)
      world.resize()
      setUnsupportedReason(null)
    } catch (error) {
      setUnsupportedReason(error instanceof Error ? error.message : 'Не удалось запустить WebGL2')
    }

    const resize = (): void => world?.resize()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    observer?.observe(sceneHost)
    window.addEventListener('resize', resize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      world?.dispose()
      if (worldRef.current === world) worldRef.current = null
    }
  }, [sceneHost, options.worldFactory, settleResult])

  useEffect(() => {
    worldRef.current?.setSkins(skins)
  }, [skins])

  useEffect(() => {
    worldRef.current?.setThrowMode(throwMode)
  }, [throwMode])

  useEffect(() => {
    worldRef.current?.setSoundEnabled(soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    worldRef.current?.setHapticsEnabled(hapticsEnabled)
  }, [hapticsEnabled])

  useEffect(() => {
    saveSettings({ skins, throwMode, soundEnabled, hapticsEnabled })
  }, [skins, throwMode, soundEnabled, hapticsEnabled])

  const setQuantity = useCallback((next: number) => {
    setQuantityState(Math.max(1, Math.min(6, Math.round(next))))
  }, [])

  const updateSkin = useCallback(
    <Category extends keyof SkinSelection>(category: Category, value: SkinSelection[Category]) => {
      setSkins((current) => resolveSkinSelection(current, { [category]: value }))
    },
    [],
  )

  const rollNow = useCallback((): RollResult | null => {
    if (phase === 'rolling') return null
    try {
      const nextResult = rollDice(selectedDie, quantity, options.entropy)
      const world = worldRef.current
      if (!world) {
        settleResult(nextResult)
        return nextResult
      }
      setResult(null)
      setPhase('rolling')
      void world.unlockFeedback()
      world.roll(nextResult)
      return nextResult
    } catch (error) {
      setUnsupportedReason(error instanceof Error ? error.message : 'Не удалось выполнить бросок')
      return null
    }
  }, [options.entropy, phase, quantity, selectedDie, settleResult])

  const clearHistory = useCallback(() => setHistory([]), [])

  return {
    sceneRef,
    selectedDie,
    setSelectedDie,
    quantity,
    setQuantity,
    throwMode,
    setThrowMode,
    skins,
    updateSkin,
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    phase,
    result,
    history,
    clearHistory,
    rollNow,
    unsupportedReason,
  }
}
