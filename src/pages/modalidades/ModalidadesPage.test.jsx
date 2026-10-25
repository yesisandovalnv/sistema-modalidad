import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ModalidadesPage from './ModalidadesPage'
import { crudService, modalidadesService } from '../../services/crudService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('./PdfThumbnail', () => ({ default: () => null }))

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

it('inicia contraído, permite teclado y clic, y mantiene solo una modalidad expandida', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([
    { id: 10, nombre: 'Reglamento', updated_at: '2026-09-16T12:00:00Z' },
    { id: 11, nombre: 'Contenidos' },
    { id: 12, nombre: 'Formulario' },
  ])
  renderPage(false)
  const controls = await screen.findAllByRole('button', { name: 'Documentos oficiales (3)' })
  expect(controls).toHaveLength(6)
  controls.forEach((control) => {
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(control.getAttribute('aria-controls'))).toHaveAttribute('aria-hidden', 'true')
  })
  expect(screen.getAllByText('Reglamento').every((node) => node.closest('[aria-hidden="true"]'))).toBe(true)
  controls[0].focus()
  await user.keyboard('{Enter}')
  expect(controls[0]).toHaveAttribute('aria-expanded', 'true')
  expect(within(screen.getAllByRole('article')[0]).getByText('Formulario')).toBeVisible()
  expect(screen.getAllByRole('button', { name: /^Ver / })).toHaveLength(3)
  expect(screen.getAllByRole('button', { name: /^Descargar / })).toHaveLength(3)
  expect(screen.queryByRole('button', { name: /^Editar / })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Agregar documento' })).not.toBeInTheDocument()
  await user.click(controls[1])
  expect(controls[0]).toHaveAttribute('aria-expanded', 'false')
  expect(controls[1]).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('region')).toHaveLength(1)
  await user.click(controls[1])
  expect(screen.getAllByText('Reglamento').every((node) => node.closest('[aria-hidden="true"]'))).toBe(true)
})

it('expande el estado vacío sin mostrar acciones administrativas al estudiante', async () => {
  const user = userEvent.setup()
  renderPage(false)
  const controls = await screen.findAllByRole('button', { name: 'Documentos oficiales (0)' })
  expect(screen.getAllByText('Aún no se han publicado documentos oficiales.').every((node) => node.closest('[aria-hidden="true"]'))).toBe(true)
  await user.click(controls[0])
  expect(within(screen.getAllByRole('article')[0]).getByText('Aún no se han publicado documentos oficiales.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Editar modalidad' })).not.toBeInTheDocument()
})

it('conserva Ver y Descargar como iconos con nombres accesibles para cada documento', async () => {
  const user = userEvent.setup()
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([
    { id: 10, nombre: 'Reglamento' }, { id: 11, nombre: 'Contenidos' },
  ])
  renderPage(false)
  await user.click((await screen.findAllByRole('button', { name: 'Documentos oficiales (2)' }))[0])
  const view = screen.getByRole('button', { name: 'Ver Contenidos' })
  const download = screen.getByRole('button', { name: 'Descargar Contenidos' })
  expect(view).toHaveTextContent('')
  expect(download).toHaveTextContent('')
  expect(view).toHaveAttribute('title', 'Ver Contenidos')
  await user.click(view)
  await waitFor(() => expect(open).toHaveBeenCalled())
  await user.click(download)
  await waitFor(() => expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledTimes(2))
  expect(modalidadesService.descargarDocumentoOficial).toHaveBeenLastCalledWith(1, 11, 'Contenidos', undefined)
  open.mockRestore()
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
  await user.click((await screen.findAllByRole('button', { name: 'Documentos oficiales (1)' }))[0])
  await user.click(screen.getAllByRole('button', { name: 'Ver Requisitos PDF' })[0])
  await waitFor(() => expect(modalidadesService.descargarDocumentoOficial).toHaveBeenCalledWith(1, 10, 'Requisitos PDF', undefined))
  expect(open).toHaveBeenCalled()
  open.mockRestore()
})

it('el modal de actualización muestra el documento actual y mantiene vacío el nuevo File input', async () => {
  const user = userEvent.setup()
  modalidadesService.obtenerDocumentosOficiales.mockResolvedValue([{ id: 10, nombre: 'Reglamento vigente', updated_at: '2026-09-16T12:00:00Z' }])
  renderPage(true)
  await user.click((await screen.findAllByRole('button', { name: 'Documentos oficiales (1)' }))[0])
  await user.click(screen.getAllByRole('button', { name: /^Editar (Reglamento vigente|Nombre anterior)$/ })[0])
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
  await user.click((await screen.findAllByRole('button', { name: 'Documentos oficiales (1)' }))[0])
  await user.click(screen.getAllByRole('button', { name: /^Editar (Reglamento vigente|Nombre anterior)$/ })[0])
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
