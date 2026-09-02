import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TechnicalClosure from './TechnicalClosure'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: { obtenerCierre: vi.fn() },
}))

const closure = (etapa_actual) => ({
  data: {
    estado_general: 'EN_PROCESO',
    etapa_actual,
    revision_final_aprobada: false,
    cierre_documental_aprobado: false,
    condiciones_faltantes: [],
    entregas_faltantes: [],
    documentos_faltantes: [],
    advertencias_normativas: [],
  },
  error: '',
})

describe('TechnicalClosure', () => {
  it('refleja cada nueva fuente de cierre recibida sin conservar copias obsoletas', () => {
    const view = render(<TechnicalClosure postulacion={7} initialClosure={closure('DEFENSA_PRIVADA')} resultado={{ data: {} }} />)
    const card = screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement
    expect(within(card).getByText('DEFENSA_PRIVADA')).toBeInTheDocument()

    view.rerender(<TechnicalClosure postulacion={7} initialClosure={closure('DEFENSA_PUBLICA')} resultado={{ data: {} }} />)
    expect(within(card).getByText('DEFENSA_PUBLICA')).toBeInTheDocument()
    expect(within(card).queryByText('DEFENSA_PRIVADA')).not.toBeInTheDocument()

    view.rerender(<TechnicalClosure postulacion={7} initialClosure={closure('REVISION_FINAL_POST_PUBLICA')} resultado={{ data: {} }} />)
    expect(within(card).getByText('REVISION_FINAL_POST_PUBLICA')).toBeInTheDocument()
    expect(within(card).queryByText('DEFENSA_PUBLICA')).not.toBeInTheDocument()
  })
})
