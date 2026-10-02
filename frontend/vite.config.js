import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GH_PAGES=true se activa solo desde el workflow de despliegue (ver
// .github/workflows/deploy-demo.yml), para que `npm run dev` en local
// siga sirviendo en la raíz (/) sin tener que tocar nada.
export default defineConfig({
  base: process.env.GH_PAGES ? '/diario-reflexivo/' : '/',
  plugins: [react()],
  server: { port: 5173 },
})
