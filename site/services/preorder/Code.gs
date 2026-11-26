/**
 * Nhận đăng ký nhận tư vấn từ trang dat-truoc.html:
 *   1. Ghi một dòng vào Google Sheet (lưu lại để tra cứu).
 *   2. Gửi email báo ngay cho người bán, gồm đủ thông tin người đăng ký để liên hệ.
 *
 * Cài đặt: xem HUONG-DAN.md cùng thư mục. Chỉ cần sửa SELLER_EMAIL bên dưới.
 * Đây KHÔNG phải trang thanh toán: không nhận tiền, không lưu thông tin thanh toán.
 */

// Email người bán nhận thông báo. Nhiều người nhận thì ngăn cách bằng dấu phẩy: 'a@gmail.com,b@gmail.com'
const SELLER_EMAIL = 'DIEN_EMAIL_NGUOI_BAN@gmail.com'
const SHEET_NAME = 'Đăng ký'
const SUBJECT_PREFIX = '[Cổ Loa] Đăng ký tư vấn mới'

const PHONE_RE = /^(0|\+84)\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEADERS = ['Thời gian', 'Mã', 'Họ tên', 'Số điện thoại', 'Email', 'Số bộ', 'Lời nhắn', 'Request ID']

function doPost(e) {
  // Trang web gửi kiểu no-cors nên không đọc được phản hồi; vẫn trả JSON để tiện thử bằng tay.
  const lock = LockService.getScriptLock()
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}')

    // Ô ẩn chống bot: người thật không nhìn thấy nên luôn để trống
    if (d.website) return json({ ok: true })

    const name = clip(d.name, 100)
    const phone = clip(d.phone, 20).replace(/[\s.]/g, '')
    const email = clip(d.email, 120)
    const note = clip(d.note, 1000)
    const quantity = Math.min(Math.max(parseInt(d.quantity, 10) || 1, 1), 99)
    const requestId = clip(d.requestId, 64)
    if (!name || !PHONE_RE.test(phone) || !requestId) return json({ ok: false, error: 'invalid' })
    if (email && !EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid-email' })

    lock.waitLock(10000)
    const sheet = getSheet()
    // Bấm "Gửi lại" dùng cùng requestId: đã có thì bỏ qua, không ghi trùng, không gửi mail trùng
    const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 8, sheet.getLastRow() - 1, 1).getValues().flat() : []
    if (ids.indexOf(requestId) !== -1) return json({ ok: true, duplicate: true })

    const code = requestId.slice(0, 8).toUpperCase()
    const time = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')
    // Thêm dấu ' trước số điện thoại để Sheet không cắt số 0 ở đầu
    sheet.appendRow([time, code, name, "'" + phone, email, quantity, note, requestId])
    lock.releaseLock()

    sendSellerMail({ time, code, name, phone, email, quantity, note })
    return json({ ok: true, code })
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'server' })
  } finally {
    try { lock.releaseLock() } catch (_) {}
  }
}

function sendSellerMail(r) {
  const rows = [
    ['Họ tên', r.name],
    ['Số điện thoại', r.phone],
    ['Email', r.email || '(không để lại)'],
    ['Số bộ quan tâm', String(r.quantity)],
    ['Lời nhắn', r.note || '(không có)'],
    ['Thời gian', r.time],
    ['Mã đăng ký', r.code],
  ]
  const tel = r.phone.replace(/^\+84/, '0')
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' +
    '<p>Có khách vừa đăng ký nhận tư vấn <b>Cổ Loa: Kẻ Giữ Cửa</b>:</p>' +
    '<table cellpadding="6" style="border-collapse:collapse">' +
    rows.map(([k, v]) => '<tr><td style="color:#666;white-space:nowrap">' + k + '</td><td><b>' + esc(v).replace(/\n/g, '<br>') + '</b></td></tr>').join('') +
    '</table>' +
    '<p><a href="tel:' + esc(tel) + '">Gọi ngay ' + esc(tel) + '</a> · <a href="https://zalo.me/' + esc(tel) + '">Nhắn Zalo</a></p>' +
    '</div>'
  const text = rows.map(([k, v]) => k + ': ' + v).join('\n')

  const opts = { name: 'Cổ Loa – Website', htmlBody: html }
  // Có email khách thì bấm "Trả lời" trong Gmail là gửi thẳng cho khách
  if (r.email) opts.replyTo = r.email
  MailApp.sendEmail(SELLER_EMAIL, SUBJECT_PREFIX + ': ' + r.name + ' – ' + r.phone, text, opts)
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME)
  if (sheet.getLastRow() === 0) { sheet.appendRow(HEADERS); sheet.setFrozenRows(1) }
  return sheet
}

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const json = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)

/** Chạy tay một lần trong trình soạn thảo để cấp quyền và thử gửi mail (không ghi vào Sheet). */
function testSendMail() {
  sendSellerMail({ time: 'thử', code: 'TEST0000', name: 'Nguyễn Văn Thử', phone: '0900000000', email: '', quantity: 1, note: 'Email thử nghiệm' })
}
