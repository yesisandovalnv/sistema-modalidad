import { modalidadesService } from '../../services/crudService'

const LIMIT = 24
const TTL = 5 * 60 * 1000

// One cache per mounted page/authenticated user. No PDF or persistent storage.
export function createPdfThumbnailCache() {
  const ready = new Map()
  const pending = new Map()
  return {
    acquire(modalidadId, document) {
      const key = JSON.stringify([modalidadId, document.id, document.updated_at, document.nombre])
      const cached = ready.get(key)
      if (cached && cached.expires > Date.now()) {
        ready.delete(key)
        ready.set(key, cached)
        return { promise: Promise.resolve(cached.image), release() {} }
      }
      ready.delete(key)
      let entry = pending.get(key)
      if (!entry) {
        const controller = new AbortController()
        entry = { controller, consumers: 0 }
        entry.promise = (async () => {
          let image = null
          try {
            const { blob } = await modalidadesService.descargarDocumentoOficial(modalidadId, document.id, document.nombre, controller.signal)
            controller.signal.throwIfAborted()
            const { renderFirstPage } = await import('./pdfThumbnailRenderer')
            controller.signal.throwIfAborted()
            image = await renderFirstPage(blob, controller.signal)
          } catch { /* Retain the existing PDF icon on access/render errors. */ }
          if (!controller.signal.aborted) {
            ready.set(key, { image, expires: Date.now() + (image ? TTL : 30000) })
            while (ready.size > LIMIT) ready.delete(ready.keys().next().value)
          }
          if (pending.get(key) === entry) pending.delete(key)
          return image
        })()
        pending.set(key, entry)
      }
      entry.consumers += 1
      let released = false
      return {
        promise: entry.promise,
        release() {
          if (released) return
          released = true
          entry.consumers -= 1
          if (!entry.consumers && pending.get(key) === entry) {
            pending.delete(key)
            entry.controller.abort()
          }
        },
      }
    },
    clear() {
      pending.forEach((entry) => entry.controller.abort())
      pending.clear()
      ready.clear()
    },
  }
}
