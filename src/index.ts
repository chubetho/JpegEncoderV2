import { Bench } from 'tinybench'
import Table from 'cli-table'
import { readPpm } from './ppm'
import { aan, dct, sep } from './transform'

const bench = new Bench({ time: 0, iterations: 2 })
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
const table = new Table({ head: ['Task Name', 'Iterations', 'Average Time (s)', 'Margin'] })
bench.table().forEach((r) => {
  table.push([`${r?.['Task Name']}`, `${r?.Samples}`, `${r?.['Average Time (ns)'] ? r?.['Average Time (ns)'] / 1_000_000 : 0}`, `${r?.Margin}`])
})
console.log(table.toString())
