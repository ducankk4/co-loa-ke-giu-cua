import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const page = (f: string) => fileURLToPath(new URL(f, import.meta.url))

// GitHub Pages: asset dùng đường dẫn tương đối nên không phụ thuộc tên repo
// Hai trang: trang chủ (index.html) và trang đặt trước riêng (dat-truoc.html)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: { main: page('./index.html'), preorder: page('./dat-truoc.html') },
    },
  },
})
