import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { img } from '../data/assets'
import { roles as characters, trongThuyCards } from '../data/gameInfo'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { GoldButton } from './ui'
import Split from './Split'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

const sideStyle = {
  blue: { wash: 'from-blue-adv/55', text: 'text-sky-300', dot: 'bg-blue-adv' },
  red: { wash: 'from-red-td/75', text: 'text-red-300', dot: 'bg-red-500' },
  spy: { wash: 'from-bronze/40', text: 'text-gold', dot: 'bg-gold' },
}
const n = characters.length

function Info({ c, k }: { c: (typeof characters)[number]; k: number }) {
  const s = sideStyle[c.side]
  return (
    <div className="cv-info col-start-1 row-start-1 self-center" data-i={k}>
      <p className={`cv-rest mb-3 flex items-center gap-2 text-sm font-bold ${s.text}`}>
        <span className={`inline-block h-2.5 w-2.5 rotate-45 ${s.dot}`} />{c.role}
      </p>
      <h2 className="h2 mb-5"><Split text={c.name} /></h2>
      <p className="cv-rest body mb-5 md:mb-8 max-md:text-[0.95rem] max-md:leading-relaxed">{c.body}</p>
      {'note' in c && <p className="cv-rest mb-5 text-sm italic text-gold md:mb-8">{c.note}</p>}
      <div className="cv-rest max-md:hidden"><GoldButton href="#dat-truoc" solid>Đặt trước sản phẩm</GoldButton></div>
    </div>
  )
}

/** Tượng toàn thân + lá nhân vật thật nghiêng cạnh tượng; Trọng Thủy là quạt 7 lá */
function Figure({ c }: { c: (typeof characters)[number] }) {
  const isTT = c.id === 'tt'
  return (
    <div className="cv-statue relative col-start-1 row-start-1 flex items-end justify-center">
      <img src={c.statue} alt={c.name} className="relative z-10 block h-[min(34svh,20rem)] w-auto md:h-[min(66svh,32rem)]" />
      {isTT ? (
        <div className="cv2-fan relative -ml-6 md:-ml-4" role="img" aria-label="Bảy thẻ Trọng Thủy">
          {trongThuyCards.map((t, i) => {
            const m = (trongThuyCards.length - 1) / 2
            return <img key={t.id} src={t.image} alt="" className="cv2-fan-card" loading="lazy"
              style={{ transform: `rotate(${(i - m) * 9}deg)`, zIndex: i }} />
          })}
        </div>
      ) : (
        <img src={c.card} alt={`Thẻ nhân vật ${c.name}`} loading="lazy"
          className="cv2-card relative z-20 -ml-10 mb-2 w-24 rounded-md shadow-[0_14px_30px_rgb(0_0_0/.6)] max-md:hidden md:w-40" style={{ rotate: c.side === 'red' ? '-7deg' : '7deg' }} />
      )}
    </div>
  )
}

/**
 * Ba nhân vật trong một khung ghim: cuộn để đổi người, có điểm dừng ở từng nhân vật.
 * Tượng cũ lùi sang trái, tượng mới bước vào từ phải; tên hiện từng chữ; nền đổi màu theo phe.
 */
export default function Characters() {
  const root = useRef<HTMLElement>(null)
  const st = useRef<ScrollTrigger | null>(null)
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const statues = gsap.utils.toArray<HTMLElement>('.cv-statue')
      const infos = gsap.utils.toArray<HTMLElement>('.cv-info')
      const washes = gsap.utils.toArray<HTMLElement>('.cv-wash')

      gsap.set(statues.slice(1), { xPercent: 40, autoAlpha: 0 })
      gsap.set(infos.slice(1), { autoAlpha: 0 })
      infos.slice(1).forEach((el) => {
        gsap.set(el.querySelectorAll('.ch'), { yPercent: 120 })
        gsap.set(el.querySelectorAll('.cv-rest'), { autoAlpha: 0, y: 24 })
      })
      gsap.set(washes.slice(1), { autoAlpha: 0 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${(n - 1) * window.innerHeight}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (n - 1), directional: false, inertia: false, delay: 0.1, duration: { min: 0.2, max: 0.5 }, ease: 'power2.inOut' },
          onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
        },
      })
      st.current = tl.scrollTrigger!

      for (let i = 1; i < n; i++) {
        const t = i - 1
        tl.to(statues[i - 1], { xPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, t)
          .to(statues[i], { xPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, t + 0.3)
          .to(washes[i - 1], { autoAlpha: 0, duration: 1 }, t)
          .to(washes[i], { autoAlpha: 1, duration: 1 }, t)
          .to(infos[i - 1].querySelectorAll('.ch'), { yPercent: -120, duration: 0.35, stagger: 0.012 }, t)
          .to(infos[i - 1].querySelectorAll('.cv-rest'), { autoAlpha: 0, y: -20, duration: 0.3 }, t)
          .set(infos[i - 1], { autoAlpha: 0 }, t + 0.5)
          .set(infos[i], { autoAlpha: 1 }, t + 0.5)
          .to(infos[i].querySelectorAll('.ch'), { yPercent: 0, duration: 0.4, stagger: 0.012 }, t + 0.5)
          .to(infos[i].querySelectorAll('.cv-rest'), { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.05 }, t + 0.6)
      }
    }, root)
    return () => { ctx.revert(); st.current = null }
  }, [reduced])

  // Tab: nhảy tới đúng điểm dừng của nhân vật trong đoạn ghim
  const go = (k: number) => {
    const t = st.current
    if (!t) return setActive(k)
    gsap.to(window, { scrollTo: t.start + (t.end - t.start) * (k / (n - 1)), duration: 0.8, ease: 'power2.inOut', overwrite: true })
  }

  const shown = reduced ? [characters[active]] : characters
  return (
    <section ref={root} id="nhan-vat" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden px-5 pt-24 md:px-10">
      <img src={img.exploreBg} alt="" className="fade-edges absolute inset-0 -z-20 h-full w-full object-cover object-[70%_50%]" loading="lazy" />
      {shown.map((c) => (
        <div key={c.id} className={`cv-wash fade-edges absolute inset-0 -z-10 bg-gradient-to-t ${sideStyle[c.side].wash} via-night/60 to-night/85`} />
      ))}
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-end gap-6 md:grid-cols-[1fr_1.1fr]">
        <div className="relative grid h-full min-h-[18rem] place-items-end justify-items-center max-md:order-2">
          <div className="moon absolute bottom-[18%] left-1/2 aspect-square w-[min(72%,24rem)] -translate-x-1/2 opacity-80" aria-hidden />
          {shown.map((c) => (
            <Figure key={c.id} c={c} />
          ))}
        </div>
        <div className="grid pb-2 md:pb-24">
          {shown.map((c, k) => <Info key={c.id} c={c} k={k} />)}
        </div>
      </div>
      <div role="tablist" aria-label="Chọn nhân vật" className="relative z-10 flex justify-center gap-2 pb-8 pt-6 md:gap-3">
        {characters.map((x, k) => (
          <button key={x.id} role="tab" aria-selected={k === active} onClick={() => go(k)}
            className={`frame whitespace-nowrap px-3 py-2 text-xs font-bold transition-colors md:px-5 md:text-sm ${k === active ? 'bg-gold text-night' : 'bg-night/70 text-gold hover:bg-night'}`}>
            {x.name}
          </button>
        ))}
      </div>
    </section>
  )
}
