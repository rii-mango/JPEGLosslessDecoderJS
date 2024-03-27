import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      lossless: 'src/main.ts'
    },
    outExtension: () => ({
      js: '.js'
    }),
    outDir: 'release',
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true
  },
  {
    entry: {
      'lossless-min': 'src/main.ts'
    },
    outExtension: () => ({
      js: '.js'
    }),
    outDir: 'release',
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    dts: true
  }
])
