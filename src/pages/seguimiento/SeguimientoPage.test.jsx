import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import SeguimientoPage from './SeguimientoPage'
import { crudService, endpoints } from '../../services/crudService'

vi.mock('../../services/crudService', () => ({
  endpoints: { seguimiento: '/api/v1/seguimientos-etapa/' },
  crudService: { list: vi.fn(), action: vi.fn() },
}))

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
  fecha_inicio: '2026-09-10T10:00:00Z',
  fecha_fin: null,
  observaciones: 'Revisar requisitos.',
  acciones_permitidas: ['aprobar', 'observar', 'rechazar'],
}

function renderPage(canManage = true) {
  crudService.list.mockResolvedValue({ count: 1, next: null, previous: null, results: [seguimiento] })
  crudService.action.mockResolvedValue(seguimiento)
  return render(<AuthContext.Provider value={{ hasPermission: (permission) => canManage && permission === 'puede_gestionar_seguimiento' }}><SeguimientoPage /></AuthContext.Provider>)
}

describe('SeguimientoPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra datos humanos en la tarjeta y no identifica la postulación por ID', async () => {
    renderPage()

    expect(await screen.findByText(/PG-2026-003/)).toBeInTheDocument()
    expect(screen.getByText(/Ana Maria Quispe Mamani/)).toBeInTheDocument()
    expect(screen.getByText(/Proyecto de Grado/)).toBeInTheDocument()
    expect(screen.getByText(/En proceso/)).toBeInTheDocument()
    expect(screen.getByText(/INSCRIPCION.*Intento 1/)).toBeInTheDocument()
    expect(screen.queryByText('Postulación 3')).not.toBeInTheDocument()
  })

  it('muestra los datos humanos en el modal y conserva las acciones administrativas', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Detalle y acciones' }))

    const dialog = screen.getByRole('dialog', { name: 'Inscripción' })
    expect(within(dialog).getByText('PG-2026-003')).toBeInTheDocument()
    expect(within(dialog).getByText('Ana Maria Quispe Mamani')).toBeInTheDocument()
    expect(within(dialog).getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(within(dialog).getByText('En proceso')).toBeInTheDocument()
    expect(within(dialog).getByText(new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(seguimiento.fecha_inicio)))).toBeInTheDocument()
    expect(within(dialog).getByText('—')).toBeInTheDocument()
    expect(within(dialog).getByText('Revisar requisitos.')).toBeInTheDocument()
    for (const action of ['Aprobar', 'Observar', 'Rechazar']) expect(within(dialog).getByRole('button', { name: action })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Iniciar' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Omitir' })).not.toBeInTheDocument()
  })

  it('oculta las acciones operativas sin permiso de gestión', async () => {
    const user = userEvent.setup()
    renderPage(false)
    await user.click(await screen.findByRole('button', { name: 'Detalle y acciones' }))

    const dialog = screen.getByRole('dialog', { name: 'Inscripción' })
    for (const action of ['Iniciar', 'Aprobar', 'Observar', 'Rechazar', 'Omitir']) expect(within(dialog).queryByRole('button', { name: action })).not.toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledWith(endpoints.seguimiento, { search: '', page: 1, ordering: 'etapa__orden' }, expect.any(AbortSignal))
  })

  it('mantiene las acciones conectadas al endpoint actual', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Detalle y acciones' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Inscripción' })).getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(crudService.action).toHaveBeenCalledWith(endpoints.seguimiento, 7, 'aprobar', {}))
  })

  it('no muestra acciones ni transición para una etapa cerrada', async () => {
    const user = userEvent.setup()
    crudService.list.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ ...seguimiento, estado: 'APROBADA', acciones_permitidas: [] }] })
    render(<AuthContext.Provider value={{ hasPermission: () => true }}><SeguimientoPage /></AuthContext.Provider>)
    await user.click(await screen.findByRole('button', { name: 'Detalle y acciones' }))

    const dialog = screen.getByRole('dialog', { name: 'Inscripción' })
    expect(within(dialog).getByText('No hay acciones disponibles para esta etapa.')).toBeInTheDocument()
    for (const action of ['Iniciar', 'Aprobar', 'Observar', 'Rechazar', 'Omitir']) expect(within(dialog).queryByRole('button', { name: action })).not.toBeInTheDocument()
  })
})
