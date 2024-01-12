import { writeFileSync } from 'node:fs'
import { expect, it } from 'bun:test'
import { encoder } from '../src'

it('small_sub', () => {
  const buffer = encoder('src/assets/small.ppm', { subsampling: true })
  expect(buffer).toMatchSnapshot()
  writeFileSync('src/output/small_sub.jpg', buffer)
})

it('small', () => {
  const buffer = encoder('src/assets/small.ppm', { subsampling: false })
  expect(buffer).toMatchSnapshot()
  writeFileSync('src/output/small.jpg', buffer)
})

it('medium_sub', () => {
  const buffer = encoder('src/assets/medium.ppm', { subsampling: true })
  expect(buffer).toMatchSnapshot()
  writeFileSync('src/output/medium_sub.jpg', buffer)
})

it('medium', () => {
  const buffer = encoder('src/assets/medium.ppm', { subsampling: false })
  expect(buffer).toMatchSnapshot()
  writeFileSync('src/output/medium.jpg', buffer)
})

it.skip('big_sub', () => {
  const buffer = encoder('src/assets/big.ppm', { subsampling: true })
  writeFileSync('src/output/big_sub.jpg', buffer)
})

it.skip('big', () => {
  const buffer = encoder('src/assets/big.ppm', { subsampling: false })
  writeFileSync('src/output/big.jpg', buffer)
})

it.skip('nasa_sub', () => {
  const buffer = encoder('src/assets/nasa.ppm', { subsampling: true })
  writeFileSync('src/output/nasa_sub.jpg', buffer)
})

it.skip('nasa', () => {
  const buffer = encoder('src/assets/nasa.ppm', { subsampling: false })
  writeFileSync('src/output/nasa.jpg', buffer)
})
