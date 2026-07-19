import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { ProtectedRoute } from './AppRoutes'

function renderRoute(auth) {
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/privado']}><Routes><Route path="/login" element={<p>Login</p>} /><Route path="/privado" element={<ProtectedRoute requiredPermission="puede_ver_reportes"><p>Privado</p></ProtectedRoute>} /></Routes></MemoryRouter></AuthContext.Provider>)
}

describe('ProtectedRoute', () => {
  it('espera durante la carga', () => { renderRoute({ loading: true }); expect(screen.getByText(/Cargando sesión/)).toBeInTheDocument() })
  it('redirige cuando no existe sesión', () => { renderRoute({ loading: false, isAuthenticated: false }); expect(screen.getByText('Login')).toBeInTheDocument() })
  it('muestra 403 sin capacidad', () => { renderRoute({ loading: false, isAuthenticated: true, hasPermission: () => false }); expect(screen.getByText(/Acceso no autorizado/i)).toBeInTheDocument() })
  it('permite con capacidad', () => { renderRoute({ loading: false, isAuthenticated: true, hasPermission: () => true }); expect(screen.getByText('Privado')).toBeInTheDocument() })
})
