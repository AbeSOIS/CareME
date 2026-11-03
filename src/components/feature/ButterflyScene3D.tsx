import { useEffect, useRef } from 'react'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const GLB_URL = '/butterfly_3d.glb'
const FOV_DEG = 45
const CAMERA_DISTANCE = 10

// A small swarm rather than one lone butterfly: different starting corners, wander
// speeds and phases so they drift apart instead of moving in lockstep, plus a size per
// butterfly for a little visual variety. Positions are fractions of the viewport (0–1,
// top-left origin), converted to world coordinates each frame against the live camera.
const SWARM = [
  { xFrac: 0.72, yFrac: 0.3, scale: 1.15, phase: 0, driftSpeed: 1, swoopSign: 1 },
  { xFrac: 0.2, yFrac: 0.55, scale: 0.85, phase: 2.1, driftSpeed: 1.3, swoopSign: -1 },
  { xFrac: 0.45, yFrac: 0.78, scale: 1, phase: 4.4, driftSpeed: 0.8, swoopSign: 1 },
] as const

/**
 * The site's one "3D" flourish: a small swarm of the real butterfly model
 * (public/butterfly_3d.glb — a single body + wing_L + wing_R, no baked animation, so the
 * flap below is driven by hand) that roams the whole viewport and persists across every
 * page, mounted once in AppShell rather than per-route. The camera is static; each
 * butterfly's position is computed as a fraction of the viewport (idle wandering plus a
 * scroll-reactive "swoop" — scrolling faster nudges it further, decaying back to its lazy
 * drift) and converted to world space against that fixed camera each frame, so "near the
 * top-right corner" always means the top-right corner regardless of page length.
 *
 * three.js is dynamically imported so no page pays for it until this mounts, and the
 * whole thing is a no-op under prefers-reduced-motion — scroll-linked parallax is exactly
 * the kind of motion those users want to avoid.
 */
export function ButterflyScene3D() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || prefersReducedMotion()) return

    let raf = 0
    let disposed = false
    let cleanup = () => {}

    void (async () => {
      const [THREE, { GLTFLoader }] = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')])
      if (disposed || !host) return

      const canvas = document.createElement('canvas')
      canvas.className = 'block h-full w-full'
      host.appendChild(canvas)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 40)
      camera.position.set(0, 0, CAMERA_DISTANCE)

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      scene.add(new THREE.AmbientLight(0xffffff, 1.1))
      const key = new THREE.DirectionalLight(0xffffff, 1.2)
      key.position.set(3, 4, 6)
      scene.add(key)
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)
      fillLight.position.set(-4, -2, 3)
      scene.add(fillLight)

      const gltf = await new GLTFLoader().loadAsync(GLB_URL)
      if (disposed) return
      const source = gltf.scene
      // The model's own scale is ~7 units wide; shrink it down to fit our scene.
      const MODEL_SCALE = 0.16

      const flapAxis = new THREE.Vector3(0, 1, 0)
      const flyers = SWARM.map((cfg) => {
        const group = new THREE.Group()
        const wingL = source.getObjectByName('wing_L')!.clone()
        const wingR = source.getObjectByName('wing_R')!.clone()
        const body = source.getObjectByName('body')!.clone()
        group.add(wingL, wingR, body)
        group.scale.setScalar(MODEL_SCALE * cfg.scale)
        scene.add(group)
        return {
          group,
          cfg,
          wingL,
          wingR,
          baseL: wingL.quaternion.clone(),
          baseR: wingR.quaternion.clone(),
          x: cfg.xFrac as number,
          y: cfg.yFrac as number,
          vx: 0,
          vy: 0,
        }
      })

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host
        if (w === 0 || h === 0) return
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(host)

      let lastScrollY = window.scrollY
      let visible = !document.hidden
      const onVisibility = () => (visible = !document.hidden)
      document.addEventListener('visibilitychange', onVisibility)

      const start = performance.now()
      const flapQuat = new THREE.Quaternion()
      const vFov = (FOV_DEG * Math.PI) / 180
      const animate = () => {
        if (disposed) return
        raf = requestAnimationFrame(animate)
        if (!visible) return

        const t = (performance.now() - start) / 1000
        const scrollY = window.scrollY
        const scrollDelta = scrollY - lastScrollY
        lastScrollY = scrollY

        for (const f of flyers) {
          const tt = t * f.cfg.driftSpeed + f.cfg.phase

          // Lazy wandering target, independent of scrolling.
          const targetX = 0.5 + 0.35 * Math.sin(tt * 0.15)
          const targetY = 0.45 + 0.3 * Math.sin(tt * 0.22 + 1.3)

          // A scroll "kick" steers it toward a point further down/across the viewport,
          // proportional to how fast the page is moving.
          const kickX = 0.18 * f.cfg.swoopSign * Math.sign(Math.sin(tt * 0.3))
          const kickY = Math.max(-0.3, Math.min(0.3, scrollDelta * 0.003))

          f.vx += ((targetX + kickX - f.x) * 0.002 - f.vx * 0.08) * 1
          f.vy += ((targetY + kickY - f.y) * 0.002 - f.vy * 0.08) * 1
          f.x = Math.max(0.05, Math.min(0.95, f.x + f.vx))
          f.y = Math.max(0.05, Math.min(0.95, f.y + f.vy))

          // A slow depth bob (nearer/further from the camera), recomputed against the
          // actual distance so it reads as flying toward/away rather than sliding
          // across a flat plane, without drifting off its intended screen position.
          const depthOffset = Math.sin(tt * 0.45) * 1.5
          const distance = CAMERA_DISTANCE - depthOffset
          const vh = 2 * Math.tan(vFov / 2) * distance
          const vw = vh * camera.aspect
          f.group.position.set((f.x - 0.5) * vw, (0.5 - f.y) * vh, depthOffset)

          const flip = f.vx < 0 ? -1 : 1
          const bank = Math.max(-0.4, Math.min(0.4, f.vy * 8))
          f.group.rotation.z = bank
          f.group.rotation.y = flip < 0 ? Math.PI : 0

          const angle = Math.sin(tt * 9) * 0.6
          f.wingL.quaternion.copy(f.baseL).multiply(flapQuat.setFromAxisAngle(flapAxis, angle))
          f.wingR.quaternion.copy(f.baseR).multiply(flapQuat.setFromAxisAngle(flapAxis, -angle))
        }

        renderer.render(scene, camera)
      }
      animate()

      cleanup = () => {
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        cancelAnimationFrame(raf)
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>
          if (mesh.isMesh) {
            mesh.geometry?.dispose()
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const m of mats) m?.dispose()
          }
        })
        renderer.dispose()
        canvas.remove()
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return <div ref={hostRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />
}
