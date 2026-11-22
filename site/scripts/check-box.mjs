// Kiểm tra hộp 3D: đóng -> cuộn chuột phóng to/thu nhỏ -> kéo xoay xem đáy/cạnh -> mở -> bản đồ (xem, phóng, quay lại) -> hộp bài Triệu Đà (bay ra giữa, tự mở, xòe quạt) -> lá Trọng Thủy -> Esc x2 -> tờ hướng dẫn -> đóng hộp.
// node scripts/check-box.mjs <tiền-tố> [rộng] [cao]   (cần `npx vite preview --port 4173`)
import { chromium } from 'playwright'
const [out = 'box', w = '1440', h = '900'] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) } })
const errs = []
p.on('pageerror', (e) => errs.push(String(e)))
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const shot = (n) => p.screenshot({ path: `${out}-${n}.png` })
const hit = p.locator('[data-bx="hit"]')
await hit.scrollIntoViewIfNeeded()
await shot('1-closed')

// Cuộn chuột trên hộp: phóng to (cuộn lên), rồi thu về (cuộn xuống)
{
  const bb = await hit.boundingBox()
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40) }
  await p.waitForTimeout(500)
  await shot('1b-zoomed')
  const sy = await p.evaluate(() => scrollY)
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(40) }
  await p.waitForTimeout(500)
  console.log('phóng to không làm cuộn trang:', sy === 0, '| thu nhỏ hết rồi cuộn tiếp thì trang cuộn:', await p.evaluate(() => scrollY) > 0)
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.waitForTimeout(400)
}

// Kéo xoay: tâm vùng bấm, vuốt dọc để lật xem đáy, rồi vuốt ngang xem cạnh
const box = await hit.boundingBox()
const cx = box.x + box.width / 2, cy = box.y + box.height / 2
const drag = async (dx, dy, steps = 12) => {
  await p.mouse.move(cx, cy)
  await p.mouse.down()
  for (let i = 1; i <= steps; i++) await p.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps, { steps: 1 })
  await p.waitForTimeout(120)
  await p.mouse.up()
  await p.waitForTimeout(1500) // chờ quán tính tắt
}
await drag(0, -620) // lật quanh trục ngang: ra mặt đáy
await shot('2-bottom')
await drag(0, -100)
await shot('2b-bottom-more')
await drag(0, 620)
await drag(520, 0) // xoay ngang: xem cạnh bên
await shot('3-side')
console.log('hộp vẫn đóng sau khi kéo:', await hit.count() === 1)

// Bấm = mở
await hit.click({ position: { x: box.width / 2, y: box.height / 2 } })
await p.waitForTimeout(900)
await shot('4-opening')
await p.waitForTimeout(2600)
await shot('5-open')

// Bản đồ phủ lên khay: rê chuột (nhấc lên) -> bấm xem chi tiết -> cuộn phóng to -> Quay lại: bản đồ ra cạnh hộp, dưới nắp
{
  const map = p.locator('[data-stack="map"]')
  await map.hover()
  await p.waitForTimeout(400)
  await shot('5a-map-hover')
  await map.click()
  await p.waitForTimeout(900)
  await shot('5b-map-view')
  const v = await p.locator('.bx-detail [role="img"]').boundingBox()
  await p.mouse.move(v.x + v.width * 0.3, v.y + v.height * 0.4)
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40) }
  await p.waitForTimeout(500)
  await shot('5c-map-zoom')
  await p.locator('.bx-back').click()
  await p.waitForTimeout(300)
  await shot('5d-map-flying')
  await p.waitForTimeout(1500)
  await shot('5e-map-aside')
  console.log('bản đồ nằm cạnh hộp:', await p.locator('.bx-side [data-stack="map"]').count() === 1, '| focus trả về bản đồ:', await p.evaluate(() => document.activeElement?.getAttribute('data-stack')))
}

const stackTd = p.locator('[data-stack="an-duong-vuong"]') // hộp xanh: có 7 lá Trọng Thủy
await stackTd.click() // một lần: hộp bay ra giữa, tự mở, lá xòe quạt
await p.waitForTimeout(500)
await shot('5f-deck-flying')
await p.waitForTimeout(800)
await shot('5g-deck-opening')
await p.waitForTimeout(2200)
await shot('6-fan')
console.log('quạt lá:', await p.locator('.bx-fan-card').count(), 'lá | ô trong khay đang ẩn:', await stackTd.evaluate((n) => n.classList.contains('bx-away')))
// Lá trong quạt chồng lên nhau: bấm bằng sự kiện trực tiếp (giữa lá có thể bị lá bên cạnh che)
await p.locator('[data-card="trong-thuy-3"]').hover({ position: { x: 10, y: 10 }, force: true })
await p.waitForTimeout(300)
await shot('6b-fan-hover')
await p.locator('[data-card="trong-thuy-3"]').dispatchEvent('click')
await p.waitForTimeout(900)
await shot('7-card')
console.log('khung thông tin:', JSON.stringify(await p.locator('.bx-zoom-info').innerText()))
await p.keyboard.press('Escape')
await p.waitForTimeout(300)
console.log('Esc 1 -> focus:', await p.evaluate(() => document.activeElement?.getAttribute('data-card')))
await p.keyboard.press('Escape')
await p.waitForTimeout(500)
await shot('7b-deck-returning')
await p.waitForTimeout(1500)
console.log('Esc 2 -> focus (về hộp xanh):', await p.evaluate(() => document.activeElement?.getAttribute('data-stack')))
await shot('8-back-map')

// Nhóm token: mở, kiểm tra đủ 3 loại, Esc về map
await p.locator('[data-stack="tokens"]').click()
await p.waitForTimeout(600)
await shot('8b-tokens')
console.log('token:', await p.locator('[role="dialog"] h4').allInnerTexts())
await p.keyboard.press('Escape')
await p.waitForTimeout(400)
console.log('Esc token -> focus:', await p.evaluate(() => document.activeElement?.getAttribute('data-stack')))

await p.locator('[data-stack="guide"]').click()
await p.waitForTimeout(1000)
await shot('9-guide-closed') // quyển sách: chỉ thấy bìa trước
// Lật từng tờ bằng nút Trang sau (bìa -> trang 1-2 -> trang 3-4 -> bìa sau), giữa chừng chụp cảnh đang lật
const next = p.getByRole('button', { name: 'Trang sau' })
await next.click(); await p.waitForTimeout(450); await shot('9a-guide-flipping'); await p.waitForTimeout(900)
await shot('9b-guide-spread-1')
await next.click(); await p.waitForTimeout(1200); await shot('9c-guide-spread-2')
await next.click(); await p.waitForTimeout(1200); await shot('9d-guide-back-cover')
// Bấm nửa trái của sách để lật lui
{
  const vb = await p.locator('.bx-detail [role="img"]').first().boundingBox()
  await p.mouse.click(vb.x + 40, vb.y + vb.height / 2)
  await p.waitForTimeout(1300)
  await shot('9e-guide-tap-back')
  // Phóng to bằng cuộn chuột
  await p.mouse.move(vb.x + vb.width * 0.3, vb.y + vb.height * 0.4)
  for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40) }
  await p.waitForTimeout(500)
  await shot('10-guide-zoomed')
}
await p.keyboard.press('Escape')
await p.waitForTimeout(400)

await p.locator('text=Đóng hộp').click()
await p.waitForTimeout(2600)
await shot('11-closed-again')
console.log('hộp đóng lại được:', await hit.count() === 1)
console.log('errors:', errs)
await b.close()
