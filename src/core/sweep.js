import { Experiment } from './experiment.js'
import { analyze, analyzeImage } from './analyzer.js'
import { check, number, oscillator, rules } from './config.js'

export function planSweep(c, spec) {
  const { frequencies, secondary, phases, laws, steps } = spec
  number(steps, 1, 100000, 'passi', true)
  for (const a of [frequencies, secondary, phases, laws])
    check(Array.isArray(a) && a.length, 'Asse di scansione vuoto')
  const total = frequencies.length * secondary.length * phases.length * laws.length
  check(total <= 512, 'Massimo 512 prove per scansione')
  frequencies.forEach((f) => number(f, 0.001, 0.5, 'frequenza A'))
  secondary.forEach((f) => {
    if (f !== null) number(f, 0.001, 0.5, 'frequenza B')
  })
  phases.forEach((p) => number(p, 0, 360, 'fase'))
  laws.forEach((r) => check(rules.includes(r), 'Regola sconosciuta'))
  const configs = []
  for (const rule of laws)
    for (const frequency of frequencies)
      for (const b of secondary)
        for (const phase of phases) {
          const config = structuredClone(c)
          config.rule = rule
          config.sources[0] ??= oscillator(c.size)
          Object.assign(config.sources[0], { frequency, phase, enabled: true })
          if (b !== null) {
            config.sources[1] ??= { ...oscillator(c.size), x: Math.floor(c.size / 4) }
            Object.assign(config.sources[1], { frequency: b, enabled: true })
          }
          configs.push(config)
        }
  return configs
}
export function trial(config, steps, mode) {
  const exp = new Experiment(config)
  exp.advance(steps)
  const pixels = exp.observer.image(mode, config.nodal)
  return {
    record: exp.record(mode),
    metrics: { ...analyze(exp.observer), image: analyzeImage(pixels, config.size) },
    pixels,
  }
}
