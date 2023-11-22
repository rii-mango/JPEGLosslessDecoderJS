// https://stackoverflow.com/a/12588826
export const createArray = (...dimensions) => {
  if (dimensions.length > 0) {
    const dim = dimensions[0]
    const rest = dimensions.slice(1)
    const newArray = []
    for (let i = 0; i < dim; i++) {
      newArray[i] = createArray(...rest)
    }
    return newArray
  } else {
    return undefined
  }
}

// http://stackoverflow.com/questions/18638900/javascript-crc32
export const makeCRCTable = function () {
  let c
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crcTable[n] = c
  }
  return crcTable
}

export const crcTable = makeCRCTable()

export const crc32 = function (dataView) {
  const uint8view = new Uint8Array(dataView.buffer)
  let crc = 0 ^ -1

  for (let i = 0; i < uint8view.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ uint8view[i]) & 0xff]
  }

  return (crc ^ -1) >>> 0
}
