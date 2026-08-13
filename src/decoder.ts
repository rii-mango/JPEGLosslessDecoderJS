import { ComponentSpec } from './component-spec.js'
import { DataStream } from './data-stream.js'
import { FrameHeader } from './frame-header.js'
import { HuffmanTable } from './huffman-table.js'
import { QuantizationTable } from './quantization-table.js'
import { ScanHeader } from './scan-header.js'
import { createArray } from './utils.js'

const littleEndian = (function () {
  const buffer = new ArrayBuffer(2)
  new DataView(buffer).setInt16(0, 256, true /* littleEndian */)
  // Int16Array uses the platform's endianness.
  return new Int16Array(buffer)[0] === 256
})()

export class Decoder {
  static IDCT_P = [
    0, 5, 40, 16, 45, 2, 7, 42, 21, 56, 8, 61, 18, 47, 1, 4, 41, 23, 58, 13, 32, 24, 37, 10, 63, 17, 44, 3, 6, 43, 20,
    57, 15, 34, 29, 48, 53, 26, 39, 9, 60, 19, 46, 22, 59, 12, 33, 31, 50, 55, 25, 36, 11, 62, 14, 35, 28, 49, 52, 27,
    38, 30, 51, 54
  ]

  static TABLE = [
    0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44,
    53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49,
    57, 58, 62, 63
  ]

  static MAX_HUFFMAN_SUBTREE = 50
  static MSB = 0x80000000
  static RESTART_MARKER_BEGIN = 0xffd0
  static RESTART_MARKER_END = 0xffd7

  buffer: ArrayBuffer | null = null
  stream: DataStream | null = null
  frame = new FrameHeader()
  huffTable = new HuffmanTable()
  quantTable = new QuantizationTable()
  scan = new ScanHeader()
  DU: number[][][] = createArray(10, 4, 64) as number[][][] // at most 10 data units in a MCU, at most 4 data units in one component
  HuffTab: number[][][] = createArray(4, 2, 50 * 256) as number[][][]
  IDCT_Source: number[] = []
  nBlock: number[] = [] // number of blocks in the i-th Comp in a scan
  acTab: number[][] = createArray(10, 1) as number[][] // ac HuffTab for the i-th Comp in a scan
  dcTab: number[][] = createArray(10, 1) as number[][] // dc HuffTab for the i-th Comp in a scan
  qTab: number[][] = createArray(10, 1) as number[][] // quantization table for the i-th Comp in a scan
  marker = 0
  markerIndex = 0
  numComp = 0
  restartInterval = 0
  selection = 0
  xDim = 0
  yDim = 0
  xLoc = 0
  yLoc = 0
  outputData: Uint8Array | Uint16Array | null = null
  restarting = false
  mask = 0
  numBytes = 0

  precision: number | undefined = undefined
  components: Array<typeof ComponentSpec> = []

  getter: null | ((index: number, compOffset: number) => number) = null
  setter: null | ((index: number, val: number, compOffset?: number) => void) = null
  output: null | ((PRED: number[]) => void) = null
  selector: null | ((compOffset?: number) => number) = null

  /**
   * The Decoder constructor.
   * @property {number} numBytes - number of bytes per component
   * @type {Function}
   */
  constructor(buffer?: ArrayBuffer | null, numBytes?: number) {
    this.buffer = buffer ?? null
    this.numBytes = numBytes ?? 0
  }

  /**
   * Returns decompressed data.
   */
  decompress(buffer: ArrayBuffer, offset: number, length: number): ArrayBuffer {
    const result = this.decode(buffer, offset, length)
    return result.buffer
  }

  decode(buffer?: ArrayBuffer, offset?: number, length?: number, numBytes?: number) {
    let scanNum = 0
    const pred = []
    let i
    let compN
    const temp = []
    const index = []
    let mcuNum

    if (buffer) {
      this.buffer = buffer
    }

    if (numBytes !== undefined) {
      this.numBytes = numBytes
    }

    this.stream = new DataStream(this.buffer as ArrayBuffer, offset, length)
    this.buffer = null

    this.xLoc = 0
    this.yLoc = 0
    let current = this.stream.get16()

    if (current !== 0xffd8) {
      // SOI
      throw new Error('Not a JPEG file')
    }

    current = this.stream.get16()

    while (current >> 4 !== 0x0ffc || current === 0xffc4) {
      // SOF 0~15
      switch (current) {
        case 0xffc4: // DHT
          this.huffTable.read(this.stream, this.HuffTab)
          break
        case 0xffcc: // DAC
          throw new Error("Program doesn't support arithmetic coding. (format throw new IOException)")
        case 0xffdb:
          this.quantTable.read(this.stream, Decoder.TABLE)
          break
        case 0xffdd:
          this.restartInterval = this.readNumber() ?? 0
          break
        case 0xffe0:
        case 0xffe1:
        case 0xffe2:
        case 0xffe3:
        case 0xffe4:
        case 0xffe5:
        case 0xffe6:
        case 0xffe7:
        case 0xffe8:
        case 0xffe9:
        case 0xffea:
        case 0xffeb:
        case 0xffec:
        case 0xffed:
        case 0xffee:
        case 0xffef:
          this.readApp()
          break
        case 0xfffe:
          this.readComment()
          break
        default:
          if (current >> 8 !== 0xff) {
            throw new Error('ERROR: format throw new IOException! (decode)')
          }
      }

      current = this.stream.get16()
    }

    if (current < 0xffc0 || current > 0xffc7) {
      throw new Error('ERROR: could not handle arithmetic code!')
    }

    this.frame.read(this.stream)
    current = this.stream.get16()

    do {
      while (current !== 0x0ffda) {
        // SOS
        switch (current) {
          case 0xffc4: // DHT
            this.huffTable.read(this.stream, this.HuffTab)
            break
          case 0xffcc: // DAC
            throw new Error("Program doesn't support arithmetic coding. (format throw new IOException)")
          case 0xffdb:
            this.quantTable.read(this.stream, Decoder.TABLE)
            break
          case 0xffdd:
            this.restartInterval = this.readNumber() ?? 0
            break
          case 0xffe0:
          case 0xffe1:
          case 0xffe2:
          case 0xffe3:
          case 0xffe4:
          case 0xffe5:
          case 0xffe6:
          case 0xffe7:
          case 0xffe8:
          case 0xffe9:
          case 0xffea:
          case 0xffeb:
          case 0xffec:
          case 0xffed:
          case 0xffee:
          case 0xffef:
            this.readApp()
            break
          case 0xfffe:
            this.readComment()
            break
          default:
            if (current >> 8 !== 0xff) {
              throw new Error('ERROR: format throw new IOException! (Parser.decode)')
            }
        }

        current = this.stream.get16()
      }

      this.precision = this.frame.precision
      this.components = this.frame.components

      if (!this.numBytes) {
        this.numBytes = Math.round(Math.ceil(this.precision / 8))
      }

      if (this.numBytes === 1) {
        this.mask = 0xff
      } else {
        this.mask = 0xffff
      }

      this.scan.read(this.stream)
      this.numComp = this.scan.numComp
      this.selection = this.scan.selection

      // How many components the scan carries decides the layout, not how wide a
      // sample is: `decodeUnit` dispatches on numComp alone, so a 16 bit colour
      // scan used to decode three components and write them through the single
      // component output, which only ever wrote the first
      if (this.numComp === 3) {
        this.getter = this.getValueRGB
        this.setter = this.setValueRGB
        this.output = this.outputRGB
      } else {
        this.getter = this.getValue8
        this.setter = this.setValue8
        this.output = this.outputSingle
      }

      switch (this.selection) {
        case 2:
          this.selector = this.select2
          break
        case 3:
          this.selector = this.select3
          break
        case 4:
          this.selector = this.select4
          break
        case 5:
          this.selector = this.select5
          break
        case 6:
          this.selector = this.select6
          break
        case 7:
          this.selector = this.select7
          break
        default:
          this.selector = this.select1
          break
      }

      // this.scanComps = this.scan.components
      // this.quantTables = this.quantTable.quantTables

      for (i = 0; i < this.numComp; i += 1) {
        compN = this.scan.components[i].scanCompSel
        this.qTab[i] = this.quantTable.quantTables[this.components[compN].quantTableSel]
        this.nBlock[i] = this.components[compN].vSamp * this.components[compN].hSamp
        this.dcTab[i] = this.HuffTab[this.scan.components[i].dcTabSel][0]
        this.acTab[i] = this.HuffTab[this.scan.components[i].acTabSel][1]
      }

      this.xDim = this.frame.dimX
      this.yDim = this.frame.dimY
      if (this.numBytes === 1) {
        this.outputData = new Uint8Array(new ArrayBuffer(this.xDim * this.yDim * this.numBytes * this.numComp))
      } else {
        this.outputData = new Uint16Array(new ArrayBuffer(this.xDim * this.yDim * this.numBytes * this.numComp))
      }

      scanNum += 1

      while (true) {
        // Decode one scan
        temp[0] = 0
        index[0] = 0

        for (i = 0; i < 10; i += 1) {
          pred[i] = this.initialPrediction()
        }

        if (this.restartInterval === 0) {
          current = this.decodeUnit(pred, temp, index)

          while (current === 0 && this.xLoc < this.xDim && this.yLoc < this.yDim) {
            this.output(pred)
            current = this.decodeUnit(pred, temp, index)
          }

          break // current=MARKER
        }

        for (mcuNum = 0; mcuNum < this.restartInterval; mcuNum += 1) {
          this.restarting = mcuNum === 0
          current = this.decodeUnit(pred, temp, index)
          this.output(pred)

          if (current !== 0) {
            break
          }
        }

        if (current === 0) {
          if (this.markerIndex !== 0) {
            current = 0xff00 | this.marker
            this.markerIndex = 0
          } else {
            current = this.stream.get16()
          }
        }

        if (!(current >= Decoder.RESTART_MARKER_BEGIN && current <= Decoder.RESTART_MARKER_END)) {
          break // current=MARKER
        }
      }

      if (current === 0xffdc && scanNum === 1) {
        // DNL
        this.readNumber()
        current = this.stream.get16()
      }
    } while (current !== 0xffd9 && this.xLoc < this.xDim && this.yLoc < this.yDim && scanNum === 0)

    this.applyPointTransform()

    return this.outputData
  }

  /**
   * The point transform Al (T.81 A.4, the low order bits the encoder discarded
   * before encoding).
   */
  getPointTransform(): number {
    return this.scan.al
  }

  /**
   * Prediction for the first sample of a scan, and for the first sample after a
   * restart marker: 2^(P - Pt - 1) per T.81 H.1.2.1. Seeding with 2^(P - 1)
   * instead offsets every sample of the frame, because lossless prediction
   * chains additively from this value.
   */
  initialPrediction(): number {
    return 1 << (this.frame.precision - this.getPointTransform() - 1)
  }

  /**
   * Scales the decoded samples back up by the point transform. The encoder
   * right shifted them by Al before encoding (T.81 A.4.1), so a frame decoded
   * without this keeps only 1/2^Al of its dynamic range.
   *
   * This runs once the whole frame is decoded rather than in `setValue`,
   * because prediction reads previously decoded samples back out of
   * `outputData` and those reads have to stay in the point transformed domain
   * the arithmetic runs in.
   */
  applyPointTransform(): void {
    const pointTransform = this.getPointTransform()

    if (!pointTransform || !this.outputData) {
      return
    }

    for (let i = 0; i < this.outputData.length; i += 1) {
      this.outputData[i] = this.outputData[i] << pointTransform
    }
  }

  decodeUnit(prev: number[], temp: number[], index: number[]): number {
    if (this.numComp === 1) {
      return this.decodeSingle(prev, temp, index)
    } else if (this.numComp === 3) {
      return this.decodeRGB(prev, temp, index)
    } else {
      return -1
    }
  }

  select1(compOffset?: number) {
    return this.getPreviousX(compOffset)
  }

  select2(compOffset?: number) {
    return this.getPreviousY(compOffset)
  }

  select3(compOffset?: number) {
    return this.getPreviousXY(compOffset)
  }

  select4(compOffset?: number) {
    return this.getPreviousX(compOffset) + this.getPreviousY(compOffset) - this.getPreviousXY(compOffset)
  }

  select5(compOffset?: number) {
    return this.getPreviousX(compOffset) + ((this.getPreviousY(compOffset) - this.getPreviousXY(compOffset)) >> 1)
  }

  select6(compOffset?: number) {
    return this.getPreviousY(compOffset) + ((this.getPreviousX(compOffset) - this.getPreviousXY(compOffset)) >> 1)
  }

  select7(compOffset?: number) {
    return (this.getPreviousX(compOffset) + this.getPreviousY(compOffset)) / 2
  }

  /**
   * Decodes one multi component sample of a lossless scan.
   *
   * This is `decodeSingle` applied to each component of an interleaved scan:
   * every component keeps its own prediction, taken from its own neighbours
   * through the selector, and contributes one Huffman coded difference per
   * sample.
   *
   * It used to be a copy of the baseline DCT path - it read 63 AC coefficients
   * per block against the AC Huffman table and multiplied by a quantization
   * table. A lossless scan carries none of that, so after the first component's
   * difference the entropy stream was read out of step and the remaining
   * components never decoded: a colour frame came out with components 2 and 3
   * stuck at the initial prediction (cornerstone3D#1116).
   */
  decodeRGB(prev: number[], temp: number[], index: number[]) {
    if (this.selector === null) throw new Error("decode hasn't run yet")

    let ctrC, i

    for (ctrC = 0; ctrC < this.numComp; ctrC += 1) {
      prev[ctrC] = this.restarting ? this.initialPrediction() : this.selector(ctrC)
    }

    this.restarting = false

    for (ctrC = 0; ctrC < this.numComp; ctrC += 1) {
      for (i = 0; i < this.nBlock[ctrC]; i += 1) {
        const value = this.getHuffmanValue(this.dcTab[ctrC], temp, index)

        if (value >= 0xff00) {
          return value
        }

        const n = this.getn(prev, value, temp, index, ctrC)
        const nRestart = n >> 8

        if (nRestart >= Decoder.RESTART_MARKER_BEGIN && nRestart <= Decoder.RESTART_MARKER_END) {
          return nRestart
        }

        prev[ctrC] += n
      }
    }

    return 0
  }

  decodeSingle(prev: number[], temp: number[], index: number[]) {
    if (this.selector === null) throw new Error("decode hasn't run yet")

    let value, i, n, nRestart

    if (this.restarting) {
      this.restarting = false
      prev[0] = this.initialPrediction()
    } else {
      prev[0] = this.selector()
    }

    for (i = 0; i < this.nBlock[0]; i += 1) {
      value = this.getHuffmanValue(this.dcTab[0], temp, index)
      if (value >= 0xff00) {
        return value
      }

      n = this.getn(prev, value, temp, index)
      nRestart = n >> 8

      if (nRestart >= Decoder.RESTART_MARKER_BEGIN && nRestart <= Decoder.RESTART_MARKER_END) {
        return nRestart
      }

      prev[0] += n
    }

    return 0
  }

  //	Huffman table for fast search: (HuffTab) 8-bit Look up table 2-layer search architecture, 1st-layer represent 256 node (8 bits) if codeword-length > 8
  //	bits, then the entry of 1st-layer = (# of 2nd-layer table) | MSB and it is stored in the 2nd-layer Size of tables in each layer are 256.
  //	HuffTab[*][*][0-256] is always the only 1st-layer table.
  //
  //	An entry can be: (1) (# of 2nd-layer table) | MSB , for code length > 8 in 1st-layer (2) (Code length) << 8 | HuffVal
  //
  //	HuffmanValue(table   HuffTab[x][y] (ex) HuffmanValue(HuffTab[1][0],...)
  //	                ):
  //	    return: Huffman Value of table
  //	            0xFF?? if it receives a MARKER
  //	    Parameter:  table   HuffTab[x][y] (ex) HuffmanValue(HuffTab[1][0],...)
  //	                temp    temp storage for remainded bits
  //	                index   index to bit of temp
  //	                in      FILE pointer
  //	    Effect:
  //	        temp  store new remainded bits
  //	        index change to new index
  //	        in    change to new position
  //	    NOTE:
  //	      Initial by   temp=0; index=0;
  //	    NOTE: (explain temp and index)
  //	      temp: is always in the form at calling time or returning time
  //	       |  byte 4  |  byte 3  |  byte 2  |  byte 1  |
  //	       |     0    |     0    | 00000000 | 00000??? |  if not a MARKER
  //	                                               ^index=3 (from 0 to 15)
  //	                                               321
  //	    NOTE (marker and marker_index):
  //	      If get a MARKER from 'in', marker=the low-byte of the MARKER
  //	        and marker_index=9
  //	      If marker_index=9 then index is always > 8, or HuffmanValue()
  //	        will not be called
  getHuffmanValue(table: number[], temp: number[], index: number[]): number {
    let code, input
    const mask = 0xffff

    if (!this.stream) throw new Error('stream not initialized')

    if (index[0] < 8) {
      temp[0] <<= 8
      input = this.stream.get8()
      if (input === 0xff) {
        this.marker = this.stream.get8()
        if (this.marker !== 0) {
          this.markerIndex = 9
        }
      }
      temp[0] |= input
    } else {
      index[0] -= 8
    }

    code = table[temp[0] >> index[0]]

    if ((code & Decoder.MSB) !== 0) {
      if (this.markerIndex !== 0) {
        this.markerIndex = 0
        return 0xff00 | this.marker
      }

      temp[0] &= mask >> (16 - index[0])
      temp[0] <<= 8
      input = this.stream.get8()

      if (input === 0xff) {
        this.marker = this.stream.get8()
        if (this.marker !== 0) {
          this.markerIndex = 9
        }
      }

      temp[0] |= input
      code = table[(code & 0xff) * 256 + (temp[0] >> index[0])]
      index[0] += 8
    }

    index[0] += 8 - (code >> 8)

    if (index[0] < 0) {
      throw new Error('index=' + index[0] + ' temp=' + temp[0] + ' code=' + code + ' in HuffmanValue()')
    }

    if (index[0] < this.markerIndex) {
      this.markerIndex = 0
      return 0xff00 | this.marker
    }

    temp[0] &= mask >> (16 - index[0])
    return code & 0xff
  }

  getn(PRED: number[], n: number, temp: number[], index: number[], compOffset = 0) {
    let result, input
    const one = 1
    const n_one = -1
    const mask = 0xffff

    if (this.stream === null) throw new Error('stream not initialized')

    if (n === 0) {
      return 0
    }

    if (n === 16) {
      // Each component of an interleaved scan predicts from its own value
      if (PRED[compOffset] >= 0) {
        return -32768
      } else {
        return 32768
      }
    }

    index[0] -= n

    if (index[0] >= 0) {
      if (index[0] < this.markerIndex && !this.isLastPixel()) {
        // this was corrupting the last pixel in some cases
        this.markerIndex = 0
        return (0xff00 | this.marker) << 8
      }

      result = temp[0] >> index[0]
      temp[0] &= mask >> (16 - index[0])
    } else {
      temp[0] <<= 8
      input = this.stream.get8()

      if (input === 0xff) {
        this.marker = this.stream.get8()
        if (this.marker !== 0) {
          this.markerIndex = 9
        }
      }

      temp[0] |= input
      index[0] += 8

      if (index[0] < 0) {
        if (this.markerIndex !== 0) {
          this.markerIndex = 0
          return (0xff00 | this.marker) << 8
        }

        temp[0] <<= 8
        input = this.stream.get8()

        if (input === 0xff) {
          this.marker = this.stream.get8()
          if (this.marker !== 0) {
            this.markerIndex = 9
          }
        }

        temp[0] |= input
        index[0] += 8
      }

      if (index[0] < 0) {
        throw new Error('index=' + index[0] + ' in getn()')
      }

      if (index[0] < this.markerIndex) {
        this.markerIndex = 0
        return (0xff00 | this.marker) << 8
      }

      result = temp[0] >> index[0]
      temp[0] &= mask >> (16 - index[0])
    }

    if (result < one << (n - 1)) {
      result += (n_one << n) + 1
    }

    return result
  }

  getPreviousX(compOffset = 0): number {
    if (this.getter === null) throw new Error("decode hasn't run yet")

    if (this.xLoc > 0) {
      return this.getter(this.yLoc * this.xDim + this.xLoc - 1, compOffset)
    } else if (this.yLoc > 0) {
      return this.getPreviousY(compOffset)
    } else {
      return this.initialPrediction()
    }
  }

  getPreviousXY(compOffset = 0) {
    if (this.getter === null) throw new Error("decode hasn't run yet")

    if (this.xLoc > 0 && this.yLoc > 0) {
      return this.getter((this.yLoc - 1) * this.xDim + this.xLoc - 1, compOffset)
    } else {
      return this.getPreviousY(compOffset)
    }
  }

  getPreviousY(compOffset = 0) {
    if (this.getter === null) throw new Error("decode hasn't run yet")

    if (this.yLoc > 0) {
      return this.getter((this.yLoc - 1) * this.xDim + this.xLoc, compOffset)
    } else {
      return this.getPreviousX(compOffset)
    }
  }

  isLastPixel() {
    return this.xLoc === this.xDim - 1 && this.yLoc === this.yDim - 1
  }

  outputSingle(PRED: number[]) {
    if (this.setter === null) throw new Error("decode hasn't run yet")

    if (this.xLoc < this.xDim && this.yLoc < this.yDim) {
      this.setter(this.yLoc * this.xDim + this.xLoc, this.mask & PRED[0])

      this.xLoc += 1

      if (this.xLoc >= this.xDim) {
        this.yLoc += 1
        this.xLoc = 0
      }
    }
  }

  outputRGB(PRED: number[]) {
    if (this.setter === null) throw new Error("decode hasn't run yet")

    const offset = this.yLoc * this.xDim + this.xLoc

    if (this.xLoc < this.xDim && this.yLoc < this.yDim) {
      // Masked like the single component path: lossless prediction is modulo
      // 2^P, so a sample that wrapped has to be brought back into range
      this.setter(offset, this.mask & PRED[0], 0)
      this.setter(offset, this.mask & PRED[1], 1)
      this.setter(offset, this.mask & PRED[2], 2)

      this.xLoc += 1

      if (this.xLoc >= this.xDim) {
        this.yLoc += 1
        this.xLoc = 0
      }
    }
  }

  setValue8(index: number, val: number) {
    if (!this.outputData) throw new Error('output data not ready')

    if (littleEndian) {
      this.outputData[index] = val
    } else {
      this.outputData[index] = ((val & 0xff) << 8) | ((val >> 8) & 0xff)
    }
  }

  getValue8(index: number) {
    if (this.outputData === null) throw new Error('output data not ready')
    if (littleEndian) {
      return this.outputData[index] // mask should not be necessary because outputData is either Int8Array or Int16Array
    } else {
      const val = this.outputData[index]
      return ((val & 0xff) << 8) | ((val >> 8) & 0xff)
    }
  }

  setValueRGB(index: number, val: number, compOffset = 0) {
    if (this.outputData === null) return
    this.outputData[index * 3 + compOffset] = val
  }

  getValueRGB(index: number, compOffset: number) {
    if (this.outputData === null) throw new Error('output data not ready')
    return this.outputData[index * 3 + compOffset]
  }

  readApp() {
    if (this.stream === null) return null

    let count = 0
    const length = this.stream.get16()
    count += 2

    while (count < length) {
      this.stream.get8()
      count += 1
    }

    return length
  }

  readComment() {
    if (this.stream === null) return null

    let sb = ''
    let count = 0

    const length = this.stream.get16()
    count += 2

    while (count < length) {
      sb += this.stream.get8()
      count += 1
    }

    return sb
  }

  readNumber() {
    if (this.stream === null) return null

    const Ld = this.stream.get16()

    if (Ld !== 4) {
      throw new Error('ERROR: Define number format throw new IOException [Ld!=4]')
    }

    return this.stream.get16()
  }
}
