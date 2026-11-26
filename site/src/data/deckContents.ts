// Số lá trong từng hộp bài (anh Adz chốt 2026-11-26). Một nguồn duy nhất cho khối mô tả trong hộp 3D (DeckFocus);
// FAQ / luật chơi muốn ghi số lá thì lấy từ đây. Khóa = id nhóm bài trong cards.ts (cardGroups).
// Quạt bài vẫn chỉ hiện mỗi mặt lá một lần; số lượng thật chỉ hiển thị ở khối mô tả.
import type { CardGroup } from './cards'

export type DeckLine = {
  name: string
  /** Số lượng hiển thị (chữ vàng đậm), vd. "9 lá mỗi loại" */
  qty: string
  /** Tổng số lá của dòng (dùng cộng tổng; hiện kèm trong ngoặc nếu khác qty) */
  count: number
  body: string
}
export type DeckContent = { title: string; lines: DeckLine[]; total: number }

// TODO(copy): câu mô tả từng dòng lấy lại từ trang Thành phần cũ (gameInfo.parts) và phần Vai trò; team duyệt lại.
const lines: Record<CardGroup['id'], { title: string; lines: DeckLine[] }> = {
  'an-duong-vuong': {
    title: 'Hộp xanh – phe An Dương Vương',
    lines: [
      { name: 'Thẻ nhân vật An Dương Vương', qty: '2 lá', count: 2, body: 'Cho biết bạn giữ vai An Dương Vương, người giữ thành.' },
      { name: 'Thẻ nhân vật Trọng Thủy', qty: '7 lá', count: 7, body: 'Gián điệp cài trong phe An Dương Vương. Mỗi lá một quyền năng.' },
      { name: 'Thẻ lính xanh 1, 2, 4, 5', qty: '9 lá mỗi loại', count: 36, body: 'Mỗi thành viên đặt 1 thẻ lính vào cửa đã chọn; số trên lá là sức mạnh khi so quân.' },
      { name: 'Thẻ lính xanh 6, 8', qty: '6 lá mỗi loại', count: 12, body: 'Thẻ lính sức mạnh cao, ít lá hơn.' },
    ],
  },
  'trieu-da': {
    title: 'Hộp đỏ – phe Triệu Đà',
    lines: [
      { name: 'Thẻ nhân vật Triệu Đà', qty: '3 lá', count: 3, body: 'Cho biết bạn giữ vai Triệu Đà, người tấn công.' },
      { name: 'Mật chiếu (thẻ nhiệm vụ)', qty: '11 lá', count: 11, body: 'Bên Triệu Đà bốc 1 lá nhiệm vụ ở đầu ván để giao cho Trọng Thủy thực hiện.' },
      { name: 'Thẻ lính đỏ 1, 2', qty: '12 lá mỗi loại', count: 24, body: 'Mỗi thành viên đặt 1 thẻ lính vào cửa đã chọn; số trên lá là sức mạnh khi so quân.' },
      { name: 'Thẻ lính đỏ 4, 5', qty: '11 lá mỗi loại', count: 22, body: 'Thẻ lính sức mạnh trung bình.' },
      { name: 'Thẻ lính đỏ 6, 8', qty: '7 lá mỗi loại', count: 14, body: 'Thẻ lính sức mạnh cao, ít lá hơn.' },
    ],
  },
}

/**
 * Tổng số lá tính từ các dòng: hộp xanh 57 lá, hộp đỏ 74 lá (số lượng từng dòng anh đã chốt 2026-11-26).
 */
export const deckContents: Record<CardGroup['id'], DeckContent> = Object.fromEntries(
  Object.entries(lines).map(([id, d]) => [id, { ...d, total: d.lines.reduce((s, l) => s + l.count, 0) }]),
) as Record<CardGroup['id'], DeckContent>

/** Chữ cố định của khối mô tả hộp bài */
export const deckText = { total: 'Tổng cộng', hint: 'Bấm vào một lá để xem chi tiết' }
