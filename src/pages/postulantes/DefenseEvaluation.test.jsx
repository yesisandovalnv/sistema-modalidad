import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DefenseEvaluation from './DefenseEvaluation'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: {
  registrarEvaluacionDefensa: vi.fn(),
  finalizarDefensa: vi.fn(),
  consolidarEvaluacionDefensa: vi.fn(),
  obtenerDefensa: vi.fn(),
} }))

const quorum = { data: { valido: true } }
function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const defense = (modalidad) => ({
  id: 9, tipo_evento: 'DEFENSA_PUBLICA', postulacion_modalidad_codigo: modalidad,
  estado: 'EN_CURSO', participantes: [{ id: 20, rol_evento: 'TRIBUNAL', activo: true, usuario_nombre: 'Tribunal' }], evaluaciones: [], resultado_consolidado: null,
})

const privateDefense = (modalidad = 'TESIS_GRADO') => ({
  ...defense(modalidad), tipo_evento: 'DEFENSA_PRIVADA', estado: 'FINALIZADA',
})

const profileDefense = (modalidad = 'PROYECTO_GRADO') => ({
  ...defense(modalidad), tipo_evento: 'DEFENSA_PERFIL',
})

describe('DefenseEvaluation por modalidad', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each(['66', '70', '71', '80', '90', '95', '100', '95.25'])('envia nota integra %s de Diplomado por consenso sobre cien', async (nota) => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={{ ...defense('GRADUACION_VIA_DIPLOMADO'), estado: 'FINALIZADA', configuracion_numerica: null }} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota pública (1–100)')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '100')
    expect(input).toHaveAttribute('step', '0.01')
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
    expect(screen.queryByText(/Nota privada|Nota de Defensa Privada/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ponderación|Aporte ponderado/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Modo')).not.toBeInTheDocument()
    await userEvent.type(input, nota)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar', exact: true }))
    await waitFor(() => expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'publica', {
      observaciones: '', modalidad_registro: 'CONSENSO', nota_publica: nota,
    }, expect.any(AbortSignal)))
    expect(postulacionesService.finalizarDefensa).not.toHaveBeenCalled()
    expect(postulacionesService.consolidarEvaluacionDefensa).not.toHaveBeenCalled()
  })

  it.each(['0', '100.01'])('bloquea en el formulario la nota %s fuera del rango de Diplomado', async (nota) => {
    render(<DefenseEvaluation defense={defense('GRADUACION_VIA_DIPLOMADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota pública (1–100)')
    await userEvent.type(input, nota)
    expect(input).toBeInvalid()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar', exact: true }))
    expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
  })

  it.each([
    ['DEFENSA_PRIVADA', 0, 30, '28,50'], ['DEFENSA_PUBLICA', 1, 70, '66,50'],
  ])('usa configuración numérica compartida de Tesis para %s y declara la semántica', async (type, min, weight, preview) => {
    const event = { ...defense('TESIS_GRADO'), tipo_evento: type,
      configuracion_numerica: { minimo: min, maximo: 100, ponderacion: weight, semantica_nota: 'BRUTA_100' } }
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    const onChanged = vi.fn()
    render(<DefenseEvaluation defense={event} quorum={quorum} canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText(new RegExp(`Nota de Defensa.*${min}–100`)), '95')
    expect(screen.getByText(`Aporte ponderado: ${preview} / ${weight}`)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar', exact: true }))
    await waitFor(() => expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, type === 'DEFENSA_PRIVADA' ? 'privada' : 'publica', expect.objectContaining({ nota: '95', semantica_nota: 'BRUTA_100', modalidad_registro: 'CONSENSO' }), expect.any(AbortSignal)))
  })

  it('muestra la nueva escala en individual sin duplicar el campo de nota', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={{ ...privateDefense(), configuracion_numerica: { minimo: 0, maximo: 100, ponderacion: 30, semantica_nota: 'BRUTA_100' } }} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.selectOptions(screen.getByLabelText('Modo'), 'INDIVIDUAL')
    expect(screen.getByLabelText('Nota individual (0–100)')).toBeVisible()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
    expect(screen.getByLabelText('Tribunal evaluador')).toBeVisible()
    await userEvent.type(screen.getByLabelText('Nota individual (0–100)'), '95')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar', exact: true }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'privada', expect.objectContaining({
      nota: '95', evaluador: '20', modalidad_registro: 'INDIVIDUAL', semantica_nota: 'BRUTA_100',
    }), expect.any(AbortSignal))
  })

  it('captura Defensa Pública de Proyecto en escala bruta 0--100 y muestra preview', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={{ ...defense('PROYECTO_GRADO'), configuracion_numerica: {
      minimo: 0, maximo: 100, ponderacion: 70, semantica_nota: 'BRUTA_100',
    } }} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota de Defensa Pública (0–100)')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
    await userEvent.type(input, '95')
    expect(screen.getByText('Ponderación en la nota final: 70%')).toBeInTheDocument()
    expect(screen.getByText('Aporte ponderado: 66,50 / 70')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'publica', {
      observaciones: '', modalidad_registro: 'CONSENSO', nota_publica: '95',
    }, expect.any(AbortSignal))
  })

  it('conserva la escala 0--30 en evaluaciones individuales de Defensa Privada de Tesis', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.selectOptions(screen.getByLabelText('Modo'), 'INDIVIDUAL')
    const input = screen.getByLabelText('Nota individual (0–30)')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '30')
    await userEvent.type(input, '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'privada', {
      observaciones: '', modalidad_registro: 'INDIVIDUAL', resultado: 'SUFICIENTE',
      evaluador: '20', nota: '25',
    }, expect.any(AbortSignal))
  })

  it('prepara 1--100 y payload técnico para Tesis sin imponer 48 horas', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={defense('TESIS_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota pública (1–100)')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '100')
    await userEvent.type(input, '100')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'publica', expect.objectContaining({ modalidad_registro: 'CONSENSO', nota: '100' }), expect.any(AbortSignal))
  })

  it('mantiene visible el campo de nota consensuada de Defensa Publica de Tesis', async () => {
    render(<DefenseEvaluation defense={defense('TESIS_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))

    expect(screen.getByRole('spinbutton', { name: /Nota pública/ })).toHaveClass('mt-1', 'w-full', 'rounded-md', 'border', 'p-2')
  })

  it('mantiene 1--100 en evaluaciones individuales de Defensa Pública de Tesis', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    const publicDefense = {
      ...defense('TESIS_GRADO'),
      participantes: [20, 21, 22].map((id) => ({
        id, rol_evento: 'TRIBUNAL', activo: true, usuario_nombre: `Tribunal ${id}`,
      })),
    }
    render(<DefenseEvaluation defense={publicDefense} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.selectOptions(screen.getByLabelText('Modo'), 'INDIVIDUAL')
    const input = screen.getByLabelText('Nota individual (1–100)')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '100')
    await userEvent.type(input, '80')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'publica', {
      observaciones: '', modalidad_registro: 'INDIVIDUAL', nota: '80', evaluador: '20',
    }, expect.any(AbortSignal))
  })

  it('registra la Defensa Pública de Trabajo Dirigido por consenso con nota bruta 1--100', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={defense('TRABAJO_DIRIGIDO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))

    const input = screen.getByLabelText('Nota de Defensa Pública (1–100)')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '100')
    expect(screen.queryByLabelText('Modo')).not.toBeInTheDocument()
    await userEvent.type(input, '95')
    expect(screen.getByText('Aporte ponderado: 66,50 / 70')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'publica', {
      observaciones: '', modalidad_registro: 'CONSENSO', nota_publica: '95',
    }, expect.any(AbortSignal))
  })

  it('registra Defensa Privada de Tesis en modo individual con el evaluador seleccionado', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.selectOptions(screen.getByLabelText('Modo'), 'INDIVIDUAL')
    await userEvent.selectOptions(screen.getByLabelText('Tribunal evaluador'), '20')
    await userEvent.type(screen.getByLabelText('Nota individual (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'privada', {
      observaciones: '', modalidad_registro: 'INDIVIDUAL', resultado: 'SUFICIENTE', evaluador: '20', nota: '25',
    }, expect.any(AbortSignal))
  })

  it('reanuda consenso y no permite cambiar a evaluaciones individuales', async () => {
    render(<DefenseEvaluation defense={{ ...privateDefense(), evaluaciones: [{
      id: 40, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO',
      resultado_cualitativo: 'SUFICIENTE', nota_numerica: '28.00',
    }] }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByText('Evaluación consensuada registrada')).toBeInTheDocument()
    expect(screen.getByText('Evaluación: Consenso del tribunal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar evaluación/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Consolidar resultado del evento' })).toBeInTheDocument()
  })

  it.each([1, 2])('reanuda %s evaluación individual y sólo permite continuar en modo individual', async (evaluationCount) => {
    const tribunals = [20, 21, 22].map((id) => ({
      id, rol_evento: 'TRIBUNAL', activo: true, usuario_nombre: `Tribunal ${id}`,
    }))
    const evaluations = tribunals.slice(0, evaluationCount).map((participant, index) => ({
      id: 40 + index, evaluador: participant.id, evaluador_nombre: participant.usuario_nombre,
      tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
      resultado_cualitativo: 'SUFICIENTE', nota_numerica: '20.00',
    }))
    render(<DefenseEvaluation defense={{
      ...privateDefense(), participantes: tribunals, evaluaciones: evaluations,
    }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByText(`${evaluationCount}/3 evaluaciones individuales registradas`)).toBeInTheDocument()
    for (const evaluation of evaluations) expect(screen.getByText(new RegExp(`${evaluation.evaluador_nombre} — Nota:`))).toBeInTheDocument()
    expect(screen.getByText(`Evaluadores pendientes: ${tribunals.slice(evaluationCount).map((participant) => participant.usuario_nombre).join(', ')}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar siguiente evaluación individual' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar siguiente evaluación individual' }))
    expect(screen.getByLabelText('Modo')).toHaveValue('INDIVIDUAL')
    expect(screen.getByLabelText('Modo')).toBeDisabled()
    expect(screen.getByRole('option', { name: `Tribunal ${tribunals[evaluationCount].id}` })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Por consenso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Consolidar resultado del evento' })).not.toBeInTheDocument()
  })

  it('con las tres evaluaciones individuales no permite registrar otra y permite consolidar si finalizó', async () => {
    const participants = [20, 21, 22].map((id) => ({ id, rol_evento: 'TRIBUNAL', activo: true, usuario_nombre: `Tribunal ${id}` }))
    const evaluations = participants.map((participant, index) => ({
      id: 40 + index, evaluador: participant.id, evaluador_nombre: participant.usuario_nombre,
      tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
      resultado_cualitativo: 'SUFICIENTE', nota_numerica: `${20 + index}.00`,
    }))
    render(<DefenseEvaluation defense={{
      ...privateDefense(), participantes: participants, evaluaciones: evaluations,
    }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByText('3/3 evaluaciones individuales registradas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar siguiente evaluación individual' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar evaluación/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Consolidar resultado del evento' })).toBeInTheDocument()
  })

  it('no ofrece consolidación individual antes de que finalice la defensa', () => {
    const participants = [20, 21, 22].map((id) => ({ id, rol_evento: 'TRIBUNAL', activo: true, usuario_nombre: `Tribunal ${id}` }))
    const evaluations = participants.map((participant, index) => ({
      id: 40 + index, evaluador: participant.id, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
      resultado_cualitativo: 'SUFICIENTE', nota_numerica: `${20 + index}.00`,
    }))
    render(<DefenseEvaluation defense={{
      ...privateDefense(), estado: 'EN_CURSO', participantes: participants, evaluaciones: evaluations,
    }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByText('3/3 evaluaciones individuales registradas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Consolidar resultado del evento' })).not.toBeInTheDocument()
  })

  it('muestra el resultado consolidado sin acciones para registrar o consolidar', () => {
    const result = { tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '24.00' }
    render(<DefenseEvaluation defense={{
      ...privateDefense(),
      evaluaciones: [{ id: 40, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL', evaluador: 20 }],
      resultado_consolidado: result,
    }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByText('Resultado consolidado')).toBeInTheDocument()
    expect(screen.getByText('Resultado académico: Suficiente')).toBeInTheDocument()
    expect(screen.getByText('Nota consolidada: 24.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar evaluación/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Consolidar resultado del evento' })).not.toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
    expect(postulacionesService.consolidarEvaluacionDefensa).not.toHaveBeenCalled()
  })

  it('reconcilia con el estado canónico tras un error ambiguo de registro', async () => {
    const evaluated = {
      ...privateDefense(),
      evaluaciones: [{
        id: 40, evaluador: 20, evaluador_nombre: 'Tribunal 20',
        tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
        resultado_cualitativo: 'SUFICIENTE', nota_numerica: '25.00',
      }],
    }
    postulacionesService.registrarEvaluacionDefensa.mockRejectedValue(new Error('La conexión se interrumpió.'))
    postulacionesService.obtenerDefensa.mockResolvedValue(evaluated)
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.selectOptions(screen.getByLabelText('Modo'), 'INDIVIDUAL')
    await userEvent.selectOptions(screen.getByLabelText('Tribunal evaluador'), '20')
    await userEvent.type(screen.getByLabelText('Nota individual (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('1/3 evaluaciones individuales registradas')).toBeInTheDocument()
    expect(screen.getByText(/Tribunal 20 — Nota:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar siguiente evaluación individual' })).toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(9, expect.any(AbortSignal))
  })

  it('reconcilia una consolidación ambigua y muestra el resultado canónico', async () => {
    const evaluations = [20, 21, 22].map((evaluador, index) => ({
      id: 40 + index, evaluador, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
      resultado_cualitativo: 'SUFICIENTE', nota_numerica: '24.00',
    }))
    const consolidated = {
      ...privateDefense(), evaluaciones: evaluations,
      resultado_consolidado: {
        tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '24.00',
      },
    }
    const onChanged = vi.fn()
    const onCompleted = vi.fn()
    postulacionesService.consolidarEvaluacionDefensa.mockRejectedValue(new Error('La conexión se interrumpió.'))
    postulacionesService.obtenerDefensa.mockResolvedValue(consolidated)
    render(<DefenseEvaluation defense={{
      ...privateDefense(), participantes: [20, 21, 22].map((id) => ({ id, rol_evento: 'TRIBUNAL', activo: true })), evaluaciones: evaluations,
    }} quorum={quorum} canManage onChanged={onChanged} onCompleted={onCompleted} />)

    await userEvent.click(screen.getByRole('button', { name: 'Consolidar resultado del evento' }))

    expect(await screen.findByText('Resultado consolidado')).toBeInTheDocument()
    expect(screen.getByText('Nota consolidada: 24.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Consolidar resultado del evento' })).not.toBeInTheDocument()
    expect(postulacionesService.consolidarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(9, expect.any(AbortSignal))
    expect(onChanged).toHaveBeenCalledWith(expect.any(AbortSignal), consolidated)
    expect(onCompleted).toHaveBeenCalledWith(consolidated)
  })

  it('conserva el bloqueo tras cancelar un registro incierto y permite reintentar sólo tras confirmar que no se guardó', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockRejectedValue(new Error('La conexión se interrumpió.'))
    postulacionesService.obtenerDefensa
      .mockRejectedValueOnce(new Error('No se pudo consultar el estado.'))
      .mockResolvedValue(privateDefense())
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar el estado real')
    expect(screen.getByRole('button', { name: 'Comprobar estado antes de reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: /registrar evaluación/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar estado antes de reintentar' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeEnabled()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)

    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '24')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(2))
  })

  it('conserva la recuperación si el registro se confirma pero falla onChanged', async () => {
    const savedDefense = {
      ...privateDefense(),
      evaluaciones: [{
        id: 41, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO',
        resultado_cualitativo: 'SUFICIENTE', nota_numerica: '25.00',
      }],
    }
    const onChanged = vi.fn()
      .mockRejectedValueOnce(new Error('No se pudo refrescar el expediente.'))
      .mockRejectedValueOnce(new Error('El segundo refresco también falló.'))
      .mockResolvedValue(undefined)
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    postulacionesService.obtenerDefensa.mockResolvedValue(savedDefense)
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={onChanged} />)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprobar estado antes de reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar evaluación/i })).not.toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(9, expect.any(AbortSignal))

    await userEvent.click(screen.getByRole('button', { name: 'Comprobar estado antes de reintentar' }))

    expect(await screen.findByText('Evaluación consensuada registrada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar evaluación/i })).not.toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledTimes(2)
    expect(onChanged).toHaveBeenCalledTimes(3)
  })

  it('ignora la respuesta canónica de una defensa anterior después de cambiar el ID', async () => {
    const canonicalRequest = deferred()
    const originalDefense = privateDefense()
    const nextDefense = { ...privateDefense(), id: 10 }
    const oldCanonicalDefense = {
      ...originalDefense,
      evaluaciones: [{
        id: 51, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO',
        resultado_cualitativo: 'SUFICIENTE', nota_numerica: '25.00',
      }],
    }
    const onChanged = vi.fn()
    postulacionesService.registrarEvaluacionDefensa.mockRejectedValue(new Error('La conexión se interrumpió.'))
    postulacionesService.obtenerDefensa.mockReturnValue(canonicalRequest.promise)
    const view = render(<DefenseEvaluation defense={originalDefense} quorum={quorum} canManage onChanged={onChanged} />)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(9, expect.any(AbortSignal)))

    view.rerender(<DefenseEvaluation defense={nextDefense} quorum={quorum} canManage onChanged={onChanged} />)
    await act(async () => canonicalRequest.resolve(oldCanonicalDefense))

    expect(screen.queryByText('Evaluación consensuada registrada')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrar evaluación/i })).toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledTimes(1)
  })

  it('no ejecuta el callback anterior si el registro termina después de cambiar el ID', async () => {
    const registration = deferred()
    const originalOnChanged = vi.fn()
    const nextOnChanged = vi.fn()
    const view = render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={originalOnChanged} />)
    postulacionesService.registrarEvaluacionDefensa.mockReturnValue(registration.promise)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    view.rerender(<DefenseEvaluation defense={{ ...privateDefense(), id: 10 }} quorum={quorum} canManage onChanged={nextOnChanged} />)
    await act(async () => registration.resolve({}))

    expect(originalOnChanged).not.toHaveBeenCalled()
    expect(nextOnChanged).not.toHaveBeenCalled()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(
      9, 'privada', expect.objectContaining({ modalidad_registro: 'CONSENSO', nota: '25' }), expect.any(AbortSignal),
    )
  })

  it('invalida la solicitud al desmontar y no ejecuta callbacks posteriores', async () => {
    const registration = deferred()
    const onChanged = vi.fn()
    postulacionesService.registrarEvaluacionDefensa.mockReturnValue(registration.promise)
    const view = render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={onChanged} />)

    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    const requestSignal = postulacionesService.registrarEvaluacionDefensa.mock.calls[0][3]
    expect(requestSignal.aborted).toBe(false)

    view.unmount()
    expect(requestSignal.aborted).toBe(true)
    await act(async () => registration.resolve({}))

    expect(onChanged).not.toHaveBeenCalled()
    expect(requestSignal.aborted).toBe(true)
  })

  it.each(['0', '25', '30'])('envía la nota privada consensuada válida %s para Tesis', async (nota) => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota privada (0–30)')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '30')
    await userEvent.type(input, nota)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'privada', {
      observaciones: '', modalidad_registro: 'CONSENSO', resultado: 'SUFICIENTE', nota,
    }, expect.any(AbortSignal))
  })

  it.each([
    ['', 'La nota privada es obligatoria.'],
    ['-0.01', 'La nota privada debe estar entre 0 y 30.'],
    ['30.01', 'La nota privada debe estar entre 0 y 30.'],
  ])('bloquea una nota privada consensuada inválida (%s)', async (nota, message) => {
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota privada (0–30)')
    if (nota) await userEvent.type(input, nota)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
  })

  it('muestra el error nota_numerica del backend debajo de Nota privada', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockRejectedValue({
      message: 'Revisa los datos.', fields: { nota_numerica: ['La nota privada de Tesis debe estar entre 0 y 30.'] },
    })
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada (0–30)'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(await screen.findByText('La nota privada de Tesis debe estar entre 0 y 30.')).toBeInTheDocument()
  })

  it('captura Defensa Privada de Proyecto sobre 100 y no envía el aporte del preview', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={privateDefense('PROYECTO_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota de Defensa Privada (0–100)')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
    await userEvent.type(input, '85')
    expect(screen.getByText('Ponderación en la nota final: 30%')).toBeInTheDocument()
    expect(screen.getByText('Aporte ponderado: 25,50 / 30')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'privada', {
      observaciones: '', modalidad_registro: 'CONSENSO', resultado: 'SUFICIENTE', nota_privada: '85',
    }, expect.any(AbortSignal))
  })

  it('captura Defensa Privada de Trabajo Dirigido sobre 100 y muestra el aporte ponderado', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={privateDefense('TRABAJO_DIRIGIDO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota de Defensa Privada (0–100)')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
    await userEvent.type(input, '85')
    expect(screen.getByText('Aporte ponderado: 25,50 / 30')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'privada', {
      observaciones: '', modalidad_registro: 'CONSENSO', resultado: 'SUFICIENTE', nota_privada: '85',
    }, expect.any(AbortSignal))
  })

  it.each(['', '-0.01', '100.01'])('bloquea una nota privada inválida de Trabajo Dirigido (%s)', async (nota) => {
    render(<DefenseEvaluation defense={privateDefense('TRABAJO_DIRIGIDO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota de Defensa Privada (0–100)')
    if (nota) await userEvent.type(input, nota)
    expect(input).toBeInvalid()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
  })

  it('explica que Perfil de Proyecto registra un único consenso sin evaluador individual', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={profileDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))

    expect(screen.getByText('Evaluación consensuada del Tribunal')).toBeInTheDocument()
    expect(screen.getByText(/Registra una única decisión conjunta de los tribunales presentes/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Tribunal evaluador')).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Suficiente' })).toHaveValue('SUFICIENTE')
    expect(screen.getByRole('option', { name: 'Insuficiente' })).toHaveValue('INSUFICIENTE')

    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'INSUFICIENTE')
    await userEvent.type(screen.getByLabelText('Observaciones'), 'Decisión conjunta')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'perfil', {
      observaciones: 'Decisión conjunta', modalidad_registro: 'CONSENSO', resultado: 'INSUFICIENTE',
    }, expect.any(AbortSignal))
  })

  it.each([
    ['SUFICIENTE', 'Suficiente'],
    ['INSUFICIENTE', 'Insuficiente'],
  ])('muestra el estado de evaluación Perfil consensuada existente (%s)', async (resultado, resultadoVisible) => {
    render(<DefenseEvaluation defense={{ ...profileDefense(), evaluaciones: [{ id: 30, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: resultado }] }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Registrar evaluación consensuada' })).not.toBeInTheDocument()
    expect(screen.getByText('Evaluación consensuada registrada')).toBeInTheDocument()
    expect(screen.getByText(`Resultado académico: ${resultadoVisible}`)).toBeInTheDocument()
  })

  it.each([
    ['SUFICIENTE', 'Suficiente'],
    ['INSUFICIENTE', 'Insuficiente'],
  ])('oculta la acción cuando ya existe una evaluación privada consensuada (%s)', async (resultado, resultadoVisible) => {
    render(<DefenseEvaluation defense={{ ...privateDefense(), evaluaciones: [{ id: 40, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: resultado, nota_numerica: 28 }] }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Registrar evaluación consensuada' })).not.toBeInTheDocument()
    expect(screen.getByText('Evaluación consensuada registrada')).toBeInTheDocument()
    expect(screen.getByText(`Resultado académico: ${resultadoVisible}`)).toBeInTheDocument()
  })

  it('no confunde un RESULTADO_FINAL con la evaluación ordinaria de Perfil', async () => {
    render(<DefenseEvaluation defense={{ ...profileDefense(), evaluaciones: [{ id: 31, tipo_evaluacion: 'RESULTADO_FINAL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: true, resultado_cualitativo: 'SUFICIENTE' }] }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Registrar evaluación consensuada' })).toBeInTheDocument()
    expect(screen.queryByText('Evaluación consensuada registrada')).not.toBeInTheDocument()
  })

  it('no confunde un RESULTADO_FINAL con la evaluación ordinaria de Privada', async () => {
    render(<DefenseEvaluation defense={{ ...privateDefense(), evaluaciones: [{ id: 32, tipo_evaluacion: 'RESULTADO_FINAL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: true, resultado_cualitativo: 'SUFICIENTE' }] }} quorum={quorum} canManage onChanged={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Registrar evaluación' })).toBeInTheDocument()
    expect(screen.queryByText('Evaluación consensuada registrada')).not.toBeInTheDocument()
  })

  it('notifica completion después de consolidar el flujo general', async () => {
    const onChanged = vi.fn()
    const onCompleted = vi.fn()
    const finalizedDefense = {
      ...privateDefense('TRABAJO_DIRIGIDO'),
      evaluaciones: [{ id: 40, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 }],
    }
    postulacionesService.consolidarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={finalizedDefense} quorum={quorum} canManage onChanged={onChanged} onCompleted={onCompleted} />)

    await userEvent.click(screen.getByRole('button', { name: 'Consolidar resultado del evento' }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1))
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('no muestra la explicación contextual de Proyecto en otras modalidades', async () => {
    render(<DefenseEvaluation defense={profileDefense('TESIS_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    expect(screen.queryByText('Evaluación consensuada del Tribunal')).not.toBeInTheDocument()
  })

  it('abre el flujo rápido único para Perfil sin duplicar acciones de recuperación', async () => {
    const baseDefense = {
      ...profileDefense(),
      participantes: [{ id: 10, rol_evento: 'TRIBUNAL', activo: true, presente: true, usuario_nombre: 'Tribunal 1' }],
    }

    render(<DefenseEvaluation defense={baseDefense} quorum={quorum} canManage onChanged={vi.fn()} projectProfileFlow />)

    await userEvent.click(screen.getByRole('button', { name: 'Registrar resultado de la defensa' }))
    const flow = screen.getByRole('dialog', { name: 'Registrar resultado de la defensa' })

    expect(within(flow).getByRole('button', { name: 'Registrar resultado y finalizar' })).toBeInTheDocument()
    expect(within(flow).getByText('Resultado *')).toBeInTheDocument()
    expect(within(flow).getByText('Observaciones')).toBeInTheDocument()
    expect(within(flow).getByText('(opcional)')).toBeInTheDocument()
    expect(within(flow).queryByRole('button', { name: 'Registrar evaluación consensuada' })).not.toBeInTheDocument()
  })

  it('mantiene la evaluación estándar de Defensa Privada de Tesis aunque se solicite el flujo de Proyecto', async () => {
    const baseDefense = {
      ...privateDefense(),
      estado: 'EN_CURSO',
      participantes: [{ id: 10, rol_evento: 'TRIBUNAL', activo: true, presente: true, usuario_nombre: 'Tribunal 1' }],
    }

    render(<DefenseEvaluation defense={baseDefense} quorum={quorum} canManage onChanged={vi.fn()} projectProfileFlow />)

    expect(screen.getByRole('button', { name: 'Registrar evaluación' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar resultado de la defensa' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar evaluación' }))
    expect(screen.getByLabelText('Modo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Registrar resultado de la defensa' })).not.toBeInTheDocument()
  })

  it('completa en orden el flujo rápido de Perfil y refresca el padre solamente al final', async () => {
    const operations = []
    const baseDefense = { ...profileDefense(), participantes: [{ id: 10, rol_evento: 'TRIBUNAL', activo: true, presente: true, usuario_nombre: 'Tribunal 1' }] }
    const evaluated = { ...baseDefense, evaluaciones: [{ id: 30, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'INSUFICIENTE', observaciones: 'Requiere ajustes' }] }
    const finalized = { ...evaluated, estado: 'FINALIZADA' }
    const consolidated = { ...finalized, resultado_consolidado: { id: 31, tipo_evaluacion: 'RESULTADO_FINAL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: true, resultado_cualitativo: 'INSUFICIENTE' } }
    postulacionesService.obtenerDefensa
      .mockImplementationOnce(async () => { operations.push('refresh-inicial'); return baseDefense })
      .mockImplementationOnce(async () => { operations.push('refresh-evaluacion'); return evaluated })
      .mockImplementationOnce(async () => { operations.push('refresh-finalizacion'); return finalized })
      .mockImplementationOnce(async () => { operations.push('refresh-consolidacion'); return consolidated })
    postulacionesService.registrarEvaluacionDefensa.mockImplementation(async () => { operations.push('registrar'); return evaluated.evaluaciones[0] })
    postulacionesService.finalizarDefensa.mockImplementation(async () => { operations.push('finalizar'); return finalized })
    postulacionesService.consolidarEvaluacionDefensa.mockImplementation(async () => { operations.push('consolidar'); return consolidated.resultado_consolidado })
    const onChanged = vi.fn(async () => { operations.push('refresh-padre') })
    const onCompleted = vi.fn()
    const view = render(<DefenseEvaluation defense={baseDefense} quorum={quorum} canManage onChanged={onChanged} onCompleted={onCompleted} projectProfileFlow />)

    await userEvent.click(screen.getByRole('button', { name: 'Registrar resultado de la defensa' }))
    const flow = screen.getByRole('dialog', { name: 'Registrar resultado de la defensa' })
    await userEvent.click(within(flow).getByRole('radio', { name: 'Insuficiente' }))
    await userEvent.type(within(flow).getByLabelText(/Observaciones/), 'Requiere ajustes')
    await userEvent.click(within(flow).getByRole('button', { name: 'Registrar resultado y finalizar' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(onCompleted).toHaveBeenCalledTimes(1)
    expect(operations).toEqual(['refresh-inicial', 'registrar', 'refresh-evaluacion', 'finalizar', 'refresh-finalizacion', 'consolidar', 'refresh-consolidacion', 'refresh-padre'])
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(9, 'perfil', { observaciones: 'Requiere ajustes', modalidad_registro: 'CONSENSO', resultado: 'INSUFICIENTE' }, expect.any(AbortSignal))
    expect(postulacionesService.finalizarDefensa).toHaveBeenCalledWith(9, expect.any(AbortSignal))
    expect(postulacionesService.consolidarEvaluacionDefensa).toHaveBeenCalledWith(9, expect.any(AbortSignal))
    view.rerender(<DefenseEvaluation defense={consolidated} quorum={{ data: null, loading: true }} canManage onChanged={onChanged} projectProfileFlow />)
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.finalizarDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.consolidarEvaluacionDefensa).toHaveBeenCalledTimes(1)
  })

  it('reanuda desde la finalización después de un fallo parcial sin duplicar la evaluación', async () => {
    const baseDefense = { ...profileDefense(), participantes: [{ id: 10, rol_evento: 'TRIBUNAL', activo: true, presente: true, usuario_nombre: 'Tribunal 1' }] }
    const evaluated = { ...baseDefense, evaluaciones: [{ id: 30, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'SUFICIENTE' }] }
    const finalized = { ...evaluated, estado: 'FINALIZADA' }
    const consolidated = { ...finalized, resultado_consolidado: { id: 31, tipo_evaluacion: 'RESULTADO_FINAL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: true, resultado_cualitativo: 'SUFICIENTE' } }
    postulacionesService.obtenerDefensa
      .mockResolvedValueOnce(baseDefense)
      .mockResolvedValueOnce(evaluated)
      .mockResolvedValueOnce(evaluated)
      .mockResolvedValueOnce(evaluated)
      .mockResolvedValueOnce(evaluated)
      .mockResolvedValueOnce(finalized)
      .mockResolvedValueOnce(consolidated)
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue(evaluated.evaluaciones[0])
    postulacionesService.finalizarDefensa.mockRejectedValueOnce({ message: 'No se pudo finalizar temporalmente.' }).mockResolvedValueOnce(finalized)
    postulacionesService.consolidarEvaluacionDefensa.mockResolvedValue(consolidated.resultado_consolidado)
    const onChanged = vi.fn()
    const onCompleted = vi.fn()
    render(<DefenseEvaluation defense={baseDefense} quorum={quorum} canManage onChanged={onChanged} onCompleted={onCompleted} projectProfileFlow />)

    await userEvent.click(screen.getByRole('button', { name: 'Registrar resultado de la defensa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar resultado y finalizar' }))
    expect(await screen.findByText('No se pudo finalizar temporalmente.')).toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.finalizarDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.consolidarEvaluacionDefensa).not.toHaveBeenCalled()
    expect(onCompleted).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Comprobar estado y continuar' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.finalizarDefensa).toHaveBeenCalledTimes(2)
    expect(postulacionesService.consolidarEvaluacionDefensa).toHaveBeenCalledTimes(1)
    expect(onCompleted).toHaveBeenCalledTimes(1)
  })
})
