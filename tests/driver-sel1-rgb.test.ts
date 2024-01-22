import fs from 'fs'
import { describe, it, assert } from 'vitest'
import { Utils, Decoder } from '../src/main.js'
import { toArrayBuffer } from './utils.js'

const jpegDataOffset = 1504
const jpegDataSize = 4682072
const buf = fs.readFileSync('./tests/data/jpeg_lossless_sel1-rgb.dcm')
const data = toArrayBuffer(buf)
const decoder = new Decoder()
const output = decoder.decompress(data, jpegDataOffset, jpegDataSize)

describe('driver-sel1-rgb', function () {
  it('dimX should equal 3072', function () {
    assert.equal(3072, decoder.frame.dimX)
  })

  it('dimY should equal 2048', function () {
    assert.equal(2048, decoder.frame.dimY)
  })

  it('number of components should be 3', function () {
    assert.equal(3, decoder.frame.numComp)
  })

  it('decompressed size should be 18874368', function () {
    assert.equal(18874368, output.byteLength)
  })

  it('data checksum should equal 1560195967', function () {
    const checksum = Utils.crc32(output)
    assert.equal(checksum, 1560195967)
  })
})
