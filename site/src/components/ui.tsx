import type { CSSProperties, ReactNode } from 'react'
import { meta } from '../data/content'

type BtnProps = { href: string; children: ReactNode; solid?: boolean; className?: string }

export function GoldButton({ href, children, solid = false, className = '' }: BtnProps) {
  return (
    <a href={href} className={`btn ${solid ? 'btn-solid' : 'btn-ghost frame font-ui'} ${className}`}>
      {children}
    </a>
  )
}

const icons = {
  players: <path d="M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 14.3c.6-.2 1.3-.3 2-.3 3.3 0 6 2.7 6 6" />,
  time: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-14v5l3.5 2" />,
  age: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM8 15v-5l-1.5 1M11 15h3M14 10v5" />,
}

/** Dải thông tin 6 người chơi / 45–60 phút / 12+ */
export function MetaBar({ className = '' }: { className?: string }) {
  const items = [
    { k: 'players', text: meta.players },
    { k: 'time', text: meta.time },
    { k: 'age', text: meta.age },
  ] as const
  return (
    <ul className={`flex flex-wrap items-center gap-x-6 gap-y-3 text-sm md:gap-x-0 text-gold ${className}`}>
      {items.map((i) => (
        <li key={i.k} className="flex items-center gap-2 border-gold/30 md:px-5 md:first:pl-0 md:[&:not(:first-child)]:border-l">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {icons[i.k]}
          </svg>
          {i.text}
        </li>
      ))}
    </ul>
  )
}

/**
 * Tranh nền của một section: mép trên/dưới tan vào màu đêm.
 * parallax = true: ảnh cao hơn khung để App trôi nó chậm hơn chữ (class .scene-bg). Đoạn ghim thì để false.
 */
export function Backdrop({ bg, pos = 'center', overlay, parallax = true }: { bg: string; pos?: string; overlay: string; parallax?: boolean }) {
  return (
    <>
      <div className="fade-edges absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        <img src={bg} alt="" loading="lazy" style={{ objectPosition: pos }}
          className={`absolute inset-x-0 w-full object-cover ${parallax ? 'scene-bg -top-[8%] h-[116%]' : 'top-0 h-full'}`} />
      </div>
      <div className={`absolute inset-0 -z-10 bg-gradient-to-r ${overlay}`} />
    </>
  )
}

/** Section có tranh nền; nội dung bọc .scene-out (lùi khi rời) > .scene-in (nổi lên khi vào) */
export function Scene({
  id, bg, children, className = '', pos = 'center', overlay = 'from-night/85 via-night/50 to-transparent', style,
}: {
  id?: string; bg: string; children: ReactNode; className?: string; pos?: string; overlay?: string; style?: CSSProperties
}) {
  return (
    <section id={id} style={style} className={`relative isolate overflow-hidden px-5 py-28 md:px-10 ${className}`}>
      <Backdrop bg={bg} pos={pos} overlay={overlay} />
      <div className="scene-out mx-auto max-w-6xl"><div className="scene-in">{children}</div></div>
    </section>
  )
}
