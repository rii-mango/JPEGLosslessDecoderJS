import fs from 'fs'
import { describe, it, assert } from 'vitest'
import { Utils, Decoder } from '../src/main.js'
import { toArrayBuffer } from './utils.js'

// A 16 bit lossless scan with a point transform of 2, from cornerstone3D#757.
// Every other fixture in this suite has Al = 0, which is why ignoring the point
// transform went unnoticed: this frame decoded 24576 too high and with a quarter
// of its dynamic range, so it rendered as a flat white image.
const jpegDataOffset = 2916
const jpegDataSize = 7556340
const buf = fs.readFileSync('./tests/data/jpeg_lossless_sel1-pt2.dcm')
const data = toArrayBuffer(buf)
const decoder = new Decoder()
const output = decoder.decompress(data, jpegDataOffset, jpegDataSize)
const samples = new Uint16Array(output)

let smallest = Infinity
let largest = -Infinity
for (let i = 0; i < samples.length; i += 1) {
  if (samples[i] < smallest) smallest = samples[i]
  if (samples[i] > largest) largest = samples[i]
}

describe('driver-point-transform', function () {
  it('dimX should equal 3021', function () {
    assert.equal(3021, decoder.frame.dimX)
  })

  it('dimY should equal 2467', function () {
    assert.equal(2467, decoder.frame.dimY)
  })

  it('number of components should be 1', function () {
    assert.equal(1, decoder.frame.numComp)
  })

  it('precision should be 16 and the point transform 2', function () {
    assert.equal(16, decoder.frame.precision)
    assert.equal(2, decoder.scan.al)
  })

  it('decompressed size should be 14905614', function () {
    assert.equal(14905614, output.byteLength)
  })

  // The three assertions below are ground truth from outside this library:
  // the DICOM header of the file, and independent decodes by Weasis 4.7.2 and
  // by imagecodecs' jpegsof3 (whose raw output matches these values once
  // shifted left by Al).
  it('smallest sample should match the file SmallestImagePixelValue of 8192', function () {
    assert.equal(8192, smallest)
  })

  it('largest sample should stay within the file LargestImagePixelValue of 24575', function () {
    assert.equal(24148, largest)
    assert.isAtMost(largest, 24575)
  })

  it('sample at (365, 324) should equal 19768, as Weasis reports', function () {
    assert.equal(19768, samples[324 * 3021 + 365])
  })

  it('data checksum should equal 2003526094', function () {
    const checksum = Utils.crc32(output)
    assert.equal(checksum, 2003526094)
  })
})
