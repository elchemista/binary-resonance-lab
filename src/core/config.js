export const sizes = [16, 32, 64, 128]
export const rules = ['history', 'xor', 'or', 'and', 'exact', 'threshold', 'memory']
export const boundaries = ['reflect', 'absorb', 'periodic']
export const faces = ['Z+', 'Z-', 'X+', 'X-', 'Y+', 'Y-']
export const modes = ['direct', 'activity', 'nodal', 'sand']
export const waves = ['square', 'impulse', 'sequence', 'pulse', 'random', 'sine', 'triangle']
export const materials = ['obstacle', 'cavity', 'mirror', 'absorber', ...rules]

export function oscillator(size) {
  return {
    x: size / 2,
    y: size / 2,
    z: 0,
    frequency: 0.125,
    intensity: 100,
    phase: 0,
    wave: 'square',
    direction: 'Z+',
    radius: 1,
    duration: 0,
    enabled: true,
    sequence: '1001',
  }
}
export function defaults(size = 32) {
  return {
    size,
    seed: 42,
    initial: 'empty',
    rule: 'history',
    threshold: 2,
    neighbors: 6,
    boundary: 'reflect',
    sources: [oscillator(size)],
    regions: [],
    face: 'Z+',
    window: 24,
    nodal: 0.08,
  }
}
export function check(value, message) {
  if (!value) throw new Error(message)
}
export function number(v, min, max, name, integer = false) {
  check(
    Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v)),
    'Valore non valido: ' + name,
  )
}
export function validate(c) {
  const choice = (v, list, name) => check(list.includes(v), 'Opzione non valida: ' + name)
  choice(c.size, sizes, 'dimensione')
  number(c.seed, 0, 0xffffffff, 'seed', true)
  choice(c.initial, ['empty', 'center', 'noise'], 'stato iniziale')
  choice(c.rule, rules, 'regola')
  choice(c.boundary, boundaries, 'confini')
  choice(c.neighbors, [6, 18, 26], 'vicinato')
  choice(c.face, faces, 'faccia')
  number(c.threshold, 1, 26, 'soglia', true)
  number(c.window, 1, 256, 'finestra', true)
  number(c.nodal, 0, 1, 'soglia nodale')
  check(Array.isArray(c.sources) && c.sources.length <= 32, 'Massimo 32 generatori')
  for (const s of c.sources) {
    for (const axis of ['x', 'y', 'z']) number(s[axis], 0, c.size - 1, axis, true)
    number(s.frequency, 0.001, 0.5, 'frequenza')
    number(s.intensity, 0, 100, 'intensità')
    number(s.phase, 0, 360, 'fase')
    number(s.radius, 0, c.size - 1, 'raggio', true)
    number(s.duration, 0, 1e7, 'durata', true)
    choice(s.wave, waves, 'segnale')
    choice(s.direction, ['all', ...faces], 'direzione')
    check(
      typeof s.sequence === 'string' && /^[01]{1,128}$/.test(s.sequence),
      'Sequenza binaria da 1 a 128 bit',
    )
    check(typeof s.enabled === 'boolean', 'Attivazione non valida')
  }
  check(Array.isArray(c.regions) && c.regions.length <= 64, 'Massimo 64 regioni')
  for (const r of c.regions) {
    choice(r.kind, materials, 'materiale')
    for (const axis of ['x', 'y', 'z']) {
      number(r[axis], 0, c.size - 1, axis, true)
      number(r[axis + '2'], r[axis], c.size - 1, axis + '2', true)
    }
  }
  return c
}

// Integer mixer shared by all seeded decisions. No global random stream.
export function hash(a) {
  a = Math.imul(a ^ (a >>> 16), 0x21f0aaad)
  a = Math.imul(a ^ (a >>> 15), 0x735a2d97)
  return (a ^ (a >>> 15)) >>> 0
}
