import test from 'node:test'
import assert from 'node:assert/strict'
import { Experiment } from '../src/core/experiment.js'
import { defaults, rules, boundaries, validate } from '../src/core/config.js'
import { Engine } from '../src/core/engine.js'
import { operators } from '../src/core/rule.js'
import { signal } from '../src/core/oscillator.js'
import { analyze, analyzeImage } from '../src/core/analyzer.js'
import { planSweep, trial } from '../src/core/sweep.js'
const base = () => defaults(16)
const total = (a) => a.reduce((sum, v) => sum + v, 0)

test('causalità: nessun arrivo sulla faccia opposta prima di 15 trasmissioni', () => {
  const c = { ...base(), rule: 'or', boundary: 'absorb' }
  Object.assign(c.sources[0], { wave: 'impulse', radius: 0 })
  const exp = new Experiment(c)
  exp.advance(15)
  assert.equal(total(exp.observer.direct), 0)
  exp.step()
  assert.equal(total(exp.observer.direct), 1)
})

for (const neighbors of [6, 18, 26])
  for (const edge of boundaries) {
    test('stencil sincrono contro riferimento cartesiano: ' + neighbors + ' / ' + edge, () => {
      const c = { ...base(), sources: [], initial: 'noise', neighbors, boundary: edge }
      const e = new Engine(c),
        g = e.grid,
        n = c.size
      const read = (x, y, z) => {
        if (edge === 'absorb' && [x, y, z].some((k) => k < 0 || k >= n)) return 0
        const map = (k) => (edge === 'periodic' ? (k + n) % n : Math.min(n - 1, Math.max(0, k)))
        return g.current[g.index(map(x), map(y), map(z))]
      }
      for (const rule of rules) {
        e.configure({ ...c, rule })
        const expected = []
        g.each((i, x, y, z) => {
          let cnt = 0
          for (let dz = -1; dz <= 1; dz++)
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const d = Math.abs(dx) + Math.abs(dy) + Math.abs(dz)
                if (d > 0 && d <= (neighbors === 6 ? 1 : neighbors === 18 ? 2 : 3))
                  cnt += read(x + dx, y + dy, z + dz)
              }
          expected.push(operators[rule](cnt, g.current[i], g.previous[i], neighbors, c.threshold))
        })
        e.step()
        const actual = []
        g.each((i) => actual.push(g.current[i]))
        assert.deepEqual(actual, expected)
      }
    })
  }
test('due sorgenti XOR coincidenti e in fase si annullano', () => {
  const c = base()
  c.sources.push(structuredClone(c.sources[0]))
  const e = new Engine(c)
  for (let t = 0; t < 20; t++) e.step()
  assert.equal(total(e.grid.current), 0)
})
test('reversibilità a due stati senza eccitazioni', () => {
  const e = new Engine({ ...base(), sources: [], initial: 'noise' })
  const unpack = (g) => {
    const a = []
    g.each((i) => a.push(g.current[i]))
    return a
  }
  const start = unpack(e.grid)
  e.step()
  e.step()
  const g = e.grid
  ;[g.current, g.previous] = [g.previous, g.current]
  e.step()
  assert.deepEqual(unpack(g), start)
})
test('la sabbia conserva la massa e il registro riproduce gli interventi al passo corretto', () => {
  const c = { ...base(), initial: 'noise', window: 6 }
  Object.assign(c.sources[0], { wave: 'random', intensity: 65 })
  const exp = new Experiment(c),
    mass = total(exp.observer.sand)
  exp.advance(33)
  assert.equal(total(exp.observer.sand), mass)
  exp.edit({
    ...c,
    neighbors: 26,
    face: 'X-',
    regions: [{ kind: 'mirror', x: 3, y: 0, z: 0, x2: 4, y2: 12, z2: 13 }],
  })
  exp.step()
  exp.edit({ ...exp.engine.config, boundary: 'periodic' })
  exp.advance(11)
  const copy = Experiment.replay(JSON.parse(JSON.stringify(exp.record('sand'))))
  for (const k of ['current', 'previous']) assert.deepEqual(copy.engine.grid[k], exp.engine.grid[k])
  for (const k of ['direct', 'count', 'sand', 'trend']) assert.deepEqual(copy.observer[k], exp.observer[k])
  assert.ok(exp.engine.grid.current.every((v) => v === 0 || v === 1))
})
test('finestra temporale mobile coincide con la somma degli ultimi cambi reali', () => {
  const exp = new Experiment({ ...base(), initial: 'noise', window: 4 })
  const frames = [exp.observer.direct.slice()]
  for (let j = 0; j < 17; j++) {
    exp.step()
    frames.push(exp.observer.direct.slice())
  }
  const o = exp.observer
  for (let i = 0; i < 256; i++) {
    const expected = [14, 15, 16, 17].reduce((s, t) => s + (frames[t][i] ^ frames[t - 1][i]), 0)
    assert.equal(o.count[i], expected)
    assert.equal(o.image('nodal', 0.25)[i], expected <= 1 ? 0 : 255)
  }
  assert.equal(analyze(o).samples, 4)
})
test('muro riflettente, ostacolo e assorbitore hanno risposte locali definite', () => {
  const c = { ...base(), sources: [], rule: 'or', boundary: 'absorb' }
  function at(kind) {
    const e = new Engine({ ...c, regions: [{ kind, x: 4, x2: 4, y: 4, y2: 4, z: 4, z2: 4 }] })
    const g = e.grid,
      i = g.index(3, 4, 4)
    g.current[i] = 1
    e.step()
    const a = [g.current[i], g.current[g.index(4, 4, 4)]]
    e.step()
    return [...a, g.current[g.index(4, 4, 4)]]
  }
  assert.deepEqual(at('mirror').slice(0, 2), [1, 0])
  assert.deepEqual(at('obstacle').slice(0, 2), [0, 0])
  assert.deepEqual(at('absorber'), [0, 1, 0])
})
test('una faccia uniforme non è classificata come struttura persistente', () => {
  const e = new Experiment({ ...base(), sources: [], window: 3 })
  e.advance(3)
  assert.deepEqual(analyze(e.observer), {
    density: 0,
    entropy: 0,
    symmetry: 1,
    activity: 0,
    persistence: 1,
    persistent: false,
    samples: 3,
  })
})
test('segnale con fase, durata e sequenza esplicite', () => {
  const s = {
    ...base().sources[0],
    frequency: 0.25,
    wave: 'sequence',
    sequence: '1000',
    phase: 90,
    duration: 5,
  }
  assert.deepEqual(
    Array.from({ length: 8 }, (_, t) => signal(s, t, 12)),
    [0, 0, 0, 1, 0, 0, 0, 0],
  )
})
test('scansioni fattoriali e replay producono gli stessi pixel', () => {
  const spec = {
    frequencies: [0.1, 0.2],
    secondary: [null, 0.3],
    phases: [0, 90],
    laws: ['exact', 'history'],
    steps: 28,
  }
  const configs = planSweep(base(), spec)
  assert.equal(configs.length, 16)
  const r = trial(configs.at(-1), 28, 'activity'),
    exp = Experiment.replay(r.record)
  assert.deepEqual(r.pixels, exp.observer.image('activity', exp.engine.config.nodal))
  assert.deepEqual(r.metrics, { ...analyze(exp.observer), image: analyzeImage(r.pixels, 16) })
})
test('validazione di registri e coordinate', () => {
  const c = base()
  c.sources[0].x = 16
  assert.throws(() => validate(c))
  assert.throws(() => Experiment.replay({ format: 'altro' }))
})
