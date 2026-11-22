import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { boxFaces, guidePages, mapImage, mapImageHd, type Card, type CardGroup } from '../data/cards'
import { boxText } from '../data/boxText'
import { parts, type Part } from '../data/gameInfo'
import { useReducedMotion } from '../hooks/useReducedMotion'
import BoxTray, { coverStyle, DeckBody, deckTone, type TrayPick } from './BoxTray'

gsap.registerPlugin(Flip)

/*
 * Hộp game 3D bằng CSS (preserve-3d) + GSAP, không dùng Three.js.
 * Cấu trúc: .bx-scale (phối cảnh) > .bx-float > .bx-bob > .bx-hover > .bx-rx (xoay ngang trục X màn hình, "nghiêng/lật")
 *   > .bx-rz (xoay quanh trục đứng của hộp) > thân + nắp. Gốc tọa độ = tâm hộp; hộp rộng W, sâu D, cao T.
 * Kéo chuột/vuốt xoay tự do 360° (pitch trên .bx-rx, yaw trên .bx-rz), quán tính tự viết bằng gsap.ticker.
 * Mở hộp: nắp bay đi rồi đáp cạnh hộp (lớp 2D), hộp xoay nhìn từ trên xuống thành lòng hộp (khay), tấm bản đồ
 * phủ lên trên mọi món trong khay. Bấm bản đồ: xem chi tiết (phóng to). Quay lại: bản đồ bay ra đặt cạnh hộp, dưới nắp.
 */
const W = 460, D = 307, T = 88, LH = 28 // rộng, sâu, cao toàn hộp, cao nắp (px, trước khi co theo màn hình)
const PITCH0 = 54, YAW0 = -24, PITCH_OPEN = 12
const K = 0.22 // độ xoay mỗi px kéo (thấp = kéo chậm, dễ dừng đúng mặt muốn xem)
const CLICK_PX = 6 // di chuyển dưới ngưỡng này = bấm, không phải kéo
const ZOOM_MAX = 2.6 // phóng to hộp bằng cuộn chuột (xem rõ nắp và đáy)

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Góc tương đương gần `cur` nhất (để xoay ngắn nhất về `tgt`) */
const near = (cur: number, tgt: number) => tgt + 360 * Math.round((cur - tgt) / 360)

/** Token trong hộp: lấy đúng mục, số lượng, ghi chú từ nội dung team (gameInfo.parts).
 *  Ngăn token tròn = Token chiến thắng + Token nỏ; ngăn quân nhựa = Token lính. */
type TokenKind = 'tokens' | 'pawns'
const part = (id: string) => parts.find((p) => p.id === id)!
const TOKEN_SETS: Record<TokenKind, { title: string; items: Part[] }> = {
  tokens: { title: boxText.tokensName, items: [part('token-thang'), part('token-no')] },
  pawns: { title: boxText.pawnsName, items: [part('token-linh')] },
}

/** Nút quay lại của các trang chi tiết: tách riêng khỏi nội dung, có mũi tên SVG */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" autoFocus onClick={onClick} className="bx-back">
      <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      <span>{boxText.back}</span>
    </button>
  )
}

/** Bốn mặt bên: transform dựng mặt ở tâm hộp (đã kiểm tra chiều chữ khi nhìn từ ngoài) */
const SIDES = [
  { k: 'f', src: boxFaces.sideLong, w: W, t: `translateY(${D / 2}px) rotateX(-90deg)`, shade: 0.92 },
  { k: 'b', src: boxFaces.sideLong, w: W, t: `translateY(${-D / 2}px) rotateX(90deg) rotateZ(180deg)`, shade: 0.62 },
  { k: 'r', src: boxFaces.sideShort, w: D, t: `translateX(${W / 2}px) rotateY(90deg) rotateZ(-90deg)`, shade: 0.78 },
  { k: 'l', src: boxFaces.sideShort, w: D, t: `translateX(${-W / 2}px) rotateY(-90deg) rotateZ(90deg)`, shade: 0.7 },
]

function Face({ w, h, t, cls = '', style, children }: { w: number; h: number; t: string; cls?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={`bx-f ${cls}`} style={{ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: t, ...style }}>{children}</div>
  )
}

/** Mặt bên cắt theo đoạn cao [z0 trên, h]; lid=true lấy phần trên (nắp), lid=false lấy phần dưới (thân) */
function sideSegments(lid: boolean) {
  const h = lid ? LH : T - LH
  const zc = lid ? T / 2 - LH / 2 : -LH / 2
  const off = lid ? 0 : LH
  return SIDES.map((d) => (
    <Face key={d.k} w={d.w} h={h} t={`translateZ(${zc}px) ${d.t}`}
      // Đổ bóng bằng lớp phủ tối thay cho filter: filter trên mặt 3D làm trình duyệt vẽ mặt ở độ phân giải thấp (mờ)
      style={{ background: `linear-gradient(rgb(0 0 0 / ${(1 - d.shade).toFixed(2)}), rgb(0 0 0 / ${(1 - d.shade).toFixed(2)})), url(${d.src}) 0 ${-off}px / 100% ${T}px no-repeat` }} />
  ))
}

/** Tách text lá bài thành các dòng; dòng đầu (nhãn như "Gián điệp") in nhỏ, dòng ngắn sau đó in đậm */
function CardText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-3 leading-relaxed">
      {lines.map((l, i) =>
        i === 0 && lines.length > 1 ? (
          <p key={i} className="text-xs font-bold uppercase tracking-[.18em] text-mist/70">{l}</p>
        ) : i > 0 && l.length <= 10 ? (
          <p key={i} className="font-display font-bold text-gold">{l}</p>
        ) : (
          <p key={i}>{l}</p>
        ),
      )}
    </div>
  )
}

export default function BoxIntro() {
  const root = useRef<HTMLElement>(null)
  const el = useRef<Record<string, HTMLElement | null>>({})
  const tl = useRef<gsap.core.Timeline | null>(null)
  const bob = useRef<gsap.core.Tween | null>(null)
  const st = useRef({ pitch: PITCH0, yaw: YAW0, vp: 0, vy: 0, drag: false, sx: 0, sy: 0, lx: 0, ly: 0, lt: 0, max: 0 })
  const openRef = useRef(false)
  const focusSel = useRef<string | null>(null)
  const reduced = useReducedMotion()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  const [open, setOpen] = useState(false)
  const [ever, setEver] = useState(false) // đã mở lần nào: chỉ khi đó mới tải ảnh map/bài
  const [stack, setStack] = useState<CardGroup | null>(null)
  const [guide, setGuide] = useState(false)
  const [tokensOpen, setTokensOpen] = useState<TokenKind | null>(null)
  const [mapView, setMapView] = useState(false) // đang xem chi tiết bản đồ
  const [mapAside, setMapAside] = useState(false) // bản đồ đã được nhấc khỏi khay, đặt cạnh hộp
  const flipState = useRef<Flip.FlipState | null>(null)
  const deckBack = useRef<(() => void) | null>(null) // DeckFocus gắn hàm lùi có hiệu ứng vào đây (Esc dùng)
  const [card, setCard] = useState<Card | null>(null)
  const [hd, setHd] = useState(false) // đã phóng to hoặc kéo xoay hộp: đổi nắp/đáy sang ảnh 3000px cho nét
  const detail = !!(stack || guide || tokensOpen || mapView)
  const ref = (k: string) => (n: HTMLElement | null) => { el.current[k] = n }

  const paint = () => {
    const s = st.current
    gsap.set(el.current.rx!, { rotationX: s.pitch })
    gsap.set(el.current.rz!, { rotation: s.yaw })
  }

  // Khởi tạo góc, vòng quán tính, lơ lửng, nghiêng nhẹ theo con trỏ
  useLayoutEffect(() => {
    const s = st.current
    paint()
    const tick = (_t: number, dtMs: number) => {
      if (s.drag || openRef.current) return
      if (Math.abs(s.vp) + Math.abs(s.vy) < 1) { s.vp = s.vy = 0; return }
      const dt = Math.min(dtMs, 50) / 1000
      s.pitch += s.vp * dt
      s.yaw += s.vy * dt
      const f = Math.exp(-3 * dt)
      s.vp *= f
      s.vy *= f
      paint()
    }
    gsap.ticker.add(tick)
    bob.current = gsap.to(el.current.bob!, { y: -8, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    if (reducedRef.current) bob.current.pause(0)
    return () => {
      gsap.ticker.remove(tick)
      bob.current?.kill()
      tl.current?.kill()
    }
  }, [])

  useEffect(() => { if (reduced) bob.current?.pause(0); else if (!openRef.current) bob.current?.play() }, [reduced])

  // Cuộn chuột trên hộp đóng để phóng to/thu nhỏ. Ở mức nhỏ nhất, cuộn xuống vẫn cuộn trang như thường;
  // chỉ phóng khi section hộp đang nằm gọn trong màn hình (không chặn người đang cuộn ngang qua).
  const zoom = useRef(1)
  useEffect(() => {
    const hit = el.current.hit
    if (open || !hit) return
    const wheel = (e: WheelEvent) => {
      const zin = e.deltaY < 0
      if (!zin && zoom.current <= 1) return
      if (Math.abs(root.current!.getBoundingClientRect().top) > 80) return
      e.preventDefault()
      zoom.current = clamp(zoom.current * Math.exp(-e.deltaY * 0.0015), 1, ZOOM_MAX)
      if (zoom.current > 1.05) setHd(true)
      // Đang phóng to thì dừng lơ lửng: lớp 3D còn chuyển động liên tục thì trình duyệt không vẽ lại ở độ phân giải mới (ảnh bị vỡ hạt)
      if (zoom.current > 1.01) { bob.current?.pause(); gsap.to(el.current.bob!, { y: 0, duration: 0.3, overwrite: 'auto' }) }
      else if (!reducedRef.current) bob.current?.play()
      gsap.to(el.current.zoom!, { scale: zoom.current, duration: reducedRef.current ? 0 : 0.3, ease: 'power2.out', overwrite: 'auto' })
    }
    hit.addEventListener('wheel', wheel, { passive: false })
    return () => hit.removeEventListener('wheel', wheel)
  }, [open])

  // Mở/đóng: dựng timeline mới mỗi lần mở để lấy đúng góc xoay hiện tại
  useLayoutEffect(() => {
    openRef.current = open
    if (!open) {
      const t = tl.current
      if (!t) return
      if (reduced) { t.progress(0); bob.current?.play() }
      else t.timeScale(1.6).eventCallback('onReverseComplete', () => bob.current?.play()).reverse()
      return
    }
    tl.current?.kill()
    const s = st.current
    s.vp = s.vy = 0
    bob.current?.pause()
    const stacks = gsap.utils.toArray<HTMLElement>('.bx-tray .bx-stack', root.current)
    const tray = root.current!.querySelector('.bx-tray')
    zoom.current = 1
    const t = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } })
      .to(el.current.zoom!, { scale: 1, duration: 0.35 }, 0)
      .to(el.current.bob!, { y: 0, duration: 0.3 }, 0)
      .to(el.current.lid!, { z: 240, duration: 0.55, ease: 'power2.out' }, 0)
      .to(el.current.lid!, { y: -D * 1.5, z: 520, autoAlpha: 0, duration: 0.7 }, 0.5)
      .to(el.current.rx!, { rotationX: near(s.pitch, PITCH_OPEN), duration: 1 }, 0.15)
      .to(el.current.rz!, { rotation: near(s.yaw, 0), duration: 1 }, 0.15)
      .fromTo(el.current.map!, { autoAlpha: 0, scale: 0.34, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.95)
      .to(el.current.float!, { scale: 1.35, duration: 0.9 }, 0.95)
      .set(el.current.float!, { visibility: 'hidden' }, 1.85)
      .fromTo(tray, { autoAlpha: 0, scale: 0.86, y: 30 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.15)
      // Các món trong khay hiện ngay (bị bản đồ che); hiệu ứng nảy lên chạy khi bản đồ được nhấc ra
      .set(stacks, { autoAlpha: 1 }, 1.5)
      // Nắp 3D bay đi, nắp 2D đáp xuống cạnh hộp
      .fromTo(el.current.lid2!, { autoAlpha: 0, x: -60, y: -90, rotation: -14, scale: 1.25 }, { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: 0.8, ease: 'power3.out' }, 1.1)
      // Tấm bản đồ thả xuống phủ lên khay
      .fromTo(el.current.sheet!, { autoAlpha: 0, y: -50, scale: 1.12, rotation: -3 }, { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.7, ease: 'power3.out' }, 1.55)
    tl.current = t
    if (reduced) t.progress(1)
    else t.play()
  }, [open, reduced])

  const openBox = () => {
    if (openRef.current) return
    setEver(true)
    setOpen(true)
  }
  const closeBox = () => {
    setCard(null)
    setStack(null)
    setGuide(false)
    setTokensOpen(null)
    setMapView(false)
    setMapAside(false)
    setOpen(false)
  }

  // Kéo để xoay; bấm (di chuyển < 6px) để mở
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const s = st.current
    e.currentTarget.setPointerCapture(e.pointerId)
    s.drag = true
    setHd(true) // người dùng bắt đầu xoay xem mặt đáy: tải ảnh nét
    s.vp = s.vy = 0
    s.sx = s.lx = e.clientX
    s.sy = s.ly = e.clientY
    s.lt = performance.now()
    s.max = 0
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current
    if (!s.drag) {
      // Chỉ rê chuột (không giữ): nghiêng nhẹ
      if (e.pointerType !== 'mouse' || reducedRef.current) return
      const r = e.currentTarget.getBoundingClientRect()
      gsap.to(el.current.hover!, { rotationY: ((e.clientX - r.left) / r.width - 0.5) * 14, rotationX: -((e.clientY - r.top) / r.height - 0.5) * 8, duration: 0.8, ease: 'power3', overwrite: 'auto' })
      return
    }
    const now = performance.now()
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly
    s.max = Math.max(s.max, Math.hypot(e.clientX - s.sx, e.clientY - s.sy))
    // Hướng xoay ngang đổi theo mặt đang quay về phía người xem (lật ngược thì đảo chiều)
    const sn = Math.sin((s.pitch * Math.PI) / 180)
    const dir = (sn >= 0 ? -1 : 1) * Math.min(1, 0.5 + Math.abs(sn))
    const dyaw = dx * K * dir, dpitch = -dy * K
    s.yaw += dyaw
    s.pitch += dpitch
    const dt = Math.max((now - s.lt) / 1000, 0.001)
    const cap = (v: number) => Math.max(-420, Math.min(420, v))
    s.vy = cap(s.vy * 0.5 + (dyaw / dt) * 0.5)
    s.vp = cap(s.vp * 0.5 + (dpitch / dt) * 0.5)
    s.lx = e.clientX; s.ly = e.clientY; s.lt = now
    paint()
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current
    if (!s.drag) return
    s.drag = false
    if (reducedRef.current || performance.now() - s.lt > 90) s.vp = s.vy = 0
    if (e.type === 'pointerup' && s.max < CLICK_PX) openBox()
  }
  const onLeave = () => { gsap.to(el.current.hover!, { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'power3', overwrite: 'auto' }) }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = st.current
    const step = 20
    const to: Record<string, [number, number]> = { ArrowLeft: [0, step], ArrowRight: [0, -step], ArrowUp: [step, 0], ArrowDown: [-step, 0] }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBox(); return }
    const d = to[e.key]
    if (!d) return
    e.preventDefault()
    s.vp = s.vy = 0
    const tgt = { pitch: s.pitch + d[0], yaw: s.yaw + d[1] }
    if (reducedRef.current) { s.pitch = tgt.pitch; s.yaw = tgt.yaw; paint() }
    else gsap.to(s, { ...tgt, duration: 0.35, ease: 'power2.out', overwrite: 'auto', onUpdate: paint })
  }

  // Chọn chồng / lá: nhớ phần tử để trả focus khi lùi
  const pickStack = (g: TrayPick) => {
    focusSel.current = null
    if (g === 'guide') setGuide(true)
    else if (g === 'tokens' || g === 'pawns') setTokensOpen(g)
    else setStack(g)
  }
  const backFromDetail = () => {
    focusSel.current = `[data-stack="${stack ? stack.id : tokensOpen ?? (mapView ? 'map' : 'guide')}"]`
    if (mapView && !mapAside) {
      // Lần đầu xem xong bản đồ: nhấc bản đồ khỏi khay, đặt cạnh hộp (Flip từ vị trí cũ sang chỗ mới)
      flipState.current = Flip.getState('[data-flip-id]', { props: 'opacity' })
      setMapAside(true)
    }
    setStack(null)
    setGuide(false)
    setTokensOpen(null)
    setMapView(false)
  }
  useLayoutEffect(() => {
    const state = flipState.current
    flipState.current = null
    if (!mapAside || !state || reducedRef.current) return
    Flip.from(state, { targets: '[data-flip-id]', duration: 0.9, ease: 'power3.inOut', scale: true, absolute: true })
    // Khay lộ ra: các món nảy lên lần lượt, ánh vàng tắt dần
    const stacks = gsap.utils.toArray<HTMLElement>('.bx-tray .bx-stack', root.current)
    gsap.fromTo(stacks, { y: -24, scale: 1.18 }, { y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.5)', stagger: 0.12, delay: 0.45, clearProps: 'transform' })
    gsap.fromTo(gsap.utils.toArray<HTMLElement>('.bx-tray .bx-glow', root.current), { autoAlpha: 0.95 }, { autoAlpha: 0, duration: 0.9, stagger: 0.12, delay: 0.5 })
  }, [mapAside])
  const backFromCard = () => {
    focusSel.current = card ? `[data-card="${card.id}"]` : null
    setCard(null)
  }
  useEffect(() => {
    if (!focusSel.current) return
    const n = root.current?.querySelector<HTMLElement>(focusSel.current)
    focusSel.current = null
    n?.focus()
  }, [stack, guide, tokensOpen, mapView, card])

  const openMap = () => {
    focusSel.current = null
    setMapView(true)
  }

  // Esc lùi một cấp: lá -> chồng -> map
  useEffect(() => {
    if (!card && !detail) return
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (card) backFromCard()
      else if (deckBack.current) deckBack.current() // hộp bài: thu lá, đóng nắp, bay về khay rồi mới lùi
      else backFromDetail()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  })

  // Các lá xòe ra từ vị trí chồng (Mật chiếu; hộp bài xanh/đỏ có hiệu ứng riêng trong DeckFocus)
  useLayoutEffect(() => {
    if (!stack || isDeck(stack) || reducedRef.current) return
    const from = root.current?.querySelector<HTMLElement>(`[data-stack="${stack.id}"]`)?.getBoundingClientRect()
    if (!from) return
    const cards = gsap.utils.toArray<HTMLElement>('.bx-card', root.current)
    const sx = from.left + from.width / 2, sy = from.top + from.height / 2
    gsap.from('.bx-detail', { autoAlpha: 0, duration: 0.3 })
    gsap.from(cards, {
      x: (_i, t: HTMLElement) => { const r = t.getBoundingClientRect(); return sx - (r.left + r.width / 2) },
      y: (_i, t: HTMLElement) => { const r = t.getBoundingClientRect(); return sy - (r.top + r.height / 2) },
      scale: 0.4, rotation: () => gsap.utils.random(-16, 16), autoAlpha: 0,
      duration: 0.7, ease: 'power3.out', stagger: 0.035, clearProps: 'transform,opacity,visibility',
    })
  }, [stack])
  useLayoutEffect(() => {
    if (!guide || reducedRef.current) return
    gsap.from('.bx-detail', { autoAlpha: 0, y: 24, duration: 0.45, ease: 'power3.out', clearProps: 'all' })
  }, [guide])

  // Lá phóng to bay ra từ ô nhỏ
  useLayoutEffect(() => {
    if (!card || reducedRef.current) return
    const thumb = root.current?.querySelector<HTMLElement>(`[data-card="${card.id}"] img`)?.getBoundingClientRect()
    const big = root.current?.querySelector<HTMLElement>('.bx-zoom-img')
    if (!thumb || !big) return
    const r = big.getBoundingClientRect()
    gsap.from('.bx-zoom', { autoAlpha: 0, duration: 0.25 })
    gsap.from(big, {
      x: thumb.left + thumb.width / 2 - (r.left + r.width / 2), y: thumb.top + thumb.height / 2 - (r.top + r.height / 2),
      scale: thumb.width / r.width, duration: 0.5, ease: 'power3.out', clearProps: 'transform',
    })
    gsap.from('.bx-zoom-info', { autoAlpha: 0, x: 24, duration: 0.45, delay: 0.15, ease: 'power3.out', clearProps: 'all' })
  }, [card])

  return (
    <section ref={root} id="hop-game" className="relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden px-5 pb-10 pt-24 text-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_60%,var(--color-silk)_0%,var(--color-night)_70%)]" />
      <div className="absolute left-1/2 top-[52%] -z-10 aspect-square w-[min(110vw,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(242_193_98/.16),transparent_62%)]" aria-hidden />

      <h2 className="h2 relative z-10 mb-3">{boxText.title}</h2>
      <p className="relative z-10 text-mist" aria-live="polite">{open ? (mapAside ? boxText.hintOpen : boxText.hintMap) : boxText.hintClosed}</p>

      <div className={`bx-stage relative grid w-full flex-1 place-items-center ${ever ? 'bx-stage-open' : 'min-h-[420px]'}`}>
        {/* Hộp 3D */}
        <div className="bx-scale">
          <div ref={ref('zoom')} className="bx-g">
          <div ref={ref('float')} className="bx-g">
            <div className="absolute left-0 top-0 h-0 w-0" aria-hidden>
              <div className="absolute -left-[270px] top-[120px] h-[90px] w-[540px] rounded-[50%] bg-black/55 blur-2xl" />
            </div>
            <div ref={ref('bob')} className="bx-g">
              <div ref={ref('hover')} className="bx-g">
                <div ref={ref('rx')} className="bx-g">
                  <div ref={ref('rz')} className="bx-g">
                    {/* Thân: đáy (lật quanh trục ngang để đúng chiều khi xem từ dưới), 4 mặt bên, lòng hộp */}
                    <div className="bx-g">
                      <Face w={W} h={D} t={`translateZ(${-T / 2}px) rotateX(180deg)`}
                        style={{ background: `linear-gradient(rgb(0 0 0 / .1), rgb(0 0 0 / .1)), url(${hd ? boxFaces.bottomHd : boxFaces.bottom}) center / 100% 100% no-repeat` }} />
                      {sideSegments(false)}
                      <Face w={W} h={D} t={`translateZ(${-T / 2 + 2}px)`} cls="bx-inner" />
                      {SIDES.map((d) => <Face key={d.k} w={d.w} h={T - LH} t={`translateZ(${-LH / 2}px) ${d.t} rotateY(180deg)`} cls="bx-inner" />)}
                    </div>
                    {/* Nắp */}
                    <div ref={ref('lid')} className="bx-g">
                      <Face w={W} h={D} t={`translateZ(${T / 2}px)`} style={{ background: `url(${hd ? boxFaces.topHd : boxFaces.top}) center / 100% 100% no-repeat` }} />
                      <Face w={W} h={D} t={`translateZ(${T / 2 - 2}px) rotateX(180deg)`} cls="bx-inner" />
                      {sideSegments(true)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {!open && (
          <div ref={ref('hit')} role="button" tabIndex={0} aria-label={boxText.hitLabel} data-bx="hit"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave}
            onKeyDown={onKey} className="bx-hit" />
        )}

        {/* Mặt bàn: lòng hộp (khay) + nắp và bản đồ đặt cạnh (chỉ dựng, tức là chỉ tải ảnh, sau lần mở đầu tiên) */}
        {ever && (
          <div className="bx-table absolute inset-0 grid place-items-center" inert={!open || detail}>
            <div ref={ref('map')} className="bx-desk invisible">
              <div className="bx-plane">
                <BoxTray inert={!mapAside} focused={stack && isDeck(stack) ? stack.id : undefined} onPick={pickStack} />
                {!mapAside && <MapSheet sheetRef={ref('sheet')} onClick={openMap} />}
              </div>
              <div className="bx-side">
                <div ref={ref('lid2')} data-flip-id="lid" role="img" aria-label={boxText.lidAlt} className="bx-lid2 invisible"
                  style={{ backgroundImage: `url(${boxFaces.top})` }} />
                {mapAside && <MapSheet sheetRef={ref('sheet')} onClick={openMap} aside />}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`relative z-10 mt-6 flex gap-4 transition-opacity duration-500 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button type="button" onClick={closeBox} className="bx-close" tabIndex={open ? 0 : -1}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M3 9l9-5 9 5M4 10v9h16v-9M9 14h6" /></svg>
          {boxText.close}
        </button>
      </div>

      {/* Xem các lá trong một chồng */}
      {stack && (isDeck(stack)
        ? <DeckFocus group={stack} inert={!!card} backRef={deckBack} onBack={backFromDetail} onPick={(c) => setCard(c)} />
        : <Fan group={stack} inert={!!card} onBack={backFromDetail} onPick={(c) => setCard(c)} />)}
      {guide && <GuideViewer onBack={backFromDetail} />}
      {tokensOpen && <TokenViewer kind={tokensOpen} onBack={backFromDetail} />}
      {mapView && <MapViewer onBack={backFromDetail} />}
      {card && stack && <Zoom card={card} group={stack} onBack={backFromCard} />}
    </section>
  )
}

/** Tấm bản đồ: lúc đầu phủ kín khay, sau khi xem chi tiết thì nằm cạnh hộp (aside). Cùng data-flip-id để Flip nối hai vị trí. */
function MapSheet({ sheetRef, onClick, aside = false }: { sheetRef: (n: HTMLElement | null) => void; onClick: () => void; aside?: boolean }) {
  return (
    <button ref={sheetRef} type="button" data-stack="map" data-flip-id="map" onClick={onClick} aria-label={boxText.mapOpen}
      className={`bx-mapsheet ${aside ? 'bx-mapsheet-aside' : ''}`}>
      <img src={mapImage} alt="" width={1600} height={1602} draggable={false} />
      <span className="bx-label">{boxText.mapLabel}</span>
    </button>
  )
}

/** Hai hộp bài phe xanh/đỏ (tuck box) — Mật chiếu là xấp bài rời, vẫn xòe thành lưới */
const isDeck = (g: CardGroup) => g.side !== 'secret'

/**
 * Hộp bài được đưa ra giữa: bay từ ô trong khay ra giữa màn hình (nền tối), tự mở nắp (lưỡi gài rút, nắp lật, tai bung,
 * ánh vàng, cọc thẻ trượt lên), rồi các lá bay ra khỏi miệng hộp xòe thành quạt phía trên hộp. Bấm lá: phóng to (Zoom).
 * Quay lại / Esc: chạy ngược toàn bộ (lá thu về, nắp đóng, hộp bay về đúng ô trong khay) rồi mới lùi.
 */
function DeckFocus({ group, inert, backRef, onBack, onPick }: {
  group: CardGroup; inert: boolean; backRef: { current: (() => void) | null }; onBack: () => void; onPick: (c: Card) => void
}) {
  const dlg = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const deck = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const closing = useRef(false)

  /** Vị trí quạt: tâm xoay = tâm hộp; lá cách tâm R, góc trải ±A, vừa khung (không tràn trên/hai bên) */
  const fanLayout = () => {
    const a = area.current!.getBoundingClientRect()
    const dk = deck.current!
    const c = area.current!.querySelector<HTMLElement>('.bx-fan-card')!
    const cw = c.offsetWidth, ch = c.offsetHeight
    // Dùng kích thước bố cục (offset*), không dùng rect vì hộp có thể đang bị biến đổi bởi hiệu ứng
    const py = dk.offsetTop + dk.offsetHeight / 2, px = dk.offsetLeft + dk.offsetWidth / 2
    const n = group.cards.length
    const R = Math.max(dk.offsetHeight / 2 + ch * 0.3, py - ch / 2 - 10)
    const side = Math.min(px, a.width - px) - cw / 2 - 8
    const angle = (r: number, k: number) =>
      Math.min((70 * Math.PI) / 180, ((k - 1) * 6 + 14) * (Math.PI / 180), Math.asin(Math.max(0, Math.min(1, side / r))))
    /** Một vòng quạt k lá, bán kính r */
    const arc = (k: number, r: number, z: number) => {
      const A = angle(r, k)
      return Array.from({ length: k }, (_, i) => {
        const t = k > 1 ? -A + (2 * A * i) / (k - 1) : 0
        return { x: r * Math.sin(t), y: -r * Math.cos(t), r: (t * 180) / Math.PI, z }
      })
    }
    // Khung hẹp (mobile): lá chồng quá sát thì chia 2 vòng, vòng trong nằm trước
    const gap = n > 1 ? (R * 2 * angle(R, n)) / (n - 1) : cw
    const r2 = R - ch * 0.55
    if (n > 8 && gap < cw * 0.4 && r2 > dk.offsetHeight / 2 + ch * 0.25) {
      const outer = Math.ceil(n / 2)
      return [...arc(outer, R, 1), ...arc(n - outer, r2, 2)]
    }
    return arc(n, R, 1)
  }

  useLayoutEffect(() => {
    const q = gsap.utils.selector(deck.current)
    const cards = gsap.utils.toArray<HTMLElement>('.bx-fan-card', area.current)
    const pos = fanLayout()
    const mouth = -deck.current!.offsetHeight * 0.3
    const from = document.querySelector<HTMLElement>(`.bx-tray [data-stack="${group.id}"] .bx-deck`)?.getBoundingClientRect()
    const d = deck.current!.getBoundingClientRect()
    const t = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } })
      .fromTo(dlg.current, { backgroundColor: 'rgb(5 9 24 / 0)' }, { backgroundColor: 'rgb(5 9 24 / .95)', duration: 0.5 }, 0)
      .from('.bx-df-head', { autoAlpha: 0, y: -12, duration: 0.4 }, 0.2)
    if (from && from.width > 0) {
      t.from(deck.current, {
        x: from.left + from.width / 2 - (d.left + d.width / 2), y: from.top + from.height / 2 - (d.top + d.height / 2),
        scale: from.width / d.width, duration: 0.75,
      }, 0)
    }
    t.to(deck.current, { y: -14, duration: 0.25, ease: 'power2.out' }, 0.75)
      .to(q('.bx-tuck'), { yPercent: -14, duration: 0.2, ease: 'power1.out' }, 0.85) // rút lưỡi gài khỏi mặt hộp
      .to(q('.bx-tuck'), { yPercent: 0, rotationX: -180, transformPerspective: 700, duration: 0.6, ease: 'power2.inOut' }, 1.05)
      .set(q('.bx-tuck'), { zIndex: 0 }, 1.35)
      .fromTo(q('.bx-ear'), { scaleY: 0, rotation: 0, autoAlpha: 0 },
        { scaleY: 1, rotation: (i: number) => (i ? 28 : -28), autoAlpha: 1, duration: 0.4, ease: 'back.out(2.5)' }, 1.5)
      .fromTo(q('.bx-deck-light'), { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1.15, duration: 0.5, ease: 'power2.out' }, 1.45)
      .to(q('.bx-deck-light'), { autoAlpha: 0.7, scale: 1, duration: 0.6 }, 2.1)
      .fromTo(q('.bx-deck-stack'), { yPercent: 0 }, { yPercent: -30, duration: 0.6, ease: 'power3.out' }, 1.6)
      .to(deck.current, { y: 0, duration: 0.3, ease: 'power2.inOut' }, 1.6)
      .fromTo(cards, { x: 0, y: mouth, rotation: 0, scale: 0.55, autoAlpha: 0 }, {
        x: (i: number) => pos[i].x, y: (i: number) => pos[i].y, rotation: (i: number) => pos[i].r, zIndex: (i: number) => pos[i].z,
        scale: 1, autoAlpha: 1, duration: 0.75, ease: 'back.out(1.1)', stagger: 0.05,
      }, 1.95)
    tl.current = t
    if (prefersReducedMotionNow()) t.progress(1)
    else t.play()
    // Đổi kích thước màn hình: xếp lại quạt theo khung mới
    const resize = () => {
      if (t.isActive() || closing.current) return
      const p = fanLayout()
      cards.forEach((c, i) => gsap.set(c, { x: p[i].x, y: p[i].y, rotation: p[i].r, zIndex: p[i].z }))
    }
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); t.kill() }
  }, [])

  const back = () => {
    const t = tl.current
    if (closing.current) return
    closing.current = true
    if (!t || prefersReducedMotionNow()) { onBack(); return }
    t.eventCallback('onReverseComplete', onBack).timeScale(1.7).reverse()
  }
  useEffect(() => {
    backRef.current = back
    return () => { backRef.current = null }
  })

  return (
    <div ref={dlg} role="dialog" aria-label={group.name} inert={inert} className="bx-detail absolute inset-0 z-30 flex flex-col px-4 pb-6 pt-24 text-left backdrop-blur-sm md:px-8">
      <div className="bx-df-head mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <BackButton onClick={back} />
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{group.name}</h3>
        <span className="text-sm text-mist">{boxText.pickCard}</span>
      </div>
      <div ref={area} className="bx-df-area relative min-h-0 flex-1">
        {/* Lá nằm sau hộp: bay lên từ miệng hộp rồi xòe quạt */}
        {group.cards.map((c) => (
          <button key={c.id} type="button" data-card={c.id} onClick={() => onPick(c)} aria-label={c.name} className="bx-card bx-fan-card invisible cursor-pointer">
            <img src={c.image} alt="" width={600} height={927} draggable={false} className="h-full w-full rounded-md object-cover" />
          </button>
        ))}
        <div ref={deck} className="bx-df-deck" aria-hidden><DeckBody tone={deckTone(group)} /></div>
      </div>
    </div>
  )
}

/** Số cột × hàng của lưới lá bài: mobile 3–4 cột; desktop 1 hàng nếu ít lá, còn lại 2 hàng */
function gridSize(n: number) {
  const cs = n > 8 ? 4 : 3
  const rd = n <= 4 ? 1 : 2
  return { cs, rs: Math.ceil(n / cs), cd: Math.ceil(n / rd), rd }
}

function Fan({ group, inert, onBack, onPick }: { group: CardGroup; inert: boolean; onBack: () => void; onPick: (c: Card) => void }) {
  const g = gridSize(group.cards.length)
  return (
    <div role="dialog" aria-label={group.name} inert={inert} className="bx-detail absolute inset-0 z-30 flex flex-col bg-night/90 px-4 pb-6 pt-24 text-left backdrop-blur-sm md:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <BackButton onClick={onBack} />
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{group.name}</h3>
        <span className="text-sm text-mist">{boxText.pickCard}</span>
      </div>
      {/* Lưới a×b co theo khung (container query) để thấy hết các lá cùng lúc, không phải cuộn */}
      <div className="bx-grid-box min-h-0 flex-1">
        <div className="bx-grid" style={{ '--cs': g.cs, '--rs': g.rs, '--cd': g.cd, '--rd': g.rd } as CSSProperties}>
          {group.cards.map((c) => (
            <button key={c.id} type="button" data-card={c.id} onClick={() => onPick(c)} aria-label={c.name} className="bx-card cursor-pointer">
              <img src={c.image} alt="" width={600} height={927} draggable={false} className="h-full w-full rounded-md object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Các loại token: ảnh + số lượng + ghi chú (nguyên văn nội dung team). Loại chưa có ảnh hiện vòng tròn kèm số. */
function TokenViewer({ kind, onBack }: { kind: TokenKind; onBack: () => void }) {
  const set = TOKEN_SETS[kind]
  return (
    <div role="dialog" aria-label={set.title} className="bx-detail absolute inset-0 z-30 flex flex-col bg-night/90 px-4 pb-6 pt-24 text-left backdrop-blur-sm md:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <BackButton onClick={onBack} />
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{set.title}</h3>
        <span className="text-sm text-mist">{boxText.tokensHint}</span>
      </div>
      <div className={`mx-auto grid min-h-0 w-full flex-1 content-start gap-4 overflow-y-auto pb-2 md:content-center md:gap-6 ${set.items.length > 1 ? 'max-w-4xl md:grid-cols-2' : 'max-w-md'}`}>
        {set.items.map((t) => (
          <div key={t.id} className="bx-tk frame flex items-start gap-4 bg-night/70 p-4 md:flex-col md:items-center md:p-6 md:text-center">
            <div className="flex shrink-0 justify-center">
              {t.images.map((src, i) => (
                <img key={i} src={src} alt="" draggable={false}
                  className="bx-tk-img h-16 w-auto drop-shadow-[0_10px_14px_rgb(0_0_0/.5)] md:h-28" style={{ marginLeft: i ? '-0.75rem' : 0 }} />
              ))}
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-white md:text-xl">{t.name}</h4>
              <p className="mb-2 text-sm font-bold text-gold">{t.qty}</p>
              <p className="text-sm leading-relaxed text-mist">{t.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Zoom({ card, group, onBack }: { card: Card; group: CardGroup; onBack: () => void }) {
  return (
    <div role="dialog" aria-label={card.name} className="bx-zoom absolute inset-0 z-40 flex flex-col items-center gap-5 overflow-y-auto bg-night/95 px-5 pb-8 pt-36 text-left md:flex-row md:justify-center md:gap-14 md:overflow-hidden md:pt-24">
      <div className="absolute left-4 top-20 z-10 md:left-8 md:top-24"><BackButton onClick={onBack} /></div>
      <img src={card.image} alt={`${card.name}, ${group.name}`} width={600} height={927} draggable={false}
        className="bx-zoom-img h-auto max-h-[40svh] w-auto shrink-0 rounded-lg shadow-[0_30px_60px_rgb(0_0_0/.7)] md:max-h-[74svh]" />
      <div className="bx-zoom-info frame w-full max-w-md bg-night/90 p-6">
        <h3 className="mb-3 font-display text-2xl font-bold text-gold">{card.name}</h3>
        <CardText text={card.text} />
      </div>
    </div>
  )
}

/**
 * Khung xem phóng to dùng chung (tờ hướng dẫn, bản đồ).
 * Phóng to: cuộn chuột (quanh vị trí con trỏ), bấm đúp, chụm hai ngón; kéo để di chuyển khi đã phóng to.
 */
function ZoomPane({ max, label, sheetClass, children }: { max: number; label: string; sheetClass: string; children: ReactNode }) {
  const view = useRef<HTMLDivElement>(null) // khung nhìn, không biến đổi
  const sheet = useRef<HTMLDivElement>(null) // tờ giấy, GSAP scale + x/y (gốc 0 0)
  const z = useRef({ s: 1, x: 0, y: 0 })
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef({ d: 0, s: 1 })

  // Giữ tờ giấy luôn phủ khung khi to hơn khung, và nằm giữa khi nhỏ hơn
  const fit = (anim: boolean) => {
    const v = view.current!, p = sheet.current!, k = z.current
    const ox = p.offsetLeft, oy = p.offsetTop, w = p.offsetWidth * k.s, h = p.offsetHeight * k.s
    const lim = (pos: number, o: number, size: number, box: number) =>
      size <= box ? (box - size) / 2 - o : clamp(pos, box - size - o, -o)
    k.x = lim(k.x, ox, w, v.clientWidth)
    k.y = lim(k.y, oy, h, v.clientHeight)
    gsap.to(p, { scale: k.s, x: k.x, y: k.y, duration: anim ? 0.25 : 0, ease: 'power2.out', overwrite: 'auto' })
  }
  /** Phóng tới mức ns, giữ nguyên điểm (cx, cy) trong khung nhìn */
  const zoomAt = (cx: number, cy: number, ns: number, anim = true) => {
    const p = sheet.current!, k = z.current
    ns = clamp(ns, 1, max)
    const ux = (cx - p.offsetLeft - k.x) / k.s, uy = (cy - p.offsetTop - k.y) / k.s
    k.x = cx - p.offsetLeft - ux * ns
    k.y = cy - p.offsetTop - uy * ns
    k.s = ns
    fit(anim)
  }
  const local = (e: { clientX: number; clientY: number }) => {
    const r = view.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }

  useLayoutEffect(() => { fit(false) }, [])
  useEffect(() => {
    const v = view.current!
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const [cx, cy] = local(e)
      zoomAt(cx, cy, z.current.s * Math.exp(-e.deltaY * 0.0018))
    }
    const resize = () => fit(false)
    v.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('resize', resize)
    return () => { v.removeEventListener('wheel', wheel); window.removeEventListener('resize', resize) }
  }, [])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: z.current.s }
    }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      const [cx, cy] = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
      zoomAt(cx, cy, pinch.current.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d), false)
      return
    }
    if (z.current.s <= 1) return
    z.current.x += e.clientX - prev.x
    z.current.y += e.clientY - prev.y
    fit(false)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => { ptrs.current.delete(e.pointerId) }
  const onDouble = (e: { clientX: number; clientY: number }) => {
    const [cx, cy] = local(e)
    zoomAt(cx, cy, z.current.s > 1.2 ? 1 : 2.5)
  }

  return (
    <div ref={view} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble}
      className="relative min-h-0 flex-1 cursor-zoom-in touch-none select-none overflow-hidden [perspective:1600px]">
      <div ref={sheet} role="img" aria-label={label} className={`absolute left-0 top-0 ${sheetClass}`} style={{ transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  )
}

/** Khung trang chi tiết có thể phóng to: nút Quay lại + tiêu đề + gợi ý thao tác */
function ZoomDialog({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  return (
    <div role="dialog" aria-label={title} className="bx-detail absolute inset-0 z-30 flex flex-col bg-night/90 px-4 pb-6 pt-24 text-left backdrop-blur-sm md:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <BackButton onClick={onBack} />
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{title}</h3>
        <span className="text-sm text-mist">{touch ? boxText.guideHintTouch : boxText.guideHint}</span>
      </div>
      {children}
    </div>
  )
}

/** Tờ hướng dẫn: mở từ dạng gấp (chỉ thấy bìa) thành tờ trải phẳng 5 trang. */
const PANELS = 5
const SHEET_MAX = 4

function GuideViewer({ onBack }: { onBack: () => void }) {
  // Mở tờ gấp: các trang chồng lên bìa rồi lần lượt trải ra
  useLayoutEffect(() => {
    if (prefersReducedMotionNow()) { gsap.set('.bx-cover', { autoAlpha: 0 }); return }
    // Tờ gấp một chiều (accordion): bìa lật đi, rồi từng trang từ phải sang trái lần lượt mở ra quanh nếp gấp
    // bên phải của nó (180° -> 0°), trang đang mở tối dần thành sáng như được hắt sáng khi trải phẳng.
    const panels = gsap.utils.toArray<HTMLElement>('.bx-panel')
    const STEP = 0.6
    const t = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
      .from('.bx-detail', { autoAlpha: 0, duration: 0.3 })
      .from('.bx-cover', { scale: 0.7, autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 0.05)
      .to('.bx-cover', { rotationY: -110, transformPerspective: 1600, autoAlpha: 0, duration: 0.7 }, 0.6)
      .from(panels[PANELS - 1], { filter: 'brightness(.55)', duration: 0.5, clearProps: 'filter' }, 0.8)
    for (let i = PANELS - 2; i >= 0; i--) {
      t.fromTo(panels[i], { rotationY: 180, transformPerspective: 1600, filter: 'brightness(.4)' },
        { rotationY: 0, filter: 'brightness(1)', duration: 0.85, clearProps: 'transform,filter' }, 1.05 + (PANELS - 2 - i) * STEP)
    }
  }, [])

  return (
    <ZoomDialog title={boxText.guideName} onBack={onBack}>
      <ZoomPane max={SHEET_MAX} label={boxText.guideFrontAlt}
        sheetClass="flex aspect-[2000/599] w-[min(100%,1500px,calc((100svh-12rem)*3.34))] rounded-md shadow-[0_20px_40px_rgb(0_0_0/.6)]">
        {Array.from({ length: PANELS }, (_, i) => (
          <div key={i} className="bx-panel h-full flex-1" style={{
            backgroundImage: `url(${guidePages.frontHd})`, backgroundSize: `${PANELS * 100}% 100%`,
            backgroundPosition: `${(i / (PANELS - 1)) * 100}% 0`, transformOrigin: 'right center', backfaceVisibility: 'hidden',
          }} />
        ))}
        {/* Bìa lúc còn gấp, nằm đè lên trang cuối rồi lật đi */}
        <div className="bx-cover absolute right-0 top-0 h-full rounded-md" style={{ width: `${100 / PANELS}%`, transformOrigin: 'left center', ...coverStyle(guidePages.back) }} />
      </ZoomPane>
    </ZoomDialog>
  )
}

/** Bản đồ chi tiết: ảnh 3200px (chỉ tải khi mở), phóng to tối đa 4× như tờ hướng dẫn */
function MapViewer({ onBack }: { onBack: () => void }) {
  useLayoutEffect(() => {
    if (prefersReducedMotionNow()) return
    gsap.timeline()
      .from('.bx-detail', { autoAlpha: 0, duration: 0.3 })
      .from('.bx-map-big', { scale: 0.82, rotation: -2, autoAlpha: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }, 0.05)
  }, [])
  return (
    <ZoomDialog title={boxText.mapName} onBack={onBack}>
      <ZoomPane max={SHEET_MAX} label={boxText.mapAlt} sheetClass="aspect-[1600/1602] w-[min(100%,calc(100svh-12rem))]">
        {/* Ảnh nhỏ (đã tải) làm nền trong lúc chờ ảnh nét */}
        <img src={mapImageHd} alt="" width={3200} height={3203} draggable={false}
          className="bx-map-big h-full w-full rounded-md bg-cover shadow-[0_20px_40px_rgb(0_0_0/.6)]" style={{ backgroundImage: `url(${mapImage})` }} />
      </ZoomPane>
    </ZoomDialog>
  )
}


const prefersReducedMotionNow = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
