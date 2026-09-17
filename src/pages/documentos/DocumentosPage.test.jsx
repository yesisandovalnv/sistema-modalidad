import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import DocumentosPage from './DocumentosPage'
import { crudService, endpoints, listAll } from '../../services/crudService'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/crudService', () => ({
  endpoints: { documentos: '/documentos/', tiposDocumento: '/tipos-documento/', postulaciones: '/postulaciones/' },
  crudService: { list: vi.fn(), create: vi.fn() },
  listAll: vi.fn(),
}))

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: { obtenerDocumentosAplicables: vi.fn() },
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
const applicableType = { id: 8, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final' }
const secondApplicableType = { id: 9, codigo: 'INFORME_FINAL', nombre: 'Informe final' }
const auth = { hasPermission: (permission) => permission === 'puede_cargar_documentos' }
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
  estado: 4,
  estado_nombre: 'Aprobado',
  fecha_subida: '2026-09-14T10:00:00Z',
  requiere_correccion: false,
  versiones: [{ id: 201, es_version_actual: true }],
}

function setup({ availableApplications = [application], applicableResponse = { documentos_aplicables: [applicableType] }, rows = [], pageAuth = auth } = {}) {
  crudService.list.mockImplementation((path) => Promise.resolve(path === endpoints.tiposDocumento
    ? { count: 1, next: null, previous: null, results: [documentType] }
    : path === endpoints.documentos ? { count: rows.length, next: null, previous: null, results: rows } : { count: 0, next: null, previous: null, results: [] }))
  listAll.mockResolvedValue(availableApplications)
  postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(applicableResponse)
  crudService.create.mockResolvedValue({ id: 10 })
  return render(<AuthContext.Provider value={pageAuth}><DocumentosPage /></AuthContext.Provider>)
}

describe('Subir documento', () => {
  beforeEach(() => vi.clearAllMocks())

  it('carga las postulaciones accesibles y muestra una etiqueta entendible', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(listAll).toHaveBeenCalledWith(
      endpoints.postulaciones,
      { ordering: '-created_at' },
      expect.any(AbortSignal),
    )
    expect(screen.queryByLabelText('ID de postulación')).not.toBeInTheDocument()
    expect(screen.getByRole('option', {
      name: 'PG-2026-001 - 20260001 - Ana Maria Quispe Mamani',
    })).toBeInTheDocument()
  })

  it('admin muestra datos humanos de postulación, modalidad, estado y conserva acciones', async () => {
    setup({ availableApplications: [humanApplication], rows: [documentRow] })

    expect(await screen.findByText('PG-2026-011')).toBeInTheDocument()
    expect(screen.getByText('Andrea Molina Martines')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
    expect(screen.getByText('No requerida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeInTheDocument()
    expect(screen.queryByText('45')).not.toBeInTheDocument()
    expect(screen.queryByText('4')).not.toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledTimes(2)
    expect(listAll).toHaveBeenCalledTimes(1)
  })

  it('estudiante ve Mis documentos con código y modalidad sin repetir su nombre', async () => {
    const studentAuth = { ...auth, roleCode: 'ESTUDIANTE' }
    setup({ availableApplications: [humanApplication], rows: [documentRow], pageAuth: studentAuth })

    expect(await screen.findByRole('heading', { name: 'Mis documentos' })).toBeInTheDocument()
    expect(screen.getByText('PG-2026-011')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
    expect(screen.queryByText('Andrea Molina Martines')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeInTheDocument()
  })

  it('admin abre detalle humanizado sin requests adicionales', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [humanApplication], rows: [documentRow] })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByText('PG-2026-011')).toBeInTheDocument()
    expect(within(dialog).getByText('Andrea Molina Martines')).toBeInTheDocument()
    expect(within(dialog).getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(within(dialog).getByText('Aprobado')).toBeInTheDocument()
    expect(within(dialog).getByText('Documento Final')).toBeInTheDocument()
    expect(within(dialog).getByText('No requerida')).toBeInTheDocument()
    expect(within(dialog).getByText('Versiones')).toBeInTheDocument()
    expect(within(dialog).getByText('1')).toBeInTheDocument()
    expect(within(dialog).queryByText('45')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('4')).not.toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledTimes(2)
    expect(listAll).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
  })

  it('estudiante abre detalle sin repetir su nombre y sin requests adicionales', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [humanApplication], rows: [documentRow], pageAuth: { ...auth, roleCode: 'ESTUDIANTE' } })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByText('PG-2026-011')).toBeInTheDocument()
    expect(within(dialog).getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(within(dialog).getByText('Aprobado')).toBeInTheDocument()
    expect(within(dialog).queryByText('Andrea Molina Martines')).not.toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledTimes(2)
    expect(listAll).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
  })

  it('muestra la observación general solo cuando contiene texto', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [humanApplication], rows: [{ ...documentRow, observacion_general: 'Falta la firma del tutor.' }] })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByText('Observación')).toBeInTheDocument()
    expect(within(dialog).getByText('Falta la firma del tutor.')).toBeInTheDocument()
  })

  it('no muestra el bloque de observación cuando está vacío', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [humanApplication], rows: [{ ...documentRow, observacion_general: '   ' }] })
    await user.click(await screen.findByRole('button', { name: 'Detalle' }))
    expect(screen.getByRole('dialog', { name: 'Detalle del documento' })).not.toHaveTextContent('Observación')
  })

  it('no muestra el catálogo global al abrir el modal sin postulación', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Subir documento' }))

    expect(screen.getByLabelText('Tipo de documento')).toHaveValue('')
    expect(within(screen.getByLabelText('Tipo de documento')).getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
  })

  it('consulta y muestra únicamente los tipos aplicables a la postulación seleccionada', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.selectOptions(screen.getByLabelText('Postulación'), '2')

    await waitFor(() => expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('2', expect.any(AbortSignal)))
    expect(screen.getByRole('option', { name: 'Documento Final' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: documentType.nombre })).not.toBeInTheDocument()
  })

  it('muestra estado vacío y bloquea la carga cuando no hay tipos aplicables', async () => {
    const user = userEvent.setup()
    setup({ applicableResponse: { documentos_aplicables: [] } })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.selectOptions(screen.getByLabelText('Postulación'), '2')

    expect(await screen.findByText('No hay tipos documentales disponibles para cargar en la etapa actual.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de documento')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
  })

  it('limpia tipos anteriores y consulta de nuevo al cambiar de postulación', async () => {
    const user = userEvent.setup()
    setup({ availableApplications: [application, secondApplication] })
    postulacionesService.obtenerDocumentosAplicables
      .mockReset()
      .mockResolvedValueOnce({ documentos_aplicables: [applicableType] })
      .mockResolvedValueOnce({ documentos_aplicables: [secondApplicableType] })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    const applicationSelect = screen.getByLabelText('Postulación')
    await user.selectOptions(applicationSelect, '2')
    await screen.findByRole('option', { name: 'Documento Final' })
    await user.selectOptions(screen.getByLabelText('Tipo de documento'), '8')
    await user.selectOptions(applicationSelect, '4')

    expect(screen.getByLabelText('Tipo de documento')).toHaveValue('')
    expect(screen.queryByRole('option', { name: 'Documento Final' })).not.toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Informe final' })).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenLastCalledWith('4', expect.any(AbortSignal))
  })

  it('muestra error y no usa el catálogo global si falla documentos-aplicables', async () => {
    const user = userEvent.setup()
    setup()
    postulacionesService.obtenerDocumentosAplicables.mockRejectedValue({ message: 'No se pudieron cargar los documentos aplicables.' })
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.selectOptions(screen.getByLabelText('Postulación'), '2')

    expect(await screen.findByText('No se pudieron cargar los documentos aplicables.')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: documentType.nombre })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
  })

  it('envía el ID real seleccionado dentro del multipart existente', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Subir documento' }))
    await user.selectOptions(screen.getByLabelText('Postulación'), '2')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Documento Final' })).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Tipo de documento'), '8')
    await user.upload(screen.getByLabelText('Archivo'), new File(['contenido'], 'perfil.pdf', { type: 'application/pdf' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Subir' }).closest('form'))

    await waitFor(() => expect(crudService.create).toHaveBeenCalledTimes(1))
    const [path, body, config] = crudService.create.mock.calls[0]
    expect(path).toBe('/documentos/subir/')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('postulacion_id')).toBe('2')
    expect(body.get('tipo_documento_id')).toBe('8')
    expect(body.get('archivo')).toBeInstanceOf(File)
    expect(config).toBeUndefined()
  })
})
