import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { img } from '../data/assets'
import { hero, intro, history, finalCta, nav } from '../data/content'
import { parts, type Part } from '../data/gameInfo'
import { contact } from '../data/contact'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTilt } from '../hooks/useTilt'
import { GoldButton, MetaBar, Scene } from './ui'
import Split from './Split'

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
    <section ref={root} id="top" className="relative isolate flex min-h-[100svh] flex-col items-center justify-start overflow-hidden px-5 pb-28 pt-24 text-center">
      <img src={img.heroBg} alt="" className="hp-bg fade-bottom absolute -inset-4 -z-30 h-[calc(100%+2rem)] w-[calc(100%+2rem)] max-w-none object-cover object-[50%_88%]" />
      <div className="hp-glow absolute left-1/2 top-[9%] -z-20 -translate-x-1/2" aria-hidden>
        <div className="moonrise-dim h-[min(60vw,36rem)] w-[min(60vw,36rem)] bg-[radial-gradient(circle,rgb(242_193_98/.9)_0%,rgb(242_193_98/.45)_38%,transparent_68%)] max-md:h-72 max-md:w-72" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_38%,transparent_20%,rgb(5_9_24/.75)_80%)]" />
      <h1 className="sr-only">Cổ Loa: Kẻ Giữ Cửa</h1>
      <div className="scene-out flex flex-col items-center">
      <img src={img.logo} alt="" className="hp-logo -my-16 w-[min(92vw,560px)] drop-shadow-[0_6px_24px_rgb(5_9_24/.7)]" width={600} height={600} />
      <p className="mt-40 max-w-md font-serif text-xl leading-relaxed text-white md:mt-48 md:text-2xl">{hero.tagline}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <GoldButton href="#gioi-thieu">{hero.explore}</GoldButton>
        <GoldButton href="#dat-truoc" solid>{hero.preorder}</GoldButton>
      </div>
      </div>
      <MetaBar className="absolute bottom-8 justify-center" />
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
          <img src={td} alt="Triệu Đà" className="block h-[15rem] w-auto md:h-[24rem]" loading="lazy" />
          <img src={adv} alt="An Dương Vương" className="relative z-10 -mx-3 block h-[20rem] w-auto md:h-[31rem]" loading="lazy" />
          <img src={tt} alt="Trọng Thủy" className="block h-[16rem] w-auto md:h-[26rem]" loading="lazy" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-night to-transparent" />
    </Scene>
  )
}

/** Câu bối cảnh sáng dần từng từ theo nhịp cuộn */
export function History() {
  const text = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.w', { opacity: 0.15 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: text.current, start: 'top 80%', end: 'bottom 45%', scrub: true },
      })
    }, text)
    return () => ctx.revert()
  }, [reduced])

  return (
    <Scene id="boi-canh" bg={img.rulesBg} pos="60% 100%" overlay="from-night/90 via-night/55 to-night/10">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div ref={text}>
          <h2 className="h2 mb-6"><Split text={history.title} mode="words" /></h2>
          <p className="body text-xl text-white"><Split text={history.body} mode="words" /></p>
        </div>
        <div className="relative mx-auto grid aspect-square w-[min(78vw,26rem)] place-items-center">
          <div className="moon absolute inset-6" aria-hidden />
          <img src={img.soldierRed} alt="Kỵ binh Triệu Đà" className="relative w-[88%] translate-x-4 translate-y-3" loading="lazy" />
        </div>
      </div>
    </Scene>
  )
}

/** Một ô thành phần: ảnh (xếp chồng/xòe nhẹ nếu nhiều), tên, số lượng vàng, mô tả */
function PartCell({ p }: { p: Part }) {
  const n = p.images.length
  return (
    <li className="frame flex flex-col items-center bg-night/70 px-5 py-6 text-center backdrop-blur-sm">
      <div className={`pt-art pt-${p.shape}`}>
        {n === 0 ? (
          // TODO(asset): chưa có ảnh thật, hiện khung trống mờ thay vì bịa ảnh khác
          <div className="pt-empty frame" aria-hidden><span>{p.qty.match(/\d+/)?.[0]}</span></div>
        ) : p.images.map((src, i) => (
          <img key={src} src={src} alt={n === 1 ? p.name : ''} loading="lazy" width={p.shape === 'card' ? 300 : undefined}
            className={`pt-img tilt ${n > 1 ? 'pt-stack' : ''}`}
            style={n > 1 ? { rotate: `${(i - (n - 1) / 2) * 12}deg`, translate: `${(i - (n - 1) / 2) * 34}% 0`, zIndex: i } : undefined} />
        ))}
      </div>
      <h3 className="mt-5 font-display text-lg font-bold text-white">{p.name}</h3>
      <p className="mt-1 text-base font-bold text-gold">{p.qty}</p>
      {p.body && <p className="mt-3 text-sm leading-relaxed text-mist">{p.body}</p>}
    </li>
  )
}

export function Components() {
  const list = useRef<HTMLUListElement>(null)
  useTilt(list)
  return (
    <Scene id="thanh-phan" bg={img.componentsBg} overlay="from-night/80 via-night/70 to-night/80">
      <h2 className="h2 mb-10 text-center md:mb-14">Thành phần bộ game</h2>
      <ul ref={list} className="mx-auto grid max-w-6xl grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3">
        {parts.map((p) => <PartCell key={p.id} p={p} />)}
      </ul>
    </Scene>
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
        <GoldButton href="#dat-truoc" solid>{hero.preorder}</GoldButton>
      </div>
    </section>
  )
}

export function Footer() {
  const links = [['Email', contact.email], ['Fanpage', contact.fanpage], ['Zalo', contact.zalo], ['TikTok', contact.tiktok]] as const
  const h = 'mb-3 font-display font-bold text-gold'
  return (
    <footer className="border-t border-gold/25 bg-night px-5 py-14 md:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 text-sm md:grid-cols-[auto_1fr_1fr_1fr] md:gap-16">
        <img src={img.logo} alt="Cổ Loa: Kẻ Giữ Cửa" className="-my-6 w-40" loading="lazy" />
        <div>
          <h3 className={h}>Khám phá</h3>
          <ul className="space-y-2">{nav.map((n) => <li key={n.id}><a href={`#${n.id}`} className="hover:text-gold">{n.label}</a></li>)}</ul>
        </div>
        <div>
          <h3 className={h}>Hỗ trợ</h3>
          <p>Đang cập nhật</p>
        </div>
        <div>
          <h3 className={h}>Liên hệ</h3>
          <ul className="space-y-2">{links.map(([k, v]) => <li key={k}>{k}: {v ?? 'Đang cập nhật'}</li>)}</ul>
        </div>
      </div>
      <p className="mt-12 text-center"><a href="#top" className="text-sm text-gold hover:underline">Về đầu trang</a></p>
    </footer>
  )
}
