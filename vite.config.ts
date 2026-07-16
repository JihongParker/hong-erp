import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 프로젝트 사이트는 /<repo>/ 하위 경로에서 서빙된다.
// CI(deploy.yml)가 VITE_BASE를 주입하고, 로컬 dev는 '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  define: {
    // build-time certification date, surfaced in the Overview proof strip
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react()],
})
