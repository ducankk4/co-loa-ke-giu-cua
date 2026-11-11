import { useId, useRef, useState } from 'react'
import { faqGroups } from '../data/gameInfo'
import { img } from '../data/assets'
import { Scene } from './ui'

const faqIntro = 'Những câu hỏi thường gặp khi chơi Cổ Loa: Kẻ Giữ Cửa.'

/** Dòng "Đoán đúng: ..." / "Đoán sai: ..." tô nhẹ xanh/đỏ cho dễ đọc */
const tone = (line: string) => (line.startsWith('Đoán đúng') ? 'fq-ok' : line.startsWith('Đoán sai') ? 'fq-bad' : '')

export default function Faq() {
  const uid = useId()
  const [active, setActive] = useState(0)
  // câu đang mở theo từng nhóm; mặc định câu đầu mở sẵn
  const [open, setOpen] = useState<Record<string, boolean>>({ '0-0': true })
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const group = faqGroups[active]

  // Mẫu tablist: mũi tên (trái/phải/lên/xuống), Home, End
  function onKey(e: React.KeyboardEvent, i: number) {
    const n = faqGroups.length
    const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const j = (next + n) % n
    setActive(j)
    tabs.current[j]?.focus()
  }

  return (
    <Scene id="tra-cuu" bg={img.rulesBg} overlay="from-night/90 via-night/85 to-night/90">
      <h2 className="h2 mb-4">Tra cứu nhanh</h2>
      <p className="body mb-12">{faqIntro}</p>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] md:gap-12">
        <div role="tablist" aria-label="Nhóm câu hỏi" aria-orientation="vertical" className="fq-tabs">
          {faqGroups.map((g, i) => (
            <button
              key={g.title} ref={(el) => { tabs.current[i] = el }}
              role="tab" type="button" id={`${uid}-tab-${i}`} aria-selected={i === active} aria-controls={`${uid}-panel`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
              className={`fq-tab font-ui ${i === active ? 'frame fq-tab-on' : ''}`}
            >
              {g.title}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`} className="frame bg-night/70 px-5 py-2 md:px-8">
          {group.items.map((it, j) => {
            const k = `${active}-${j}`
            const isOpen = !!open[k]
            const lines = Array.isArray(it.a) ? it.a : null
            return (
              <div key={k} className="fq-item">
                <h3>
                  <button
                    type="button" aria-expanded={isOpen} aria-controls={`${uid}-a-${k}`}
                    onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}
                    className="fq-q font-ui"
                  >
                    <span>{it.q}</span>
                    <svg viewBox="0 0 24 24" className="fq-chev" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </h3>
                <div id={`${uid}-a-${k}`} role="region" className="fq-a" data-open={isOpen} inert={!isOpen}>
                  <div>
                    {lines ? (
                      <ul className="fq-list">
                        {lines.map((l) => <li key={l} className={tone(l)}>{l}</li>)}
                      </ul>
                    ) : (
                      <p>{it.a}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Scene>
  )
}
