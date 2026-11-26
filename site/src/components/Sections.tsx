import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { img } from '../data/assets'
import { hero, intro, history, finalCta } from '../data/content'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTilt } from '../hooks/useTilt'
import { GoldButton, MetaBar, Scene } from './ui'
import Split from './Split'
import BoxIntro from './BoxIntro'

gsap.registerPlugin(ScrollTrigger)

/** Chiều sâu theo con trỏ: quầng trăng lệch ngược, logo lệch nhẹ, tranh nền gần như đứng yên */
export function Hero() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(hover: hover) and (pointer: fine)', () => {
        const layers = [
          { el: '.hp-glow', k: -28 },
          { el: '.hp-logo', k: 14 },
          { el: '.hp-bg', k: -8 },
        ].map(({ el, k }) => ({
          x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }),
          k,
        }))
        const host = root.current!
        const move = (e: PointerEvent) => {
          const r = host.getBoundingClientRect()
          const nx = (e.clientX - r.left) / r.width - 0.5
          const ny = (e.clientY - r.top) / r.height - 0.5
          layers.forEach((l) => { l.x(nx * l.k); l.y(ny * l.k * 0.6) })
        }
        const leave = () => layers.forEach((l) => { l.x(0); l.y(0) })
        host.addEventListener('pointermove', move)
        host.addEventListener('pointerleave', leave)
        return () => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave) }
      })
    }, root)
    return () => ctx.revert()
  }, [reduced])

  return (
    // Gọn trong một màn hình: logo lớn, 2 nút, MetaBar, căn giữa để thành Cổ Loa ở nền thoáng (hộp 3D đã chuyển xuống trang Thành phần)
    <section ref={root} id="top" className="relative isolate flex min-h-[100svh] flex-col items-center justify-start overflow-hidden px-5 pb-8 pt-16 text-center">
      <img src={img.heroBg} alt="" className="hp-bg fade-bottom absolute -inset-4 -z-30 h-[calc(100%+2rem)] w-[calc(100%+2rem)] max-w-none object-cover object-[50%_88%]" />
      <div className="hp-glow absolute left-1/2 top-[4%] -z-20 -translate-x-1/2" aria-hidden>
        <div className="moonrise-dim h-[min(50vw,30rem)] w-[min(50vw,30rem)] bg-[radial-gradient(circle,rgb(242_193_98/.9)_0%,rgb(242_193_98/.45)_38%,transparent_68%)] max-md:h-64 max-md:w-64" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_38%,transparent_20%,rgb(5_9_24/.75)_80%)]" />
      <h1 className="sr-only">Cổ Loa: Kẻ Giữ Cửa</h1>
      <div className="scene-out">
        <img src={img.logo} alt="" className="hp-logo hero-logo drop-shadow-[0_6px_24px_rgb(5_9_24/.7)]" width={600} height={600} />
      </div>
      <div className="scene-out mt-auto flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-4">
          <GoldButton href="#gioi-thieu">{hero.explore}</GoldButton>
          <GoldButton href={`${import.meta.env.BASE_URL}dat-truoc.html`}>{hero.preorder}</GoldButton>
        </div>
        <MetaBar className="mt-5 justify-center" />
      </div>
    </section>
  )
}

export function Intro() {
  const [td, adv, tt] = [img.statueTrieuDa, img.statueAdv, img.statueTrongThuy]
  return (
    <Scene id="gioi-thieu" bg={img.exploreBg} pos="70% 50%" className="!pb-0" overlay="from-night/90 via-night/40 to-transparent">
      <div className="grid items-end gap-6 md:grid-cols-[1.15fr_1fr]">
        <div className="relative z-10 self-center pb-12 md:pb-28">
          <h2 className="h2 mb-6">{intro.title}</h2>
          <p className="body">{intro.body}</p>
          <MetaBar className="mt-8" />
        </div>
        <div className="flex items-end justify-center">
          {/* Triệu Đà đứng sát vào nhóm: tà áo/tay chồng nhẹ ra sau An Dương Vương (lớp z-10 ở trước) */}
          <img src={td} alt="Triệu Đà" className="relative z-0 -mr-12 block h-[15rem] w-auto md:-mr-24 md:h-[24rem]" loading="lazy" />
          <img src={adv} alt="An Dương Vương" className="relative z-10 -mx-3 block h-[20rem] w-auto md:h-[31rem]" loading="lazy" />
          <img src={tt} alt="Trọng Thủy" className="block h-[16rem] w-auto md:h-[26rem]" loading="lazy" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-night to-transparent" />
    </Scene>
  )
}

/**
 * Câu bối cảnh sáng dần từng từ: tự chạy một lần (~1,2s) ngay khi section vào màn hình,
 * không gắn theo cuộn, để người xem không phải cuộn sang trang sau mới đọc được hết.
 */
export function History() {
  const text = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>('.w', text.current)
      gsap.fromTo(words, { opacity: 0.15 }, {
        opacity: 1, duration: 0.35, ease: 'power1.out', stagger: { amount: 1.2 },
        scrollTrigger: { trigger: text.current, start: 'top 75%', once: true },
      })
    }, text)
    return () => ctx.revert()
  }, [reduced])

  return (
    <Scene id="boi-canh" bg={img.rulesBg} pos="60% 100%" overlay="from-night/90 via-night/55 to-night/10">
      <div className="grid items-center">
        <div ref={text} className="max-w-2xl">
          <h2 className="h2 mb-6"><Split text={history.title} mode="words" /></h2>
          <p className="body text-xl text-white"><Split text={history.body} mode="words" /></p>
        </div>
      </div>
    </Scene>
  )
}

/**
 * Thành phần bộ game = hộp game 3D (BoxIntro): mở hộp, bấm từng món trong khay để xem chi tiết.
 * Không dùng Scene: transform của .scene-in/.scene-out sẽ giữ các lớp xem chi tiết của hộp lại trong khung nhỏ.
 * Section cao đúng một màn hình để các lớp chi tiết (absolute inset-0) phủ vừa khung nhìn.
 * Nền: tranh tối và mờ đi, vignette bốn góc để hộp là điểm sáng nhất (CSS .bx-sec-*).
 */
export function Components() {
  return (
    <section id="thanh-phan" className="relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden px-5 pb-6 pt-24 md:px-10">
      <div className="fade-edges absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        <img src={img.componentsBg} alt="" loading="lazy" className="scene-bg bx-sec-bg absolute inset-x-0 -top-[8%] h-[116%] w-full object-cover" />
      </div>
      <div className="bx-sec-vignette absolute inset-0 -z-10" aria-hidden />
      <h2 className="h2 text-center">Thành phần bộ game</h2>
      <BoxIntro />
    </section>
  )
}

const hand = [img.cardBlue, img.cardAdv, img.cardTrongThuy, img.secret, img.cardRed]

/** Thành đã mở: tiêu đề hiện từng chữ, bài được chia ra thành quạt, nút hút nhẹ theo con trỏ */
export function FinalCta() {
  const root = useRef<HTMLElement>(null)
  const btn = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useTilt(root)
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const enter = { trigger: root.current, start: 'top 60%' }
      gsap.from('.ch', { yPercent: 120, duration: 1.1, ease: 'expo.out', stagger: 0.035, scrollTrigger: enter })
      gsap.from('.fc-card', {
        y: 140, opacity: 0, rotate: 0, xPercent: (i) => (2 - i) * 70,
        duration: 1.3, ease: 'expo.out', stagger: 0.07, scrollTrigger: enter,
      })
      gsap.from('.fc-fade', { opacity: 0, y: 16, duration: 0.8, delay: 0.5, stagger: 0.1, scrollTrigger: enter })

      const mm = gsap.matchMedia()
      mm.add('(hover: hover) and (pointer: fine)', () => {
        const el = btn.current!
        const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' })
        const qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' })
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect()
          qx((e.clientX - (r.left + r.width / 2)) * 0.25)
          qy((e.clientY - (r.top + r.height / 2)) * 0.25)
        }
        const leave = () => { qx(0); qy(0) }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerleave', leave)
        return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
      })
    }, root)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={root} id="cta" className="relative isolate overflow-hidden px-5 pb-28 pt-32 text-center">
      <img src={img.heroBg} alt="" className="fade-edges absolute inset-0 -z-30 h-full w-full object-cover object-[50%_88%]" loading="lazy" />
      <div className="absolute left-1/2 top-0 -z-20 h-[28rem] w-[28rem] -translate-x-1/2 bg-[radial-gradient(circle,rgb(242_193_98/.35)_0%,transparent_65%)] md:h-[40rem] md:w-[40rem]" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-night/45" />
      <h2 className="h2 mb-5"><Split text={finalCta.title} /></h2>
      <p className="fc-fade body mx-auto mb-14">{finalCta.body}</p>
      <div className="mx-auto mb-16 flex max-w-3xl justify-center" aria-hidden>
        {hand.map((src, k) => (
          <div key={k} className="fc-card -mx-5 w-24 shrink-0 sm:w-32 md:-mx-3 md:w-40"
            style={{ rotate: `${(k - 2) * 9}deg`, translate: `0 ${Math.abs(k - 2) * 14}px` }}>
            <img src={src} alt="" className="tilt w-full rounded-lg shadow-[0_18px_34px_rgb(0_0_0/.6)]" loading="lazy" />
          </div>
        ))}
      </div>
      <div ref={btn} className="fc-fade inline-block">
        <GoldButton href={`${import.meta.env.BASE_URL}dat-truoc.html`}>{hero.preorder}</GoldButton>
      </div>
    </section>
  )
}
