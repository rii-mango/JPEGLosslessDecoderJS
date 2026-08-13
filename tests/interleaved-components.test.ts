import { describe, it, assert } from 'vitest'
import { Decoder } from '../src/main.js'

/**
 * Builds a minimal multi component lossless JPEG, so interleaved scans can be
 * exercised without shipping a binary fixture.
 *
 * The Huffman table holds two DC codes: symbol 0 as '0' and symbol 1 as '10'.
 * `withAcTable` additionally declares an AC table holding no codes, which is
 * what the file in cornerstone3D#1116 carries and what used to break decoding.
 */
const buildLosslessJPEG = ({
  precision,
  width,
  height,
  components,
  entropy,
  withAcTable = false,
}: {
  precision: number
  width: number
  height: number
  components: number
  entropy: number[]
  withAcTable?: boolean
}) => {
  const bytes: number[] = []
  const push16 = (v: number) => bytes.push((v >> 8) & 0xff, v & 0xff)
  const bits = new Array(16).fill(0)
  bits[0] = 1 // one code of length 1 -> symbol 0
  bits[1] = 1 // one code of length 2 -> symbol 1

  bytes.push(0xff, 0xd8) // SOI

  bytes.push(0xff, 0xc4) // DHT
  push16(2 + (1 + 16 + 2) + (withAcTable ? 1 + 16 : 0))
  bytes.push(0x00, ...bits, 0x00, 0x01) // Tc = 0 (DC), Th = 0, HUFFVAL 0 and 1
  if (withAcTable) {
    bytes.push(0x10, ...new Array(16).fill(0)) // Tc = 1 (AC), Th = 0, no codes
  }

  bytes.push(0xff, 0xc3) // SOF3, lossless huffman
  push16(8 + 3 * components)
  bytes.push(precision)
  push16(height)
  push16(width)
  bytes.push(components)
  for (let c = 0; c < components; c++) {
    bytes.push(c, 0x11, 0) // Ci, H/V = 1/1, Tq = 0
  }

  bytes.push(0xff, 0xda) // SOS
  push16(6 + 2 * components)
  bytes.push(components)
  for (let c = 0; c < components; c++) {
    bytes.push(c, 0x00) // Cs, Td/Ta = 0
  }
  bytes.push(1, 0, 0) // Ss = 1 (predictor 1), Se = 0, Ah/Al = 0

  bytes.push(...entropy)
  bytes.push(0xff, 0xd9) // EOI

  return Uint8Array.from(bytes)
}

// Two pixels of three components each:
//   pixel 0: comp 0 SSSS = 0 -> stays on the 128 seed
//            comp 1 SSSS = 1, magnitude bit 1 -> 129
//            comp 2 SSSS = 1, magnitude bit 0 -> 127
//   pixel 1: every component SSSS = 0 -> each keeps its own left neighbour
// Bits '0' '101' '100' '0' '0' '0', padded with ones.
const entropy = [0x58, 0x3f]

const decode = (withAcTable: boolean) => {
  const jpeg = buildLosslessJPEG({
    precision: 8,
    width: 2,
    height: 1,
    components: 3,
    entropy,
    withAcTable,
  })
  const decoder = new Decoder()
  const output = decoder.decompress(jpeg.buffer, 0, jpeg.length)

  return { decoder, samples: Array.from(new Uint8Array(output)) }
}

describe('interleaved multi component lossless scans', function () {
  it('decodes every component, each predicting from its own neighbours', function () {
    const { decoder, samples } = decode(false)

    assert.equal(3, decoder.frame.numComp)
    assert.equal(3, decoder.scan.numComp)
    assert.deepEqual(samples, [128, 129, 127, 128, 129, 127])
  })

  it('decodes the same when the scan declares an empty AC table', function () {
    // cornerstone3D#1116: decodeRGB used to be a copy of the baseline DCT path,
    // reading 63 AC coefficients per block against the AC Huffman table. That
    // stayed harmless only while no AC table existed, so the lookup terminated
    // at once. A file that declares one - as this ultrasound did - had its
    // entropy stream read out of step, and components 2 and 3 came back stuck
    // at the initial prediction of 128.
    const { samples } = decode(true)

    assert.deepEqual(samples, [128, 129, 127, 128, 129, 127])
  })
})
