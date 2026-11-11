// Lá bài, mặt hộp, bản đồ, tờ hướng dẫn cho hộp game 3D.
// Ảnh sinh từ PDF gốc (_source/web-pdf/) bằng scripts/convert-pdfs.py + convert-pdfs-webp.mjs.
// `text` = chữ in trên lá, gõ lại nguyên văn (kể cả câu bị cắt dở trên lá Mật chiếu).

import boxTop from '../assets/game/box/top.webp'
import boxBottom from '../assets/game/box/bottom.webp'
// Bản 3000px của nắp/đáy: chỉ tải khi người dùng phóng to hộp (tạo từ PDF gốc ở 4200px, q80)
import boxTopHd from '../assets/game/box/top-hd.webp'
import boxBottomHd from '../assets/game/box/bottom-hd.webp'
import boxSideLong from '../assets/game/box/side-long.webp'
import boxSideShort from '../assets/game/box/side-short.webp'
import cardAdv from '../assets/game/characters/an-duong-vuong.webp'
import cardTrieuDa from '../assets/game/characters/trieu-da.webp'
import guideFront from '../assets/game/guide/front.webp'
import guideBack from '../assets/game/guide/back.webp'
// Bản 4000px cho chế độ phóng to trong hộp (chỉ tải khi mở tờ hướng dẫn); tạo từ PDF gốc ở 4400px rồi nén q72
import guideFrontHd from '../assets/game/guide/front-hd.webp'
import map from '../assets/game/map/map.webp'
import tokenDo from '../assets/game/tokens/do.webp'
import tokenXanh from '../assets/game/tokens/xanh.webp'
import tokenNo from '../assets/game/tokens/no.webp'

export type Card = { id: string; name: string; image: string; text: string }
export type CardGroup = {
  id: 'trieu-da' | 'an-duong-vuong' | 'mat-chieu'
  name: string
  side: 'red' | 'blue' | 'secret'
  cover: string
  cards: Card[]
}

const pick = (files: Record<string, string>, dir: string, name: string) => {
  const url = files[`../assets/game/${dir}/${name}.webp`]
  if (!url) throw new Error(`Thiếu ảnh game/${dir}/${name}.webp`)
  return url
}
const trongThuyImgs = import.meta.glob<string>('../assets/game/characters/trong-thuy-*.webp', { eager: true, import: 'default' })
const blueImgs = import.meta.glob<string>('../assets/game/soldiers-blue/*.webp', { eager: true, import: 'default' })
const redImgs = import.meta.glob<string>('../assets/game/soldiers-red/*.webp', { eager: true, import: 'default' })
const secretImgs = import.meta.glob<string>('../assets/game/secret/*.webp', { eager: true, import: 'default' })

const STRENGTHS = [1, 2, 4, 5, 6, 8] as const

// 7 lá Trọng Thủy: dòng phụ "Gián điệp" + kỹ năng (đọc từ ảnh, chữ outline).
const trongThuy: { name: string; skill: string }[] = [
  { name: 'Trọng Thủy (giảm nửa sức mạnh)', skill: 'Sau khi lật thẻ, chọn một cửa, sức mạnh của ADV tại cửa đó giảm còn một nửa.' },
  { name: 'Trọng Thủy (vô hiệu hóa)', skill: 'Sau khi lật thẻ, chọn một cửa. Thẻ có số cao nhất của ADV tại cửa đó bị vô hiệu hóa.' },
  { name: 'Trọng Thủy (xem trộm)', skill: 'Trước khi TĐ đặt cược, bí mật xem 3 thẻ số của ADV tại một cửa, sau đó úp lại chỗ cũ.' },
  { name: 'Trọng Thủy (đổi vị trí)', skill: 'Sau khi lật thẻ, TĐ được đổi vị trí 2 thẻ số đã cược bất kỳ của 2 cửa trước khi tính kết quả.' },
  { name: 'Trọng Thủy (giữ quân khi thắng)', skill: 'Trước khi lật thẻ, chọn một cửa. Nếu TĐ thắng, giữ lại toàn bộ số quân đã cược.' },
  { name: 'Trọng Thủy (giữ quân khi thua)', skill: 'Trước khi lật thẻ, chọn một cửa. Nếu TĐ thua, giữ lại 1/4 số quân đã cược tại cửa đó.' },
  { name: 'Trọng Thủy (cắt quân ADV)', skill: 'Trước khi lật thẻ, chọn một cửa. Nếu ADV thắng, chỉ giữ lại 1/4 số quân đã cược tại cửa đó.' },
]

const soldiers = (side: 'blue' | 'red'): Card[] => {
  const army = side === 'blue' ? 'Quân An Dương Vương' : 'Quân Triệu Đà'
  return STRENGTHS.map((n) => ({
    id: `${side === 'blue' ? 'quan-adv' : 'quan-td'}-${n}`,
    name: `${army} ${n}`,
    image: pick(side === 'blue' ? blueImgs : redImgs, side === 'blue' ? 'soldiers-blue' : 'soldiers-red', String(n)),
    text: `${army}, sức mạnh ${n}.`,
  }))
}

const GATES = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C'] as const
const secretCards: Card[] = GATES.map((g) => ({
  id: `mat-chieu-${g.toLowerCase()}`,
  name: `Mật chiếu cửa ${g}`,
  image: pick(secretImgs, 'secret', g.toLowerCase()),
  text:
    'Mật chiếu · Sứ mệnh của Trọng Thủy\n' +
    `Phụng mật lệnh của Triệu Đà, Trọng Thủy phải âm thầm trợ quân ta đoạt thắng tại cửa ${g} trước khi kết thúc vòng 3.\n` +
    'Nếu thất bại, quân ta sẽ\n' +
    'Ấn chứng\n' +
    `Cuối vòng 3, căn cứ cờ thắng tại cửa ${g} để xác`,
}))

export const cardGroups: CardGroup[] = [
  {
    id: 'trieu-da',
    name: 'Triệu Đà',
    side: 'red',
    cover: cardTrieuDa,
    cards: [
      { id: 'trieu-da', name: 'Triệu Đà', image: cardTrieuDa, text: 'Tấn công và chiếm thành Cổ Loa' },
      ...trongThuy.map((t, i) => ({
        id: `trong-thuy-${i + 1}`,
        name: t.name,
        image: pick(trongThuyImgs, 'characters', `trong-thuy-${i + 1}`),
        text: `Gián điệp\n${t.skill}`,
      })),
      ...soldiers('red'),
    ],
  },
  {
    id: 'an-duong-vuong',
    name: 'An Dương Vương',
    side: 'blue',
    cover: cardAdv,
    cards: [
      { id: 'an-duong-vuong', name: 'An Dương Vương', image: cardAdv, text: 'Bảo vệ Thành Cổ Loa' },
      ...soldiers('blue'),
    ],
  },
  {
    id: 'mat-chieu',
    name: 'Mật chiếu',
    side: 'secret',
    cover: secretCards[0].image,
    cards: secretCards,
  },
]

export const guidePages: { front: string; frontHd: string; back: string } = { front: guideFront, frontHd: guideFrontHd, back: guideBack }

// Tỉ lệ rộng/cao sau khi cắt: top 1.500, bottom 1.500, sideLong 3.30, sideShort 2.20 (đã xoay ngang).
export const boxFaces: { top: string; bottom: string; topHd: string; bottomHd: string; sideLong: string; sideShort: string } = {
  top: boxTop,
  bottom: boxBottom,
  topHd: boxTopHd,
  bottomHd: boxBottomHd,
  sideLong: boxSideLong,
  sideShort: boxSideShort,
}

export const mapImage: string = map

// Để dành, chưa dùng (không đưa token vào hộp).
export const tokens: { do: string; xanh: string; no: string } = { do: tokenDo, xanh: tokenXanh, no: tokenNo }
