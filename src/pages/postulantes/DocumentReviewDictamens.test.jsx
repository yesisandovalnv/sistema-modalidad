import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentReviewDictamens from './DocumentReviewDictamens'
import { postulacionesService } from '../../services/postulacionesService'

vi.mock('../../services/postulacionesService', () => ({ postulacionesService: { obtenerDictamenesRevision: vi.fn(), registrarDictamenRevision: vi.fn() } }))

const documents = { data: { results: [
  { tipo_documento_codigo: 'DOCUMENTO_FINAL', versiones: [{ id: 101, numero_version: 2, es_version_actual: true, activo: true }] },
  { tipo_documento_codigo: 'INFORME_TUTOR_TESIS', versiones: [{ id: 102, numero_version: 1, es_version_actual: true, activo: true, nombre_original: 'informe-tutor.pdf' }] },
  { tipo_documento_codigo: 'INFORME_TRIB_TESIS', versiones: [{ id: 103, numero_version: 1, es_version_actual: true, activo: true, nombre_original: 'informe-tribunal.pdf' }] },
] } }
const assignments = { data: { results: [{ id: 22, tipo_participacion: 'TUTOR', activo: true, usuario_nombre: 'Dra. Tutor' }] } }
const stage = (codigo) => ({ id: codigo === 'REVISION_TUTOR' ? 7 : 8, codigo, estado: 'EN_PROCESO' })

describe('DocumentReviewDictamens', () => {
  const contextualResources = () => ({
    docs: { data: { count: 3, results: documents.data.results.map((item) => ({ ...item, postulacion: 53, activo: true })) }, loading: false, error: '' },
    actors: { data: { count: 1, results: assignments.data.results.map((item) => ({ ...item, postulacion: 53 })) }, loading: false, error: '' },
  })
  const renderBridge = async ({ change, history = [], denied = false, error = false, type = 'TUTOR' } = {}) => {
    const resources = contextualResources()
    if (type === 'TRIBUNAL') resources.actors.data = { count: 3, results: [1, 2, 3].map((order) => ({
      id: 50 + order, usuario: 100 + order, postulacion: 53, tipo_participacion: 'TRIBUNAL', activo: true,
      etapa_codigo: 'TEMATICA_TESIS', seguimiento_etapa: 155, orden_cargo: order,
    })) }
    change?.(resources)
    if (error) postulacionesService.obtenerDictamenesRevision.mockRejectedValueOnce({ message: 'Error de consulta' })
    else postulacionesService.obtenerDictamenesRevision.mockResolvedValueOnce(history)
    const bridge = { open: null }
    const register = vi.fn((open) => { bridge.open = open })
    const view = render(<><button onClick={(event) => bridge.open?.(event)}>Abrir desde Resumen</button><div data-testid="hidden-documents" hidden><DocumentReviewDictamens stage={{ ...stage(type === 'TUTOR' ? 'REVISION_TUTOR' : 'REVISION_TRIBUNAL'), activo: true }} documents={resources.docs} assignments={resources.actors} canManage={!denied} onChanged={vi.fn()} contextualPostulacion={53} onRegisterContextualOpen={register} /></div></>)
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    return { ...view, bridge, register }
  }

  it.each([
    ['sin evidencia', (r) => { r.docs.data.results[2] = { ...r.docs.data.results[2], versiones: [] } }],
    ['composición incompleta', (r) => { r.actors.data.results.pop(); r.actors.data.count = 2 }],
    ['integrante inactivo', (r) => { r.actors.data.results[0].activo = false }],
    ['otra postulación', (r) => { r.actors.data.results[0].postulacion = 99 }],
    ['otra etapa', (r) => { r.actors.data.results[0].etapa_codigo = 'PERFIL_PROYECTO' }],
    ['orden duplicado', (r) => { r.actors.data.results[0].orden_cargo = 2 }],
    ['docente repetido', (r) => { r.actors.data.results[0].usuario = 102 }],
    ['sin identificación', (r) => { delete r.actors.data.results[0].usuario }],
    ['sin versión vigente', (r) => { r.docs.data.results[0] = { ...r.docs.data.results[0], versiones: [] } }],
    ['error de actores', (r) => { r.actors.error = 'Error de consulta' }],
  ])('Tribunal contextual: conserva fallback con %s', async (_label, change) => {
    await renderBridge({ type: 'TRIBUNAL', change })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it.each([
    [{ id: 1, tipo_revision: 'TRIBUNAL', activo: true, version_documento_revisada: 101, resultado: 'SUFICIENTE' }, false],
    [{ id: 1, tipo_revision: 'TRIBUNAL', activo: true, version_documento_revisada: 101, resultado: 'INSUFICIENTE' }, false],
    [{ id: 1, tipo_revision: 'TRIBUNAL', activo: false, version_documento_revisada: 101, resultado: 'INSUFICIENTE' }, true],
    [{ id: 1, tipo_revision: 'TRIBUNAL', activo: true, version_documento_revisada: 99, resultado: 'INSUFICIENTE' }, true],
  ])('Tribunal contextual: distingue dictamen actual, histórico y otra versión %j', async (item, allowed) => {
    await renderBridge({ type: 'TRIBUNAL', history: [item] })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    if (allowed) expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeVisible()
    else expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('Tribunal contextual: abre una sola instancia, conserva cancelación, Escape y foco, sin emisor individual', async () => {
    await renderBridge({ type: 'TRIBUNAL' })
    const trigger = screen.getByRole('button', { name: 'Abrir desde Resumen' })
    await userEvent.dblClick(trigger)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeVisible()
    expect(screen.queryByLabelText('Tutor')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeEnabled()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('acepta el Tribunal de Perfil de Tesis para el dictamen de Tribunal', async () => {
    await renderBridge({ type: 'TRIBUNAL', change: (r) => {
      r.actors.data.results.forEach((item) => { item.etapa_codigo = 'PERFIL_TESIS' })
    } })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeVisible()
  })

  it('Tribunal contextual: permite abrir sin informe confirmado, pero mantiene evidencia vacía y envío deshabilitado', async () => {
    await renderBridge({ type: 'TRIBUNAL', change: (r) => {
      r.docs.data.results = r.docs.data.results.filter((item) => item.tipo_documento_codigo !== 'INFORME_TRIB_TESIS')
      r.docs.data.count = r.docs.data.results.length
    } })
    const trigger = screen.getByRole('button', { name: 'Abrir desde Resumen' })
    await userEvent.dblClick(trigger)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const evidence = screen.getByLabelText('Evidencia')
    expect(evidence).toHaveValue('')
    expect(evidence.options).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it.each(['TUTOR', 'TRIBUNAL'])('puente contextual: no confunde ausencia documental con paginación incompleta para %s', async (type) => {
    await renderBridge({ type, change: (r) => {
      const code = type === 'TUTOR' ? 'INFORME_TUTOR_TESIS' : 'INFORME_TRIB_TESIS'
      r.docs.data.results = r.docs.data.results.filter((item) => item.tipo_documento_codigo !== code)
      if (type === 'TUTOR') r.docs.data.count = r.docs.data.results.length
    } })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('puente contextual: reutiliza el formulario fuera del panel oculto, sin registrar y con foco de retorno', async () => {
    const { unmount, register } = await renderBridge()
    expect(getComputedStyle(screen.getByTestId('hidden-documents')).display).toBe('none')
    const trigger = screen.getByRole('button', { name: 'Abrir desde Resumen' })
    await userEvent.dblClick(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(postulacionesService.obtenerDictamenesRevision).toHaveBeenCalledTimes(1)
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    unmount()
    expect(register).toHaveBeenLastCalledWith(null)
  })

  it.each([
    ['sin documento final', (r) => { r.docs.data.results = r.docs.data.results.slice(1); r.docs.data.count = 2 }],
    ['versión no vigente', (r) => { r.docs.data.results[0] = { ...r.docs.data.results[0], versiones: [{ id: 101, activo: true, es_version_actual: false }] } }],
    ['versión inactiva', (r) => { r.docs.data.results[0] = { ...r.docs.data.results[0], versiones: [{ id: 101, activo: false, es_version_actual: true }] } }],
    ['sin evidencia', (r) => { r.docs.data.results[1] = { ...r.docs.data.results[1], versiones: [] } }],
    ['documento ajeno', (r) => { r.docs.data.results[0].postulacion = 99 }],
    ['tutor ajeno', (r) => { r.actors.data.results[0].postulacion = 99 }],
    ['sin tutor', (r) => { r.actors.data.results = []; r.actors.data.count = 0 }],
    ['tutor inactivo', (r) => { r.actors.data.results[0].activo = false }],
    ['documentos paginados', (r) => { r.docs.data.count = 40 }],
    ['actores paginados', (r) => { r.actors.data.count = 40 }],
    ['error documental', (r) => { r.docs.error = 'Error' }],
    ['actores cargando', (r) => { r.actors.loading = true }],
    ['documentos ambiguos', (r) => { r.docs.data.results.push({ ...r.docs.data.results[0] }); r.docs.data.count = 4 }],
  ])('puente contextual: rechaza datos %s sin alterar el formulario manual', async (_label, change) => {
    await renderBridge({ change })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(screen.getByText('Registrar dictamen', { selector: 'button' })).toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it.each(['SUFICIENTE', 'INSUFICIENTE'])('puente contextual: no reemplaza un dictamen activo %s sobre la versión actual', async (resultado) => {
    await renderBridge({ history: [{ id: 1, tipo_revision: 'TUTOR', activo: true, version_documento_revisada: 101, resultado }] })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
  })

  it.each([{ activo: false, version_documento_revisada: 101 }, { activo: true, version_documento_revisada: 99 }])('puente contextual: permite nuevo registro con histórico u otra versión %j', async (history) => {
    await renderBridge({ history: [{ id: 1, tipo_revision: 'TUTOR', resultado: 'INSUFICIENTE', ...history }] })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tutor' })).toBeVisible()
  })

  it.each([{ denied: true }, { error: true }])('puente contextual: rechaza falta de permiso o error de dictámenes %j', async (options) => {
    await renderBridge(options)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir desde Resumen' }))
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
  })
  beforeEach(() => { vi.clearAllMocks(); postulacionesService.obtenerDictamenesRevision.mockResolvedValue([]); postulacionesService.registrarDictamenRevision.mockResolvedValue({ id: 1 }) })
  it('registra el dictamen del Tutor sobre la versión vigente con su evidencia', async () => {
    const changed = vi.fn().mockResolvedValue(); render(<DocumentReviewDictamens stage={stage('REVISION_TUTOR')} documents={documents} assignments={assignments} canManage onChanged={changed} />)
    await screen.findByText('Dictamen del Tutor'); await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tutor' })).toBeInTheDocument()
    expect(screen.getByText('Documento Final: versión 2')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Tutor'), '22'); await userEvent.selectOptions(screen.getByLabelText('Evidencia'), '102'); await userEvent.type(screen.getByLabelText('Observaciones'), 'Aprobado')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(7, { tipo_revision: 'TUTOR', version_documento_revisada: 101, evidencia_version: 102, resultado: 'SUFICIENTE', observaciones: 'Aprobado', asignacion_emisora: 22 }, expect.any(AbortSignal)))
    expect(changed).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Dictamen del Tutor' })).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Registrar dictamen' })))
  })
  it('registra Tribunal, preserva el histórico y muestra un error backend', async () => {
    postulacionesService.obtenerDictamenesRevision.mockResolvedValue([{ id: 1, tipo_revision: 'TRIBUNAL', resultado: 'INSUFICIENTE', version_documento_revisada: 99, evidencia_version: 90, evidencia_version_nombre: 'informe-anterior.pdf', activo: false, observaciones: 'Corregir' }])
    postulacionesService.registrarDictamenRevision.mockRejectedValue({ message: 'La evidencia no es vigente.', status: 400 })
    render(<DocumentReviewDictamens stage={stage('REVISION_TRIBUNAL')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    expect(await screen.findByText('Histórico')).toBeInTheDocument(); expect(screen.getByText('Evidencia: informe-anterior.pdf')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' })); expect(screen.getAllByRole('dialog')).toHaveLength(1); await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'INSUFICIENTE'); await userEvent.selectOptions(screen.getByLabelText('Evidencia'), '103'); await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La evidencia no es vigente.')
    expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(8, expect.objectContaining({ tipo_revision: 'TRIBUNAL', version_documento_revisada: 101, evidencia_version: 103, resultado: 'INSUFICIENTE' }), expect.any(AbortSignal))
  })
  it('cancela el modal sin registrar y Escape lo cierra', async () => {
    render(<DocumentReviewDictamens stage={stage('REVISION_TRIBUNAL')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    await screen.findByText('Dictamen del Tribunal')
    const opener = screen.getByRole('button', { name: 'Registrar dictamen' })
    await userEvent.click(opener)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Dictamen del Tribunal' })).not.toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(opener))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it.each([
    ['deshabilitado', (opener) => { opener.disabled = true }],
    ['desmontado', (opener) => { opener.remove() }],
  ])('no restaura el foco al disparador %s', async (_description, invalidateOpener) => {
    render(<DocumentReviewDictamens stage={stage('REVISION_TUTOR')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    await screen.findByText('Dictamen del Tutor')
    const opener = screen.getByRole('button', { name: 'Registrar dictamen' })
    await userEvent.click(opener)
    invalidateOpener(opener)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Dictamen del Tutor' })).not.toBeInTheDocument()
    expect(document.activeElement).not.toBe(opener)
  })
  it('evita doble envío y no muestra controles fuera de la etapa de dictamen', async () => {
    let resolve; postulacionesService.registrarDictamenRevision.mockReturnValue(new Promise((done) => { resolve = done }))
    const { rerender } = render(<DocumentReviewDictamens stage={stage('REVISION_TUTOR')} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    await screen.findByText('Dictamen del Tutor'); await userEvent.click(screen.getByRole('button', { name: 'Registrar dictamen' })); await userEvent.selectOptions(screen.getByLabelText('Tutor'), '22'); await userEvent.selectOptions(screen.getByLabelText('Evidencia'), '102')
    const form = screen.getByRole('button', { name: 'Registrar' }); await userEvent.click(form); fireEvent.click(form); expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Registrando…' })).toBeDisabled(); resolve({})
    rerender(<DocumentReviewDictamens stage={{ id: 9, codigo: 'PERFIL_PROYECTO', estado: 'EN_PROCESO' }} documents={documents} assignments={assignments} canManage onChanged={vi.fn()} />)
    expect(screen.queryByText('Dictamen del Tutor')).not.toBeInTheDocument()
  })
})
