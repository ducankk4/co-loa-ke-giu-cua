"""Chuyển PDF ảnh game (site/_source/web-pdf/ hoặc site/src/assets/Web/) sang PNG đã cắt lề.

Bước 1 (file này): render trang 1 mỗi PDF -> cắt lề trắng -> PNG tạm trong
site/_source/game-png/ + manifest.json (kích thước đích, chất lượng).
Bước 2: `node scripts/convert-pdfs-webp.mjs` (sharp) nén PNG -> WebP vào
site/src/assets/game/.

Cách chạy (từ thư mục gốc repo, PyMuPDF + numpy không cài vào dự án):
  PYTHONPATH="<thư mục chứa pymupdf>" PYTHONIOENCODING=utf-8 python site/scripts/convert-pdfs.py
  cd site && node scripts/convert-pdfs-webp.mjs

Tùy chọn: `--only characters` chỉ chạy nhóm có đường dẫn đích bắt đầu bằng chuỗi đó;
`--big` render lá nhân vật rộng 1400px vào _source/game-png-big/ để đọc chữ.
"""
import json
import os
import sys

import numpy as np
import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # site/
SRC_CANDIDATES = [
    os.path.join(ROOT, "src", "assets", "Web"),
    os.path.join(ROOT, "_source", "web-pdf"),
]
OUT_PNG = os.path.join(ROOT, "_source", "game-png")

# Ngưỡng: pixel có min(R,G,B) < INK là "có hình".
INK = 235

CARD = {"width": 600, "maxKB": 120, "alpha": True}
BOX = {"width": 1400, "maxKB": 400}
# (nguồn tương đối, đích tương đối không đuôi, cấu hình)
JOBS = [
    ("Hộp/Mặt trước.pdf", "box/top", BOX),
    ("Hộp/Bìa sau.pdf", "box/bottom", BOX),
    ("Hộp/cạnh ngang.pdf", "box/side-long", BOX),
    ("Hộp/cạnh dọc.pdf", "box/side-short", {**BOX, "rotate": 90}),
    ("Thẻ nhân vật/An dương vương đẹp trai.pdf", "characters/an-duong-vuong", CARD),
    ("Thẻ nhân vật/triệu đà.pdf", "characters/trieu-da", CARD),
    ("Thẻ nhân vật/Trọng thủy 1.pdf", "characters/trong-thuy-1", CARD),
    ("Thẻ nhân vật/trọng thủy 2.pdf", "characters/trong-thuy-2", CARD),
    ("Thẻ nhân vật/trọng thủy 3.pdf", "characters/trong-thuy-3", CARD),
    ("Thẻ nhân vật/trọng thủy 4.pdf", "characters/trong-thuy-4", CARD),
    ("Thẻ nhân vật/trong thủy 5.pdf", "characters/trong-thuy-5", CARD),
    ("Thẻ nhân vật/trọng thủy 6.pdf", "characters/trong-thuy-6", CARD),
    ("Thẻ nhân vật/trọng thủy 7.pdf", "characters/trong-thuy-7", CARD),
    ("Thẻ lính xanh/Thẻ lính 1.pdf", "soldiers-blue/1", CARD),
    ("Thẻ lính xanh/Thẻ lính 2.pdf", "soldiers-blue/2", CARD),
    ("Thẻ lính xanh/thẻ lính 4.pdf", "soldiers-blue/4", CARD),
    ("Thẻ lính xanh/thẻ lính 5.pdf", "soldiers-blue/5", CARD),
    ("Thẻ lính xanh/thẻ lính 6.pdf", "soldiers-blue/6", CARD),
    ("Thẻ lính xanh/thẻ lính 8.pdf", "soldiers-blue/8", CARD),
    ("Thẻ lính đỏ/thẻ lính đỏ 1.pdf", "soldiers-red/1", CARD),
    ("Thẻ lính đỏ/Thẻ đỏ 2.pdf", "soldiers-red/2", CARD),
    ("Thẻ lính đỏ/thẻ lính 4.pdf", "soldiers-red/4", CARD),
    ("Thẻ lính đỏ/thẻ lính đỏ 5.pdf", "soldiers-red/5", CARD),
    ("Thẻ lính đỏ/thẻ lính đỏ 6.pdf", "soldiers-red/6", CARD),
    ("Thẻ lính đỏ/thẻ lính đỏ 8.pdf", "soldiers-red/8", CARD),
    # Mật chiếu: đặt tên theo cửa in trên lá (đã kiểm bằng get_text), không theo số file.
    ("Mật chiếu/Mật chiếu 1.pdf", "secret/1a", CARD),
    ("Mật chiếu/Mật chiếu 2.pdf", "secret/1b", CARD),
    ("Mật chiếu/mật chiếu 3.pdf", "secret/1c", CARD),
    ("Mật chiếu/mật chiếu 4.pdf", "secret/1d", CARD),
    ("Mật chiếu/mật chiếu 5.pdf", "secret/2a", CARD),
    ("Mật chiếu/mật chiếu 6.pdf", "secret/2b", CARD),
    ("Mật chiếu/mật chiếu 7.pdf", "secret/2c", CARD),
    ("Mật chiếu/mật chiếu 8.pdf", "secret/2d", CARD),
    ("Mật chiếu/mật chiếu 9.pdf", "secret/3a", CARD),
    ("Mật chiếu/mật chiếu 10.pdf", "secret/3b", CARD),
    ("Mật chiếu/mật chiếu 11.pdf", "secret/3c", CARD),
    ("Token/token đỏ.pdf", "tokens/do", {"width": 400, "maxKB": 80, "alpha": True}),
    ("Token/token xanh.pdf", "tokens/xanh", {"width": 400, "maxKB": 80, "alpha": True}),
    ("Token/token nỏ.pdf", "tokens/no", {"width": 400, "maxKB": 80, "alpha": True}),
    ("Tờ hướng dẫn/tờ hdan mặt trc.pdf", "guide/front", {"width": 2000, "maxKB": 600, "quality": 82}),
    ("Tờ hướng dẫn/hdan mặt sau.pdf", "guide/back", {"width": 2000, "maxKB": 600, "quality": 82}),
    ("Map/map 1.pdf", "map/map", {"width": 1600, "maxKB": 400}),
]


def find_src():
    for d in SRC_CANDIDATES:
        if os.path.isdir(d):
            return d
    sys.exit("Không thấy thư mục PDF nguồn: " + " | ".join(SRC_CANDIDATES))


def ink_bbox(page):
    """Tìm khung có hình (đơn vị point) bằng bản render nhỏ."""
    scale = 1.5
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    ink = a[:, :, :3].min(axis=2) < INK
    rows = np.where(ink.any(axis=1))[0]
    cols = np.where(ink.any(axis=0))[0]
    if len(rows) == 0:
        return page.rect
    x0, x1 = cols[0] / scale, (cols[-1] + 1) / scale
    y0, y1 = rows[0] / scale, (rows[-1] + 1) / scale
    r = pymupdf.Rect(x0, y0, x1, y1) & page.rect
    return r


def tight(arr):
    ink = arr[:, :, :3].min(axis=2) < INK
    rows = np.where(ink.any(axis=1))[0]
    cols = np.where(ink.any(axis=0))[0]
    return arr[rows[0] : rows[-1] + 1, cols[0] : cols[-1] + 1]


def corner_alpha(arr):
    """Làm trong suốt nền trắng nối với mép ảnh (góc bo của lá bài).

    Loang từ viền ảnh qua các pixel sáng; giới hạn số vòng để chỉ ăn vào góc.
    Viền mềm: pixel kề vùng nền lấy alpha theo độ tối.
    """
    h, w = arr.shape[:2]
    light = arr[:, :, :3].min(axis=2) >= INK
    bg = np.zeros((h, w), bool)
    bg[0, :] = light[0, :]
    bg[-1, :] = light[-1, :]
    bg[:, 0] |= light[:, 0]
    bg[:, -1] |= light[:, -1]
    for _ in range(max(h, w) // 6):
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]
        grown[:-1, :] |= bg[1:, :]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= light
        if (grown == bg).all():
            break
        bg = grown
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # viền 1px quanh nền: alpha theo độ tối (khử răng cưa)
    edge = np.zeros_like(bg)
    edge[1:, :] |= bg[:-1, :]
    edge[:-1, :] |= bg[1:, :]
    edge[:, 1:] |= bg[:, :-1]
    edge[:, :-1] |= bg[:, 1:]
    edge &= ~bg
    dark = 255 - arr[:, :, :3].min(axis=2).astype(np.int32)
    soft = np.clip(dark * 255 // max(1, 255 - INK + 20), 0, 255).astype(np.uint8)
    alpha[edge] = soft[edge]
    rgba = np.dstack([arr[:, :, :3], alpha])
    return rgba


def render(src_dir, rel, dest, cfg, out_dir, width_override=None):
    path = os.path.join(src_dir, rel)
    doc = pymupdf.open(path)
    page = doc[0]
    box = ink_bbox(page)
    target_w = width_override or cfg["width"]
    rot = cfg.get("rotate", 0)
    side_pt = box.height if rot in (90, 270) else box.width
    # render dư 25% để sharp thu nhỏ cho mịn, rồi cắt sát lại ở độ phân giải cao
    scale = target_w * 1.25 / side_pt
    pad = 2
    clip = pymupdf.Rect(box.x0 - pad, box.y0 - pad, box.x1 + pad, box.y1 + pad) & page.rect
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=clip, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    arr = tight(arr)
    if rot:
        arr = np.rot90(arr, k=-(rot // 90))  # xoay theo chiều kim đồng hồ
    arr = np.ascontiguousarray(arr)
    if cfg.get("alpha"):
        arr = corner_alpha(arr)
    h, w = arr.shape[:2]
    n = arr.shape[2]
    cs = pymupdf.csRGB
    out = pymupdf.Pixmap(cs, w, h, arr.tobytes(), n == 4)
    file = os.path.join(out_dir, dest + ".png")
    os.makedirs(os.path.dirname(file), exist_ok=True)
    out.save(file)
    print(f"{dest}: {w}x{h} (tỉ lệ {w / h:.3f})")
    return {"png": dest + ".png", "dest": dest + ".webp", "w": w, "h": h, **cfg}


def main():
    args = sys.argv[1:]
    only = args[args.index("--only") + 1] if "--only" in args else None
    src_dir = find_src()
    if "--big" in args:
        out = os.path.join(ROOT, "_source", "game-png-big")
        for rel, dest, cfg in JOBS:
            if dest.startswith("characters/"):
                render(src_dir, rel, dest, cfg, out, width_override=1400)
        return
    manifest = []
    for rel, dest, cfg in JOBS:
        if only and not dest.startswith(only):
            continue
        manifest.append(render(src_dir, rel, dest, cfg, OUT_PNG))
    os.makedirs(OUT_PNG, exist_ok=True)
    mpath = os.path.join(OUT_PNG, "manifest.json")
    old = []
    if only and os.path.exists(mpath):
        old = [m for m in json.load(open(mpath, encoding="utf-8")) if not m["dest"].startswith(only)]
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(old + manifest, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
