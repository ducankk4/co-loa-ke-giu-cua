import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import './index.css'
import App from './App'
import { prefersReducedMotion } from './hooks/useReducedMotion'
import { PREORDER_URL } from './lib/links'

// Link cũ "/#dat-truoc" (đã chia sẻ trước đây): form đặt trước giờ ở trang riêng, chuyển thẳng sang đó
// (cả khi chỉ đổi hash trên trang đang mở, vd. dán link vào thanh địa chỉ)
const toPreorder = () => location.hash === '#dat-truoc' && (location.replace(PREORDER_URL), true)
if (!toPreorder()) startHome()
window.addEventListener('hashchange', toPreorder)

function startHome() {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
  createRoot(document.getElementById('root')!).render(<App />)
  // Ảnh lazy làm đổi chiều cao trang: tính lại vị trí các đoạn ghim mỗi khi có ảnh tải xong
  // (gộp nhiều ảnh trong 200ms thành một lần refresh). Sự kiện load của ảnh không nổi bọt nên bắt ở pha capture.
  let refreshTimer = 0
  document.addEventListener('load', (e) => {
    if (!(e.target instanceof HTMLImageElement)) return
    clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200)
  }, true)
  window.addEventListener('load', () => {
    ScrollTrigger.refresh()
    // Mở từ trang khác với "#id" (vd. menu của trang đặt trước): tới đúng mục sau khi các đoạn ghim đã dựng xong
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null
    if (target) window.scrollTo(0, topOf(target))
  })

  // Liên kết "#id": cuộn mượt bằng GSAP (không đánh nhau với snap). Mục nằm trong đoạn ghim thì tới đầu đoạn ghim.
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null
    const id = a?.getAttribute('href')!.slice(1)
    // "#dat-truoc" còn sót (vd. menu ở footer): mở trang đặt trước như link thường, không cuộn
    if (id === 'dat-truoc') { e.preventDefault(); location.href = PREORDER_URL; return }
    const target = id ? document.getElementById(id) : null
    if (!target) return
    e.preventDefault()
    const top = topOf(target)
    if (prefersReducedMotion()) window.scrollTo(0, top)
    else gsap.to(window, { scrollTo: top, duration: 1, ease: 'power2.inOut', overwrite: true })
    history.replaceState(null, '', `#${id}`)
  })
}

/** Vị trí cuộn tới một mục; trừ scroll-margin-top của đích (vd. scroll-mt-28) để header cố định không che */
function topOf(target: HTMLElement) {
  return (target.closest('.pin-spacer') ?? target).getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0)
}
