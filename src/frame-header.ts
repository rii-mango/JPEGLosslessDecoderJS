import { ComponentSpec } from './component-spec.js'
import { DataStream } from './data-stream.js'

export class FrameHeader {
  dimX = 0
  dimY = 0
  numComp = 0
  precision = 0
  components: Array<typeof ComponentSpec> = []

  read(data: DataStream) {
    let count = 0
    let temp

    const length = data.get16()
    count += 2

    this.precision = data.get8()
    count += 1

    this.dimY = data.get16()
    count += 2

    this.dimX = data.get16()
    count += 2

    this.numComp = data.get8()
    count += 1
    for (let i = 1; i <= this.numComp; i += 1) {
      if (count > length) {
        throw new Error('ERROR: frame format error')
      }

      const c = data.get8()
      count += 1

      if (count >= length) {
        throw new Error('ERROR: frame format error [c>=Lf]')
      }

      temp = data.get8()
      count += 1

      if (!this.components[c]) {
        this.components[c] = { ...ComponentSpec }
      }

      this.components[c].hSamp = temp >> 4
      this.components[c].vSamp = temp & 0x0f
      this.components[c].quantTableSel = data.get8()
      count += 1
    }

    if (count !== length) {
      throw new Error('ERROR: frame format error [Lf!=count]')
    }

    return 1
  }
}
