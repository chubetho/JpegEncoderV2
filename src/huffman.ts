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
