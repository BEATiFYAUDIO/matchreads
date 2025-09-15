import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use "/" in dev, "/matchreads/" only for production builds (GitHub Pages)
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/matchreads/' : '/',
}))
