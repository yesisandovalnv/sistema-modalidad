import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import ReportePostulacionesPage from './ReportePostulacionesPage'
import { reportesService } from '../../services/reportesService'

const authState = vi.hoisted(() => ({ canExport: false }))
vi.mock('../../services/reportesService', () => ({ reportesService: { obtenerPostulaciones: vi.fn(), exportarPostulacionesCSV: vi.fn(), exportarPostulacionesXLSX: vi.fn() } }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => authState.canExport }) }))
vi.mock('../../components/reports/ReportFilters', () => ({ ReportFilters: () => null }))

describe('ReportePostulacionesPage', () => {
  beforeEach(() => { authState.canExport = false; vi.clearAllMocks() })
  it('muestra etiquetas legibles para los códigos de etapa y estado recibidos de la API', async () => {
    reportesService.obtenerPostulaciones.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        postulacion_id: 1,
        postulante_nombre: 'Ana Pérez',
        modalidad: { nombre: 'Proyecto de grado' },
        gestion: 2026,
        semestre: 'I',
        tutor_activo: null,
        etapa_actual: 'DEFENSA_PUBLICA',
        estado_general: 'EN_PROCESO',
        porcentaje_etapas_aprobadas: 50,
        documentos_pendientes: 0,
        proxima_defensa: null,
        concluida: false,
        cierre_documental_aprobado: false,
        cierre_aplicable: true,
        revision_final_aprobada: false,
        fecha_actualizacion: '2026-08-20T12:00:00Z',
      }],
    })

    render(<ReportePostulacionesPage />)

    expect(await screen.findByText('Defensa Pública')).toBeInTheDocument()
    expect(screen.getByText('En proceso')).toBeInTheDocument()
    expect(screen.queryByText('DEFENSA_PUBLICA')).not.toBeInTheDocument()
    expect(screen.queryByText('EN_PROCESO')).not.toBeInTheDocument()
  })

  it('muestra que el cierre de Proyecto no aplica a Tesis', async () => {
    reportesService.obtenerPostulaciones.mockResolvedValue({ count: 1, next: null, previous: null, results: [{
      postulacion_id: 2, postulante_nombre: 'Tesis', modalidad: { nombre: 'Tesis de grado' }, gestion: 2026, semestre: 'I', tutor_activo: null,
      etapa_actual: 'DEFENSA_PUBLICA', estado_general: 'EN_PROCESO', porcentaje_etapas_aprobadas: 75, documentos_pendientes: 0,
      proxima_defensa: null, concluida: false, cierre_documental_aprobado: false, revision_final_aprobada: false, cierre_aplicable: false,
      fecha_actualizacion: '2026-08-20T12:00:00Z',
    }] })
    render(<ReportePostulacionesPage />)
    expect(await screen.findByText('No aplica')).toBeInTheDocument()
  })

  it('muestra el tipo de registro del backend y traduce histórica como No aplica', async () => {
    reportesService.obtenerPostulaciones.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { postulacion_id: 1, postulante_nombre: 'Ana Pérez', modalidad: { nombre: 'Proyecto de grado' }, gestion: 2026, semestre: 'I', tutor_activo: 'tutor1', tipo_registro: 'SEGUIMIENTO', etapa_actual: 'DEFENSA_PUBLICA', estado_general: 'EN_PROCESO', porcentaje_etapas_aprobadas: 50, documentos_pendientes: 0, proxima_defensa: null, concluida: false, cierre_documental_aprobado: false, revision_final_aprobada: false, cierre_aplicable: true, fecha_actualizacion: '2026-08-20T12:00:00Z' },
        { postulacion_id: 2, postulante_nombre: 'Luis', modalidad: { nombre: 'Proyecto de grado' }, gestion: 2026, semestre: 'I', tutor_activo: 'tutor2', tipo_registro: 'HISTORICO', etapa_actual: null, estado_general: 'CONCLUIDA', porcentaje_etapas_aprobadas: null, documentos_pendientes: 0, proxima_defensa: null, concluida: true, cierre_documental_aprobado: false, revision_final_aprobada: false, cierre_aplicable: true, fecha_actualizacion: '2026-08-21T12:00:00Z' },
      ],
    })

    render(<ReportePostulacionesPage />)

    const seguimientoRow = (await screen.findByText('Ana Pérez')).closest('tr')
    expect(within(seguimientoRow).getByText('Seguimiento')).toBeInTheDocument()
    expect(within(seguimientoRow).getByText('Defensa Pública')).toBeInTheDocument()
    expect(within(seguimientoRow).getByText('50.00%')).toBeInTheDocument()

    const historicoRow = screen.getByText('Luis').closest('tr')
    expect(within(historicoRow).getByText('Histórico')).toBeInTheDocument()
    expect(within(historicoRow).getAllByText('No aplica')).toHaveLength(2)
    expect(within(historicoRow).getAllByText('No aplica')[0]).toBeInTheDocument()
  })

  it('muestra Exportar Excel y descarga el archivo XLSX', async () => {
    authState.canExport = true
    reportesService.obtenerPostulaciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    reportesService.exportarPostulacionesXLSX.mockResolvedValue({ blob: new Blob(['xlsx']), filename: 'reporte_postulaciones.xlsx' })
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:xlsx'), revokeObjectURL: vi.fn() })
    render(<ReportePostulacionesPage />)
    expect(await screen.findByRole('button', { name: 'Exportar Excel' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }))
    await waitFor(() => expect(reportesService.exportarPostulacionesXLSX).toHaveBeenCalledWith({}))
  })
})
