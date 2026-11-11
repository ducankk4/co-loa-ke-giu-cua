// Kiểm tra hộp 3D: đóng -> cuộn chuột phóng to/thu nhỏ -> kéo xoay xem đáy/cạnh -> mở -> chồng Triệu Đà -> lá Trọng Thủy -> Esc x2 -> tờ hướng dẫn -> đóng hộp.
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

const stackTd = p.locator('[data-stack="trieu-da"]')
await stackTd.click()
await p.waitForTimeout(1400)
await shot('6-fan')
await p.locator('[data-card="trong-thuy-3"]').scrollIntoViewIfNeeded()
await p.locator('[data-card="trong-thuy-3"]').click()
await p.waitForTimeout(900)
await shot('7-card')
console.log('khung thông tin:', JSON.stringify(await p.locator('.bx-zoom-info').innerText()))
await p.keyboard.press('Escape')
await p.waitForTimeout(300)
console.log('Esc 1 -> focus:', await p.evaluate(() => document.activeElement?.getAttribute('data-card')))
await p.keyboard.press('Escape')
await p.waitForTimeout(400)
console.log('Esc 2 -> focus:', await p.evaluate(() => document.activeElement?.getAttribute('data-stack')))
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
await p.waitForTimeout(800)
await shot('9a-guide-unfolding')
await p.waitForTimeout(1200)
await shot('9-guide-flat')
// Phóng to tờ hướng dẫn bằng cuộn chuột tại trang đầu, rồi kéo sang phải
{
  const vb = await p.locator('.bx-detail [role="img"]').boundingBox()
  await p.mouse.move(vb.x + vb.width * 0.12, vb.y + vb.height * 0.4)
  for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40) }
  await p.waitForTimeout(500)
  await shot('10-guide-zoomed')
  await p.mouse.down(); await p.mouse.move(vb.x + vb.width * 0.12 - 300, vb.y + vb.height * 0.4, { steps: 8 }); await p.mouse.up()
  await p.waitForTimeout(300)
  await shot('10b-guide-panned')
}
await p.keyboard.press('Escape')
await p.waitForTimeout(400)

await p.locator('text=Đóng hộp').click()
await p.waitForTimeout(2600)
await shot('11-closed-again')
console.log('hộp đóng lại được:', await hit.count() === 1)
console.log('errors:', errs)
await b.close()
