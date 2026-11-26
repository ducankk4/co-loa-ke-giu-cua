import { useEffect, useState } from 'react'
import { nav } from '../data/content'
import { img } from '../data/assets'
import { PREORDER_URL, homeHref } from '../lib/links'

/** Mục đang xem: mục cuối cùng có mép trên đã qua 40% màn hình. Mục nằm trong đoạn ghim thì tính theo khung ghim. */
function currentSection() {
  const line = window.innerHeight * 0.4
  let cur: string | null = null
  for (const n of nav) {
    const el = document.getElementById(n.id)
    if (!el) continue
    if ((el.closest('.pin-spacer') ?? el).getBoundingClientRect().top <= line) cur = n.id
  }
  return cur
}

/**
 * page = 'home': link "#id" cuộn mượt trong trang (main.tsx xử lý).
 * page = 'preorder': trang đặt trước riêng, link các mục trỏ về trang chủ, logo luôn hiện và về trang chủ.
 * Mục "Đặt trước" luôn mở trang đặt trước (điều hướng bình thường, không cuộn).
 */
export default function Header({ page = 'home' }: { page?: 'home' | 'preorder' }) {
  const home = page === 'home'
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(!home)
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setSolid(!home || window.scrollY > 60)
        setActive(currentSection())
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [home])
  const hrefOf = (id: string) => (id === 'dat-truoc' ? PREORDER_URL : home ? `#${id}` : homeHref(id))
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid || open ? 'bg-night/90 backdrop-blur' : ''}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2 md:px-10">
        <div className="flex items-center gap-2 md:gap-4">
          <a href={home ? '#top' : homeHref()} aria-label={home ? 'Về đầu trang' : 'Về trang chủ'}
            className={`shrink-0 transition-[opacity,scale] duration-300 hover:scale-105 ${solid ? 'opacity-100' : 'opacity-0'}`}>
            <img src={img.logo} alt="Cổ Loa: Kẻ Giữ Cửa" className="-my-5 h-20 w-20" width={80} height={80} />
          </a>
          {!home && (
            <a href={homeHref()} className="link-u whitespace-nowrap text-sm text-gold hover:text-white">← Quay lại trang chủ</a>
          )}
        </div>
        <button className="nav-menu px-2 py-3 text-sm font-bold text-gold md:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Đóng' : 'Menu'}
        </button>
        <nav className={`${open ? 'block' : 'hidden'} absolute inset-x-0 top-full bg-night/95 px-5 pb-6 md:static md:block md:bg-transparent md:p-0`}>
          <ul className="flex flex-col items-start gap-4 text-sm text-mist md:flex-row md:items-center md:gap-8">
            {nav.map((n) => {
              const on = n.id === active
              const cta = n.id === 'dat-truoc'
              return (
                <li key={n.id}>
                  <a href={hrefOf(n.id)} onClick={() => setOpen(false)}
                    aria-current={on ? (cta && !home ? 'page' : 'location') : undefined}
                    className={`nav-link px-4 py-2 ${cta ? 'nav-cta' : ''}`}>
                    {n.label}
                    {/* Gạch chân: hiện đầy khi đang ở mục này, hiện một phần khi rê chuột */}
                    <span className="nav-bar" aria-hidden />
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
