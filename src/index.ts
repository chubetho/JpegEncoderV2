import type { TaskResult } from 'tinybench'
import { Bench } from 'tinybench'
import { printTable } from 'console-table-printer'
import { sleepSync } from 'bun'
import { readPpm } from './ppm'
import { aan, dct, sep } from './transform'

const file = 'src/assets/big.ppm'

const sleep = 0
const bench = new Bench({ time: 0, iterations: 1 })
bench
  .add('dct', () => {
    const img = readPpm(file)
    img.blocks.forEach((b) => {
      dct(b.Y)
      dct(b.Cb)
      dct(b.Cr)
    })
    sleepSync(sleep)
  })
  .add('sep', () => {
    const img = readPpm(file)
    img.blocks.forEach((b) => {
      sep(b.Y)
      sep(b.Cb)
      sep(b.Cr)
    })
    sleepSync(sleep)
  })
  .add('aan', () => {
    const img = readPpm(file)
    img.blocks.forEach((b) => {
      aan(b.Y)
      aan(b.Cb)
      aan(b.Cr)
    })
    sleepSync(sleep)
  })

await bench.run()
const tables = bench.table()
const results = (bench.results as TaskResult[])
  .map(({ min, max, mean, samples, totalTime, p75, p99, p995, p999 }, i) => ({
    name: tables[i]?.['Task Name'] ?? '',
    iters: samples.length,
    min: Math.round(min * 1_000 - sleep) / 1_000_000,
    max: Math.round(max * 1_000 - sleep) / 1_000_000,
    mean: Math.round(mean * 1_000 - sleep) / 1_000_000,
    p75: Math.round(p75 * 1_000 - sleep) / 1_000_000,
    p99: Math.round(p99 * 1_000 - sleep) / 1_000_000,
    p995: Math.round(p995 * 1_000 - sleep) / 1_000_000,
    p999: Math.round(p999 * 1_000 - sleep) / 1_000_000,
    total: Math.round(totalTime * 1_000 - sleep) / 1_000_000,
  }))
printTable(results)
