import { writeFileSync } from 'node:fs'
import { expect, it } from 'bun:test'
import { encode } from '../src'

it('small', () => {
  const buffer = encode('src/assets/small.ppm')
  expect(buffer).toMatchSnapshot()
  buffer && writeFileSync('src/output/small.jpg', buffer)
})

it('big', () => {
  const buffer = encode('src/assets/big.ppm')
  buffer && writeFileSync('src/output/big.jpg', buffer)
})

it.skip('nasa', () => {
  const buffer = encode('src/assets/nasa.ppm')
  buffer && writeFileSync('src/output/nasa.jpg', buffer)
})
