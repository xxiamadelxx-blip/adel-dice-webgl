import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { rollDice } from '../core/dice'
import type { EntropySource } from '../core/random'
import { DiceWorld, type RendererAdapter } from './DiceWorld'

function sequenceEntropy(values: number[]): EntropySource {
  let cursor = 0
  return () => values[Math.min(cursor++, values.length - 1)] ?? 0
}

function createRenderer(): RendererAdapter {
  return {
    domElement: document.createElement('canvas'),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  }
}

function createTestWorld(onPhase = vi.fn()) {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 393 })
  Object.defineProperty(host, 'clientHeight', { value: 620 })
  const renderer = createRenderer()
  const world = new DiceWorld(host, {
    rendererFactory: () => renderer,
    autoStart: false,
    onPhase,
    visualEntropy: sequenceEntropy([1, 2, 3, 4, 5]),
    labelFactory: () => new THREE.Sprite(),
  })
  return { world, host, renderer, onPhase }
}

describe('DiceWorld lifecycle', () => {
  it('emits rolling then settled exactly once for a roll', () => {
    const { world, onPhase } = createTestWorld()
    const result = rollDice('d20', 1, sequenceEntropy([19]))

    world.roll(result)
    world.advance(5300)
    world.advance(100)

    expect(onPhase.mock.calls.map(([phase]) => phase)).toEqual(['rolling', 'settled'])
    world.dispose()
  })

  it('creates two visual dice for one percentile roll', () => {
    const { world } = createTestWorld()
    world.roll(rollDice('d100', 1, sequenceEntropy([7, 4])))
    expect(world.diceCount).toBe(2)
    world.dispose()
  })

  it('shows the tower only in tower mode', () => {
    const { world } = createTestWorld()
    world.setThrowMode('tower')
    expect(world.hasVisibleTower()).toBe(true)
    world.setThrowMode('direct')
    expect(world.hasVisibleTower()).toBe(false)
    world.dispose()
  })

  it('updates one skin category without changing the others', () => {
    const { world } = createTestWorld()
    world.setSkins({ tray: 'oxblood' })
    expect(world.skinSelection).toEqual({
      background: 'slate',
      tray: 'oxblood',
      tower: 'treewood',
      dice: 'obsidian',
    })
    world.dispose()
  })

  it('disposes the renderer and detaches its canvas', () => {
    const { world, host, renderer } = createTestWorld()
    expect(host.contains(renderer.domElement)).toBe(true)
    world.dispose()
    expect(renderer.dispose).toHaveBeenCalledOnce()
    expect(host.contains(renderer.domElement)).toBe(false)
  })
})
