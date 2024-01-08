export function useStream() {
  let nextBit = 0
  let data = new Uint8Array(1024)
  let count = 0

  function writeBit(v: number) {
    if (nextBit === 0)
      update()

    data[count - 1] |= (v & 1) << (7 - nextBit)
    nextBit = (nextBit + 1) % 8

    if (nextBit === 0 && data[count - 1] === 0xFF)
      update()
  }

  function writeBits(v: number, length: number) {
    for (let i = 1; i <= length; i++)
      writeBit((v >> (length - i)) & 1)
  }

  function writeByte(v: number) {
    data[count] = v
    update()
  }

  function writeWord(v: number) {
    writeByte((v >> 8) & 0xFF)
    writeByte(v & 0xFF)
  }

  function getData() {
    return data.subarray(0, count)
  }

  function update() {
    count++
    if (count >= data.length) {
      const _data = new Uint8Array(count * 2)
      _data.set(data)
      data = _data
    }
  }

  return { writeBits, writeByte, writeWord, getData }
}
