import { validate, rules } from './config.js'
import { Grid, offsets, boundary } from './grid.js'
import { signal, footprint } from './oscillator.js'
import { ruleTable } from './rule.js'

const LOCKED = 250,
  MIRROR = 251,
  LOSS = 252

export class Engine {
  constructor(config) {
    validate(config)
    this.grid = new Grid(config)
    this.tick = 0
    this.configure(config)
  }
  configure(config) {
    this.config = structuredClone(validate(config))
    const c = this.config,
      g = this.grid
    this.neighbors = offsets(g, c.neighbors)
    this.refreshBoundary = boundary(g, c.boundary)
    this.table = ruleTable(c)
    this.base = rules.indexOf(c.rule)
    g.material.fill(this.base)
    this.hasMirrors = false
    for (const r of c.regions) {
      let code = rules.indexOf(r.kind)
      if (code < 0) code = r.kind === 'mirror' ? MIRROR : r.kind === 'absorber' ? LOSS : LOCKED
      if (code === MIRROR) this.hasMirrors = true
      for (let z = r.z; z <= r.z2; z++)
        for (let y = r.y; y <= r.y2; y++) {
          const start = g.index(r.x, y, z),
            end = g.index(r.x2, y, z) + 1
          g.material.fill(code, start, end)
        }
    }
    g.each((i) => {
      if (g.material[i] === LOCKED || g.material[i] === MIRROR) {
        g.current[i] = 0
        g.previous[i] = 0
      }
    })
    this.refreshBoundary(g.material)
    this.sources = c.sources.map((s, j) => ({ s, cells: footprint(g, s, c.seed + j), seed: c.seed + j }))
  }
  step() {
    const g = this.grid,
      n = g.size,
      a = g.current,
      prev = g.previous,
      out = g.next,
      m = g.material
    const os = this.neighbors,
      table = this.table,
      p = g.pitch,
      l = g.layer
    this.refreshBoundary()
    for (let z = 0; z < n; z++)
      for (let y = 0; y < n; y++) {
        let i = g.index(0, y, z)
        for (const end = i + n; i < end; i++) {
          const code = m[i]
          if (code === MIRROR || code === LOCKED || (code === LOSS && this.tick % 2 === 1)) {
            out[i] = 0
            continue
          }
          let count = 0
          if (os.length === 6 && !this.hasMirrors) {
            count = a[i - 1] + a[i + 1] + a[i - p] + a[i + p] + a[i - l] + a[i + l]
          } else {
            for (let j = 0; j < os.length; j++) {
              const neighbor = i + os[j]
              count += this.hasMirrors && m[neighbor] === MIRROR ? a[i] : a[neighbor]
            }
          }
          out[i] = table[(code === LOSS ? this.base : code) * 128 + count * 4 + a[i] * 2 + prev[i]]
        }
      }
    for (const { s, cells, seed } of this.sources)
      if (signal(s, this.tick, seed)) {
        for (const i of cells) if (m[i] < LOCKED || (m[i] === LOSS && this.tick % 2 === 0)) out[i] ^= 1
      }
    g.rotate()
    this.tick++
  }
}
