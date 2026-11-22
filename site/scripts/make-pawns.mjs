// Token lính: từ ảnh render quân nhựa không màu (_source/pawn/pawn-gray.jpg, nền xám tối)
// -> tách nền thành trong suốt -> tô 2 màu (xanh = phe An Dương Vương, đỏ = phe Triệu Đà), giữ nguyên sáng tối của khối.
// Chạy: cd site && node scripts/make-pawns.mjs
import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, '_source', 'pawn', 'pawn-gray.jpg')
const outDir = join(root, 'src', 'assets', 'game', 'tokens')

// Bảng màu theo độ sáng: tối -> giữa -> sáng (nhựa bóng)
const PALETTES = {
  xanh: [[8, 22, 66], [38, 92, 200], [170, 205, 255]],
  do: [[58, 8, 10], [196, 38, 34], [255, 190, 170]],
}
const BG_LO = 70, BG_HI = 110 // vùng loang từ mép: dưới BG_LO = nền trong suốt, BG_LO..BG_HI = viền mềm

const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels: c } = info
const mix = (a, b, t) => a + (b - a) * t

const lum = new Float32Array(w * h)
for (let i = 0; i < w * h; i++) lum[i] = data[i * c] * 0.299 + data[i * c + 1] * 0.587 + data[i * c + 2] * 0.114

// Nền = vùng tối loang từ mép ảnh (khe tối bên trong khối, như dưới vành mũ, vẫn giữ đặc)
const bg = new Uint8Array(w * h)
const stack = []
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
while (stack.length) {
  const i = stack.pop()
  if (bg[i] || lum[i] >= BG_HI) continue
  bg[i] = 1
  const x = i % w, y = (i / w) | 0
  if (x > 0) stack.push(i - 1)
  if (x < w - 1) stack.push(i + 1)
  if (y > 0) stack.push(i - w)
  if (y < h - 1) stack.push(i + w)
}

for (const [name, [dk, md, lt]] of Object.entries(PALETTES)) {
  const out = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    let L = lum[i]
    const a = bg[i] ? Math.min(1, Math.max(0, (L - BG_LO) / (BG_HI - BG_LO))) : 1
    // Pixel viền bán trong suốt: lấy màu của khối kề bên (không để viền tối thành quầng)
    if (a < 1) L = Math.max(L, 150)
    // Độ sáng của khối nằm khoảng 90..245: kéo về 0..1 rồi nội suy qua bảng màu
    const t = Math.min(1, Math.max(0, (L - 90) / 155))
    const col = t < 0.6 ? [0, 1, 2].map((k) => mix(dk[k], md[k], t / 0.6)) : [0, 1, 2].map((k) => mix(md[k], lt[k], (t - 0.6) / 0.4))
    out[i * 4] = col[0]; out[i * 4 + 1] = col[1]; out[i * 4 + 2] = col[2]; out[i * 4 + 3] = Math.round(a * 255)
  }
  const file = join(outDir, `pawn-${name}.webp`)
  const r = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(file)
  console.log(file, `${r.width}x${r.height}`, `${(r.size / 1024).toFixed(1)} KB`)
}
