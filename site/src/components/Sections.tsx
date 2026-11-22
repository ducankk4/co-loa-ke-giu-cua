import { lazy, Suspense, useLayoutEffect, useRef } from 'react'
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

const PawnViewer = lazy(() => import('./PawnViewer'))

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
        <GoldButton href="#dat-truoc">{hero.preorder}</GoldButton>
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
    <li id={`tp-${p.id}`} className="pt-cell frame flex scroll-mt-28 flex-col items-center bg-night/70 px-5 py-6 text-center backdrop-blur-sm">
      <div className={`pt-art pt-${p.shape}`}>
        {n === 0 ? (
          // TODO(asset): chưa có ảnh thật, hiện khung trống mờ thay vì bịa ảnh khác
          <div className="pt-empty frame" aria-hidden><span>{p.qty.match(/\d+/)?.[0]}</span></div>
        ) : p.id === 'token-linh' ? (
          // Token lính: mô hình 3D thật (Three.js, tải lười); ảnh phẳng làm dự phòng
          <Suspense fallback={null}><PawnViewer fallback={p.images} label={p.name} /></Suspense>
        ) : p.images.map((src, i) => (
          <img key={src} src={src} alt={n === 1 ? p.name : ''} loading="lazy" width={p.shape === 'card' ? 300 : undefined}
            className={`pt-img tilt ${n > 1 ? 'pt-stack' : ''}`}
            style={n > 1 ? { rotate: `${(i - (n - 1) / 2) * 12}deg`, translate: `${(i - (n - 1) / 2) * (p.shape === 'pawn' ? 80 : 34)}% 0`, zIndex: i } : undefined} />
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
        <GoldButton href="#dat-truoc">{hero.preorder}</GoldButton>
      </div>
    </section>
  )
}

export function Footer() {
  const h = 'mb-3 font-display font-bold text-gold'
  // Logo gốc của từng nền tảng (Simple Icons, CC0); màu theo nhận diện thương hiệu.
  const socials = [
    { name: 'Facebook', href: contact.fanpage, d: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z', fill: '#1877f2' },
    { name: 'Instagram', href: contact.instagram, d: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077', fill: 'url(#ig-grad)' },
    { name: 'TikTok', href: contact.tiktok, d: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z', fill: '#000' },
  ]
  const icon = 'grid h-10 w-10 place-items-center rounded-full bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_var(--color-gold)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
  return (
    <footer className="border-t border-gold/25 bg-silk px-5 py-10 md:px-10">
      <div className="mx-auto grid max-w-4xl gap-8 text-sm md:grid-cols-[auto_auto_auto_auto] md:justify-between md:gap-12">
        <img src={img.logo} alt="Cổ Loa: Kẻ Giữ Cửa" className="-my-4 w-32" loading="lazy" />
        <div>
          <h3 className={h}>Khám phá</h3>
          <ul className="space-y-2">{nav.map((n) => <li key={n.id}><a href={`#${n.id}`} className="link-u hover:text-gold">{n.label}</a></li>)}</ul>
        </div>
        <div>
          <h3 className={h}>Hỗ trợ</h3>
          <p>Đang cập nhật</p>
        </div>
        <div>
          <h3 className={h}>Liên hệ</h3>
          <p className="mb-3">Email: {contact.email ?? 'Đang cập nhật'}</p>
          <ul className="flex gap-3">
            {socials.map((s) => (
              <li key={s.name}>
                <a href={s.href ?? undefined} target={s.href ? '_blank' : undefined} rel="noopener noreferrer"
                  aria-label={s.href ? s.name : `${s.name} (đang cập nhật)`} aria-disabled={!s.href} title={s.href ? s.name : `${s.name}: đang cập nhật`}
                  className={`${icon} ${s.href ? '' : 'opacity-60'}`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                    {s.name === 'Instagram' && <defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#feda75" /><stop offset=".3" stopColor="#fa7e1e" /><stop offset=".55" stopColor="#d62976" /><stop offset=".8" stopColor="#962fbf" /><stop offset="1" stopColor="#4f5bd5" /></linearGradient></defs>}
                    <path d={s.d} fill={s.fill} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-8 text-center"><a href="#top" className="text-sm text-gold hover:underline">Về đầu trang</a></p>
    </footer>
  )
}
