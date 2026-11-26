import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { PNG } from 'pngjs'
import { Experiment } from './src/core/experiment.js'
import { analyze, analyzeImage } from './src/core/analyzer.js'
import { defaults, check, number } from './src/core/config.js'
import { planSweep, trial } from './src/core/sweep.js'

const json = async (path) => JSON.parse(await readFile(path, 'utf8'))
const saveJSON = (path, data) => writeFile(path, JSON.stringify(data, null, 2) + '\n')
async function save(dir, { record, metrics, pixels }) {
  await mkdir(dir, { recursive: true })
  const n = record.config.size,
    img = new PNG({ width: n, height: n })
  for (let i = 0; i < pixels.length; i++) {
    img.data.fill(pixels[i], 4 * i, 4 * i + 3)
    img.data[4 * i + 3] = 255
  }
  await Promise.all([
    saveJSON(join(dir, 'esperimento.json'), record),
    saveJSON(join(dir, 'misure.json'), metrics),
    writeFile(join(dir, 'faccia.png'), PNG.sync.write(img)),
  ])
}
async function run() {
  const [command = 'demo', file, other, extra] = process.argv.slice(2)
  if (command === '--help') {
    console.log('node cli.js demo | replay FILE.json [PASSI_AGGIUNTIVI] | sweep FILE.json SPEC.json')
    return
  }
  check(['demo', 'replay', 'sweep'].includes(command) && !extra, 'Comando sconosciuto. Usa --help.')
  const record =
    command === 'demo'
      ? new Experiment({ ...defaults(64), rule: 'exact', threshold: 1 }).record()
      : await json(file)
  const exp = Experiment.replay(record)
  const root = resolve('results')
  await mkdir(root, { recursive: true })
  const dir = await mkdtemp(join(root, command + '-'))
  if (command === 'sweep') {
    const spec = await json(other),
      configs = planSweep(exp.engine.config, spec),
      summary = []
    for (const [i, c] of configs.entries()) {
      const id = String(i + 1).padStart(3, '0')
      const result = trial(c, spec.steps, record.mode)
      await save(join(dir, id), result)
      summary.push({
        id,
        frequencyA: c.sources[0].frequency,
        frequencyB: c.sources[1]?.frequency ?? null,
        phase: c.sources[0].phase,
        rule: c.rule,
        ...result.metrics,
      })
    }
    await saveJSON(join(dir, 'confronto.json'), summary)
    console.log(configs.length + ' prove completate')
  } else {
    const steps = command === 'demo' ? 112 : Number(other ?? 0)
    number(steps, 0, 1e7 - exp.engine.tick, 'passi aggiuntivi', true)
    exp.advance(steps)
    const pixels = exp.observer.image(record.mode, exp.engine.config.nodal)
    const metrics = { ...analyze(exp.observer), image: analyzeImage(pixels, exp.engine.config.size) }
    await save(dir, { record: exp.record(record.mode), metrics, pixels })
    console.log(JSON.stringify(metrics, null, 2))
  }
  console.log(dir)
}
run().catch((err) => {
  console.error(err.message)
  process.exitCode = 1
})
