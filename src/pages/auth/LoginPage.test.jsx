import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
