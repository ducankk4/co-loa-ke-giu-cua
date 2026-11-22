import type { CSSProperties } from 'react'
import { cardGroups, guidePages, pawns, tokens, type CardGroup } from '../data/cards'
import { boxText } from '../data/boxText'
import { img } from '../data/assets'

/*
 * Lòng hộp khi mở: vẽ lại bố cục khay thật (theo ảnh chụp team gửi, KHÔNG dùng ảnh chụp):
 * bên trái là tấm lót nổi có 2 hộp bài (đỏ nâu = phe Triệu Đà, xanh = phe An Dương Vương) và ngăn token tròn;
 * bên phải là ngăn sâu chứa quân nhựa (Token lính) và quyển hướng dẫn. Mật chiếu nằm trong hộp bài phe Triệu Đà, Trọng Thủy trong hộp bài phe An Dương Vương.
 * Mọi kích thước theo % khay (container query: cqw/cqh). Mỗi món là một nút .bx-stack.
 */

export type TrayPick = CardGroup | 'guide' | 'tokens' | 'pawns'

/** Bìa tờ hướng dẫn khi gấp: chỉ là khung bìa ở mép phải ảnh mặt sau (ảnh 2000×600, bìa ~383px) */
export const coverStyle = (src: string): CSSProperties => ({ backgroundImage: `url(${src})`, backgroundSize: '522% 100%', backgroundPosition: '99.7% 0' })

const group = (id: CardGroup['id']) => cardGroups.find((g) => g.id === id)!

/**
 * Quân nhựa rải đều khắp ngăn sâu bên phải: lưới 11×10 lệch ngẫu nhiên cố định (cùng kết quả mỗi lần dựng), bỏ các ô
 * nằm hoàn toàn dưới quyển hướng dẫn. Tọa độ là % của cả ngăn (nút .bx-t-pawns phủ trọn ngăn).
 */
const PAWNS = (() => {
  let s = 7
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const COLS = 11, ROWS = 10, out: { x: number; y: number; a: number; red: boolean }[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = ((col + 0.5 + (r() - 0.5) * 0.7) / COLS) * 92 + 4
      const y = ((row + 0.5 + (r() - 0.5) * 0.7) / ROWS) * 90 + 5
      if (x > 24 && x < 76 && y > 20 && y < 80) continue // lõi nằm dưới quyển hướng dẫn (đặt giữa ngăn)
      out.push({ x, y, a: r() * 360, red: (row + col) % 2 === 0 })
    }
  }
  return out
})()
/**
 * Đĩa trong ngăn token (ảnh, x%, y%, góc), xếp như năm vòng Olympic: hàng trên 3 đĩa (xanh, nỏ, đỏ),
 * hàng dưới 2 đĩa nằm lọt giữa (đỏ, xanh), các đĩa hơi chồng nhau. Đĩa rộng 26% ngăn (cao ~56%).
 * Số lượng 5 đĩa (2 xanh, 2 đỏ, 1 nỏ) chỉ để minh họa, không phải số lượng thật.
 */
const COINS: [string, number, number, number][] = [
  [tokens.xanh, 5.8, 6.5, -4], [tokens.no, 37, 6.5, 3], [tokens.do, 68.2, 6.5, -3],
  [tokens.do, 21.4, 37.5, 4], [tokens.xanh, 52.6, 37.5, -4],
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

/** Thân hộp bài: chỉ có mặt hộp (khung vàng + logo), không có nắp; thấy trọn thiết kế của hộp. */
export function DeckBody({ tone }: { tone: 'red' | 'blue' }) {
  return (
    <span className={`bx-deck bx-deck-${tone}`}>
      <span className="bx-deck-face">
        <DeckFrame />
        <img src={img.logo} alt="" draggable={false} className="bx-deck-logo" />
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
    </button>
  )
}

/** inert: bản đồ đang phủ lên khay thì các món bên dưới không nhận focus/bấm; focused: hộp bài đang được đưa ra giữa (ẩn khỏi khay) */
export default function BoxTray({ inert, focused, onPick }: { inert?: boolean; focused?: string; onPick: (p: TrayPick) => void }) {
  const td = group('trieu-da'), adv = group('an-duong-vuong')

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
      </button>

      <button type="button" data-stack="guide" className="bx-stack bx-t-guide invisible" onClick={() => onPick('guide')}
        aria-label={`${boxText.guideName}. Bấm để mở tờ gấp`}>
        <span className="bx-glow" />
        <span role="img" aria-label={boxText.guideCoverAlt} className="bx-booklet" style={coverStyle(guidePages.back)} />
      </button>
    </div>
  )
}
