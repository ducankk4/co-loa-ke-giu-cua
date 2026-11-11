import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = '_source/Website Cổ loa '
const OUT = 'src/assets'
// [thư mục, tên gốc, tên mới, chiều rộng tối đa, là nền?]
const MAP = [
  ['Trang 1', 'Khung.png', 'hero-bg', 1920, true],
  ['Trang 1', 'Logo game.png', 'logo', 600],
  ['Trang 1', 'Untitled-2.png', 'btn-frame', 600],
  ['Trang 1', '2.png', 'icon-players', 300],
  ['Trang 1', '3.png', 'icon-time', 300],
  ['Trang 1', '4.png', 'icon-age', 300],
  ['Khám phá', 'nền.png', 'explore-bg', 1920, true],
  ['Khám phá', 'an dương vương sửa.png', 'an-duong-vuong', 1000],
  ['Khám phá', 'Trọng thủy sửa.png', 'trong-thuy', 1000],
  ['Khám phá', 'thẻ tiệu đà.png', 'trieu-da', 1000],
  ['Thành phần game', 'triều đà.png', 'trieu-da-full', 1000],
  ['Khám phá', 'họa tiết.png', 'ornament', 600],
  ['Cách chơi', 'nền.png', 'rules-bg', 1920, true],
  ['Cách chơi', 'mặt sau thẻ.png', 'the-mat-sau', 600],
  ['Cách chơi', 'thẻ xanh.png', 'the-xanh', 600],
  ['Cách chơi', 'thẻ đỏ.png', 'the-do', 600],
  ['Cách chơi', 'thẻ triệu đà.png', 'the-trieu-da', 600],
  ['Cách chơi', 'chiếu.png', 'mat-chieu', 600],
  ['Cách chơi', 'lính xanh.png', 'linh-xanh', 800],
  ['Cách chơi', 'lính đỏ.png', 'linh-do', 800],
  ['Thành phần game', 'Nền.png', 'components-bg', 1920, true],
]
mkdirSync(OUT, { recursive: true })
for (const [dir, file, name, w, bg] of MAP) {
  const out = join(OUT, `${name}.webp`)
  const info = await sharp(join(SRC, dir, file))
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality: bg ? 76 : 82, alphaQuality: 90 })
    .toFile(out)
  console.log(name.padEnd(18), info.width + 'x' + info.height, Math.round(info.size / 1024) + ' KB')
}
