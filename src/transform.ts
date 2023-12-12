const sqrt2 = Math.SQRT2
const one_sqrt2 = 1 / sqrt2
const cos = Math.cos
const round = Math.round
const pi = Math.PI
const pi_16 = pi / 16

const m0 = cos(2 * pi_16)
const m1 = cos(4 * pi_16)
const m5 = cos(6 * pi_16)
const m2 = m0 - m5
const m3 = m1
const m4 = m0 + m5

const s0 = 0.5 * one_sqrt2
const s1 = 1 / (4 * cos(1 * pi_16))
const s2 = 1 / (4 * cos(2 * pi_16))
const s3 = 1 / (4 * cos(3 * pi_16))
const s4 = 1 / (4 * cos(4 * pi_16))
const s5 = 1 / (4 * cos(5 * pi_16))
const s6 = 1 / (4 * cos(6 * pi_16))
const s7 = 1 / (4 * cos(7 * pi_16))

export function dct(X: number[]) {
  const C = (x: number) => x === 0 ? one_sqrt2 : 1
  const Y: number[] = []
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++)
          sum += X[x * 8 + y] * cos((2 * x + 1) * i * pi_16) * cos((2 * y + 1) * j * pi_16)
      }
      sum = 1 / 4 * C(i) * C(j) * sum
      Y[i * 8 + j] = sum
      sum = 0
    }
  }
  return Y
}

export function idct(X: number[]) {
  const C = (x: number) => x === 0 ? one_sqrt2 : 1
  const Y: number[] = []
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      let sum = 0
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++)
          sum += C(i) * C(j) * X[i * 8 + j] * cos((2 * x + 1) * i * pi_16) * cos((2 * y + 1) * j * pi_16)
      }
      Y[x * 8 + y] = round(1 / 4 * sum)
      sum = 0
    }
  }
  return Y
}

export function aan(X: number[]) {
  for (let i = 0; i < 8; i++) {
    const b0 = X[i * 8 + 0] + X[i * 8 + 7]
    const b1 = X[i * 8 + 1] + X[i * 8 + 6]
    const b2 = X[i * 8 + 2] + X[i * 8 + 5]
    const b3 = X[i * 8 + 3] + X[i * 8 + 4]
    const b4 = X[i * 8 + 3] - X[i * 8 + 4]
    const b5 = X[i * 8 + 2] - X[i * 8 + 5]
    const b6 = X[i * 8 + 1] - X[i * 8 + 6]
    const b7 = X[i * 8 + 0] - X[i * 8 + 7]

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
    const b0 = X[0 * 8 + i] + X[7 * 8 + i]
    const b1 = X[1 * 8 + i] + X[6 * 8 + i]
    const b2 = X[2 * 8 + i] + X[5 * 8 + i]
    const b3 = X[3 * 8 + i] + X[4 * 8 + i]
    const b4 = X[3 * 8 + i] - X[4 * 8 + i]
    const b5 = X[2 * 8 + i] - X[5 * 8 + i]
    const b6 = X[1 * 8 + i] - X[6 * 8 + i]
    const b7 = X[0 * 8 + i] - X[7 * 8 + i]

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

    X[0 * 8 + i] = g0 * s0
    X[1 * 8 + i] = g5 * s1
    X[2 * 8 + i] = g2 * s2
    X[3 * 8 + i] = g7 * s3
    X[4 * 8 + i] = g1 * s4
    X[5 * 8 + i] = g4 * s5
    X[6 * 8 + i] = g3 * s6
    X[7 * 8 + i] = g6 * s7
  }

  return X
}

export function sep(X: number[][]) {
  const A: number[][] = []
  for (let k = 0; k < 8; k++) {
    const c0 = k === 0 ? one_sqrt2 : 1
    A[k] = []
    for (let n = 0; n < 8; n++)
      A[k][n] = c0 * 0.5 * cos((2 * n + 1) * k * pi_16)
  }

  return dot(A, dot(X, transpose(A)))
}

function transpose(matrix: number[][]) {
  const transposed: number[][] = []
  for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      transposed[colIdx] ||= []
      transposed[colIdx][rowIdx] = matrix[rowIdx][colIdx]
    }
  }
  return transposed
}

function dot(X: number[][], Y: number[][]) {
  const res: number[][] = []

  for (let i = 0; i < 8; i++) {
    const xRow = X[i % 8]
    res[i] = []
    for (let j = 0; j < 8; j++) {
      const yCol = Y.map(row => row[j % 8])
      const v = xRow.reduce((acc, cur, idx) => acc + cur * yCol[idx], 0)
      res[i][j] = v
    }
  }

  return res
}
