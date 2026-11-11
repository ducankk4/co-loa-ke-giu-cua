import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Header from './components/Header'
import Rules from './components/Rules'
import Preorder from './components/Preorder'
import Characters from './components/Characters'
import BoxIntro from './components/BoxIntro'
import Faq from './components/Faq'
import { Hero, Intro, History, Components, FinalCta, Footer } from './components/Sections'
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
          scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: 0.6 },
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
        <BoxIntro />
        <Hero />
        <Intro />
        <History />
        <Characters />
        <Components />
        <Rules />
        <Faq />
        <Preorder />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
