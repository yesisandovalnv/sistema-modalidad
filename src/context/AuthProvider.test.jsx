import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'

vi.mock('../services/authService', () => ({ authService: { me: vi.fn(), logout: vi.fn() } }))

function Probe() {
  const auth = useAuth()
  return <><div>{auth.loading ? 'cargando' : `${auth.roleCode}|${auth.hasPermission('puede_ver_reportes')}|${auth.user?.rol?.nombre || 'anonimo'}`}</div><button onClick={auth.logout}>salir</button></>
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

  it('conserva el usuario cargado si una recarga de me falla temporalmente', async () => {
    localStorage.setItem('auth_access_token', 'token')
    authService.me.mockResolvedValueOnce({ data: { rol: { codigo: 'ADMIN', nombre: 'Administración' }, permisos: {} } })
      .mockRejectedValueOnce({ response: { status: 500 } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await screen.findByText('ADMIN|false|Administración')
    window.dispatchEvent(new Event('auth-authenticated'))
    await waitFor(() => expect(authService.me).toHaveBeenCalledTimes(2))
    expect(screen.getByText('ADMIN|false|Administración')).toBeInTheDocument()
  })

  it('no consulta me sin token', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('|false|anonimo')).toBeInTheDocument()
    expect(authService.me).not.toHaveBeenCalled()
  })

  it('recarga el usuario después del evento de login', async () => {
    authService.me.mockResolvedValue({ data: { rol: { codigo: 'ADMIN', nombre: 'Administración' }, permisos: {} } })
    render(<AuthProvider><Probe /></AuthProvider>)
    localStorage.setItem('auth_access_token', 'nuevo')
    window.dispatchEvent(new Event('auth-authenticated'))
    await waitFor(() => expect(screen.getByText('ADMIN|false|Administración')).toBeInTheDocument())
  })

  it('logout remoto limpia tokens y usuario', async () => {
    localStorage.setItem('auth_access_token', 'token'); localStorage.setItem('auth_refresh_token', 'refresh')
    authService.me.mockResolvedValue({ data: { rol: { codigo: 'ADMIN', nombre: 'Administración' }, permisos: {} } }); authService.logout.mockResolvedValue({})
    render(<AuthProvider><Probe /></AuthProvider>); await screen.findByText('ADMIN|false|Administración')
    await userEvent.click(screen.getByRole('button', { name: 'salir' }))
    await waitFor(() => expect(screen.getByText('|false|anonimo')).toBeInTheDocument())
    expect(localStorage.getItem('auth_access_token')).toBeNull()
  })
})
