import { useEffect, useState } from 'react'
import { nav } from '../data/content'
import { img } from '../data/assets'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 60)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid || open ? 'bg-night/90 backdrop-blur' : ''}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2 md:px-10">
        <a href="#top" aria-label="Về đầu trang" className={`transition-opacity ${solid ? 'opacity-100' : 'opacity-0'}`}>
          <img src={img.logo} alt="Cổ Loa: Kẻ Giữ Cửa" className="-my-5 h-20 w-20" width={80} height={80} />
        </a>
        <button className="px-2 py-3 text-sm font-bold text-gold md:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Đóng' : 'Menu'}
        </button>
        <nav className={`${open ? 'block' : 'hidden'} absolute inset-x-0 top-full bg-night/95 px-5 pb-6 md:static md:block md:bg-transparent md:p-0`}>
          <ul className="flex flex-col gap-4 text-sm text-mist md:flex-row md:items-center md:gap-8">
            {nav.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} onClick={() => setOpen(false)} className={`transition-colors hover:text-gold ${n.id === 'dat-truoc' ? 'frame px-5 py-2 text-gold' : ''}`}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
