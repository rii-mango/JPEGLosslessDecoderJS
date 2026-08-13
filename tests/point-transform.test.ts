import { describe, it, assert } from 'vitest'
import { Decoder } from '../src/main.js'

/**
 * Builds a minimal single component lossless JPEG, so a point transform can be
 * exercised without shipping a binary fixture.
 *
 * The Huffman table holds two codes: symbol 0 as '0' and symbol 1 as '10',
 * which is enough to encode the SSSS categories these cases need.
 */
const buildLosslessJPEG = ({
  precision,
  width,
  height,
  pointTransform,
  entropy,
}: {
  precision: number
  width: number
  height: number
  pointTransform: number
  entropy: number[]
}) => {
  const bytes: number[] = []
  const push16 = (v: number) => bytes.push((v >> 8) & 0xff, v & 0xff)

  bytes.push(0xff, 0xd8) // SOI

  bytes.push(0xff, 0xc4) // DHT
  push16(2 + 1 + 16 + 2)
  bytes.push(0x00) // Tc = 0 (DC), Th = 0
  const bits = new Array(16).fill(0)
  bits[0] = 1 // one code of length 1 -> symbol 0
  bits[1] = 1 // one code of length 2 -> symbol 1
  bytes.push(...bits)
  bytes.push(0x00, 0x01) // HUFFVAL

  bytes.push(0xff, 0xc3) // SOF3, lossless huffman
  push16(8 + 3)
  bytes.push(precision)
  push16(height)
  push16(width)
  bytes.push(1) // Nf
  bytes.push(1, 0x11, 0) // C = 1, H/V = 1/1, Tq = 0

  bytes.push(0xff, 0xda) // SOS
  push16(6 + 2)
  bytes.push(1) // Ns
  bytes.push(1, 0x00) // Cs = 1, Td/Ta = 0
  bytes.push(1, 0, pointTransform & 0x0f) // Ss = 1 (predictor 1), Se = 0, Ah/Al

  bytes.push(...entropy)
  bytes.push(0xff, 0xd9) // EOI

  return Uint8Array.from(bytes)
}

// Two samples: the first codes SSSS = 0 ('0', difference 0) so it lands on the
// initial prediction, the second codes SSSS = 1 ('10' plus magnitude bit '1',
// difference +1). Bits '0' '10' '1' padded with ones is 0x5f.
const entropy = [0x5f]

const decode = (precision: number, pointTransform: number) => {
  const jpeg = buildLosslessJPEG({
    precision,
    width: 2,
    height: 1,
    pointTransform,
    entropy,
  })
  const decoder = new Decoder()
  const output = decoder.decompress(jpeg.buffer, 0, jpeg.length)

  return {
    decoder,
    samples: Array.from(precision > 8 ? new Uint16Array(output) : new Uint8Array(output)),
  }
}

describe('point transform (T.81 A.4.1)', function () {
  it('parses Al out of the scan header', function () {
    const { decoder } = decode(8, 1)
    assert.equal(decoder.scan.al, 1)
    assert.equal(decoder.getPointTransform(), 1)
  })

  it('seeds the prediction with 2^(P - Pt - 1) and scales the output back up', function () {
    // Seed is 2^(8 - 1 - 1) = 64, second sample 65, both shifted left by 1.
    // Ignoring Al gave [128, 129]: right for a flat frame, but the differences
    // keep only half their amplitude, so the frame loses dynamic range.
    const { samples } = decode(8, 1)
    assert.deepEqual(samples, [128, 130])
  })

  it('handles a larger point transform', function () {
    // Seed 2^(8 - 2 - 1) = 32, second sample 33, both shifted left by 2
    const { samples } = decode(8, 2)
    assert.deepEqual(samples, [128, 132])
  })

  it('is a no-op when there is no point transform', function () {
    // Seed 2^(8 - 1) = 128, no shift
    const { samples } = decode(8, 0)
    assert.deepEqual(samples, [128, 129])
  })

  it('applies to 16 bit frames', function () {
    // Seed 2^(16 - 2 - 1) = 8192, second sample 8193, both shifted left by 2.
    // This is the shape of the DICOM frame in cornerstone3D#757: a 16 bit
    // lossless scan with Al = 2, which decoded 24576 high with a quarter of its
    // dynamic range.
    const { samples } = decode(16, 2)
    assert.deepEqual(samples, [32768, 32772])
  })
})
