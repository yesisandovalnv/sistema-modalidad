import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ModalidadesPage from './ModalidadesPage'
import { crudService, modalidadesService } from '../../services/crudService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../services/crudService', () => ({
  endpoints: { modalidades: '/modalidades/' },
  crudService: { list: vi.fn(), update: vi.fn() },
  modalidadesService: {
    obtenerDocumentosOficiales: vi.fn(),
    publicarDocumentoOficial: vi.fn(),
    actualizarDocumentoOficial: vi.fn(),
    descargarDocumentoOficial: vi.fn(),
  },
}))

const modalities = [
  { id: 1, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado', descripcion: 'Examen profesional.', activo: true },
  { id: 2, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica', descripcion: 'Excelencia.', activo: true },
  { id: 3, codigo: 'GRADUACION_VIA_DIPLOMADO', nombre: 'Vía Diplomado', descripcion: 'Diplomado.', activo: true },
  { id: 4, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado', descripcion: 'Proyecto.', activo: true },
  { id: 5, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado', descripcion: 'Tesis.', activo: true },
  { id: 6, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido', descripcion: 'Trabajo.', activo: true },
]

const renderPage = (canManage = false) => render(
  <AuthContext.Provider value={{ hasPermission: (permission) => permission === 'puede_ver_modalidades' || (canManage && permission === 'puede_gestionar_catalogos') }}>
    <ModalidadesPage />
  </AuthContext.Provider>,
)

beforeEach(() => {
  vi.clearAllMocks()
  crudService.list.mockResolvedValue({ count: modalities.length, next: null, previous: null, results: modalities })
  crudService.update.mockResolvedValue(modalities[0])
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([])
  modalidadesService.publicarDocumentoOficial.mockResolvedValue({ id: 4, nombre: 'Requisitos oficiales', updated_at: '2026-09-16T12:00:00Z' })
  modalidadesService.descargarDocumentoOficial.mockResolvedValue({ blob: new Blob(['%PDF-']), filename: 'requisitos.pdf' })
})

it('renderiza las seis modalidades y no muestra Nuevo ni Eliminar', async () => {
  renderPage(true)
  await waitFor(() => expect(screen.getByText('Tesis de Grado')).toBeInTheDocument())
  expect(screen.getAllByRole('article')).toHaveLength(6)
  expect(screen.queryByRole('button', { name: 'Nuevo registro' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
})

it('estudiante ve lectura de requisitos pero no controles administrativos', async () => {
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([{ id: 8, nombre: 'Reglamento de Tesis', updated_at: '2026-09-16T12:00:00Z' }])
  renderPage(false)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Ver' })).toHaveLength(6))
  expect(screen.getAllByRole('button', { name: 'Descargar' })).toHaveLength(6)
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Agregar documento' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument()
})

it('muestra estado vacío cuando no existe documento oficial', async () => {
  renderPage(false)
  await waitFor(() => expect(screen.getAllByText('Aún no se han publicado documentos oficiales.')).toHaveLength(6))
})

it('admin muestra dos documentos con nombres y acciones independientes', async () => {

  const user = userEvent.setup()

  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([
    { id: 10, nombre: 'Reglamento de Examen', updated_at: '2026-09-16T12:00:00Z' },
    { id: 11, nombre: 'Contenidos por áreas', updated_at: '2026-09-16T12:00:00Z' },
  ])

  renderPage(true)

  await waitFor(() => expect(screen.getAllByText('Reglamento de Examen')).toHaveLength(6))
  expect(screen.getAllByText('2 documentos disponibles')).toHaveLength(6)
  expect(screen.queryAllByText('Contenidos por áreas')).toHaveLength(0)
  expect(screen.getAllByRole('button', { name: 'Ver' })).toHaveLength(6)
  expect(screen.getAllByRole('button', { name: 'Descargar' })).toHaveLength(6)
  expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(6)

  const firstArticle = within(screen.getAllByRole('article')[0])
  const expand = firstArticle.getByRole('button', { name: 'Ver otro documento (1)' })
  expect(expand).toHaveAttribute('aria-expanded', 'false')
  await user.click(expand)
  expect(firstArticle.getByText('Contenidos por áreas')).toBeInTheDocument()
  expect(firstArticle.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('button', { name: 'Ver' })).toHaveLength(7)
  expect(screen.getAllByRole('button', { name: 'Descargar' })).toHaveLength(7)
  expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(7)

  await user.click(screen.getAllByRole('button', { name: 'Actualizar' })[1])
  expect(screen.getByRole('dialog', { name: 'Actualizar requisitos: Examen de Grado' })).toHaveTextContent('Contenidos por áreas')

  await user.click(firstArticle.getByRole('button', { name: 'Mostrar menos' }))
  expect(firstArticle.queryByText('Contenidos por áreas')).not.toBeInTheDocument()
})

it('cada modalidad mantiene de forma independiente su expansión documental', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([
    { id: 10, nombre: 'Reglamento de Examen', updated_at: '2026-09-16T12:00:00Z' },
    { id: 11, nombre: 'Contenidos por áreas', updated_at: '2026-09-16T12:00:00Z' },
  ])

  renderPage(false)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Ver otro documento (1)' })).toHaveLength(6))
  const articles = screen.getAllByRole('article').map((article) => within(article))
  await user.click(articles[0].getByRole('button', { name: 'Ver otro documento (1)' }))
  expect(articles[0].getByText('Contenidos por áreas')).toBeInTheDocument()
  expect(articles[1].queryByText('Contenidos por áreas')).not.toBeInTheDocument()
  expect(articles[1].getByRole('button', { name: 'Ver otro documento (1)' })).toHaveAttribute('aria-expanded', 'false')
})

it('estudiante puede expandir documentos y conserva Ver y Descargar por documento', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([
    { id: 10, nombre: 'Reglamento de Examen', updated_at: '2026-09-16T12:00:00Z' },
    { id: 11, nombre: 'Contenidos por áreas', updated_at: '2026-09-16T12:00:00Z' },
  ])

  renderPage(false)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Ver otro documento (1)' })).toHaveLength(6))
  const firstArticle = within(screen.getAllByRole('article')[0])
  await user.click(firstArticle.getByRole('button', { name: 'Ver otro documento (1)' }))
  expect(firstArticle.getByText('Contenidos por áreas')).toBeInTheDocument()
  expect(firstArticle.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument()
  await user.click(firstArticle.getAllByRole('button', { name: 'Descargar' })[1])
  await waitFor(() => expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledWith(1, 11, 'Contenidos por áreas', undefined))
})

it('administrador ve Editar y Subir requisitos, y edita solo descripción', async () => {
  const user = userEvent.setup()
  renderPage(true)
  await waitFor(() => expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument())
  expect(screen.getAllByRole('button', { name: 'Editar modalidad' })).toHaveLength(6)
  await user.click(screen.getAllByRole('button', { name: 'Editar modalidad' })[0])
  const dialog = screen.getByRole('dialog', { name: 'Editar Examen de Grado' })
  expect(within(dialog).getByText('EXAMEN_GRADO')).toBeInTheDocument()
  expect(within(dialog).getByText('Examen de Grado')).toBeInTheDocument()
  await user.clear(within(dialog).getByRole('textbox', { name: 'Descripción' }))
  await user.type(within(dialog).getByRole('textbox', { name: 'Descripción' }), 'Descripción actualizada')
  await user.click(within(dialog).getByRole('button', { name: 'Guardar descripción' }))
  await waitFor(() => expect(crudService.update).toHaveBeenCalledWith('/modalidades/', 1, { descripcion: 'Descripción actualizada' }))
})

it('admin publica y actualiza un PDF mediante los endpoints oficiales', async () => {
  const user = userEvent.setup()
  renderPage(true)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Agregar documento' })).toHaveLength(6))
  await user.click(screen.getAllByRole('button', { name: 'Agregar documento' })[0])
  const dialog = screen.getByRole('dialog', { name: 'Subir requisitos: Examen de Grado' })
  const file = new File(['%PDF-1.7'], 'requisitos.pdf', { type: 'application/pdf' })
  await user.type(within(dialog).getByPlaceholderText('Ej. Reglamento de Examen de Grado'), 'Reglamento de Examen')
  fireEvent.change(within(dialog).getByLabelText('Nuevo archivo PDF'), { target: { files: [file] } })
  fireEvent.submit(dialog.querySelector('form'))
  await waitFor(() => expect(modalidadesService.publicarDocumentoOficial).toHaveBeenCalledWith(1, expect.objectContaining({ archivo: file })))
})

it('admin muestra Actualizar cuando existe documento y descarga usa endpoint protegido', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockImplementation((id) => String(id) === '1' ? Promise.resolve([{ id: 10, nombre: 'Requisitos PDF', updated_at: '2026-09-16T12:00:00Z' }]) : Promise.resolve([]))
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  renderPage(true)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument())
  await user.click(screen.getAllByRole('button', { name: 'Ver' })[0])
  await waitFor(() => expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledWith(1, 10, 'Requisitos PDF', undefined))
  expect(open).toHaveBeenCalled()
  open.mockRestore()
})

it('el modal de actualización muestra el documento actual y mantiene vacío el nuevo File input', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([{ id: 10, nombre: 'Reglamento vigente', updated_at: '2026-09-16T12:00:00Z' }])
  renderPage(true)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(6))
  await user.click(screen.getAllByRole('button', { name: 'Actualizar' })[0])
  const dialog = screen.getByRole('dialog', { name: 'Actualizar requisitos: Examen de Grado' })
  expect(within(dialog).getByText('Documento actual')).toBeInTheDocument()
  expect(within(dialog).getByText('Reglamento vigente')).toBeInTheDocument()
  expect(within(dialog).getByText('Selecciona un nuevo PDF solo si deseas reemplazar el archivo actual.')).toBeInTheDocument()
  expect(within(dialog).getByLabelText('Nuevo archivo PDF')).toHaveValue('')
})

it('admin puede actualizar solo el nombre sin seleccionar otro PDF', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([{ id: 10, nombre: 'Nombre anterior', updated_at: '2026-09-16T12:00:00Z' }])
  renderPage(true)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(6))
  await user.click(screen.getAllByRole('button', { name: 'Actualizar' })[0])
  const dialog = screen.getByRole('dialog', { name: 'Actualizar requisitos: Examen de Grado' })
  const name = within(dialog).getByDisplayValue('Nombre anterior')
  await user.clear(name)
  await user.type(name, 'Nombre corregido')
  await user.click(within(dialog).getByRole('button', { name: 'Actualizar requisitos' }))
  await waitFor(() => expect(modalidadesService.actualizarDocumentoOficial).toHaveBeenCalledWith(1, 10, { archivo: null, nombre: 'Nombre corregido' }))
})

it('admin no publica un documento nuevo con nombre vacío', async () => {
  const user = userEvent.setup()
  renderPage(true)
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Agregar documento' })).toHaveLength(6))
  await user.click(screen.getAllByRole('button', { name: 'Agregar documento' })[0])
  const dialog = screen.getByRole('dialog', { name: 'Subir requisitos: Examen de Grado' })
  await user.upload(within(dialog).getByLabelText('Nuevo archivo PDF'), new File(['%PDF-1.7'], 'requisitos.pdf', { type: 'application/pdf' }))
  await user.click(within(dialog).getByRole('button', { name: 'Publicar requisitos' }))
  expect(modalidadesService.publicarDocumentoOficial).not.toHaveBeenCalled()
})

it('presenta errores de publicación y trata 404 de metadata como no publicado', async () => {
  const user = userEvent.setup()
  modalidadesService.publicarDocumentoOficial.mockRejectedValue({ message: 'Archivo inválido' })
  renderPage(true)
  await waitFor(() => expect(screen.getByText('Examen de Grado')).toBeInTheDocument())
  await user.click(screen.getAllByRole('button', { name: 'Agregar documento' })[0])
  const dialog = screen.getByRole('dialog', { name: 'Subir requisitos: Examen de Grado' })
  await user.type(within(dialog).getByPlaceholderText('Ej. Reglamento de Examen de Grado'), 'Reglamento de Examen')
  fireEvent.change(within(dialog).getByLabelText('Nuevo archivo PDF'), { target: { files: [new File(['x'], 'archivo.txt', { type: 'text/plain' })] } })
  fireEvent.submit(dialog.querySelector('form'))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Archivo inválido')
  expect(screen.getAllByText('Aún no se han publicado documentos oficiales.')).toHaveLength(6)
})
