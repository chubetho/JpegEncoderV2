interface HuffmanTable {
  offsets: Uint8Array
  symbols: Uint8Array
  codes: Uint16Array
  set?: boolean
}
