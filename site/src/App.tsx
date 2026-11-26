import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Header from './components/Header'
import Rules from './components/Rules'
import Characters from './components/Characters'
import Faq from './components/Faq'
import { Hero, Intro, History, Components, FinalCta } from './components/Sections'
import Footer from './components/Footer'
import { useReducedMotion } from './hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Chuyển cảnh giữa các section, gắn theo nhịp cuộn (scrub):
 * - .scene-bg: tranh nền trôi chậm hơn chữ
 * - .scene-in: nội dung nổi lên khi section đi vào
 * - .scene-out: nội dung lùi và mờ khi section rời đi
 * Đặt ở App vì layout effect của App chạy sau mọi section, nên các trigger này được tạo
 * sau các đoạn ghim và tính đúng vị trí.
 */
function useSceneTransitions() {
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.scene-bg').forEach((el) => {
        gsap.fromTo(el, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
      gsap.utils.toArray<HTMLElement>('.scene-in').forEach((el) => {
        gsap.fromTo(el, { y: 90, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, ease: 'power1.out',
          // Hiện đủ sớm (khi đỉnh nội dung tới 75% màn hình) để không phải cuộn qua trang sau mới thấy hết
          scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 75%', scrub: 0.6 },
        })
      })
      gsap.utils.toArray<HTMLElement>('.scene-out').forEach((el) => {
        gsap.to(el, {
          y: -70, autoAlpha: 0.15, ease: 'power1.in',
          scrollTrigger: { trigger: el, start: 'bottom 20%', end: 'bottom top', scrub: 0.6 },
        })
      })
    })
    return () => ctx.revert()
  }, [reduced])
}

export default function App() {
  useSceneTransitions()
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Intro />
        <History />
        <Characters />
        <Components />
        <Rules />
        <Faq />
        {/* Form đặt trước nằm ở trang riêng dat-truoc.html; FinalCta là khối kêu gọi ngắn dẫn sang đó */}
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
