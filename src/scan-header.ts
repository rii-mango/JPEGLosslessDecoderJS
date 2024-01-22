import { DataStream } from './data-stream.js'
import { ScanComponent } from './scan-component.js'

export class ScanHeader {
  ah = 0
  al = 0
  numComp = 0 // Number of components in the scan
  selection = 0 // Start of spectral or predictor selection
  spectralEnd = 0 // End of spectral selection
  components: Array<typeof ScanComponent> = []

  read(data: DataStream) {
    let count = 0
    let i
    let temp

    const length = data.get16()
    count += 2

    this.numComp = data.get8()
    count += 1

    for (i = 0; i < this.numComp; i += 1) {
      this.components[i] = { ...ScanComponent }

      if (count > length) {
        throw new Error('ERROR: scan header format error')
      }

      this.components[i].scanCompSel = data.get8()
      count += 1

      temp = data.get8()
      count += 1

      this.components[i].dcTabSel = temp >> 4
      this.components[i].acTabSel = temp & 0x0f
    }

    this.selection = data.get8()
    count += 1

    this.spectralEnd = data.get8()
    count += 1

    temp = data.get8()
    this.ah = temp >> 4
    this.al = temp & 0x0f
    count += 1

    if (count !== length) {
      throw new Error('ERROR: scan header format error [count!=Ns]')
    }

    return 1
  }
}
