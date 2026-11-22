import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ReportFilters } from './ReportFilters'
import { reportesService } from '../../services/reportesService'

vi.mock('../../services/reportesService', () => ({ reportesService: { obtenerModalidades: vi.fn(), obtenerCapacidades: vi.fn() } }))

async function openFilters(user) {
  await user.click(screen.getByRole('button', { name: /Filtrar/ }))
  return screen.findByRole('group', { name: 'Filtros' })
}

function column(panel, title) {
  return within(within(panel).getByRole('group', { name: title }))
}

describe('ReportFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportesService.obtenerModalidades.mockResolvedValue([{ id: 1, nombre: 'Proyecto' }, { id: 2, nombre: 'Tesis' }])
    reportesService.obtenerCapacidades.mockResolvedValue({ configuracion_valida: true, etapas: [] })
  })

  it('un solo botón Filtrar despliega columnas y aplica al instante lo marcado', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    render(<ReportFilters onApply={onApply} gestiones={[2025, 2026]} />)
    await waitFor(() => expect(reportesService.obtenerModalidades).toHaveBeenCalled())
    const panel = await openFilters(user)
    for (const title of ['Gestión', 'Semestre', 'Modalidad', 'Tipo de registro', 'Etapa actual']) {
      expect(within(panel).getByRole('group', { name: title })).toBeInTheDocument()
    }
    await user.click(column(panel, 'Gestión').getByRole('button', { name: '2025' }))
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ gestion: '2025' }))
    expect(column(panel, 'Gestión').getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Filtrar/ })).toHaveTextContent('1')
    expect(screen.getByRole('list', { name: 'Filtros activos' })).toHaveTextContent('Gestión: 2025')
  })

  it('tocar de nuevo una opción marcada la desmarca', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    render(<ReportFilters onApply={onApply} />)
    const panel = await openFilters(user)
    await user.click(column(panel, 'Semestre').getByRole('button', { name: 'Semestre I' }))
    await user.click(column(panel, 'Semestre').getByRole('button', { name: 'Semestre I' }))
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ semestre: '' }))
    expect(screen.queryByRole('list', { name: 'Filtros activos' })).not.toBeInTheDocument()
  })

  it('carga etapas válidas al elegir modalidad, ignora null y las envía por ID', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    reportesService.obtenerCapacidades.mockResolvedValue({ configuracion_valida: false, advertencias: ['Falta una etapa'], etapas: [{ id: 10, codigo: 'A', nombre: 'Etapa A' }, { id: null, codigo: 'B', nombre: 'Etapa B' }] })
    render(<ReportFilters onApply={onApply} />)
    await waitFor(() => expect(reportesService.obtenerModalidades).toHaveBeenCalled())
    const panel = await openFilters(user)
    expect(column(panel, 'Etapa actual').getByText('Elige una modalidad')).toBeInTheDocument()
    await user.click(await column(panel, 'Modalidad').findByRole('button', { name: 'Proyecto' }))
    const etapa = await column(panel, 'Etapa actual').findByRole('button', { name: 'Etapa A' })
    expect(column(panel, 'Etapa actual').queryByRole('button', { name: 'Etapa B' })).not.toBeInTheDocument()
    await user.click(etapa)
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ modalidad: '1', etapa_actual: '10' }))
    expect(screen.getByText('Falta una etapa')).toBeInTheDocument()
  })

  it('cambiar la modalidad limpia la etapa y Limpiar restaura todo', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    reportesService.obtenerCapacidades.mockResolvedValue({ configuracion_valida: true, etapas: [{ id: 10, nombre: 'Etapa A' }] })
    render(<ReportFilters onApply={onApply} />)
    await waitFor(() => expect(reportesService.obtenerModalidades).toHaveBeenCalled())
    const panel = await openFilters(user)
    await user.click(await column(panel, 'Modalidad').findByRole('button', { name: 'Proyecto' }))
    await user.click(await column(panel, 'Etapa actual').findByRole('button', { name: 'Etapa A' }))
    await user.click(column(panel, 'Modalidad').getByRole('button', { name: 'Tesis' }))
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ modalidad: '2', etapa_actual: '' }))
    expect(screen.queryByText('Quitar filtros')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ modalidad: '', etapa_actual: '', gestion: '', semestre: '', tipo_registro: '' }))
  })

  it('los chips quitan un filtro con su ×', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    render(<ReportFilters onApply={onApply} />)
    const panel = await openFilters(user)
    await user.click(column(panel, 'Tipo de registro').getByRole('button', { name: 'Histórico' }))
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ tipo_registro: 'HISTORICO' }))
    await user.click(screen.getByRole('button', { name: 'Quitar filtro Tipo de registro' }))
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ tipo_registro: '' }))
  })

  it('muestra el error de etapas y Escape cierra el panel', async () => {
    const user = userEvent.setup()
    reportesService.obtenerCapacidades.mockRejectedValueOnce(new Error('falló'))
    render(<ReportFilters onApply={() => {}} />)
    await waitFor(() => expect(reportesService.obtenerModalidades).toHaveBeenCalled())
    const panel = await openFilters(user)
    await user.click(await column(panel, 'Modalidad').findByRole('button', { name: 'Proyecto' }))
    expect(await screen.findByText('No se pudieron cargar las etapas.')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Filtros' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filtrar/ })).toHaveFocus()
  })
})
