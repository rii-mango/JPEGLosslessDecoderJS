import { describe, expect, it } from 'vitest'

// @ts-expect-error -- types will not be found this way, which is fine for this test
import esmLibrary from '..'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cjsLibrary = require('..')

describe('bundling', () => {
  it('commonjs export should work', () => {
    expect(cjsLibrary.Decoder).toBeDefined()
  })

  it('es module should work', () => {
    expect(esmLibrary.Decoder).toBeDefined()
  })
})
