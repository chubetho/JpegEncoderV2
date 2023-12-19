import { argv } from 'node:process'
import { readPpm } from './ppm'
import { aan, dct, sep } from './transform'

const [file, _d, ..._] = argv.splice(2)
const duration = Number.isNaN(Number.parseInt(_d)) ? 10_000 : Number.parseInt(_d)
const fns = [
  { name: 'aan', fn: aan },
  { name: 'sep', fn: sep },
  { name: 'dct', fn: dct },
]

console.log(`duration: ${duration / 1000}s\n==============\n`)

for (const x of fns)
  await fn(x)

function fn(args: typeof fns[0]) {
  return new Promise((resolve) => {
    let count = 0
    let stop = false
    const id = setInterval(() => {
      if (stop) {
        clearInterval(id)
        console.log(`${args.name} ${Math.round(duration / count) / 1_000}s (${count} times)`)
        resolve(undefined)
      }
      else {
        count++
        const img = readPpm(file)
        img.blocks.forEach((b) => {
          args.fn(b.Y)
          args.fn(b.Cb)
          args.fn(b.Cr)
        })
      }
    }, 0)

    setTimeout(() => {
      stop = true
    }, duration)
  })
}
