import { createRoot } from 'react-dom/client'
import './index.css'
import PreorderPage from './PreorderPage'
import { homeHref } from './lib/links'

createRoot(document.getElementById('root')!).render(<PreorderPage />)

// Trang này không có các mục của trang chủ: liên kết "#id" (vd. menu ở footer) mà không có đích
// trên trang thì mở trang chủ tại mục đó. "#top" và đích có sẵn trên trang thì để trình duyệt tự xử lý.
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null
  const id = a?.getAttribute('href')!.slice(1)
  if (!id || id === 'top' || document.getElementById(id)) return
  e.preventDefault()
  location.href = homeHref(id)
})
