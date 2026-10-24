import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext'
import AppRoutes from './AppRoutes'
import { crudService } from '../services/crudService'

vi.mock('../services/crudService', () => ({ crudService: { list: vi.fn() }, endpoints: { postulaciones: '/api/v1/postulaciones/' } }))

vi.mock('../layouts/MainLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { MainLayout: () => <div data-testid="main-layout"><Outlet /></div> }
})
vi.mock('../pages/postulantes/ExpedientePage', () => ({ default: () => <h1>Expediente cargado</h1> }))
vi.mock('../pages/postulantes/PostulantesPage', () => ({ default: () => <h1>Postulantes cargados</h1> }))
vi.mock('../pages/dashboard/DashboardPage', () => ({ default: () => <h1>Dashboard cargado</h1> }))
vi.mock('../pages/reports/ResultadosAcademicosPage', () => ({ default: () => <h1>Resultados académicos cargados</h1> }))
vi.mock('../pages/configuracion/ConfiguracionPage', () => ({ default: () => <h1>Configuración cargada</h1> }))
vi.mock('../pages/modalidades/ModalidadesPage', () => ({ default: () => <h1>Modalidades cargadas</h1> }))
vi.mock('../pages/profile/ProfilePage', () => ({ default: () => <h1>Mi perfil cargado</h1> }))

beforeEach(() => vi.clearAllMocks())

function renderRoute(hasPermission, path = '/postulaciones/7', isAuthenticated = true) {
  return render(
    <AuthContext.Provider value={{ user: { rol: { nombre: 'Administración' } }, loading: false, isAuthenticated, hasPermission }}>
      <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ruta del expediente', () => {
  it('requiere puede_ver_postulaciones', () => {
    renderRoute(() => false)
    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
  })

  it('renderiza el expediente con la capacidad requerida', () => {
    renderRoute((permission) => permission === 'puede_ver_postulaciones')
    expect(screen.getByRole('heading', { name: 'Expediente cargado' })).toBeInTheDocument()
  })
})

describe('resolución de la ruta inicial', () => {
  const studentPermission = (permission) => ['puede_ver_postulaciones', 'puede_ver_documentos', 'puede_ver_seguimiento', 'puede_ver_notificaciones'].includes(permission)

  it('mantiene un estado de carga mientras consulta las postulaciones del estudiante', () => {
    crudService.list.mockReturnValue(new Promise(() => {}))
    renderRoute(studentPermission, '/')
    expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando postulaciones')
    expect(screen.queryByText('Dashboard cargado')).not.toBeInTheDocument()
  })

  it('envía al expediente cuando existe exactamente una postulación', async () => {
    crudService.list.mockResolvedValue({ count: 1, results: [{ id: 42 }] })
    renderRoute(studentPermission, '/')
    expect(await screen.findByRole('heading', { name: 'Expediente cargado' })).toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['varias', { count: 2, results: [{ id: 42 }, { id: 43 }] }],
    ['ninguna', { count: 0, results: [] }],
  ])('envía a postulantes cuando existen %s postulaciones', async (_scenario, response) => {
    crudService.list.mockResolvedValue(response)
    renderRoute(studentPermission, '/')
    expect(await screen.findByRole('heading', { name: 'Postulantes cargados' })).toBeInTheDocument()
  })

  it('muestra un error recuperable y reintenta sin pasar por dashboard', async () => {
    crudService.list.mockRejectedValueOnce({ message: 'No se pudo consultar.' }).mockResolvedValueOnce({ count: 1, results: [{ id: 42 }] })
    renderRoute(studentPermission, '/')
    expect(await screen.findByRole('heading', { name: 'No se pudo abrir la página inicial' })).toBeInTheDocument()
    expect(screen.queryByText('Dashboard cargado')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Expediente cargado' })).toBeInTheDocument()
    expect(crudService.list).toHaveBeenCalledTimes(2)
  })

  it('mantiene dashboard para usuarios con la capacidad correspondiente sin consultar postulaciones', async () => {
    renderRoute((permission) => permission === 'puede_ver_dashboard', '/')
    expect(await screen.findByRole('heading', { name: 'Dashboard cargado' })).toBeInTheDocument()
    await waitFor(() => expect(crudService.list).not.toHaveBeenCalled())
  })
})

describe('ruta de configuración', () => {
  it('responde 403 sin puede_ver_configuracion', () => {
    renderRoute(() => false, '/configuracion')
    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
  })

  it('es visible con la capacidad de configuración', () => {
    renderRoute((permission) => permission === 'puede_ver_configuracion', '/configuracion')
    expect(screen.getByRole('heading', { name: 'Configuración cargada' })).toBeInTheDocument()
  })
})

describe('ruta de modalidades', () => {
  it('permite consulta con puede_ver_modalidades', () => {
    renderRoute((permission) => permission === 'puede_ver_modalidades', '/modalidades')
    expect(screen.getByRole('heading', { name: 'Modalidades cargadas' })).toBeInTheDocument()
  })

  it('responde 403 sin puede_ver_modalidades', () => {
    renderRoute(() => false, '/modalidades')
    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
  })
})

describe('ruta de resultados académicos', () => {
  it('utiliza la misma capacidad protegida de Reportes', () => {
    renderRoute((permission) => permission === 'puede_ver_reportes', '/reportes/resultados')
    expect(screen.getByRole('heading', { name: 'Resultados académicos cargados' })).toBeInTheDocument()
  })

  it('responde 403 sin la capacidad de Reportes', () => {
    renderRoute(() => false, '/reportes/resultados')
    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument()
  })
})

describe('ruta de perfil', () => {
  it('permite acceder a cualquier usuario autenticado sin permiso académico', () => {
    renderRoute(() => false, '/perfil')
    expect(screen.getByRole('heading', { name: 'Mi perfil cargado' })).toBeInTheDocument()
  })

  it('redirige a inicio de sesión cuando no hay sesión', () => {
    renderRoute(() => false, '/perfil', false)
    expect(screen.getByRole('heading', { name: 'Bienvenido', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mi perfil cargado' })).not.toBeInTheDocument()
  })
})
