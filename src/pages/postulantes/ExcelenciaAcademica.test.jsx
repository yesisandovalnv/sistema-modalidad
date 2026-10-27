import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ExcelenciaAcademica from './ExcelenciaAcademica'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    configurarExcelenciaAcademica: vi.fn(),
    registrarEvaluacionExcelencia: vi.fn(),
    concluirExcelenciaAcademica: vi.fn(),
  },
}))

const base = {
  criterios: [
    { codigo: 'RENDIMIENTO_ACADEMICO', nombre: 'Rendimiento académico' },
    { codigo: 'RECONOCIMIENTO_CALIDAD', nombre: 'Reconocimiento a la calidad' },
  ],
  resultado: { estado: 'PENDIENTE', promedio_general: null },
  documentos_requeridos: ['CARTA_SOLICITUD_EXCELENCIA'],
}

describe('ExcelenciaAcademica', () => {
  beforeEach(() => vi.clearAllMocks())

  it('formaliza solo tras pulsar la operación existente y refleja el estado concluido', async () => {
    const onChanged = vi.fn()
    const excellence = { ...base, criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'FAVORABLE', promedio_general: '100.00' } }
    postulacionesService.concluirExcelenciaAcademica.mockResolvedValue({})
    const { rerender } = render(<ExcelenciaAcademica postulacion="7" excelencia={excellence} etapaCodigo="CONCLUSION_ACADEMICA" conclusionAprobada canManage resultView onChanged={onChanged} />)
    expect(screen.getByText(/Falta formalizar/)).toBeVisible()
    expect(postulacionesService.concluirExcelenciaAcademica).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Concluir académicamente' }))
    expect(postulacionesService.concluirExcelenciaAcademica).toHaveBeenCalledExactlyOnceWith('7')
    expect(onChanged).toHaveBeenCalledTimes(1)
    rerender(<ExcelenciaAcademica postulacion="7" excelencia={excellence} etapaCodigo="CONCLUSION_ACADEMICA" conclusionAprobada concluida canManage resultView onChanged={onChanged} />)
    expect(screen.getByText('La conclusión de la postulación está formalizada.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
  })

  it('conserva el resultado visible sin permitir formalización a quien no administra', () => {
    render(<ExcelenciaAcademica postulacion="7" excelencia={{ ...base, criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'FAVORABLE', promedio_general: '100.00' } }} etapaCodigo="CONCLUSION_ACADEMICA" conclusionAprobada resultView onChanged={vi.fn()} />)
    expect(screen.getByText('100.00')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirExcelenciaAcademica).not.toHaveBeenCalled()
  })
  it('selecciona y persiste el criterio normativo', async () => {
    postulacionesService.configurarExcelenciaAcademica.mockResolvedValue({})
    const onChanged = vi.fn()
    render(<ExcelenciaAcademica postulacion="7" excelencia={base} canManage onChanged={onChanged} />)
    await userEvent.selectOptions(screen.getByLabelText('Criterio'), 'RECONOCIMIENTO_CALIDAD')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar criterio' }))
    expect(postulacionesService.configurarExcelenciaAcademica).toHaveBeenCalledWith('7', 'RECONOCIMIENTO_CALIDAD')
  })

  it('solicita promedio solo para rendimiento académico', async () => {
    postulacionesService.registrarEvaluacionExcelencia.mockResolvedValue({})
    render(<ExcelenciaAcademica postulacion="7" excelencia={{ ...base, criterio: 'RENDIMIENTO_ACADEMICO' }} etapaCodigo="EVALUACION_TRIBUNAL" canManage onChanged={vi.fn()} />)
    expect(screen.getByLabelText(/Promedio general/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Promedio general/), '80')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar evaluación' }))
    expect(postulacionesService.registrarEvaluacionExcelencia).toHaveBeenCalledWith('7', { resultado: 'FAVORABLE', promedio_general: '80', observaciones: '' })
  })
})
