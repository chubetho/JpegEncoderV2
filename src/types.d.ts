interface Block {
  R: Uint8Array
  G: Uint8Array
  B: Uint8Array
  Y: Int32Array
  Cb: Int32Array
  Cr: Int32Array
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

interface HuffmanTable {
  offsets: Uint8Array
  symbols: Uint8Array
  codes: Uint16Array
  set?: boolean
}
