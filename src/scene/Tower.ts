import * as THREE from 'three'

import { SKIN_CATALOG, type TowerSkinId } from './skins'

export type TowerPhysicsPart = {
  kind: 'wall' | 'deflector' | 'chute'
  size: [number, number, number]
  position: [number, number, number]
  rotation: [number, number, number]
}

function mesh(
  geometry: THREE.BufferGeometry,
  color: string,
  roughness = 0.7,
  metalness = 0,
): THREE.Mesh {
  const result = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness, metalness }),
  )
  result.castShadow = true
  result.receiveShadow = true
  return result
}

export function createTowerGroup(skinId: TowerSkinId): THREE.Group {
  const skin = SKIN_CATALOG.tower[skinId]
  const group = new THREE.Group()
  group.name = 'dice-tower'
  group.userData.reference = 'tower-wooden-runic'

  const core = mesh(new THREE.CylinderGeometry(2.18, 2.18, 5.15, 8, 1, true), skin.panel, 0.78)
  core.position.y = 3.35
  group.add(core)

  for (const [height, radius, y, color] of [
    [0.42, 2.62, 0.62, skin.wood],
    [0.28, 2.82, 0.92, skin.woodLight],
    [0.42, 2.62, 5.84, skin.wood],
    [0.28, 2.82, 6.17, skin.woodLight],
  ] as const) {
    const ring = mesh(new THREE.CylinderGeometry(radius, radius, height, 8), color, 0.66)
    ring.position.y = y
    group.add(ring)
  }

  for (let side = 0; side < 8; side += 1) {
    const angle = (side / 8) * Math.PI * 2
    const panel = mesh(new THREE.BoxGeometry(1.26, 4.36, 0.08), skin.wood, 0.72)
    panel.position.set(Math.sin(angle) * 2.17, 3.37, Math.cos(angle) * 2.17)
    panel.rotation.y = angle
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(panel.geometry),
      new THREE.LineBasicMaterial({ color: skin.accent, transparent: true, opacity: 0.72 }),
    )
    panel.add(edges)
    group.add(panel)
  }

  const opening = mesh(new THREE.BoxGeometry(1.74, 1.42, 0.22), '#050505', 1)
  opening.name = 'tower-exit'
  opening.position.set(0, 1.25, 2.21)
  group.add(opening)

  const chute = mesh(new THREE.BoxGeometry(2.25, 0.22, 2.1), skin.woodLight, 0.62)
  chute.position.set(0, 0.72, 2.85)
  chute.rotation.x = -0.34
  group.add(chute)

  group.scale.setScalar(0.72)
  return group
}

export function createTowerPhysics(): TowerPhysicsPart[] {
  return [
    { kind: 'wall', size: [1.7, 2.6, 0.16], position: [-1.75, 3.3, 0], rotation: [0, 0, 0] },
    { kind: 'wall', size: [1.7, 2.6, 0.16], position: [1.75, 3.3, 0], rotation: [0, 0, 0] },
    { kind: 'deflector', size: [1.55, 0.14, 1.55], position: [0, 4.25, 0], rotation: [0, 0, 0.45] },
    { kind: 'deflector', size: [1.55, 0.14, 1.55], position: [0, 2.65, 0], rotation: [0, 0, -0.45] },
    { kind: 'chute', size: [1.2, 0.12, 1.15], position: [0, 0.8, 1.75], rotation: [-0.34, 0, 0] },
  ]
}
