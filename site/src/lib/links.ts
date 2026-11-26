// Đường dẫn giữa hai trang. BASE_URL theo `base` trong vite.config.ts (đang là './'),
// nên chạy được cả khi deploy GitHub Pages dưới thư mục tên repo.
const BASE = import.meta.env.BASE_URL

/** Trang đặt trước riêng (dat-truoc.html) */
export const PREORDER_URL = `${BASE}dat-truoc.html`

/** Một mục trên trang chủ, dùng từ trang khác (vd. trang đặt trước) */
export const homeHref = (id?: string) => (id ? `${BASE}#${id}` : BASE)
