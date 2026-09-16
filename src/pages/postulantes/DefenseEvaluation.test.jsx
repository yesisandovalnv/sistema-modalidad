import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DefenseEvaluation from './DefenseEvaluation'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { registrarEvaluacionDefensa: vi.fn() } }))

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
  beforeEach(() => vi.clearAllMocks())

  it('conserva 0--70 para Proyecto de Grado', async () => {
    render(<DefenseEvaluation defense={defense('PROYECTO_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    const input = screen.getByLabelText('Nota pública (0–70)')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '70')
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

  it('mantiene la nota_privada existente para otras modalidades', async () => {
    render(<DefenseEvaluation defense={privateDefense('PROYECTO_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    expect(screen.getByLabelText('Nota privada (0–30)')).toHaveAttribute('name', 'nota_privada')
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

  it('no muestra la explicación contextual de Proyecto en otras modalidades', async () => {
    render(<DefenseEvaluation defense={profileDefense('TESIS_GRADO')} quorum={quorum} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /registrar evaluación/i }))
    expect(screen.queryByText('Evaluación consensuada del Tribunal')).not.toBeInTheDocument()
  })
})
