import { sizes, rules, waves, faces, boundaries, materials } from '../core/config.js'
import { icon } from './icons.js'
export const names = {
  history: 'XOR + memoria',
  xor: 'XOR',
  or: 'OR',
  and: 'AND',
  exact: 'Conteggio esatto',
  threshold: 'Soglia',
  memory: 'Soglia + memoria',
  reflect: 'Riflettenti',
  absorb: 'Assorbenti',
  periodic: 'Periodici',
  empty: 'Vuoto',
  center: 'Cella centrale',
  noise: 'Rumore all’8%',
  square: 'Periodica binaria',
  impulse: 'Impulso singolo',
  sequence: 'Sequenza',
  pulse: 'Pulsante',
  random: 'Casuale con seed',
  sine: 'Seno codificato',
  triangle: 'Triangolo codificato',
  all: 'Tutte',
  obstacle: 'Ostacolo',
  cavity: 'Cavità',
  mirror: 'Barriera riflettente',
  absorber: 'Regione assorbente',
  direct: 'Stato diretto',
  activity: 'Attività accumulata',
  nodal: 'Modalità nodale',
  sand: 'Sabbia virtuale',
}
export function options(list, value, display = (v) => names[v] ?? v) {
  return list
    .map((v) => `<option value="${v}" ${v === value ? 'selected' : ''}>${display(v)}</option>`)
    .join('')
}
const field = (label, control) => `<label class="field"><span>${label}</span>${control}</label>`
export const select = (label, key, list, value, display) =>
  field(label, `<select data-key="${key}">${options(list, value, display)}</select>`)
export const numeric = (label, key, val, min, max, step = 1) =>
  field(
    label,
    `<input data-key="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${val}" required>`,
  )
const range = (label, key, val, min, max, step, unit = '') =>
  `<label class="field"><span>${label}<output>${val}${unit}</output></span><input data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}"></label>`
const fields = (...items) => '<div class="fields">' + items.join('') + '</div>'
const action = (key, label, symbol) => `<button data-action="${key}">${icon(symbol)}${label}</button>`
export function settings(tab, c) {
  const max = c.size - 1
  if (tab === 'Matrice')
    return (
      fields(
        select('Dimensione', 'size', sizes, c.size, (n) => n + ' × ' + n + ' × ' + n),
        select('Stato iniziale', 'initial', ['empty', 'center', 'noise'], c.initial),
        numeric('Seed', 'seed', c.seed, 0, 0xffffffff),
        select('Vicinato', 'neighbors', [6, 18, 26], c.neighbors, (n) => n + ' celle'),
        select('Propagazione', 'rule', rules, c.rule),
        numeric('Soglia / conteggio', 'threshold', c.threshold, 1, 26),
        select('Confini', 'boundary', boundaries, c.boundary),
      ) + '<p class="endnote">Dimensione, seed e stato iniziale avviano una nuova prova al passo zero.</p>'
    )
  if (tab === 'Osservazione')
    return (
      fields(
        select('Faccia osservata', 'face', faces, c.face),
        numeric('Finestra (passi)', 'window', c.window, 1, 256),
        range('Soglia nodale', 'nodal', c.nodal, 0, 1, 0.01),
      ) +
      '<p class="endnote">La finestra conta i cambi di stato di ogni pixel. Cambiare faccia o finestra riavvia il campionamento e la sabbia.</p>'
    )
  if (tab === 'Mezzo')
    return (
      c.regions
        .map(
          (r, i) =>
            `<div data-region="${i}"><div class="rowhead"><strong>Regione ${i + 1}</strong><button class="iconbtn" data-action="removeRegion" aria-label="Rimuovi regione">${icon('bin')}</button></div>` +
            fields(
              select('Materiale', 'kind', materials, r.kind),
              ...['x', 'y', 'z'].flatMap((k) => [
                numeric(k.toUpperCase() + ' min', k, r[k], 0, max),
                numeric(k.toUpperCase() + ' max', k + '2', r[k + '2'], 0, max),
              ]),
            ) +
            '</div>',
        )
        .join('') +
      (c.regions.length
        ? ''
        : '<p class="hint">Mezzo uniforme. Aggiungi una regione per cambiare localmente la propagazione.</p>') +
      '<div class="section-actions">' +
      action('region', 'Regione', 'plus') +
      action('randomRegion', 'Regione da seed', 'layers') +
      '</div>'
    )
  return (
    c.sources
      .map(
        (s, i) =>
          `<div data-source="${i}"><div class="rowhead"><b class="dot amber"></b><strong>Generatore ${String(i + 1).padStart(2, '0')}</strong><label class="checkbox"><input data-key="enabled" type="checkbox" ${s.enabled ? 'checked' : ''}>Attivo</label><button class="iconbtn" aria-label="Rimuovi generatore" data-action="removeSource">${icon('bin')}</button></div>` +
          fields(
            range('Frequenza (cicli/passo)', 'frequency', s.frequency, 0.001, 0.5, 0.001),
            range('Intensità', 'intensity', s.intensity, 0, 100, 1, '%'),
            range('Fase', 'phase', s.phase, 0, 360, 1, '°'),
            select('Forma del segnale', 'wave', waves, s.wave),
          ) +
          `<details ${s.wave === 'sequence' ? 'open' : ''}><summary>Posizione ed emissione</summary>` +
          fields(
            ...['x', 'y', 'z'].map((k) => numeric(k.toUpperCase(), k, s[k], 0, max)),
            select('Direzione', 'direction', ['all', ...faces], s.direction),
            numeric('Raggio (celle)', 'radius', s.radius, 0, max),
            numeric('Durata (0 = continua)', 'duration', s.duration, 0, 1e7),
            field(
              'Sequenza binaria',
              `<input data-key="sequence" value="${s.sequence}" pattern="[01]{1,128}" required>`,
            ),
          ) +
          '</details></div>',
      )
      .join('') +
    '<div class="section-actions">' +
    action('source', 'Generatore', 'plus') +
    '</div>'
  )
}
