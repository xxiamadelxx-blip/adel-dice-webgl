import * as THREE from 'three'

export function createLabelSprite(value: string, color: string, rimColor: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable for die labels')

  context.clearRect(0, 0, 256, 256)
  context.fillStyle = 'rgba(9, 10, 12, 0.76)'
  context.beginPath()
  context.arc(128, 128, 76, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = rimColor
  context.lineWidth = 7
  context.stroke()
  context.fillStyle = color
  context.font = `${value.length > 2 ? 76 : 96}px Georgia, serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(value, 128, 136)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.name = 'die-result-label'
  sprite.position.set(0, 1.02, 0)
  sprite.scale.set(0.96, 0.96, 0.96)
  return sprite
}
