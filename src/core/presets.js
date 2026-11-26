import { defaults, oscillator, validate } from './config.js'

// These are observation recipes obtained by running the binary model.
// Physical references describe separate measurements on the PHYWE square plate.
export const plateSource =
  'https://fenix.tecnico.ulisboa.pt/downloadFile/3096843219132685/PHYWE_chladni_p2150501_en-1.pdf#page=9'

export const presets = [
  {
    id: 'croce',
    name: 'Croce diagonale',
    size: 64,
    positions: [31, 32],
    boundary: 'reflect',
    frequency: 0.125,
    tick: 125,
    nodal: 0.2,
    physicalHz: 185,
    reference: 'due diagonali che si incrociano',
  },
  {
    id: 'losanghe',
    name: 'Reticolo di losanghe',
    size: 32,
    positions: [9, 22],
    boundary: 'absorb',
    frequency: 0.05,
    tick: 62,
    nodal: 0,
    physicalHz: 1100,
    reference: 'una rete di diagonali',
  },
  {
    id: 'corone',
    name: 'Quattro corone',
    size: 32,
    positions: [15, 16],
    boundary: 'reflect',
    frequency: 0.125,
    tick: 89,
    nodal: 0.4,
    physicalHz: 1960,
    reference: 'un anello in ciascuno dei quattro quadranti',
  },
  {
    id: 'rosetta',
    name: 'Rosetta a quattro lobi',
    size: 32,
    positions: [15, 16],
    boundary: 'reflect',
    frequency: 0.19,
    tick: 128,
    nodal: 0.4,
    physicalHz: 1550,
    reference: 'una X con quattro archi',
  },
]

export function presetExperiment(preset, frequency = preset.frequency) {
  const c = defaults(preset.size)
  c.rule = 'exact'
  c.threshold = 1
  c.boundary = preset.boundary
  c.window = 40
  c.nodal = preset.nodal
  c.sources = preset.positions.flatMap((x) =>
    preset.positions.map((y) => ({
      ...oscillator(c.size),
      x,
      y,
      wave: 'sine',
      frequency,
    })),
  )
  return {
    format: 'binary-resonance-lab/1',
    config: validate(c),
    events: [],
    tick: preset.tick,
    mode: 'nodal',
  }
}
