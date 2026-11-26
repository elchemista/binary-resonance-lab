import { hash } from './config.js'

export function signal(s, t, seed) {
  if (!s.enabled || (s.duration && t >= s.duration)) return 0
  const time = t * s.frequency + s.phase / 360
  const phase = time % 1
  switch (s.wave) {
    case 'impulse':
      return +(t === 0)
    case 'sequence':
      return Number(s.sequence[Math.floor(phase * s.sequence.length)])
    case 'pulse':
      return +(phase < 0.125)
    case 'random':
      return hash(seed ^ Math.floor(time * 2)) & 1
    // Four-level pulse-density encoding over successive ticks.
    case 'sine':
      return +((t % 4) + 0.5 < 2 * (1 + Math.sin(2 * Math.PI * phase)))
    case 'triangle':
      return +((t % 4) + 0.5 < 4 * (1 - Math.abs(2 * phase - 1)))
    default:
      return +(phase < 0.5)
  }
}

export function footprint(g, s, seed) {
  const cells = []
  const axis = 'XYZ'.indexOf(s.direction[0])
  const sign = s.direction[1] === '-' ? -1 : 1
  const r = s.radius
  for (let z = Math.max(0, s.z - r); z <= Math.min(g.size - 1, s.z + r); z++)
    for (let y = Math.max(0, s.y - r); y <= Math.min(g.size - 1, s.y + r); y++)
      for (let x = Math.max(0, s.x - r); x <= Math.min(g.size - 1, s.x + r); x++) {
        const dx = x - s.x,
          dy = y - s.y,
          dz = z - s.z
        if (dx * dx + dy * dy + dz * dz > r * r || (axis >= 0 && [dx, dy, dz][axis] * sign < 0)) continue
        const i = g.index(x, y, z)
        if (hash(i ^ seed) / 2 ** 32 < s.intensity / 100) cells.push(i)
      }
  return cells
}
