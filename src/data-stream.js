export class DataStream {
  constructor(data, offset, length) {
    if (offset === undefined && length === undefined) {
      // Old api
      this.buffer = new Uint8Array(data)
    } else {
      this.buffer = new Uint8Array(data, offset, length)
    }
    this.index = 0
  }

  get16() {
    // var value = this.buffer.getUint16(this.index, false);
    const value = (this.buffer[this.index] << 8) + this.buffer[this.index + 1] // DataView is big-endian by default
    this.index += 2
    return value
  }

  get8() {
    // var value = this.buffer.getUint8(this.index);
    const value = this.buffer[this.index]
    this.index += 1
    return value
  }
}
