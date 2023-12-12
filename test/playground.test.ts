import { it } from 'bun:test'
import { readPpm } from '../src/ppm'
import { aan, dct, sep } from '../src/transform'

it.skip('aan', () => {
  const img = readPpm('src/assets/big.ppm')
  img.blocks.forEach((b) => {
    aan(b.Y)
    aan(b.Cb)
    aan(b.Cr)
  })
})

it.skip('dct', () => {
  const img = readPpm('src/assets/big.ppm')
  img.blocks.forEach((b) => {
    dct(b.Y)
    dct(b.Cb)
    dct(b.Cr)
  })
})

it.skip('sep', () => {
  const img = readPpm('src/assets/big.ppm')
  img.blocks.forEach((b) => {
    sep(b.Y)
    sep(b.Cb)
    sep(b.Cr)
  })
})
