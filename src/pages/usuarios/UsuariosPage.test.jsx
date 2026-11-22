import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UsuariosPage from './UsuariosPage'
import { usuariosService } from '../../services/usuariosService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../services/usuariosService', () => ({ usuariosService: { listUsers: vi.fn(), listRoles: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), createRole: vi.fn(), updateRole: vi.fn(), downloadStudentTemplate: vi.fn(), validateStudentImport: vi.fn(), confirmStudentImport: vi.fn() } }))

const role = { id: 1, codigo: 'ESTUDIANTE', nombre: 'Estudiante', activo: true, usuarios_count: 1 }
const teacherRole = { id: 2, codigo: 'DOCENTE', nombre: 'Docente', activo: true, usuarios_count: 1 }
const adminRole = { id: 3, codigo: 'ADMINISTRADOR', nombre: 'Administrador', activo: true, usuarios_count: 1 }
const user = { id: 2, username: 'ana', nombre_completo: 'Ana Pérez', ru: 'RU-1', ci: 'CI-1', correo_institucional: 'ana@uab.edu.bo', correo_personal: '', role, is_active: true, is_staff: false, permisos: { puede_ver_dashboard: false } }
const renderPage = (roleCode = 'ADMINISTRADOR') => render(<AuthContext.Provider value={{ roleCode }}><UsuariosPage /></AuthContext.Provider>)

beforeEach(() => {
  vi.clearAllMocks()
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [user] })
  usuariosService.listRoles.mockResolvedValue({ count: 3, next: null, previous: null, results: [role, teacherRole, adminRole] })
})

it('mantiene la tabla de usuarios clara y aplica el patrón existente de modo oscuro', async () => {
  renderPage()

  const header = (await screen.findByRole('columnheader', { name: 'Nombre completo' })).closest('thead')
  const userRow = screen.getByText('Ana Pérez').closest('tr')

  expect(header).toHaveClass('bg-slate-100', 'dark:bg-slate-800')
  expect(userRow).toHaveClass('border-t', 'dark:border-slate-800')
  expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
})

it('lista, busca, muestra detalle y activa/inactiva usuarios', async () => {
  usuariosService.updateUser.mockResolvedValue({ ...user, is_active: false })
  renderPage()
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
  renderPage()
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeDisabled()
  expect(screen.getAllByRole('option', { name: 'Estudiante' })).toHaveLength(2)
  expect(screen.getAllByRole('option', { name: 'Estudiante' }).every((option) => option.value === '1')).toBe(true)
  expect(screen.queryByRole('option', { name: 'Estudiante (EST)' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'nuevo' } })
  fireEvent.change(screen.getAllByLabelText('Rol')[1], { target: { value: '3' } })
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).not.toBeChecked()
  fireEvent.click(screen.getByLabelText('Acceso a Django Admin (staff)'))
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'StrongPass-2026' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  await waitFor(() => expect(usuariosService.createUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'nuevo', role_id: '3', is_staff: true, password: 'StrongPass-2026' })))
})

it('permite seleccionar staff al editar de DOCENTE a ADMINISTRADOR', async () => {
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ ...user, role: teacherRole }] })
  usuariosService.updateUser.mockResolvedValue({})
  renderPage()
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeDisabled()
  fireEvent.change(screen.getAllByLabelText('Rol')[1], { target: { value: '3' } })
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).not.toBeChecked()
  fireEvent.click(screen.getByLabelText('Acceso a Django Admin (staff)'))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  await waitFor(() => expect(usuariosService.updateUser).toHaveBeenCalledWith(2, expect.objectContaining({ role_id: '3', is_staff: true })))
})

it('carga staff y permite desmarcarlo al editar un ADMINISTRADOR', async () => {
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ ...user, role: adminRole, is_staff: true }] })
  usuariosService.updateUser.mockResolvedValue({})
  renderPage()
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeChecked()
  fireEvent.click(screen.getByLabelText('Acceso a Django Admin (staff)'))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  await waitFor(() => expect(usuariosService.updateUser).toHaveBeenCalledWith(2, expect.objectContaining({ role_id: 3, is_staff: false })))
})

it('pone staff en false inmediatamente al cambiar de ADMINISTRADOR a DOCENTE', async () => {
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ ...user, role: adminRole, is_staff: true }] })
  usuariosService.updateUser.mockResolvedValue({})
  renderPage()
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  fireEvent.change(screen.getAllByLabelText('Rol')[1], { target: { value: '2' } })
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).not.toBeChecked()
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  await waitFor(() => expect(usuariosService.updateUser).toHaveBeenCalledWith(2, expect.objectContaining({ role_id: '2', is_staff: false })))
})

it('oculta el acceso a Django Admin para un operador sin rol ADMINISTRADOR', async () => {
  renderPage('DOCENTE')
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect(screen.queryByLabelText('Acceso a Django Admin (staff)')).not.toBeInTheDocument()
})

it('muestra staff usando el rol real del usuario autenticado', async () => {
  render(<AuthContext.Provider value={{ user: { rol: { codigo: 'ADMINISTRADOR', nombre: 'Administrador' } }, roleCode: '' }}><UsuariosPage /></AuthContext.Provider>)
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeInTheDocument()
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeDisabled()
  fireEvent.change(screen.getAllByLabelText('Rol')[1], { target: { value: '3' } })
  expect(screen.getByLabelText('Acceso a Django Admin (staff)')).toBeEnabled()
})

it('oculta acciones peligrosas para un superusuario frente a un administrador normal', async () => {
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ ...user, is_superuser: true, role: adminRole }] })
  renderPage()
  await screen.findByText('Ana Pérez')
  expect(screen.getByRole('button', { name: 'Detalle' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Inactivar' })).not.toBeInTheDocument()
})

it('mantiene acciones controladas para el operador superusuario', async () => {
  usuariosService.listUsers.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ ...user, is_superuser: true, role: adminRole }] })
  render(<AuthContext.Provider value={{ user: { is_superuser: true, rol: { codigo: 'ADMINISTRADOR' } }, roleCode: 'ADMINISTRADOR' }}><UsuariosPage /></AuthContext.Provider>)
  await screen.findByText('Ana Pérez')
  expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Inactivar' })).toBeInTheDocument()
})

it('limpia el error anterior al volver a abrir el formulario de nuevo usuario', async () => {
  usuariosService.createUser.mockRejectedValueOnce({ message: 'Error del intento anterior.' })
  renderPage()
  await screen.findByText('Ana Pérez')
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'fallido' } })
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'StrongPass-2026' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  expect(await screen.findAllByText('Error del intento anterior.')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
  expect(screen.queryByText('Error del intento anterior.')).not.toBeInTheDocument()
})

it('administra roles sin convertir capacidades en controles editables', async () => {
  renderPage()
  fireEvent.click(screen.getByRole('button', { name: 'Roles' }))
  expect(await screen.findByText('Estudiante')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nuevo rol' })).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /puede gestionar/i })).not.toBeInTheDocument()
})

it('descarga la plantilla de importación desde el servicio de usuarios', async () => {
  const createObjectURL = vi.fn(() => 'blob:template')
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
  usuariosService.downloadStudentTemplate.mockResolvedValue(new Blob(['xlsx']))
  try {
    renderPage()
    await screen.findByText(/Ana/)
    fireEvent.click(screen.getByRole('button', { name: 'Importar estudiantes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Descargar plantilla Excel' }))
    await waitFor(() => expect(usuariosService.downloadStudentTemplate).toHaveBeenCalledOnce())
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledOnce()
  } finally {
    click.mockRestore()
    vi.unstubAllGlobals()
  }
})

it('muestra la vista previa, confirma el lote y descarga el reporte CSV de filas rechazadas', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const createObjectURL = vi.fn(() => 'blob:report')
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
  usuariosService.validateStudentImport.mockResolvedValue({
    token: 'signed-lot',
    total: 2,
    valid: 1,
    rejected: 1,
    rows: [
      { row_number: 2, nombres: 'Luis', apellido_paterno: 'Pérez', apellido_materno: 'Rojas', ru: 'RU-2', ci: 'CI-2', valid: true, errors: [] },
      { row_number: 3, nombres: 'Ana', apellido_paterno: 'López', apellido_materno: 'Rojas', ru: 'RU-3', ci: 'CI-3', valid: false, errors: ['RU duplicado.'] },
    ],
  })
  usuariosService.confirmStudentImport.mockResolvedValue({
    created: 1,
    rejected: 1,
    already_confirmed: false,
    rows: [{ row_number: 3, created: false, errors: ['RU duplicado.'] }],
  })
  try {
    renderPage()
    await screen.findByText(/Ana/)
    fireEvent.click(screen.getByRole('button', { name: 'Importar estudiantes' }))
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['xlsx'], 'estudiantes.xlsx')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Validar archivo' }))
    expect(await screen.findByText(/Total: 2/)).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'RU duplicado.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Confirmar importaci/ }))
    await waitFor(() => expect(usuariosService.confirmStudentImport).toHaveBeenCalledWith('signed-lot'))
    expect(await screen.findByText(/Creados: 1/)).toBeInTheDocument()
    const errorReportButtons = screen.getAllByRole('button', { name: 'Descargar reporte de errores' })
    expect(errorReportButtons).toHaveLength(1)
    fireEvent.click(errorReportButtons[0])
    const csv = createObjectURL.mock.calls[0][0]
    expect(await csv.text()).toContain('RU duplicado.')
    expect(click).toHaveBeenCalled()
  } finally {
    confirmSpy.mockRestore()
    click.mockRestore()
    vi.unstubAllGlobals()
  }
})
