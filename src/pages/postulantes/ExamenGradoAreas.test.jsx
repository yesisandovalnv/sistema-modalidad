import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ExamenGradoAreas from './ExamenGradoAreas'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { registrarEvaluacionExamen: vi.fn(), concluirExamenGrado: vi.fn() } }))

const examen = {
  tribunales: [{ id: 11, nombre: 'Tribunal Uno' }],
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

  it('ofrece conclusión solo con resultado completo y en etapa de conclusión', async () => {
    postulacionesService.concluirExamenGrado.mockResolvedValue({})
    render(<ExamenGradoAreas postulacion="7" examen={{ ...examen, resultado_final: { completo: true, nota_final: '61.00' } }} etapaCodigo="CONCLUSION_ACADEMICA" canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Concluir académicamente' }))
    expect(postulacionesService.concluirExamenGrado).toHaveBeenCalledWith('7')
  })
})