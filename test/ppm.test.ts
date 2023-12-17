import * as path from 'node:path'
import { expect, it } from 'bun:test'
import { readPpm, writePpm } from '../src/ppm.js'

it('read ppm', () => {
  const filePath = path.resolve('src/assets/img_1_32.ppm')
  const image = readPpm(filePath)
  expect(image).toMatchSnapshot()
})

it.skip('write ppm', () => {
  const filePath = path.resolve('src/assets/img_1_1.ppm')
  const image = readPpm(filePath)
  writePpm('src/output/write.ppm', image)
})

it.skip('read big ppm', () => {
  const filePath = path.resolve('src/assets/big.ppm')
  readPpm(filePath)
})
