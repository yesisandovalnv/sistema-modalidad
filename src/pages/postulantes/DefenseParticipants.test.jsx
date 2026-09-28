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
  { id: 13, usuario_nombre: 'Diana Modalidad', tipo_participacion: 'DOCENTE_MODALIDAD', tipo_participacion_display: 'Docente de modalidad', activo: true },
  { id: 14, usuario_nombre: 'Pablo Presidente', tipo_participacion: 'PRESIDENTE', tipo_participacion_display: 'Presidente', activo: true },
  { id: 15, usuario_nombre: 'Sara Secretaria', tipo_participacion: 'SECRETARIO', tipo_participacion_display: 'Secretario', activo: true },
]
const participant = { id: 91, asignacion: 11, usuario_nombre: 'Ana Tribunal', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, presente: null, fecha_asistencia: null, observaciones: '', activo: true }
const defense = { id: 81, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA', estado: 'PROGRAMADA', participantes: [participant] }

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

  it('filtra roles incompatibles en Defensa Privada de Tesis', async () => {
    const onChanged = vi.fn().mockResolvedValue()
    render(<DefenseParticipants defense={{ ...defense, participantes: [] }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    expect(await within(dialog).findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: 'Diana Modalidad — Docente de modalidad' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: 'Tomás Tutor — Tutor' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: 'Pablo Presidente — Presidente' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: 'Sara Secretaria — Secretario' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Ana Tribunal — Tribunal' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar 1 participante' }))
    await waitFor(() => expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledWith(81, 11, 'TRIBUNAL', expect.any(AbortSignal)))
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('mantiene todos los roles soportados para otras defensas', async () => {
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA' }} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    expect(within(dialog).getByText('Candidatos para incorporar')).toBeInTheDocument()
    expect(await within(dialog).findByRole('checkbox', { name: 'Tomás Tutor — Tutor' })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: 'Pablo Presidente — Presidente' })).toBeInTheDocument()
    expect(within(dialog).getByText('Tomás Tutor')).toBeInTheDocument()
    expect(within(dialog).queryByText('Asistencia')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Convocatoria')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Observaciones')).not.toBeInTheDocument()
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

  it.each(['PROGRAMADA', 'SUSPENDIDA'])('mantiene solo incorporación sin asistencia automática en %s', async (estado) => {
    postulacionesService.agregarParticipanteDefensa.mockResolvedValue({ id: 99 })
    render(<DefenseParticipants defense={{ ...defense, estado, participantes: [] }} canManage onChanged={vi.fn().mockResolvedValue()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar 1 participante' }))
    await waitFor(() => expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledTimes(1))
    expect(postulacionesService.registrarAsistenciaDefensa).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Agregar como presente' })).not.toBeInTheDocument()
  })

  it.each(['FINALIZADA', 'CANCELADA'])('no ofrece incorporación ni acción rápida en %s', (estado) => {
    render(<DefenseParticipants defense={{ ...defense, estado, participantes: [] }} canManage onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Agregar participante' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar como presente' })).not.toBeInTheDocument()
  })

  it('agrega y registra presencia secuencialmente antes de refrescar', async () => {
    const order = []
    postulacionesService.agregarParticipanteDefensa.mockImplementation(async () => { order.push('agregar'); return { id: 99 } })
    postulacionesService.registrarAsistenciaDefensa.mockImplementation(async () => { order.push('asistencia'); return { id: 99, presente: true } })
    const onChanged = vi.fn(async () => { order.push('refrescar') })
    const view = render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [] }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' }))
    expect(within(dialog).queryByRole('button', { name: 'Agregar como presente' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar 1 participante' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(order).toEqual(['agregar', 'asistencia', 'refrescar'])
    expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledWith(81, 99, true, '', expect.any(AbortSignal))
    view.rerender(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [{ ...participant, id: 99, presente: true }] }} canManage onChanged={onChanged} />)
    expect(screen.getByText('Tribunal · Convocado · Presente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Corregir asistencia' })).toBeInTheDocument()
  })

  it('conserva la incorporación parcial y reintenta solamente asistencia', async () => {
    const incorporated = { ...participant, id: 99, asignacion: 11, presente: null }
    postulacionesService.agregarParticipanteDefensa.mockResolvedValue({ id: 99 })
    postulacionesService.registrarAsistenciaDefensa.mockRejectedValueOnce({ message: 'Fallo de asistencia' }).mockResolvedValueOnce({ id: 99, presente: true })
    const onChanged = vi.fn().mockResolvedValue()
    const view = render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [] }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar 1 participante' }))
    await waitFor(() => expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    view.rerender(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [incorporated] }} canManage onChanged={onChanged} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Participante incorporado, pero no se pudo registrar su presencia.')
    expect(screen.getByText('Tribunal · Convocado · Asistencia pendiente')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar presencia' }))
    await waitFor(() => expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledTimes(2))
    expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenLastCalledWith(81, 99, true, '', expect.any(AbortSignal))
  })

  it('muestra errores funcionales, permite reintentar catálogo y cancela al desmontar', async () => {
    let capturedSignal
    postulacionesService.obtenerAsignacionesCandidatas.mockImplementationOnce((_post, signal) => { capturedSignal = signal; return Promise.reject({ message: 'No se pudo consultar', status: 404 }) })
    const view = render(<DefenseParticipants defense={{ ...defense, participantes: [] }} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' })).toBeInTheDocument()
    view.unmount()
    expect(capturedSignal.aborted).toBe(true)
  })

  it('muestra estado, fecha y advertencia contractual sin controles de evaluación', () => {
    render(<DefenseParticipants defense={{ ...defense, participantes: [{ ...participant, presente: false, fecha_asistencia: '2026-08-10T14:00:00Z', observaciones: 'No asistió' }] }} canManage={false} onChanged={vi.fn()} />)
    expect(screen.getByText(/Convocado · Ausente/)).toBeInTheDocument()
    const participantRow = screen.getByRole('heading', { name: 'Ana Tribunal' }).closest('li')
    expect(participantRow).toHaveTextContent(/Asistencia:/)
    expect(participantRow).toHaveTextContent(/Observaciones:\s*No asistió/)
    expect(screen.queryByRole('button', { name: /evaluación|nota|resultado/i })).not.toBeInTheDocument()
  })

  it('compacta un participante programado y omite metadatos vacíos', () => {
    render(<DefenseParticipants defense={{ ...defense, postulacion_modalidad_codigo: 'PROYECTO_GRADO', tipo_evento: 'DEFENSA_PUBLICA' }} canManage onChanged={vi.fn()} />)
    const row = screen.getByRole('heading', { name: 'Ana Tribunal' }).closest('li')
    expect(row).toHaveTextContent('Ana Tribunal')
    expect(row).toHaveTextContent('Tribunal')
    expect(row).toHaveTextContent('Convocado · Asistencia pendiente')
    expect(within(row).getByRole('button', { name: 'Retirar participante' })).toBeInTheDocument()
    expect(row).not.toHaveTextContent('Activo')
    expect(row).not.toHaveTextContent('Asignación origen')
    expect(row).not.toHaveTextContent('No registrada')
    expect(row).not.toHaveTextContent('Sin observaciones')
  })

  it('conserva asistencia editable en curso y trazabilidad cuando existe', () => {
    const attendance = { ...participant, presente: true, fecha_asistencia: '2026-08-10T14:00:00Z', observaciones: 'Llegó a tiempo' }
    const { rerender } = render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [{ ...participant }] }} canManage onChanged={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Registrar asistencia' })).toBeInTheDocument()
    rerender(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [attendance] }} canManage onChanged={vi.fn()} />)
    const row = screen.getByRole('heading', { name: 'Ana Tribunal' }).closest('li')
    expect(row).toHaveTextContent('Presente')
    expect(row).toHaveTextContent('10/8/2026')
    expect(row).toHaveTextContent('Llegó a tiempo')
    expect(within(row).getByRole('button', { name: 'Corregir asistencia' })).toBeInTheDocument()
  })

  it('mantiene retirado visible y sin acciones en finalizada', () => {
    render(<DefenseParticipants defense={{ ...defense, estado: 'FINALIZADA', participantes: [{ ...participant, activo: false, presente: false, fecha_asistencia: '2026-08-10T14:00:00Z', observaciones: 'Retiro técnico' }] }} canManage onChanged={vi.fn()} />)
    const row = screen.getByRole('heading', { name: 'Ana Tribunal' }).closest('li')
    expect(row).toHaveTextContent('Retirado')
    expect(row).toHaveTextContent('Ausente')
    expect(row).toHaveTextContent('10/8/2026')
    expect(row).toHaveTextContent('Retiro técnico')
    expect(within(row).queryByRole('button', { name: /Retirar|asistencia/i })).not.toBeInTheDocument()
  })

  it.each([
    [2, 0, 2, false, '2 de 3 incorporados', '0 presentes', 'Faltan 2 presencias para alcanzar el quórum.'],
    [2, 1, 1, false, '2 de 3 incorporados', '1 presente', 'Falta 1 presencia para alcanzar el quórum.'],
    [2, 2, 0, true, '2 de 3 incorporados', '2 presentes', '✓ Válido'],
    [3, 2, 0, true, '3 de 3 incorporados', '2 presentes', '✓ Válido'],
  ])('separa %s incorporados de %s presentes', (incorporados, presentes, faltantes, valido, progreso, presencia, estado) => {
    const rows = Array.from({ length: incorporados }, (_, index) => ({
      ...participant,
      id: 91 + index,
      asignacion: 11 + index,
      usuario_nombre: `Tribunal ${index + 1}`,
      presente: index < presentes ? true : null,
    }))
    render(<DefenseParticipants
      defense={{ ...defense, participantes: rows }}
      canManage={false}
      onChanged={vi.fn()}
      profileContext
      quorum={{ valido, conteos: { TRIBUNAL: presentes }, faltantes: faltantes ? { TRIBUNAL: faltantes } : {} }}
    />)
    expect(screen.getByLabelText('Resumen operativo de la defensa')).toHaveTextContent(progreso)
    expect(screen.getByText(presencia)).toBeInTheDocument()
    expect(screen.getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(screen.getByText(estado)).toBeInTheDocument()
    expect(screen.getByLabelText('Resumen operativo de la defensa').querySelector('dl')).toHaveClass('sm:grid-cols-3')
    if (valido) expect(screen.queryByText('Se requiere quórum válido para registrar evaluaciones y finalizar la defensa.')).not.toBeInTheDocument()
    else expect(screen.getByText('Se requiere quórum válido para registrar evaluaciones y finalizar la defensa.')).toBeInTheDocument()
  })

  it('distingue asistencia pendiente, presente y ausente en participantes incorporados', () => {
    render(<DefenseParticipants defense={{ ...defense, participantes: [
      { ...participant, id: 91, usuario_nombre: 'Pendiente', presente: null },
      { ...participant, id: 92, asignacion: 12, usuario_nombre: 'Confirmado', presente: true },
      { ...participant, id: 93, asignacion: 13, usuario_nombre: 'Ausente', presente: false },
    ] }} canManage={false} onChanged={vi.fn()} profileContext quorum={{ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1 } }} />)
    expect(screen.getByText('Tribunal · Incorporado · Asistencia pendiente')).toBeInTheDocument()
    expect(screen.getByText('Tribunal · Incorporado · Presente')).toBeInTheDocument()
    expect(screen.getByText('Tribunal · Incorporado · Ausente')).toBeInTheDocument()
  })

  it('selecciona y deselecciona asignaciones con contador singular y plural', async () => {
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA', participantes: [] }} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    const ana = await within(dialog).findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' })
    const diana = within(dialog).getByRole('checkbox', { name: 'Diana Modalidad — Docente de modalidad' })
    const submit = within(dialog).getByRole('button', { name: 'Agregar participante' })
    expect(submit).toBeDisabled()
    await userEvent.click(ana)
    expect(within(dialog).getByText('1 seleccionado')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Agregar 1 participante' })).toBeEnabled()
    await userEvent.click(diana)
    expect(within(dialog).getByText('2 seleccionados')).toBeInTheDocument()
    await userEvent.click(ana)
    expect(within(dialog).getByText('1 seleccionado')).toBeInTheDocument()
  })

  it('presenta candidatos compactos sin datos del participante del evento', async () => {
    postulacionesService.obtenerAsignacionesCandidatas.mockResolvedValue({ results: [
      { id: 11, usuario_nombre: 'Raúl Marcelo Calderón Fuertes', tipo_participacion: 'TRIBUNAL', tipo_participacion_display: 'Tribunal', orden_cargo: 1, activo: true },
      { id: 14, usuario_nombre: 'Willian Chau Rivero', tipo_participacion: 'PRESIDENTE', tipo_participacion_display: 'Presidente', activo: true },
    ] })
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA', participantes: [] }} canManage onChanged={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    expect(within(dialog).getByText('Candidatos para incorporar')).toBeInTheDocument()
    expect(within(dialog).getByText('Raúl Marcelo Calderón Fuertes')).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal · Orden 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Willian Chau Rivero')).toBeInTheDocument()
    expect(within(dialog).getByText('Presidente')).toBeInTheDocument()
    expect(within(dialog).queryByText(/Asistencia|Convocatoria|Observaciones|Fecha de asistencia/)).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('label.rounded-lg')).toHaveLength(0)
  })

  it('seleccionar todos opera solo sobre resultados visibles de la búsqueda', async () => {
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA', participantes: [] }} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    const selectAll = within(dialog).getByRole('checkbox', { name: 'Seleccionar todos los resultados visibles' })
    await userEvent.click(selectAll)
    expect(within(dialog).getByText('5 seleccionados')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Buscar por nombre o rol'), 'Ana')
    expect(within(dialog).getByText('5 seleccionados')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Seleccionar todos los resultados visibles' }))
    expect(within(dialog).getByText('3 seleccionados')).toBeInTheDocument()
  })

  it('ejecuta tres POST secuenciales y refresca una sola vez', async () => {
    const onChanged = vi.fn().mockResolvedValue()
    const order = []
    postulacionesService.agregarParticipanteDefensa.mockImplementation(async (_event, assignment) => {
      order.push(`start-${assignment}`)
      await Promise.resolve()
      order.push(`end-${assignment}`)
      return {}
    })
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA', participantes: [] }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Ana Tribunal — Tribunal' }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Tomás Tutor — Tutor' }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Diana Modalidad — Docente de modalidad' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar 3 participantes' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(order).toEqual(['start-11', 'end-11', 'start-12', 'end-12', 'start-13', 'end-13'])
    expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenNthCalledWith(1, 81, 11, 'TRIBUNAL', expect.any(AbortSignal))
    expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenNthCalledWith(2, 81, 12, 'TUTOR', expect.any(AbortSignal))
    expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenNthCalledWith(3, 81, 13, 'DOCENTE_MODALIDAD', expect.any(AbortSignal))
  })

  it('continúa después de un error y muestra éxito parcial por persona', async () => {
    const onChanged = vi.fn().mockResolvedValue()
    postulacionesService.agregarParticipanteDefensa.mockImplementation(async (_event, assignment) => {
      if (assignment === 13) throw { message: 'La asignación ya no está activa.' }
      return {}
    })
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA', participantes: [] }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    for (const name of ['Ana Tribunal — Tribunal', 'Diana Modalidad — Docente de modalidad', 'Pablo Presidente — Presidente']) await userEvent.click(await within(dialog).findByRole('checkbox', { name }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar 3 participantes' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledTimes(3)
    expect(within(dialog).getByText('Algunas incorporaciones no pudieron completarse.')).toBeInTheDocument()
    expect(within(dialog).getAllByText('✓ Agregado')).toHaveLength(2)
    expect(within(dialog).getByText('✕ La asignación ya no está activa.')).toBeInTheDocument()
  })

  it('evita doble envío durante el lote y no selecciona una asignación ya incorporada', async () => {
    let resolveRequest
    postulacionesService.agregarParticipanteDefensa.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: 'DEFENSA_PUBLICA' }} canManage onChanged={vi.fn().mockResolvedValue()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Agregar participante' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar participante' })
    expect(within(dialog).queryByRole('checkbox', { name: 'Ana Tribunal — Tribunal' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Tomás Tutor — Tutor' }))
    const confirm = within(dialog).getByRole('button', { name: 'Agregar 1 participante' })
    await userEvent.click(confirm)
    fireEvent.click(confirm)
    expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'Procesando…' })).toBeDisabled()
    resolveRequest({})
  })

  it.each(['DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'])('no muestra las métricas exclusivas de Perfil en %s', (tipoEvento) => {
    render(<DefenseParticipants defense={{ ...defense, tipo_evento: tipoEvento }} canManage={false} onChanged={vi.fn()} quorum={{ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {} }} />)
    expect(screen.queryByText(/de 3 incorporados/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mínimo requerido:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Pendientes de incorporar')).not.toBeInTheDocument()
  })

  it('ofrece asistencia múltiple solo en curso y selecciona inicialmente a todos los pendientes activos', async () => {
    const pending = [
      { ...participant, id: 91, usuario_nombre: 'Ana Tribunal' },
      { ...participant, id: 92, asignacion: 12, usuario_nombre: 'Tomás Tutor', rol_evento: 'TUTOR', rol_display: 'Tutor' },
      { ...participant, id: 93, asignacion: 13, usuario_nombre: 'Diana Modalidad', rol_evento: 'DOCENTE_MODALIDAD', rol_display: 'Docente de modalidad' },
    ]
    const { rerender } = render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: pending }} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar asistencia múltiple' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar asistencia múltiple' })
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(3)
    within(dialog).getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeChecked())
    expect(within(dialog).getByText('3 seleccionados')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Registrar asistencia' })).toHaveLength(3)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    rerender(<DefenseParticipants defense={{ ...defense, estado: 'PROGRAMADA', participantes: pending }} canManage onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Registrar asistencia múltiple' })).not.toBeInTheDocument()
    rerender(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: pending.map((item) => ({ ...item, presente: true })) }} canManage onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Registrar asistencia múltiple' })).not.toBeInTheDocument()
  })

  it('desmarcar conserva asistencia pendiente y registra presente en secuencia solo para seleccionados', async () => {
    const pending = [
      { ...participant, id: 91, usuario_nombre: 'Ana Tribunal' },
      { ...participant, id: 92, asignacion: 12, usuario_nombre: 'Tomás Tutor', rol_evento: 'TUTOR', rol_display: 'Tutor' },
      { ...participant, id: 93, asignacion: 13, usuario_nombre: 'Diana Modalidad', rol_evento: 'DOCENTE_MODALIDAD', rol_display: 'Docente de modalidad' },
    ]
    const order = []
    postulacionesService.registrarAsistenciaDefensa.mockImplementation(async (_defense, participantId, present) => { order.push(`${participantId}-${present}`); return {} })
    const onChanged = vi.fn(async () => { order.push('refrescar') })
    render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: pending }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar asistencia múltiple' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar asistencia múltiple' })
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Diana Modalidad — Docente de modalidad' }))
    expect(within(dialog).getByText('Asistencia pendiente')).toBeInTheDocument()
    expect(within(dialog).getByText('2 seleccionados')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asistentes' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(order).toEqual(['91-true', '92-true', 'refrescar'])
    expect(postulacionesService.registrarAsistenciaDefensa).not.toHaveBeenCalledWith(81, 93, expect.anything(), expect.anything(), expect.anything())
    expect(postulacionesService.registrarAsistenciaDefensa.mock.calls.every(([, , present]) => present === true)).toBe(true)
  })

  it('muestra éxito parcial, continúa el lote y reintenta únicamente los fallidos', async () => {
    const pending = [
      { ...participant, id: 91, usuario_nombre: 'Ana Tribunal' },
      { ...participant, id: 92, asignacion: 12, usuario_nombre: 'Tomás Tutor', rol_evento: 'TUTOR', rol_display: 'Tutor' },
      { ...participant, id: 93, asignacion: 13, usuario_nombre: 'Diana Modalidad', rol_evento: 'DOCENTE_MODALIDAD', rol_display: 'Docente de modalidad' },
      { ...participant, id: 94, asignacion: 14, usuario_nombre: 'Pablo Presidente', rol_evento: 'PRESIDENTE', rol_display: 'Presidente' },
    ]
    let failedOnce = false
    postulacionesService.registrarAsistenciaDefensa.mockImplementation(async (_defense, participantId) => {
      if (participantId === 92 && !failedOnce) { failedOnce = true; throw { message: 'Conflicto de asistencia.' } }
      return {}
    })
    const onChanged = vi.fn().mockResolvedValue()
    render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: pending }} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar asistencia múltiple' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar asistencia múltiple' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asistentes' }))

    expect(await within(dialog).findByText('Algunas asistencias no pudieron registrarse.')).toBeInTheDocument()
    expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledTimes(4)
    expect(within(dialog).getAllByText('Presente')).toHaveLength(3)
    expect(within(dialog).getByText('Error · Conflicto de asistencia.')).toBeInTheDocument()
    expect(within(dialog).getByText('1 seleccionado')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar fallidos' }))

    await waitFor(() => expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledTimes(5))
    expect(postulacionesService.registrarAsistenciaDefensa.mock.calls.map(([, participantId]) => participantId)).toEqual([91, 92, 93, 94, 92])
    expect(onChanged).toHaveBeenCalledTimes(2)
  })

  it('mantiene las acciones individuales visualmente separadas después de registrar presencia', () => {
    render(<DefenseParticipants defense={{ ...defense, estado: 'EN_CURSO', participantes: [{ ...participant, presente: true }] }} canManage onChanged={vi.fn()} />)
    const row = screen.getByRole('heading', { name: 'Ana Tribunal' }).closest('li')
    expect(within(row).getByRole('button', { name: 'Corregir asistencia' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Retirar participante' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Corregir asistencia' }).parentElement).toHaveClass('gap-2')
  })
})
