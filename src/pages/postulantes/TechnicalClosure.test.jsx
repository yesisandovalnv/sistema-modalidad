import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TechnicalClosure from './TechnicalClosure'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerCierre: vi.fn(),
    aprobarRevisionFinal: vi.fn(),
    aprobarCierreDocumental: vi.fn(),
    concluirPostulacion: vi.fn(),
    reabrirCierre: vi.fn(),
  },
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
  beforeEach(() => vi.clearAllMocks())

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

  it.each([
    ['Aprobar revisión final', 'aprobarRevisionFinal', { puede_aprobar_revision_final: true }, false],
    ['Aprobar cierre documental', 'aprobarCierreDocumental', { revision_final_aprobada: true, puede_aprobar_cierre: true }, false],
    ['Concluir técnicamente', 'concluirPostulacion', { cierre_documental_aprobado: true, puede_concluir: true }, false],
    ['Reabrir cierre', 'reabrirCierre', { cierre_documental_aprobado: true }, true],
  ])('comunica al padre el resultado canónico al ejecutar %s', async (button, method, overrides, requiresValue) => {
    const initialClosure = closure('REVISION_FINAL_POST_PUBLICA')
    Object.assign(initialClosure.data, overrides)
    const updatedClosure = { ...initialClosure.data, concluida: method === 'concluirPostulacion' }
    postulacionesService[method].mockResolvedValue(updatedClosure)
    const onChanged = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<TechnicalClosure postulacion={7} initialClosure={initialClosure} resultado={{ data: {} }} canManage onChanged={onChanged} />)

    await userEvent.click(screen.getByRole('button', { name: button }))
    if (requiresValue) await userEvent.type(screen.getByLabelText('Motivo'), 'Corrección documental')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onChanged).toHaveBeenCalledWith(updatedClosure)
  })
})
