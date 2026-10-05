import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import DocumentosPage from './DocumentosPage'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/crudService', () => ({
  endpoints: { documentos: '/documentos/', tiposDocumento: '/tipos-documento/', postulaciones: '/postulaciones/' },
  crudService: { list: vi.fn() },
  listAll: vi.fn(),
}))

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerDocumentosAplicables: vi.fn(),
    cargarDocumento: vi.fn(),
    obtenerDefensas: vi.fn(),
    obtenerVersiones: vi.fn(),
    obtenerObservaciones: vi.fn(),
    descargarVersion: vi.fn(),
  },
}))

const application = {
  id: 2,
  codigo: 'PG-2026-001',
  estudiante_detalle: { ru: '20260001', nombre_completo: 'Ana Maria Quispe Mamani' },
}
const secondApplication = {
  id: 4,
  codigo: 'PG-2026-002',
  estudiante_detalle: { ru: '20260002', nombre_completo: 'Bruno Perez' },
}
const documentType = { id: 3, codigo: 'PERFIL', nombre: 'Perfil de modalidad de graduación' }
const allowed = { permitida: true, codigo: 'SIN_DOCUMENTO', mensaje: 'El documento todavía no fue cargado.' }
const applicableType = { id: 8, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: allowed }
const secondApplicableType = { id: 9, codigo: 'INFORME_FINAL', nombre: 'Informe final', capacidad_carga: allowed }
const auth = { hasPermission: (permission) => permission === 'puede_cargar_documentos' }
const studentAuth = { ...auth, roleCode: 'ESTUDIANTE' }
const humanApplication = {
  id: 45,
  codigo: 'PG-2026-011',
  estudiante_detalle: { ru: '2026011', nombre_completo: 'Andrea Molina Martines' },
  modalidad_detalle: { nombre: 'Proyecto de Grado' },
}
const documentRow = {
  id: 101,
  postulacion: 45,
  tipo_documento: 9,
  tipo_documento_nombre: 'Documento Final',
  estado_nombre: 'Aprobado',
  fecha_subida: '2026-09-14T10:00:00Z',
  requiere_correccion: false,
  versiones: [{ id: 201, es_version_actual: true }],
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup({
  availableApplications = [application],
  applicableResponse = { documentos_aplicables: [applicableType, secondApplicableType] },
  rows = [],
  pageAuth = studentAuth,
} = {}) {
  crudService.list.mockImplementation((path) => Promise.resolve(path === endpoints.tiposDocumento
    ? { count: 1, next: null, previous: null, results: [documentType] }
    : { count: rows.length, next: null, previous: null, results: rows }))
  listAll.mockResolvedValue(availableApplications)
  postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(applicableResponse)
  postulacionesService.cargarDocumento.mockResolvedValue({ id: 10 })
  postulacionesService.obtenerDefensas.mockResolvedValue({ results: [], next: null })
  postulacionesService.obtenerVersiones.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 201, numero_version: 1, es_version_actual: true, nombre_original: 'documento-final.pdf', tamano_bytes: 2048, subido_por_nombre: 'Andrea Molina Martines' }] })
  postulacionesService.obtenerObservaciones.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 301, comentario: 'Falta la firma del tutor.', usuario_nombre: 'Revisor', corregida: false }] })
  postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'documento-final.pdf' })
  return render(<AuthContext.Provider value={pageAuth}><DocumentosPage /></AuthContext.Provider>)
}

describe('Subir documento', () => {
  beforeEach(() => vi.resetAllMocks())

  it('conserva la presentación humanizada y las acciones de la página', async () => {
    setup({ availableApplications: [humanApplication], rows: [documentRow], pageAuth: auth })

    expect(await screen.findByText('PG-2026-011')).toBeInTheDocument()
    expect(screen.getByText('Andrea Molina Martines')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
    expect(screen.getByText('No requerida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeInTheDocument()
  })

  it('conserva el detalle y la observación general existentes', async () => {
    const user = userEvent.setup()
    setup({
      availableApplications: [humanApplication],
      rows: [{ ...documentRow, observacion_general: 'Falta la firma del tutor.' }],
      pageAuth: auth,
    })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByText('Documento Final')).toBeInTheDocument()
    expect(await within(dialog).findByText('documento-final.pdf')).toBeInTheDocument()
    expect(within(dialog).getByText('Falta la firma del tutor.')).toBeInTheDocument()
  })

  it('abre el UploadDialog compartido y resuelve automáticamente la única postulación del estudiante', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(screen.getByRole('dialog', { name: 'Cargar documento' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Postulación')).not.toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('2', expect.any(AbortSignal)))
    expect(screen.getByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe final')).toBeInTheDocument()
    expect(screen.queryByText(documentType.nombre)).not.toBeInTheDocument()
  })

  it('mantiene la selección explícita cuando existen varias postulaciones accesibles', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [application, secondApplication] })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    await user.selectOptions(screen.getByLabelText('Postulación'), '4')

    await waitFor(() => expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('4', expect.any(AbortSignal)))
    expect(screen.getByLabelText('Documento Final')).toBeInTheDocument()
  })

  it('limpia los documentos anteriores al cambiar de postulación', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [application, secondApplication], pageAuth: auth })
    postulacionesService.obtenerDocumentosAplicables.mockImplementation((selectedId) => Promise.resolve({
      documentos_aplicables: String(selectedId) === '4' ? [secondApplicableType] : [applicableType],
    }))
      await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
      const selector = screen.getByLabelText('Postulación')
      await user.selectOptions(selector, '2')
      expect(await screen.findByLabelText('Documento Final')).toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText('Postulación'), '4')

    expect(await screen.findByLabelText('Informe final')).toBeInTheDocument()
    expect(screen.queryByLabelText('Documento Final')).not.toBeInTheDocument()
  })

  it('permite seleccionar múltiples archivos, quitarlos y reemplazarlos', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    const firstInput = await screen.findByLabelText('Documento Final')
    const secondInput = screen.getByLabelText('Informe final')
    const firstFile = new File(['primero'], 'primero.pdf', { type: 'application/pdf' })
    const replacement = new File(['reemplazo'], 'reemplazo.pdf', { type: 'application/pdf' })

    await user.upload(firstInput, firstFile)
    await user.upload(secondInput, new File(['segundo'], 'segundo.pdf', { type: 'application/pdf' }))
    expect(screen.getByText('2 documentos seleccionados')).toBeInTheDocument()
    await user.click(within(firstInput.closest('div').parentElement).getByRole('button', { name: 'Quitar' }))
    expect(screen.getByText('1 documento seleccionado')).toBeInTheDocument()
    await user.upload(firstInput, replacement)

    expect(screen.getByText('reemplazo.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar 2 documentos' })).toBeEnabled()
  })

  it('realiza la carga múltiple y refresca Mis documentos después de éxitos', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.upload(await screen.findByLabelText('Documento Final'), new File(['uno'], 'uno.pdf'))
    await user.upload(screen.getByLabelText('Informe final'), new File(['dos'], 'dos.pdf'))
    await user.click(screen.getByRole('button', { name: 'Cargar 2 documentos' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(2))
    expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(1, expect.objectContaining({
      postulacionId: '2', tipoDocumentoId: 8,
    }), expect.any(AbortSignal))
    expect(await screen.findByText('2 documentos cargados correctamente.')).toBeInTheDocument()
    await waitFor(() => expect(crudService.list).toHaveBeenCalledTimes(4))
  })

  it('conserva los fallidos y reintenta únicamente esos documentos', async () => {
    const user = userEvent.setup()
    setup()
    postulacionesService.cargarDocumento
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce({ message: 'Carga rechazada.' })
      .mockResolvedValueOnce({ id: 2 })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.upload(await screen.findByLabelText('Documento Final'), new File(['uno'], 'uno.pdf'))
    await user.upload(screen.getByLabelText('Informe final'), new File(['dos'], 'dos.pdf'))
    await user.click(screen.getByRole('button', { name: 'Cargar 2 documentos' }))

    expect(await screen.findByText('1 documento cargado. 1 documento no pudo cargarse.')).toBeInTheDocument()
    expect(screen.getByText('Carga rechazada.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(3))
    expect(postulacionesService.cargarDocumento).toHaveBeenLastCalledWith(
      expect.objectContaining({ postulacionId: '2', tipoDocumentoId: 9 }),
      expect.any(AbortSignal),
    )
    expect(await screen.findByText('1 documento cargado correctamente.')).toBeInTheDocument()
  })

  it('bloquea la carga cuando no existen documentos aplicables o postulaciones accesibles', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [], applicableResponse: { documentos_aplicables: [] } })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(screen.getByText('No existe una postulación disponible para subir documentos.')).toBeInTheDocument()
    expect(screen.getByText('0 documentos seleccionados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar 0 documentos' })).toBeDisabled()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
  })

  it('solo genera inputs para documentos cuya capacidad de carga está permitida', async () => {
    const user = userEvent.setup()
    setup({ applicableResponse: { documentos_aplicables: [
      { ...applicableType, capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO', mensaje: 'El documento está aprobado.' } },
      { ...secondApplicableType, capacidad_carga: { permitida: true, codigo: 'RECHAZADO', mensaje: 'El documento fue rechazado.' } },
    ] } })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(await screen.findByLabelText('Informe final')).toBeInTheDocument()
    expect(screen.queryByLabelText('Documento Final')).not.toBeInTheDocument()
  })

  it('no ofrece documentos reservados a otro actor', async () => {
    const user = userEvent.setup()
    setup({ applicableResponse: { documentos_aplicables: [
      {
        id: 10,
        codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA',
        nombre: 'Informe de Evaluación del Tribunal',
        capacidad_carga: {
          permitida: false,
          codigo: 'ACTOR_CARGA_NO_AUTORIZADO',
          actores_carga_permitidos: ['ADMINISTRACION'],
        },
      },
    ] } })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(screen.queryByLabelText('Informe de Evaluación del Tribunal')).not.toBeInTheDocument()
    expect(screen.getByText('No tienes documentos pendientes de carga o corrección.')).toBeInTheDocument()
  })

  it('muestra una orientación clara cuando ningún documento aplicable es cargable', async () => {
    const user = userEvent.setup()
    setup({ applicableResponse: { documentos_aplicables: [
      { ...applicableType, capacidad_carga: { permitida: false, codigo: 'ESPERANDO_REVISION', mensaje: 'Pendiente de revisión.' } },
    ] } })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(await screen.findByText('No tienes documentos pendientes de carga o corrección.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar 0 documentos' })).toBeDisabled()
  })

  it('muestra errores de documentos aplicables sin recurrir al catálogo global', async () => {
    const user = userEvent.setup()
    setup()
    postulacionesService.obtenerDocumentosAplicables.mockRejectedValue({ message: 'No se pudieron cargar los documentos aplicables.' })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los documentos aplicables.')
    expect(screen.queryByText(documentType.nombre)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar 0 documentos' })).toBeDisabled()
  })

  it('mantiene puede_cargar_documentos como condición de la acción', async () => {
    setup({ pageAuth: { roleCode: 'ESTUDIANTE', hasPermission: () => false } })

    expect(await screen.findByRole('heading', { name: 'Mis documentos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Subir documento' })).not.toBeInTheDocument()
  })

  it('abre el detalle completo del estudiante sin acciones administrativas', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [humanApplication], rows: [documentRow] })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByText('Aprobado')).toBeInTheDocument()
    expect(within(dialog).getByText('Documento Final')).toBeInTheDocument()
    expect(await within(dialog).findByText('Versión actual')).toBeInTheDocument()
    expect(within(dialog).getByText('documento-final.pdf')).toBeInTheDocument()
    expect(within(dialog).getByText('2.0 KB')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Ver' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Aprobar|Rechazar|Registrar observación|Marcar observación corregida/ })).not.toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledTimes(2)
    expect(listAll).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerVersiones).toHaveBeenCalledWith(101, 1, expect.any(AbortSignal))
  })

  it('no muestra el bloque de observacion cuando esta vacia', async () => {
    const user = userEvent.setup()
    setup({
      availableApplications: [humanApplication],
      rows: [{ ...documentRow, observacion_general: '   ' }],
    })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))

    expect(screen.getByRole('dialog', { name: 'Detalle del documento' })).not.toHaveTextContent('Observación')
  })

  it('impide Escape, backdrop y X mientras existe una carga activa', async () => {
    const user = userEvent.setup()
    const pending = deferred()
    setup()
    postulacionesService.cargarDocumento.mockReturnValue(pending.promise)
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.upload(await screen.findByLabelText('Documento Final'), new File(['uno'], 'uno.pdf'))
    await user.click(screen.getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1))

    const dialog = screen.getByRole('dialog', { name: 'Cargar documento' })
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.mouseDown(dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))

    expect(screen.getByRole('dialog', { name: 'Cargar documento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    pending.resolve({ id: 1 })
    expect(await screen.findByText('1 documento cargado correctamente.')).toBeInTheDocument()
  })

  it('detiene el procesamiento al abortar sin registrar la cancelacion como fallo', async () => {
    const user = userEvent.setup()
    const { unmount } = setup()
    postulacionesService.cargarDocumento.mockImplementation((payload, signal) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject({ canceled: true, message: 'Cancelado' }), { once: true })
    }))
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.upload(await screen.findByLabelText('Documento Final'), new File(['uno'], 'uno.pdf'))
    await user.upload(screen.getByLabelText('Informe final'), new File(['dos'], 'dos.pdf'))
    await user.click(screen.getByRole('button', { name: 'Cargar 2 documentos' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1))

    unmount()

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Cargar documento' })).not.toBeInTheDocument()
  })
})
