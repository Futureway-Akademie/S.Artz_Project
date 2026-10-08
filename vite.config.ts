/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { contentSecurityPolicy } from './csp.config.ts'

// Tests laufen in Europe/Berlin, damit Datumslogik deterministisch ist.
process.env.TZ = 'Europe/Berlin'

export default defineConfig(({ mode }) => {
  // Supabase-Adresse und Google-Client-ID aus .env.local (nicht im Repository); ohne sie bleibt connect-src 'none'
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [
      react(),
      {
        name: 'content-security-policy',
        apply: 'build',
        transformIndexHtml: () => [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(env.VITE_SUPABASE_URL || undefined, { gmail: Boolean(env.VITE_GOOGLE_CLIENT_ID) }) },
            injectTo: 'head-prepend',
          },
        ],
      },
    ],
    build: {
      rolldownOptions: {
        output: {
          // Bibliotheken (React, zod …) getrennt vom App-Code: kleinere Pakete, besseres Caching
          advancedChunks: { groups: [{ name: 'bibliotheken', test: /node_modules[\\/](react|react-dom|react-router|scheduler|zod)[\\/]/ }] },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  }
})
