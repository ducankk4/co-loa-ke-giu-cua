import type { CSSProperties } from 'react'
import { cardGroups, guidePages, pawns, tokens, type CardGroup } from '../data/cards'
import { boxText } from '../data/boxText'
import { img } from '../data/assets'

/*
 * Lòng hộp khi mở: vẽ lại bố cục khay thật (theo ảnh chụp team gửi, KHÔNG dùng ảnh chụp):
 * bên trái là tấm lót nổi có 2 hộp bài (đỏ nâu = phe Triệu Đà, xanh = phe An Dương Vương) và ngăn token tròn;
 * bên phải là ngăn sâu chứa quân nhựa (Token lính), quyển hướng dẫn và xấp Mật chiếu.
 * Mọi kích thước theo % khay (container query: cqw/cqh). Mỗi món là một nút .bx-stack.
 */

export type TrayPick = CardGroup | 'guide' | 'tokens' | 'pawns'

/** Bìa tờ hướng dẫn khi gấp: chỉ là khung bìa ở mép phải ảnh mặt sau (ảnh 2000×600, bìa ~383px) */
export const coverStyle = (src: string): CSSProperties => ({ backgroundImage: `url(${src})`, backgroundSize: '522% 100%', backgroundPosition: '99.7% 0' })

const group = (id: CardGroup['id']) => cardGroups.find((g) => g.id === id)!

/** Quân nhựa rải trong ngăn phải: vị trí giả ngẫu nhiên cố định (cùng kết quả mỗi lần dựng) */
const PAWNS = (() => {
  let s = 7
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  return Array.from({ length: 64 }, (_, i) => ({ x: 8 + r() * 84, y: 3 + r() * 92, a: r() * 360, red: i % 2 === 0 })) // % của cột quân
})()

/** Đĩa trong ngăn token (ảnh, x%, y%, góc): chồng lệch nhau như ảnh chụp; đĩa nỏ nằm dưới */
const COINS: [string, number, number, number][] = [
  [tokens.no, 70, 6, 0], [tokens.xanh, 52, 8, 20], [tokens.do, 76, 22, 0], [tokens.xanh, 3, 14, -30],
  [tokens.xanh, 22, 4, 10], [tokens.do, 40, 12, 0],
]

/** Khung vàng hai nét + góc bậc thang như nắp hộp bài thật */
function DeckFrame() {
  const corner = 'M7 20V12h5V7h8M10 24V15h5v-5h9'
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="bx-deck-frame" aria-hidden>
      <rect x="4" y="4" width="92" height="142" />
      <rect x="7" y="7" width="86" height="136" />
      {['', 'translate(100 0) scale(-1 1)', 'translate(0 150) scale(1 -1)', 'translate(100 150) scale(-1 -1)'].map((t) => (
        <path key={t} d={corner} transform={t || undefined} />
      ))}
    </svg>
  )
}

function Tag({ children }: { children: string }) {
  return <span className="bx-label">{children}</span>
}

/**
 * Thân hộp bài kiểu tuck box (hộp thẻ thật): cọc thẻ úp bên trong, mặt hộp có logo, nắp gập có lưỡi gài, 2 tai, ánh vàng.
 * Trong khay luôn đóng; hiệu ứng mở (nắp lật, tai bung, cọc thẻ trượt ra) chạy ở DeckFocus (BoxIntro) khi hộp được đưa ra giữa.
 */
export function DeckBody({ tone }: { tone: 'red' | 'blue' }) {
  return (
    <span className={`bx-deck bx-deck-${tone}`}>
      {/* Cọc thẻ úp nằm trong hộp (bị mặt hộp che), trượt ra khi mở */}
      <span className="bx-deck-stack" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <img key={i} src={img.cardBack} alt="" draggable={false} style={{ translate: `${(i - 3) * 0.6}px ${(i - 3) * -0.9}px` }} />
        ))}
      </span>
      <span className="bx-deck-light" aria-hidden />
      <span className="bx-ear bx-ear-l" aria-hidden />
      <span className="bx-ear bx-ear-r" aria-hidden />
      <span className="bx-deck-face">
        <DeckFrame />
        <img src={img.logo} alt="" draggable={false} className="bx-deck-logo" />
      </span>
      {/* Nắp gập: mặt ngoài cùng màu hộp + lưỡi gài cong, mặt trong là bìa giấy */}
      <span className="bx-tuck" aria-hidden>
        <span className="bx-tuck-out" />
        <span className="bx-tuck-in" />
      </span>
    </span>
  )
}

export const deckTone = (g: CardGroup): 'red' | 'blue' => (g.side === 'red' ? 'red' : 'blue')

/** Hộp bài trong khay: bấm một lần là hộp bay ra giữa màn hình, tự mở và xòe lá (DeckFocus). away = đang được đưa ra ngoài */
function Deck({ g, cls, away, onPick }: { g: CardGroup; cls: string; away: boolean; onPick: (g: CardGroup) => void }) {
  return (
    <button type="button" data-stack={g.id} className={`bx-stack ${cls} invisible ${away ? 'bx-away' : ''}`} onClick={() => onPick(g)}
      aria-label={`${g.name}, ${g.cards.length} ${boxText.cardsUnit}. ${boxText.deckOpen}`}>
      <span className="bx-glow" />
      <DeckBody tone={deckTone(g)} />
      <Tag>{boxText.stackLabel[g.id] ?? g.name}</Tag>
    </button>
  )
}

/** inert: bản đồ đang phủ lên khay thì các món bên dưới không nhận focus/bấm; focused: hộp bài đang được đưa ra giữa (ẩn khỏi khay) */
export default function BoxTray({ inert, focused, onPick }: { inert?: boolean; focused?: string; onPick: (p: TrayPick) => void }) {
  const td = group('trieu-da'), adv = group('an-duong-vuong'), mc = group('mat-chieu')

  return (
    <div className="bx-tray" inert={inert}>
      <div className="bx-tray-insert" aria-hidden />
      {/* Ô khoét trên tấm lót: chỗ đặt 2 hộp bài và token */}
      <span className="bx-cut bx-t-td" aria-hidden />
      <span className="bx-cut bx-t-adv" aria-hidden />
      <span className="bx-cut bx-t-tokens" aria-hidden />
      <div className="bx-tray-well" aria-hidden />

      {/* Quân nhựa: dồn ở cột phải của ngăn sâu, chừa chỗ rộng cho Mật chiếu và tờ hướng dẫn */}
      <button type="button" data-stack="pawns" className="bx-stack bx-t-pawns invisible" onClick={() => onPick('pawns')}
        aria-label={`${boxText.pawnsName}. Bấm để xem`}>
        {PAWNS.map((p, i) => (
          <img key={i} src={p.red ? pawns.do : pawns.xanh} alt="" draggable={false} className="bx-pawn"
            style={{ left: `${p.x}%`, top: `${p.y}%`, rotate: `${p.a}deg` }} />
        ))}
        <Tag>{boxText.pawnsLabel}</Tag>
      </button>

      <Deck g={td} cls="bx-t-td" away={focused === td.id} onPick={onPick} />
      <Deck g={adv} cls="bx-t-adv" away={focused === adv.id} onPick={onPick} />

      <button type="button" data-stack="tokens" className="bx-stack bx-t-tokens invisible" onClick={() => onPick('tokens')}
        aria-label={`${boxText.tokensName}. Bấm để xem`}>
        <span className="bx-glow" />
        <span className="bx-coin-well">
          {COINS.map(([src, x, y, a], i) => (
            <img key={i} src={src} alt="" width={400} height={400} draggable={false} className="bx-coin"
              style={{ left: `${x}%`, top: `${y}%`, rotate: `${a}deg` }} />
          ))}
        </span>
        <Tag>{boxText.tokensLabel}</Tag>
      </button>

      <button type="button" data-stack="guide" className="bx-stack bx-t-guide invisible" onClick={() => onPick('guide')}
        aria-label={`${boxText.guideName}. Bấm để mở tờ gấp`}>
        <span className="bx-glow" />
        <span role="img" aria-label={boxText.guideCoverAlt} className="bx-booklet" style={coverStyle(guidePages.back)} />
        <Tag>{boxText.guideName}</Tag>
      </button>

      <button type="button" data-stack={mc.id} className="bx-stack bx-t-mc invisible" onClick={() => onPick(mc)}
        aria-label={`${mc.name}, ${mc.cards.length} ${boxText.cardsUnit}. Bấm để xem từng lá`}>
        <span className="bx-glow" />
        <span className="bx-mc-pile">
          {[0, 1, 2].map((i) => (
            <img key={i} src={mc.cover} alt="" width={600} height={927} draggable={false} className="bx-layer"
              style={{ transform: `translate(${(i - 2) * 1.4}px, ${(i - 2) * 1.8}px)` }} />
          ))}
        </span>
        <Tag>{boxText.stackLabel[mc.id] ?? mc.name}</Tag>
      </button>
    </div>
  )
}
