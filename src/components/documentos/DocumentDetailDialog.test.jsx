import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentDetailDialog from './DocumentDetailDialog'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerVersiones: vi.fn(),
    obtenerObservaciones: vi.fn(),
    descargarVersion: vi.fn(),
  },
}))

const documentRow = { id: 31, tipo_documento_nombre: 'Informe final', estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-02-01T10:00:00Z', fecha_revision: null, requiere_correccion: true, tiene_observaciones_pendientes: false, observacion_general: 'Revisión pendiente' }
const versions = {
  count: 21, next: 'page=2', previous: null, results: [
    { id: 301, numero_version: 1, fecha_subida: '2026-02-01T10:00:00Z', nombre_original: 'informe.pdf', tamano_bytes: 2048, subido_por_nombre: 'Ana Pérez', es_version_actual: true },
  ],
}
const observations = { count: 21, next: 'page=2', previous: null, results: [{ id: 401, comentario: 'Corregir portada', usuario_nombre: 'Revisor', corregida: false }] }

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function renderDialog(props = {}) {
  return render(<DocumentDetailDialog document={documentRow} onClose={vi.fn()} {...props} />)
}

describe('DocumentDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postulacionesService.obtenerVersiones.mockResolvedValue(versions)
    postulacionesService.obtenerObservaciones.mockResolvedValue(observations)
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'informe.pdf' })
  })

  it('carga por document.id y muestra metadatos, versión actual y estado de carga', async () => {
    const pending = deferred()
    postulacionesService.obtenerVersiones.mockReturnValueOnce(pending.promise)
    renderDialog()
    expect(screen.getByRole('status', { name: 'Cargando versiones' })).toBeInTheDocument()
    await act(async () => pending.resolve(versions))
    expect(await screen.findByText('Versión actual')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('informe.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(postulacionesService.obtenerVersiones).toHaveBeenCalledWith(31, 1, expect.any(AbortSignal))
  })

  it('pagina versiones, selecciona la versión exacta y pagina sus observaciones', async () => {
    postulacionesService.obtenerVersiones.mockResolvedValueOnce(versions).mockResolvedValueOnce({ ...versions, next: null, previous: 'page=1' })
    postulacionesService.obtenerObservaciones.mockResolvedValueOnce(observations).mockResolvedValueOnce({ ...observations, next: null, previous: 'page=1' })
    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver observaciones' }))
    expect(await screen.findByText('Corregir portada')).toBeInTheDocument()
    expect(postulacionesService.obtenerObservaciones).toHaveBeenCalledWith(301, 1, expect.any(AbortSignal))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' }).at(-1))
    await waitFor(() => expect(postulacionesService.obtenerObservaciones).toHaveBeenLastCalledWith(301, 2, expect.any(AbortSignal)))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' })[0])
    await waitFor(() => expect(postulacionesService.obtenerVersiones).toHaveBeenLastCalledWith(31, 2, expect.any(AbortSignal)))
  })

  it('muestra estados vacíos y permite reintentar errores de versiones y observaciones', async () => {
    postulacionesService.obtenerVersiones.mockRejectedValueOnce({ message: 'Fallaron versiones' }).mockResolvedValueOnce(versions)
    postulacionesService.obtenerObservaciones.mockRejectedValueOnce({ message: 'Fallaron observaciones' }).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] })
    renderDialog()
    expect(await screen.findByText('Fallaron versiones')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar versiones' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ver observaciones' }))
    expect(await screen.findByText('Fallaron observaciones')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar observaciones' }))
    expect(await screen.findByText('Sin observaciones registradas.')).toBeInTheDocument()
  })

  it('muestra estado vacío de versiones', async () => {
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderDialog()
    expect(await screen.findByText('No se registraron versiones.')).toBeInTheDocument()
  })

  it('cierra el modal y cancela solicitudes activas', async () => {
    let signal
    postulacionesService.obtenerVersiones.mockImplementation((_id, _page, requestSignal) => { signal = requestSignal; return new Promise(() => {}) })
    const onClose = vi.fn()
    const view = renderDialog({ onClose })
    await waitFor(() => expect(signal).toBeDefined())
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledOnce()
    view.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('descarga mediante blob, enlace temporal y revocación', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(301, 'informe.pdf')
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download')
    createObjectURL.mockRestore(); revokeObjectURL.mockRestore(); click.mockRestore()
  })

  it('abre preview autenticado y revoca el ObjectURL al cerrar la pestaña', async () => {
    let cleanup
    const previewWindow = { closed: false, opener: window, location: { replace: vi.fn() }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(previewWindow)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const interval = vi.spyOn(window, 'setInterval').mockImplementation((callback) => { cleanup = callback; return 12 })
    const clear = vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }))
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(previewWindow.opener).toBeNull()
    expect(previewWindow.location.replace).toHaveBeenCalledWith('blob:preview')
    previewWindow.closed = true; act(() => cleanup())
    expect(clear).toHaveBeenCalledWith(12)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    open.mockRestore(); createObjectURL.mockRestore(); revokeObjectURL.mockRestore(); interval.mockRestore(); clear.mockRestore()
  })

  it('maneja popup bloqueado y error de preview', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValueOnce(null)
    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }))
    expect(await screen.findByText(/bloqueó la nueva pestaña/)).toBeInTheDocument()
    const previewWindow = { closed: false, opener: window, location: { replace: vi.fn() }, close: vi.fn() }
    open.mockReturnValue(previewWindow)
    postulacionesService.descargarVersion.mockRejectedValue({ message: 'No autorizado' })
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }))
    expect(await screen.findByText('No autorizado')).toBeInTheDocument()
    expect(previewWindow.close).toHaveBeenCalledOnce()
    open.mockRestore()
  })

  it('oculta capacidades falsas y conserva las acciones explícitamente habilitadas', async () => {
    const onReview = vi.fn()
    const { rerender } = renderDialog({ onReview })
    await screen.findByText('Versión actual')
    expect(screen.queryByRole('button', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cargar nueva versión' })).not.toBeInTheDocument()
    rerender(<DocumentDetailDialog document={documentRow} onClose={vi.fn()} canUpload onUpload={vi.fn()} canReview onReview={onReview} />)
    expect(screen.getByRole('button', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    expect(onReview).toHaveBeenCalledWith('aprobar')
    await userEvent.click(screen.getByRole('button', { name: 'Ver observaciones' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar observación corregida' }))
    expect(onReview).toHaveBeenCalledWith('corregir', expect.objectContaining({ id: 401 }))
  })
})
