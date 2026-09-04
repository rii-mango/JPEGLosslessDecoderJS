import fs from 'fs'
import { describe, it, assert } from 'vitest'
import { Utils, Decoder } from '../src/main.js'
import { toArrayBuffer } from './utils.js'

/**
 * A scan whose entropy coded segment ends exactly on a byte boundary.
 *
 * The frame is the single encapsulated fragment of
 * `CTImage.dcm_JPEGProcess14SV1TransferSyntax_1.2.840.10008.1.2.4.70.dcm`
 * (cornerstone3D `packages/dicomImageLoader/testImages`): 512x512, 16 bit
 * signed, one component, process 14 selection value 1, point transform 0,
 * written by DCMTK 3.6.1.
 *
 * It ends in a long run of the image minimum (-2000, air). A run of equal
 * samples is a run of zero differences, and this table codes a zero difference
 * in two bits, so the run tiles the last byte exactly and the encoder had no
 * partial byte left to pad - EOI follows the final code with no padding bits in
 * between. The decoder used to treat that as having read into the marker and
 * dropped the last sample, leaving it 0 instead of -2000. Every other sample
 * was already correct, so the assertion that matters is the last one; the
 * checksum guards the rest of the frame against a regression that shifts it.
 */
const buf = fs.readFileSync('./tests/data/jpeg_lossless_sel1-byte-aligned-end.jpg')
const decoder = new Decoder()
const output = decoder.decode(toArrayBuffer(buf), 0, buf.length)
const samples = new Int16Array(output.buffer, output.byteOffset, output.byteLength / 2)

describe('byte-aligned-end', function () {
  it('dimX should equal 512', function () {
    assert.equal(512, decoder.frame.dimX)
  })

  it('dimY should equal 512', function () {
    assert.equal(512, decoder.frame.dimY)
  })

  it('number of components should be 1', function () {
    assert.equal(1, decoder.frame.numComp)
  })

  it('point transform should be 0', function () {
    // So this frame is not confused with the point transform handling that is
    // its own fix - the last sample is wrong here with Al 0.
    assert.equal(0, decoder.scan.al)
  })

  it('decompressed size should be 524288', function () {
    assert.equal(524288, output.byteLength)
  })

  it('the last sample should be decoded, not left at 0', function () {
    assert.equal(-2000, samples[samples.length - 1])
  })

  it('data checksum should equal 2510355201', function () {
    // crc32 of the pixel data of the uncompressed CTImage.dcm this was encoded
    // from, so the whole frame is checked against ground truth, not against
    // whatever this decoder happens to produce.
    assert.equal(Utils.crc32(output.buffer), 2510355201)
  })
})
