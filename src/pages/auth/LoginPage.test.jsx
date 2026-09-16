import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import LoginPage from './LoginPage'
import { authService } from '../../services/authService'

vi.mock('../../services/authService', () => ({ authService: { login: vi.fn() } }))

async function submit() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
  await userEvent.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'ana')
  await userEvent.type(screen.getByPlaceholderText('********'), 'secreto')
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('LoginPage', () => {
  it('delega la resolución del destino en la ruta inicial centralizada', async () => {
    authService.login.mockResolvedValue({ data: { access: 'access', refresh: 'refresh' } })
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/" element={<p>Resolver inicial</p>} /></Routes></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'ana')
    await userEvent.type(screen.getByPlaceholderText('********'), 'secreto')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Resolver inicial')).toBeInTheDocument()
  })

  it('distingue un fallo de conexión de credenciales inválidas', async () => {
    authService.login.mockRejectedValue(new Error('Network Error'))
    await submit()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })

  it('muestra credenciales incorrectas únicamente ante respuesta 400/401', async () => {
    authService.login.mockRejectedValue({ response: { status: 401 } })
    await submit()
    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
  })

  it('informa acceso denegado ante 403', async () => {
    authService.login.mockRejectedValue({ response: { status: 403 } })
    await submit()
    expect(await screen.findByText('No tienes permiso para acceder.')).toBeInTheDocument()
  })
})
