import './style.css'
import { defaults, oscillator, validate, hash, faces, modes } from '../core/config.js'
import { icon } from './icons.js'
import { volume } from './volume.js'
import { settings, options } from './controls.js'
import { paint, download, png } from './export.js'
import { sweepUI } from './sweep.js'
import { presets, presetExperiment, plateSource } from '../core/presets.js'

const $ = (id) => document.getElementById(id)
document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)))
let config = { ...defaults(64), rule: 'exact', threshold: 1 }
let mode = 'direct',
  tab = 'Generatori',
  playing = false,
  last = null
const view = { axis: 'all', slice: 32, active: true, opacity: 0.76 }
const drawVolume = volume($('volume'))
const percent = (v) => (100 * v).toFixed(1) + '%'
function notice(msg) {
  $('notice').textContent = msg
  $('notice').hidden = !msg
}
function setPlay(on) {
  playing = on
  $('play').innerHTML = icon(on ? 'pause' : 'play') + (on ? 'Pausa' : 'Avvia')
  $('state').textContent = on ? 'In corso' : 'In pausa'
  $('state').classList.toggle('running', on)
}
function syncForm() {
  $('tabs').innerHTML = ['Generatori', 'Matrice', 'Mezzo', 'Osservazione']
    .map((v) => `<button aria-pressed="${v === tab}" class="${v === tab ? 'selected' : ''}">${v}</button>`)
    .join('')
  $('settings').innerHTML = settings(tab, config)
  $('face').innerHTML = options(faces, config.face, (f) => 'Faccia ' + f)
  $('mode').innerHTML = options(modes, mode)
  $('sizeTag').textContent = config.size + '³'
  $('res').textContent = config.size + ' × ' + config.size + ' px'
  $('regionKey').hidden = !config.regions.length
  view.slice = Math.min(view.slice, config.size - 1)
  $('viewSettings').innerHTML =
    `<label class="field">Sezione <select id="axis">${options(['all', 'X', 'Y', 'Z'], view.axis, (v) => (v === 'all' ? 'Volume completo' : v))}</select></label>
  <label class="field">Indice <input id="slice" type="range" min="0" max="${config.size - 1}" value="${view.slice}" ${view.axis === 'all' ? 'disabled' : ''}></label>
  <label class="field">Opacità <input id="opacity" type="range" min="0.1" max="1" step="0.01" value="${view.opacity}"></label>
  <label class="checkbox"><input id="active" type="checkbox" ${view.active ? 'checked' : ''}>Solo celle attive</label>`
}
function draw(f) {
  last = f
  drawVolume(f, view.opacity)
  paint($('pixels'), f.pixels, f.config.size)
  $('tick').textContent = String(f.tick).padStart(6, '0')
  for (const k of ['activity', 'persistence'])
    $(k).textContent = f.metrics.samples ? percent(f.metrics[k]) : '—'
  for (const k of ['density', 'symmetry']) $(k).textContent = percent(f.metrics.image[k])
  $('entropy').innerHTML = f.metrics.image.entropy.toFixed(3) + ' <small>bit</small>'
  const ctx = $('trend').getContext('2d'),
    w = ctx.canvas.width,
    h = ctx.canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  f.trend.forEach((a, i) => {
    const x = (i * w) / 99,
      y = h - 2 - a * (h - 4)
    if (!i) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = '#b396ed'
  ctx.lineWidth = 2
  ctx.stroke()
}
let worker,
  pending = [],
  importing = false
function connect() {
  worker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data: f }) => {
    const job = pending.shift()
    if (f.type === 'error') {
      notice(f.message)
      setPlay(false)
      job?.reject(new Error(f.message))
      return
    }
    draw(f)
    job?.resolve(f)
  }
  worker.onerror = (e) => {
    notice(e.message)
    setPlay(false)
    pending.splice(0).forEach((p) => p.reject(new Error(e.message)))
  }
}
function send(type, extra = {}) {
  const promise = new Promise((resolve, reject) => {
    pending.push({ resolve, reject })
    worker.postMessage({ type, mode, view, ...extra })
  })
  promise.catch(() => {})
  return promise
}
function replaceWorker() {
  worker?.terminate()
  pending.splice(0).forEach((p) => p.reject(new Error('Prova sostituita')))
  connect()
}
function reset(c = config, steps = 0) {
  importing = false
  setPlay(false)
  replaceWorker()
  config = c
  syncForm()
  send('init', { config, steps })
}
let activePreset = null
const presetButtons = presets.map((preset) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-pressed', 'false')
  const preview = new URL(`./preset-images/${preset.id}.png`, import.meta.url)
  button.innerHTML = `<img src="${preview.href}" alt="" width="44" height="44"><span>${preset.name}<small>${preset.frequency.toFixed(3)} cicli/passo</small></span>`
  button.onclick = () => loadPreset(preset, preset.frequency)
  $('presetList').append(button)
  return button
})
function selectPreset(preset) {
  activePreset = preset
  presetButtons.forEach((button, index) =>
    button.setAttribute('aria-pressed', String(presets[index] === preset)),
  )
  $('presetTuning').hidden = !preset
}
function showFrequency(value) {
  const text = Number(value).toFixed(3) + ' cicli/passo'
  $('presetValue').textContent = text
  $('presetFrequency').setAttribute('aria-valuetext', text)
}
function loadPreset(preset, frequency) {
  const record = presetExperiment(preset, frequency)
  selectPreset(preset)
  $('presetFrequency').value = frequency
  showFrequency(frequency)
  $('presetHint').textContent =
    'Al rilascio ricalcola i quattro generatori in fase dal passo zero al tick ' + record.tick + '.'
  $('presetReference').innerHTML =
    `Sulla piastra quadrata PHYWE, la sinusoide a ${preset.physicalHz} Hz produce ${preset.reference}. Il cubo usa un seno codificato in bit e una frequenza tarata in cicli/passo. <a href="${plateSource}" target="_blank" rel="noreferrer">Vedi la figura originale</a>`
  mode = record.mode
  tab = 'Generatori'
  notice('')
  reset(record.config, record.tick)
}
$('presetFrequency').oninput = (e) => showFrequency(e.target.value)
$('presetFrequency').onchange = (e) => {
  if (activePreset) loadPreset(activePreset, Number(e.target.value))
}
function apply(c) {
  validate(c)
  selectPreset(null)
  if (['size', 'seed', 'initial'].some((k) => c[k] !== config[k])) reset(c)
  else {
    config = c
    syncForm()
    send('edit', { config })
  }
  notice('')
}
function rescale(c, size) {
  const scale = (v) => Math.round((v * (size - 1)) / (c.size - 1))
  for (const s of c.sources) for (const k of ['x', 'y', 'z', 'radius']) s[k] = scale(s[k])
  for (const r of c.regions) for (const k of ['x', 'y', 'z', 'x2', 'y2', 'z2']) r[k] = scale(r[k])
  c.size = size
}
$('tabs').onclick = (e) => {
  if (e.target.closest('button')) {
    tab = e.target.textContent
    syncForm()
  }
}
$('settings').oninput = (e) => {
  if (e.target.type === 'range')
    e.target.closest('label').querySelector('output').textContent = e.target.value + e.target.dataset.unit
}
function target(c, el) {
  const src = el.closest('[data-source]'),
    reg = el.closest('[data-region]')
  return src ? c.sources[+src.dataset.source] : reg ? c.regions[+reg.dataset.region] : c
}
$('settings').onchange = (e) => {
  const el = e.target,
    key = el.dataset.key
  if (!key || importing) return
  if (!el.reportValidity()) return
  const c = structuredClone(config),
    obj = target(c, el),
    opened = el.closest('details')?.parentElement.dataset.source
  try {
    if (key === 'size') rescale(c, +el.value)
    else
      obj[key] =
        el.type === 'checkbox' ? el.checked : typeof obj[key] === 'number' ? Number(el.value) : el.value
    apply(c)
    if (opened !== undefined)
      $('settings').querySelector('[data-source="' + opened + '"] details').open = true
  } catch (err) {
    notice(err.message)
    syncForm()
  }
}
$('settings').onclick = (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn || importing) return
  const c = structuredClone(config),
    a = btn.dataset.action,
    n = c.size
  if (a === 'source') c.sources.push({ ...oscillator(n), x: hash(c.seed + c.sources.length) % n })
  if (a === 'removeSource') c.sources.splice(+btn.closest('[data-source]').dataset.source, 1)
  if (a === 'removeRegion') c.regions.splice(+btn.closest('[data-region]').dataset.region, 1)
  if (a === 'region' || a === 'randomRegion') {
    const r = { kind: 'mirror' },
      k = c.regions.length
    for (const [j, axis] of ['x', 'y', 'z'].entries()) {
      const first = a === 'region' ? Math.floor(n / 3) : hash(c.seed + 3 * k + j) % n
      r[axis] = first
      r[axis + '2'] = Math.min(n - 1, first + (j === 2 ? 0 : Math.floor(n / 4)))
    }
    c.regions.push(r)
  }
  try {
    apply(c)
  } catch (err) {
    notice(err.message)
  }
}
$('viewToggle').onclick = () => {
  $('viewSettings').hidden = !$('viewSettings').hidden
}
$('viewSettings').oninput = (e) => {
  const k = e.target.id
  view[k] = k === 'axis' ? e.target.value : k === 'active' ? e.target.checked : +e.target.value
  $('slice').disabled = view.axis === 'all'
  if (k === 'opacity' && last) drawVolume(last, view.opacity)
  else send('frame')
}
$('expand').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await $('volumeCard').requestFullscreen()
  } catch (err) {
    notice(err.message)
  }
}
$('face').onchange = (e) => {
  if (!importing) apply({ ...config, face: e.target.value })
}
$('mode').onchange = (e) => {
  selectPreset(null)
  mode = e.target.value
  send('frame')
}
$('play').onclick = () => {
  if (!importing) setPlay(!playing)
}
$('step').onclick = () => {
  if (!importing) {
    setPlay(false)
    send('step', { steps: 1 })
  }
}
$('reset').onclick = () => {
  notice('')
  reset()
}
let nextTime = 0
function animate(time) {
  if (playing && !pending.length && time >= nextTime) {
    send('step', { steps: 1 })
    nextTime = time + 1000 / Number($('speed').value)
  }
  requestAnimationFrame(animate)
}
function page(manual) {
  setPlay(false)
  $('manual').hidden = !manual
  $('sweep').hidden = manual
  $('manualNav').classList.toggle('selected', manual)
  $('sweepNav').classList.toggle('selected', !manual)
  $('title').textContent = manual ? 'Banco sperimentale' : 'Scansioni sperimentali'
  $('subtitle').textContent = manual
    ? 'Propagazione di segnali in una matrice binaria tridimensionale.'
    : 'Confronta frequenze, fasi e leggi locali a parità di condizioni iniziali.'
  if (manual && last) draw(last)
}
$('manualNav').onclick = () => page(true)
$('sweepNav').onclick = () => page(false)
async function restore(record) {
  selectPreset(null)
  page(true)
  importing = true
  notice('Riproduzione del registro in corso…')
  const previous = last?.record
  replaceWorker()
  try {
    const f = await send('import', { record, mode: record.mode })
    mode = f.mode
    config = f.config
    syncForm()
    notice('')
  } catch (err) {
    if (err.message === 'Prova sostituita') return
    if (previous) {
      const f = await send('import', { record: previous, mode: previous.mode })
      mode = f.mode
      config = f.config
      syncForm()
    } else reset()
    notice(err.message)
  } finally {
    importing = false
  }
}
$('import').onclick = () => $('file').click()
$('file').onchange = async (e) => {
  try {
    if (e.target.files[0]) await restore(JSON.parse(await e.target.files[0].text()))
  } catch (err) {
    notice(err.message)
  }
  e.target.value = ''
}
$('export').onclick = async () => {
  const f = await send('frame')
  download(
    'risonanza-' + f.tick + '.json',
    new Blob([JSON.stringify(f.record, null, 2)], { type: 'application/json' }),
  )
}
$('png').onclick = async () => {
  const f = await send('frame'),
    canvas = document.createElement('canvas')
  paint(canvas, f.pixels, f.config.size)
  download('faccia-' + f.config.face + '-' + f.mode + '-' + f.tick + '.png', await png(canvas))
}
sweepUI($('sweep'), () => ({ config, mode }), restore, notice)
reset(config, 112)
requestAnimationFrame(animate)
