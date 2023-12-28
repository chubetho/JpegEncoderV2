import { expect, it } from 'bun:test'
import { readPpm, writePpm } from '../src/ppm.js'

it('read ppm', () => {
  const image = readPpm('src/assets/img_1_32.ppm')
  expect(image).toMatchSnapshot()
})

it.skip('write ppm', () => {
  const image = readPpm('src/assets/img_1_1.ppm')
  writePpm('src/output/write.ppm', image)
})

it('read big ppm', () => {
  readPpm('src/assets/big.ppm')
})
