import { describe, expect, it } from 'vitest'

import { STANDARD_DIE_TYPES } from '../core/dice'
import { createConvexShape, createDieGeometry } from './geometries'

describe('polyhedral geometry factories', () => {
  it.each(STANDARD_DIE_TYPES)('creates %s render and physics geometry', (type) => {
    const geometry = createDieGeometry(type)
    const shape = createConvexShape(type)

    expect(geometry.getAttribute('position').count).toBeGreaterThan(3)
    expect(shape.vertices.length).toBeGreaterThan(3)
    expect(shape.faces.length).toBeGreaterThan(3)
  })

  it('creates the expected classic solids', () => {
    expect(createConvexShape('d4').faces.length).toBe(4)
    expect(createConvexShape('d6').faces.length).toBe(12)
    expect(createConvexShape('d8').faces.length).toBe(8)
    expect(createConvexShape('d20').faces.length).toBe(20)
  })
})
