import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ExamenGradoAreas from './ExamenGradoAreas'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { registrarEvaluacionExamen: vi.fn(), concluirExamenGrado: vi.fn() } }))

const examen = {
  tribunales: [{ id: 11, nombre: 'Tribunal Uno' }],
  composicion: { completa: true, evaluable: true, faltantes: [], inconsistencias: [] },
  areas: [{ codigo: 'AREA_1', nombre: 'Área 1', ponderacion: '15.00', estado: 'PENDIENTE', intento_actual: 1, evaluaciones: [] }],
  resultado_final: { nota_final: null },
}

describe('ExamenGradoAreas', () => {
  it('muestra áreas y registra una nota válida', async () => {
    postulacionesService.registrarEvaluacionExamen.mockResolvedValue({})
    render(<ExamenGradoAreas postulacion="7" examen={examen} canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar evaluación' }))
    await userEvent.selectOptions(screen.getByLabelText('Tribunal evaluador'), '11')
    await userEvent.type(screen.getByLabelText('Nota (0–100)'), '61')
    await userEvent.click(screen.getAllByRole('button', { name: 'Registrar evaluación' })[1])
    expect(postulacionesService.registrarEvaluacionExamen).toHaveBeenCalledWith('7', 'AREA_1', { nota: '61', evaluador: '11', modalidad_registro: 'INDIVIDUAL', observaciones: '' })
  })

  it('ofrece conclusión con resultado completo en etapa de conclusión', async () => {
    postulacionesService.concluirExamenGrado.mockResolvedValue({})
    render(<ExamenGradoAreas postulacion="7" examen={{ ...examen, resultado_final: { completo: true, nota_final: '61.00' } }} etapaCodigo="CONCLUSION_ACADEMICA" canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Concluir académicamente' }))
    expect(postulacionesService.concluirExamenGrado).toHaveBeenCalledWith('7')
  })

  it('mantiene la conclusión disponible sin etapa actual, evita llamadas duplicadas y refresca', async () => {
    let resolveConclusion
    postulacionesService.concluirExamenGrado.mockReturnValue(new Promise((resolve) => { resolveConclusion = resolve }))
    const onChanged = vi.fn()
    render(<ExamenGradoAreas
      postulacion="7"
      examen={{ ...examen, resultado_final: { completo: true, nota_final: '94.25' } }}
      etapaCodigo={null}
      postulacionConcluida={false}
      canManage
      onChanged={onChanged}
    />)

    const button = screen.getByRole('button', { name: 'Concluir académicamente' })
    await userEvent.click(button)
    await userEvent.click(button)
    expect(postulacionesService.concluirExamenGrado).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()

    resolveConclusion({})
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  })

  it.each([
    ['postulación concluida', { completo: true, nota_final: '94.25' }, true],
    ['resultado incompleto', { completo: false, nota_final: null }, false],
  ])('no ofrece conclusión con %s', (_case, resultadoFinal, postulacionConcluida) => {
    render(<ExamenGradoAreas
      postulacion="7"
      examen={{ ...examen, resultado_final: resultadoFinal }}
      etapaCodigo={null}
      postulacionConcluida={postulacionConcluida}
      canManage
      onChanged={vi.fn()}
    />)
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
  })

  it('distingue el resultado consolidado del área y el resultado individual', () => {
    render(<ExamenGradoAreas postulacion="7" examen={{
      ...examen,
      areas: [{
        ...examen.areas[0],
        estado: 'APROBADA',
        evaluaciones: [{ id: 21, nota: '50.00', resultado: 'INSUFICIENTE', modalidad_registro: 'INDIVIDUAL' }],
      }],
    }} canManage={false} onChanged={vi.fn()} />)
    expect(screen.getByText('Resultado del área: APROBADA')).toBeInTheDocument()
    expect(screen.getByText('Nota: 50.00/100 · Resultado individual: INSUFICIENTE')).toBeInTheDocument()
  })

  it('muestra pendientes y deriva a actores sin ofrecer evaluación cuando la composición bloquea', () => {
    render(<ExamenGradoAreas postulacion="7" examen={{
      ...examen,
      composicion: {
        completa: false,
        evaluable: false,
        faltantes: [{ codigo: 'SECRETARIO', nombre: 'Secretario' }],
        inconsistencias: ['Falta completar la composición.'],
      },
    }} canManage onChanged={vi.fn()} />)
    expect(screen.getByText('Pendientes: Secretario.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Falta completar la composición.')
    expect(screen.getByRole('link', { name: 'Gestionar actores' })).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Registrar evaluación' })).not.toBeInTheDocument()
  })
})
