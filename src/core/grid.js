import { hash } from './config.js'

export class Grid {
  constructor(c) {
    this.size = c.size
    this.pitch = c.size + 2
    this.layer = this.pitch ** 2
    this.current = new Uint8Array(this.pitch ** 3)
    this.previous = this.current.slice()
    this.next = this.current.slice()
    this.material = this.current.slice()
    this.each((i, x, y, z) => {
      if (c.initial === 'noise') this.current[i] = +(hash(i ^ c.seed) % 100 < 8)
      if (c.initial === 'center') this.current[i] = +(x === c.size / 2 && y === x && z === x)
    })
  }
  index(x, y, z) {
    return (z + 1) * this.layer + (y + 1) * this.pitch + x + 1
  }
  each(fn) {
    const n = this.size
    for (let z = 0; z < n; z++)
      for (let y = 0; y < n; y++) {
        let i = this.index(0, y, z)
        for (let x = 0; x < n; x++, i++) fn(i, x, y, z)
      }
  }
  rotate() {
    ;[this.previous, this.current, this.next] = [this.current, this.next, this.previous]
  }
}

export function offsets(g, count) {
  const result = []
  for (let z = -1; z <= 1; z++)
    for (let y = -1; y <= 1; y++)
      for (let x = -1; x <= 1; x++) {
        const d = Math.abs(x) + Math.abs(y) + Math.abs(z)
        if (d && d <= (count === 6 ? 1 : count === 18 ? 2 : 3)) result.push(x + y * g.pitch + z * g.layer)
      }
  return result
}

// Precompute the ghost shell, including edges and corners for diagonal stencils.
export function boundary(g, kind) {
  const n = g.size
  const map = (v) => (kind === 'periodic' ? (v + n) % n : Math.max(0, Math.min(n - 1, v)))
  const dst = [],
    src = []
  for (let z = -1; z <= n; z++)
    for (let y = -1; y <= n; y++)
      for (let x = -1; x <= n; x++) {
        if (x >= 0 && x < n && y >= 0 && y < n && z >= 0 && z < n) continue
        dst.push(g.index(x, y, z))
        src.push(g.index(map(x), map(y), map(z)))
      }
  return (array = g.current) => {
    for (let j = 0; j < dst.length; j++) array[dst[j]] = kind === 'absorb' ? 0 : array[src[j]]
  }
}
