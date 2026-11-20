import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProjectGradeDirectResult from './ProjectGradeDirectResult'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: { registrarResultadoDirectoDefensa: vi.fn() },
}))

describe('ProjectGradeDirectResult', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['DEFENSA_TEMATICA', { resultado: 'SUFICIENTE', observaciones: '' }],
    ['DEFENSA_PERFIL', { resultado: 'SUFICIENTE', observaciones: '' }],
    ['DEFENSA_PRIVADA', { resultado: 'SUFICIENTE', nota: '85', observaciones: '' }],
    ['DEFENSA_PUBLICA', { resultado: '', nota: '85', observaciones: '' }],
  ])('registra directamente %s con su contrato académico', async (tipo, expected) => {
    const defense = { id: 41, tipo_evento: tipo, estado: 'PROGRAMADA', evaluaciones: [] }
    const updated = { ...defense, estado: 'FINALIZADA', resultado_consolidado: { resultado_cualitativo: expected.resultado } }
    postulacionesService.registrarResultadoDirectoDefensa.mockResolvedValue(updated)
    const onChanged = vi.fn()
    const onCompleted = vi.fn()
    render(<ProjectGradeDirectResult defense={defense} canManage thesisGrade={tipo === 'DEFENSA_TEMATICA'} compositionValidation={tipo === 'DEFENSA_TEMATICA' ? { cumple: true, conflictos_identidad: [], requisitos: [] } : undefined} onChanged={onChanged} onCompleted={onCompleted} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado y finalizar' }))
    if (tipo !== 'DEFENSA_PUBLICA') fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
    if (!['DEFENSA_TEMATICA', 'DEFENSA_PERFIL'].includes(tipo)) fireEvent.change(screen.getByLabelText(/Nota bruta/), { target: { value: '85' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    await waitFor(() => expect(postulacionesService.registrarResultadoDirectoDefensa).toHaveBeenCalledWith(
      41, expected, expect.any(AbortSignal), ...(tipo === 'DEFENSA_TEMATICA' ? [{ includeFieldErrors: true }] : []),
    ))
    expect(onChanged).toHaveBeenCalledWith(updated)
    expect(onCompleted).toHaveBeenCalledWith(updated)
  })

  it('envía la escala específica elegida para Tesis Privada', async () => {
    const defense = {
      id: 51, tipo_evento: 'DEFENSA_PRIVADA', estado: 'PROGRAMADA', evaluaciones: [],
      configuracion_numerica: { minimo: 0, maximo: 30, ponderacion: 30, semantica_nota: 'MODALIDAD_ESPECIFICA' },
    }
    postulacionesService.registrarResultadoDirectoDefensa.mockResolvedValue({ ...defense, estado: 'FINALIZADA' })
    render(<ProjectGradeDirectResult defense={defense} canManage thesisGrade compositionValidation={{ cumple: true, conflictos_identidad: [], requisitos: [] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado y finalizar' }))
    fireEvent.change(screen.getByLabelText(/Nota \(0–30\)/), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }))
    await waitFor(() => expect(postulacionesService.registrarResultadoDirectoDefensa).toHaveBeenCalledWith(
      51,
      { resultado: 'SUFICIENTE', observaciones: '', nota: '25', semantica_nota: 'MODALIDAD_ESPECIFICA' },
      expect.any(AbortSignal),
      { includeFieldErrors: true },
    ))
  })

  it.each([
    [{ usuario_nombre: 'Raúl', cargos: ['Tribunal 1', 'Tutor'] }, 'Tribunal 1, Tutor'],
    [{ usuario_nombre: 'Willian', cargos: ['Tribunal 2', 'Tribunal 3'] }, 'Tribunal 2, Tribunal 3'],
  ])('bloquea resultado directo y explica los cargos repetidos', (conflict, cargoText) => {
    const defense = { id: 61, tipo_evento: 'DEFENSA_PERFIL', estado: 'PROGRAMADA', evaluaciones: [] }
    render(<ProjectGradeDirectResult
      defense={defense}
      canManage
      thesisGrade
      compositionValidation={{ cumple: false, conflictos_identidad: [conflict], requisitos: [] }}
    />)

    expect(screen.getByRole('alert')).toHaveTextContent(conflict.usuario_nombre)
    expect(screen.getByRole('alert')).toHaveTextContent(cargoText)
    expect(screen.getByRole('button', { name: 'Registrar resultado y finalizar' })).toBeDisabled()
    expect(postulacionesService.registrarResultadoDirectoDefensa).not.toHaveBeenCalled()
  })

  it('oculta el registro directo para eventos ya finalizados', () => {
    render(<ProjectGradeDirectResult defense={{ id: 42, tipo_evento: 'DEFENSA_PERFIL', estado: 'FINALIZADA', evaluaciones: [] }} canManage />)
    expect(screen.queryByRole('button', { name: 'Registrar resultado y finalizar' })).not.toBeInTheDocument()
  })

  it('muestra una salida controlada y permite regresar cuando la defensa es nula', () => {
    const onClose = vi.fn()
    render(<ProjectGradeDirectResult defense={null} canManage thesisGrade onClose={onClose} />)

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la defensa')
    fireEvent.click(screen.getByRole('button', { name: 'Volver al expediente' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(postulacionesService.registrarResultadoDirectoDefensa).not.toHaveBeenCalled()
  })

  it.each([
    ['evaluaciones ausentes', { id: 43, tipo_evento: 'DEFENSA_PERFIL', estado: 'PROGRAMADA' }],
    ['evaluaciones con forma inválida', { id: 44, tipo_evento: 'DEFENSA_PERFIL', estado: 'PROGRAMADA', evaluaciones: {} }],
    ['evaluaciones con elemento inválido', { id: 46, tipo_evento: 'DEFENSA_PERFIL', estado: 'PROGRAMADA', evaluaciones: [null] }],
    ['tipo de evento desconocido', { id: 45, tipo_evento: 'OTRO', estado: 'PROGRAMADA', evaluaciones: [] }],
    ['identificador ausente', { tipo_evento: 'DEFENSA_PERFIL', estado: 'PROGRAMADA', evaluaciones: [] }],
  ])('no habilita el registro si los datos están incompletos (%s)', (_label, defense) => {
    render(<ProjectGradeDirectResult defense={defense} canManage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Faltan datos válidos')
    expect(screen.queryByRole('button', { name: 'Registrar resultado y finalizar' })).not.toBeInTheDocument()
    expect(postulacionesService.registrarResultadoDirectoDefensa).not.toHaveBeenCalled()
  })
})
