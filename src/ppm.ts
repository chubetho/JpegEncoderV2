import * as fs from 'node:fs'

export function readPpm(path: string) {
  const content = fs.readFileSync(path, 'ascii')
  const lines = content.split('\n')
  const [format, size, _maxColor, ...rest] = lines
  const [imageWidth, imageHeight] = size.trim().split(' ').map(Number)
  const maxColor = Number.parseInt(_maxColor)

  if (format !== 'P3')
    throw new Error ('Invalid ppm')

  if (maxColor !== 255)
    throw new Error ('Invalid ppm')

  const image = new Uint8Array(imageWidth * imageHeight * 3)
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
        throw new Error ('Invalid ppm')

      image[index++] = v
    }
  }

  const blockHeight = ~~((imageHeight + 7) / 8)
  const blockWidth = ~~((imageWidth + 7) / 8)
  const blocks = Array.from({ length: blockHeight * blockWidth }, () => ({
    R: new Uint8Array(64),
    G: new Uint8Array(64),
    B: new Uint8Array(64),
    Y: new Int32Array(64),
    Cb: new Int32Array(64),
    Cr: new Int32Array(64),
  }))

  const clamp = (x: number) => x < -128 ? -128 : x > 127 ? 127 : x
  for (let h = 0; h < imageHeight; h++) {
    const blockRow = ~~(h / 8)
    const pixelRow = h % 8
    for (let w = 0; w < imageWidth; w++) {
      const blockColumn = ~~(w / 8)
      const pixelColumn = w % 8
      const blockIndex = blockRow * blockWidth + blockColumn
      const pixelIndex = pixelRow * 8 + pixelColumn

      const index = (h * imageWidth + w) * 3
      const r = image[index]
      const g = image[index + 1]
      const b = image[index + 2]

      blocks[blockIndex].R[pixelIndex] = r
      blocks[blockIndex].G[pixelIndex] = g
      blocks[blockIndex].B[pixelIndex] = b

      const y = 0.299 * r + 0.587 * g + 0.114 * b - 128
      const cb = -0.1687 * r + -0.3312 * g + 0.5 * b
      const cr = 0.5 * r + -0.4186 * g + -0.0813 * b

      blocks[blockIndex].Y[pixelIndex] = clamp(y)
      blocks[blockIndex].Cb[pixelIndex] = clamp(cb)
      blocks[blockIndex].Cr[pixelIndex] = clamp(cr)
    }
  }

  return {
    blocks,
    metadata: {
      imageHeight,
      imageWidth,
      format,
      maxColor,
      blockHeight,
      blockWidth,
    },
  }
}

export function writePpm(path: string, { blocks, metadata }: Image) {
  let data = `${metadata.format}\n${metadata.imageWidth} ${metadata.imageHeight}\n${metadata.maxColor}\n`

  for (let h = 0; h < metadata.imageHeight; h++) {
    const blockRow = ~~(h / 8)
    const pixelRow = h % 8
    for (let w = 0; w < metadata.imageWidth; w++) {
      const blockColumn = ~~(w / 8)
      const pixelColumn = w % 8
      const blockIndex = blockRow * metadata.blockWidth + blockColumn
      const pixelIndex = pixelRow * 8 + pixelColumn

      const r = blocks[blockIndex].R[pixelIndex]
      const g = blocks[blockIndex].G[pixelIndex]
      const b = blocks[blockIndex].B[pixelIndex]
      data += `${r} ${g} ${b}  `
    }

    data += '\n'
  }

  fs.writeFileSync(path, data)
}
