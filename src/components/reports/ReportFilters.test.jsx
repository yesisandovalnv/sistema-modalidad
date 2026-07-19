import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ReportFilters } from './ReportFilters'
import { reportesService } from '../../services/reportesService'

vi.mock('../../services/reportesService', () => ({ reportesService: { obtenerModalidades: vi.fn(), obtenerCapacidades: vi.fn() } }))

describe('ReportFilters', () => {
  beforeEach(() => reportesService.obtenerModalidades.mockResolvedValue([{ id: 1, nombre: 'Proyecto' }, { id: 2, nombre: 'Tesis' }]))

  it('carga etapas válidas, ignora null y envía el ID sólo al aplicar', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    reportesService.obtenerCapacidades.mockResolvedValue({ configuracion_valida: false, advertencias: ['Falta una etapa'], etapas: [{ id: 10, codigo: 'A', nombre: 'Etapa A' }, { id: null, codigo: 'B', nombre: 'Etapa B' }] })
    render(<ReportFilters onApply={onApply} />)
    await user.selectOptions(await screen.findByLabelText('Modalidad'), '1')
    await user.selectOptions(await screen.findByLabelText('Etapa actual'), '10')
    expect(screen.queryByText('Etapa B')).not.toBeInTheDocument(); expect(screen.getByText('Falta una etapa')).toBeInTheDocument(); expect(onApply).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ modalidad: '1', etapa_actual: '10' }))
  })

  it('limpia etapa al cambiar modalidad y restaura filtros', async () => {
    const onApply = vi.fn(); const user = userEvent.setup()
    reportesService.obtenerCapacidades.mockResolvedValue({ configuracion_valida: true, etapas: [{ id: 10, nombre: 'Etapa A' }] })
    render(<ReportFilters onApply={onApply} />)
    await user.selectOptions(await screen.findByLabelText('Modalidad'), '1'); await user.selectOptions(await screen.findByLabelText('Etapa actual'), '10'); await user.selectOptions(screen.getByLabelText('Modalidad'), '2')
    await waitFor(() => expect(screen.getByLabelText('Etapa actual')).toHaveValue(''))
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' })); expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ modalidad: '', etapa_actual: '' }))
  })

  it('maneja modalidad sin etapas y error de capacidades', async () => {
    const user = userEvent.setup(); reportesService.obtenerCapacidades.mockResolvedValueOnce({ configuracion_valida: true, etapas: [] }).mockRejectedValueOnce(new Error('falló'))
    render(<ReportFilters onApply={() => {}} />); await user.selectOptions(await screen.findByLabelText('Modalidad'), '1'); expect(await screen.findByText('Sin etapas disponibles')).toBeInTheDocument(); await user.selectOptions(screen.getByLabelText('Modalidad'), '2'); expect(await screen.findByText('No se pudieron cargar las etapas.')).toBeInTheDocument()
  })
})
