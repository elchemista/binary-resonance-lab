import { Engine } from './engine.js'
import { Observer } from './observer.js'
import { validate, check, number, modes } from './config.js'

export class Experiment {
  constructor(config) {
    this.initial = structuredClone(validate(config))
    this.engine = new Engine(config)
    this.observer = new Observer(this.engine)
    this.events = []
  }
  step() {
    this.engine.step()
    this.observer.update(this.engine)
  }
  advance(n) {
    for (let i = 0; i < n; i++) this.step()
  }
  edit(config) {
    const old = this.engine.config
    validate(config)
    for (const key of ['size', 'seed', 'initial'])
      check(config[key] === old[key], 'Nuova prova richiesta: ' + key)
    this.engine.configure(config)
    if (old.face !== config.face || old.window !== config.window) this.observer = new Observer(this.engine)
    else this.observer.read(this.engine)
    this.events.push({ tick: this.engine.tick, config: structuredClone(config) })
  }
  record(mode = 'direct') {
    return {
      format: 'binary-resonance-lab/1',
      config: structuredClone(this.initial),
      events: structuredClone(this.events),
      tick: this.engine.tick,
      mode,
    }
  }
  static replay(record) {
    check(record?.format === 'binary-resonance-lab/1', 'Formato esperimento sconosciuto')
    number(record.tick, 0, 1e7, 'tick', true)
    check(modes.includes(record.mode) && Array.isArray(record.events), 'Registro non valido')
    const exp = new Experiment(record.config)
    for (const event of record.events) {
      number(event.tick, exp.engine.tick, record.tick, 'tick evento', true)
      exp.advance(event.tick - exp.engine.tick)
      exp.edit(event.config)
    }
    exp.advance(record.tick - exp.engine.tick)
    return exp
  }
}
