import { describe, expect, it } from 'vitest'

import { createTowerGroup, createTowerPhysics } from './Tower'

describe('dice tower', () => {
  it('builds a lightweight octagonal tower with an exit chute', () => {
    const tower = createTowerGroup('treewood')
    expect(tower.name).toBe('dice-tower')
    expect(tower.getObjectByName('tower-exit')).toBeTruthy()
    expect(tower.userData.reference).toBe('tower-wooden-runic')
  })

  it('exposes internal deflectors for the physics world', () => {
    const parts = createTowerPhysics()
    expect(parts.filter((part) => part.kind === 'deflector')).toHaveLength(2)
    expect(parts.some((part) => part.kind === 'chute')).toBe(true)
  })
})
