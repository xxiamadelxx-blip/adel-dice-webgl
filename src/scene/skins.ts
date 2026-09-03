export const SKIN_CATALOG = {
  background: {
    ivy: {
      name: 'Плющевый пергамент',
      color: '#d8cda6',
      image: '/assets/backgrounds/ivy-parchment.jpg',
    },
    slate: { name: 'Полуночный сланец', color: '#11171b' },
    walnut: { name: 'Тёплый орех', color: '#3d2418' },
  },
  tray: {
    'black-gold': {
      name: 'Чёрное золото',
      inner: '#11100f',
      wall: '#1b1714',
      rim: '#b98a48',
      accent: '#d3a664',
      roughness: 0.72,
    },
    oxblood: {
      name: 'Бычья кровь',
      inner: '#351116',
      wall: '#511c23',
      rim: '#c19a68',
      accent: '#d7b27a',
      roughness: 0.65,
    },
    moss: {
      name: 'Моховой бархат',
      inner: '#1d392d',
      wall: '#152820',
      rim: '#7e6a43',
      accent: '#bca873',
      roughness: 0.92,
    },
  },
  tower: {
    treewood: {
      name: 'Древо',
      wood: '#a66b36',
      woodLight: '#d09a58',
      panel: '#171614',
      accent: '#c78b4d',
    },
    'rune-walnut': {
      name: 'Рунический орех',
      wood: '#7e4a2a',
      woodLight: '#b47a42',
      panel: '#4c2021',
      accent: '#d3a560',
    },
    'plain-oak': {
      name: 'Светлый дуб',
      wood: '#b9824b',
      woodLight: '#deb579',
      panel: '#6d4328',
      accent: '#ead09e',
    },
  },
  dice: {
    obsidian: {
      name: 'Чёрный обсидиан',
      base: '#09090a',
      edge: '#c99b52',
      label: '#e8bd73',
      roughness: 0.2,
      metalness: 0.16,
      transmission: 0,
    },
    howlite: {
      name: 'Хаулит',
      base: '#e9e7df',
      edge: '#c9a76b',
      label: '#6f593c',
      roughness: 0.48,
      metalness: 0.02,
      transmission: 0,
    },
    opalite: {
      name: 'Опалит',
      base: '#9cd6e5',
      edge: '#f2c36f',
      label: '#203c4a',
      roughness: 0.14,
      metalness: 0.04,
      transmission: 0.58,
    },
    'blue-sandstone': {
      name: 'Синий авантюрин',
      base: '#08142f',
      edge: '#7890d1',
      label: '#e7e9ff',
      roughness: 0.3,
      metalness: 0.16,
      transmission: 0,
    },
    amethyst: {
      name: 'Аметист',
      base: '#4f2777',
      edge: '#b37bd6',
      label: '#f1cf81',
      roughness: 0.2,
      metalness: 0.04,
      transmission: 0.32,
    },
    bloodstone: {
      name: 'Кровавый камень',
      base: '#351417',
      edge: '#a84338',
      label: '#efc271',
      roughness: 0.38,
      metalness: 0.08,
      transmission: 0.08,
    },
    prismatic: {
      name: 'Призматическое стекло',
      base: '#d5eff4',
      edge: '#d99bff',
      label: '#162d3c',
      roughness: 0.04,
      metalness: 0.02,
      transmission: 0.88,
    },
  },
} as const

export type BackgroundSkinId = keyof typeof SKIN_CATALOG.background
export type TraySkinId = keyof typeof SKIN_CATALOG.tray
export type TowerSkinId = keyof typeof SKIN_CATALOG.tower
export type DiceSkinId = keyof typeof SKIN_CATALOG.dice

export type SkinSelection = {
  background: BackgroundSkinId
  tray: TraySkinId
  tower: TowerSkinId
  dice: DiceSkinId
}

export const DEFAULT_SKINS: SkinSelection = {
  background: 'ivy',
  tray: 'black-gold',
  tower: 'treewood',
  dice: 'obsidian',
}

type LooseSkinSelection = Partial<Record<keyof SkinSelection, string>>

function validId<Category extends keyof typeof SKIN_CATALOG>(
  category: Category,
  value: string | undefined,
): value is keyof (typeof SKIN_CATALOG)[Category] & string {
  return typeof value === 'string' && value in SKIN_CATALOG[category]
}

export function resolveSkinSelection(
  current: LooseSkinSelection,
  patch: LooseSkinSelection = {},
): SkinSelection {
  const requested = { ...current, ...patch }
  return {
    background: validId('background', requested.background)
      ? requested.background
      : DEFAULT_SKINS.background,
    tray: validId('tray', requested.tray) ? requested.tray : DEFAULT_SKINS.tray,
    tower: validId('tower', requested.tower) ? requested.tower : DEFAULT_SKINS.tower,
    dice: validId('dice', requested.dice) ? requested.dice : DEFAULT_SKINS.dice,
  }
}
