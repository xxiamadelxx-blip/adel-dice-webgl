import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RollResult } from './core/dice'
import type { DiceWorldController, DiceWorldFactory } from './hooks/useDiceRoller'
import { MobileRuntime } from './mobile'
import Prototype from './Prototype'

function createFakeWorld() {
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

function renderPrototype(factory: DiceWorldFactory) {
  return render(
    <MobileRuntime>
      <Prototype worldFactory={factory} entropy={() => 0} />
    </MobileRuntime>,
  )
}

describe('Prototype', () => {
  beforeEach(() => localStorage.clear())

  it('selects d100 and starts one percentile roll', async () => {
    const user = userEvent.setup()
    const { world, factory } = createFakeWorld()
    renderPrototype(factory)

    await user.click(screen.getByRole('button', { name: 'd100' }))
    await user.click(screen.getByRole('button', { name: /бросить/i }))

    expect(world.roll).toHaveBeenCalledWith(expect.objectContaining({ type: 'd100' }))
    expect(screen.getAllByText('100')).toHaveLength(2)
  })

  it('changes tray skin without changing tower or background', async () => {
    const user = userEvent.setup()
    const { world, factory } = createFakeWorld()
    renderPrototype(factory)

    await user.click(screen.getByRole('button', { name: /скины/i }))
    await user.click(screen.getByRole('tab', { name: /лоток/i }))
    await user.click(screen.getByRole('button', { name: /бычья кровь/i }))

    expect(world.setSkins).toHaveBeenLastCalledWith({
      background: 'slate',
      tray: 'oxblood',
      tower: 'treewood',
      dice: 'obsidian',
    })
  })

  it('switches between direct and tower throw modes', async () => {
    const user = userEvent.setup()
    const { world, factory } = createFakeWorld()
    renderPrototype(factory)

    await user.click(screen.getByRole('button', { name: /через башню/i }))
    expect(world.setThrowMode).toHaveBeenLastCalledWith('tower')
  })

  it('exposes stable visual QA signals without a 2D fallback', () => {
    const { factory } = createFakeWorld()
    renderPrototype(factory)

    expect(screen.getByLabelText('Бросатель кубиков')).toHaveAttribute(
      'data-profile',
      'adel-dice-webgl-v1',
    )
    expect(screen.getByLabelText('Бросатель кубиков')).toHaveAttribute('data-status', 'ready')
    expect(screen.getByLabelText('Бросатель кубиков')).toHaveAttribute('data-fallback', 'false')
  })
})
