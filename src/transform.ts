import { qTableC, qTableY } from './constants'

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

export function dct(X: Int16Array) {
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

export function dqtY(X: Int16Array) {
  for (let i = 0; i < 64; i++)
    X[i] = X[i] / qTableY[i]
}

export function dqtC(X: Int16Array) {
  for (let i = 0; i < 64; i++)
    X[i] = X[i] / qTableC[i]
}
