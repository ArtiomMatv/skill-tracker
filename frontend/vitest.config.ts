import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vitest bundles a different Vite major than the app; types disagree on Plugin shape.
  plugins: [react()] as unknown as import('vitest/config').UserConfig['plugins'],
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/setupTests.ts')],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
