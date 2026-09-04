import * as CANNON from 'cannon-es'
import * as THREE from 'three'

import { ImpactFeedback } from '../audio/ImpactFeedback'
import type { RollResult, StandardDieType } from '../core/dice'
import type { EntropySource } from '../core/random'
import { cryptoUint32 } from '../core/random'
import { createConvexShape, createDieGeometry } from './geometries'
import { createLabelSprite } from './labelTexture'
import { createSettleState, updateSettleState, type SettleState } from './settle'
import {
  DEFAULT_SKINS,
  SKIN_CATALOG,
  resolveSkinSelection,
  type SkinSelection,
} from './skins'
import { createTowerGroup, createTowerPhysics } from './Tower'

export type RollPhase = 'idle' | 'rolling' | 'settled'
export type ThrowMode = 'direct' | 'tower'

export type RendererAdapter = {
  domElement: HTMLCanvasElement
  setPixelRatio: (ratio: number) => void
  setSize: (width: number, height: number, updateStyle?: boolean) => void
  render: (scene: THREE.Scene, camera: THREE.Camera) => void
  dispose: () => void
}

export class WebGL2UnsupportedError extends Error {
  constructor() {
    super('WebGL2 is required for the 3D dice roller')
    this.name = 'WebGL2UnsupportedError'
  }
}

type LabelFactory = (value: string, color: string, rimColor: string) => THREE.Object3D

export type DiceWorldOptions = {
  rendererFactory?: (canvas: HTMLCanvasElement) => RendererAdapter
  labelFactory?: LabelFactory
  visualEntropy?: EntropySource
  autoStart?: boolean
  onPhase?: (phase: RollPhase) => void
  onSettled?: (result: RollResult) => void
  feedback?: ImpactFeedback
}

type DieVisual = {
  id: string
  type: StandardDieType
  value: string
  body: CANNON.Body
  group: THREE.Group
  polygon: THREE.Mesh
}

type VisualDieSpec = {
  type: StandardDieType
  value: string
}

const TRAY_HALF_WIDTH = 5.65
const TRAY_HALF_DEPTH = 7.05
const DIE_REST_Y = 1.02

function createRenderer(canvas: HTMLCanvasElement): RendererAdapter {
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    powerPreference: 'high-performance',
  })
  if (!context) throw new WebGL2UnsupportedError()

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.06
  renderer.setClearColor(0x000000, 0)
  return renderer
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material]
  for (const item of materials) {
    if ('map' in item) {
      const map = (item as THREE.Material & { map?: THREE.Texture | null }).map
      map?.dispose()
    }
    item.dispose()
  }
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
      if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose()
      disposeMaterial(object.material)
    }
  })
}

function visualDice(result: RollResult): VisualDieSpec[] {
  if (result.kind === 'percentile') {
    return result.pairs.flatMap((pair) => [
      { type: 'd10' as const, value: String(pair.tens).padStart(2, '0') },
      { type: 'd10' as const, value: String(pair.units) },
    ])
  }
  return result.values.map((value) => ({ type: result.type, value: String(value) }))
}

export class DiceWorld {
  private readonly host: HTMLElement
  private readonly renderer: RendererAdapter
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
  private readonly physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) })
  private readonly labelFactory: LabelFactory
  private readonly visualEntropy: EntropySource
  private readonly onPhase?: (phase: RollPhase) => void
  private readonly onSettled?: (result: RollResult) => void
  private readonly feedback: ImpactFeedback
  private readonly dice: DieVisual[] = []
  private readonly towerBodies: CANNON.Body[] = []
  private readonly requestFrame: typeof requestAnimationFrame | null
  private readonly cancelFrame: typeof cancelAnimationFrame | null
  private trayGroup: THREE.Group | null = null
  private towerGroup: THREE.Group | null = null
  private tableSurface: THREE.Mesh | null = null
  private activeResult: RollResult | null = null
  private settleState: SettleState = createSettleState()
  private _skinSelection: SkinSelection = { ...DEFAULT_SKINS }
  private throwMode: ThrowMode = 'direct'
  private phase: RollPhase = 'idle'
  private frameId: number | null = null
  private lastFrameTime = 0
  private disposed = false

  constructor(host: HTMLElement, options: DiceWorldOptions = {}) {
    this.host = host
    this.labelFactory = options.labelFactory ?? createLabelSprite
    this.visualEntropy = options.visualEntropy ?? cryptoUint32
    this.onPhase = options.onPhase
    this.onSettled = options.onSettled
    this.feedback = options.feedback ?? new ImpactFeedback()
    this.requestFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : null
    this.cancelFrame = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : null

    const canvas = document.createElement('canvas')
    canvas.className = 'dice-world-canvas'
    canvas.setAttribute('aria-label', 'Трёхмерный лоток для броска кубиков')
    this.renderer = (options.rendererFactory ?? createRenderer)(canvas)
    this.host.append(this.renderer.domElement)

    this.physics.allowSleep = true
    this.physics.defaultContactMaterial.friction = 0.34
    this.physics.defaultContactMaterial.restitution = 0.34
    this.physics.defaultContactMaterial.contactEquationStiffness = 1e7
    this.physics.defaultContactMaterial.contactEquationRelaxation = 4

    this.configureScene()
    this.addTrayPhysics()
    this.applyBackground()
    this.rebuildTray()
    this.resize()

    if (options.autoStart !== false) this.startLoop()
  }

  get diceCount(): number {
    return this.dice.length
  }

  get skinSelection(): SkinSelection {
    return { ...this._skinSelection }
  }

  hasVisibleTower(): boolean {
    return this.towerGroup !== null && this.towerGroup.visible
  }

  async unlockFeedback(): Promise<void> {
    await this.feedback.unlock()
  }

  setSoundEnabled(enabled: boolean): void {
    this.feedback.setSoundEnabled(enabled)
  }

  setHapticsEnabled(enabled: boolean): void {
    this.feedback.setHapticsEnabled(enabled)
  }

  setThrowMode(mode: ThrowMode): void {
    if (this.throwMode === mode) return
    this.throwMode = mode
    this.rebuildTower()
  }

  setSkins(patch: Partial<SkinSelection>): void {
    const previous = this._skinSelection
    this._skinSelection = resolveSkinSelection(previous, patch)
    if (previous.background !== this._skinSelection.background) this.applyBackground()
    if (previous.tray !== this._skinSelection.tray) this.rebuildTray()
    if (previous.tower !== this._skinSelection.tower && this.throwMode === 'tower') this.rebuildTower()
    if (previous.dice !== this._skinSelection.dice) this.refreshDiceMaterials()
  }

  roll(result: RollResult): void {
    if (this.disposed) throw new Error('Cannot roll in a disposed DiceWorld')
    this.clearDice()
    this.activeResult = result
    this.settleState = createSettleState()
    this.phase = 'rolling'
    this.onPhase?.('rolling')

    visualDice(result).forEach((spec, index) => this.spawnDie(spec, index))
    this.renderer.render(this.scene, this.camera)
  }

  advance(deltaMs: number): void {
    if (this.disposed) return
    const safeDelta = Math.max(0, Math.min(deltaMs, 100))
    this.physics.step(1 / 60, safeDelta / 1000, 5)
    this.syncDice()

    if (this.phase === 'rolling' && this.activeResult) {
      this.settleState = updateSettleState(
        this.settleState,
        this.dice.map(({ body }) => ({
          linearSpeed: body.velocity.length(),
          angularSpeed: body.angularVelocity.length(),
        })),
        Math.max(0, deltaMs),
      )
      if (this.settleState.phase === 'settled') this.finishRoll()
    }

    this.renderer.render(this.scene, this.camera)
  }

  resize(): void {
    const width = Math.max(1, this.host.clientWidth || 393)
    const height = Math.max(1, this.host.clientHeight || 620)
    this.camera.aspect = width / height
    const portrait = height >= width
    this.camera.position.set(0, portrait ? 13.8 : 11.4, portrait ? 17.8 : 20.5)
    this.camera.lookAt(0, 0.2, -1.1)
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75))
    this.renderer.setSize(width, height, false)
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.frameId !== null && this.cancelFrame) this.cancelFrame(this.frameId)
    this.clearDice()
    if (this.trayGroup) disposeObject(this.trayGroup)
    if (this.towerGroup) disposeObject(this.towerGroup)
    if (this.tableSurface) disposeObject(this.tableSurface)
    this.feedback.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private configureScene(): void {
    this.camera.position.set(0, 13.8, 17.8)
    this.camera.lookAt(0, 0.2, -1.1)

    const hemisphere = new THREE.HemisphereLight(0xfff1cf, 0x17242c, 1.62)
    this.scene.add(hemisphere)

    const key = new THREE.DirectionalLight(0xffe2a8, 3.4)
    key.position.set(-7, 14, 8)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 35
    key.shadow.camera.left = -10
    key.shadow.camera.right = 10
    key.shadow.camera.top = 12
    key.shadow.camera.bottom = -12
    this.scene.add(key)

    const fill = new THREE.PointLight(0x8fc2d8, 1.2, 35)
    fill.position.set(6, 5, -7)
    this.scene.add(fill)

    this.tableSurface = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.5, 29),
      new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.88 }),
    )
    this.tableSurface.name = 'table-surface'
    this.tableSurface.position.y = -0.72
    this.tableSurface.receiveShadow = true
    this.scene.add(this.tableSurface)
  }

  private addTrayPhysics(): void {
    const addBox = (halfExtents: CANNON.Vec3, position: CANNON.Vec3): void => {
      const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(halfExtents), position })
      this.physics.addBody(body)
    }
    addBox(new CANNON.Vec3(TRAY_HALF_WIDTH, 0.2, TRAY_HALF_DEPTH), new CANNON.Vec3(0, -0.2, 0))
    addBox(new CANNON.Vec3(0.24, 0.78, TRAY_HALF_DEPTH), new CANNON.Vec3(-5.89, 0.58, 0))
    addBox(new CANNON.Vec3(0.24, 0.78, TRAY_HALF_DEPTH), new CANNON.Vec3(5.89, 0.58, 0))
    addBox(new CANNON.Vec3(TRAY_HALF_WIDTH, 0.78, 0.24), new CANNON.Vec3(0, 0.58, -7.29))
    addBox(new CANNON.Vec3(TRAY_HALF_WIDTH, 0.78, 0.24), new CANNON.Vec3(0, 0.58, 7.29))
  }

  private rebuildTray(): void {
    if (this.trayGroup) {
      this.scene.remove(this.trayGroup)
      disposeObject(this.trayGroup)
    }

    const skin = SKIN_CATALOG.tray[this._skinSelection.tray]
    const group = new THREE.Group()
    group.name = 'dice-tray'
    const innerMaterial = new THREE.MeshStandardMaterial({ color: skin.inner, roughness: skin.roughness })
    const wallMaterial = new THREE.MeshStandardMaterial({ color: skin.wall, roughness: 0.7 })
    const rimMaterial = new THREE.MeshStandardMaterial({ color: skin.rim, roughness: 0.42, metalness: 0.28 })

    const floor = new THREE.Mesh(new THREE.BoxGeometry(11.3, 0.34, 14.1), innerMaterial)
    floor.position.y = -0.18
    floor.receiveShadow = true
    group.add(floor)

    const wallSpecs: Array<[number, number, number, number, number, number]> = [
      [0.52, 1.5, 14.8, -5.91, 0.56, 0],
      [0.52, 1.5, 14.8, 5.91, 0.56, 0],
      [11.3, 1.5, 0.52, 0, 0.56, -7.31],
      [11.3, 1.5, 0.52, 0, 0.56, 7.31],
    ]
    for (const [width, height, depth, x, y, z] of wallSpecs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial)
      wall.position.set(x, y, z)
      wall.castShadow = true
      wall.receiveShadow = true
      group.add(wall)
    }

    const rimSpecs: Array<[number, number, number, number, number]> = [
      [0.16, 14.9, -6.2, 0, 0],
      [0.16, 14.9, 6.2, 0, 0],
      [11.95, 0.16, 0, -7.6, 0],
      [11.95, 0.16, 0, 7.6, 0],
    ]
    for (const [width, depth, x, z, rotation] of rimSpecs) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), rimMaterial)
      rail.position.set(x, 1.34, z)
      rail.rotation.y = rotation
      group.add(rail)
    }

    this.trayGroup = group
    this.scene.add(group)
  }

  private applyBackground(): void {
    const skin = SKIN_CATALOG.background[this._skinSelection.background]
    this.host.style.backgroundColor = skin.color
    this.host.style.backgroundImage = 'image' in skin ? `url("${skin.image}")` : 'none'
    this.host.style.backgroundSize = 'cover'
    this.host.style.backgroundPosition = 'center'
    if (this.tableSurface) {
      const material = this.tableSurface.material as THREE.MeshStandardMaterial
      material.color.set(this._skinSelection.background === 'ivy' ? '#41392b' : skin.color)
      material.opacity = this._skinSelection.background === 'ivy' ? 0.74 : 1
      material.transparent = this._skinSelection.background === 'ivy'
      material.needsUpdate = true
    }
  }

  private rebuildTower(): void {
    if (this.towerGroup) {
      this.scene.remove(this.towerGroup)
      disposeObject(this.towerGroup)
      this.towerGroup = null
    }
    for (const body of this.towerBodies) this.physics.removeBody(body)
    this.towerBodies.length = 0

    if (this.throwMode !== 'tower') return
    const tower = createTowerGroup(this._skinSelection.tower)
    tower.position.set(0, 0, -4.9)
    this.towerGroup = tower
    this.scene.add(tower)

    for (const part of createTowerPhysics()) {
      if (part.kind === 'wall') continue
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(...part.size)),
        position: new CANNON.Vec3(part.position[0], part.position[1], part.position[2] - 4.9),
      })
      body.quaternion.setFromEuler(...part.rotation)
      this.physics.addBody(body)
      this.towerBodies.push(body)
    }
  }

  private createDiceMaterial(): THREE.MeshPhysicalMaterial {
    const skin = SKIN_CATALOG.dice[this._skinSelection.dice]
    return new THREE.MeshPhysicalMaterial({
      color: skin.base,
      roughness: skin.roughness,
      metalness: skin.metalness,
      transmission: skin.transmission,
      thickness: skin.transmission > 0 ? 0.9 : 0,
      ior: skin.transmission > 0 ? 1.46 : 1.2,
      transparent: skin.transmission > 0.5,
      opacity: skin.transmission > 0.5 ? 0.86 : 1,
      clearcoat: 0.38,
      clearcoatRoughness: 0.22,
    })
  }

  private spawnDie(spec: VisualDieSpec, index: number): void {
    const skin = SKIN_CATALOG.dice[this._skinSelection.dice]
    const geometry = createDieGeometry(spec.type)
    const polygon = new THREE.Mesh(geometry, this.createDiceMaterial())
    polygon.castShadow = true
    polygon.receiveShadow = true

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 12),
      new THREE.LineBasicMaterial({ color: skin.edge, transparent: true, opacity: 0.72 }),
    )
    polygon.add(edge)

    const group = new THREE.Group()
    group.add(polygon)
    group.add(this.labelFactory(spec.value, skin.label, skin.edge))
    this.scene.add(group)

    const x = -3.4 + (index % 3) * 3.35 + this.randomSigned() * 0.32
    const z = this.throwMode === 'tower' ? -4.9 : -2.4 + Math.floor(index / 3) * 2.9
    const y = this.throwMode === 'tower' ? 9.1 + index * 0.62 : 5.2 + index * 0.56
    const body = new CANNON.Body({
      mass: 1,
      shape: createConvexShape(spec.type),
      position: new CANNON.Vec3(this.throwMode === 'tower' ? this.randomSigned() * 0.32 : x, y, z),
      linearDamping: 0.14,
      angularDamping: 0.18,
      allowSleep: true,
      sleepSpeedLimit: 0.16,
      sleepTimeLimit: 0.5,
    })
    body.velocity.set(
      this.throwMode === 'tower' ? this.randomSigned() * 0.8 : this.randomSigned() * 3.8,
      this.throwMode === 'tower' ? -1 : 1.7 + this.randomUnit() * 1.2,
      this.throwMode === 'tower' ? 0.5 : -2.7 + this.randomSigned() * 1.4,
    )
    body.angularVelocity.set(
      5.5 + this.randomUnit() * 5,
      this.randomSigned() * 8,
      5 + this.randomUnit() * 6,
    )
    body.quaternion.setFromEuler(
      this.randomUnit() * Math.PI,
      this.randomUnit() * Math.PI,
      this.randomUnit() * Math.PI,
    )
    const id = `die-${Date.now()}-${index}`
    body.addEventListener('collide', ((event: { contact?: CANNON.ContactEquation }) => {
      const impulse = Math.abs(event.contact?.getImpactVelocityAlongNormal() ?? body.velocity.length())
      this.feedback.hit(impulse, id)
    }) as Function)
    this.physics.addBody(body)
    this.dice.push({ id, type: spec.type, value: spec.value, body, group, polygon })
  }

  private refreshDiceMaterials(): void {
    const skin = SKIN_CATALOG.dice[this._skinSelection.dice]
    for (const die of this.dice) {
      disposeMaterial(die.polygon.material)
      die.polygon.material = this.createDiceMaterial()
      const edge = die.polygon.children.find((child) => child instanceof THREE.LineSegments)
      if (edge instanceof THREE.LineSegments && edge.material instanceof THREE.LineBasicMaterial) {
        edge.material.color.set(skin.edge)
      }
    }
  }

  private syncDice(): void {
    for (const die of this.dice) {
      die.group.position.copy(die.body.position as unknown as THREE.Vector3)
      die.group.quaternion.copy(die.body.quaternion as unknown as THREE.Quaternion)
    }
  }

  private finishRoll(): void {
    if (!this.activeResult || this.phase !== 'rolling') return
    for (const [index, die] of this.dice.entries()) {
      die.body.velocity.setZero()
      die.body.angularVelocity.setZero()
      die.body.position.x = Math.max(-4.6, Math.min(4.6, die.body.position.x))
      die.body.position.z = Math.max(-6, Math.min(6, die.body.position.z))
      die.body.position.y = DIE_REST_Y + (index % 2) * 0.02
      die.body.quaternion.set(0, 0, 0, 1)
      die.body.sleep()
    }
    this.syncDice()
    this.phase = 'settled'
    this.onPhase?.('settled')
    this.onSettled?.(this.activeResult)
  }

  private clearDice(): void {
    for (const die of this.dice) {
      this.physics.removeBody(die.body)
      this.scene.remove(die.group)
      disposeObject(die.group)
    }
    this.dice.length = 0
  }

  private randomUnit(): number {
    return (this.visualEntropy() >>> 0) / 0x100000000
  }

  private randomSigned(): number {
    return this.randomUnit() * 2 - 1
  }

  private startLoop(): void {
    if (!this.requestFrame) return
    const frame = (time: number): void => {
      if (this.disposed) return
      const delta = this.lastFrameTime === 0 ? 16.67 : Math.min(50, time - this.lastFrameTime)
      this.lastFrameTime = time
      this.advance(delta)
      this.frameId = this.requestFrame?.(frame) ?? null
    }
    this.frameId = this.requestFrame(frame)
  }
}
