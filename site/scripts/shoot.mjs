import { chromium } from 'playwright'
const [w, h, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]]
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: w, height: h } })
const errs = []
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
p.on('pageerror', (e) => errs.push(String(e)))
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' })
await p.waitForTimeout(2800)
const ids = ['top', 'gioi-thieu', 'boi-canh', 'cach-choi', 'nhan-vat', 'thanh-phan', 'dat-truoc', 'cta']
for (const id of ids) {
  await p.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), id)
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${out}-${id}.png` })
  // Giữa hai section: kiểm tra chuyển cảnh (mép tan, nội dung đang vào/ra)
  await p.evaluate((i) => window.scrollBy(0, -innerHeight * 0.45), id)
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${out}-seam-${id}.png` })
}
// pin sections
const pinY = await p.evaluate(() => (document.getElementById('luat-choi').parentElement).getBoundingClientRect().top + scrollY)
for (const [k, off] of [['a', 0.4], ['b', 1.2], ['c', 2.4]]) {
  await p.evaluate((y) => window.scrollTo(0, y), pinY + off * h)
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${out}-wiw-${k}.png` })
}
const ec = await p.evaluate(() => document.querySelector('.veil').closest('.pin-spacer').getBoundingClientRect().top + scrollY)
for (const [k, off] of [['a', 0.05], ['b', 0.75], ['c', 2]]) {
  await p.evaluate((y) => window.scrollTo(0, y), ec + off * h)
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${out}-eyes-${k}.png` })
}
const cv = await p.evaluate(() => (document.getElementById('nhan-vat').parentElement).getBoundingClientRect().top + scrollY)
for (const [k, off] of [['1', 0], ['2', 1], ['mid', 1.5], ['3', 2]]) {
  await p.evaluate((y) => window.scrollTo(0, y), cv + off * h)
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${out}-cv-${k}.png` })
}
console.log('errors:', errs)
await b.close()
