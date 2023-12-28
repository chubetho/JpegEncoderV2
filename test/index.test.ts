import { writeFileSync } from 'node:fs'
import { expect, it } from 'bun:test'
import { encode } from '../src'

it('small', () => {
  const buffer = encode('src/assets/small.ppm')
  expect(buffer).toMatchSnapshot()
  buffer && writeFileSync('src/output/small.jpg', buffer)
})

it.only('big', () => {
  const buffer = encode('src/assets/big.ppm')
  buffer && writeFileSync('src/output/big.jpg', buffer)
})
