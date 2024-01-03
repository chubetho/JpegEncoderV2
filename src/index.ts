import { Buffer } from 'node:buffer'
import { readPpm } from '../src/ppm'
import { dct, dqtC, dqtY } from '../src/transform'
import { acTableC, acTableY, acTables, dcTableC, dcTableY, dcTables, qTableC, qTableY, zigzag } from '../src/constants'
import { useStream } from '../src/stream'

const abs = Math.abs

export function encode(path: string) {
  const img = readPpm(path)

  for (let i = 0; i < img.blocks.length; i++) {
    dct(img.blocks[i].Y)
    dct(img.blocks[i].Cb)
    dct(img.blocks[i].Cr)
  }

  for (let i = 0; i < img.blocks.length; i++) {
    dqtY(img.blocks[i].Y)
    dqtC(img.blocks[i].Cb)
    dqtC(img.blocks[i].Cr)
  }

  const { getData, writeByte, writeWord, writeBits } = useStream()

  // SOI
  writeWord(0xFFD8)

  // APP0
  writeWord(0xFFE0)
  writeWord(16)
  writeByte(0x4A) // J
  writeByte(0x46) // I
  writeByte(0x49) // F
  writeByte(0x46) // I
  writeByte(0)
  writeByte(1)
  writeByte(1)
  writeByte(0)
  writeWord(0x0048)
  writeWord(0x0048)
  writeByte(0)
  writeByte(0)

  // DQT Y
  const writeQuantizationTable = (table: number[], id: number) => {
    writeWord(0xFFDB)
    writeWord(67)
    writeByte(id)
    for (let i = 0; i < 64; i++)
      writeByte(table[zigzag[i]])
  }
  writeQuantizationTable(qTableY, 0)
  writeQuantizationTable(qTableC, 1)

  // SOF
  writeWord(0xFFC0)
  writeWord(17)
  writeByte(8) // precision
  writeWord(img.metadata.imageHeight)
  writeWord(img.metadata.imageWidth)

  writeByte(3) // components

  writeByte(1) // Y
  writeByte(0x11)
  writeByte(0) // QtY

  writeByte(2) // Cb
  writeByte(0x11)
  writeByte(1) // QtC

  writeByte(3) // Cr
  writeByte(0x11)
  writeByte(1) // QtC

  // DHT
  const writeHuffmanTable = (type: number, id: number, table: HuffmanTable) => {
    writeWord(0xFFC4)
    writeWord(19 + table.offsets[16])
    writeByte(type << 4 | id)

    for (let i = 0; i < 16; i++)
      writeByte(table.offsets[i + 1] - table.offsets[i])

    for (let i = 0; i < 16; i++) {
      for (let j = table.offsets[i]; j < table.offsets[i + 1]; j++)
        writeByte(table.symbols[j])
    }
  }

  writeHuffmanTable(0, 0, dcTableY)
  writeHuffmanTable(0, 1, dcTableC)
  writeHuffmanTable(1, 0, acTableY)
  writeHuffmanTable(1, 1, acTableC)

  // SOS
  writeWord(0xFFDA)
  writeWord(12)
  writeByte(3) // components

  writeByte(1) // Y
  writeByte(0x00) // Huffmantable

  writeByte(2) // Cb
  writeByte(0x11) // Huffmantable

  writeByte(3) // Cr
  writeByte(0x11) // Huffmantable

  writeByte(0)
  writeByte(63)
  writeByte(0)

  // ECS
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

  for (let b = 0; b < img.blocks.length; b++) {
    const block = img.blocks[b]
    for (let c = 0; c < 3; c++) {
      const component = c === 0 ? block.Y : c === 1 ? block.Cb : block.Cr

      // DC
      let coeff = component[0] - dcDiffs[c]
      dcDiffs[c] = component[0]

      let coeffLength = getBitLength(abs(coeff))
      if (coeffLength > 11) {
        console.log('dc coefficient length > 11')
        return
      }
      if (coeff < 0)
        coeff += (1 << coeffLength) - 1

      const dcCode = getCode(dcTables[c], coeffLength)
      if (!dcCode) {
        console.log('invalid dc')
        return
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
          const acCode = getCode(acTables[c], 0x00)
          if (!acCode) {
            console.log('invalid ac')
            return
          }
          writeBits(acCode.code, acCode.codelength)
          continue
        }

        while (count >= 16) {
          const acCode = getCode(acTables[c], 0xF0)
          if (!acCode) {
            console.log('invalid ac')
            return
          }
          writeBits(acCode.code, acCode.codelength)
          count -= 16
        }

        coeff = component[zigzag[i]]
        coeffLength = getBitLength(abs(coeff))
        if (coeffLength > 10) {
          console.log('ac coefficient length > 10')
          return
        }

        if (coeff < 0)
          coeff += (1 << coeffLength) - 1

        const symbol = count << 4 | coeffLength
        const symbolCode = getCode(acTables[c], symbol)
        if (!symbolCode) {
          console.log('invalid ac')
          return
        }

        writeBits(symbolCode.code, symbolCode.codelength)
        writeBits(coeff, coeffLength)
      }
    }
  }

  // EOI
  writeWord(0xFFD9)
  return Buffer.from(getData())
}

function generateCodes(t: HuffmanTable) {
  let code = 0
  for (let i = 0; i < 16; i++) {
    for (let j = t.offsets[i]; j < t.offsets[i + 1]; j++) {
      t.codes[j] = code
      code += 1
    }
    code <<= 1
  }
}

function getBitLength(v: number) {
  let length = 0
  while (v > 0) {
    v >>= 1
    length += 1
  }
  return length
}

function getCode(t: HuffmanTable, symbol: number) {
  if (!t.set)
    throw new Error('table not set')

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
