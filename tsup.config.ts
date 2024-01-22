import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'build',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true
})
