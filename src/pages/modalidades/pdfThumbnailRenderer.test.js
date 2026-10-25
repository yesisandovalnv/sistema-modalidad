import { Blob } from 'node:buffer'
import { vi } from 'vitest'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { renderFirstPage } from './pdfThumbnailRenderer'

// Node integration check with the real PDF.js worker and its optional canvas.
GlobalWorkerOptions.workerSrc = import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')

function fixture(width, height) {
  const stream = `0.1 0.4 0.8 rg 0 0 ${width} ${height} re f`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << >> /Contents 6 0 R >>`,
    '<< /Length 22 >>\nstream\n1 0 0 rg 0 0 10 10 re f\nendstream',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

let canvases
beforeEach(() => {
  canvases = []
  vi.stubGlobal('document', { createElement: () => { const canvas = createCanvas(1, 1); canvases.push(canvas); return canvas } })
})
afterEach(() => vi.unstubAllGlobals())

it.each([[612, 792], [792, 612]])('renderiza la primera página real conservando proporción %s × %s y libera canvas', async (width, height) => {
  const image = await renderFirstPage(fixture(width, height), new AbortController().signal)
  const decoded = await loadImage(image)
  expect(decoded.width / decoded.height).toBeCloseTo(width / height, 1)
  expect(decoded.width).toBeLessThanOrEqual(168)
  expect(decoded.height).toBeLessThanOrEqual(228)
  const output = createCanvas(decoded.width, decoded.height)
  const context = output.getContext('2d')
  context.drawImage(decoded, 0, 0)
  const [red, green, blue] = context.getImageData(10, 10, 1, 1).data
  expect(blue).toBeGreaterThan(green)
  expect(green).toBeGreaterThan(red)
  expect(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true)
})

it('rechaza archivos inválidos y operaciones canceladas', async () => {
  await expect(renderFirstPage(new Blob(['invalid']), new AbortController().signal)).rejects.toThrow()
  const controller = new AbortController()
  controller.abort()
  await expect(renderFirstPage(fixture(612, 792), controller.signal)).rejects.toThrow()
})
