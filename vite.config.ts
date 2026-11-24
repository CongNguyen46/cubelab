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
  build: {
    // The 3D scene is a lazy chunk, loaded after first paint. three.js alone is about 700 kB
    // minified, so that chunk cannot get under Vite's default 500 kB. NFR-2 is about the
    // initial bundle (about 75 kB gzipped), which is unaffected. Raise this only with a reason.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // The gate covers the engine only (NFR-10). Renderer and UI get their own checks.
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/**/*.test.ts', 'src/solver/vendor/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
})
