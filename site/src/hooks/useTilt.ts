import { useEffect, type RefObject } from 'react'

/**
 * Lá bài nghiêng theo con trỏ: mọi phần tử `.tilt` trong `root`.
 * Chỉ ghi biến CSS (--rx, --ry), nên không đụng transform của GSAP hay của bố cục quạt bài.
 */
export function useTilt(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const host = root.current
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!host) return
    let active: HTMLElement | null = null

    const clear = () => {
      active?.style.removeProperty('--rx')
      active?.style.removeProperty('--ry')
      active?.removeAttribute('data-tilt')
      active = null
    }
    const move = (e: PointerEvent) => {
      if (!fine.matches || reduced.matches) return
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>('.tilt') : null
      if (el !== active) clear()
      if (!el) return
      active = el
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.dataset.tilt = 'on'
      el.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`)
    }
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', clear)
    window.addEventListener('scroll', clear, { passive: true })
    return () => {
      clear()
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', clear)
      window.removeEventListener('scroll', clear)
    }
  }, [root])
}
