// Nội dung CHÍNH THỨC của team (2026-11-09): vai trò, thành phần, cơ chế chơi, tra cứu nhanh.
// Chép nguyên văn; chỉ sửa lỗi gõ hiển nhiên (ghi chú "sửa gõ" ngay tại chỗ). Không tự viết thêm luật.
import { img } from './assets'
import { cardGroups, tokens } from './cards'

const trieuDa = cardGroups.find((g) => g.id === 'trieu-da')!
/** 7 lá Trọng Thủy (để cho thấy có nhiều lá, mỗi lá một quyền năng) */
export const trongThuyCards = trieuDa.cards.filter((c) => c.id.startsWith('trong-thuy'))
/** Thẻ lính mẫu mỗi phe (ảnh có sẵn: 1, 2, 4, 5, 6, 8) */
export const soldierCards = {
  blue: cardGroups.flatMap((g) => g.cards).filter((c) => c.id.startsWith('quan-adv-')),
  red: cardGroups.flatMap((g) => g.cards).filter((c) => c.id.startsWith('quan-td-')),
}
export const missionCards = cardGroups.find((g) => g.id === 'mat-chieu')!.cards

// ---------- Vai trò ----------
export const roles = [
  {
    id: 'adv', side: 'blue' as const, name: 'An Dương Vương', role: 'Người giữ thành',
    statue: img.statueAdv, card: img.cardAdv,
    body: 'Nhiệm vụ của bạn là bảo vệ được nội thành bằng cách phân bổ quân ở từng vòng hợp lý và đến vòng thứ 3 phải đoán ra kẻ phản bội đang ẩn trong phe mình.',
  },
  {
    id: 'tt', side: 'spy' as const, name: 'Trọng Thủy', role: 'Gián điệp',
    statue: img.statueTrongThuy, card: img.cardTrongThuy,
    body: 'Bạn có quyền năng đặc biệt được quy định sẵn trên thẻ nhân vật. Quyền năng này sẽ được dùng khi bên Triệu Đà cần đến. Ngoài ra, bạn phải thực hiện 1 nhiệm vụ của bên Triệu Đà giao cho.',
    note: 'Có 7 thẻ Trọng Thủy, mỗi thẻ một quyền năng khác nhau.',
  },
  {
    id: 'td', side: 'red' as const, name: 'Triệu Đà', role: 'Người tấn công',
    statue: img.statueTrieuDa, card: img.cardTrieuDa,
    body: 'Nhiệm vụ của bạn là chiếm được nội thành bằng cách phân bổ quân lính một cách thông minh để mỗi vòng phải thắng được ít nhất 1 cổng (điều kiện để vào được vòng trong), đồng thời cân nhắc sử dụng quyền năng của Trọng Thuỷ hợp lý để gia tăng sức mạnh cho đội mình.',
  },
]

// ---------- Thành phần bộ game ----------
// image: null = chưa có ảnh (TODO(asset)); qty dạng chữ vì có mục tính "mỗi người"/"mỗi đội"
export type Part = { id: string; name: string; qty: string; body: string; images: string[]; shape: 'card' | 'token' | 'square' | 'wide' }
export const parts: Part[] = [
  { id: 'nhan-vat', name: 'Thẻ nhân vật', qty: 'An Dương Vương, Triệu Đà, 7 Trọng Thủy', shape: 'card',
    images: [img.cardAdv, img.cardTrieuDa, img.cardTrongThuy],
    body: 'Cho biết bạn giữ vai nào trong ván. Thẻ Trọng Thủy có 7 lá, mỗi lá một quyền năng.' }, // TODO(copy): câu mô tả do agent chính viết từ phần Vai trò
  { id: 'linh', name: 'Thẻ lính', qty: '16 lá mỗi người', shape: 'card',
    images: [img.cardBlue, img.cardRed],
    body: 'Mỗi người có 16 lá bài.' },
  { id: 'nhiem-vu', name: 'Thẻ nhiệm vụ', qty: '11 lá', shape: 'card',
    images: [img.secret],
    body: 'Có 11 lá thẻ nhiệm vụ. Bên Triệu Đà sẽ bốc 1 lá nhiệm vụ ở đầu ván để giao cho Trọng Thuỷ thực hiện.' },
  { id: 'linh-tt', name: 'Bộ thẻ lính riêng cho Trọng Thuỷ', qty: '11 lá', shape: 'card',
    images: [], // TODO(asset): chưa có ảnh bộ thẻ này
    body: 'Dùng sau khi Trọng Thuỷ bị đoán. Sau vòng 3, Trọng Thuỷ bị đoán thì sẽ bốc 3/11 lá bài trong bộ này rồi quay về phe Triệu Đà.' },
  { id: 'token-linh', name: 'Token lính', qty: '50 token mỗi đội', shape: 'token',
    images: [tokens.xanh, tokens.do],
    body: 'Những token này sẽ dùng để biểu thị cho số quân còn lại ở mỗi cửa sau khi 2 phe so quân với nhau. Đặc biệt, những token này vẫn sẽ được dùng cho những vòng kế tiếp.' },
  { id: 'token-thang', name: 'Token chiến thắng', qty: '16 token', shape: 'token',
    images: [], // TODO(asset): chưa có ảnh token chiến thắng
    body: 'Những token này để quy ước phe nào thắng của các cổng sau khi so quân.' },
  { id: 'token-no', name: 'Token nỏ', qty: '2 token', shape: 'token',
    images: [tokens.no],
    body: 'Bên ADV chỉ được dùng 1 token nỏ trong 1 ván chơi. Nếu bên ADV đoán đúng Trọng Thuỷ thì sẽ được cộng thêm 1 token nỏ, ngược lại nếu bên ADV đoán sai Trọng Thuỷ thì sẽ bị vô hiệu hoá token nỏ.' },
  { id: 'map', name: 'Bản đồ', qty: '1', shape: 'square', images: [img.mapImage], body: '' },
  { id: 'huong-dan', name: 'Quyển hướng dẫn', qty: '1', shape: 'wide', images: [img.guidePage], body: '' },
]

// ---------- Cơ chế chơi ----------
export const rulesSetup = {
  n: '01', title: 'Chuẩn bị trước khi chơi',
  items: [
    'Đặt bản đồ vào vị trí trung tâm. Chuẩn bị 6 bộ quân lính, mỗi bộ gồm 16 thẻ và chia cho người chơi.',
    'Chuẩn bị 5 thẻ nhân vật gồm Triệu Đà, An Dương Vương và các thẻ Trọng Thủy. Tiến hành rút ngẫu nhiên 1 trong 7 thẻ Trọng Thủy.',
    'Phe Triệu Đà rút ngẫu nhiên 1 trong 11 thẻ nhiệm vụ để giao cho Trọng Thủy. Nhiệm vụ này được giữ bí mật trong suốt ván chơi.',
  ],
}

export const rulesRound = {
  n: '02', title: 'Cơ chế một vòng chơi',
  steps: [
    { title: 'Hội ý và phân bổ quân', body: [
      'Hai phe tiến hành bàn bạc chiến thuật và thống nhất số lượng quân lính tại từng cửa.',
      'Phe Triệu Đà được tự do thảo luận số lượng quân sẽ đặt tại mỗi cửa. Phe An Dương Vương được hội ý nhưng không được tiết lộ chính xác số lượng thẻ lính sẽ đặt, tạo điều kiện để Trọng Thủy thực hiện nhiệm vụ bí mật.',
    ] },
    { title: 'Triển khai quân', body: [
      'Mỗi thành viên đặt 1 thẻ lính vào cửa đã lựa chọn. Bảo đảm mỗi cửa có đủ 3 thẻ lính của mỗi phe trước khi so quân.',
    ] },
    { title: 'So quân', body: [
      'Hai phe đồng thời lật thẻ để tiến hành so quân tại từng cửa.',
      'Phe thắng giữ lại một nửa số quân đã tham chiến. Phe thua mất toàn bộ số quân tại cửa đó. Số quân còn lại được biểu thị bằng token lính trên bản đồ, kết hợp với token chiến thắng để ghi nhận kết quả.',
    ] },
    { title: 'Chuyển vòng', body: [
      'Các token lính còn lại trên bản đồ được sử dụng để phân bổ quân tại những cửa của vòng tiếp theo.',
    ] },
  ],
}

export const rulesWin = {
  n: '03', title: 'Điều kiện thắng – thua',
  sides: [
    { side: 'adv' as const, who: 'Phe An Dương Vương', text: 'Giành chiến thắng nếu sau 5 vòng đấu, quân Triệu Đà không thể tiến vào Nội thành.' },
    { side: 'td' as const, who: 'Phe Triệu Đà', text: 'Giành chiến thắng nếu đưa được quân tiến vào Nội thành trong vòng 5 vòng đấu.' },
  ],
}

export const rulesSpecial = [
  { n: '04', title: 'Cơ chế đặc biệt: Trọng Thủy', image: img.secret, body: [
    'Trọng Thủy phải bí mật thực hiện nhiệm vụ do phe Triệu Đà giao từ đầu ván.',
    'Nếu hoàn thành nhiệm vụ, phe Triệu Đà không chịu tổn thất. Nếu thất bại, một nửa tổng số token lính hiện có trên bản đồ của phe Triệu Đà sẽ bị loại bỏ.',
  ] },
  { n: '05', title: 'Cơ chế đặc biệt: Nỏ thần', image: tokens.no, body: [
    'Nỏ thần thuộc quyền sở hữu của phe An Dương Vương. Khi kích hoạt, phe này được chọn một ô bất kỳ của phe Triệu Đà để loại bỏ toàn bộ quân lính tại ô đó. Nỏ thần phải được sử dụng trước khi so quân.',
    'Tại ô sử dụng Nỏ thần, phe An Dương Vương được giữ lại một nửa số quân lính.',
    'Nỏ thần có thể được sử dụng ở bất kỳ vòng nào nhưng chỉ được kích hoạt duy nhất một lần trong toàn bộ ván chơi. Nếu phe An Dương Vương đoán sai danh tính Trọng Thủy, quyền sử dụng Nỏ thần sẽ bị mất.',
  ] },
  { n: '06', title: 'Cơ chế chức năng: Quyền năng Trọng Thủy', image: img.cardTrongThuy, body: [
    'Khi muốn sử dụng quyền năng Trọng Thủy để gia tăng sức mạnh tại một ô, phe Triệu Đà yêu cầu phe An Dương Vương úp toàn bộ thẻ nhân vật đang sở hữu.',
    'Phe Triệu Đà lấy cả 3 thẻ nhân vật, đọc nội dung trên thẻ Trọng Thủy để xác định quyền năng, sau đó úp xuống và trả lại cho phe An Dương Vương.',
  ], note: 'Lưu ý: Quyền năng Trọng Thủy phải được sử dụng tại một ô cụ thể và trước khi tiến hành so quân.' },
]

// ---------- Tra cứu nhanh ----------
// Chỉ gồm câu đã có trả lời. Ba câu team chưa trả lời (TODO(copy)): "Triệu Đà cần thắng bao nhiêu cửa để tiến vào vòng tiếp theo?",
// "Nếu hết token lính giữa trận thì xử lý thế nào?", "Nếu người chơi đặt sai số lượng thẻ thì xử lý ra sao?"
export type Faq = { q: string; a: string | string[] }
export const faqGroups: { title: string; items: Faq[] }[] = [
  { title: 'Phân vai và nhận diện nhân vật', items: [
    { q: 'Ai biết danh tính Trọng Thủy ngay từ đầu?', a: 'Trọng Thuỷ và Phe Triệu Đà.' },
    { q: 'Phe Triệu Đà giao nhiệm vụ cho Trọng Thủy khi nào?', a: 'Trước khi bắt đầu cược quân ở vòng đầu tiên.' },
    { q: 'Trọng Thủy có được tiết lộ danh tính của mình không?', a: 'Không được tiết lộ cho bên ADV biết.' },
    { q: 'Nếu đoán sai hoặc đúng thì chuyện gì xảy ra?', a: ['Đoán đúng: Bên ADV được thêm 1 lượt nỏ.', 'Đoán sai: Bên ADV mất quyền dùng nỏ, được dùng số lính còn lại của Trọng Thuỷ.'] },
  ] },
  { title: 'Đặt thẻ và phân bổ quân', items: [
    { q: 'Có được đặt nhiều thẻ của một người vào cùng cửa không?', a: 'Không, mỗi người 1 thẻ 1 cửa.' },
    { q: 'Có được thay đổi thẻ sau khi đã đặt xuống không?', a: 'Có, nhưng phải thay đổi trước khi lật thẻ.' }, // sửa gõ: "những" -> "nhưng"
    { q: 'Vòng 4 và 5 khác gì so với 3 vòng đầu?', a: 'Vòng 4, 5 không bắt buộc phải đặt 3 thẻ 1 cửa nữa.' },
  ] },
  { title: 'So quân và tính kết quả', items: [
    { q: 'Nếu hai phe bằng điểm thì xử lý ra sao?', a: 'Mặc định bên ADV thắng cửa đó.' },
    { q: 'Phe thắng giữ lại bao nhiêu quân?', a: '½ số lính mình cược.' },
    { q: 'Nếu số quân lẻ thì làm tròn lên hay xuống?', a: 'Làm tròn xuống.' },
    { q: 'Token lính được sử dụng như thế nào?', a: 'Sau khi so quân, Token lính được dùng để biểu thị cho số lính còn lại.' },
    { q: 'Token lính còn lại có được chuyển sang bất kỳ cửa nào ở vòng sau không?', a: 'Đúng, nhưng Token lính vòng 2 thì phải được dùng hết ở Vòng 3. Không tích trữ để dồn vòng cuối cùng.' },
    { q: 'Nếu Triệu Đà thắng nhiều cửa trong một vòng thì được tiến vào bao nhiêu vòng?', a: 'Vẫn chỉ là tiến vào từng vòng một dù Triệu Đà thắng nhiều cửa trong 1 vòng.' },
  ] },
  { title: 'Sử dụng Nỏ thần', items: [
    { q: 'Có thể chọn bất kỳ cửa nào của phe Triệu Đà không?', a: 'Được.' },
    { q: 'Nỏ thần tiêu diệt bao nhiêu quân?', a: 'Tất cả quân của bên Triệu Đà đặt tại ô dùng Nỏ thần.' },
    { q: 'Nếu đoán sai Trọng Thủy thì quyền sử dụng Nỏ thần có bị mất không?', a: 'Có.' },
  ] },
  { title: 'Nhiệm vụ và quyền năng Trọng Thủy', items: [
    { q: 'Làm thế nào để xác định Trọng Thủy hoàn thành nhiệm vụ?', a: 'Token chiến thắng và khi trở về phe của TĐ thì TT cũng sẽ công khai mình thực hiện nhiệm vụ gì và thành công hay không để bên ADV cùng check được.' },
    { q: 'Nếu Trọng Thủy thất bại thì phe Triệu Đà mất bao nhiêu quân?', a: 'TĐ mất ½ token lính trên map.' },
    { q: 'Phe Triệu Đà có thể sử dụng quyền năng Trọng Thủy khi nào?', a: 'Trước vòng 3, khi Trọng Thuỷ bị đoán.' },
    { q: 'Có thể sử dụng quyền năng bao nhiêu lần?', a: '1 lần.' },
  ] },
  { title: 'Điều kiện chiến thắng và tình huống đặc biệt', items: [
    { q: 'Nếu Triệu Đà không thắng được cửa nào trong một vòng thì chuyện gì xảy ra?', a: 'Phe Triệu Đà thua ngay lập tức.' },
  ] },
]
