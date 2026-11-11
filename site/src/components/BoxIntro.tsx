import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import gsap from 'gsap'
import { boxFaces, cardGroups, guidePages, mapImage, type Card, type CardGroup } from '../data/cards'
import { boxText } from '../data/boxText'
import { parts, type Part } from '../data/gameInfo'
import { useReducedMotion } from '../hooks/useReducedMotion'

/*
 * Hộp game 3D bằng CSS (preserve-3d) + GSAP, không dùng Three.js.
 * Cấu trúc: .bx-scale (phối cảnh) > .bx-float > .bx-bob > .bx-hover > .bx-rx (xoay ngang trục X màn hình, "nghiêng/lật")
 *   > .bx-rz (xoay quanh trục đứng của hộp) > thân + nắp. Gốc tọa độ = tâm hộp; hộp rộng W, sâu D, cao T.
 * Kéo chuột/vuốt xoay tự do 360° (pitch trên .bx-rx, yaw trên .bx-rz), quán tính tự viết bằng gsap.ticker.
 * Mở hộp: nắp bay đi, hộp xoay nhìn từ trên xuống, map (lớp 2D nghiêng nhẹ) trồi ra, các chồng bài hiện tại chỗ.
 */
const W = 460, D = 307, T = 88, LH = 28 // rộng, sâu, cao toàn hộp, cao nắp (px, trước khi co theo màn hình)
const PITCH0 = 54, YAW0 = -24, PITCH_OPEN = 12
const K = 0.22 // độ xoay mỗi px kéo (thấp = kéo chậm, dễ dừng đúng mặt muốn xem)
const CLICK_PX = 6 // di chuyển dưới ngưỡng này = bấm, không phải kéo
const ZOOM_MAX = 2.6 // phóng to hộp bằng cuộn chuột (xem rõ nắp và đáy)

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Bìa tờ hướng dẫn khi gấp: chỉ là khung bìa ở mép phải ảnh mặt sau (ảnh 2000×600, bìa ~383px) */
const coverStyle = (src: string): CSSProperties => ({ backgroundImage: `url(${src})`, backgroundSize: '522% 100%', backgroundPosition: '99.7% 0' })

/** Góc tương đương gần `cur` nhất (để xoay ngắn nhất về `tgt`) */
const near = (cur: number, tgt: number) => tgt + 360 * Math.round((cur - tgt) / 360)

/** Vị trí các chồng trên map (% theo cạnh map) */
const SPOTS: Record<string, [number, number]> = {
  'trieu-da': [24, 31], 'an-duong-vuong': [76, 31], 'mat-chieu': [24, 73], guide: [76, 73], tokens: [50, 84],
}

/** Nhóm token trong hộp: lấy đúng mục, số lượng, ghi chú từ nội dung team (gameInfo.parts) */
const TOKENS: Part[] = ['token-linh', 'token-thang', 'token-no'].map((id) => parts.find((p) => p.id === id)!)

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
      style={{ background: `url(${d.src}) 0 ${-off}px / 100% ${T}px no-repeat`, filter: `brightness(${d.shade})` }} />
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
  const [tokensOpen, setTokensOpen] = useState(false)
  const [card, setCard] = useState<Card | null>(null)
  const [hd, setHd] = useState(false) // đã phóng to hộp: đổi nắp/đáy sang ảnh 3000px
  const detail = !!(stack || guide || tokensOpen)
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
    const stacks = gsap.utils.toArray<HTMLElement>('.bx-stack', root.current)
    const glows = gsap.utils.toArray<HTMLElement>('.bx-glow', root.current)
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
      .fromTo(stacks, { autoAlpha: 0, y: -30, scale: 1.25 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.5)', stagger: 0.2 }, 1.7)
      .fromTo(glows, { autoAlpha: 0.95 }, { autoAlpha: 0, duration: 0.9, stagger: 0.2 }, 1.75)
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
    setTokensOpen(false)
    setOpen(false)
  }

  // Kéo để xoay; bấm (di chuyển < 6px) để mở
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const s = st.current
    e.currentTarget.setPointerCapture(e.pointerId)
    s.drag = true
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
  const pickStack = (g: CardGroup | 'guide' | 'tokens') => {
    focusSel.current = null
    if (g === 'guide') setGuide(true)
    else if (g === 'tokens') setTokensOpen(true)
    else setStack(g)
  }
  const backFromDetail = () => {
    focusSel.current = `[data-stack="${stack ? stack.id : tokensOpen ? 'tokens' : 'guide'}"]`
    setStack(null)
    setGuide(false)
    setTokensOpen(false)
  }
  const backFromCard = () => {
    focusSel.current = card ? `[data-card="${card.id}"]` : null
    setCard(null)
  }
  useEffect(() => {
    if (!focusSel.current) return
    const n = root.current?.querySelector<HTMLElement>(focusSel.current)
    focusSel.current = null
    n?.focus()
  }, [stack, guide, tokensOpen, card])

  // Esc lùi một cấp: lá -> chồng -> map
  useEffect(() => {
    if (!card && !detail) return
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (card) backFromCard()
      else backFromDetail()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  })

  // Các lá xòe ra từ vị trí chồng
  useLayoutEffect(() => {
    if (!stack || reducedRef.current) return
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
      <p className="relative z-10 text-mist" aria-live="polite">{open ? boxText.hintOpen : boxText.hintClosed}</p>

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
                        style={{ background: `url(${hd ? boxFaces.bottomHd : boxFaces.bottom}) center / 100% 100% no-repeat`, filter: 'brightness(.9)' }} />
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

        {/* Mặt bàn: map + các chồng bài (chỉ dựng, tức là chỉ tải ảnh, sau lần mở đầu tiên) */}
        {ever && (
          <div className="bx-table absolute inset-0 grid place-items-center [perspective:1400px]" inert={!open || detail}>
            <div ref={ref('map')} className="invisible">
              <div className="bx-plane">
                <img src={mapImage} alt={boxText.mapAlt} width={1600} height={1602} draggable={false} className="h-full w-full rounded-[6px] object-cover" />
                {cardGroups.map((g) => (
                  <div key={g.id} className="bx-spot" style={{ left: `${SPOTS[g.id][0]}%`, top: `${SPOTS[g.id][1]}%` }}>
                    <button type="button" data-stack={g.id} className="bx-stack invisible" onClick={() => pickStack(g)}
                      aria-label={`${g.name}, ${g.cards.length} ${boxText.cardsUnit}. Bấm để xem từng lá`}>
                      <span className="bx-glow" />
                      <span className="bx-pile">
                        {Array.from({ length: Math.min(6, Math.ceil(g.cards.length / 3)) }, (_, i) => i).map((i, _k, a) => (
                          <img key={i} src={g.cover} alt="" width={600} height={927} draggable={false} className="bx-layer"
                            style={{ transform: `translate(${(i - a.length + 1) * 1.6}px, ${(i - a.length + 1) * 2.2}px) rotate(${i === a.length - 1 ? 0 : ((i * 7) % 5) - 2}deg)` }} />
                        ))}
                      </span>
                      <span className="bx-label">{boxText.stackLabel[g.id] ?? g.name}</span>
                    </button>
                  </div>
                ))}
                <div className="bx-spot" style={{ left: `${SPOTS.guide[0]}%`, top: `${SPOTS.guide[1]}%` }}>
                  <button type="button" data-stack="guide" className="bx-stack invisible" onClick={() => pickStack('guide')}
                    aria-label={`${boxText.guideName}. Bấm để mở tờ gấp`}>
                    <span className="bx-glow" />
                    {/* Tờ gấp: chỉ thấy bìa; vài lớp lệch nhau cho thấy độ dày các trang gấp */}
                    <span className="bx-pile bx-pile-guide">
                      {[0, 1, 2].map((i) => (
                        <span key={i} role={i === 2 ? 'img' : undefined} aria-label={i === 2 ? boxText.guideCoverAlt : undefined}
                          className="bx-layer" style={{ ...coverStyle(guidePages.back), transform: `translate(${(i - 2) * 1.4}px, ${(i - 2) * 1.8}px)` }} />
                      ))}
                    </span>
                    <span className="bx-label">{boxText.guideName}</span>
                  </button>
                </div>
                {/* Cụm token: vài đồng token chồng lệch nhau (chỉ loại đã có ảnh) */}
                <div className="bx-spot" style={{ left: `${SPOTS.tokens[0]}%`, top: `${SPOTS.tokens[1]}%` }}>
                  <button type="button" data-stack="tokens" className="bx-stack invisible" onClick={() => pickStack('tokens')}
                    aria-label={`${boxText.tokensName}. Bấm để xem`}>
                    <span className="bx-glow" />
                    <span className="bx-coins">
                      {TOKENS.flatMap((t) => t.images).map((src, i) => (
                        <img key={i} src={src} alt="" width={400} height={400} draggable={false} className="bx-coin" style={{ '--i': i } as CSSProperties} />
                      ))}
                    </span>
                    <span className="bx-label">{boxText.tokensLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`relative z-10 mt-6 flex gap-4 transition-opacity duration-500 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button type="button" onClick={closeBox} className="btn btn-ghost frame font-ui" tabIndex={open ? 0 : -1}>{boxText.close}</button>
      </div>

      {/* Xem các lá trong một chồng */}
      {stack && <Fan group={stack} inert={!!card} onBack={backFromDetail} onPick={(c) => setCard(c)} />}
      {guide && <GuideViewer onBack={backFromDetail} />}
      {tokensOpen && <TokenViewer onBack={backFromDetail} />}
      {card && stack && <Zoom card={card} group={stack} onBack={backFromCard} />}
    </section>
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
        <button type="button" autoFocus onClick={onBack} className="btn btn-ghost frame font-ui">{boxText.back}</button>
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{group.name}</h3>
        <span className="text-sm text-mist">{boxText.pickCard}</span>
      </div>
      {/* Lưới a×b co theo khung (container query) để thấy hết các lá cùng lúc, không phải cuộn */}
      <div className="bx-grid-box min-h-0 flex-1">
        <div className="bx-grid" style={{ '--cs': g.cs, '--rs': g.rs, '--cd': g.cd, '--rd': g.rd } as CSSProperties}>
          {group.cards.map((c) => (
            <button key={c.id} type="button" data-card={c.id} onClick={() => onPick(c)} aria-label={c.name} className="bx-card cursor-pointer">
              <img src={c.image} alt="" width={600} height={927} draggable={false} className="h-full w-full rounded-md object-cover shadow-[0_14px_26px_rgb(0_0_0/.55)] transition-transform duration-200 hover:-translate-y-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Các loại token: ảnh + số lượng + ghi chú (nguyên văn nội dung team). Loại chưa có ảnh hiện vòng tròn kèm số. */
function TokenViewer({ onBack }: { onBack: () => void }) {
  return (
    <div role="dialog" aria-label={boxText.tokensName} className="bx-detail absolute inset-0 z-30 flex flex-col bg-night/90 px-4 pb-6 pt-24 text-left backdrop-blur-sm md:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" autoFocus onClick={onBack} className="btn btn-ghost frame font-ui">{boxText.back}</button>
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{boxText.tokensName}</h3>
        <span className="text-sm text-mist">{boxText.tokensHint}</span>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pb-2 md:grid-cols-3 md:content-center md:gap-6">
        {TOKENS.map((t) => (
          <div key={t.id} className="frame flex items-start gap-4 bg-night/70 p-4 md:flex-col md:items-center md:p-6 md:text-center">
            <div className="flex shrink-0 justify-center">
              {t.images.length ? t.images.map((src, i) => (
                <img key={i} src={src} alt="" width={400} height={400} draggable={false}
                  className="h-16 w-16 rounded-full shadow-[0_10px_20px_rgb(0_0_0/.5)] md:h-28 md:w-28" style={{ marginLeft: i ? '-0.75rem' : 0 }} />
              )) : (
                // TODO(asset): chưa có ảnh token chiến thắng
                <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-gold/60 font-display text-xl font-bold text-gold md:h-28 md:w-28 md:text-3xl">{t.qty.split(' ')[0]}</span>
              )}
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
    <div role="dialog" aria-label={card.name} className="bx-zoom absolute inset-0 z-40 flex flex-col items-center gap-5 overflow-y-auto bg-night/95 px-5 pb-8 pt-24 text-left md:flex-row md:justify-center md:gap-14 md:overflow-hidden">
      <img src={card.image} alt={`${card.name}, ${group.name}`} width={600} height={927} draggable={false}
        className="bx-zoom-img h-auto max-h-[40svh] w-auto shrink-0 rounded-lg shadow-[0_30px_60px_rgb(0_0_0/.7)] md:max-h-[74svh]" />
      <div className="bx-zoom-info frame w-full max-w-md bg-night/90 p-6">
        <h3 className="mb-3 font-display text-2xl font-bold text-gold">{card.name}</h3>
        <CardText text={card.text} />
        <button type="button" autoFocus onClick={onBack} className="mt-6 text-sm font-bold text-gold hover:underline">{boxText.back}</button>
      </div>
    </div>
  )
}

/**
 * Tờ hướng dẫn: mở từ dạng gấp (chỉ thấy bìa) thành tờ trải phẳng 5 trang.
 * Phóng to: cuộn chuột (quanh vị trí con trỏ), bấm đúp, chụm hai ngón; kéo để di chuyển khi đã phóng to.
 */
const PANELS = 5
const SHEET_MAX = 4

function GuideViewer({ onBack }: { onBack: () => void }) {
  const view = useRef<HTMLDivElement>(null) // khung nhìn, không biến đổi
  const sheet = useRef<HTMLDivElement>(null) // tờ giấy, GSAP scale + x/y (gốc 0 0)
  const z = useRef({ s: 1, x: 0, y: 0 })
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef({ d: 0, s: 1 })
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

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
    ns = clamp(ns, 1, SHEET_MAX)
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

  // Mở tờ gấp: các trang chồng lên bìa rồi lần lượt trải ra
  useLayoutEffect(() => {
    fit(false)
    if (prefersReducedMotionNow()) { gsap.set('.bx-cover', { autoAlpha: 0 }); return }
    const panels = gsap.utils.toArray<HTMLElement>('.bx-panel', sheet.current)
    const w = panels[0].offsetWidth
    gsap.timeline({ defaults: { ease: 'power3.inOut' } })
      .from('.bx-detail', { autoAlpha: 0, duration: 0.3 })
      .from('.bx-cover', { scale: 0.7, autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, 0.05)
      .to('.bx-cover', { rotationY: -100, autoAlpha: 0, duration: 0.5 }, 0.55)
      .from(panels, {
        x: (i) => (PANELS - 1 - i) * w, rotationY: (i) => (i === PANELS - 1 ? 0 : i % 2 ? -90 : 90),
        autoAlpha: 0, duration: 0.8, stagger: { each: 0.1, from: 'end' }, clearProps: 'transform,opacity,visibility',
      }, 0.6)
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
    <div role="dialog" aria-label={boxText.guideName} className="bx-detail absolute inset-0 z-30 flex flex-col bg-night/90 px-4 pb-6 pt-24 text-left backdrop-blur-sm md:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" autoFocus onClick={onBack} className="btn btn-ghost frame font-ui">{boxText.back}</button>
        <h3 className="font-display text-2xl font-bold text-gold md:text-3xl">{boxText.guideName}</h3>
        <span className="text-sm text-mist">{touch ? boxText.guideHintTouch : boxText.guideHint}</span>
      </div>
      <div ref={view} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble}
        className="relative min-h-0 flex-1 cursor-zoom-in touch-none select-none overflow-hidden [perspective:1600px]">
        <div ref={sheet} role="img" aria-label={boxText.guideFrontAlt}
          className="absolute left-0 top-0 flex aspect-[2000/599] w-[min(100%,1500px,calc((100svh-12rem)*3.34))] rounded-md shadow-[0_20px_40px_rgb(0_0_0/.6)]"
          style={{ transformOrigin: '0 0' }}>
          {Array.from({ length: PANELS }, (_, i) => (
            <div key={i} className="bx-panel h-full flex-1" style={{
              backgroundImage: `url(${guidePages.frontHd})`, backgroundSize: `${PANELS * 100}% 100%`,
              backgroundPosition: `${(i / (PANELS - 1)) * 100}% 0`, transformOrigin: i % 2 ? 'left center' : 'right center',
            }} />
          ))}
          {/* Bìa lúc còn gấp, nằm đè lên trang cuối rồi lật đi */}
          <div className="bx-cover absolute right-0 top-0 h-full rounded-md" style={{ width: `${100 / PANELS}%`, transformOrigin: 'left center', ...coverStyle(guidePages.back) }} />
        </div>
      </div>
    </div>
  )
}

const prefersReducedMotionNow = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
