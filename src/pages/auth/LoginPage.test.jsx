import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import LoginPage from './LoginPage'
import { AuthLayout } from '../../layouts/AuthLayout'
import { authService } from '../../services/authService'

vi.mock('../../services/authService', () => ({ authService: { login: vi.fn(), studentLogin: vi.fn() } }))

async function submit() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
  await userEvent.click(screen.getByRole('tab', { name: 'Personal administrativo' }))
  await userEvent.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'ana')
  await userEvent.type(screen.getByPlaceholderText('********'), 'secreto')
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('LoginPage', () => {
  it('presenta el acceso dentro del layout institucional con la imagen estática del campus', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: 'Estudiantes recorriendo el campus universitario.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Estudiantes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Estudiantes')
    expect(screen.queryByText(/video del campus/i)).not.toBeInTheDocument()
  })

  it('delega la resolución del destino en la ruta inicial centralizada', async () => {
    authService.login.mockResolvedValue({ data: { access: 'access', refresh: 'refresh' } })
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/" element={<p>Resolver inicial</p>} /></Routes></MemoryRouter>)
    await userEvent.click(screen.getByRole('tab', { name: 'Personal administrativo' }))
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

  it('normaliza y envía las credenciales por el acceso estudiantil separado', async () => {
    authService.studentLogin.mockResolvedValue({ data: { access: 'access', refresh: 'refresh' } })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText('Ingresa tu R.U.'), ' ru1001 ')
    await userEvent.type(screen.getByPlaceholderText('Ingresa tu C.I.'), ' 00123456 ')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(authService.studentLogin).toHaveBeenCalledWith({ ru: 'RU1001', ci: '00123456' })
  })

  it('usa un mensaje genérico para todo rechazo estudiantil', async () => {
    authService.studentLogin.mockRejectedValue({ response: { status: 401, data: { detail: 'interno' } } })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText('Ingresa tu R.U.'), 'RU1001')
    await userEvent.type(screen.getByPlaceholderText('Ingresa tu C.I.'), 'incorrecto')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible iniciar sesión con los datos proporcionados.')
  })
})
