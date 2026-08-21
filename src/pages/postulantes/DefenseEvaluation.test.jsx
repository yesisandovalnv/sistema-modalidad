import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DefenseEvaluation from './DefenseEvaluation'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { registrarEvaluacionDefensa: vi.fn() } }))

const quorum = { data: { valido: true } }
const defense = (modalidad) => ({
  id: 9, tipo_evento: 'DEFENSA_PUBLICA', postulacion_modalidad_codigo: modalidad,
  estado: 'EN_CURSO', participantes: [{ id: 20, rol_evento: 'TRIBUNAL', activo: true, usuario_nombre: 'Tribunal' }], evaluaciones: [], resultado_consolidado: null,
})

describe('DefenseEvaluation por modalidad', () => {
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
})
