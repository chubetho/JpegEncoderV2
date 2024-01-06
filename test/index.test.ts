import { writeFileSync } from 'node:fs'
import { expect, it } from 'bun:test'
import { encode } from '../src'

it('small', () => {
  const buffer = encode('src/assets/small.ppm')
  expect(buffer).toMatchSnapshot()
  buffer && writeFileSync('src/output/small.jpg', buffer)
})

it.skip('img_1_32', () => {
  const buffer = encode('src/assets/img_1_32.ppm')
  buffer && writeFileSync('src/output/img_1_32.jpg', buffer)
})

it.skip('big', () => {
  const buffer = encode('src/assets/big.ppm', false)
  buffer && writeFileSync('src/output/big.jpg', buffer)
})

it.skip('nasa', () => {
  const buffer = encode('src/assets/nasa.ppm')
  buffer && writeFileSync('src/output/nasa.jpg', buffer)
})
