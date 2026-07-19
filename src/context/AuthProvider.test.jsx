import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'

vi.mock('../services/authService', () => ({ authService: { me: vi.fn() } }))

function Probe() {
  const auth = useAuth()
  return <div>{auth.loading ? 'cargando' : `${auth.roleCode}|${auth.hasPermission('puede_ver_reportes')}|${auth.user?.rol?.nombre || 'anonimo'}`}</div>
}

describe('AuthProvider', () => {
  it('carga me y expone código y permisos sin interpretar el nombre', async () => {
    localStorage.setItem('auth_access_token', 'token')
    authService.me.mockResolvedValue({ data: { rol: { codigo: 'X', nombre: 'Estudiante Administrador' }, permisos: { puede_ver_reportes: true } } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('X|true|Estudiante Administrador')).toBeInTheDocument())
  })

  it('termina loading y queda anónimo ante 401', async () => {
    localStorage.setItem('auth_access_token', 'token')
    authService.me.mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('|false|anonimo')).toBeInTheDocument())
  })

  it('no consulta me sin token', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('|false|anonimo')).toBeInTheDocument()
    expect(authService.me).not.toHaveBeenCalled()
  })
})
