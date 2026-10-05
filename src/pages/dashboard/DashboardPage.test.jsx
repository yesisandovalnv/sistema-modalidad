import { render, screen, waitFor } from '@testing-library/react'
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
  modalidades: [], etapas: [], estados: [], documentos: {}, defensas: {}, cierre: {},
  notificaciones: { no_leidas: 3 }, tendencia: [],
  advertencias: ['Cierre no evaluado para modalidades sin policy; solo se agregan evidencias persistidas.'],
}

function renderDashboard(user) {
  return render(<AuthContext.Provider value={{ user }}><DashboardPage /></AuthContext.Provider>)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportesService.obtenerDashboard.mockResolvedValue(dashboard)
    reportesService.obtenerModalidades.mockResolvedValue([])
  })

  it('saluda con el primer nombre real del usuario y conserva el contenido del dashboard', async () => {
    renderDashboard({ nombres: 'Agustin Pérez', username: 'admin_agustin', rol: { codigo: 'ADMINISTRADOR' } })

    expect(screen.getByRole('heading', { name: 'Bienvenido, Agustin' })).toBeInTheDocument()
    expect(screen.getByText('Consulta el estado general de los procesos académicos.')).toBeInTheDocument()
    expect(screen.queryByText('Analítica institucional')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard académico')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Total postulaciones')).toBeInTheDocument())
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Advertencias' })).not.toBeInTheDocument()
    expect(screen.queryByText(dashboard.advertencias[0])).not.toBeInTheDocument()
  })

  it('usa el nombre autenticado sin depender del rol', async () => {
    renderDashboard({ nombres: 'María Fernanda', username: 'maria', rol: { codigo: 'ROL_FUTURO' } })

    expect(screen.getByRole('heading', { name: 'Bienvenido, María' })).toBeInTheDocument()
    await screen.findByText('Total postulaciones')
  })

  it('usa username como fallback cuando no existe un nombre real', async () => {
    renderDashboard({ nombres: '   ', nombre_completo: '', nombre: '', username: 'usuario_seguro' })

    expect(screen.getByRole('heading', { name: 'Bienvenido, usuario_seguro' })).toBeInTheDocument()
    await screen.findByText('Total postulaciones')
  })
})
