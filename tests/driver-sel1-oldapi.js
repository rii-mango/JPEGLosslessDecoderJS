import fs from 'fs'
import assert from 'assert'
import { Utils, Decoder } from '../src/main.js'
import { toArrayBuffer } from './utils.js'

const jpegDataOffset = 1848
const jpegDataSize = 50675 - jpegDataOffset

const buf = Buffer.alloc(jpegDataSize)

const fd = fs.openSync('./tests/data/jpeg_lossless_sel1.dcm', 'r')
fs.readSync(fd, buf, 0, buf.length, jpegDataOffset)
const data = toArrayBuffer(buf)
const decoder = new Decoder(data)
const output = decoder.decode()

describe('driver-sel1-oldapi', function () {
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
