import * as CANNON from 'cannon-es'
import * as THREE from 'three'

import type { StandardDieType } from '../core/dice'

function createD10Geometry(): THREE.BufferGeometry {
  const vertices: number[] = [0, 1.55, 0, 0, -1.55, 0]
  const upper: number[] = []
  const lower: number[] = []

  for (let index = 0; index < 5; index += 1) {
    const upperAngle = (index / 5) * Math.PI * 2
    const lowerAngle = upperAngle + Math.PI / 5
    upper.push(vertices.length / 3)
    vertices.push(Math.cos(upperAngle), 0.34, Math.sin(upperAngle))
    lower.push(vertices.length / 3)
    vertices.push(Math.cos(lowerAngle), -0.34, Math.sin(lowerAngle))
  }

  const triangles: number[] = []
  for (let index = 0; index < 5; index += 1) {
    const next = (index + 1) % 5
    const previous = (index + 4) % 5
    triangles.push(0, upper[index]!, lower[index]!, 0, lower[index]!, upper[next]!)
    triangles.push(1, lower[index]!, upper[index]!, 1, upper[index]!, lower[previous]!)
  }

  return new THREE.PolyhedronGeometry(vertices, triangles, 1.02, 0)
}

export function createDieGeometry(type: StandardDieType): THREE.BufferGeometry {
  switch (type) {
    case 'd4':
      return new THREE.TetrahedronGeometry(1.08, 0)
    case 'd6':
      return new THREE.BoxGeometry(1.55, 1.55, 1.55, 1, 1, 1)
    case 'd8':
      return new THREE.OctahedronGeometry(1.08, 0)
    case 'd10':
      return createD10Geometry()
    case 'd12':
      return new THREE.DodecahedronGeometry(1.04, 0)
    case 'd20':
      return new THREE.IcosahedronGeometry(1.06, 0)
  }
}

type IndexedTriangle = [number, number, number]

function geometryVerticesAndFaces(geometry: THREE.BufferGeometry): {
  vertices: CANNON.Vec3[]
  faces: IndexedTriangle[]
} {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const vertices: CANNON.Vec3[] = []
  const keyToIndex = new Map<string, number>()
  const sourceToUnique: number[] = []

  for (let sourceIndex = 0; sourceIndex < position.count; sourceIndex += 1) {
    const x = position.getX(sourceIndex)
    const y = position.getY(sourceIndex)
    const z = position.getZ(sourceIndex)
    const key = `${x.toFixed(5)}:${y.toFixed(5)}:${z.toFixed(5)}`
    let uniqueIndex = keyToIndex.get(key)
    if (uniqueIndex === undefined) {
      uniqueIndex = vertices.length
      keyToIndex.set(key, uniqueIndex)
      vertices.push(new CANNON.Vec3(x, y, z))
    }
    sourceToUnique[sourceIndex] = uniqueIndex
  }

  const sourceIndices = index ? Array.from(index.array, Number) : Array.from({ length: position.count }, (_, i) => i)
  const faces: IndexedTriangle[] = []
  for (let cursor = 0; cursor < sourceIndices.length; cursor += 3) {
    const a = sourceToUnique[sourceIndices[cursor]!]!
    let b = sourceToUnique[sourceIndices[cursor + 1]!]!
    let c = sourceToUnique[sourceIndices[cursor + 2]!]!
    if (a === b || b === c || a === c) continue

    const va = vertices[a]!
    const vb = vertices[b]!
    const vc = vertices[c]!
    const edgeA = vb.vsub(va)
    const edgeB = vc.vsub(va)
    const normal = edgeA.cross(edgeB)
    const center = new CANNON.Vec3(
      (va.x + vb.x + vc.x) / 3,
      (va.y + vb.y + vc.y) / 3,
      (va.z + vb.z + vc.z) / 3,
    )
    if (normal.dot(center) < 0) [b, c] = [c, b]
    faces.push([a, b, c])
  }

  return { vertices, faces }
}

export function createConvexShape(type: StandardDieType): CANNON.ConvexPolyhedron {
  const geometry = createDieGeometry(type)
  const { vertices, faces } = geometryVerticesAndFaces(geometry)
  geometry.dispose()
  return new CANNON.ConvexPolyhedron({ vertices, faces })
}
