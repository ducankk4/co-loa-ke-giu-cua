// Kiểm tra đoạn ghim Nhân vật: cuộn từng nấc như người dùng, snap phải dừng đúng nhân vật; bấm tab phải tới đúng người.
import { chromium } from 'playwright'
const [out = 'cv', w = '1440', h = '900'] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) } })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const tab = () => p.evaluate(() => [...document.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true'))
const start = await p.evaluate(() => document.getElementById('nhan-vat').parentElement.getBoundingClientRect().top + scrollY)
await p.evaluate((y) => window.scrollTo(0, y - 300), start)
await p.mouse.move(700, 450)
for (let step = 0; step < 4; step++) {
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(40) }
  await p.waitForTimeout(1500)
  const y = await p.evaluate(() => scrollY)
  console.log('wheel', step, 'offset', Math.round(y - start), 'tab', await tab())
  await p.screenshot({ path: `${out}-wheel${step}.png` })
}
for (const k of [0, 2, 1]) {
  await p.click(`[role=tab]:nth-child(${k + 1})`)
  await p.waitForTimeout(1800)
  console.log('click', k, '->', await tab())
}
await p.screenshot({ path: `${out}-click.png` })
await b.close()
