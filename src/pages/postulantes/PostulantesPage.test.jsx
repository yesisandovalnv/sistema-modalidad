import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import PostulantesPage from './PostulantesPage'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { crudService, endpoints, listAll } from '../../services/crudService'

vi.mock('../../services/crudService', () => ({
  endpoints: { postulaciones:'/postulaciones/', modalidades:'/modalidades/', periodos:'/periodos/', estudiantes:'/estudiantes/' },
  crudService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  listAll: vi.fn(),
}))

const student = { id: 17, codigo: '394090', ru: '394090', nombre_completo: 'Luis Fernando Menacho Melgar' }
const period = { id: 8, nombre: '2026-II', gestion: 2026, semestre: 'II', activo: true }
const modality = { id: 3, nombre: 'Proyecto de Grado', activo: true }
const auth = { hasPermission: (name) => name === 'puede_gestionar_postulaciones' }

function setup({ periods = [period] } = {}) {
  crudService.list.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  listAll.mockImplementation((path) => Promise.resolve(path === endpoints.modalidades ? [modality] : path === endpoints.periodos ? periods : [student]))
  return render(<AuthContext.Provider value={auth}><PostulantesPage /></AuthContext.Provider>)
}

describe('Nueva postulación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formatea estudiante y periodo sin mostrar el ID interno', () => {
    expect(formatStudentLabel(student)).toBe('394090 - Luis Fernando Menacho Melgar')
    expect(formatPeriodoLabel(period)).toBe('Gestión 2026 - Semestre II')
  })

  it('consume catálogos paginados y muestra etiquetas legibles', async () => {
    setup(); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    expect(screen.getByRole('option', { name: '394090 - Luis Fernando Menacho Melgar' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gestión 2026 - Semestre II' })).toBeInTheDocument()
  })

  it('deshabilita Guardar cuando no hay periodos activos', async () => {
    setup({ periods: [] }); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    expect(screen.getByText(/No existen periodos acad/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('envía IDs reales y evita doble envío', async () => {
    let resolveRequest; crudService.create.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    setup(); await userEvent.click(await screen.findByRole('button', { name: /Nueva postulaci/ }))
    await userEvent.type(screen.getByRole('dialog').querySelector('input[required]'), 'POST-2026')
    await userEvent.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await userEvent.selectOptions(screen.getByLabelText(/Semestre/), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled()
    expect(crudService.create).toHaveBeenCalledTimes(1)
    expect(crudService.create).toHaveBeenCalledWith('/postulaciones/', expect.objectContaining({ estudiante:17, modalidad:3, periodo:8 }))
    resolveRequest({ id: 1 }); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('oculta el alta sin permiso explícito', async () => {
    crudService.list.mockResolvedValue({ count:0, results:[] })
    render(<AuthContext.Provider value={{ hasPermission: () => false }}><PostulantesPage /></AuthContext.Provider>)
    await waitFor(() => expect(crudService.list).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /Nueva postulaci/ })).not.toBeInTheDocument()
  })

  it('mantiene el formulario abierto y muestra errores de campo del backend', async () => {
    crudService.create.mockRejectedValue({
      status: 400,
      message: 'codigo: Ya existe una postulación con este código.',
      fields: { codigo: ['Ya existe una postulación con este código.'] },
    })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva postulación' }))
    await userEvent.type(screen.getByRole('dialog').querySelector('input[required]'), 'POST-2026')
    await userEvent.selectOptions(screen.getByLabelText('Estudiante'), '17')
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), '3')
    await userEvent.selectOptions(screen.getByLabelText('Gestión / Semestre'), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe una postulación con este código.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
