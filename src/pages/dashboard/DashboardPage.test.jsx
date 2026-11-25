import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import { reportesService } from '../../services/reportesService'
import DashboardPage from './DashboardPage'

vi.mock('../../services/reportesService', () => ({
  reportesService: {
    obtenerDashboard: vi.fn(),
    obtenerModalidades: vi.fn(),
    obtenerCapacidades: vi.fn(),
  },
}))

const dashboard = {
  resumen: { total_postulaciones: 7, en_proceso: 4, concluidas: 2, rechazadas: 1, sin_etapa_actual: 0 },
  modalidades: [
    { codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado', total: 4 },
    { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido', total: 3 },
  ],
  etapas: [],
  estados: [],
  documentos: { total: 12, pendientes: 3, observados: 2, aprobados: 5, rechazados: 1 },
  defensas: {
    finalizadas: 3,
    evaluaciones_consolidadas: 2,
    por_tipo: [
      { tipo_evento: 'DEFENSA_PERFIL', total: 1 },
      { tipo_evento: 'DEFENSA_PRIVADA', total: 2 },
      { tipo_evento: 'DEFENSA_PUBLICA', total: 3 },
    ],
  },
  cierre: { revision_final_aprobada: 2, cierre_documental_aprobado: 1, concluidas: 2, condiciones_pendientes: 3, entregas_pendientes: 1 },
  notificaciones: { no_leidas: 3 },
  tendencia: [{ gestion: 2025, total: 2 }, { gestion: 2026, total: 5 }],
  advertencias: [],
}

function makeDashboard(overrides = {}) {
  return {
    ...dashboard,
    ...overrides,
    resumen: { ...dashboard.resumen, ...overrides.resumen },
    documentos: { ...dashboard.documentos, ...overrides.documentos },
    defensas: { ...dashboard.defensas, ...overrides.defensas },
    cierre: { ...dashboard.cierre, ...overrides.cierre },
  }
}

function renderDashboard(user = { nombres: 'Agustin Pérez', username: 'admin_agustin' }) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <DashboardPage />
    </AuthContext.Provider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard())
    reportesService.obtenerModalidades.mockResolvedValue([
      { id: 1, nombre: 'Proyecto de Grado' },
      { id: 2, nombre: 'Trabajo Dirigido' },
    ])
    reportesService.obtenerCapacidades.mockResolvedValue({ configuracion_valida: true, etapas: [] })
  })

  it('presenta los seis indicadores y sus valores tomados del resumen del servicio', async () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Panel de control' })).toBeInTheDocument()
    expect(screen.getByText('Bienvenido, Agustin. Resumen de los procesos académicos.')).toBeInTheDocument()
    const metrics = await screen.findByTestId('dashboard-metrics')
    expect(metrics).toHaveClass('sm:grid-cols-2', 'xl:grid-cols-3', '2xl:grid-cols-6')
    for (const [label, value] of [
      ['Documentos registrados', '12'],
      ['Documentos aprobados', '5'],
      ['Defensas finalizadas', '3'],
      ['Evaluaciones consolidadas', '2'],
      ['Cierres académicos concluidos', '2'],
      ['Condiciones pendientes', '3'],
    ]) {
      const card = within(metrics).getByText(label).parentElement
      expect(card).toHaveTextContent(value)
    }
  })

  it('muestra la dona original de postulaciones por modalidad con conteos y porcentajes', async () => {
    renderDashboard()
    const chart = await screen.findByRole('img', { name: 'Distribuci\u00f3n de postulaciones por modalidad; total 7' })
    expect(chart).toBeInTheDocument()
    const charts = screen.getByTestId('dashboard-charts')
    expect(within(charts).getByRole('heading', { name: 'Postulaciones por modalidad' })).toBeInTheDocument()
    expect(within(charts).getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(within(charts).getByText('Trabajo Dirigido')).toBeInTheDocument()
    expect(within(charts).getByText('4')).toBeInTheDocument()
    expect(within(charts).getByText('57,1%')).toBeInTheDocument()
  })


  it('compara los tipos de defensa y presenta aprobaciones y condiciones del cierre', async () => {
    renderDashboard()
    const charts = await screen.findByTestId('dashboard-charts')
    for (const label of ['Defensa de perfil', 'Defensa privada', 'Defensa pública']) {
      expect(within(charts).getByText(label)).toBeInTheDocument()
    }
    expect(within(charts).getByRole('img', { name: 'Defensa pública: 3' })).toBeInTheDocument()
    for (const label of ['Revisión final aprobada', 'Cierre documental aprobado', 'Cierres concluidos', 'Condiciones pendientes']) {
      expect(within(charts).getByText(label)).toBeInTheDocument()
    }
    expect(within(charts).getByText(/Entregas pendientes:/)).toHaveTextContent('1')
  })

  it('solo muestra tendencia cuando existen al menos dos gestiones reales', async () => {
    renderDashboard()
    const trend = await screen.findByTestId('dashboard-trend')
    expect(within(trend).getByText('Gestión 2025')).toBeInTheDocument()
    expect(within(trend).getByRole('img', { name: 'Gestión 2026: 5' })).toBeInTheDocument()
  })

  it('muestra ceros y un estado vacío claro cuando el servicio no devuelve registros', async () => {
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard({
      resumen: { total_postulaciones: 0 },
      modalidades: [],
      tendencia: [],
      documentos: { total: 0, pendientes: 0, observados: 0, aprobados: 0, rechazados: 0 },
      defensas: { finalizadas: 0, evaluaciones_consolidadas: 0, por_tipo: [] },
      cierre: { revision_final_aprobada: 0, cierre_documental_aprobado: 0, concluidas: 0, condiciones_pendientes: 0, entregas_pendientes: 0 },
    }))

    renderDashboard()
    expect(await screen.findByText('No hay postulaciones para los filtros aplicados.')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-metrics')).toHaveTextContent('0')
    expect(screen.getByText(/Sin datos disponibles para esta distribuci/)).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /: 0$/ })).toHaveLength(7)
    expect(screen.queryByTestId('dashboard-trend')).not.toBeInTheDocument()
  })

  it('aplica el filtro de modalidad y actualiza la dona con la distribuci\u00f3n devuelta', async () => {
    reportesService.obtenerDashboard
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeDashboard({
        resumen: { total_postulaciones: 3 },
        modalidades: [{ codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido', total: 3 }],
      }))
    renderDashboard()
    await screen.findByRole('img', { name: 'Distribuci\u00f3n de postulaciones por modalidad; total 7' })

    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: '2' } })
    fireEvent.change(screen.getByPlaceholderText('2026'), { target: { value: '2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(reportesService.obtenerDashboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ modalidad: '2', gestion: '2026' }),
      expect.any(AbortSignal),
    ))
    expect(await screen.findByRole('img', { name: 'Distribuci\u00f3n de postulaciones por modalidad; total 3' })).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-charts')).toHaveTextContent('Trabajo Dirigido')
    expect(screen.getByTestId('dashboard-charts')).not.toHaveTextContent('Proyecto de Grado')
  })


  it('mantiene carga, error recuperable y reintento', async () => {
    let resolveDashboard
    reportesService.obtenerDashboard.mockReturnValueOnce(new Promise((resolve) => { resolveDashboard = resolve }))
    const { unmount } = renderDashboard()
    expect(screen.getByRole('status', { name: 'Cargando dashboard' })).toBeInTheDocument()
    resolveDashboard(makeDashboard())
    expect(await screen.findByTestId('dashboard-metrics')).toBeInTheDocument()
    unmount()

    const user = userEvent.setup()
    reportesService.obtenerDashboard
      .mockRejectedValueOnce({ status: 500, message: 'Falla temporal del servicio.' })
      .mockResolvedValueOnce(makeDashboard())
    renderDashboard()
    expect(await screen.findByRole('alert')).toHaveTextContent('Falla temporal del servicio.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByTestId('dashboard-metrics')).toBeInTheDocument()
  })

  it('mantiene el mensaje de acceso no autorizado', async () => {
    reportesService.obtenerDashboard.mockRejectedValue({ status: 403, message: 'Forbidden' })
    renderDashboard()
    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso no autorizado al dashboard institucional.')
    expect(screen.queryByTestId('dashboard-metrics')).not.toBeInTheDocument()
  })
})
