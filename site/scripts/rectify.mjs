// Nắn phẳng một mặt phẳng chụp nghiêng (4 góc) thành ảnh chữ nhật. Dùng cho ảnh chụp hộp game.
// node scripts/rectify.mjs <vào> <ra.webp> <rộng> <cao> x1,y1 x2,y2 x3,y3 x4,y4   (góc TL TR BR BL, toạ độ ảnh gốc)
import sharp from 'sharp'
const [inp, out, W, H, ...pts] = process.argv.slice(2)
const w = Number(W), h = Number(H)
const src = pts.map((p) => p.split(',').map(Number))
const dst = [[0, 0], [w, 0], [w, h], [0, h]]
// Homography đích -> nguồn (giải hệ 8 ẩn)
function homography(from, to) {
  const A = [], b = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [u, v] = to[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }
  for (let c = 0; c < 8; c++) {
    let p = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    ;[A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]
    for (let r = 0; r < 8; r++) if (r !== c) {
      const f = A[r][c] / A[c][c]
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]
      b[r] -= f * b[c]
    }
  }
  return b.map((v, i) => v / A[i][i])
}
const m = homography(dst, src)
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const o = Buffer.alloc(w * h * 3)
const px = (x, y, c) => data[(Math.min(info.height - 1, Math.max(0, y)) * info.width + Math.min(info.width - 1, Math.max(0, x))) * 3 + c]
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const d = m[6] * x + m[7] * y + 1
  const sx = (m[0] * x + m[1] * y + m[2]) / d, sy = (m[3] * x + m[4] * y + m[5]) / d
  const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0
  for (let c = 0; c < 3; c++) {
    const v = px(x0, y0, c) * (1 - fx) * (1 - fy) + px(x0 + 1, y0, c) * fx * (1 - fy) + px(x0, y0 + 1, c) * (1 - fx) * fy + px(x0 + 1, y0 + 1, c) * fx * fy
    o[(y * w + x) * 3 + c] = v
  }
}
await sharp(o, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 85 }).toFile(out)
console.log('ok', out)
