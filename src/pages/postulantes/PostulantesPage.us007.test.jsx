import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/AuthContext'
import apiClient from '../../services/api'
import PostulantesPage from './PostulantesPage'
import { crudService, listAll } from '../../services/crudService'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/crudService', () => ({
  endpoints: {
    postulaciones: '/postulaciones/',
    modalidades: '/modalidades/',
    periodos: '/periodos/',
    estudiantes: '/estudiantes/',
  },
  crudService: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
  listAll: vi.fn(),
}))
vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: { obtenerDetalle: vi.fn() },
}))
vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

const application = {
  id: 71,
  codigo: 'BASIC-071',
  estudiante: 17,
  modalidad: 3,
  periodo: 8,
  estado_actual: 4,
  observaciones_generales: 'Descripción vigente.',
  estudiante_detalle: { id: 17, ru: 'RU-071', nombre_completo: 'María Rojas' },
  modalidad_detalle: { id: 3, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
  periodo_detalle: { id: 8, gestion: 2026, semestre: 'II', nombre: '2026-II' },
  estado_actual_detalle: { id: 4, codigo: 'REGISTRADA', nombre: 'Registrada' },
}

function setup({ canManage = false } = {}) {
  crudService.list.mockResolvedValue({ count: 1, next: null, previous: null, results: [application] })
  listAll.mockResolvedValue([])
  postulacionesService.obtenerDetalle.mockResolvedValue(application)
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ hasPermission: (name) => canManage && name === 'puede_gestionar_postulaciones' }}>
        <PostulantesPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('PostulantesPage US-007', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/flujo/')
        ? { etapa_actual: { nombre: 'Cierre Documental', estado: 'APROBADA' } }
        : { nota_final: '99.1' },
    }))
  })

  it('muestra detalle legible en solo lectura sin cargar catálogos', async () => {
    setup()
    expect(await screen.findByText('RU-071 - María Rojas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(listAll).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Detalle' }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Descripción vigente.')).toBeInTheDocument()
    expect(within(dialog).getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(within(dialog).getByText('Gestión 2026 - Semestre II')).toBeInTheDocument()
    expect(within(dialog).getByText('Registrada')).toBeInTheDocument()
    expect(within(dialog).getByText('Estado técnico')).toBeInTheDocument()
    expect(await within(dialog).findByText('Cierre Documental — Aprobada')).toBeInTheDocument()
    expect(within(dialog).getByText('99.1')).toBeInTheDocument()
    expect(within(dialog).getByRole('note')).toHaveTextContent(/no sustituyen actos/i)
    expect(postulacionesService.obtenerDetalle).toHaveBeenCalledTimes(1)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/postulaciones/71/flujo/', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/postulaciones/71/resultado-final/', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(screen.getByRole('link', { name: 'Abrir expediente' })).toHaveAttribute('href', '/postulaciones/71')
    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument()
  })

  it('limita la edición a código y observaciones generales', async () => {
    setup({ canManage: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar postulación' })
    expect(within(dialog).getByLabelText('Código')).toHaveValue('BASIC-071')
    expect(within(dialog).getByLabelText('Observaciones')).toHaveValue('Descripción vigente.')
    expect(within(dialog).getByText('Datos de solo lectura')).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Estudiante' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Modalidad' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: /Semestre/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument()
  })

  it('omite el resultado final cuando la nota canónica es null', async () => {
    apiClient.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/flujo/')
        ? { etapa_actual: { nombre: 'Defensa Privada', estado: 'EN_PROCESO' } }
        : { nota_final: null },
    }))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Detalle' }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Defensa Privada — En proceso')).toBeInTheDocument()
    expect(within(dialog).queryByText('Resultado final')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Registrada')).toBeInTheDocument()
  })

  it('mantiene el detalle disponible si faltan etapa actual y resultado opcional', async () => {
    apiClient.get.mockRejectedValue(new Error('Datos opcionales no disponibles.'))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Detalle' }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Descripción vigente.')).toBeInTheDocument()
    expect(within(dialog).getByText('Registrada')).toBeInTheDocument()
    expect(within(dialog).queryByText('Etapa actual')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Resultado final')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('omite etapa actual cuando el flujo no devuelve una etapa actual', async () => {
    apiClient.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/flujo/') ? { etapa_actual: null } : { nota_final: null },
    }))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Detalle' }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Descripción vigente.')).toBeInTheDocument()
    expect(within(dialog).queryByText('Etapa actual')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Registrada')).toBeInTheDocument()
  })

  it('envía un único PATCH con campos básicos y previene doble envío', async () => {
    let resolvePatch
    crudService.update.mockReturnValue(new Promise((resolve) => { resolvePatch = resolve }))
    setup({ canManage: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    const code = screen.getByLabelText('Código')
    await userEvent.clear(code)
    await userEvent.type(code, 'BASIC-071-A')
    await userEvent.clear(screen.getByLabelText('Observaciones'))
    await userEvent.type(screen.getByLabelText('Observaciones'), 'Actualización básica.')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled()
    expect(crudService.update).toHaveBeenCalledTimes(1)
    expect(crudService.update).toHaveBeenCalledWith('/postulaciones/', 71, {
      codigo: 'BASIC-071-A',
      observaciones_generales: 'Actualización básica.',
    })
    resolvePatch({ id: 71 })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('permite cancelar sin enviar cambios', async () => {
    setup({ canManage: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(crudService.update).not.toHaveBeenCalled()
  })

  it('conserva errores de campo del PATCH', async () => {
    crudService.update.mockRejectedValue({
      status: 400,
      message: 'codigo: Ya existe.',
      fields: { codigo: ['Ya existe.'] },
    })
    setup({ canManage: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('El código ingresado ya se encuentra registrado en otra postulación. Por favor, ingrese un código diferente.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it.each([
    ['No tienes autorización para consultar esta postulación.', 403],
    ['La postulación solicitada no está disponible.', 404],
  ])('muestra %s y permite reintentar el detalle', async (message, status) => {
    postulacionesService.obtenerDetalle
      .mockRejectedValueOnce({ status, message })
      .mockResolvedValueOnce(application)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Detalle' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Descripción vigente.')).toBeInTheDocument()
    expect(postulacionesService.obtenerDetalle).toHaveBeenCalledTimes(2)
  })

  it('cancela la consulta de detalle al desmontar', async () => {
    let signal
    const view = setup()
    postulacionesService.obtenerDetalle.mockImplementation((_id, requestSignal) => {
      signal = requestSignal
      return new Promise(() => {})
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Detalle' }))
    await waitFor(() => expect(signal).toBeDefined())
    view.unmount()
    expect(signal.aborted).toBe(true)
  })
})
