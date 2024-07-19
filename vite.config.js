import { defineConfig } from "vite"

export default defineConfig({
    base : '/3D-Viewer/',
    build:{
      rollupOptions:{
        external:['regenerator-runtime/runtime']
      }
    }
  })