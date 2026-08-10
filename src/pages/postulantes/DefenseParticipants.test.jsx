import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DefenseParticipants from './DefenseParticipants'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: {
  obtenerAsignacionesCandidatas: vi.fn(), agregarParticipanteDefensa: vi.fn(),
  retirarParticipanteDefensa: vi.fn(), registrarAsistenciaDefensa: vi.fn(),
} }))

const candidateRows = [
  { id: 11, usuario_nombre: 'Ana Tribunal', tipo_participacion: 'TRIBUNAL', tipo_participacion_display: 'Tribunal', activo: true },
  { id: 12, usuario_nombre: 'Tomás Tutor', tipo_participacion: 'TUTOR', tipo_participacion_display: 'Tutor', activo: true },
]
const participant = { id: 91, asignacion: 11, usuario_nombre: 'Ana Tribunal', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, presente: null, fecha_asistencia: null, observaciones: '', activo: true }
const defense = { id: 81, postulacion: 7, estado: 'PROGRAMADA', participantes: [participant] }

describe('DefenseParticipants US-020', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postulacionesService.obtenerAsignacionesCandidatas.mockResolvedValue({ results: candidateRows })
    postulacionesService.agregarParticipanteDefensa.mockResolvedValue({})
    postulacionesService.retirarParticipanteDefensa.mockResolvedValue({})
    postulacionesService.registrarAsistenciaDefensa.mockResolvedValue({})
  })

  it.each([
    ['PROGRAMADA', true, false], ['EN_CURSO', true, true], ['SUSPENDIDA', true, false],
    ['FINALIZADA', false, false], ['CANCELADA', false, false],
  ])('respeta matriz %s', (estado, mutations, attendance) => {
    render(<DefenseParticipants defense={{ ...defense, estado }} canManage onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Agregar participante' }) !== null).toBe(mutations)
    expect(screen.queryByRole('button', { name: 'Retirar participante' }) !== null).toBe(mutations)
    expect(screen.queryByRole('button', { name: 'Registrar asistencia' }) !== null).toBe(attendance)
  })

  it('oculta todas las mutaciones sin capacidad efectiva', () => {
    render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO' }} canManage={false} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Agregar|Retirar|asistencia/i })).not.toBeInTheDocument()
  })

  it('selecciona por nombre y conserva exactamente el rol de la asignación', async () => {
    const onChanged = vi.fn().mockResolvedValue()
    render(<DefenseParticipants defense={{ ...defense, participantes: [] }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    expect(await within(dialog).findByRole('option', { name: 'Tomás Tutor — Tutor' })).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Buscar por nombre o rol'), 'Tomás')
    expect(within(dialog).getByRole('option', { name: 'Tomás Tutor — Tutor' })).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Asignación activa'), '12')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar participante' }))
    await waitFor(() => expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledWith(81, 12, 'TUTOR', expect.any(AbortSignal)))
    expect(postulacionesService.agregarParticipanteDefensa).not.toHaveBeenCalledWith(81, 12, 'TRIBUNAL', expect.anything())
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('confirma retiro y evita doble envío', async () => {
    let resolveRequest
    postulacionesService.retirarParticipanteDefensa.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    render(<DefenseParticipants defense={defense} canManage onChanged={vi.fn().mockResolvedValue()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retirar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Retirar participante' })
    expect(dialog).toHaveTextContent(/registro histórico se conservará/i)
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar retiro' })
    await userEvent.click(confirm); fireEvent.click(confirm)
    expect(postulacionesService.retirarParticipanteDefensa).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'Procesando…' })).toBeDisabled()
    resolveRequest({})
  })

  it('registra presente, ausente y permite corregir observaciones', async () => {
    const onChanged = vi.fn().mockResolvedValue()
    const view = render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO' }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar asistencia' }))
    let dialog = screen.getByRole('dialog', { name: 'Registrar asistencia' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Asistencia'), 'false')
    await userEvent.type(within(dialog).getByLabelText('Observaciones'), 'Ausencia justificada')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asistencia' }))
    await waitFor(() => expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledWith(81, 91, false, 'Ausencia justificada', expect.any(AbortSignal)))
    view.rerender(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [{ ...participant, presente: true, observaciones: 'Inicial', fecha_asistencia: '2026-08-10T14:00:00Z' }] }} canManage onChanged={onChanged} />)
    expect(screen.getByText(/10\/8\/2026/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Corregir asistencia' }))
    dialog = screen.getByRole('dialog', { name: 'Corregir asistencia' })
    await userEvent.clear(within(dialog).getByLabelText('Observaciones'))
    await userEvent.type(within(dialog).getByLabelText('Observaciones'), 'Corregida')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asistencia' }))
    await waitFor(() => expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenLastCalledWith(81, 91, true, 'Corregida', expect.any(AbortSignal)))
  })

  it('muestra errores funcionales, permite reintentar catálogo y cancela al desmontar', async () => {
    let capturedSignal
    postulacionesService.obtenerAsignacionesCandidatas.mockImplementationOnce((_post, signal) => { capturedSignal = signal; return Promise.reject({ message: 'No se pudo consultar', status: 404 }) })
    const view = render(<DefenseParticipants defense={{ ...defense, participantes: [] }} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('option', { name: 'Ana Tribunal — Tribunal' })).toBeInTheDocument()
    view.unmount()
    expect(capturedSignal.aborted).toBe(true)
  })

  it('muestra estado, fecha y advertencia contractual sin controles de evaluación', () => {
    render(<DefenseParticipants defense={{ ...defense, participantes: [{ ...participant, presente: false, fecha_asistencia: '2026-08-10T14:00:00Z', observaciones: 'No asistió' }] }} canManage={false} onChanged={vi.fn()} />)
    expect(screen.getByText('Ausente')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/no sustituye memorando, designación ni convocatoria institucional formal/i)
    expect(screen.queryByRole('button', { name: /evaluación|nota|resultado/i })).not.toBeInTheDocument()
  })
})
