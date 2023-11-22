import fs from 'fs'
import { describe, it, assert } from 'vitest'
import { Utils, Decoder } from '../src/main.js'
import { toArrayBuffer } from './utils.js'

const jpegDataOffset = 1848
const jpegDataSize = 47747 - jpegDataOffset
const buf = fs.readFileSync('./tests/data/jpeg_lossless_sel5.dcm')
const data = toArrayBuffer(buf)
const decoder = new Decoder()
const output = decoder.decompress(data, jpegDataOffset, jpegDataSize)

describe('driver-sel5', function () {
  it('dimX should equal 256', function () {
    assert.equal(256, decoder.frame.dimX)
  })

  it('dimY should equal 256', function () {
    assert.equal(256, decoder.frame.dimY)
  })

  it('number of components should be 1', function () {
    assert.equal(1, decoder.frame.numComp)
  })

  it('decompressed size should be 131072', function () {
    assert.equal(131072, output.byteLength)
  })

  it('data checksum should equal 3476557349', function () {
    const checksum = Utils.crc32(output)
    assert.equal(checksum, 3476557349)
  })
})
