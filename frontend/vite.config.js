import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'public/' dir contents are copied to dist/ verbatim on build.
  // vercel.json lives here so drag-and-drop deploys include the SPA rewrite rule.
  publicDir: 'public',
})
