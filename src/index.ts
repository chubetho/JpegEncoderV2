import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { useStream } from './stream'
import { acTableC, acTableY, dcTableC, dcTableY, qTableC, qTableY, zigzag } from './constants'
import { dct, dqt } from './transform'

const min = Math.min
const abs = Math.abs

function read(path: string) {
  const content = readFileSync(path, 'ascii')
  const lines = content.split('\n')
  const [format, size, _maxColor, ...rest] = lines
  const [width, height] = size.trim().split(' ').map(Number)
  const maxColor = Number.parseInt(_maxColor)

  if (format !== 'P3')
    throw new Error('Invalid ppm')

  if (maxColor !== 255)
    throw new Error('Invalid ppm')

  const img = new Uint8Array(width * height * 3)
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

      img[index++] = v
    }
  }

  return {
    img,
    width,
    height,
  }
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

  throw new Error('cant find symbol')
}

function rgb2y(r: number, g: number, b: number) { return 0.299 * r + 0.587 * g + 0.114 * b - 128 }
function rgb2cb(r: number, g: number, b: number) { return -0.1687 * r - 0.3312 * g + 0.5 * b }
function rgb2cr(r: number, g: number, b: number) { return 0.5 * r - 0.4186 * g - 0.0813 * b }

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

  const { img, width, height } = read(path)
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
  const writeHuffmanTable = (def: number, table: HuffmanTable) => {
    writeWord(0xFFC4)
    writeWord(19 + table.offsets[16])
    writeByte(def)

    for (let i = 0; i < 16; i++)
      writeByte(table.offsets[i + 1] - table.offsets[i])

    for (let i = 0; i < 16; i++) {
      for (let j = table.offsets[i]; j < table.offsets[i + 1]; j++)
        writeByte(table.symbols[j])
    }
  }

  writeHuffmanTable(0x00, dcTableY)
  writeHuffmanTable(0x01, dcTableC)
  writeHuffmanTable(0x10, acTableY)
  writeHuffmanTable(0x11, acTableC)

  // SOS
  writeWord(0xFFDA)
  writeWord(12)
  writeByte(3) // components

  writeByte(1) // Y
  writeByte(0x00)

  writeByte(2) // Cb
  writeByte(0x11)

  writeByte(3) // Cr
  writeByte(0x11)

  writeByte(0)
  writeByte(63)
  writeByte(0)

  // Data
  let lastYDc = 0
  let lastCbDc = 0
  let lastCrDc = 0

  const encode = (comp: Int16Array, qTable: Uint8Array, lastDc: number, dcTable: HuffmanTable, acTable: HuffmanTable) => {
    dct(comp)
    dqt(comp, qTable)

    // DC
    let coeff = comp[0] - lastDc
    let coeffLength = getBitLength(abs(coeff))

    if (coeff === 0) {
      const { code, codelength } = getCode(dcTable, 0x00)
      writeBits(code, codelength)
    }
    else {
      if (coeffLength > 11)
        throw new Error('dc coefficient length > 11')

      if (coeff < 0)
        coeff += (1 << coeffLength) - 1

      const { code, codelength } = getCode(dcTable, coeffLength)
      writeBits(code, codelength)
      writeBits(coeff, coeffLength)
    }

    // AC
    for (let i = 1; i < 64; i++) {
      let count = 0
      while (i < 64 && comp[zigzag[i]] === 0) {
        count++
        i++
      }

      if (i === 64) {
        const { code, codelength } = getCode(acTable, 0x00)
        writeBits(code, codelength)
        continue
      }

      while (count >= 16) {
        const { code, codelength } = getCode(acTable, 0xF0)
        writeBits(code, codelength)
        count -= 16
      }

      coeff = comp[zigzag[i]]
      coeffLength = getBitLength(abs(coeff))
      if (coeffLength > 10)
        throw new Error('ac coefficient length > 10')

      if (coeff < 0)
        coeff += (1 << coeffLength) - 1

      const { code, codelength } = getCode(acTable, count << 4 | coeffLength)
      writeBits(code, codelength)
      writeBits(coeff, coeffLength)
    }

    return comp[0]
  }

  const maxWidth = width - 1
  const maxHeight = height - 1
  const size = subsampling ? 16 : 8

  const Y = new Int16Array(64)
  const Cb = new Int16Array(64)
  const Cr = new Int16Array(64)

  let YCount = 0

  for (let mcuY = 0; mcuY < height; mcuY += size) {
    for (let mcuX = 0; mcuX < width; mcuX += size) {
      for (let blockY = 0; blockY < size; blockY += 8) {
        for (let blockX = 0; blockX < size; blockX += 8) {
          for (let compY = 0; compY < 8; compY++) {
            const pixelY = min(mcuY + blockY + compY, maxHeight)
            let pixelX = min(mcuX + blockX, maxWidth)

            for (let compX = 0; compX < 8; compX++) {
              const pixelIndex = (pixelY * width + pixelX) * 3
              if (pixelX < maxWidth)
                pixelX++

              const r = img[pixelIndex]
              const g = img[pixelIndex + 1]
              const b = img[pixelIndex + 2]

              const compIndex = compY * 8 + compX
              Y[compIndex] = rgb2y(r, g, b)
              if (subsampling)
                continue

              Cb[compIndex] = rgb2cb(r, g, b)
              Cr[compIndex] = rgb2cr(r, g, b)
            }
          }

          lastYDc = encode(Y, qTableY, lastYDc, dcTableY, acTableY)

          if (subsampling === false) {
            lastCbDc = encode(Cb, qTableC, lastCbDc, dcTableC, acTableC)
            lastCrDc = encode(Cr, qTableC, lastCrDc, dcTableC, acTableC)
          }
          else {
            YCount++
            if (YCount !== 4)
              continue

            YCount = 0

            for (let compY = 0; compY < 8; compY++) {
              const pixelY = min(mcuY + 2 * compY, maxHeight)
              const pixelX = mcuX

              const rowStep = pixelY < maxHeight ? 3 * width : 0
              const colStep = pixelX < maxWidth ? 3 : 0

              let tl = (pixelY * width + pixelX) * 3
              for (let compX = 0; compX < 8; compX++) {
                const tr = tl + colStep
                const bl = tl + rowStep
                const br = tl + colStep + rowStep

                const r = img[tl] + img[tr] + img[bl] + img[br]
                const g = img[tl + 1] + img[tr + 1] + img[bl + 1] + img[br + 1]
                const b = img[tl + 2] + img[tr + 2] + img[bl + 2] + img[br + 2]

                const compIndex = compY * 8 + compX
                Cb[compIndex] = rgb2cb(r, g, b) / 4
                Cr[compIndex] = rgb2cr(r, g, b) / 4

                tl += 6
              }
            }

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
