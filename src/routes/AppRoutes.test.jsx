import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthContext } from '../context/AuthContext'
import AppRoutes from './AppRoutes'

vi.mock('../layouts/MainLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { MainLayout: () => <Outlet /> }
})
vi.mock('../pages/postulantes/ExpedientePage', () => ({ default: () => <h1>Expediente cargado</h1> }))
vi.mock('../pages/configuracion/ConfiguracionPage', () => ({ default: () => <h1>Configuración cargada</h1> }))

function renderRoute(hasPermission, path = '/postulaciones/7') {
  return render(
    <AuthContext.Provider value={{ loading: false, isAuthenticated: true, hasPermission }}>
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
