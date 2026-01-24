import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite" // Required for Tailwind v4

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: '/conspiracy-card-game/', // Ensure your GitHub repo is named exactly this
})