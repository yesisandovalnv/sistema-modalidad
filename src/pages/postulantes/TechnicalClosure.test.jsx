import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TechnicalClosure from './TechnicalClosure'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', async (importOriginal) => ({
  ...await importOriginal(),
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

  it('presenta todos los faltantes con etiquetas, contadores y advertencias adicionales sin duplicados', () => {
    const initialClosure = closure('CIERRE_DOCUMENTAL')
    Object.assign(initialClosure.data, {
      condiciones_faltantes: ['PLAN_ESTUDIOS', 'ADMISION_COMPLETA', 'SOLVENCIA_UNIVERSITARIA', 'SOLVENCIA_BIBLIOTECA', 'MATRICULA_VIGENTE', 'PLAZO_MAXIMO'],
      entregas_faltantes: ['CD_RESPALDO', 'EJEMPLARES_IMPRESOS', 'TIMBRE_UNIVERSITARIO'],
      documentos_faltantes: ['ACTA_DEFENSA'],
      advertencias_normativas: [
        'CONDICION:PLAN_ESTUDIOS', 'ENTREGA:CD_RESPALDO', 'DOCUMENTO:ACTA_DEFENSA',
        'La cantidad normativa de EJEMPLARES_IMPRESOS permanece pendiente; no se calcula automáticamente.',
        'ACTA_DEFENSA no está configurada como TipoDocumento inequívoco.',
        'DOCUMENTO:HOJA_APROBACION',
        'CONDICION:PLAN_ESTUDIOS requiere verificación institucional.',
        'Advertencia crítica: verificar firmas originales.',
      ],
    })
    const original = structuredClone(initialClosure)
    render(<TechnicalClosure postulacion={7} initialClosure={initialClosure} resultado={{ data: { nota_final: 95, clasificacion: 'APROBACION_PLENA_CON_FELICITACION' } }} stages={[
      { codigo: 'CIERRE_DOCUMENTAL', nombre: 'Cierre documental', cerrada_por_nombre: 'María Pérez' },
      { codigo: 'REVISION_FINAL_POST_PUBLICA', cerrada_por_nombre: 'Juan López' },
    ]} />)

    expect(screen.getByText('En proceso')).toBeVisible()
    expect(within(screen.getByText('Etapa actual').parentElement).getByText('Cierre documental')).toBeVisible()
    expect(within(screen.getByText('Revisión final').parentElement).getByText('Pendiente')).toBeVisible()
    expect(within(screen.getByText('Cierre documental', { selector: 'dt' }).parentElement).getByText('Pendiente')).toBeVisible()
    expect(screen.getByText('Aprobación plena con felicitación')).toBeVisible()
    expect(screen.getByText('95')).toBeVisible()
    expect(screen.getByText('María Pérez')).toBeVisible()
    expect(screen.getByText('Juan López')).toBeVisible()
    const conditions = screen.getByRole('region', { name: 'Condiciones pendientes' })
    expect(within(conditions).getByText('6')).toBeVisible()
    expect(within(conditions).getAllByRole('listitem').map((item) => item.textContent.replace('•', ''))).toEqual([
      'Plan de estudios', 'Admisión completa', 'Solvencia universitaria', 'Solvencia de biblioteca', 'Matrícula vigente', 'Plazo máximo',
    ])
    const deliveries = screen.getByRole('region', { name: 'Entregas pendientes' })
    expect(within(deliveries).getByText('3')).toBeVisible()
    expect(within(deliveries).getAllByRole('listitem')).toHaveLength(3)
    expect(within(deliveries).getByText('CD de respaldo')).toBeVisible()
    expect(within(deliveries).getByText('Ejemplares impresos')).toBeVisible()
    expect(within(deliveries).getByText('Timbre universitario')).toBeVisible()
    const documents = screen.getByRole('region', { name: 'Documentos pendientes' })
    expect(within(documents).getByText('1')).toBeVisible()
    expect(within(documents).getByText('Acta de Defensa')).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Advertencias normativas' })).not.toBeInTheDocument()
    expect(screen.queryByText('El cierre registrado en el sistema corresponde al cierre técnico/documental del expediente y no sustituye el acta oficial, firmas, legalización, titulación ni procesamiento universitario posterior.')).not.toBeInTheDocument()
    expect(screen.queryByText('La cantidad normativa de Ejemplares impresos permanece pendiente; no se calcula automáticamente.')).not.toBeInTheDocument()
    expect(initialClosure.data.advertencias_normativas).toContain('La cantidad normativa de EJEMPLARES_IMPRESOS permanece pendiente; no se calcula automáticamente.')
    expect(screen.queryByText('CONDICION:PLAN_ESTUDIOS', { exact: true })).not.toBeInTheDocument()
    expect(initialClosure).toEqual(original)
  })

  it('puede ocultar nota final y clasificación repetidas sin ocultar datos operativos', () => {
    render(<TechnicalClosure
      postulacion={7}
      initialClosure={closure('CIERRE_DOCUMENTAL')}
      resultado={{ data: { nota_final: 95, clasificacion: 'APROBACION_PLENA_CON_FELICITACION' } }}
      stages={[{ codigo: 'CIERRE_DOCUMENTAL', nombre: 'Cierre documental' }]}
      showAcademicResult={false}
    />)

    expect(screen.queryByText('Nota final')).not.toBeInTheDocument()
    expect(screen.queryByText('Aprobación plena con felicitación')).not.toBeInTheDocument()
    expect(screen.getByText('En proceso')).toBeVisible()
    expect(screen.getByText('Cierre documental', { selector: 'dd' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Documentos pendientes' })).toBeVisible()
  })

  it('resume pendientes para Proyecto de Grado sin duplicar condiciones ni entregas', () => {
    const initialClosure = closure('CIERRE_DOCUMENTAL')
    Object.assign(initialClosure.data, {
      condiciones_faltantes: ['PLAN_ESTUDIOS'],
      entregas_faltantes: ['EJEMPLARES_IMPRESOS'],
      documentos_faltantes: ['ACTA_DEFENSA', 'INFORME_FINAL'],
    })
    render(<TechnicalClosure postulacion={7} initialClosure={initialClosure} compactPendingSummary />)

    expect(screen.queryByRole('region', { name: 'Condiciones pendientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Entregas pendientes' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Documentos pendientes' })).toHaveTextContent('2')
    expect(screen.queryByText('Acta de Defensa')).not.toBeInTheDocument()
    expect(screen.queryByText('Informe final')).not.toBeInTheDocument()
    expect(initialClosure.data.condiciones_faltantes).toEqual(['PLAN_ESTUDIOS'])
    expect(initialClosure.data.entregas_faltantes).toEqual(['EJEMPLARES_IMPRESOS'])
    expect(initialClosure.data.documentos_faltantes).toEqual(['ACTA_DEFENSA', 'INFORME_FINAL'])
  })

  it('omite solo las advertencias ya representadas y conserva los grupos vacíos', () => {
    const initialClosure = closure(null)
    initialClosure.data.documentos_faltantes = ['ACTA_DEFENSA']
    initialClosure.data.advertencias_normativas = ['DOCUMENTO:ACTA_DEFENSA']
    render(<TechnicalClosure postulacion={7} initialClosure={initialClosure} resultado={{ data: { nota_final: 0 } }} />)
    expect(screen.queryByRole('region', { name: 'Advertencias normativas' })).not.toBeInTheDocument()
    expect(screen.getByText('Todas las condiciones técnicas están cumplidas.')).toBeVisible()
    expect(screen.getByText('Todas las entregas técnicas están completas.')).toBeVisible()
    expect(screen.getByText('Sin etapa pendiente')).toBeVisible()
    expect(screen.getAllByText('0')).toHaveLength(3)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('respeta permisos y capacidades y permite cancelar sin enviar cambios', async () => {
    const initialClosure = closure('CIERRE_DOCUMENTAL')
    initialClosure.data.puede_concluir = true
    const view = render(<TechnicalClosure postulacion={7} initialClosure={initialClosure} canManage={false} />)
    expect(screen.queryByRole('button', { name: 'Concluir técnicamente' })).not.toBeInTheDocument()
    view.rerender(<TechnicalClosure postulacion={7} initialClosure={initialClosure} canManage />)
    expect(screen.queryByRole('button', { name: 'Reabrir cierre' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Concluir técnicamente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirPostulacion).not.toHaveBeenCalled()
  })

  it('refleja cada nueva fuente de cierre recibida sin conservar copias obsoletas', () => {
    const view = render(<TechnicalClosure postulacion={7} initialClosure={closure('DEFENSA_PRIVADA')} resultado={{ data: {} }} />)
    const card = screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement
    expect(within(card).getByText('Defensa privada')).toBeInTheDocument()

    view.rerender(<TechnicalClosure postulacion={7} initialClosure={closure('DEFENSA_PUBLICA')} resultado={{ data: {} }} />)
    expect(within(card).getByText('Defensa Pública')).toBeInTheDocument()
    expect(within(card).queryByText('Defensa privada')).not.toBeInTheDocument()

    view.rerender(<TechnicalClosure postulacion={7} initialClosure={closure('REVISION_FINAL_POST_PUBLICA')} resultado={{ data: {} }} />)
    expect(within(card).getByText('Revisión final posterior a la Defensa Pública')).toBeInTheDocument()
    expect(within(card).queryByText('Defensa Pública')).not.toBeInTheDocument()
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
