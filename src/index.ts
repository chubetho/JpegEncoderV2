import type { TaskResult } from 'tinybench'
import { Bench } from 'tinybench'
import { printTable } from 'console-table-printer'
import { readPpm } from './ppm'
import { aan, dct, sep } from './transform'

const bench = new Bench({ time: 0, iterations: 1 })
bench
  .add('aan', () => {
    const img = readPpm('src/assets/big.ppm')
    img.blocks.forEach((b) => {
      aan(b.Y)
      aan(b.Cb)
      aan(b.Cr)
    })
  })
  .add('sep', () => {
    const img = readPpm('src/assets/big.ppm')
    img.blocks.forEach((b) => {
      sep(b.Y)
      sep(b.Cb)
      sep(b.Cr)
    })
  })
  .add('dct', () => {
    const img = readPpm('src/assets/big.ppm')
    img.blocks.forEach((b) => {
      dct(b.Y)
      dct(b.Cb)
      dct(b.Cr)
    })
  })

await bench.run()
const tables = bench.table()
const results = (bench.results as TaskResult[])
  .map(({ min, max, mean, samples, totalTime }, i) => ({
    name: tables[i]?.['Task Name'] ?? '',
    iterations: samples.length,
    min: Math.round(min * 1_000) / 1_000_000,
    max: Math.round(max * 1_000) / 1_000_000,
    mean: Math.round(mean * 1_000) / 1_000_000,
    totalTime: Math.round(totalTime * 1_000) / 1_000_000,
  }))
printTable(results)
