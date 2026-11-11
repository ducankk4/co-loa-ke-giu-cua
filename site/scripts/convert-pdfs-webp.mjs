// Bước 2 của convert-pdfs.py: nén PNG tạm (_source/game-png/) -> WebP (src/assets/game/).
// Chạy: cd site && node scripts/convert-pdfs-webp.mjs
// Mỗi ảnh thu về đúng bề rộng đích, hạ chất lượng dần đến khi <= maxKB.
import sharp from 'sharp'
import { readFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pngDir = join(root, '_source', 'game-png')
const outDir = join(root, 'src', 'assets', 'game')
const manifest = JSON.parse(readFileSync(join(pngDir, 'manifest.json'), 'utf8'))

let total = 0
for (const m of manifest) {
  const out = join(outDir, m.dest)
  mkdirSync(dirname(out), { recursive: true })
  let q = m.quality ?? 85
  let info
  for (;;) {
    info = await sharp(join(pngDir, m.png))
      .resize({ width: m.width, withoutEnlargement: true })
      .webp({ quality: q, alphaQuality: 90, effort: 6, smartSubsample: true })
      .toFile(out)
    if (info.size <= m.maxKB * 1024 || q <= 40) break
    q -= 5
  }
  const kb = statSync(out).size / 1024
  total += kb
  console.log(`${m.dest}\t${info.width}x${info.height}\t${kb.toFixed(1)} KB\tq${q}${kb > m.maxKB ? '\tVƯỢT GIỚI HẠN' : ''}`)
}
console.log(`Tổng: ${(total / 1024).toFixed(2)} MB`)
