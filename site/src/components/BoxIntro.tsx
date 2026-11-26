import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { boxFaces, guidePages, mapImage, mapImageHd, type Card, type CardGroup } from '../data/cards'
import { boxText } from '../data/boxText'
import { deckContents, deckText } from '../data/deckContents'
import { parts, type Part } from '../data/gameInfo'
import { useReducedMotion } from '../hooks/useReducedMotion'
import BoxTray, { coverStyle, DeckBody, deckTone, type TrayPick } from './BoxTray'

gsap.registerPlugin(Flip, ScrollToPlugin)

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
  const root = useRef<HTMLDivElement>(null)
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
  const [closing, setClosing] = useState(false) // đang chạy trình tự đóng hộp
  const closingRef = useRef(false)
  const flipBack = useRef(false) // lần Flip sắp tới là đặt bản đồ trở lại khay
  const finishClose = useRef<() => void>(() => {})
  finishClose.current = () => { closingRef.current = false; setClosing(false); setOpen(false) }
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
  // chỉ phóng khi vùng hộp đang nằm gọn trong màn hình (không chặn người đang cuộn ngang qua trang Thành phần).
  const zoom = useRef(1)
  useEffect(() => {
    const hit = el.current.hit
    if (open || !hit) return
    const wheel = (e: WheelEvent) => {
      const zin = e.deltaY < 0
      if (!zin && zoom.current <= 1) return
      const r = hit.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight) return
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
      else {
        // Bản đồ đã nằm lại trên khay: không cho nó nhấc lên riêng, nó mờ đi cùng khay rồi nắp mới đóng xuống
        t.getChildren(false, true, false).filter((x) => x.vars.id === 'sheet').forEach((x) => x.kill())
        t.progress(1)
        t.timeScale(1.1).eventCallback('onReverseComplete', () => bob.current?.play()).reverse()
      }
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
      .fromTo(el.current.sheet!, { autoAlpha: 0, y: -50, scale: 1.12, rotation: -3 }, { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.7, ease: 'power3.out', id: 'sheet' }, 1.55)
    tl.current = t
    if (reduced) t.progress(1)
    else t.play()
  }, [open, reduced])

  const openBox = () => {
    if (openRef.current) return
    setEver(true)
    setOpen(true)
    // Các lớp xem chi tiết phủ kín section: đưa section Thành phần về khít màn hình nếu đang lệch
    const sec = root.current!.closest('section')
    const top = sec ? sec.getBoundingClientRect().top : 0
    if (sec && Math.abs(top) > 40) {
      if (reducedRef.current) window.scrollTo(0, top + scrollY)
      else gsap.to(window, { scrollTo: top + scrollY, duration: 0.6, ease: 'power2.inOut', overwrite: true })
    }
  }
  /**
   * Đóng hộp theo trình tự: (1) đặt lại tấm bản đồ lên khay (bay từ cạnh hộp về, Flip ngược), (2) khay và bản đồ mờ đi,
   * nắp bay về, nắp 3D hạ xuống đóng hộp, hộp xoay về dáng đóng (đảo ngược timeline mở).
   */
  const closeBox = () => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    setCard(null)
    setStack(null)
    setGuide(false)
    setTokensOpen(null)
    setMapView(false)
    if (mapAside && !reducedRef.current) {
      flipState.current = Flip.getState('[data-flip-id]', { props: 'opacity' })
      flipBack.current = true
      setMapAside(false) // bản đồ dựng lại trên khay; Flip (effect bên dưới) kéo nó từ chỗ cũ về, xong mới đóng nắp
    } else {
      setMapAside(false)
      finishClose.current()
    }
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
    if (!mapAside && state && flipBack.current) {
      flipBack.current = false
      Flip.from(state, { targets: '[data-flip-id]', duration: 0.9, ease: 'power3.inOut', scale: true, absolute: true, onComplete: () => finishClose.current() })
      return
    }
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
    // Nhúng trong section Thành phần: không tự định vị (không "relative") để các lớp chi tiết (absolute inset-0) phủ kín cả section.
    // Section đó không được có transform (vd. .scene-in/.scene-out), nếu không các lớp chi tiết bị giữ trong khung nhỏ.
    <div ref={root} id="hop-game" className="flex w-full flex-1 flex-col items-center">
      <p className="sr-only" aria-live="polite">{open ? (mapAside ? boxText.hintOpen : boxText.hintMap) : boxText.hintClosed}</p>

      <div className={`bx-stage relative grid w-full flex-1 place-items-center ${ever ? 'bx-stage-open' : 'bx-stage-closed'} ${open ? 'bx-is-open' : ''}`}>
        {/* Ánh sáng quanh hộp (không thuộc mô hình hộp): quầng vàng phía sau + bóng đổ trên mặt bàn */}
        <div className="bx-halo" aria-hidden />
        <div className="bx-ground" aria-hidden />
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
                <BoxTray inert={!mapAside} focused={stack ? stack.id : undefined} onPick={pickStack} />
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

      <div className={`relative z-10 flex gap-4 transition-opacity duration-500 ${open ? 'mt-4 opacity-100' : 'pointer-events-none h-0 opacity-0'}`}>
        <button type="button" onClick={closeBox} className="bx-close" tabIndex={open ? 0 : -1} disabled={closing}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M3 9l9-5 9 5M4 10v9h16v-9M9 14h6" /></svg>
          {boxText.close}
        </button>
      </div>

      {/* Xem các lá trong một chồng */}
      {stack && <DeckFocus group={stack} inert={!!card} backRef={deckBack} onBack={backFromDetail} onPick={(c) => setCard(c)} />}
      {guide && <GuideViewer onBack={backFromDetail} />}
      {tokensOpen && <TokenViewer kind={tokensOpen} onBack={backFromDetail} />}
      {mapView && <MapViewer onBack={backFromDetail} />}
      {card && stack && <Zoom card={card} group={stack} onBack={backFromCard} />}
    </div>
  )
}

/** Tấm bản đồ: lúc đầu phủ kín khay, sau khi xem chi tiết thì nằm cạnh hộp (aside). Cùng data-flip-id để Flip nối hai vị trí. */
function MapSheet({ sheetRef, onClick, aside = false }: { sheetRef: (n: HTMLElement | null) => void; onClick: () => void; aside?: boolean }) {
  return (
    <button ref={sheetRef} type="button" data-stack="map" data-flip-id="map" onClick={onClick} aria-label={boxText.mapOpen}
      className={`bx-mapsheet ${aside ? 'bx-mapsheet-aside' : ''}`}>
      <img src={mapImage} alt="" width={1600} height={1602} draggable={false} />
    </button>
  )
}

/** Hai hộp bài phe xanh/đỏ (tuck box) — Mật chiếu là xấp bài rời, vẫn xòe thành lưới */

/**
 * Hộp bài được đưa ra giữa: bay từ ô trong khay ra giữa màn hình (nền tối), các lá bay ra từ tâm hộp xòe thành quạt rồi hộp mờ đi. Bấm lá: phóng to (Zoom).
 * Quay lại / Esc: chạy ngược toàn bộ (lá thu về, nắp đóng, hộp bay về đúng ô trong khay) rồi mới lùi.
 */
function DeckFocus({ group, inert, backRef, onBack, onPick }: {
  group: CardGroup; inert: boolean; backRef: { current: (() => void) | null }; onBack: () => void; onPick: (c: Card) => void
}) {
  const dlg = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const deck = useRef<HTMLDivElement>(null)
  const info = useRef<HTMLElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const closing = useRef(false)
  const content = deckContents[group.id]

  /** Vị trí quạt: tâm xoay = tâm hộp; lá cách tâm R, góc trải ±A, vừa khung (không tràn trên/hai bên).
   *  Khung = vùng bên trái (desktop) hoặc phần trên (mobile) của lớp xem chi tiết, không phải cả màn hình. */
  const fanLayout = () => {
    const a = area.current!.getBoundingClientRect()
    const dk = deck.current!
    const c = area.current!.querySelector<HTMLElement>('.bx-fan-card')!
    const cw = c.offsetWidth, ch = c.offsetHeight
    // Dùng kích thước bố cục (offset*), không dùng rect vì hộp có thể đang bị biến đổi bởi hiệu ứng
    const py = dk.offsetTop + dk.offsetHeight / 2, px = dk.offsetLeft + dk.offsetWidth / 2
    const n = group.cards.length
    const R = Math.max(dk.offsetHeight / 2 + ch * 0.3, py - ch / 2 - 10)
    const half = Math.min(px, a.width - px) - 8
    /** Góc trải lớn nhất để lá ngoài cùng (đã xoay) vẫn nằm gọn trong vùng quạt: tính cả nửa bề rộng lá xoay nghiêng */
    const angle = (r: number, k: number) => {
      let A = Math.min((70 * Math.PI) / 180, ((k - 1) * 6 + 14) * (Math.PI / 180))
      while (A > 0 && (r + ch / 2) * Math.sin(A) + (cw / 2) * Math.cos(A) > half) A -= Math.PI / 360
      return Math.max(0, A)
    }
    /** Một vòng quạt k lá, bán kính r */
    const arc = (k: number, r: number, z: number) => {
      const A = angle(r, k)
      return Array.from({ length: k }, (_, i) => {
        const t = k > 1 ? -A + (2 * A * i) / (k - 1) : 0
        return { x: r * Math.sin(t), y: -r * Math.cos(t), r: (t * 180) / Math.PI, z }
      })
    }
    // Hai hàng theo nhóm (group.topCount): hàng trên = vòng ngoài, hàng dưới = vòng trong nằm trước. Hết chỗ thì dồn một vòng.
    const r2 = R - ch * 0.55
    if (group.topCount > 0 && group.topCount < n && r2 > dk.offsetHeight / 2 + ch * 0.25) {
      return [...arc(group.topCount, R, 1), ...arc(n - group.topCount, r2, 2)]
    }
    return arc(n, R, 1)
  }

  useLayoutEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>('.bx-fan-card', area.current)
    const pos = fanLayout()
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
    // Không mở nắp: các lá bay ra từ tâm hộp xòe thành quạt, rồi hộp mờ đi để không che lá
    t.fromTo(cards, { x: 0, y: 0, rotation: 0, scale: 0.55, autoAlpha: 0 }, {
        x: (i: number) => pos[i].x, y: (i: number) => pos[i].y, rotation: (i: number) => pos[i].r, zIndex: (i: number) => pos[i].z,
        scale: 1, autoAlpha: 1, duration: 0.75, ease: 'back.out(1.1)', stagger: 0.05,
      }, 0.8)
      .to(deck.current, { autoAlpha: 0, scale: 0.9, duration: 0.45, ease: 'power2.in' }, 0.95)
    // Quạt xòe xong mới trượt khối mô tả vào: desktop từ phải sang, mobile từ dưới lên (khối nằm dưới quạt)
    const wide = window.matchMedia('(min-width: 768px)').matches
    t.fromTo(info.current, { autoAlpha: 0, x: wide ? 48 : 0, y: wide ? 0 : 24 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'power2.out' })
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
    // Desktop: trái ~58% là hộp bài + quạt, phải ~42% là khối mô tả. Mobile: quạt ở trên, mô tả ở dưới, cuộn dọc trong lớp này.
    <div ref={dlg} role="dialog" aria-label={group.name} inert={inert}
      className="bx-detail absolute inset-0 z-30 flex flex-col overflow-y-auto overflow-x-hidden px-4 pb-6 pt-24 text-left backdrop-blur-sm md:overflow-hidden md:px-8">
      <div className="bx-df-head mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <BackButton onClick={back} />
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{group.name}</h3>
        <span className="text-sm text-mist md:hidden">{boxText.pickCard}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:items-center md:gap-8">
        <div ref={area} className="bx-df-area relative h-[min(46svh,400px)] w-full shrink-0 md:h-full md:w-[58%]">
          {/* Lá nằm sau hộp: bay lên từ miệng hộp rồi xòe quạt */}
          {group.cards.map((c) => (
            <button key={c.id} type="button" data-card={c.id} onClick={() => onPick(c)} aria-label={c.name} className="bx-card bx-fan-card invisible cursor-pointer">
              <img src={c.image} alt="" width={600} height={927} draggable={false} className="h-full w-full rounded-md object-cover" />
            </button>
          ))}
          <div ref={deck} className="bx-df-deck" aria-hidden><DeckBody tone={deckTone(group)} /></div>
        </div>
        <aside ref={info} aria-label={content.title}
          className={`bx-df-info panel ${group.side === 'red' ? 'panel-red' : 'panel-blue'} invisible w-full shrink-0 p-5 md:max-h-full md:w-[42%] md:max-w-xl md:shrink md:overflow-y-auto md:p-7`}>
          <h4 className="font-display text-xl font-bold text-white md:text-2xl">{content.title}</h4>
          <ul className="mt-3 divide-y divide-white/10">
            {content.lines.map((l) => (
              <li key={l.name} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-white">{l.name}</span>
                  <span className="shrink-0 text-right font-bold text-gold">
                    {l.qty}{l.qty !== `${l.count} lá` && <span className="ml-1 text-sm font-normal text-mist">({l.count} lá)</span>}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-mist">{l.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-1 flex items-baseline justify-between gap-4 border-t border-gold/40 pt-3 font-display text-lg font-bold text-white">
            <span>{deckText.total}</span><span className="text-gold">{content.total} {boxText.cardsUnit}</span>
          </p>
          <p className="mt-4 text-xs text-mist/70">{deckText.hint}</p>
        </aside>
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
          <div key={t.id} className="bx-tk panel flex items-start gap-4 p-4 md:flex-col md:items-center md:p-6 md:text-center">
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
      <div className={`bx-zoom-info panel ${group.side === 'red' ? 'panel-red' : 'panel-blue'} w-full max-w-md p-6`}>
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
/** onTap(nx): bấm nhẹ (không kéo, không phóng to, không phải bấm đúp) trên tờ; nx = vị trí ngang 0..1 trên tờ */
function ZoomPane({ max, label, sheetClass, onTap, children }: { max: number; label: string; sheetClass: string; onTap?: (nx: number) => void; children: ReactNode }) {
  const tap = useRef<{ x: number; y: number; ok: boolean; t: number }>({ x: 0, y: 0, ok: false, t: 0 })
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
    tap.current.ok = ptrs.current.size === 1
    tap.current.x = e.clientX; tap.current.y = e.clientY
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: z.current.s }
    }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > 6) tap.current.ok = false
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
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    ptrs.current.delete(e.pointerId)
    const t = tap.current
    if (e.type === 'pointerup' && t.ok && onTap && z.current.s <= 1.05) {
      const r = sheet.current!.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width
      // Chờ một nhịp: nếu là bấm đúp (phóng to) thì không lật trang
      clearTimeout(t.t)
      if (nx >= 0 && nx <= 1) t.t = window.setTimeout(() => onTap(nx), 230)
    }
    t.ok = false
  }
  const onDouble = (e: { clientX: number; clientY: number }) => {
    clearTimeout(tap.current.t)
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

/** Tờ hướng dẫn dạng quyển sách: bìa trước, 4 trang nội dung, bìa sau; bấm để lật từng tờ (3 tờ, mỗi tờ hai mặt). */
const SHEET_MAX = 4
const SRC_PANELS = 5 // ảnh front-hd gồm 5 ô: 4 trang nội dung + bìa sau
const pagePanel = (i: number): CSSProperties => ({ backgroundImage: `url(${guidePages.frontHd})`, backgroundSize: `${SRC_PANELS * 100}% 100%`, backgroundPosition: `${(i / (SRC_PANELS - 1)) * 100}% 0` })
/** Mỗi tờ: mặt trước (nằm bên phải khi gập lại) và mặt sau (hiện bên trái sau khi lật) */
const LEAVES: { front: CSSProperties; back: CSSProperties; frontAlt: string; backAlt: string }[] = [
  { front: coverStyle(guidePages.back), back: pagePanel(0), frontAlt: 'Bìa trước: Cổ Loa, Kẻ Giữ Cửa', backAlt: 'Trang 1: Tổng quan' },
  { front: pagePanel(1), back: pagePanel(2), frontAlt: 'Trang 2: Chuẩn bị và giai đoạn ẩn vai', backAlt: 'Trang 3: Chi tiết cách chơi' },
  { front: pagePanel(3), back: pagePanel(4), frontAlt: 'Trang 4: Cơ chế đặc biệt và chiến thắng', backAlt: 'Bìa sau' },
]
const STATE_LABEL = ['Bìa trước', 'Trang 1–2', 'Trang 3–4', 'Bìa sau']

function GuideViewer({ onBack }: { onBack: () => void }) {
  const [n, setN] = useState(0) // số tờ đã lật sang trái
  const cur = useRef(0)
  const quick = prefersReducedMotionNow()

  useLayoutEffect(() => {
    LEAVES.forEach((_, k) => gsap.set(`.bx-leaf-${k}`, { rotationY: 0, zIndex: 10 - k }))
    gsap.set('.bx-book-shift', { xPercent: -25 }) // sách đang đóng: bìa nằm giữa khung
    if (quick) return
    gsap.timeline()
      .from('.bx-detail', { autoAlpha: 0, duration: 0.3 })
      .from('.bx-leaf-0', { scale: 0.8, autoAlpha: 0, duration: 0.5, ease: 'power2.out', clearProps: 'scale,opacity,visibility' }, 0.05)
  }, [quick])

  const go = (to: number) => {
    if (to < 0 || to > LEAVES.length || to === cur.current) return
    const dir = to > cur.current ? 1 : -1
    const k = dir > 0 ? cur.current : cur.current - 1 // tờ sẽ lật
    cur.current = to
    setN(to)
    const leaf = `.bx-leaf-${k}`, dur = quick ? 0 : 0.9
    gsap.set(leaf, { zIndex: 50 }) // đang lật thì nằm trên cùng
    gsap.to(leaf, { rotationY: dir > 0 ? -180 : 0, duration: dur, ease: 'power2.inOut', overwrite: 'auto',
      onComplete: () => { gsap.set(leaf, { zIndex: dir > 0 ? 10 + k : 10 - k }) } })
    gsap.fromTo(`${leaf} .bx-shade`, { opacity: 0 }, { opacity: 0.5, duration: dur / 2, yoyo: true, repeat: 1, ease: 'sine.inOut', overwrite: 'auto' })
    gsap.to('.bx-book-shift', { xPercent: to === 0 ? -25 : to === LEAVES.length ? 25 : 0, duration: dur, ease: 'power2.inOut', overwrite: 'auto' })
  }

  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(cur.current + 1)
      else if (e.key === 'ArrowLeft') go(cur.current - 1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const btn = 'rounded-sm border border-gold px-5 py-2 text-sm font-bold text-gold transition duration-200 hover:-translate-y-0.5 hover:bg-gold hover:text-night active:translate-y-0 disabled:pointer-events-none disabled:opacity-40'
  return (
    <ZoomDialog title={boxText.guideName} onBack={onBack}>
      {/* Bấm nửa phải = lật tới, nửa trái = lật lui (chỉ khi chưa phóng to) */}
      <ZoomPane max={SHEET_MAX} label={boxText.guideFrontAlt} onTap={(nx) => go(cur.current + (nx >= 0.5 ? 1 : -1))}
        sheetClass="aspect-[800/599] w-[min(100%,1200px,calc((100svh-15rem)*1.336))]">
        <div className="bx-book-shift absolute inset-0" style={{ perspective: '2400px' }}>
          {LEAVES.map((l, k) => (
            <div key={k} className={`bx-leaf-${k} absolute right-0 top-0 h-full w-1/2`} style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}>
              <div role="img" aria-label={l.frontAlt} className="absolute inset-0 rounded-r-md shadow-[0_14px_30px_rgb(0_0_0/.55)]" style={{ ...l.front, backfaceVisibility: 'hidden' }}>
                <div className="bx-shade pointer-events-none absolute inset-0 rounded-r-md bg-black opacity-0" />
              </div>
              <div role="img" aria-label={l.backAlt} className="absolute inset-0 rounded-l-md" style={{ ...l.back, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="bx-shade pointer-events-none absolute inset-0 rounded-l-md bg-black opacity-0" />
              </div>
            </div>
          ))}
        </div>
      </ZoomPane>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" className={btn} disabled={n === 0} onClick={() => go(cur.current - 1)}>Trang trước</button>
        <span className="min-w-24 text-center text-sm text-mist" aria-live="polite">{STATE_LABEL[n]}</span>
        <button type="button" className={btn} disabled={n === LEAVES.length} onClick={() => go(cur.current + 1)}>Trang sau</button>
      </div>
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
