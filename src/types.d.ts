interface Block {
  R: Uint8Array
  G: Uint8Array
  B: Uint8Array
  Y: Float32Array
  Cb: Float32Array
  Cr: Float32Array
}

interface Image {
  blocks: Block[]
  metadata: {
    imageWidth: number
    imageHeight: number
    maxColor: number
    format: string
    blockWidth: number
    blockHeight: number
  }
}
