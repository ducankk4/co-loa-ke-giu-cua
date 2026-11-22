import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { img } from '../data/assets'
import { rulesIntro, whoIsWho, eyesClosed } from '../data/content'
import { rulesSetup, rulesRound, rulesWin, rulesSpecial, soldierCards } from '../data/gameInfo'
import { pawns } from '../data/cards'
import { goToCharacter } from '../lib/characterNav'
import { prefersReducedMotion, useReducedMotion } from '../hooks/useReducedMotion'
import { Backdrop, GoldButton, MetaBar, Scene } from './ui'

gsap.registerPlugin(ScrollTrigger)

/**
 * Lá bài úp -> xòe 3 -> tráo -> lật Trọng Thủy (pin + scrub).
 * Chữ giải thích bên trái, bài bên phải để khung hình không trống.
 */
function WhoIsWho() {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = root.current!
    const cards = gsap.utils.toArray<HTMLElement>('.wiw-card', el)
    const flip = el.querySelector<HTMLElement>('.wiw-flip')!
    const label = el.querySelector<HTMLElement>('.wiw-label')!
    const items = gsap.utils.toArray<HTMLElement>('.wiw-item', el)
    if (prefersReducedMotion()) {
      gsap.set(flip, { rotateY: 180 })
      gsap.set(cards, { x: (i) => (i - 1) * 120, rotate: (i) => (i - 1) * 10 })
      return
    }
    const mm = gsap.matchMedia()
    mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, (ctx) => {
      const spread = ctx.conditions!.desk ? 170 : 90
      gsap.set(cards, { x: 0, rotate: 0, opacity: 0, y: 120 })
      gsap.set(label, { opacity: 0, y: 16 })
      gsap.set(items.slice(1), { opacity: 0.15 })
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top top', end: ctx.conditions!.desk ? '+=250%' : '+=180%', pin: true, scrub: true },
      })
      tl.to(cards, { opacity: 1, y: 0, duration: 1 })
        .to(cards, { x: (i) => (i - 1) * spread, rotate: (i) => (i - 1) * 10, duration: 1 })
        .to(items[1], { opacity: 1, duration: 0.6 }, '<')
        .to(cards, { x: (i) => ((i + 1) % 3 - 1) * spread, duration: 0.6 })
        .to(cards, { x: (i) => ((i + 2) % 3 - 1) * spread, duration: 0.6 })
        .to(cards, { x: (i) => (i - 1) * spread, duration: 0.6 })
        .to(flip, { rotateY: 180, duration: 1 })
        .to(label, { opacity: 1, y: 0, duration: 0.6 })
    })
    return () => mm.revert()
  }, [])

  return (
    <div id="luat-choi" ref={root} className="relative isolate h-screen overflow-hidden px-5 md:px-10">
      <Backdrop bg={img.rulesBg} pos="70% 100%" overlay="from-night/90 via-night/70 to-night/60" parallax={false} />
      <div className="mx-auto grid h-full max-w-6xl content-center items-center gap-10 pt-16 md:grid-cols-[1fr_1.2fr] md:gap-6 md:pt-0">
        <div>
          <span className="rl-num mb-2 block text-4xl md:text-6xl" aria-hidden>{rulesSetup.n}</span>
          {/* Cột hẹp: cỡ chữ nhỏ hơn .h2 mặc định để tiêu đề không vỡ thành 3 dòng lệch */}
          <h2 className="h2 mb-5 !text-[clamp(2rem,4.2vw,3.6rem)]">{rulesSetup.title}</h2>
          {/* Mục 3 (thẻ nhiệm vụ) nằm ở đoạn "Nhắm mắt" kế tiếp */}
          <div className="grid gap-4">
            {rulesSetup.items.slice(0, 2).map((t) => <p key={t} className="wiw-item rl-item body text-[.95rem] md:text-lg">{t}</p>)}
          </div>
        </div>
        <div className="relative grid place-items-center">
          <div className="moon absolute aspect-square w-[min(70vw,26rem)] opacity-[.16]" aria-hidden />
          <div className="relative h-56 w-36 md:h-96 md:w-64" style={{ perspective: 1000 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`wiw-card absolute inset-0${i === 1 ? ' z-10' : ''}`}>
            {i === 1 ? (
              <div className="wiw-flip relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
                <img src={img.cardBack} alt="Lá bài úp" className="absolute inset-0 h-full w-full rounded-lg object-contain shadow-2xl" style={{ backfaceVisibility: 'hidden' }} />
                <img src={img.cardTrongThuy} alt="Lá bài Trọng Thủy" className="absolute inset-0 h-full w-full rounded-lg object-contain shadow-[0_0_40px_rgb(242_193_98/.5)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} />
              </div>
            ) : (
              <img src={img.cardBack} alt="Lá bài úp" className="h-full w-full rounded-lg object-contain shadow-2xl" />
            )}
          </div>
        ))}
          </div>
          <p className="wiw-label mt-6 font-display md:mt-10 text-xl font-bold text-gold md:text-2xl">{whoIsWho.reveal}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Nhắm mắt: cả thành tối lại, gọi Trọng Thủy, rồi mở ra cảnh Trọng Thủy cầm Mật chiếu
 * cùng lời trích trên lá bài. Trước khi tối: chỉ có chữ, tượng còn chìm trong bóng.
 */
function EyesClosed() {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = root.current!
    const q = gsap.utils.selector(el)
    if (prefersReducedMotion()) { gsap.set(q('.veil'), { autoAlpha: 0 }); return }
    const ctx = gsap.context(() => {
      gsap.set('.ec-statue', { filter: 'brightness(.15)', scale: 0.96 })
      gsap.set('.ec-card', { yPercent: 40, rotate: 0, autoAlpha: 0 })
      gsap.set('.ec-order', { autoAlpha: 0, y: 24 })
      gsap.set('.ec-glow', { autoAlpha: 0 })
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top top', end: '+=200%', pin: true, scrub: true } })
        .fromTo('.veil', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 })
        .fromTo('.eyes-line', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 })
        .to('.eyes-line', { autoAlpha: 0, duration: 0.4 }, '+=0.4')
        .set('.ec-statue', { filter: 'brightness(1)', scale: 1 })
        .set('.ec-glow', { autoAlpha: 1 })
        .to('.veil', { autoAlpha: 0, duration: 1 })
        .to('.ec-card', { yPercent: 0, rotate: 8, autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, '-=0.4')
        .to('.ec-order', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.3')
    }, el)
    return () => ctx.revert()
  }, [])
  return (
    <div ref={root} className="relative isolate h-screen overflow-hidden px-5 md:px-10">
      <Backdrop bg={img.rulesBg} pos="30% 100%" overlay="from-night/90 via-night/75 to-night/60" parallax={false} />
      <div className="mx-auto grid h-full max-w-6xl content-center items-center gap-4 pt-16 md:grid-cols-[1.1fr_1fr] md:gap-8 md:pt-0">
        <div>
          <h2 className="h2 mb-3 md:mb-5">{eyesClosed.title}</h2>
          <p className="body rl-item mb-4 !text-base md:mb-8 md:!text-lg">{rulesSetup.items[2]}</p>
          <figure className="ec-order frame frame-red bg-red-td/25 p-4 md:p-7">
            <blockquote className="font-serif text-base italic leading-relaxed text-white md:text-xl">“{eyesClosed.order}”</blockquote>
            <figcaption className="mt-3 text-sm text-red-200">{eyesClosed.source}</figcaption>
          </figure>
        </div>
        <div className="relative flex h-[30svh] items-end justify-center md:h-[78svh]">
          <div className="ec-glow absolute bottom-[12%] left-1/2 aspect-square w-[min(80%,26rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(179_50_43/.55),transparent_68%)]" aria-hidden />
          <img src={img.statueTrongThuy} alt="Trọng Thủy" className="ec-statue relative h-full w-auto" loading="lazy" />
          <img src={img.secret} alt="Lá bài Mật chiếu" className="ec-card absolute bottom-[8%] right-[4%] w-28 rounded-lg shadow-[0_24px_40px_rgb(0_0_0/.7)] md:right-[8%] md:w-48" loading="lazy" />
        </div>
      </div>
      <div className="veil invisible absolute inset-0 z-10 grid place-items-center bg-black">
        <p className="eyes-line px-5 text-center font-display text-3xl font-bold text-gold md:text-5xl">{eyesClosed.line}</p>
      </div>
    </div>
  )
}

/** Hình minh họa cho 4 bước của một vòng chơi, dùng ảnh có sẵn */
function RoundArt({ i }: { i: number }) {
  const b = soldierCards.blue[1]?.image ?? img.cardBlue
  const r = soldierCards.red[1]?.image ?? img.cardRed
  const card = 'w-14 rounded-md shadow-xl md:w-[4.2rem]'
  if (i === 0)
    return (
      <div className="flex">
        <img src={img.cardBack} alt="Hai lá bài úp, hai phe bàn mưu" className={`${card} -mr-3`} style={{ transform: 'rotate(-8deg)' }} loading="lazy" />
        <img src={img.cardBack} alt="" className={card} style={{ transform: 'rotate(8deg) translateY(6px)' }} loading="lazy" />
      </div>
    )
  if (i === 1)
    return (
      <div className="flex gap-2">
        {[img.cardBlue, img.cardBlue, img.cardRed, img.cardRed].map((x, k) => (
          <img key={k} src={x} alt={k === 0 ? 'Thẻ lính đặt vào cửa' : ''} className="w-10 rounded shadow-lg md:w-12" loading="lazy" />
        ))}
      </div>
    )
  if (i === 2)
    return (
      <div className="flex items-center gap-1">
        <img src={b} alt="Thẻ lính An Dương Vương lật ngửa" className={card} style={{ transform: 'rotate(-6deg)' }} loading="lazy" />
        <span aria-hidden className="font-display text-xl font-bold text-gold">vs</span>
        <img src={r} alt="Thẻ lính Triệu Đà lật ngửa" className={card} style={{ transform: 'rotate(6deg)' }} loading="lazy" />
      </div>
    )
  return (
    <div className="relative h-full aspect-square">
      <img src={img.mapImage} alt="Bản đồ với token lính còn lại" className="h-full w-full rounded-md object-cover shadow-xl" loading="lazy" />
      {/* Token lính = quân nhựa xanh/đỏ */}
      <img src={pawns.xanh} alt="" className="absolute -left-1 bottom-1 h-12 drop-shadow-lg md:h-14" loading="lazy" />
      <img src={pawns.xanh} alt="" className="absolute left-4 bottom-0 h-10 drop-shadow-lg md:h-12" loading="lazy" />
      <img src={pawns.do} alt="" className="absolute -right-1 top-1 h-12 drop-shadow-lg md:h-14" loading="lazy" />
      <img src={pawns.do} alt="" className="absolute right-4 top-3 h-10 drop-shadow-lg md:h-12" loading="lazy" />
    </div>
  )
}

export default function Rules() {
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      // 02 và 04–06: từng mục hiện dần THEO CUỘN (scrub), cuộn thêm một đoạn mới ra mục tiếp theo; cuộn ngược thì lùi lại.
      // Mỗi mục: số/vòng tròn bật ra -> hình bay vào -> tiêu đề -> chữ. Không ghim.
      const enter = (tl: gsap.core.Timeline, el: Element, at: number) => {
        const q = gsap.utils.selector(el)
        tl.from(q('.rv-badge'), { scale: 0, rotation: -90, autoAlpha: 0, duration: 0.3, ease: 'back.out(2.2)' }, at)
          .from(q('.rv-art'), { y: 70, rotation: -10, scale: 0.7, autoAlpha: 0, duration: 0.45, ease: 'back.out(1.4)' }, at + 0.12)
          .from(q('.rv-title'), { y: 26, autoAlpha: 0, duration: 0.3 }, at + 0.3)
          .from(q('.rv-text'), { y: 20, autoAlpha: 0, duration: 0.3, stagger: 0.08 }, at + 0.38)
      }
      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        // Desktop: các mục nằm cùng hàng, một timeline cho cả hàng; vạch nối chạy tới số tiếp theo
        const steps = gsap.utils.toArray<HTMLElement>('.rl-step')
        const t2 = gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: '.rl-timeline', start: 'top 88%', end: 'bottom 45%', scrub: 0.8 } })
        t2.fromTo('.rl-line', { scaleX: 0 }, { scaleX: 1, duration: steps.length, ease: 'none' }, 0)
        steps.forEach((el, i) => enter(t2, el, i))
        const specs = gsap.utils.toArray<HTMLElement>('.rl-spec')
        const t4 = gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: '.rl-specs', start: 'top 88%', end: 'center 45%', scrub: 0.8 } })
        specs.forEach((el, i) => enter(t4, el, i))
      })
      mm.add('(max-width: 767px)', () => {
        // Mobile: các mục xếp dọc, mỗi mục tự hiện khi cuộn tới nó
        gsap.utils.toArray<HTMLElement>('.rl-step, .rl-spec').forEach((el) => {
          enter(gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 50%', scrub: 0.8 } }), el, 0)
        })
        gsap.fromTo('.rl-line', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.rl-timeline', start: 'top 80%', end: 'bottom 60%', scrub: 0.8 } })
      })
      // 03: dòng An Dương Vương cùng lính xanh từ trái, rồi dòng Triệu Đà cùng lính đỏ từ phải
      gsap.timeline({ scrollTrigger: { trigger: '.rl-win', start: 'top 60%' }, defaults: { ease: 'power3.out', duration: 0.8 } })
        .from('.win-adv', { xPercent: -60, opacity: 0 })
        .from('.win-row-adv', { x: -30, opacity: 0 }, '<0.15')
        .from('.win-td', { xPercent: 60, opacity: 0 }, '+=0.25')
        .from('.win-row-td', { x: 30, opacity: 0 }, '<0.15')
    })
    return () => ctx.revert()
  }, [reduced])
  return (
    <>
      <Scene id="cach-choi" bg={img.rulesBg} pos="60% 100%" overlay="from-night/90 via-night/55 to-transparent" className="py-36">
        <h2 className="h2 mb-6 max-w-2xl">{rulesIntro.title}</h2>
        <p className="body mb-9">{rulesIntro.body}</p>
        <GoldButton href="#luat-choi">{rulesIntro.cta}</GoldButton>
        <MetaBar className="mt-12" />
      </Scene>
      <WhoIsWho />
      <EyesClosed />

      {/* 02: một vòng chơi, 4 bước (chuỗi thật nên đánh số) */}
      <Scene bg={img.rulesBg} pos="50% 100%" overlay="from-night/85 via-night/75 to-night/85">
        <span className="rl-num mb-2 block text-4xl md:text-6xl" aria-hidden>{rulesRound.n}</span>
        <h2 className="h2 mb-12 max-w-3xl">{rulesRound.title}</h2>
        <ol className="rl-timeline">
          <span className="rl-line" aria-hidden />
          {rulesRound.steps.map((s, i) => (
            <li key={s.title} className="rl-step">
              <span className="rl-stepno rv-badge" aria-hidden>{i + 1}</span>
              <div className="rl-art rv-art md:mt-6"><RoundArt i={i} /></div>
              <h3 className="rv-title font-display text-xl font-bold text-gold md:mt-2"><span className="sr-only">Bước {i + 1}: </span>{s.title}</h3>
              <div className="mt-2 grid gap-2 text-[.95rem] leading-relaxed text-mist">
                {s.body.map((t) => <p key={t} className="rv-text">{t}</p>)}
              </div>
            </li>
          ))}
        </ol>
      </Scene>

      {/* 03: thắng – thua */}
      <Scene bg={img.rulesBg} pos="70% 100%" overlay="from-night/80 via-night/70 to-night/80" className="rl-win">
        <span className="rl-num mb-2 block text-4xl md:text-6xl" aria-hidden>{rulesWin.n}</span>
        <h2 className="h2 mb-10 max-w-3xl">{rulesWin.title}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {rulesWin.sides.map((l) => {
            const td = l.side === 'td'
            return (
              <div key={l.side} className={`win-row-${l.side} rl-winrow frame ${td ? 'frame-red bg-red-td/30' : 'frame-blue bg-blue-adv/25'} flex items-center gap-5 p-6 md:p-8`}>
                <div className="relative w-24 shrink-0 md:w-32">
                  <div className="moon absolute inset-2" aria-hidden />
                  <img src={td ? img.soldierRed : img.soldierBlue} alt={td ? 'Quân Triệu Đà' : 'Quân An Dương Vương'} className={`${td ? 'win-td' : 'win-adv brightness-110'} relative w-full`} loading="lazy" />
                </div>
                <div>
                  <p className={`mb-2 font-display text-xl font-bold ${td ? 'text-red-300' : 'text-sky-300'}`}>{l.who}</p>
                  <p className="leading-relaxed text-white">{l.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Scene>

      {/* 04–06: cơ chế đặc biệt */}
      <Scene bg={img.rulesBg} pos="30% 100%" overlay="from-night/85 via-night/75 to-night/85">
        <div className="rl-specs grid gap-12 md:grid-cols-3 md:gap-8">
          {rulesSpecial.map((x) => (
            <article key={x.n} className="rl-spec flex flex-col">
              <div className="rl-spec-art rv-art mb-5">
                <div className="moon absolute aspect-square h-32 opacity-[.18]" aria-hidden />
                <img src={x.image} alt="" className="relative rounded-md drop-shadow-2xl" loading="lazy" />
              </div>
              <span className="rl-num rv-badge mb-1 inline-block self-start text-3xl" aria-hidden>{x.n}</span>
              <h3 className="rv-title mb-3 font-display text-xl font-bold text-gold md:text-2xl">{x.title}</h3>
              <div className="grid gap-3 text-[.95rem] leading-relaxed text-mist">
                {x.body.map((t) => <p key={t} className="rv-text">{t}</p>)}
              </div>
              {'note' in x && x.note && <p className="rv-text rl-item mt-4 text-sm italic leading-relaxed text-gold">{x.note}</p>}
              {'link' in x && x.link && (
                // Dẫn về chỗ đã trình bày lá bài: 04 -> ô Thẻ nhiệm vụ (Thành phần), 06 -> Trọng Thủy (Nhân vật, đúng điểm dừng trong đoạn ghim)
                <div className="rv-text mt-6">
                  <a href={x.link.href} className="btn btn-solid !px-5 !py-2.5 !text-sm"
                    onClick={(e) => { if (x.link.character && goToCharacter(x.link.character)) { e.preventDefault(); e.stopPropagation() } }}>
                    {x.link.label}
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </Scene>
    </>
  )
}
