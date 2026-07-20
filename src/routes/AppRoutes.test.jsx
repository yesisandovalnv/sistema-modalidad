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

function renderRoute(hasPermission) {
  return render(
    <AuthContext.Provider value={{ loading: false, isAuthenticated: true, hasPermission }}>
      <MemoryRouter initialEntries={['/postulaciones/7']}><AppRoutes /></MemoryRouter>
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
