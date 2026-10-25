import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export async function renderFirstPage(blob, signal) {
  let loadingTask
  let renderTask
  let canvas
  const cancel = () => {
    renderTask?.cancel()
    loadingTask?.destroy().catch(() => {})
  }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    signal.throwIfAborted()
    loadingTask = getDocument({ data: bytes, isEvalSupported: false })
    // Password-protected files use the fallback rather than waiting for input.
    loadingTask.onPassword = cancel
    const pdf = await loadingTask.promise
    signal.throwIfAborted()
    const page = await pdf.getPage(1)
    const original = page.getViewport({ scale: 1 })
    const scale = Math.min(56 / original.width, 76 / original.height) * 3
    const viewport = page.getViewport({ scale })
    canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    renderTask = page.render({ canvasContext: context, viewport, background: '#ffffff' })
    await renderTask.promise
    signal.throwIfAborted()
    return canvas.toDataURL('image/png')
  } finally {
    signal.removeEventListener('abort', cancel)
    if (canvas) { canvas.width = 0; canvas.height = 0 }
    await loadingTask?.destroy()
  }
}
