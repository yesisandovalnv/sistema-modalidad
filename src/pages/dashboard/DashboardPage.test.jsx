import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { reportesService } from '../../services/reportesService'
import { dashboardService } from '../../services/dashboardService'
import DashboardPage from './DashboardPage'

vi.mock('../../services/dashboardService', () => ({
  dashboardService: {
    proximasDefensas: vi.fn(),
    postulacionesRecientes: vi.fn(),
    pendientes: vi.fn(),
  },
}))

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

function renderDashboard(user = { nombres: 'Agustin Pérez', username: 'admin_agustin' }, permissions = []) {
  return render(
    <AuthContext.Provider value={{ user, hasPermission: (name) => permissions.includes(name) }}>
      <MemoryRouter><DashboardPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportesService.obtenerDashboard.mockResolvedValue(makeDashboard())
    dashboardService.proximasDefensas.mockResolvedValue({ items: [{ id: 1, postulacion: 45, postulacion_codigo: 'PG-2026-011', tipo_display: 'Defensa pública', lugar: 'Salón Bicentenario', fecha_programada: '2099-09-18T09:00:00-04:00' }], total: 1 })
    dashboardService.postulacionesRecientes.mockResolvedValue({ items: [{ id: 48, codigo: 'PG-2026-015', estudiante_detalle: { nombre_completo: 'Camila Melgar Escalante' }, modalidad_detalle: { nombre: 'Proyecto de Grado' }, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } }], total: 1 })
    dashboardService.pendientes.mockResolvedValue({ documentos: 4, condiciones: 6, entregas: null })
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

    expect(screen.getByRole('heading', { name: 'Bienvenido, Agustin', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filtrar/ })).toBeInTheDocument()

    const metrics = await screen.findByTestId('dashboard-metrics')
    expect(metrics).toHaveClass('grid-cols-2', 'xl:grid-cols-4')
    for (const label of ['En proceso', 'Concluidas', 'Rechazadas', 'Sin etapa actual']) {
      expect(within(metrics).getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('Total postulaciones').closest('.metric-featured')).toHaveTextContent('7')
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
    expect(screen.getAllByText('Defensa pública')).toHaveLength(2)
    expect(screen.getByText('Por tipo')).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Tendencia por gestión', hidden: true }).parentElement).toHaveTextContent(
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
    expect(screen.getByText('Inscripción')).toBeInTheDocument()
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
    expect(await screen.findByTestId('dashboard-metrics')).toHaveClass('xl:grid-cols-4')
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
    expect(metrics).toHaveClass('grid-cols-2', 'xl:grid-cols-4')
    expect(within(screen.getByTestId('dashboard-distributions')).getByRole('tablist', { name: 'Ver la distribución por' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Distribución de postulaciones por modalidad/ })).toBeInTheDocument()
    document.documentElement.classList.remove('dark')
  })

  it('ofrece la siguiente acción solo con permiso', async () => {
    renderDashboard(undefined, ['puede_ver_notificaciones', 'puede_ver_documentos'])
    await screen.findByTestId('dashboard-metrics')
    expect(screen.getByRole('link', { name: 'Ver documentos' })).toHaveAttribute('href', '/documentos')
  })

  it('sin permisos no muestra enlaces de acción', async () => {
    renderDashboard()
    await screen.findByTestId('dashboard-metrics')
    expect(screen.queryByRole('link', { name: 'Ver documentos' })).not.toBeInTheDocument()
  })

  it('agrupa distribuciones e indicadores en pestañas para ocupar menos espacio', async () => {
    renderDashboard()
    const distribution = await screen.findByTestId('dashboard-distributions')
    const tabs = within(distribution).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Modalidad', 'Etapa', 'Estado', 'Gestión'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(tabs[1])
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(within(distribution).getByRole('tabpanel')).toHaveTextContent('Defensa pública')
    expect(screen.getByRole('tablist', { name: 'Indicadores operativos' })).toBeInTheDocument()
  })

  it('el total va a la derecha de la bienvenida y el filtro se aplica al instante', async () => {
    reportesService.obtenerDashboard
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeDashboard({ resumen: { total_postulaciones: 2 }, modalidades: [{ codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado', total: 2 }] }))
    renderDashboard()
    await screen.findByRole('img', { name: /total 7$/ })
    const header = screen.getByRole('heading', { name: 'Bienvenido, Agustin' }).closest('.dashboard-header')
    expect(header.nextElementSibling).toHaveClass('metric-featured')
    await waitFor(() => expect(reportesService.obtenerModalidades).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /Filtrar/ }))
    const panel = await screen.findByRole('group', { name: 'Filtros' })
    fireEvent.click(await within(within(panel).getByRole('group', { name: 'Modalidad' })).findByRole('button', { name: 'Tesis de Grado' }))
    expect(screen.queryByRole('status', { name: 'Cargando dashboard' })).not.toBeInTheDocument()
    await screen.findByRole('img', { name: /total 2$/ })
    expect(reportesService.obtenerDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ modalidad: '2' }), expect.any(AbortSignal))
  })

  it('usa el primer nombre disponible y el username como respaldo', async () => {
    const { unmount } = renderDashboard({ nombres: 'María Fernanda', username: 'maria' })
    expect(screen.getByRole('heading', { name: 'Bienvenido, María' })).toBeInTheDocument()
    await screen.findByTestId('dashboard-metrics')
    unmount()
    renderDashboard({ nombres: '   ', nombre_completo: '', nombre: '', username: 'usuario_seguro' })
    expect(screen.getByRole('heading', { name: 'Bienvenido, usuario_seguro' })).toBeInTheDocument()
    await screen.findByTestId('dashboard-metrics')
  })

  it('los indicadores se muestran como mosaicos y la colección como tabla', async () => {
    renderDashboard()
    await screen.findByTestId('dashboard-metrics')
    const defensas = screen.getByRole('tab', { name: 'Defensas' })
    fireEvent.click(defensas)
    const panel = screen.getAllByRole('tabpanel').find((item) => !item.hidden && item.textContent.includes('Programadas'))
    expect(panel.querySelectorAll('.indicator-tile').length).toBeGreaterThan(3)
    expect(within(panel).getByRole('table')).toHaveTextContent('Defensa pública')
  })

  it('muestra próximas defensas, postulaciones recientes y pendientes con enlaces según permiso', async () => {
    renderDashboard(undefined, ['puede_ver_postulaciones', 'puede_ver_documentos'])
    const defensas = await screen.findByTestId('widget-defensas')
    expect(await within(defensas).findByRole('link', { name: /PG-2026-011/ })).toHaveAttribute('href', '/postulaciones/45')
    const recientes = screen.getByTestId('widget-recientes')
    expect(await within(recientes).findByRole('link', { name: /Camila Melgar Escalante/ })).toHaveAttribute('href', '/postulaciones/48')
    expect(within(recientes).getByText('Concluida')).toHaveClass('semantic-status--success')
    const pendientes = screen.getByTestId('widget-pendientes')
    expect(await within(pendientes).findByRole('link', { name: /Documentos por revisar/ })).toHaveTextContent('4')
    expect(within(pendientes).getByRole('link', { name: /Entregas físicas pendientes/ })).toHaveTextContent('—')
  })

  it('las tarjetas de actividad muestran su estado vacío o de error sin romper el resto', async () => {
    dashboardService.proximasDefensas.mockResolvedValue({ items: [], total: 0 })
    dashboardService.postulacionesRecientes.mockRejectedValue(new Error('403'))
    renderDashboard()
    expect(await within(await screen.findByTestId('widget-defensas')).findByText('No hay defensas programadas.')).toBeInTheDocument()
    expect(await within(screen.getByTestId('widget-recientes')).findByRole('alert')).toHaveTextContent('No se pudo cargar.')
    expect(screen.getByTestId('dashboard-metrics')).toBeInTheDocument()
  })
})
