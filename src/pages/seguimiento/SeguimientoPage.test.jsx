import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import SeguimientoPage from './SeguimientoPage'
import { crudService, endpoints, listAll } from '../../services/crudService'

vi.mock('../../services/crudService', () => ({
  endpoints: {
    seguimiento: '/api/v1/seguimientos-etapa/',
    modalidades: '/api/v1/academico/modalidades/',
    periodos: '/api/v1/academico/periodos/',
  },
  crudService: { list: vi.fn(), action: vi.fn() },
  listAll: vi.fn(),
}))

const modalidades = [
  { id: 1, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
  { id: 2, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
]
const periodos = [{ id: 4, nombre: '2026-I', gestion: 2026, semestre: 'I' }]
const etapas = [{ id: 10, codigo: 'INSCRIPCION', nombre: 'Inscripción' }]

const seguimiento = {
  id: 7,
  postulacion: 3,
  codigo_postulacion: 'PG-2026-003',
  estudiante_nombre: 'Ana Maria Quispe Mamani',
  modalidad_nombre: 'Proyecto de Grado',
  codigo: 'INSCRIPCION',
  nombre: 'Inscripción',
  estado: 'EN_PROCESO',
  numero_intento: 1,
  obligatoria: true,
  fecha_inicio: '2026-09-10T10:00:00Z',
  fecha_fin: null,
  observaciones: 'Revisar requisitos.',
  acciones_permitidas: ['aprobar', 'observar', 'rechazar'],
}

function renderPage({ canManage = true, rows = [seguimiento], withRoutes = false } = {}) {
  crudService.list.mockImplementation((path) => Promise.resolve(
    path.endsWith('/capacidades/')
      ? { etapas }
      : { count: rows.length, next: null, previous: null, results: rows },
  ))
  crudService.action.mockResolvedValue(seguimiento)
  const page = <AuthContext.Provider value={{ hasPermission: (permission) => canManage && permission === 'puede_gestionar_seguimiento' }}><SeguimientoPage /></AuthContext.Provider>
  return render(<MemoryRouter initialEntries={['/seguimiento']}>
    {withRoutes ? <Routes><Route path="/seguimiento" element={page} /><Route path="/postulaciones/:id" element={<h1>Expediente correcto</h1>} /></Routes> : page}
  </MemoryRouter>)
}

async function openDetail(buttonName = 'Gestionar') {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: buttonName }))
  return { user, dialog: screen.getByRole('dialog', { name: 'Inscripción' }) }
}

describe('SeguimientoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAll.mockImplementation((path) => Promise.resolve(path === endpoints.modalidades ? modalidades : periodos))
  })

  it('carga el listado y muestra los datos humanos sin destacar el intento inicial', async () => {
    renderPage()
    expect(await screen.findByText('PG-2026-003', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/Ana Maria Quispe Mamani/)).toBeInTheDocument()
    expect(screen.getByText(/Proyecto de Grado/, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/En proceso/, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('INSCRIPCION')).toBeInTheDocument()
    expect(screen.queryByText('Intento 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Postulación 3')).not.toBeInTheDocument()
  })

  it('destaca los intentos posteriores al primero', async () => {
    renderPage({ rows: [{ ...seguimiento, id: 8, numero_intento: 2 }] })
    expect(await screen.findByText('Intento 2')).toBeInTheDocument()
  })

  it('presenta el error del listado y permite reintentar', async () => {
    crudService.list.mockRejectedValueOnce({ message: 'No se pudo cargar.' }).mockResolvedValueOnce({ count: 0, results: [] })
    const page = <AuthContext.Provider value={{ hasPermission: () => true }}><SeguimientoPage /></AuthContext.Provider>
    render(<MemoryRouter>{page}</MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(crudService.list).toHaveBeenCalledTimes(2))
  })

  it('mantiene la búsqueda existente y reinicia la página', async () => {
    renderPage()
    await screen.findByText('PG-2026-003', { exact: false })
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar' }), { target: { value: 'INSCRIPCION' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(endpoints.seguimiento, {
      search: 'INSCRIPCION', page: 1, ordering: '-updated_at,-id', modalidad: '', estado: '', etapa: '', periodo: '',
    }, expect.any(AbortSignal)))
  })

  it('renderiza filtros con catálogos canónicos y envía filtros combinados', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('option', { name: 'Trabajo Dirigido' })

    await user.selectOptions(screen.getByLabelText('Modalidad'), '2')
    await screen.findByRole('option', { name: 'Inscripción' })
    await user.selectOptions(screen.getByLabelText('Estado'), 'APROBADA')
    await user.selectOptions(screen.getByLabelText('Etapa'), '10')
    await user.selectOptions(screen.getByLabelText('Periodo / gestión'), '4')

    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(endpoints.seguimiento, {
      search: '', page: 1, ordering: '-updated_at,-id', modalidad: '2', estado: 'APROBADA', etapa: '10', periodo: '4',
    }, expect.any(AbortSignal)))
  })

  it('combina búsqueda con filtros y limpiar filtros conserva la búsqueda', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('option', { name: 'Trabajo Dirigido' })
    await user.selectOptions(screen.getByLabelText('Estado'), 'OBSERVADA')
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'Mendoza')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(endpoints.seguimiento, expect.objectContaining({
      search: 'Mendoza', page: 1, estado: 'OBSERVADA',
    }), expect.any(AbortSignal)))

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(endpoints.seguimiento, expect.objectContaining({
      search: 'Mendoza', page: 1, modalidad: '', estado: '', etapa: '', periodo: '',
    }), expect.any(AbortSignal)))
  })

  it('al cambiar un filtro vuelve a la página 1 y la paginación conserva filtros', async () => {
    crudService.list.mockResolvedValue({ count: 21, next: '/page/2', previous: null, results: [seguimiento] })
    const user = userEvent.setup()
    render(<MemoryRouter><AuthContext.Provider value={{ hasPermission: () => true }}><SeguimientoPage /></AuthContext.Provider></MemoryRouter>)
    await screen.findByText('PG-2026-003', { exact: false })
    await user.selectOptions(screen.getByLabelText('Estado'), 'PENDIENTE')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(endpoints.seguimiento, expect.objectContaining({ page: 2, estado: 'PENDIENTE' }), expect.any(AbortSignal)))
    await user.selectOptions(screen.getByLabelText('Estado'), 'APROBADA')
    await waitFor(() => expect(crudService.list).toHaveBeenLastCalledWith(endpoints.seguimiento, expect.objectContaining({ page: 1, estado: 'APROBADA' }), expect.any(AbortSignal)))
  })

  it('usa Gestionar con acciones y abre el detalle completo', async () => {
    renderPage()
    const { dialog } = await openDetail()
    expect(within(dialog).getByText('PG-2026-003')).toBeInTheDocument()
    expect(within(dialog).getByText('Ana Maria Quispe Mamani')).toBeInTheDocument()
    expect(within(dialog).getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(within(dialog).getByText('En proceso')).toBeInTheDocument()
    expect(within(dialog).getByText('Obligatoria')).toBeInTheDocument()
    expect(within(dialog).getByText('Revisar requisitos.')).toBeInTheDocument()
    for (const action of ['Aprobar', 'Observar', 'Rechazar']) expect(within(dialog).getByRole('button', { name: action })).toBeInTheDocument()
    for (const action of ['Iniciar', 'Omitir']) expect(within(dialog).queryByRole('button', { name: action })).not.toBeInTheDocument()
  })

  it('usa Ver detalle sin acciones y no promete una transición', async () => {
    renderPage({ rows: [{ ...seguimiento, estado: 'APROBADA', acciones_permitidas: [] }] })
    const user = userEvent.setup()
    expect(await screen.findByRole('button', { name: 'Ver detalle' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Inscripción' })
    expect(within(dialog).getByText('No hay acciones disponibles para esta etapa.')).toBeInTheDocument()
    for (const action of ['Iniciar', 'Aprobar', 'Observar', 'Rechazar', 'Omitir']) expect(within(dialog).queryByRole('button', { name: action })).not.toBeInTheDocument()
  })

  it('abre el expediente de la postulación seleccionada', async () => {
    renderPage({ withRoutes: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar' }))
    const link = screen.getByRole('link', { name: 'Abrir expediente' })
    expect(link).toHaveAttribute('href', '/postulaciones/3')
    fireEvent.click(link)
    expect(await screen.findByRole('heading', { name: 'Expediente correcto' })).toBeInTheDocument()
  })

  it('oculta las acciones operativas a un usuario de solo lectura', async () => {
    renderPage({ canManage: false })
    const { dialog } = await openDetail()
    for (const action of ['Iniciar', 'Aprobar', 'Observar', 'Rechazar', 'Omitir']) expect(within(dialog).queryByRole('button', { name: action })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Abrir expediente' })).toBeInTheDocument()
  })

  it.each(['iniciar', 'aprobar', 'rechazar', 'omitir'])('confirma %s antes de ejecutar', async (action) => {
    const item = { ...seguimiento, acciones_permitidas: [action] }
    renderPage({ rows: [item] })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
    await user.click(screen.getByRole('button', { name: new RegExp(`^${action}$`, 'i') }))
    expect(crudService.action).not.toHaveBeenCalled()
    const confirmation = screen.getByRole('dialog', { name: `Confirmar ${action}` })
    expect(within(confirmation).getByText('PG-2026-003', { exact: false })).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: `Confirmar ${action}` }))
    await waitFor(() => expect(crudService.action).toHaveBeenCalledWith(endpoints.seguimiento, 7, action, {}))
  })

  it('cancelar una confirmación vuelve al detalle sin ejecutar', async () => {
    renderPage({ rows: [{ ...seguimiento, acciones_permitidas: ['aprobar'] }] })
    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Confirmar aprobar' })).getByRole('button', { name: 'Cancelar' }))
    expect(crudService.action).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Inscripción' })).toBeInTheDocument()
  })

  it('observa mediante un formulario estructurado y envía una sola vez', async () => {
    renderPage({ rows: [{ ...seguimiento, acciones_permitidas: ['observar'] }] })
    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Observar' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar observación' })
    const submit = within(dialog).getByRole('button', { name: 'Confirmar observación' })
    expect(submit).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText('Observación'), { target: { value: '  Debe subsanar el documento.  ' } })
    fireEvent.click(submit)
    await waitFor(() => expect(crudService.action).toHaveBeenCalledWith(endpoints.seguimiento, 7, 'observar', { observaciones: 'Debe subsanar el documento.' }))
    expect(crudService.action).toHaveBeenCalledTimes(1)
  })

  it('cancelar la observación no ejecuta el request', async () => {
    renderPage({ rows: [{ ...seguimiento, acciones_permitidas: ['observar'] }] })
    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Observar' }))
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: 'No enviar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(crudService.action).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Inscripción' })).toBeInTheDocument()
  })

  it('mantiene el diálogo y muestra el error backend de una acción', async () => {
    crudService.list.mockResolvedValue({ count: 1, results: [{ ...seguimiento, acciones_permitidas: ['observar'] }] })
    crudService.action.mockRejectedValue({ message: 'No se pudo registrar la observación.' })
    const page = <AuthContext.Provider value={{ hasPermission: () => true }}><SeguimientoPage /></AuthContext.Provider>
    const user = userEvent.setup()
    render(<MemoryRouter>{page}</MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
    await user.click(screen.getByRole('button', { name: 'Observar' }))
    await user.type(screen.getByLabelText('Observación'), 'Revisar')
    await user.click(screen.getByRole('button', { name: 'Confirmar observación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar la observación.')
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeInTheDocument()
  })

  it('bloquea el doble envío mientras la acción está en progreso', async () => {
    let resolveAction
    crudService.list.mockResolvedValue({ count: 1, results: [{ ...seguimiento, acciones_permitidas: ['aprobar'] }] })
    crudService.action.mockImplementation(() => new Promise((resolve) => { resolveAction = resolve }))
    const page = <AuthContext.Provider value={{ hasPermission: () => true }}><SeguimientoPage /></AuthContext.Provider>
    const user = userEvent.setup()
    render(<MemoryRouter>{page}</MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar aprobar' })
    await user.click(confirm)
    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled()
    expect(crudService.action).toHaveBeenCalledTimes(1)
    resolveAction(seguimiento)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
