import { DataStream } from './data-stream.js'
import { createArray } from './utils.js'

export class QuantizationTable {
  precision: number[] = [] // Quantization precision 8 or 16
  tq = [0, 0, 0, 0] // 1: this table is presented
  quantTables: number[][] = createArray(4, 64) as number[][] // Tables

  static enhanceQuantizationTable = function (qtab: number[], table: number[]) {
    for (let i = 0; i < 8; i += 1) {
      qtab[table[0 * 8 + i]] *= 90
      qtab[table[4 * 8 + i]] *= 90
      qtab[table[2 * 8 + i]] *= 118
      qtab[table[6 * 8 + i]] *= 49
      qtab[table[5 * 8 + i]] *= 71
      qtab[table[1 * 8 + i]] *= 126
      qtab[table[7 * 8 + i]] *= 25
      qtab[table[3 * 8 + i]] *= 106
    }

    for (let i = 0; i < 8; i += 1) {
      qtab[table[0 + 8 * i]] *= 90
      qtab[table[4 + 8 * i]] *= 90
      qtab[table[2 + 8 * i]] *= 118
      qtab[table[6 + 8 * i]] *= 49
      qtab[table[5 + 8 * i]] *= 71
      qtab[table[1 + 8 * i]] *= 126
      qtab[table[7 + 8 * i]] *= 25
      qtab[table[3 + 8 * i]] *= 106
    }

    for (let i = 0; i < 64; i += 1) {
      qtab[i] >>= 6
    }
  }

  read(data: DataStream, table: number[]) {
    let count = 0
    let temp
    let t
    let i

    const length = data.get16()
    count += 2

    while (count < length) {
      temp = data.get8()
      count += 1
      t = temp & 0x0f

      if (t > 3) {
        throw new Error('ERROR: Quantization table ID > 3')
      }

      this.precision[t] = temp >> 4

      if (this.precision[t] === 0) {
        this.precision[t] = 8
      } else if (this.precision[t] === 1) {
        this.precision[t] = 16
      } else {
        throw new Error('ERROR: Quantization table precision error')
      }

      this.tq[t] = 1

      if (this.precision[t] === 8) {
        for (i = 0; i < 64; i += 1) {
          if (count > length) {
            throw new Error('ERROR: Quantization table format error')
          }

          this.quantTables[t][i] = data.get8()
          count += 1
        }

        QuantizationTable.enhanceQuantizationTable(this.quantTables[t], table)
      } else {
        for (i = 0; i < 64; i += 1) {
          if (count > length) {
            throw new Error('ERROR: Quantization table format error')
          }

          this.quantTables[t][i] = data.get16()
          count += 2
        }

        QuantizationTable.enhanceQuantizationTable(this.quantTables[t], table)
      }
    }

    if (count !== length) {
      throw new Error('ERROR: Quantization table error [count!=Lq]')
    }

    return 1
  }
}
