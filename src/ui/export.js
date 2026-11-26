export function paint(canvas, pixels, n) {
  canvas.width = canvas.height = n
  const ctx = canvas.getContext('2d'),
    img = ctx.createImageData(n, n)
  pixels.forEach((v, i) => {
    const j = 4 * i
    img.data[j] = img.data[j + 1] = img.data[j + 2] = v
    img.data[j + 3] = 255
  })
  ctx.putImageData(img, 0, 0)
}
export function download(name, blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 3000)
}
export function png(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG non disponibile'))), 'image/png'),
  )
}
