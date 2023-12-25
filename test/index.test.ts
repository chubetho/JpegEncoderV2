import { writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { expect, it } from 'bun:test'
import { readPpm } from '../src/ppm'
import { dct, dqtC, dqtY } from '../src/transform'
import { generateCodes, getBitLength, getCode } from '../src/huffman'
import { acTableC, acTableY, acTables, dcTableC, dcTableY, dcTables, qTableC, qTableY, zigzag } from '../src/constants'
import { useStream } from '../src/stream'

it('foo', () => {
  const img = readPpm('src/assets/small.ppm')

  for (let i = 0; i < img.blocks.length; i++) {
    const b = img.blocks[i]
    dct(b.Y)
    dqtY(b.Y)

    dct(b.Cb)
    dqtC(b.Cb)

    dct(b.Cr)
    dqtC(b.Cr)
  }
  const { data, writeByte, writeWord, writeBits } = useStream()

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
  writeByte(2)
  writeByte(0)
  writeWord(100)
  writeWord(100)
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
  writeByte(3)
  for (let i = 1; i <= 3; i++) {
    writeByte(i)
    writeByte(i === 1 ? 0x00 : 0x11)
  }
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

      let coeffLength = getBitLength(Math.abs(coeff))
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

        // find coeff length
        coeff = component[zigzag[i]]
        coeffLength = getBitLength(Math.abs(coeff))
        if (coeffLength > 10) {
          console.log('ac coefficient length > 10')
          return
        }

        if (coeff < 0)
          coeff += (1 << coeffLength) - 1

        // find symbol in table
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

  const arr = [255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 2, 0, 0, 100, 0, 100, 0, 0, 255, 219, 0, 67, 0, 16, 11, 12, 14, 12, 10, 16, 14, 13, 14, 18, 17, 16, 19, 24, 40, 26, 24, 22, 22, 24, 49, 35, 37, 29, 40, 58, 51, 61, 60, 57, 51, 56, 55, 64, 72, 92, 78, 64, 68, 87, 69, 55, 56, 80, 109, 81, 87, 95, 98, 103, 104, 103, 62, 77, 113, 121, 112, 100, 120, 92, 101, 103, 99, 255, 219, 0, 67, 1, 17, 18, 18, 24, 21, 24, 47, 26, 26, 47, 99, 66, 56, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 255, 192, 0, 17, 8, 0, 16, 0, 16, 3, 1, 17, 0, 2, 17, 1, 3, 17, 1, 255, 196, 0, 31, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 255, 196, 0, 31, 1, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 255, 196, 0, 181, 16, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125, 1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 255, 196, 0, 181, 17, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119, 0, 1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161, 177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26, 38, 39, 40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229, 230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249, 250, 255, 218, 0, 12, 3, 1, 0, 2, 17, 3, 17, 0, 63, 0, 198, 175, 48, 251, 176, 160, 2, 128, 10, 0, 255, 217]

  console.log(arr)
  console.log(data)

  // expect(data).toEqual(arr)
})
