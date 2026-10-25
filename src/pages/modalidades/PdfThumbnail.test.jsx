import { act, render, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import PdfThumbnail from './PdfThumbnail'
import { createPdfThumbnailCache } from './pdfThumbnailCache'
import { modalidadesService } from '../../services/crudService'
import { renderFirstPage } from './pdfThumbnailRenderer'

vi.mock('../../services/crudService', () => ({ modalidadesService: { descargarDocumentoOficial: vi.fn() } }))
vi.mock('./pdfThumbnailRenderer', () => ({ renderFirstPage: vi.fn() }))

const doc = { id: 9, nombre: 'Reglamento', updated_at: '2026-10-25' }
const image = 'data:image/png;base64,cGRm'
let cache
beforeEach(() => {
  vi.clearAllMocks()
  cache = createPdfThumbnailCache()
  modalidadesService.descargarDocumentoOficial.mockResolvedValue({ blob: new Blob(['pdf']) })
  renderFirstPage.mockResolvedValue(image)
})
afterEach(() => { cache.clear(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('no solicita archivos contraído y espera a que la miniatura sea visible', async () => {
  let notify
  const disconnect = vi.fn()
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { notify = callback }
    observe() {}
    disconnect() { disconnect() }
  })
  const props = { modalidadId: 1, document: doc, cache }
  const view = render(<PdfThumbnail {...props} active={false} />)
  expect(modalidadesService.descargarDocumentoOficial).not.toHaveBeenCalled()
  view.rerender(<PdfThumbnail {...props} active />)
  expect(modalidadesService.descargarDocumentoOficial).not.toHaveBeenCalled()
  act(() => notify([{ isIntersecting: true }]))
  await waitFor(() => expect(view.container.querySelector('img')).toHaveAttribute('src', image))
  expect(disconnect).toHaveBeenCalled()
})

it('reutiliza la miniatura al contraer y reabrir y mantiene el tamaño sin deformarla', async () => {
  const props = { modalidadId: 1, document: doc, cache }
  const view = render(<PdfThumbnail {...props} active />)
  await waitFor(() => expect(view.container.querySelector('img')).toBeInTheDocument())
  expect(view.container.firstChild).toHaveClass('w-14', 'h-[76px]', 'shrink-0')
  expect(view.container.querySelector('img')).toHaveClass('object-contain')
  view.rerender(<PdfThumbnail {...props} active={false} />)
  view.rerender(<PdfThumbnail {...props} active />)
  await waitFor(() => expect(view.container.querySelector('img')).toBeInTheDocument())
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(1)
  expect(renderFirstPage).toHaveBeenCalledTimes(1)
})

it('deduplica solicitudes concurrentes sin cancelar al otro consumidor', async () => {
  let resolve
  modalidadesService.descargarDocumentoOficial.mockReturnValue(new Promise((done) => { resolve = done }))
  const first = cache.acquire(1, doc)
  const second = cache.acquire(1, doc)
  const signal = modalidadesService.descargarDocumentoOficial.mock.calls[0][3]
  first.release()
  expect(signal.aborted).toBe(false)
  resolve({ blob: new Blob(['pdf']) })
  expect(await second.promise).toBe(image)
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(1)
  second.release()
})

it('cancela al contraer y no renderiza respuestas tardías', async () => {
  let resolve
  modalidadesService.descargarDocumentoOficial.mockReturnValue(new Promise((done) => { resolve = done }))
  const props = { modalidadId: 1, document: doc, cache }
  const view = render(<PdfThumbnail {...props} active />)
  const signal = modalidadesService.descargarDocumentoOficial.mock.calls[0][3]
  view.rerender(<PdfThumbnail {...props} active={false} />)
  expect(signal.aborted).toBe(true)
  await act(async () => { resolve({ blob: new Blob(['pdf']) }) })
  expect(renderFirstPage).not.toHaveBeenCalled()
  expect(view.container.querySelector('img')).not.toBeInTheDocument()
})

it.each(['access', 'render'])('conserva el icono ante error de %s y evita reintentos inmediatos', async (failure) => {
  if (failure === 'access') modalidadesService.descargarDocumentoOficial.mockRejectedValue({ response: { status: 403 } })
  else renderFirstPage.mockRejectedValue(new Error('Invalid PDF'))
  const result = cache.acquire(1, doc)
  expect(await result.promise).toBeNull()
  const view = render(<PdfThumbnail modalidadId={1} document={doc} cache={cache} active />)
  await act(async () => {})
  expect(view.getByText('PDF')).toBeInTheDocument()
  expect(view.container.querySelector('img')).not.toBeInTheDocument()
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(1)
})

it('separa documentos, modalidades y actualizaciones', async () => {
  for (const [id, document] of [[1, doc], [2, doc], [1, { ...doc, id: 10 }], [1, { ...doc, updated_at: 'new' }]]) {
    expect(await cache.acquire(id, document).promise).toBe(image)
  }
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(4)
})

it('limita la caché a 24 entradas y expira después de cinco minutos', async () => {
  vi.useFakeTimers()
  for (let id = 0; id < 25; id++) await cache.acquire(1, { ...doc, id }).promise
  await cache.acquire(1, { ...doc, id: 0 }).promise
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(26)
  vi.advanceTimersByTime(300001)
  await cache.acquire(1, { ...doc, id: 0 }).promise
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(27)
})

it('limpia la caché y cancela trabajos al salir de la página o cambiar usuario', async () => {
  await cache.acquire(1, doc).promise
  modalidadesService.descargarDocumentoOficial.mockReturnValue(new Promise(() => {}))
  cache.acquire(1, { ...doc, id: 10 })
  const signal = modalidadesService.descargarDocumentoOficial.mock.calls[1][3]
  cache.clear()
  expect(signal.aborted).toBe(true)
  modalidadesService.descargarDocumentoOficial.mockResolvedValue({ blob: new Blob(['pdf']) })
  await cache.acquire(1, doc).promise
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(3)
})
