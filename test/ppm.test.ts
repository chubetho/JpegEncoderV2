import { expect, it } from 'bun:test'
import { readPpm } from '../src/ppm.js'

it.skip('read ppm', () => {
  const image = readPpm('src/assets/img_1_32.ppm')
  expect(image).toMatchSnapshot()
})
