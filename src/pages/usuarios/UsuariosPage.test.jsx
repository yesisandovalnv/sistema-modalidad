import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UsuariosPage from './UsuariosPage'
import { usuariosService } from '../../services/usuariosService'

vi.mock('../../services/usuariosService', () => ({ usuariosService: { listUsers: vi.fn(), listRoles: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), createRole: vi.fn(), updateRole: vi.fn() } }))

const role = { id: 1, codigo: 'EST', nombre: 'Estudiante', activo: true, usuarios_count: 1 }
const user = { id: 2, username: 'ana', nombre_completo: 'Ana Pérez', ru: 'RU-1', ci: 'CI-1', correo_institucional: 'ana@uab.edu.bo', correo_personal: '', role, is_active: true, is_staff: false, permisos: { puede_ver_dashboard: false } }

beforeEach(() => {
  vi.clearAllMocks()
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [user] })
  usuariosService.listRoles.mockResolvedValue({ count: 1, next: null, previous: null, results: [role] })
})

it('lista, busca, muestra detalle y activa/inactiva usuarios', async () => {
  usuariosService.updateUser.mockResolvedValue({ ...user, is_active: false })
  render(<UsuariosPage />)
  expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'ana' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(usuariosService.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ana' }), expect.any(AbortSignal)))
  fireEvent.click(screen.getByRole('button', { name: 'Detalle' }))
  expect(screen.getByText('Capacidades efectivas (solo lectura)')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
  await waitFor(() => expect(usuariosService.updateUser).toHaveBeenCalledWith(2, { is_active: false }))
})

it('crea usuario usando selector de rol y contraseña inicial', async () => {
  usuariosService.createUser.mockResolvedValue({})
  render(<UsuariosPage />)
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
  expect(screen.getAllByRole('option', { name: 'Estudiante' })).toHaveLength(2)
  expect(screen.getAllByRole('option', { name: 'Estudiante' }).every((option) => option.value === '1')).toBe(true)
  expect(screen.queryByRole('option', { name: 'Estudiante (EST)' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'nuevo' } })
  fireEvent.change(screen.getAllByLabelText('Rol')[1], { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'StrongPass-2026' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  await waitFor(() => expect(usuariosService.createUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'nuevo', role_id: '1', password: 'StrongPass-2026' })))
})

it('administra roles sin convertir capacidades en controles editables', async () => {
  render(<UsuariosPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Roles' }))
  expect(await screen.findByText('Estudiante')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nuevo rol' })).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /puede gestionar/i })).not.toBeInTheDocument()
})
