import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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
  it('muestra cinco módulos y registra una nota', async () => {
    postulacionesService.registrarNotaDiplomado.mockResolvedValue({})
    render(<Diplomado postulacion="7" diplomado={diplomado} etapaCodigo="TALLER_INVESTIGACION" canManage onChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '5. Taller de Investigación' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Módulo'), '5')
    await userEvent.type(screen.getByLabelText('Nota'), '66')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar nota' }))
    expect(postulacionesService.registrarNotaDiplomado).toHaveBeenCalledWith('7', { modulo: '5', nota: '66' })
  })
})
