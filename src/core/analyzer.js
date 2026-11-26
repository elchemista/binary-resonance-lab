// Measurements always use the raw face, even when a derived image is displayed.
export function analyze(o) {
  const n = o.size,
    len = n * n
  let ones = 0,
    stable = 0,
    changes = 0,
    symX = 0,
    symY = 0
  for (let i = 0; i < len; i++) {
    const x = i % n,
      y = Math.floor(i / n),
      b = o.direct[i]
    ones += b
    changes += o.count[i]
    stable += +(o.count[i] === 0)
    symX += +(b === o.direct[y * n + n - 1 - x])
    symY += +(b === o.direct[(n - 1 - y) * n + x])
  }
  const p = ones / len
  return {
    density: p,
    entropy: p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p),
    symmetry: (symX + symY) / (2 * len),
    activity: changes / (len * Math.max(1, o.samples)),
    persistence: stable / len,
    persistent: o.samples === o.ring.length && stable === len && p > 0 && p < 1,
    samples: o.samples,
  }
}

// For derived grayscale output, ink density is the mean darkness and symmetry
// is one minus the mean normalized difference from both axial reflections.
export function analyzeImage(pixels, n) {
  const histogram = new Uint32Array(256)
  let ink = 0,
    difference = 0
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const v = pixels[y * n + x]
      histogram[v]++
      ink += 255 - v
      difference += Math.abs(v - pixels[y * n + n - 1 - x]) + Math.abs(v - pixels[(n - 1 - y) * n + x])
    }
  let entropy = 0
  for (const count of histogram)
    if (count) {
      const p = count / pixels.length
      entropy -= p * Math.log2(p)
    }
  return { density: ink / (255 * pixels.length), symmetry: 1 - difference / (510 * pixels.length), entropy }
}
