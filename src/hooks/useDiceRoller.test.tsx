import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RollResult } from '../core/dice'
import type { DiceWorldController, DiceWorldFactory } from './useDiceRoller'
import { useDiceRoller } from './useDiceRoller'

function fakeWorldFactory() {
  let onSettled: ((result: RollResult) => void) | undefined
  const world: DiceWorldController = {
    roll: vi.fn((result: RollResult) => onSettled?.(result)),
    setSkins: vi.fn(),
    setThrowMode: vi.fn(),
    setSoundEnabled: vi.fn(),
    setHapticsEnabled: vi.fn(),
    unlockFeedback: vi.fn(async () => undefined),
    resize: vi.fn(),
    dispose: vi.fn(),
  }
  const factory: DiceWorldFactory = vi.fn((_host, options) => {
    onSettled = options.onSettled
    return world
  })
  return { world, factory }
}

describe('useDiceRoller', () => {
  beforeEach(() => localStorage.clear())

  it('rolls the selected die and stores the settled result in history', () => {
    const { world, factory } = fakeWorldFactory()
    const { result } = renderHook(() => useDiceRoller({ worldFactory: factory, entropy: () => 19 }))
    act(() => result.current.sceneRef(document.createElement('div')))
    act(() => result.current.rollNow())

    expect(world.roll).toHaveBeenCalledWith(expect.objectContaining({ type: 'd20', values: [20] }))
    expect(result.current.result?.total).toBe(20)
    expect(result.current.history).toHaveLength(1)
  })

  it('sends independent skin changes to the world', () => {
    const { world, factory } = fakeWorldFactory()
    const { result } = renderHook(() => useDiceRoller({ worldFactory: factory }))
    act(() => result.current.sceneRef(document.createElement('div')))
    act(() => result.current.updateSkin('tray', 'oxblood'))

    expect(result.current.skins).toEqual({
      background: 'slate',
      tray: 'oxblood',
      tower: 'treewood',
      dice: 'obsidian',
    })
    expect(world.setSkins).toHaveBeenLastCalledWith(expect.objectContaining({ tray: 'oxblood' }))
  })

  it('clamps quantity from 1 to 6', () => {
    const { factory } = fakeWorldFactory()
    const { result } = renderHook(() => useDiceRoller({ worldFactory: factory }))
    act(() => result.current.setQuantity(99))
    expect(result.current.quantity).toBe(6)
    act(() => result.current.setQuantity(-4))
    expect(result.current.quantity).toBe(1)
  })

  it('keeps fair rolls and history available when WebGL2 cannot start', () => {
    const factory: DiceWorldFactory = vi.fn(() => {
      throw new Error('WebGL2 unavailable')
    })
    const { result } = renderHook(() => useDiceRoller({ worldFactory: factory, entropy: () => 0 }))

    act(() => result.current.sceneRef(document.createElement('div')))
    let rolled: RollResult | null = null
    act(() => {
      rolled = result.current.rollNow()
    })

    expect(result.current.unsupportedReason).toBe('WebGL2 unavailable')
    expect(rolled).toEqual(expect.objectContaining({ type: 'd20', values: [1], total: 1 }))
    expect(result.current.phase).toBe('settled')
    expect(result.current.history).toHaveLength(1)
  })
})
