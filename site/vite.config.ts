import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages: asset dùng đường dẫn tương đối nên không phụ thuộc tên repo
export default defineConfig({ base: './', plugins: [react(), tailwindcss()] })
