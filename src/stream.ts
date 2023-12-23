export function useStream() {
  let nextBit = 0
  const data: number[] = []

  function writeBit(v: number) {
    if (nextBit === 0)
      data.push(v)

    data[data.length - 1] |= (v & 1) << (7 - nextBit)
    nextBit = (nextBit + 1) % 8
    if (nextBit === 0 && data[data.length - 1] === 0xFF)
      data.push(0)
  }

  function writeBits(v: number, length: number) {
    for (let i = 1; i <= length; i++)
      writeBit(v >> (length - 1))
  }

  function writeByte(v: number) {
    data.push(v)
  }

  function writeWord(v: number) {
    writeByte((v >> 8) & 0xFF)
    writeByte(v & 0xFF)
  }

  return { data, writeBit, writeBits, writeByte, writeWord }
}
