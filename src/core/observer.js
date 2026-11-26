import { hash } from './config.js'

function positions(g, face) {
  const n = g.size,
    depth = face[1] === '+' ? n - 1 : 0
  const ids = new Uint32Array(n * n)
  for (let v = 0; v < n; v++)
    for (let u = 0; u < n; u++) {
      const xyz = face[0] === 'Z' ? [u, v, depth] : face[0] === 'Y' ? [u, depth, v] : [depth, u, v]
      ids[v * n + u] = g.index(...xyz)
    }
  return ids
}
export class Observer {
  constructor(engine) {
    const c = engine.config,
      n = c.size
    this.size = n
    this.ids = positions(engine.grid, c.face)
    this.direct = new Uint8Array(n * n)
    this.count = new Uint16Array(n * n)
    this.ring = Array.from({ length: c.window }, () => new Uint8Array(n * n))
    this.samples = 0
    this.cursor = 0
    this.sand = Uint8Array.from(this.ids, (i) => +(hash(i ^ c.seed) % 100 < 24))
    this.trend = []
    this.read(engine)
  }
  read(engine) {
    this.ids.forEach((id, i) => {
      this.direct[i] = engine.grid.current[id] & 1
    })
  }
  update(engine) {
    const bits = engine.grid.current,
      delta = this.ring[this.cursor]
    let changed = 0
    for (let i = 0; i < this.ids.length; i++) {
      const bit = bits[this.ids[i]] & 1,
        diff = bit ^ this.direct[i]
      this.count[i] += diff - delta[i]
      delta[i] = diff
      this.direct[i] = bit
      changed += diff
    }
    this.samples = Math.min(this.ring.length, this.samples + 1)
    this.cursor = (this.cursor + 1) % this.ring.length
    this.trend.push(changed / this.ids.length)
    if (this.trend.length > 100) this.trend.shift()
    this.moveSand(engine.tick, engine.config.seed)
  }
  moveSand(tick, seed) {
    const n = this.size,
      sand = this.sand,
      count = this.count
    const original = sand.slice()
    for (let i = 0; i < sand.length; i++) {
      if (!original[i]) continue
      const x = i % n,
        y = Math.floor(i / n),
        start = hash(seed ^ tick ^ i) % 4
      let target = i
      for (let j = 0; j < 4; j++) {
        const d = (j + start) % 4
        if (
          (d === 0 && x === 0) ||
          (d === 1 && x === n - 1) ||
          (d === 2 && y === 0) ||
          (d === 3 && y === n - 1)
        )
          continue
        const k = i + [-1, 1, -n, n][d]
        if (!original[k] && !sand[k] && count[k] < count[target]) target = k
      }
      if (target !== i) {
        sand[i] = 0
        sand[target] = 1
      }
    }
  }
  image(mode, threshold) {
    if (mode === 'direct') return Uint8Array.from(this.direct, (b) => 255 * (1 - b))
    if (mode === 'sand') return Uint8Array.from(this.sand, (b) => 255 * (1 - b))
    return Uint8Array.from(this.count, (k) => {
      const rate = k / Math.max(1, this.samples)
      return mode === 'nodal' ? (rate <= threshold ? 0 : 255) : Math.round(255 * (1 - rate))
    })
  }
}
