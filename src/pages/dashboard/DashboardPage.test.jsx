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
  filtros_aplicados: {},
  resumen: {
    total_postulaciones: 7,
    en_proceso: 4,
    concluidas: 2,
    rechazadas: 1,
    sin_etapa_actual: 0,
  },
  modalidades: [
    { codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado', total: 4 },
    { codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado', total: 3 },
  ],
  etapas: [
    { codigo: 'INSCRIPCION', total: 2 },
    { codigo: 'DEFENSA_PUBLICA', total: 2 },
  ],
  estados: [
    { codigo: 'EN_PROCESO', nombre: 'En proceso', total: 4 },
    { codigo: 'CONCLUIDA', nombre: 'Concluida', total: 2 },
    { codigo: 'RECHAZADA', nombre: 'Rechazada', total: 1 },
  ],
  documentos: {
    total: 12,
    pendientes: 3,
    observados: 2,
    aprobados: 5,
    rechazados: 1,
    sin_version_vigente: 1,
    postulaciones_con_correcciones: 2,
  },
  defensas: {
    programadas: 2,
    en_curso: 1,
    finalizadas: 3,
    suspendidas: 0,
    canceladas: 0,
    proximas: 1,
    evaluaciones_consolidadas: 2,
    por_tipo: [{ tipo_evento: 'DEFENSA_PUBLICA', total: 3 }],
  },
  cierre: {
    revision_final_aprobada: 2,
    cierre_documental_aprobado: 1,
    concluidas: 2,
    condiciones_pendientes: 3,
    entregas_pendientes: 1,
  },
  notificaciones: { no_leidas: 3 },
  tendencia: [{ gestion: 2025, total: 2 }, { gestion: 2026, total: 5 }],
  advertencias: ['Cierre no evaluado para modalidades sin policy; solo se agregan evidencias persistidas.'],
}

function makeDashboard(overrides = {}) {
  return {
    ...dashboard,
    ...overrides,
    resumen: { ...dashboard.resumen, ...overrides.resumen },
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
    vi.clearAllMocks()
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard())
    reportesService.obtenerModalidades.mockResolvedValue([
      { id: 1, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
      { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
    ])
    reportesService.obtenerCapacidades.mockResolvedValue({
      configuracion_valida: true,
      etapas: [{ id: 11, codigo: 'INSCRIPCION', nombre: 'Inscripción' }],
    })
  })

  it('conserva los cinco indicadores y presenta distribuciones accesibles', async () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Bienvenido, Agustin' })).toBeInTheDocument()
    expect(screen.getByText('Consulta el estado general de los procesos académicos.')).toBeInTheDocument()

    const metrics = await screen.findByTestId('dashboard-metrics')
    expect(metrics).toHaveClass('sm:grid-cols-2', 'xl:grid-cols-5')
    for (const label of ['Total postulaciones', 'En proceso', 'Concluidas', 'Rechazadas', 'Sin etapa actual']) {
      expect(within(metrics).getByText(label)).toBeInTheDocument()
    }
    expect(within(metrics).getByText('7')).toBeInTheDocument()
    expect(within(metrics).getByText('4')).toBeInTheDocument()
    expect(within(metrics).getByText('2')).toBeInTheDocument()
    expect(within(metrics).getByText('1')).toBeInTheDocument()
    expect(within(metrics).getByText('0')).toBeInTheDocument()

    expect(screen.getByRole('img', {
      name: 'Distribución de postulaciones por modalidad; total 7',
    })).toBeInTheDocument()
    const distribution = screen.getByTestId('dashboard-distributions')
    expect(within(distribution).getByText('Proyecto de Grado').closest('li')).toHaveTextContent('4')
    expect(within(distribution).getByText('Proyecto de Grado').closest('li')).toHaveTextContent('57,1%')
    expect(within(distribution).getByText('Tesis de Grado').closest('li')).toHaveTextContent('42,9%')
    expect(screen.getAllByText('Defensa Publica')).toHaveLength(2)
    expect(screen.getByText('Por Tipo')).toBeInTheDocument()
    expect(screen.getByText('Notificaciones personales')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Advertencias' })).not.toBeInTheDocument()
    expect(screen.queryByText(dashboard.advertencias[0])).not.toBeInTheDocument()
  })

  it('presenta una modalidad única como el cien por ciento del total', async () => {
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard({
      resumen: { total_postulaciones: 3 },
      modalidades: [{ codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado', total: 3 }],
    }))

    renderDashboard()

    expect(await screen.findByRole('img', {
      name: 'Distribución de postulaciones por modalidad; total 3',
    })).toBeInTheDocument()
    expect(screen.getByText('Examen de Grado').closest('li')).toHaveTextContent('100%')
  })

  it('usa barras horizontales con porcentajes si hay demasiadas modalidades para la dona', async () => {
    const modalidades = Array.from({ length: 7 }, (_, index) => ({
      codigo: `MODALIDAD_${index}`,
      nombre: `Modalidad ${index}`,
      total: index + 1,
    }))
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard({
      resumen: { total_postulaciones: 28 },
      modalidades,
    }))

    renderDashboard()

    expect(await screen.findByText('Modalidad 0')).toBeInTheDocument()
    expect(screen.getByText('Modalidad 6')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Distribución de postulaciones por modalidad/ })).not.toBeInTheDocument()
    expect(screen.getByText('Modalidad 6').closest('li')).toHaveTextContent('7')
    expect(screen.getByText('Modalidad 6').closest('li')).toHaveTextContent('25%')
  })

  it('muestra el estado vacío con conteos en cero y distribuciones sin categorías', async () => {
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard({
      resumen: {
        total_postulaciones: 0,
        en_proceso: 0,
        concluidas: 0,
        rechazadas: 0,
        sin_etapa_actual: 0,
      },
      modalidades: [],
      etapas: [],
      estados: [],
      tendencia: [],
    }))

    renderDashboard()

    expect(await screen.findByText('No hay postulaciones para los filtros aplicados.')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-metrics')).toHaveTextContent('0')
    expect(screen.getAllByText('Sin datos disponibles para esta distribución.')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'Tendencia por gestión' }).parentElement).toHaveTextContent(
      'Sin datos disponibles para esta distribución.',
    )
  })

  it('maneja categorías con valor cero sin dibujar segmentos falsos ni porcentajes indefinidos', async () => {
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard({
      resumen: { total_postulaciones: 0 },
      modalidades: [{ codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado', total: 0 }],
      etapas: [{ codigo: 'INSCRIPCION', total: 0 }],
      estados: [{ codigo: 'REGISTRADA', nombre: 'Registrada', total: 0 }],
      tendencia: [{ gestion: 2026, total: 0 }],
    }))

    renderDashboard()

    expect(await screen.findByRole('img', {
      name: 'Distribución de postulaciones por modalidad; total 0',
    })).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-distributions')).getByText('Proyecto de Grado').closest('li'))
      .toHaveTextContent('—')
    expect(screen.getByText('Inscripcion')).toBeInTheDocument()
  })

  it('actualiza las visualizaciones al aplicar y limpiar los filtros existentes', async () => {
    reportesService.obtenerDashboard
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeDashboard({
        resumen: { total_postulaciones: 2 },
        modalidades: [{ codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado', total: 2 }],
      }))
      .mockResolvedValueOnce(makeDashboard())

    renderDashboard()
    await screen.findByRole('img', { name: /total 7$/ })

    fireEvent.change(await screen.findByLabelText('Modalidad'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await screen.findByRole('img', { name: /total 2$/ })
    await waitFor(() => {
      expect(reportesService.obtenerDashboard).toHaveBeenLastCalledWith(
        expect.objectContaining({ modalidad: '2' }),
        expect.any(AbortSignal),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByRole('img', { name: /total 7$/ })
    await waitFor(() => {
      expect(reportesService.obtenerDashboard).toHaveBeenLastCalledWith(
        expect.objectContaining({ modalidad: '', etapa_actual: '' }),
        expect.any(AbortSignal),
      )
    })
  })

  it('mantiene el estado de carga y muestra un esqueleto adaptable', async () => {
    let resolveDashboard
    reportesService.obtenerDashboard.mockReturnValue(new Promise((resolve) => {
      resolveDashboard = resolve
    }))

    renderDashboard()

    expect(screen.getByRole('status', { name: 'Cargando dashboard' })).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-metrics')).not.toBeInTheDocument()
    resolveDashboard(makeDashboard())
    expect(await screen.findByTestId('dashboard-metrics')).toHaveClass('xl:grid-cols-5')
  })

  it('muestra errores recuperables y permite reintentar la consulta', async () => {
    const user = userEvent.setup()
    reportesService.obtenerDashboard
      .mockRejectedValueOnce({ status: 500, message: 'Falla temporal del servicio.' })
      .mockResolvedValueOnce(makeDashboard())

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Falla temporal del servicio.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByTestId('dashboard-metrics')).toBeInTheDocument()
    expect(reportesService.obtenerDashboard).toHaveBeenCalledTimes(2)
  })

  it('conserva el mensaje específico de acceso no autorizado', async () => {
    reportesService.obtenerDashboard.mockRejectedValue({ status: 403, message: 'Forbidden' })

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Acceso no autorizado al dashboard institucional.',
    )
    expect(screen.queryByTestId('dashboard-metrics')).not.toBeInTheDocument()
  })

  it('conserva colores de tema y distribución adaptable con tema oscuro activo', async () => {
    document.documentElement.classList.add('dark')
    renderDashboard()

    const metrics = await screen.findByTestId('dashboard-metrics')
    expect(document.documentElement).toHaveClass('dark')
    expect(metrics).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'xl:grid-cols-5')
    expect(screen.getByTestId('dashboard-distributions')).toHaveClass(
      'lg:grid-cols-2',
      'xl:grid-cols-3',
    )
    expect(screen.getByRole('img', { name: /Distribución de postulaciones por modalidad/ })).toBeInTheDocument()
    document.documentElement.classList.remove('dark')
  })

  it('usa el nombre autenticado sin depender del rol y aplica el fallback al username', async () => {
    const { unmount } = renderDashboard({
      nombres: 'María Fernanda',
      username: 'maria',
      rol: { codigo: 'ROL_FUTURO' },
    })

    expect(screen.getByRole('heading', { name: 'Bienvenido, María' })).toBeInTheDocument()
    await screen.findByTestId('dashboard-metrics')
    unmount()

    renderDashboard({ nombres: '   ', nombre_completo: '', nombre: '', username: 'usuario_seguro' })
    expect(screen.getByRole('heading', { name: 'Bienvenido, usuario_seguro' })).toBeInTheDocument()
    await screen.findByTestId('dashboard-metrics')
  })
})
