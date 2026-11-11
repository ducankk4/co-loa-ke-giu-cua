// Chụp các khối của mục Cách chơi sau đoạn ghim: 02 vòng chơi, 03 thắng thua, 04–06 cơ chế đặc biệt.
// node scripts/shoot-rules.mjs <tiền-tố> [rộng] [cao]
import { chromium } from 'playwright'
const [out = 'rl', w = '1440', h = '900'] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) } })
const errs = []
p.on('pageerror', (e) => errs.push(String(e)))
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' })
await p.waitForTimeout(1000)
const targets = { r02: '.rl-timeline', r03: '.rl-win', r04: '.rl-spec-art' }
for (const [k, sel] of Object.entries(targets)) {
  // cuộn từ từ tới khối để các hiệu ứng theo cuộn chạy như người dùng
  const y = await p.evaluate((s) => document.querySelector(s).closest('section').getBoundingClientRect().top + scrollY, sel)
  await p.evaluate((y) => window.scrollTo(0, y - 40), y)
  await p.waitForTimeout(1600)
  await p.screenshot({ path: `${out}-${k}.png` })
  await p.evaluate(() => window.scrollBy(0, innerHeight * 0.6))
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `${out}-${k}b.png` })
}
console.log('errors:', errs)
await b.close()
