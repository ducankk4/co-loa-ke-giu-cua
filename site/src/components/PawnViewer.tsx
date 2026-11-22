import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Quân Token lính dạng 3D thật (Three.js, tải lười khi ô hiện ra).
 * Dựng bằng hình khối cơ bản theo dáng quân nhựa team gửi (mũ, đầu tròn, áo dài, đai, giày, đế).
 * Chủ dự án đã đồng ý dùng Three.js riêng cho phần này (2026-11-22).
 * Tự xoay chậm; kéo chuột/vuốt để xoay; tắt tự xoay khi prefers-reduced-motion.
 * Không có WebGL thì hiện ảnh `fallback` (ảnh phẳng cũ).
 */
export default function PawnViewer({ fallback, label }: { fallback: string[]; label: string }) {
  const host = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let dispose: (() => void) | undefined
    let cancelled = false
    let started = false

    const start = async () => {
      if (started) return
      started = true
      try {
        const T = await import('three')
        if (cancelled) return
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.outputColorSpace = T.SRGBColorSpace
        renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab'
        el.appendChild(renderer.domElement)

        const scene = new T.Scene()
        const camera = new T.PerspectiveCamera(30, 1, 0.1, 50)
        camera.position.set(0, 1.15, 7.2)
        camera.lookAt(0, 1.05, 0)
        scene.add(new T.HemisphereLight(0xffffff, 0x223355, 1.25))
        const key = new T.DirectionalLight(0xffffff, 2.2)
        key.position.set(3, 5, 4)
        scene.add(key)
        const rim = new T.DirectionalLight(0xffe2a0, 1.1)
        rim.position.set(-4, 2, -3)
        scene.add(rim)

        const geos: { dispose(): void }[] = []
        const mats: { dispose(): void }[] = []
        const part = <G extends import('three').BufferGeometry>(g: G, m: import('three').Material, x = 0, y = 0, z = 0) => {
          geos.push(g)
          const mesh = new T.Mesh(g, m)
          mesh.position.set(x, y, z)
          return mesh
        }

        /** Một quân lính; tỉ lệ theo ảnh: đế, giày, áo dài, đai, tay, đầu tròn, mũ có núm */
        const makePawn = (color: number) => {
          const m = new T.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.05 })
          mats.push(m)
          const g = new T.Group()
          g.add(part(new T.CylinderGeometry(0.62, 0.68, 0.1, 40), m, 0, 0.05, 0))
          for (const s of [-1, 1]) g.add(part(new T.CapsuleGeometry(0.16, 0.34, 6, 16), m, s * 0.19, 0.38, 0.04))
          const robe = part(new T.CylinderGeometry(0.34, 0.5, 1.05, 32), m, 0, 1.0, 0)
          robe.scale.z = 0.72
          g.add(robe)
          const belt = part(new T.CylinderGeometry(0.43, 0.43, 0.12, 32), m, 0, 1.18, 0)
          belt.scale.z = 0.74
          g.add(belt)
          const collar = part(new T.CylinderGeometry(0.36, 0.34, 0.14, 32), m, 0, 1.55, 0)
          collar.scale.z = 0.7
          g.add(collar)
          for (const s of [-1, 1]) {
            const arm = part(new T.CapsuleGeometry(0.11, 0.62, 6, 16), m, s * 0.5, 1.2, 0)
            arm.rotation.z = s * 0.12
            g.add(arm)
          }
          g.add(part(new T.SphereGeometry(0.4, 40, 32), m, 0, 1.98, 0))
          g.add(part(new T.SphereGeometry(0.46, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 2.1, 0))
          g.add(part(new T.CylinderGeometry(0.5, 0.5, 0.04, 40), m, 0, 2.08, 0))
          g.add(part(new T.SphereGeometry(0.1, 20, 16), m, 0, 2.6, 0))
          g.add(part(new T.CylinderGeometry(0.05, 0.05, 0.1, 12), m, 0, 2.54, 0))
          return g
        }

        const blue = makePawn(0x2f6fe0)
        const red = makePawn(0xe0442f)
        blue.position.x = -0.55
        red.position.x = 0.55
        red.position.z = 0.1
        const pair = new T.Group()
        pair.add(blue, red)
        pair.scale.setScalar(0.78)
        pair.position.y = -0.05
        scene.add(pair)

        const resize = () => {
          const w = el.clientWidth, h = el.clientHeight
          renderer.setSize(w, h, false)
          camera.aspect = w / h
          camera.updateProjectionMatrix()
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(el)

        // Kéo để xoay (quán tính nhẹ), thả ra thì tự xoay chậm tiếp
        let rotY = -0.5, vel = 0, dragging = false, lastX = 0, visible = true
        const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = 'grabbing' }
        const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; rotY += dx * 0.012; vel = dx * 0.012 }
        const up = () => { dragging = false; renderer.domElement.style.cursor = 'grab' }
        renderer.domElement.addEventListener('pointerdown', down)
        renderer.domElement.addEventListener('pointermove', move)
        renderer.domElement.addEventListener('pointerup', up)
        renderer.domElement.addEventListener('pointercancel', up)

        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
        io.observe(el)

        let raf = 0, last = performance.now()
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame)
          if (!visible) { last = now; return }
          const dt = Math.min(0.05, (now - last) / 1000)
          last = now
          if (!dragging) {
            rotY += vel
            vel *= 0.94
            if (!reduced) rotY += dt * 0.7
          }
          pair.rotation.y = rotY
          pair.position.y = reduced ? -0.05 : -0.05 + Math.sin(now / 900) * 0.04
          renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(frame)

        dispose = () => {
          cancelAnimationFrame(raf)
          ro.disconnect()
          io.disconnect()
          geos.forEach((x) => x.dispose())
          mats.forEach((x) => x.dispose())
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    // Chỉ tải Three.js khi ô sắp vào màn hình
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start() } }, { rootMargin: '200px' })
    io.observe(el)
    return () => { cancelled = true; io.disconnect(); dispose?.() }
  }, [reduced])

  if (failed) {
    return <>{fallback.map((src) => <img key={src} src={src} alt="" className="pt-img h-32 w-auto" />)}</>
  }
  return <div ref={host} role="img" aria-label={`${label} (mô hình 3D, kéo để xoay)`} className="pt-3d" />
}
