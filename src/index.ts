import { argv, exit } from 'node:process'
import type { TaskResult } from 'tinybench'
import { Bench } from 'tinybench'
import { printTable } from 'console-table-printer'
import { sleepSync } from 'bun'
import { readPpm } from './ppm'
import { aan, dct, sep } from './transform'

const [file, _iters, _sleep] = argv.splice(2)

const iters = Number.parseInt(_iters)
const sleep = Number.parseInt(_sleep)

const bench = new Bench({ time: 0, iterations: Number.isNaN(iters) ? 1 : iters })
bench
  .add('dct', () => {
    const img = readPpm(file)
    img.blocks.forEach((b) => {
      dct(b.Y)
      dct(b.Cb)
      dct(b.Cr)
    })
    sleepSync(Number.isNaN(sleep) ? 0 : sleep)
  })
  .add('sep', () => {
    const img = readPpm(file)
    img.blocks.forEach((b) => {
      sep(b.Y)
      sep(b.Cb)
      sep(b.Cr)
    })
    sleepSync(Number.isNaN(sleep) ? 0 : sleep)
  })
  .add('aan', () => {
    const img = readPpm(file)
    img.blocks.forEach((b) => {
      aan(b.Y)
      aan(b.Cb)
      aan(b.Cr)
    })
    sleepSync(Number.isNaN(sleep) ? 0 : sleep)
  })

bench.run().then(() => {
  const tables = bench.table()
  const round = (x: number) => Math.round((x - sleep) * 1_000) / 1_000_000
  const results = (bench.results as TaskResult[])
    .map(({ min, max, mean, samples, totalTime, p75, p99, p995, p999 }, i) => ({
      name: tables[i]?.['Task Name'] ?? '',
      iters: samples.length,
      min: round(min),
      max: round(max),
      mean: round(mean),
      p75: round(p75),
      p99: round(p99),
      p995: round(p995),
      p999: round(p999),
      total: round(totalTime),
    }))
  printTable(results)
})
