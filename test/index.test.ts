import { writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { expect, it } from 'bun:test'
import { readPpm } from '../src/ppm'
import { dct, dqtC, dqtY } from '../src/transform'
import { generateCodes, getBitLength, getCode, getHuffmanData } from '../src/huffman'
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
  const huffmanData = getHuffmanData(img)

  const { data, writeByte, writeWord } = useStream()

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
  writeWord(1)
  writeWord(1)
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
  data.push(...huffmanData)

  // EOI
  writeByte(0xFFD9)

  writeFileSync('src/output/test.jpg', Buffer.from(data))
})

it.skip('bar', () => {
  /* eslint-disable */
  const img = Int32Array.from([
    47, 18, 13, 16, 41, 90, 47, 27,
    62, 42, 35, 39, 66, 90, 41, 26,
    71, 55, 56, 67, 55, 40, 22, 39,
    53, 60, 63, 50, 48, 25, 37, 87,
    31, 27, 33, 27, 37, 50, 81, 147,
    54, 31, 33, 46, 58, 104, 144, 179,
    76, 70, 71, 91, 118, 151, 176, 184,
    102, 105, 115, 124, 135, 168, 173, 181
  ])

  const qTable = [
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50,
    50, 50, 50, 50, 50, 50, 50, 50
  ]

  const zigzag = [
    0, 1, 8, 16, 9, 2, 3, 10,
    17, 24, 32, 25, 18, 11, 4, 5,
    12, 19, 26, 33, 40, 48, 41, 34,
    27, 20, 13, 6, 7, 14, 21, 28,
    35, 42, 49, 56, 57, 50, 43, 36,
    29, 22, 15, 23, 30, 37, 44, 51,
    58, 59, 52, 45, 38, 31, 39, 46,
    53, 60, 61, 54, 47, 55, 62, 63
  ]
  /* eslint-enable */

  function dqt(X: Int32Array) {
    for (let i = 0; i < 64; i++)
      X[i] = X[i] / qTable[i]
  }

  const coeff = dct(img).map(x => Math.round(x))
  dqt(coeff)
  const quan = coeff.map(x => Math.round(x))
  const result = { dc: [] as number[], ac: [] as number[] }
  zigzag.forEach((cur, idx) => {
    (idx === 0 ? result.dc : result.ac).push(quan[cur])
  })
  const tmp1 = [57, 45, 0, 0, 0, 0, 23, 0, -30, -16, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  const tmp2 = [57, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 895, 0, 0, 0, 0]

  function ac(arr: number[]) {
    const result: [number, number][] = []
    let count = 0

    for (let idx = 0; idx < arr.length; idx++) {
      const cur = arr[idx]
      if (cur) {
        result.push([count, cur])
        count = 0
      }
      else {
        count += 1
        if (count === 16) {
          result.push([15, 0])
          count = 0
        }
      }

      if (idx === 62 && count) {
        while (result.length > 0 && result[result.length - 1][1] === 0)
          result.pop()

        result.push([0, 0])
        count = 0
      }
    }

    return result
  }

  console.log(ac(tmp1))
  console.log(ac(tmp2))
})
