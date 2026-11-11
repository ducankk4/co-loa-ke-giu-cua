import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import './index.css'
import App from './App'
import { prefersReducedMotion } from './hooks/useReducedMotion'

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
window.addEventListener('load', () => ScrollTrigger.refresh())

// Liên kết "#id": cuộn mượt bằng GSAP (không đánh nhau với snap). Mục nằm trong đoạn ghim thì tới đầu đoạn ghim.
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null
  const id = a?.getAttribute('href')!.slice(1)
  const target = id ? document.getElementById(id) : null
  if (!target) return
  e.preventDefault()
  const top = (target.closest('.pin-spacer') ?? target).getBoundingClientRect().top + scrollY
  if (prefersReducedMotion()) window.scrollTo(0, top)
  else gsap.to(window, { scrollTo: top, duration: 1, ease: 'power2.inOut', overwrite: true })
  history.replaceState(null, '', `#${id}`)
})
