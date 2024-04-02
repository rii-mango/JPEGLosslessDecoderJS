import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      lossless: 'src/main.ts'
    },
    outExtension: () => ({
      js: '.js'
    }),
    target: 'esnext',
    format: 'esm',
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
    target: 'esnext',
    format: 'esm',
    outDir: 'release',
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    dts: true
  },
  {
    entry: {
      lossless: 'src/main.ts'
    },
    target: 'esnext',
    format: 'cjs',
    outDir: 'release/cjs',
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true
  }
])
