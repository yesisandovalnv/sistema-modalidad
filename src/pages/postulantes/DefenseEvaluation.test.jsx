import { render, screen, waitFor, within } from '@testing-library/react'
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

  it('captura Defensa Pública de Proyecto en escala bruta 0--100 y muestra preview', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={defense('PROYECTO_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
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

  it.each(['0', '30'])('envía la nota privada consensuada válida %s para Tesis', async (nota) => {
    postulacionesService.registrarEvaluacionDefensa.mockResolvedValue({})
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota privada')
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
    const input = screen.getByLabelText('Nota privada')
    if (nota) await userEvent.type(input, nota)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
  })

  it('muestra el error nota_numerica del backend debajo de Nota privada', async () => {
    postulacionesService.registrarEvaluacionDefensa.mockRejectedValue({
      message: 'Revisa los datos.', fields: { nota_numerica: ['La escala numérica provisional de la Defensa Privada es 0 a 30.'] },
    })
    render(<DefenseEvaluation defense={privateDefense()} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    await userEvent.type(screen.getByLabelText('Nota privada'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(await screen.findByText('La escala numérica provisional de la Defensa Privada es 0 a 30.')).toBeInTheDocument()
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

  it('conserva 0--30 para Defensa Privada de Trabajo Dirigido', async () => {
    render(<DefenseEvaluation defense={privateDefense('TRABAJO_DIRIGIDO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    expect(screen.getByLabelText('Nota privada (0–30)')).toHaveAttribute('max', '30')
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

    expect(screen.getByRole('button', { name: 'Registrar evaluación consensuada' })).toBeInTheDocument()
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

  it('abre el flujo rápido único para Defensa Privada y exige la nota privada antes de finalizar', async () => {
    const baseDefense = {
      ...privateDefense(),
      estado: 'EN_CURSO',
      participantes: [{ id: 10, rol_evento: 'TRIBUNAL', activo: true, presente: true, usuario_nombre: 'Tribunal 1' }],
    }

    render(<DefenseEvaluation defense={baseDefense} quorum={quorum} canManage onChanged={vi.fn()} projectProfileFlow />)

    await userEvent.click(screen.getByRole('button', { name: 'Registrar resultado de la defensa' }))
    const flow = screen.getByRole('dialog', { name: 'Registrar resultado de la defensa' })

    expect(within(flow).getByRole('button', { name: 'Registrar resultado y finalizar' })).toBeInTheDocument()
    expect(within(flow).getByLabelText('Nota privada')).toBeInTheDocument()
    expect(within(flow).queryByRole('button', { name: 'Registrar evaluación consensuada' })).not.toBeInTheDocument()
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
