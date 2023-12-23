import { acTables, dcTables, zigzag } from './constants'
import { useStream } from './stream'

export function generateCodes(t: HuffmanTable) {
  let code = 0
  for (let i = 0; i < 16; i++) {
    for (let j = t.offsets[i]; j < t.offsets[i + 1]; j++) {
      t.codes[j] = code
      code += 1
    }
    code <<= 1
  }
}

export function getBitLength(v: number) {
  let length = 0
  while (v > 0) {
    v >>= 1
    length += 1
  }
  return length
}

export function getCode(t: HuffmanTable, symbol: number) {
  let code = 0
  let codelength = 0

  for (let i = 0; i < 16; i++) {
    for (let j = t.offsets[i]; j < t.offsets[i + 1]; j++) {
      if (symbol !== t.symbols[j])
        continue

      code = t.codes[j]
      codelength = i + 1
      return { code, codelength }
    }
  }
}

export function getHuffmanData(img: Image) {
  const { data, writeBits } = useStream()
  const dcDiffs = [0, 0, 0]

  for (let i = 0; i < 3; i++) {
    if (!dcTables[i].set) {
      generateCodes(dcTables[i])
      dcTables[i].set = true
    }
    if (!acTables[i].set) {
      generateCodes(acTables[i])
      acTables[i].set = true
    }
  }

  for (let h = 0; h < img.metadata.blockHeight; h++) {
    for (let w = 0; w < img.metadata.blockWidth; w++) {
      const block = img.blocks[h * img.metadata.blockWidth + w]
      for (let i = 0; i < 3; i++) {
        const component = i === 0 ? block.Y : i === 0 ? block.Cb : block.Cr
        if (!encoderBlockComponent(component, dcDiffs, i, dcTables[i], acTables[i]))
          return []
      }
    }
  }

  return data

  function encoderBlockComponent(component: Int32Array, dcDiffs: number[], dcDiffIdx: number, dcTable: HuffmanTable, acTable: HuffmanTable) {
    // DC
    let coeff = Math.ceil(component[0]) - dcDiffs[dcDiffIdx]
    dcDiffs[dcDiffIdx] = component[0]

    let coeffLength = getBitLength(Math.abs(coeff))
    if (coeffLength > 11) {
      console.log('dc coefficient length > 11')
      return false
    }
    if (coeff < 0)
      coeff += (1 << coeffLength) - 1

    const dcCode = getCode(dcTable, coeffLength)
    if (!dcCode) {
      console.log('invalid dc')
      return false
    }
    writeBits(dcCode.code, dcCode.codelength)
    writeBits(coeff, coeffLength)

    // AC
    for (let i = 1; i < 64; i++) {
      let count = 0
      while (i < 64 && component[zigzag[i]] === 0) {
        count += 1
        i += 1
      }

      if (i === 64) {
        const acCode = getCode(acTable, 0x00)
        if (!acCode) {
          console.log('invalid ac')
          return false
        }
        writeBits(acCode.code, acCode.codelength)
        return true
      }

      while (count >= 16) {
        const acCode = getCode(acTable, 0xF0)
        if (!acCode) {
          console.log('invalid ac')
          return false
        }
        writeBits(acCode.code, acCode.codelength)
        count -= 16
      }

      coeff = component[zigzag[i]]
      coeffLength = getBitLength(Math.abs(coeff))
      if (coeffLength > 10) {
        console.log('ac coefficient length > 10')
        return false
      }
      if (coeff < 0)
        coeff += (1 << coeffLength) - 1

      const symbol = count << 4 | coeffLength
      const symbolCode = getCode(acTable, symbol)
      if (!symbolCode) {
        console.log('invalid ac')
        return false
      }

      writeBits(symbolCode.code, symbolCode.codelength)
      writeBits(coeff, coeffLength)
    }

    return true
  }
}
