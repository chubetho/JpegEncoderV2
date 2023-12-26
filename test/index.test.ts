import { writeFileSync } from 'node:fs'
import { expect, it } from 'bun:test'
import { encode } from '../src'

it('foo', () => {
  const buffer = encode('src/assets/small.ppm')
  expect(buffer).toMatchSnapshot()
  buffer && writeFileSync('src/output/test.jpg', buffer)
})
