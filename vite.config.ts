import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

const prototypeFile = resolve(import.meta.dirname, 'prototype/index.html')

// Serves prototype/index.html untouched at /prototype/, in dev and in the build.
// Vite never parses it, so the approved design stays exactly as it was signed off.
function prototype(): Plugin {
  return {
    name: 'cubelab-prototype',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path === '/prototype') {
          res.statusCode = 301
          res.setHeader('Location', '/prototype/')
          res.end()
          return
        }
        if (path !== '/prototype/' && path !== '/prototype/index.html') return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(prototypeFile))
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'prototype/index.html',
        source: readFileSync(prototypeFile),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), prototype()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
