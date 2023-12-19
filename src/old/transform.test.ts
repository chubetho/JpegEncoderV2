import { expect, it } from 'bun:test'
import { aan, dct, idct, sep } from './transform'

it('dct', () => {
  /* eslint-disable */
  const O = new Float32Array([
    16, 11, 10, 16, 24, 40, 51, 61,
    12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56,
    14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77,
    24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103, 99,
  ])
  /* eslint-enable */

  function compare(X1: Float32Array, X2: Float32Array) {
    return X1.reduce((acc, cur, idx) => acc + Math.abs(cur - X2[idx]), 0) / X1.length
  }

  const tolerance = 1e-5
  expect(compare(idct(dct(O)), O)).toBeLessThan(tolerance)
  expect(compare(idct(sep(O)), O)).toBeLessThan(tolerance)
  expect(compare(idct(aan(structuredClone(O))), O)).toBeLessThan(tolerance)
})
