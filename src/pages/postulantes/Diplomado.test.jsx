import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Diplomado from './Diplomado'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { registrarNotaDiplomado: vi.fn(), concluirDiplomado: vi.fn() } }))

const diplomado = {
  modulos: [
    { orden: 1, nombre: 'Módulo 1', estado: 'PENDIENTE', nota: null },
    { orden: 2, nombre: 'Módulo 2', estado: 'PENDIENTE', nota: null },
    { orden: 3, nombre: 'Módulo 3', estado: 'PENDIENTE', nota: null },
    { orden: 4, nombre: 'Módulo 4', estado: 'PENDIENTE', nota: null },
    { orden: 5, nombre: 'Taller de Investigación', estado: 'PENDIENTE', nota: null },
  ],
}

describe('Diplomado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('muestra el formulario vacío y registra únicamente el módulo actual sin duplicar envíos', async () => {
    let resolveRequest
    postulacionesService.registrarNotaDiplomado.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    render(<Diplomado postulacion="7" diplomado={diplomado} etapaCodigo="MODULO_1" canManage onChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Registrar resultado de módulo' })).toBeInTheDocument()
    expect(screen.getByText('Módulo actual')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nota'), '66')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar nota' }))
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Guardando…' }))
    expect(postulacionesService.registrarNotaDiplomado).toHaveBeenCalledTimes(1)
    resolveRequest({ modulo: 1, nota: '66.00', estado: 'APROBADO' })
    expect(await screen.findByRole('status')).toHaveTextContent('Resultado guardado correctamente.')
    expect(screen.getByText('66.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar nota' })).not.toBeInTheDocument()
  })

  it.each([
    ['APROBADO', '90.00'],
    ['REPROBADO', '65.00'],
  ])('presenta un resultado %s y permite abrir y cancelar su actualización', async (estado, nota) => {
    const data = { ...diplomado, modulos: diplomado.modulos.map((item) => item.orden === 1 ? { ...item, estado, nota } : item) }
    render(<Diplomado postulacion="7" diplomado={data} etapaCodigo="MODULO_1" canManage onChanged={vi.fn()} />)
    const result = screen.getByRole('heading', { name: 'Resultado de Módulo 1' }).closest('section')
    expect(within(result).getByText(nota)).toBeInTheDocument()
    expect(within(result).getByText(estado)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nota')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar nota' }))
    expect(screen.getByLabelText('Nota')).toHaveValue(Number(nota))
    expect(screen.getByText('Al guardar, la nueva calificación reemplazará la nota anterior.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByLabelText('Nota')).not.toBeInTheDocument()
  })

  it('solicita confirmación antes de sobrescribir y conserva el formulario si se cancela', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const data = { ...diplomado, modulos: diplomado.modulos.map((item) => item.orden === 1 ? { ...item, estado: 'APROBADO', nota: '90.00' } : item) }
    render(<Diplomado postulacion="7" diplomado={data} etapaCodigo="MODULO_1" canManage onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar nota' }))
    await userEvent.clear(screen.getByLabelText('Nota'))
    await userEvent.type(screen.getByLabelText('Nota'), '95')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar nota' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('reemplazará la nota anterior'))
    expect(postulacionesService.registrarNotaDiplomado).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nota')).toHaveValue(95)
    confirm.mockRestore()
  })

  it('actualiza, recarga y muestra el resultado persistido con éxito', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onChanged = vi.fn()
    const data = { ...diplomado, modulos: diplomado.modulos.map((item) => item.orden === 1 ? { ...item, estado: 'APROBADO', nota: '90.00' } : item) }
    postulacionesService.registrarNotaDiplomado.mockResolvedValue({ modulo: 1, nota: '95.00', estado: 'APROBADO' })
    render(<Diplomado postulacion="7" diplomado={data} etapaCodigo="MODULO_1" canManage onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar nota' }))
    await userEvent.clear(screen.getByLabelText('Nota'))
    await userEvent.type(screen.getByLabelText('Nota'), '95')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar nota' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('status')).toHaveTextContent('Resultado guardado correctamente.')
    expect(screen.getByText('95.00')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nota')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('mantiene el formulario y muestra el error cuando falla el guardado', async () => {
    postulacionesService.registrarNotaDiplomado.mockRejectedValue(new Error('No se pudo guardar'))
    render(<Diplomado postulacion="7" diplomado={diplomado} etapaCodigo="MODULO_1" canManage onChanged={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Nota'), '90')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar nota' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
    expect(screen.getByLabelText('Nota')).toHaveValue(90)
  })

  it('deja al estudiante y a los módulos cerrados únicamente en consulta', () => {
    const data = { ...diplomado, modulos: diplomado.modulos.map((item) => item.orden === 1 ? { ...item, estado: 'APROBADO', nota: '100.00' } : item) }
    const { rerender } = render(<Diplomado postulacion="7" diplomado={data} etapaCodigo="MODULO_1" canManage={false} onChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Resultado de Módulo 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actualizar nota' })).not.toBeInTheDocument()

    rerender(<Diplomado postulacion="7" diplomado={data} etapaCodigo="MODULO_2" canManage onChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '1. Módulo 1' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resultado de Módulo 1' })).not.toBeInTheDocument()
  })
})
