import { Experiment } from './core/experiment.js'
import { hash } from './core/config.js'
import { analyze, analyzeImage } from './core/analyzer.js'
import { planSweep, trial } from './core/sweep.js'

let exp
function frame(mode, view) {
  const e = exp.engine,
    c = e.config,
    g = e.grid,
    n = g.size,
    data = g.current
  const coords = [],
    states = []
  // Stratified deterministic decimation bounds GPU and transfer cost at large N.
  const budget = 42000
  const axis = 'XYZ'.indexOf(view.axis)
  const slice = Math.min(n - 1, Math.max(0, view.slice))
  const total = axis < 0 ? n ** 3 : n * n
  const stride = Math.max(1, Math.ceil(total / budget))
  for (let start = 0; start < total; start += stride) {
    const j = start + (stride === 1 ? 0 : hash(start) % Math.min(stride, total - start))
    let x = j % n,
      y = Math.floor(j / n) % n,
      z = Math.floor(j / (n * n))
    if (axis === 0) [x, y, z] = [slice, x, y]
    if (axis === 1) [y, z] = [slice, y]
    if (axis === 2) z = slice
    const bit = data[g.index(x, y, z)] & 1
    if (!bit && view.active) continue
    coords.push(x, y, z)
    states.push(bit)
  }
  const positions = new Uint8Array(coords),
    active = new Uint8Array(states)
  const pixels = exp.observer.image(mode, c.nodal)
  postMessage(
    {
      type: 'frame',
      tick: e.tick,
      config: c,
      metrics: { ...analyze(exp.observer), image: analyzeImage(pixels, n) },
      trend: exp.observer.trend,
      positions,
      active,
      pixels,
      mode,
      record: exp.record(mode),
    },
    [positions.buffer, active.buffer, pixels.buffer],
  )
}
onmessage = ({ data: m }) => {
  try {
    if (m.type === 'sweep') {
      const configs = planSweep(m.config, m.spec)
      configs.forEach((c, i) => {
        const result = trial(c, m.spec.steps, m.mode)
        postMessage({ type: 'trial', result, index: i + 1, total: configs.length }, [result.pixels.buffer])
      })
      postMessage({ type: 'complete' })
      return
    }
    if (m.type === 'init') {
      exp = new Experiment(m.config)
      exp.advance(m.steps ?? 0)
    }
    if (m.type === 'import') exp = Experiment.replay(m.record)
    if (m.type === 'edit') exp.edit(m.config)
    if (m.type === 'step') exp.advance(m.steps)
    frame(m.mode, m.view)
  } catch (err) {
    postMessage({ type: 'error', message: err.message })
  }
}
