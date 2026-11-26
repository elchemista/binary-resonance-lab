import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function volume(host) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    return fallback(host)
  }
  host.append(renderer.domElement)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50)
  camera.up.set(0, 0, 1)
  camera.position.set(2.9, -4.1, 2.7)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.minDistance = 2.35
  controls.maxDistance = 8
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.8, 1.8, 1.8)),
    new THREE.LineBasicMaterial({ color: 0x9485cd, transparent: true, opacity: 0.64 }),
  )
  scene.add(wire)
  // Mark positive directions in the same coordinate system as the simulation.
  for (const [letter, position] of [
    ['X', [1.04, -0.9, -0.9]],
    ['Y', [-0.9, 1.04, -0.9]],
    ['Z', [-0.9, -0.9, 1.04]],
  ]) {
    const label = document.createElement('canvas')
    label.width = label.height = 64
    const ctx = label.getContext('2d')
    ctx.font = '42px monospace'
    ctx.fillStyle = '#ded1f8'
    ctx.textAlign = 'center'
    ctx.fillText(letter, 32, 47)
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(label), depthTest: false }),
    )
    sprite.position.set(...position)
    sprite.scale.setScalar(0.14)
    scene.add(sprite)
  }
  const floor = new THREE.GridHelper(7, 32, 0x37364d, 0x282636)
  floor.rotation.x = Math.PI / 2
  floor.position.z = -0.94
  floor.material.transparent = true
  floor.material.opacity = 0.44
  scene.add(floor)
  const cloud = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  scene.add(cloud)
  const markers = new THREE.Group()
  scene.add(markers)
  const paint = () => renderer.render(scene, camera)
  controls.addEventListener('change', paint)
  const resize = new ResizeObserver(() => {
    if (!host.clientWidth || !host.clientHeight) return
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
    paint()
  })
  resize.observe(host)
  let markerKey = ''
  return (frame, opacity) => {
    const { positions, active, config: c } = frame,
      scale = 1.8 / (c.size - 1)
    const xyz = Float32Array.from(positions, (v) => v * scale - 0.9)
    const rgb = new Float32Array(xyz.length)
    for (let i = 0; i < active.length; i++) {
      const z = positions[i * 3 + 2] / c.size
      rgb.set(active[i] ? [0.36 + 0.28 * z, 0.16 + 0.14 * z, 0.84 + 0.16 * z] : [0.04, 0.034, 0.053], i * 3)
    }
    cloud.geometry.dispose()
    cloud.geometry = new THREE.BufferGeometry()
    cloud.geometry.setAttribute('position', new THREE.BufferAttribute(xyz, 3))
    cloud.geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3))
    cloud.material.opacity = opacity
    cloud.material.size = c.size <= 32 ? 0.04 : 0.032
    const key = JSON.stringify([c.size, c.sources, c.regions])
    if (key !== markerKey) {
      for (const obj of markers.children) {
        obj.geometry.dispose()
        obj.material.dispose()
      }
      markers.clear()
      for (const s of c.sources.filter((s) => s.enabled)) {
        const dot = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.048),
          new THREE.MeshBasicMaterial({ color: 0xffbc73, depthTest: false }),
        )
        dot.position.set(s.x * scale - 0.9, s.y * scale - 0.9, s.z * scale - 0.9)
        dot.renderOrder = 2
        markers.add(dot)
      }
      for (const r of c.regions) {
        const box = new THREE.BoxGeometry(
          (r.x2 - r.x + 1) * scale,
          (r.y2 - r.y + 1) * scale,
          (r.z2 - r.z + 1) * scale,
        )
        const mesh = new THREE.LineSegments(
          new THREE.EdgesGeometry(box),
          new THREE.LineBasicMaterial({ color: 0x62d5c6 }),
        )
        box.dispose()
        mesh.position.set(
          ((r.x + r.x2) * scale) / 2 - 0.9,
          ((r.y + r.y2) * scale) / 2 - 0.9,
          ((r.z + r.z2) * scale) / 2 - 0.9,
        )
        markers.add(mesh)
      }
      markerKey = key
    }
    paint()
  }
}

// Software projection for machines with WebGL disabled.
function fallback(host) {
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const ctx = canvas.getContext('2d')
  let latest,
    alpha,
    angle = 0.62,
    tilt = 0.53,
    zoom = 1,
    drag
  function draw() {
    if (!latest) return
    const w = host.clientWidth,
      h = host.clientHeight
    canvas.width = w * devicePixelRatio
    canvas.height = h * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
    const s = Math.min(w, h) * 0.57 * zoom,
      n = latest.config.size
    const project = (x, y, z) => {
      x = x / (n - 1) - 0.5
      y = y / (n - 1) - 0.5
      z = z / (n - 1) - 0.5
      return [
        w / 2 + s * (x * Math.cos(angle) - y * Math.sin(angle)),
        h / 2 + s * ((x * Math.sin(angle) + y * Math.cos(angle)) * Math.sin(tilt) - z * Math.cos(tilt)),
      ]
    }
    const line = (a, b) => {
      ctx.beginPath()
      ctx.moveTo(...project(...a))
      ctx.lineTo(...project(...b))
      ctx.stroke()
    }
    ctx.strokeStyle = '#746297'
    for (const x of [0, n - 1])
      for (const y of [0, n - 1]) {
        line([x, y, 0], [x, y, n - 1])
        line([x, 0, y], [x, n - 1, y])
        line([0, x, y], [n - 1, x, y])
      }
    ctx.globalAlpha = alpha
    latest.active.forEach((b, i) => {
      ctx.fillStyle = b ? '#b095ff' : '#393348'
      const [x, y] = project(...latest.positions.subarray(i * 3, i * 3 + 3))
      ctx.fillRect(x, y, 1.6, 1.6)
    })
    ctx.globalAlpha = 1
    for (const r of latest.config.regions) {
      ctx.strokeStyle = '#62d5c6'
      for (const x of [r.x, r.x2]) for (const y of [r.y, r.y2]) line([x, y, r.z], [x, y, r.z2])
      for (const z of [r.z, r.z2]) {
        for (const x of [r.x, r.x2]) line([x, r.y, z], [x, r.y2, z])
        for (const y of [r.y, r.y2]) line([r.x, y, z], [r.x2, y, z])
      }
    }
    for (const v of latest.config.sources.filter((s) => s.enabled)) {
      ctx.fillStyle = '#ffba6b'
      const [x, y] = project(v.x, v.y, v.z)
      ctx.fillRect(x - 3, y - 3, 6, 6)
    }
  }
  canvas.onpointerdown = (e) => {
    drag = [e.clientX, e.clientY]
    canvas.setPointerCapture(e.pointerId)
  }
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null)
  canvas.onpointermove = (e) => {
    if (drag) {
      angle += (e.clientX - drag[0]) * 0.01
      tilt += (e.clientY - drag[1]) * 0.01
      drag = [e.clientX, e.clientY]
      draw()
    }
  }
  canvas.onwheel = (e) => {
    e.preventDefault()
    zoom = Math.min(2.5, Math.max(0.5, zoom * Math.exp(-e.deltaY * 0.001)))
    draw()
  }
  new ResizeObserver(draw).observe(host)
  return (f, o) => {
    latest = f
    alpha = o
    draw()
  }
}
