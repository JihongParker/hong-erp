import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import './IceField.css'

// Real-time underwater scene behind the Overview: refractive ice cubes
// (MeshPhysicalMaterial transmission, ior of ice) tumbling in place, bubble
// particles rising, light shafts from the surface. The canvas is sticky inside
// an absolutely-positioned full-height layer, and the camera dives as the page
// scrolls, so the cube field drifts past the content. Colors derive from the
// --ice-water token at runtime, so light/dark themes both work.

// One cube per entry: position across the dive (y gets more negative deeper),
// size, tumble speeds and phase. Hand-seeded so every visit looks identical.
const CUBES = [
  { x: -5.4, y: -0.6, z: -2.5, s: 1.15, ax: 0.11, ay: 0.17, ph: 0.0 },
  { x: 5.6, y: -1.8, z: -3.5, s: 0.85, ax: 0.16, ay: 0.09, ph: 1.7 },
  { x: -4.6, y: -6.5, z: -4.5, s: 1.45, ax: 0.07, ay: 0.13, ph: 3.1 },
  { x: 5.0, y: -8.4, z: -2.0, s: 0.7, ax: 0.19, ay: 0.12, ph: 4.4 },
  { x: -5.8, y: -12.6, z: -3.0, s: 1.0, ax: 0.13, ay: 0.08, ph: 2.2 },
  { x: 5.9, y: -14.8, z: -4.8, s: 1.3, ax: 0.09, ay: 0.15, ph: 5.3 },
  { x: -4.9, y: -18.9, z: -2.2, s: 0.8, ax: 0.15, ay: 0.11, ph: 0.9 },
  { x: 5.2, y: -21.2, z: -3.8, s: 1.1, ax: 0.1, ay: 0.14, ph: 3.8 },
]

const BUBBLES = 160
const DIVE_DEPTH = 20 // how far the camera travels over the full scroll

function bubbleTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function themeColors() {
  const ice = getComputedStyle(document.documentElement).getPropertyValue('--ice-water').trim() || '#7aa0af'
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const base = new THREE.Color(ice)
  const top = base.clone().lerp(new THREE.Color(dark ? '#16303c' : '#ffffff'), dark ? 0.25 : 0.55)
  const bottom = base.clone().lerp(new THREE.Color(dark ? '#04090d' : '#16333f'), dark ? 0.72 : 0.35)
  return { top, bottom, tint: base }
}

export default function IceField() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 11)

    // ── water: full-screen vertical gradient, far behind everything ──
    const colors = themeColors()
    const waterUniforms = {
      top: { value: colors.top },
      bottom: { value: colors.bottom },
      depth: { value: 0 },
    }
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 21), // ~viewport height at z=-14, so the full gradient is on screen
      new THREE.ShaderMaterial({
        uniforms: waterUniforms,
        depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; uniform float depth; varying vec2 vUv;' +
          'void main(){ vec3 c = mix(bottom, top, smoothstep(0.05, 0.98, vUv.y));' +
          'gl_FragColor = vec4(c * mix(1.0, 0.78, depth), 1.0); }',
      }),
    )
    water.position.z = -14
    // the gradient tracks the camera so the sea never runs out while diving
    scene.add(water)

    // ── light shafts from the surface ──
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { alpha: { value: 0.05 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:
        'uniform float alpha; varying vec2 vUv;' +
        'void main(){ float edge = smoothstep(0.0,0.35,vUv.x)*smoothstep(1.0,0.65,vUv.x);' +
        'gl_FragColor = vec4(vec3(1.0), alpha * edge * vUv.y); }',
    })
    const shafts: THREE.Mesh[] = []
    for (const [sx, rot, w] of [[-4.5, 0.24, 3.2], [0.5, 0.1, 4.5], [4.8, -0.2, 2.6]] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 26), shaftMat.clone())
      m.position.set(sx, 2, -8)
      m.rotation.z = rot
      shafts.push(m)
      scene.add(m)
    }

    // ── lighting + environment for the glassy ice reflections ──
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const sun = new THREE.DirectionalLight(0xeaf6ff, 2.2)
    sun.position.set(2, 8, 4)
    scene.add(sun, new THREE.AmbientLight(0xbfd8e2, 0.55))

    // ── the ice: rounded cubes with real refraction ──
    const iceMat = new THREE.MeshPhysicalMaterial({
      transmission: 1,
      thickness: 1.6,
      roughness: 0.22,
      ior: 1.31,
      color: 0xe9f6fa,
      attenuationColor: colors.tint.clone().lerp(new THREE.Color('#bfe4ee'), 0.5),
      attenuationDistance: 3.4,
      clearcoat: 0.7,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.9,
    })
    const cubes = CUBES.map((c) => {
      const geo = new RoundedBoxGeometry(c.s, c.s, c.s, 3, c.s * 0.13)
      const mesh = new THREE.Mesh(geo, iceMat)
      mesh.position.set(c.x, c.y, c.z)
      mesh.rotation.set(c.ph, c.ph * 0.7, c.ph * 0.3)
      scene.add(mesh)
      return { mesh, ...c }
    })

    // ── rising bubbles ──
    const bGeo = new THREE.BufferGeometry()
    const bPos = new Float32Array(BUBBLES * 3)
    const bSpeed = new Float32Array(BUBBLES)
    for (let i = 0; i < BUBBLES; i++) {
      bPos[i * 3] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 16 - 8
      bPos[i * 3 + 1] = (Math.sin(i * 78.233) * 12543.21 % 1) * (DIVE_DEPTH + 12) - DIVE_DEPTH - 4
      bPos[i * 3 + 2] = (Math.sin(i * 39.425) * 9631.7 % 1) * 6 - 7
      bSpeed[i] = 0.25 + Math.abs(Math.sin(i * 3.7)) * 0.5
    }
    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3))
    const bubbles = new THREE.Points(
      bGeo,
      new THREE.PointsMaterial({
        size: 0.09,
        map: bubbleTexture(),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )
    scene.add(bubbles)

    // ── sizing, scroll dive, theme, visibility ──
    const layer = host.parentElement! // .ov-icefield (full page height)
    let xScale = 1
    const resize = () => {
      const w = layer.clientWidth
      const h = window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      xScale = Math.min(1, camera.aspect / 1.55) // pull cubes inward on narrow screens
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(layer)

    let progress = 0
    const onScroll = () => {
      const r = layer.getBoundingClientRect()
      const total = r.height - window.innerHeight
      progress = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onTheme = () => {
      const c = themeColors()
      waterUniforms.top.value = c.top
      waterUniforms.bottom.value = c.bottom
      iceMat.attenuationColor = c.tint.clone().lerp(new THREE.Color('#bfe4ee'), 0.5)
    }
    mq.addEventListener('change', onTheme)

    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(layer)

    // ── animate ──
    const clock = new THREE.Clock()
    let raf = 0
    const frame = () => {
      const t = clock.getElapsedTime()
      const camY = -progress * DIVE_DEPTH
      camera.position.y = camY
      water.position.y = camY
      waterUniforms.depth.value = progress
      for (const s of shafts) s.position.y = camY + 2

      for (const c of cubes) {
        c.mesh.rotation.x = c.ph + t * c.ax
        c.mesh.rotation.y = c.ph * 0.7 + t * c.ay
        c.mesh.position.y = c.y + Math.sin(t * 0.4 + c.ph) * 0.22
        c.mesh.position.x = c.x * xScale + Math.sin(t * 0.23 + c.ph * 2) * 0.12
      }
      const pos = bGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < BUBBLES; i++) {
        let y = pos.getY(i) + bSpeed[i] * 0.016
        if (y > camY + 9) y = camY - DIVE_DEPTH * 0.4 - Math.abs(Math.sin(i)) * 6
        pos.setY(i, y)
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.8 + i) * 0.0012)
      }
      pos.needsUpdate = true

      renderer.render(scene, camera)
    }
    const loop = () => {
      if (visible) frame()
      raf = requestAnimationFrame(loop)
    }
    if (reduced) {
      frame() // single static frame
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', onTheme)
      ro.disconnect()
      io.disconnect()
      pmrem.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose())
      })
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="ov-icefield" aria-hidden>
      <div className="ov-icefield-sticky" ref={hostRef} />
    </div>
  )
}
