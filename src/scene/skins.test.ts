import { describe, expect, it } from 'vitest'

import { DEFAULT_SKINS, SKIN_CATALOG, resolveSkinSelection } from './skins'

describe('scene skin catalog', () => {
  it('contains every approved independent category', () => {
    expect(Object.keys(SKIN_CATALOG)).toEqual(['background', 'tray', 'tower', 'dice'])
    expect(Object.keys(SKIN_CATALOG.dice)).toHaveLength(7)
  })

  it('changes one category without altering the others', () => {
    const next = resolveSkinSelection(DEFAULT_SKINS, { tray: 'oxblood' })
    expect(next).toEqual({ ...DEFAULT_SKINS, tray: 'oxblood' })
  })

  it('falls back only for an invalid category id', () => {
    const next = resolveSkinSelection({ ...DEFAULT_SKINS, dice: 'missing' })
    expect(next).toEqual(DEFAULT_SKINS)
  })
})
