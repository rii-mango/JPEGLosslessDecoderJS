export const toArrayBuffer = (buffer: Buffer) => {
  const ab = new ArrayBuffer(buffer.length)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buffer.length; i += 1) {
    view[i] = buffer[i]
  }
  return ab
}
