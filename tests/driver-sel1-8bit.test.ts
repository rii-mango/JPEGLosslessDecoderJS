import fs from 'fs'
import { describe, it, assert } from 'vitest'
import { Utils, Decoder } from '../src/main.js'
import { toArrayBuffer } from './utils.js'

const jpegDataOffset = 1070
const jpegDataSize = 74137
const buf = fs.readFileSync('./tests/data/jpeg_lossless_sel1-8bit.dcm')
const data = toArrayBuffer(buf)
const decoder = new Decoder()
const output = decoder.decompress(data, jpegDataOffset, jpegDataSize)

describe('driver-sel1-8bit', function () {
  it('dimX should equal 512', function () {
    assert.equal(512, decoder.frame.dimX)
  })

  it('dimY should equal 512', function () {
    assert.equal(512, decoder.frame.dimY)
  })

  it('number of components should be 1', function () {
    assert.equal(1, decoder.frame.numComp)
  })

  it('decompressed size should be 262144', function () {
    assert.equal(262144, output.byteLength)
  })

  it('data checksum should equal 2307286885', function () {
    const checksum = Utils.crc32(output)
    assert.equal(checksum, 2307286885)
  })
})
