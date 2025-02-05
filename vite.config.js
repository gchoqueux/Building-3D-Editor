import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: "/Building-3D-Editor/",
  build: {
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['regenerator-runtime/runtime'],
    },
  },
  server: {
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline';"
    }
  },
  preview: {
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline';"
    }
  }
})