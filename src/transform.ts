const one_sqrt2 = 0.707106781
const cos = Math.cos
const pi_16 = 0.196349541

const CosTable = new Float32Array(64)
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++)
    CosTable[i * 8 + j] = cos((2 * i + 1) * j * pi_16)
}

const A = new Float32Array(64)
for (let k = 0; k < 8; k++) {
  const c0 = k === 0 ? one_sqrt2 : 1
  const tmp = k * 8
  for (let n = 0; n < 8; n++)
    A[tmp + n] = c0 * 0.5 * CosTable[n * 8 + k]
}
const At = transpose(A)

const m0 = 0.923879532 // cos(2 * pi_16)
const m1 = 0.707106780 // cos(4 * pi_16)
const m5 = 0.382683431 // cos(6 * pi_16)
const m2 = m0 - m5
const m3 = m1
const m4 = m0 + m5

const s0 = 0.3535533905 // 0.5 * one_sqrt2
const s1 = 0.2548977895 // 1 / (4 * cos(1 * pi_16))
const s2 = 0.2705980501 // 1 / (4 * cos(2 * pi_16))
const s3 = 0.3006724435 // 1 / (4 * cos(3 * pi_16))
const s4 = 0.3535533908 // 1 / (4 * cos(4 * pi_16))
const s5 = 0.4499881120 // 1 / (4 * cos(5 * pi_16))
const s6 = 0.6532814838 // 1 / (4 * cos(6 * pi_16))
const s7 = 1.2814577306 // 1 / (4 * cos(7 * pi_16))

export function dct(X: Float32Array) {
  const C = (x: number) => x === 0 ? one_sqrt2 : 1
  const Y = new Float32Array(64)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++)
          sum += X[x * 8 + y] * CosTable[x * 8 + i] * CosTable[y * 8 + j]
      }
      Y[i * 8 + j] = 1 / 4 * C(i) * C(j) * sum
      sum = 0
    }
  }

  return Y
}

export function idct(Y: Float32Array) {
  const C = (x: number) => x === 0 ? one_sqrt2 : 1
  const X = new Float32Array(64)
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      let sum = 0
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++)
          sum += C(i) * C(j) * Y[i * 8 + j] * CosTable[x * 8 + i] * CosTable[y * 8 + j]
      }
      X[x * 8 + y] = 1 / 4 * sum
      sum = 0
    }
  }

  return X
}

export function aan(X: Float32Array) {
  for (let i = 0; i < 8; i++) {
    const tmp = i * 8
    const b0 = X[tmp + 0] + X[tmp + 7]
    const b1 = X[tmp + 1] + X[tmp + 6]
    const b2 = X[tmp + 2] + X[tmp + 5]
    const b3 = X[tmp + 3] + X[tmp + 4]
    const b4 = X[tmp + 3] - X[tmp + 4]
    const b5 = X[tmp + 2] - X[tmp + 5]
    const b6 = X[tmp + 1] - X[tmp + 6]
    const b7 = X[tmp + 0] - X[tmp + 7]

    const c0 = b0 + b3
    const c1 = b1 + b2
    const c2 = -b2 + b1
    const c3 = -b3 + b0
    const c4 = -b4 - b5
    const c5 = b5 + b6
    const c6 = b6 + b7
    const c7 = b7

    const d0 = c0 + c1
    const d1 = -c1 + c0
    const d2 = c2 + c3
    const d3 = c3
    const d4 = c4
    const d5 = c5
    const d6 = c6
    const d7 = c7
    const d8 = d4 + d6

    const e8 = d8 * m5
    const e0 = d0
    const e1 = d1
    const e2 = d2 * m1
    const e3 = d3
    const e4 = -d4 * m2 - e8
    const e5 = d5 * m3
    const e6 = d6 * m4 - e8
    const e7 = d7

    const f0 = e0
    const f1 = e1
    const f2 = e2 + e3
    const f3 = e3 - e2
    const f4 = e4
    const f5 = e5 + e7
    const f6 = e6
    const f7 = e7 - e5

    const g0 = f0
    const g1 = f1
    const g2 = f2
    const g3 = f3
    const g4 = f4 + f7
    const g5 = f5 + f6
    const g6 = f5 - f6
    const g7 = f7 - f4

    X[i * 8 + 0] = g0 * s0
    X[i * 8 + 1] = g5 * s1
    X[i * 8 + 2] = g2 * s2
    X[i * 8 + 3] = g7 * s3
    X[i * 8 + 4] = g1 * s4
    X[i * 8 + 5] = g4 * s5
    X[i * 8 + 6] = g3 * s6
    X[i * 8 + 7] = g6 * s7
  }

  for (let i = 0; i < 8; i++) {
    const b0 = X[0 + i] + X[56 + i]
    const b1 = X[8 + i] + X[48 + i]
    const b2 = X[16 + i] + X[40 + i]
    const b3 = X[24 + i] + X[32 + i]
    const b4 = X[24 + i] - X[32 + i]
    const b5 = X[16 + i] - X[40 + i]
    const b6 = X[8 + i] - X[48 + i]
    const b7 = X[0 + i] - X[56 + i]

    const c0 = b0 + b3
    const c1 = b1 + b2
    const c2 = -b2 + b1
    const c3 = -b3 + b0
    const c4 = -b4 - b5
    const c5 = b5 + b6
    const c6 = b6 + b7
    const c7 = b7

    const d0 = c0 + c1
    const d1 = -c1 + c0
    const d2 = c2 + c3
    const d3 = c3
    const d4 = c4
    const d5 = c5
    const d6 = c6
    const d7 = c7
    const d8 = d4 + d6

    const e8 = d8 * m5
    const e0 = d0
    const e1 = d1
    const e2 = d2 * m1
    const e3 = d3
    const e4 = -d4 * m2 - e8
    const e5 = d5 * m3
    const e6 = d6 * m4 - e8
    const e7 = d7

    const f0 = e0
    const f1 = e1
    const f2 = e2 + e3
    const f3 = e3 - e2
    const f4 = e4
    const f5 = e5 + e7
    const f6 = e6
    const f7 = e7 - e5

    const g0 = f0
    const g1 = f1
    const g2 = f2
    const g3 = f3
    const g4 = f4 + f7
    const g5 = f5 + f6
    const g6 = f5 - f6
    const g7 = f7 - f4

    X[0 + i] = g0 * s0
    X[8 + i] = g5 * s1
    X[16 + i] = g2 * s2
    X[24 + i] = g7 * s3
    X[32 + i] = g1 * s4
    X[40 + i] = g4 * s5
    X[48 + i] = g3 * s6
    X[56 + i] = g6 * s7
  }

  return X
}

export function sep(X: Float32Array) {
  return dot(A, dot(X, At))
}

function transpose(X: Float32Array) {
  const res = new Float32Array(64)
  for (let i = 0; i < 8; i++) {
    const tmp = i * 8
    for (let j = 0; j < 8; j++)
      res[j * 8 + i] = X[tmp + j]
  }
  return res
}

function dot(X: Float32Array, Y: Float32Array) {
  const res = new Float32Array(64)
  let index = 0
  for (let r = 0; r < 8; r++) {
    for (let i = 0; i < 8; i++) {
      let sum = 0
      const tmp = r * 8
      for (let j = 0; j < 8; j++)
        sum += X[tmp + j] * Y[j * 8 + i]
      res[index++] = sum
      sum = 0
    }
  }
  return res
}

/* eslint-disable */
const qTableY = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99
]

const qTableC = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99
]

const qTableY__Nikon_Coolpix_2500 = [
  2, 1, 1, 1, 1, 1, 2, 1,
  1, 1, 2, 2, 2, 2, 2, 4,
  3, 2, 2, 2, 2, 5, 4, 4,
  3, 4, 6, 5, 6, 6, 6, 5,
  6, 6, 6, 7, 9, 8, 6, 7,
  9, 7, 6, 6, 8, 11, 8, 9,
  10, 10, 10, 10, 10, 6, 8, 11,
  12, 11, 10, 12, 9, 10, 10, 10
]

const qTableC__Nikon_Coolpix_2500 = [
  2, 2, 2, 2, 2, 2, 5, 3,
  3, 5, 10, 7, 6, 7, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10,
]
/* eslint-enable */
