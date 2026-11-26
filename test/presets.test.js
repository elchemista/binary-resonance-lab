import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { Experiment } from '../src/core/experiment.js'
import { presets, presetExperiment } from '../src/core/presets.js'

for (const preset of presets) {
  test(preset.name + ' riproduce la miniatura e risponde alla frequenza comune', () => {
    const baseline = presetExperiment(preset)
    const experiment = Experiment.replay(baseline)
    const image = experiment.observer.image(baseline.mode, baseline.config.nodal)
    const url = new URL('../src/ui/preset-images/' + preset.id + '.png', import.meta.url)
    const preview = PNG.sync.read(readFileSync(url))
    assert.equal(preview.width, preset.size)
    assert.equal(preview.height, preset.size)
    assert.equal(new Set(image).size, 2)
    assert.deepEqual(image, Uint8Array.from(preview.data.filter((_, i) => i % 4 === 0)))

    const tuned = presetExperiment(preset, preset.frequency + 0.005)
    const expected = structuredClone(baseline)
    expected.config.sources.forEach((source) => {
      source.frequency = preset.frequency + 0.005
    })
    assert.deepEqual(tuned, expected)
    const replay = Experiment.replay(tuned)
    assert.notDeepEqual(replay.observer.image(tuned.mode, tuned.config.nodal), image)
    assert.deepEqual(presetExperiment(preset), baseline)
  })
}
