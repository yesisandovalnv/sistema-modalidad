import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import TrabajoDirigido from './TrabajoDirigido'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    configurarInstitucionTrabajoDirigido: vi.fn(),
    registrarInformeTrabajoDirigido: vi.fn(),
    concluirTrabajoDirigido: vi.fn(),
  },
}))

const trabajo = { institucion: null, informes: [], reglas: { ponderacion_privada: 30, ponderacion_publica: 70 } }

describe('TrabajoDirigido', () => {
  it('registra institución externa y exige datos normativos visibles', async () => {
    postulacionesService.configurarInstitucionTrabajoDirigido.mockResolvedValue({})
    render(<TrabajoDirigido postulacion="9" trabajo={trabajo} etapaCodigo="INSCRIPCION" canManage onChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Trabajo Dirigido' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Institución'), 'Empresa Pública')
    await userEvent.type(screen.getByLabelText('Supervisor institucional'), 'Ing. Responsable')
    await userEvent.click(screen.getByLabelText('Legalmente constituida'))
    await userEvent.click(screen.getByLabelText('Actividad activa y permanente'))
    await userEvent.click(screen.getByLabelText('Convenio vigente'))
    await userEvent.type(screen.getByLabelText('Fecha de firma'), '2026-08-01')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar institución' }))
    expect(postulacionesService.configurarInstitucionTrabajoDirigido).toHaveBeenCalledWith('9', expect.objectContaining({
      institucion_nombre: 'Empresa Pública', supervisor_nombre: 'Ing. Responsable', convenio_vigente: true,
    }))
  })

  it('muestra y registra informes periódicos durante desarrollo', async () => {
    postulacionesService.registrarInformeTrabajoDirigido.mockResolvedValue({})
    render(<TrabajoDirigido postulacion="9" trabajo={{ ...trabajo, institucion: { institucion_nombre: 'Entidad', supervisor_nombre: 'Supervisor', institucion_tipo: 'PUBLICA', tipo_ejecucion: 'INTERNO' } }} etapaCodigo="DESARROLLO_TRABAJO_DIRIGIDO" canManage onChanged={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Periodo'), 'Agosto')
    await userEvent.type(screen.getByLabelText('descripcion desempeno'), 'Buen desempeño')
    await userEvent.type(screen.getByLabelText('evaluacion cualitativa'), 'Suficiente')
    await userEvent.type(screen.getByLabelText('aporte laboral'), 'Automatización')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe' }))
    expect(postulacionesService.registrarInformeTrabajoDirigido).toHaveBeenCalledWith('9', expect.objectContaining({ periodo: 'Agosto' }))
  })
})
