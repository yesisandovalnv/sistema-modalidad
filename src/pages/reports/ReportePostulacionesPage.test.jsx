import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ReportePostulacionesPage from './ReportePostulacionesPage'
import { reportesService } from '../../services/reportesService'

vi.mock('../../services/reportesService', () => ({ reportesService: { obtenerPostulaciones: vi.fn() } }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => false }) }))
vi.mock('../../components/reports/ReportFilters', () => ({ ReportFilters: () => null }))

describe('ReportePostulacionesPage', () => {
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
})
