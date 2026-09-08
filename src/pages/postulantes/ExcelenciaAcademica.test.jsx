import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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