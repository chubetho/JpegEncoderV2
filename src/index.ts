import * as fs from 'node:fs'
import { Buffer } from 'node:buffer'
import { useStream } from './stream'
import { acTableC, acTableY, dcTableC, dcTableY, qTableC, qTableY, zigzag } from './constants'
import { dct, dqt } from './transform'

const min = Math.min
const abs = Math.abs

function read(path: string) {
  const content = fs.readFileSync(path, 'ascii')
  const lines = content.split('\n')
  const [format, size, _maxColor, ...rest] = lines
  const [width, height] = size.trim().split(' ').map(Number)
  const maxColor = Number.parseInt(_maxColor)

  if (format !== 'P3')
    throw new Error('Invalid ppm')

  if (maxColor !== 255)
    throw new Error('Invalid ppm')

  const image = new Uint8Array(width * height * 3)
  let index = 0

  for (let l = 0; l < rest.length; l++) {
    const trim = rest[l].trim()
    if (trim[0] === '#')
      continue

    const row = trim.split(' ')
    for (let i = 0; i < row.length; i++) {
      if (!row[i])
        continue
      const v = Number.parseInt(row[i])
      if (Number.isNaN(v) || v < 0 || v > maxColor)
        throw new Error('Invalid ppm')

      image[index++] = v
    }
  }

  return {
    image,
    width,
    height,
  }
}

function rgb2y(r: number, g: number, b: number) { return +0.299 * r + 0.587 * g + 0.114 * b }
function rgb2cb(r: number, g: number, b: number) { return -0.16874 * r - 0.33126 * g + 0.5 * b }
function rgb2cr(r: number, g: number, b: number) { return +0.5 * r - 0.41869 * g - 0.08131 * b }

function generateCodes(t: HuffmanTable) {
  let code = 0
  for (let i = 0; i < 16; i++) {
    for (let j = t.offsets[i]; j < t.offsets[i + 1]; j++) {
      t.codes[j] = code
      code += 1
    }
    code <<= 1
  }
  t.set = true
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

interface Config {
  subsampling?: boolean
}

export function encoder(path: string, config?: Config) {
  const { subsampling }: Config = {
    subsampling: true,
    ...config,
  }

  !dcTableY.set && generateCodes(dcTableY)
  !dcTableC.set && generateCodes(dcTableC)
  !acTableY.set && generateCodes(acTableY)
  !acTableC.set && generateCodes(acTableC)

  const { image: pixels, width, height } = read(path)
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
  writeWord(1)
  writeWord(1)
  writeByte(0)
  writeByte(0)

  // DQT
  writeWord(0xFFDB)
  writeWord(2 + 2 * 65)
  writeByte(0)
  for (let i = 0; i < 64; i++)
    writeByte(qTableY[zigzag[i]])
  writeByte(1)
  for (let i = 0; i < 64; i++)
    writeByte(qTableC[zigzag[i]])

  // SOF
  writeWord(0xFFC0)
  writeWord(17)
  writeByte(8) // precision
  writeWord(height)
  writeWord(width)

  writeByte(3) // components

  writeByte(1) // Y
  writeByte(subsampling ? 0x22 : 0x11)
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

  // Data
  let lastYDc = 0
  let lastCbDc = 0
  let lastCrDc = 0

  const encode = (comp: Int16Array, qTable: Uint8Array, dcDiff: number, dcTable: HuffmanTable, acTable: HuffmanTable) => {
    dct(comp)
    dqt(comp, qTable)

    // DC
    let coeff = comp[0] - dcDiff

    let coeffLength = getBitLength(abs(coeff))
    if (coeffLength > 11)
      throw new Error('dc coefficient length > 11')

    if (coeff < 0)
      coeff += (1 << coeffLength) - 1

    const coeffLengthCode = getCode(dcTable, coeffLength)
    if (!coeffLengthCode)
      throw new Error('invalid dc')

    writeBits(coeffLengthCode.code, coeffLengthCode.codelength)
    writeBits(coeff, coeffLength)

    // AC
    for (let i = 1; i < 64; i++) {
      let count = 0
      while (i < 64 && comp[zigzag[i]] === 0) {
        count++
        i++
      }

      if (i === 64) {
        const eob = getCode(acTable, 0x00)
        if (!eob)
          throw new Error('invalid ac')

        writeBits(eob.code, eob.codelength)
        continue
      }

      while (count >= 16) {
        const xf0 = getCode(acTable, 0xF0)
        if (!xf0)
          throw new Error('invalid ac')

        writeBits(xf0.code, xf0.codelength)
        count -= 16
      }

      coeff = comp[zigzag[i]]
      coeffLength = getBitLength(abs(coeff))
      if (coeffLength > 10)
        throw new Error('ac coefficient length > 10')

      if (coeff < 0)
        coeff += (1 << coeffLength) - 1

      const symbol = count << 4 | coeffLength
      const symbolCode = getCode(acTable, symbol)
      if (!symbolCode)
        throw new Error('invalid ac')

      writeBits(symbolCode.code, symbolCode.codelength)
      writeBits(coeff, coeffLength)
    }

    return comp[0]
  }

  const maxWidth = width - 1
  const maxHeight = height - 1
  const mcuSize = subsampling ? 16 : 8

  const Y = new Int16Array(64)
  const Cb = new Int16Array(64)
  const Cr = new Int16Array(64)

  let YCount = 0

  for (let mcuY = 0; mcuY < height; mcuY += mcuSize) {
    for (let mcuX = 0; mcuX < width; mcuX += mcuSize) {
      for (let blockY = 0; blockY < mcuSize; blockY += 8) {
        for (let blockX = 0; blockX < mcuSize; blockX += 8) {
          for (let deltaY = 0; deltaY < 8; deltaY++) {
            let column = min(mcuX + blockX, maxWidth)
            const row = min(mcuY + blockY + deltaY, maxHeight)
            for (let deltaX = 0; deltaX < 8; deltaX++) {
              const pixelPos = row * width + column
              if (column < maxWidth)
                column++
              const r = pixels[3 * pixelPos]
              const g = pixels[3 * pixelPos + 1]
              const b = pixels[3 * pixelPos + 2]

              Y[deltaY * 8 + deltaX] = rgb2y(r, g, b) - 128
              if (!subsampling) {
                Cb[deltaY * 8 + deltaX] = rgb2cb(r, g, b)
                Cr[deltaY * 8 + deltaX] = rgb2cr(r, g, b)
              }
            }
          }

          lastYDc = encode(Y, qTableY, lastYDc, dcTableY, acTableY)
          YCount++

          if (subsampling) {
            for (let deltaY = 0; deltaY < 8; deltaY++) {
              const row = min(mcuY + 2 * deltaY, maxHeight)
              let column = mcuX
              let pixelPos = (row * width + column) * 3
              const rowStep = row < maxHeight ? 3 * width : 0
              let columnStep = column < maxWidth ? 3 : 0
              for (let deltaX = 0; deltaX < 8; deltaX++) {
                const right = pixelPos + columnStep
                const down = pixelPos + rowStep
                const downRight = pixelPos + columnStep + rowStep

                const r = pixels[pixelPos] + pixels[right] + pixels[down] + pixels[downRight]
                const g = pixels[pixelPos + 1] + pixels[right + 1] + pixels[down + 1] + pixels[downRight + 1]
                const b = pixels[pixelPos + 2] + pixels[right + 2] + pixels[down + 2] + pixels[downRight + 2]
                Cb[deltaY * 8 + deltaX] = rgb2cb(r, g, b) / 4
                Cr[deltaY * 8 + deltaX] = rgb2cr(r, g, b) / 4

                pixelPos += 2 * 3
                column += 2

                if (column >= maxWidth) {
                  columnStep = 0
                  pixelPos = ((row + 1) * width - 1) * 3
                }
              }
            }
            if (YCount === 4) {
              lastCbDc = encode(Cb, qTableC, lastCbDc, dcTableC, acTableC)
              lastCrDc = encode(Cr, qTableC, lastCrDc, dcTableC, acTableC)
              YCount = 0
            }
          }
          else {
            lastCbDc = encode(Cb, qTableC, lastCbDc, dcTableC, acTableC)
            lastCrDc = encode(Cr, qTableC, lastCrDc, dcTableC, acTableC)
          }
        }
      }
    }
  }

  // EOI
  writeWord(0xFFD9)
  return Buffer.from(getData())
}
