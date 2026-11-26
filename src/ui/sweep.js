import { zipSync, strToU8 } from 'fflate'
import { rules } from '../core/config.js'
import { planSweep } from '../core/sweep.js'
import { names } from './controls.js'
import { paint, png, download } from './export.js'
import { icon } from './icons.js'

export function sweepUI(host, getState, loadRecord, notify) {
  const field = (label, id, value) =>
    `<label class="field"><span>${label}</span><input id="${id}" value="${value}"></label>`
  host.innerHTML = `<div class="card"><div class="cardhead"><h2>${icon('scan')}Scansione parametrica</h2></div><p class="hint">Ogni combinazione riparte dalla configurazione corrente al tick zero. Usa valori separati da virgole oppure un intervallo inizio:fine:incremento.</p>
  <div class="fields">${field('Frequenze A (cicli/passo)', 'freqA', '0.10:0.15:0.025')}${field('Frequenze B (opzionale)', 'freqB', '')}${field('Fasi A (gradi)', 'phaseA', '0, 90')}${field('Passi per prova', 'stepsA', '128')}</div>
  <div class="fields">${rules.map((r) => `<label class="checkbox"><input type="checkbox" name="law" value="${r}" ${r === 'history' ? 'checked' : ''}>${names[r]}</label>`).join('')}</div>
  <div class="section-actions"><button class="primary" id="scanStart">${icon('play')}Avvia scansione</button><button id="scanStop" disabled>Interrompi</button><span id="progress" role="status"></span></div></div>
  <div class="card sweep-results"><div class="cardhead"><h2>Risultati</h2><button id="scanSave" disabled>${icon('download')}Archivio ZIP</button></div><div id="emptyScan" class="hint">Le prove completate appariranno qui.</div>
  <table hidden><thead><tr><th>Faccia</th><th>Regola</th><th>Freq. A / B</th><th>Fase A</th><th>Persistenza</th><th>Densità</th><th></th></tr></thead><tbody></tbody></table></div>`
  const $ = (s) => host.querySelector(s)
  let worker,
    results = []
  function values(raw) {
    return raw.split(',').flatMap((part) => {
      if (!part.trim()) throw new Error('Inserisci un valore numerico')
      const vals = part.split(':').map((s) => (s.trim() === '' ? NaN : Number(s)))
      if (vals.length === 1) return vals
      const [a, b, d] = vals
      if (vals.length !== 3 || !vals.every(Number.isFinite) || d <= 0 || b < a || (b - a) / d > 511)
        throw new Error('Intervallo non valido')
      return Array.from({ length: Math.floor((b - a) / d + 1e-9) + 1 }, (_, i) =>
        Number((a + d * i).toFixed(9)),
      )
    })
  }
  function stop() {
    worker?.terminate()
    worker = null
    $('#scanStart').disabled = false
    $('#scanStop').disabled = true
    $('#scanSave').disabled = !results.length
  }
  $('#scanStop').onclick = () => {
    stop()
    $('#progress').textContent = 'Interrotta · ' + results.length + ' prove'
  }
  $('#scanStart').onclick = () => {
    try {
      const { config, mode } = getState()
      const spec = {
        frequencies: values($('#freqA').value),
        secondary: $('#freqB').value.trim() ? values($('#freqB').value) : [null],
        phases: values($('#phaseA').value),
        steps: Number($('#stepsA').value),
        laws: [...host.querySelectorAll('[name=law]:checked')].map((el) => el.value),
      }
      const count = planSweep(config, spec).length
      results = []
      $('tbody').replaceChildren()
      $('#emptyScan').hidden = true
      $('table').hidden = false
      $('#scanStart').disabled = true
      $('#scanStop').disabled = false
      $('#scanSave').disabled = true
      $('#progress').textContent = '0 / ' + count
      worker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' })
      worker.onerror = (e) => {
        stop()
        notify(e.message)
      }
      worker.onmessage = ({ data: m }) => {
        if (m.type === 'error') {
          stop()
          notify(m.message)
          return
        }
        if (m.type === 'complete') {
          stop()
          $('#progress').textContent =
            results.length === 1 ? '1 prova completata' : results.length + ' prove completate'
          return
        }
        const r = m.result,
          c = r.record.config,
          i = results.push(r) - 1
        const row = $('tbody').insertRow()
        row.innerHTML = `<td><canvas></canvas></td><td>${names[c.rule]}</td><td>${c.sources[0].frequency} / ${c.sources[1]?.frequency ?? '—'}</td><td>${c.sources[0].phase}°</td><td>${(100 * r.metrics.persistence).toFixed(1)}%${r.metrics.persistent ? ' · stabile' : ''}</td><td>${(r.metrics.density * 100).toFixed(1)}%</td><td><button>Riproduci</button></td>`
        paint(row.querySelector('canvas'), r.pixels, c.size)
        row.querySelector('button').onclick = () => loadRecord(results[i].record)
        $('#progress').textContent = m.index + ' / ' + m.total
      }
      worker.postMessage({ type: 'sweep', config, mode, spec })
    } catch (err) {
      notify(err.message)
    }
  }
  $('#scanSave').onclick = async () => {
    const entries = {},
      summary = [],
      snapshot = results.slice()
    for (const [i, r] of snapshot.entries()) {
      const id = 'prova-' + String(i + 1).padStart(3, '0'),
        canvas = document.createElement('canvas')
      paint(canvas, r.pixels, r.record.config.size)
      entries[id + '/faccia.png'] = new Uint8Array(await (await png(canvas)).arrayBuffer())
      entries[id + '/esperimento.json'] = strToU8(JSON.stringify(r.record, null, 2))
      summary.push({ id, ...r.metrics })
    }
    entries['misure.json'] = strToU8(JSON.stringify(summary, null, 2))
    download('scansione.zip', new Blob([zipSync(entries)], { type: 'application/zip' }))
  }
}
