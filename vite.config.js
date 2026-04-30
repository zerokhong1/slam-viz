import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: base = '/<repo-name>/'
// Đổi 'slam-viz' thành tên repo thực tế nếu khác
export default defineConfig({
  plugins: [react()],
  base: '/slam-viz/',
})
