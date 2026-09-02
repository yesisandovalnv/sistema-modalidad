import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpedientePage from './ExpedientePage'
import { postulacionesService } from '../../services/postulacionesService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../services/postulacionesService', () => ({
  postulacionesService: {
    obtenerExpediente: vi.fn(), obtenerCapacidadesModalidad: vi.fn(), inicializarFlujo: vi.fn(), obtenerHistorial: vi.fn(), obtenerActores: vi.fn(), obtenerDocumentos: vi.fn(),
    obtenerVersiones: vi.fn(), descargarVersion: vi.fn(), obtenerObservaciones: vi.fn(), obtenerTiposDocumento: vi.fn(), cargarDocumento: vi.fn(),
    aprobarDocumento: vi.fn(), rechazarDocumento: vi.fn(), observarDocumento: vi.fn(), marcarObservacionCorregida: vi.fn(),
    obtenerDefensas: vi.fn(), obtenerQuorumDefensa: vi.fn(), programarDefensa: vi.fn(), iniciarDefensa: vi.fn(),
    finalizarDefensa: vi.fn(), suspenderDefensa: vi.fn(), cancelarDefensa: vi.fn(), reprogramarDefensa: vi.fn(),
    registrarEvaluacionDefensa: vi.fn(), consolidarEvaluacionDefensa: vi.fn(), obtenerDefensa: vi.fn(),
    obtenerCondiciones: vi.fn(), verificarCondicion: vi.fn(), rechazarCondicion: vi.fn(),
    obtenerEntregas: vi.fn(), registrarEntrega: vi.fn(),
    obtenerCierre: vi.fn(), aprobarRevisionFinal: vi.fn(), aprobarCierreDocumental: vi.fn(),
    concluirPostulacion: vi.fn(), reabrirCierre: vi.fn(),
    obtenerCandidatosAsignacion: vi.fn(), asignarActor: vi.fn(), finalizarAsignacion: vi.fn(),
    obtenerInformesRevisionTribunal: vi.fn(), registrarInformeRevisionTribunal: vi.fn(),
  },
}))

const historyResponse = {
  count: 21,
  next: '/api/v1/postulaciones/historial/?page=2',
  previous: null,
  results: [
    { id: 1, estado_anterior_nombre: null, estado_nuevo_nombre: 'Registrada', actor_nombre: null, fecha_cambio: '2026-01-01T10:00:00Z', comentario: '' },
    { id: 2, estado_anterior_nombre: 'Registrada', estado_nuevo_nombre: 'En proceso', actor_nombre: 'María Rojas', fecha_cambio: '2026-01-02T10:00:00Z', comentario: 'Inicio de revisión' },
  ],
}

const activeActorsResponse = {
  count: 5, next: null, previous: null, results: [
    { id: 1, usuario_nombre: 'Tutor Uno', tipo_participacion_display: 'Tutor', orden_cargo: null, etapa_nombre: 'Perfil de Proyecto', fecha_inicio: '2026-01-01T10:00:00Z', activo: true, observaciones: 'Acompañamiento técnico' },
    { id: 2, usuario_nombre: 'Tribunal Uno', tipo_participacion_display: 'Tribunal', orden_cargo: 1, etapa_nombre: 'Defensa pública', fecha_designacion: '2026-01-02T10:00:00Z', activo: true, observaciones: '' },
    { id: 3, usuario_nombre: 'Docente Uno', tipo_participacion_display: 'Docente de modalidad', orden_cargo: null, seguimiento_etapa: null, activo: true },
    { id: 4, usuario_nombre: 'Presidente Uno', tipo_participacion_display: 'Presidente', orden_cargo: 1, activo: true },
    { id: 5, usuario_nombre: 'Secretario Uno', tipo_participacion_display: 'Secretario', orden_cargo: 2, activo: true },
  ],
}
const historicalActorsResponse = {
  count: 1, next: null, previous: null, results: [
    { id: 6, usuario_nombre: 'Tutor Histórico', tipo_participacion_display: 'Tutor', fecha_inicio: '2025-01-01T10:00:00Z', fecha_fin: null, activo: false, observaciones: null },
  ],
}

const documentsResponse = {
  count: 1, next: null, previous: null,
  results: [{ id: 31, tipo_documento: 4, tipo_documento_nombre: 'Informe final', estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-02-01T10:00:00Z', fecha_revision: null, requiere_correccion: true, tiene_observaciones_pendientes: false, observacion_general: 'Revisión técnica pendiente', versiones: [{ id: 301 }] }],
}

const versionsResponse = {
  count: 2, next: null, previous: null,
  results: [
    { id: 301, numero_version: 1, fecha_subida: '2026-02-01T10:00:00Z', nombre_original: 'informe-largo.pdf', tamano_bytes: 2048, subido_por_nombre: 'Ana Pérez', es_version_actual: false, archivo: '/media/documentos/versiones/informe-v1.pdf' },
    { id: 302, numero_version: 2, fecha_subida: '2026-02-02T10:00:00Z', nombre_original: 'informe-final.pdf', tamano_bytes: 4096, subido_por_nombre: 'Ana Pérez', es_version_actual: true, archivo: '/media/documentos/versiones/informe-v2.pdf' },
  ],
}

const observationsResponse = {
  count: 2, next: null, previous: null,
  results: [
    { id: 401, comentario: 'Corregir portada', usuario_nombre: 'Revisor Uno', fecha_observacion: '2026-02-03T10:00:00Z', corregida: false, fecha_correccion: null },
    { id: 402, comentario: 'Numeración corregida', usuario_nombre: 'Revisor Dos', fecha_observacion: '2026-02-04T10:00:00Z', corregida: true, fecha_correccion: '2026-02-05T10:00:00Z' },
  ],
}

const defenseRows = [
  {
    id: 81, postulacion: 7, tipo_evento: 'DEFENSA_PUBLICA', tipo_display: 'Defensa pública', numero_intento: 2,
    estado: 'FINALIZADA', estado_display: 'Finalizada', fecha_programada: '2026-06-10T14:00:00Z',
    fecha_inicio_real: '2026-06-10T14:05:00Z', fecha_fin_real: '2026-06-10T15:30:00Z', lugar: 'Auditorio central',
    modalidad_evento: 'MIXTA', modalidad_display: 'Mixta', enlace_virtual: 'https://meet.example.test/defensa',
    etapa_codigo: 'DEFENSA_PUBLICA', etapa_nombre: 'Defensa Pública', observaciones: 'Registro técnico',
    participantes: [{ id: 91, usuario_nombre: 'María Tribunal', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocatoria: true, convocado: true, presente: true, fecha_asistencia: '2026-06-10T14:03:00Z', observaciones: 'Presente en sala' }],
    evaluaciones: [{ id: 101, tipo_evaluacion: 'PUBLICA', tipo_display: 'Pública', evaluador_nombre: null, modalidad_registro: 'CONSENSO', modalidad_registro_display: 'Consenso', resultado_cualitativo: '', nota_numerica: '60.00', ponderacion: '70.00', aporte_ponderado: '60.00' }],
    resultado_consolidado: { id: 102, tipo_evaluacion: 'RESULTADO_FINAL', tipo_display: 'Resultado final', evaluador_nombre: null, modalidad_registro: 'CONSENSO', modalidad_registro_display: 'Consenso', resultado_cualitativo: '', nota_numerica: '60.00', ponderacion: '70.00', aporte_ponderado: '60.00' },
  },
  { id: 82, tipo_evento: 'DEFENSA_PRIVADA', tipo_display: 'Defensa privada', numero_intento: 1, estado: 'PROGRAMADA', estado_display: 'Programada', fecha_programada: '2026-05-01T10:00:00Z', lugar: 'Sala 2', modalidad_display: 'Presencial', etapa_nombre: 'Defensa Privada', participantes: [], evaluaciones: [], resultado_consolidado: null },
  { id: 83, tipo_evento: 'DEFENSA_PERFIL', tipo_display: 'Defensa de perfil', numero_intento: 1, estado: 'EN_CURSO', estado_display: 'En curso', fecha_programada: '2026-04-01T10:00:00Z', lugar: '', modalidad_display: 'Virtual', enlace_virtual: '', etapa_nombre: 'Perfil de Proyecto', participantes: [], evaluaciones: [], resultado_consolidado: null },
  { id: 84, tipo_evento: 'DEFENSA_PERFIL', tipo_display: 'Defensa de perfil', numero_intento: 2, estado: 'SUSPENDIDA', estado_display: 'Suspendida', fecha_programada: '2026-03-01T10:00:00Z', lugar: null, modalidad_display: 'Presencial', etapa_nombre: 'Perfil de Proyecto', participantes: [], evaluaciones: [], resultado_consolidado: null },
  { id: 85, tipo_evento: 'DEFENSA_PRIVADA', tipo_display: 'Defensa privada', numero_intento: 2, estado: 'CANCELADA', estado_display: 'Cancelada', fecha_programada: null, lugar: null, modalidad_display: null, etapa_nombre: null, participantes: [], evaluaciones: [], resultado_consolidado: null },
]

const defensesResponse = { count: 21, next: 'page=2', previous: null, results: defenseRows }
const quorumResponse = { valido: true, conteos: { TRIBUNAL: 2, PRESIDENTE: 1 }, faltantes: {}, detalle: { TRIBUNAL: 2, PRESIDENTE: 1 } }
const closureResponse = {
  estado_general: 'EN_PROCESO', etapa_actual: 'REVISION_FINAL_POST_PUBLICA', defensa_publica_aprobada: true,
  revision_final_aprobada: false, cierre_documental_aprobado: false, concluida: false,
  condiciones_faltantes: ['ACTA'], entregas_faltantes: ['EJEMPLARES'], documentos_faltantes: ['INFORME'],
  advertencias_normativas: ['La cantidad registrada no certifica la cantidad oficial.'],
  puede_aprobar_revision_final: true, puede_aprobar_cierre: false, puede_concluir: false,
}

const response = {
  detalle: {
    id: 7,
    codigo: 'EXP-007',
    modalidad: 1,
    estudiante_detalle: { id: 3, ru: 'RU-300', nombre_completo: 'Ana Pérez' },
    modalidad_detalle: { id: 1, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
    periodo_detalle: { id: 2, gestion: 2026, semestre: 'II', nombre: '2026-II' },
    estado_actual_detalle: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
    activo: true,
  },
  flujo: {
    modalidad: { id: 1, codigo: 'PROYECTO_GRADO', nombre: 'Proyecto de Grado' },
    etapa_actual: { codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto' },
    porcentaje_avance: 25,
    etapas: [
      { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
      { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'OBSERVADA', numero_intento: 2, activo: true },
      { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'PENDIENTE', numero_intento: 1, activo: true },
    ],
  },
  resultado: {
    data: { nota_privada: '24.00', nota_publica: '60.00', aporte_privada: '24.00', aporte_publica: '60.00', clasificacion: 'APROBACION_PLENA', resultado: 'APROBACION_PLENA', nota_final: '84.00', limitacion_normativa: '' },
    error: '',
  },
  cierre: {
    data: closureResponse,
    error: '',
  },
}

const tribunalStage = { id: 4, codigo: 'REVISION_TRIBUNAL_PREVIA', nombre: 'Revisión de Tribunal Previa', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
const tribunalResponse = { ...response, flujo: { ...response.flujo, etapa_actual: tribunalStage, etapas: [...response.flujo.etapas, tribunalStage] } }
const tribunalDocuments = {
  count: 2, next: null, previous: null, results: [
    { id: 41, tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.doc', es_version_actual: true, activo: true }] },
    { id: 42, tipo_documento_nombre: 'Informe de Evaluación del Tribunal', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
  ],
}
const tribunalHistory = [
  { id: 702, resultado: 'SUFICIENTE', resultado_display: 'Suficiente', numero_version_revisada: 2, evidencia_version: 602, evidencia_nombre_original: 'informe-v2.pdf', fecha_registro: '2026-08-16T12:00:00Z', registrado_por_nombre: 'Administradora', observaciones: 'Versión conforme', activo: true },
  { id: 701, resultado: 'INSUFICIENTE', resultado_display: 'Insuficiente', numero_version_revisada: 1, evidencia_version: 603, evidencia_nombre_original: 'informe-v1.pdf', fecha_registro: '2026-08-10T12:00:00Z', registrado_por_nombre: 'Administradora', observaciones: 'Requiere correcciones', activo: true },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/postulaciones/7']}>
      <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
    </MemoryRouter>,
  )
}

function renderOwnerPage() {
  const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderReviewerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderDefenseManagerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_defensas' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderDefenseEvaluationManagerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_defensas', 'puede_gestionar_evaluaciones'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderClosureManagerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_cierre' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderApplicationManagerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_postulaciones' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderAssignmentManagerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_asignaciones' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderWorkflowManagerPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

describe('ExpedientePage US-008', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true })
    postulacionesService.inicializarFlujo.mockResolvedValue({})
    postulacionesService.obtenerHistorial.mockResolvedValue(historyResponse)
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    postulacionesService.obtenerCandidatosAsignacion.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, username: 'Admin', nombre_completo: 'Yesenia Sandoval', codigo: 'Admin', rol_codigo: 'ADMINISTRADOR', rol_nombre: 'Administrador', activo: true },
      { id: 41, username: 'Johnny', nombre_completo: 'Johnny Rosas', codigo: 'Johnny', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ] })
    postulacionesService.asignarActor.mockResolvedValue({ id: 90 })
    postulacionesService.finalizarAsignacion.mockResolvedValue({ id: 7, activo: false })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])
    postulacionesService.registrarInformeRevisionTribunal.mockResolvedValue({ id: 501, resultado: 'SUFICIENTE' })
    postulacionesService.obtenerDocumentos.mockResolvedValue(documentsResponse)
    postulacionesService.obtenerVersiones.mockResolvedValue(versionsResponse)
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['archivo']), filename: 'informe-final.pdf' })
    postulacionesService.obtenerObservaciones.mockResolvedValue(observationsResponse)
    postulacionesService.obtenerTiposDocumento.mockResolvedValue({ results: [
      { id: 4, nombre: 'Informe final', activo: true },
      { id: 5, codigo: 'ACTA_DEFENSA', nombre: 'Acta de Defensa', activo: true },
    ] })
    postulacionesService.cargarDocumento.mockResolvedValue({ id: 303, numero_version: 3, es_version_actual: true })
    postulacionesService.aprobarDocumento.mockResolvedValue({ id: 31, estado_codigo: 'APR' })
    postulacionesService.rechazarDocumento.mockResolvedValue({ id: 31, estado_codigo: 'REC' })
    postulacionesService.observarDocumento.mockResolvedValue({ id: 403, version_documento: 302 })
    postulacionesService.marcarObservacionCorregida.mockResolvedValue({ id: 401, corregida: true })
    postulacionesService.obtenerDefensas.mockResolvedValue(defensesResponse)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue(quorumResponse)
    postulacionesService.obtenerCondiciones.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.obtenerEntregas.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.obtenerCierre.mockResolvedValue(closureResponse)
    postulacionesService.aprobarRevisionFinal.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: true })
    postulacionesService.aprobarCierreDocumental.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: false, puede_concluir: true })
    postulacionesService.concluirPostulacion.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_concluir: false, concluida: true, estado_general: 'CONCLUIDA' })
    postulacionesService.reabrirCierre.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: false, puede_aprobar_cierre: true })
    postulacionesService.programarDefensa.mockResolvedValue({ ...defenseRows[1], id: 86 })
    postulacionesService.iniciarDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'EN_CURSO', estado_display: 'En curso' })
    postulacionesService.finalizarDefensa.mockResolvedValue({ ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada' })
    postulacionesService.suspenderDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'SUSPENDIDA', estado_display: 'Suspendida' })
    postulacionesService.cancelarDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'CANCELADA', estado_display: 'Cancelada' })
    postulacionesService.reprogramarDefensa.mockResolvedValue({ ...defenseRows[1], fecha_programada: '2026-09-01T10:00:00Z' })
  })

  it('no muestra la acción de finalización si el usuario no puede gestionar asignaciones', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage()

    const activeHeading = await screen.findByRole('heading', { name: 'Asignaciones vigentes' })
    const activeGroup = activeHeading.closest('section')
    expect(within(activeGroup).queryByRole('button', { name: /Finalizar asignación/i })).not.toBeInTheDocument()
  })

  it('muestra el botón de finalización sólo para actores vigentes y abre la confirmación', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderAssignmentManagerPage()

    const activeHeading = await screen.findByRole('heading', { name: 'Asignaciones vigentes' })
    const activeGroup = activeHeading.closest('section')
    expect(within(activeGroup).getAllByRole('button', { name: /Finalizar asignación/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Finalizar asignación/i })).not.toBeNull()

    await userEvent.click(within(activeGroup).getAllByRole('button', { name: /Finalizar asignación/i })[0])
    const dialog = await screen.findByRole('dialog', { name: /Finalizar asignación/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Tutor Uno|Tribunal Uno|Docente Uno|Presidente Uno|Secretario Uno/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Motivo o observación/i)).toBeInTheDocument()
  })

  it('confirma finalización con motivo y evita doble submit', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    postulacionesService.finalizarAsignacion.mockResolvedValue({ id: 1, activo: false })
    renderAssignmentManagerPage()

    const activeGroup = (await screen.findByRole('heading', { name: 'Asignaciones vigentes' })).closest('section')
    await userEvent.click(within(activeGroup).getAllByRole('button', { name: /Finalizar asignación/i })[0])
    const dialog = await screen.findByRole('dialog', { name: /Finalizar asignación/i })

    const reason = within(dialog).getByLabelText(/Motivo o observación/i)
    await userEvent.type(reason, 'Regularización por conflicto de roles')
    const submit = within(dialog).getByRole('button', { name: /Confirmar finalización/i })

    await userEvent.click(submit)
    await waitFor(() => expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledWith(1, { observaciones: 'Regularización por conflicto de roles' }, expect.any(AbortSignal)))

    const submitAgain = within(dialog).getByRole('button', { name: /Confirmar finalización/i })
    expect(submitAgain).toBeDisabled()
  })

  it('muestra el error específico del backend al finalizar', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    postulacionesService.finalizarAsignacion.mockRejectedValue({
      response: { status: 400, data: { non_field_errors: ['No se puede finalizar la asignación porque participa activamente en un evento PROGRAMADA o EN_CURSO.'] } },
    })
    renderAssignmentManagerPage()

    const activeGroup = (await screen.findByRole('heading', { name: 'Asignaciones vigentes' })).closest('section')
    await userEvent.click(within(activeGroup).getAllByRole('button', { name: /Finalizar asignación/i })[0])
    const dialog = await screen.findByRole('dialog', { name: /Finalizar asignación/i })
    const reason = within(dialog).getByLabelText(/Motivo o observación/i)
    await userEvent.type(reason, 'Motivo inválido')
    await userEvent.click(within(dialog).getByRole('button', { name: /Confirmar finalización/i }))

    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('No se puede finalizar la asignación porque participa activamente en un evento PROGRAMADA o EN_CURSO.'))
  })

  it('permite registrar informe cuando la evidencia viene identificada por su código de tipo documental', async () => {
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
        { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de revisión', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    renderWorkflowManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })

    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Evidencia' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Registrar informe' })).toBeEnabled()
  })

  it('renderiza el resumen, macroetapa, avance y advertencia institucional', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Cargando/)
    expect(await screen.findByRole('heading', { name: 'Resumen técnico' })).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Gestión 2026 - Semestre II')).toBeInTheDocument()
    expect(screen.getByText('En proceso')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Resumen técnico' }).parentElement).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance del macroflujo' })).toHaveValue(25)
    expect(screen.getByRole('navigation', { name: 'Secciones del expediente' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '#documentos')
    expect(screen.getByRole('heading', { name: 'Estado operativo' })).toBeInTheDocument()
    expect(screen.getByText('0 de 3 etapas completadas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(screen.getByText('24.00')).toBeInTheDocument()
    expect(screen.getByText('60.00')).toBeInTheDocument()
    expect(screen.getAllByText('84.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    const limits = screen.getByRole('note', { name: 'Límites normativos' })
    expect(limits).toHaveTextContent(/nota privada es el aporte consensuado/i)
    expect(limits).toHaveTextContent(/aprobación y originalidad del tema/i)
    expect(limits).toHaveTextContent(/escala específica confirmada/i)
    expect(limits).toHaveTextContent(/cantidad oficial de ejemplares/i)
    expect(limits).toHaveTextContent(/proyectos grupales/i)
    expect(limits).toHaveTextContent(/plazos reglamentarios/i)
    expect(limits).toHaveTextContent(/no equivale a legalización/i)
    expect(limits).toHaveTextContent(/cantidad registrada no certifica/i)
    expect(screen.getByRole('heading', { name: 'Cierre técnico' })).toBeInTheDocument()
    expect(limits).toHaveClass('overflow-hidden')
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).toHaveClass('overflow-hidden')
    expect(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).toHaveClass('overflow-hidden')
    expect(screen.getByText('ACTA')).toBeInTheDocument()
    expect(screen.getByText('EJEMPLARES')).toBeInTheDocument()
    expect(screen.getByText('INFORME')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute('href', '/postulantes')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('prioriza el modo consulta cuando el expediente está concluido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      cierre: { data: { ...closureResponse, estado_general: 'CONCLUIDA', concluida: true, documentos_faltantes: [], condiciones_faltantes: [], entregas_faltantes: [] }, error: '' },
    })
    renderPage()

    expect(await screen.findByText('✓ Expediente concluido')).toBeInTheDocument()
    expect(screen.getByText(/Todas las etapas académicas y el cierre documental/)).toBeInTheDocument()
    expect(screen.getByText('Nota final: 84.00')).toBeInTheDocument()
    expect(screen.getAllByText('APROBACION PLENA').length).toBeGreaterThan(0)
  })

  it('muestra inicialización administrativa solo cuando el flujo soportado está vacío', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })

    renderApplicationManagerPage()

    expect(await screen.findByRole('button', { name: 'Inicializar flujo académico' })).toBeInTheDocument()
  })

  it('oculta inicialización si el flujo existe o el usuario no tiene permiso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const initialized = renderApplicationManagerPage()
    await screen.findByRole('heading', { name: 'Resumen técnico' })
    expect(screen.queryByRole('button', { name: 'Inicializar flujo académico' })).not.toBeInTheDocument()
    initialized.unmount()

    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })
    renderOwnerPage()
    await screen.findByRole('heading', { name: 'Resumen técnico' })
    expect(screen.queryByRole('button', { name: 'Inicializar flujo académico' })).not.toBeInTheDocument()
  })

  it.each([
    ['modalidad no soportada', { soportada: false, configuracion_valida: false }, true],
    ['postulación inactiva', { soportada: true, configuracion_valida: true }, false],
  ])('oculta inicialización para %s', async (_case, capabilities, active) => {
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue(capabilities)
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, activo: active },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })

    renderApplicationManagerPage()

    await screen.findByRole('heading', { name: 'Resumen técnico' })
    expect(screen.queryByRole('button', { name: 'Inicializar flujo académico' })).not.toBeInTheDocument()
  })

  it('confirma, llama la acción y recarga sin iniciar Inscripción', async () => {
    const emptyFlow = {
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    }
    const initializedFlow = {
      ...emptyFlow,
      flujo: {
        ...emptyFlow.flujo,
        etapa_actual: { id: 21, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE' },
        etapas: [{ id: 21, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE', numero_intento: 1, activo: true }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyFlow).mockResolvedValueOnce(initializedFlow)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Inicializar flujo académico' }))

    expect(confirm).toHaveBeenCalledWith('Se crearán las etapas iniciales del flujo académico para esta postulación.\nEsta acción no inicia ni aprueba ninguna etapa.')
    await waitFor(() => expect(postulacionesService.inicializarFlujo).toHaveBeenCalledWith(7, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect((await screen.findAllByText('Inscripción')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Registrada')).toBeInTheDocument()
    const stagesCard = screen.getByRole('heading', { name: 'Etapas del flujo académico' }).parentElement
    expect(within(stagesCard).getByText('PENDIENTE')).toBeInTheDocument()
    expect(within(stagesCard).queryByText('EN_PROCESO')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance del macroflujo' })).toHaveAttribute('value', '0')
    confirm.mockRestore()
  })

  it('mantiene el expediente y muestra un error limpio si falla la inicialización', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })
    postulacionesService.inicializarFlujo.mockRejectedValue({ message: 'No se pudo inicializar el flujo académico. Intenta nuevamente.' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Inicializar flujo académico' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo inicializar el flujo académico. Intenta nuevamente.')
    expect(screen.getByRole('heading', { name: 'Resumen técnico' })).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  it.each([
    ['Debes iniciar sesión para consultar este expediente.', 401],
    ['No tienes autorización para consultar este expediente.', 403],
    ['El expediente solicitado no está disponible.', 404],
    ['No se pudo cargar el expediente. Intenta nuevamente.', undefined],
  ])('muestra error recuperable para respuesta %s', async (message, status) => {
    postulacionesService.obtenerExpediente.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(response)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('EXP-007')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('tolera datos opcionales ausentes sin inventar etiquetas', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      detalle: { codigo: 'EXP-008', estudiante_detalle: null, modalidad_detalle: null, periodo_detalle: null, estado_actual_detalle: null },
      flujo: { modalidad: null, etapa_actual: null, porcentaje_avance: null, etapas: [] },
      resultado: { data: { nota_publica: null, aporte_publica: null, resultado: null, nota_final: null }, error: '' },
      cierre: { data: { advertencias_normativas: [], condiciones_faltantes: [], entregas_faltantes: [], documentos_faltantes: [] }, error: '' },
    })
    renderPage()
    await screen.findByText('EXP-008')
    expect(screen.getAllByText('No registrado').length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('no presenta controles de cierre de Proyecto en un expediente de Tesis', async () => {
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: false })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
    })
    renderPage()
    await screen.findByText('EXP-007')
    expect(screen.queryByRole('heading', { name: 'Cierre técnico' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Límites normativos' })).toHaveTextContent(/defensa pública permanece bloqueada/i)
  })

  it('mantiene expediente y advertencias ante errores parciales y permite reintentar', async () => {
    const partial = {
      ...response,
      resultado: { data: null, error: 'Resultado final todavía no disponible' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(partial).mockResolvedValueOnce(response)
    renderPage()
    expect(await screen.findByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('Resultado final todavía no disponible')).toBeInTheDocument()
    expect(screen.getByText('Estado de cierre técnico todavía no disponible')).toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Límites normativos' })).toHaveTextContent(/proyectos grupales/i)
    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    expect((await screen.findAllByText('84.00')).length).toBeGreaterThanOrEqual(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('cancela la solicitud al desmontar', async () => {
    let receivedSignal
    postulacionesService.obtenerExpediente.mockImplementation((_id, signal) => {
      receivedSignal = signal
      return new Promise(() => {})
    })
    const view = renderPage()
    await waitFor(() => expect(receivedSignal).toBeDefined())
    view.unmount()
    expect(receivedSignal.aborted).toBe(true)
  })

  it('integra el historial legible, neutral, accesible y paginado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial
      .mockResolvedValueOnce(historyResponse)
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [{ ...historyResponse.results[1], id: 21 }] })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByText('Estado inicial → Registrada')).toBeInTheDocument()
    expect(screen.getByText('Registrada → En proceso')).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()
    expect(screen.getByText('Sin comentario')).toBeInTheDocument()
    expect(screen.getByText('María Rojas')).toBeInTheDocument()
    expect(screen.getByText('Inicio de revisión')).toBeInTheDocument()
    expect(screen.queryByText(/kardex oficial/i)).not.toBeInTheDocument()
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getAllByRole('button', { name: 'Siguiente' }).find((button) => !button.disabled))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('consulta y separa actores vigentes e históricos con etiquetas y advertencias contractuales', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage()
    const card = (await screen.findByRole('heading', { name: 'Actores de la postulación' })).parentElement
    expect(within(card).getByRole('heading', { name: 'Asignaciones vigentes' })).toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Asignaciones históricas' })).toBeInTheDocument()
    for (const label of ['Tutor', 'Tribunal', 'Docente de modalidad', 'Presidente', 'Secretario']) expect(within(card).getAllByText(label).length).toBeGreaterThan(0)
    expect(within(card).getAllByText('Activa')).toHaveLength(5)
    expect(within(card).getByText('Histórica')).toBeInTheDocument()
    expect(within(card).getByText('Tutor Uno')).toBeInTheDocument()
    expect(within(card).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(within(card).getByText('Acompañamiento técnico')).toBeInTheDocument()
    expect(within(card).getAllByText('Sin etapa asociada').length).toBeGreaterThan(0)
    expect(within(card).getAllByText('Sin observaciones').length).toBeGreaterThan(0)
    expect(within(card).getAllByText('No registrada').length).toBeGreaterThan(0)
    expect(within(card).getByLabelText('Advertencias sobre las asignaciones')).toHaveTextContent(/no sustituye un memorando/i)
    expect(within(card).getByLabelText('Advertencias sobre las asignaciones')).toHaveTextContent(/participación finalizada/i)
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', true, 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', false, 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerActores).toHaveBeenCalledTimes(2)
    expect(within(card).queryByRole('button', { name: /asignar|reemplazar|finalizar|designar/i })).not.toBeInTheDocument()
  })

  it('muestra Asignar actor solo con su permiso y reutiliza candidatos y etapas del expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Asignar actor' }))
    const dialog = screen.getByRole('dialog', { name: 'Asignar actor' })
    expect(await within(dialog).findByRole('option', { name: /Johnny Rosas.*Docente.*Johnny/ })).toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosAsignacion).toHaveBeenCalledWith(
      { search: '', rol: '', ordering: 'apellido_paterno', page: 1 }, expect.any(AbortSignal),
    )
    for (const type of ['Tutor', 'Tribunal', 'Docente de modalidad', 'Presidente', 'Secretario']) {
      expect(within(dialog).getByRole('option', { name: type })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('option', { name: /Defensa Privada.*intento 2.*OBSERVADA/ })).toHaveValue('12')
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato'), 'Rosas')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosAsignacion).toHaveBeenLastCalledWith(
      { search: 'Rosas', rol: '', ordering: 'apellido_paterno', page: 1 }, expect.any(AbortSignal),
    ))
  })

  it('representa Tribunal 1 a 3, deshabilita órdenes ocupados e impide un cuarto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({ id: order, usuario_nombre: `Tribunal ${order}`, tipo_participacion: 'TRIBUNAL', tipo_participacion_display: 'Tribunal', orden_cargo: order, seguimiento_etapa: 12, activo: true })),
    } : historicalActorsResponse))
    renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Asignar actor' }))
    const dialog = screen.getByRole('dialog', { name: 'Asignar actor' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo de participación'), 'TRIBUNAL')
    await userEvent.selectOptions(within(dialog).getByLabelText('Etapa asociada (opcional)'), '12')
    expect(within(dialog).getByText(/Tribunales designados:/)).toHaveTextContent('3 de 3')
    for (const order of [1, 2, 3]) expect(within(dialog).getByRole('option', { name: `Tribunal ${order} — ocupado` })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled()
    expect(within(dialog).getByText(/esto no representa quórum/i)).toBeInTheDocument()
  })

  it('envía etapa opcional, observaciones y orden de tribunal y recarga solo actores vigentes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Asignar actor' }))
    const dialog = screen.getByRole('dialog', { name: 'Asignar actor' })
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo de participación'), 'TRIBUNAL')
    expect(within(dialog).getByText(/Tribunales designados:/)).toHaveTextContent('0 de 3')
    await userEvent.selectOptions(within(dialog).getByLabelText('Etapa asociada (opcional)'), '12')
    await userEvent.selectOptions(within(dialog).getByLabelText('Orden del tribunal'), '2')
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), '  Revisión previa  ')
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 12, observaciones: 'Revisión previa',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === true)).toHaveLength(2))
    expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === false)).toHaveLength(1)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('permite asignar sin etapa y muestra errores de validación del backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.asignarActor.mockRejectedValue({ status: 400, message: 'Revisa los datos de la asignación.', fields: { usuario: ['El candidato ya está asignado.'] } })
    renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Asignar actor' }))
    const dialog = screen.getByRole('dialog', { name: 'Asignar actor' })
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo de participación'), 'TUTOR')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, { usuario: 41, tipo_participacion: 'TUTOR', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByText('El candidato ya está asignado.')).toBeInTheDocument()
  })

  it('pagina solo el bloque vigente sin recargar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo, page) => Promise.resolve(activo
      ? { ...activeActorsResponse, count: 21, next: page === 1 ? 'page=2' : null, previous: page === 2 ? 'page=1' : null }
      : historicalActorsResponse))
    renderPage()
    const group = (await screen.findByRole('heading', { name: 'Asignaciones vigentes' })).parentElement
    await userEvent.click(within(group).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', true, 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === false)).toHaveLength(1)
  })

  it('mantiene vacíos separados y reintenta un error parcial de actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => activo
      ? Promise.reject({ status: 401, message: 'Debes iniciar sesión para consultar los actores.' })
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Debes iniciar sesión para consultar los actores.')
    expect(screen.getByText('No hay asignaciones históricas registradas.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar asignaciones vigentes' }))
    expect(await screen.findByText('No hay asignaciones vigentes registradas.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('consulta y lista defensas de Perfil, Privada y Pública con cinco estados técnicos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    const card = (await screen.findByRole('heading', { name: 'Defensas' })).parentElement
    expect(within(card).getByText('Defensa pública')).toBeInTheDocument()
    expect(within(card).getAllByText('Defensa privada')).toHaveLength(2)
    expect(within(card).getAllByText('Defensa de perfil')).toHaveLength(2)
    for (const state of ['Programada', 'En curso', 'Finalizada', 'Suspendida', 'Cancelada']) expect(within(card).getByText(state)).toBeInTheDocument()
    expect(within(card).getAllByText('Intento 2').length).toBeGreaterThan(0)
    expect(within(card).getByText('Auditorio central')).toBeInTheDocument()
    expect(within(card).getByText('Mixta')).toBeInTheDocument()
    expect(within(card).getByText('Defensa Pública')).toBeInTheDocument()
    expect(within(card).getByLabelText('Alcance contractual de las defensas')).toHaveTextContent(/no sustituyen convocatoria formal, acta firmada, legalización ni resultado académico institucional/i)
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
    expect(within(card).queryByRole('button', { name: /programar|reprogramar|iniciar|finalizar|suspender|cancelar|asistencia|evaluación|consolidar/i })).not.toBeInTheDocument()
  })

  it('abre detalle de solo lectura y consulta quórum únicamente para el evento seleccionado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledWith(81, expect.any(AbortSignal))
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(1)
    expect(await within(dialog).findByText('Quórum técnico válido')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Tribunal: 2').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Sin participantes faltantes.')).toBeInTheDocument()
    expect(within(dialog).getAllByText('María Tribunal').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Convocado')).toBeInTheDocument()
    expect(within(dialog).getByText('Presente')).toBeInTheDocument()
    expect(within(dialog).getByText('Presente en sala')).toBeInTheDocument()
    expect(within(dialog).getAllByText('60.00').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('70.00').length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('link', { name: 'Abrir enlace virtual de la defensa' })).toHaveAttribute('href', 'https://meet.example.test/defensa')
    expect(within(dialog).getByText(/no certifica validez institucional/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /programar|reprogramar|iniciar|finalizar|suspender|cancelar|registrar|consolidar/i })).not.toBeInTheDocument()
  })

  it('muestra quórum inválido, faltantes y resultado consolidado ausente sin calcular cero', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1, SECRETARIO: 1 }, detalle: {} })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[1])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText('Quórum técnico no válido')).toBeInTheDocument()
    expect(within(dialog).getByText('Secretario: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('No se registraron participantes.')).toBeInTheDocument()
    expect(within(dialog).getByText('No se registraron evaluaciones.')).toBeInTheDocument()
    expect(within(dialog).getByText('Resultado consolidado todavía no disponible.')).toBeInTheDocument()
    expect(within(dialog).queryByText(/^0(?:\.00)?$/)).not.toBeInTheDocument()
  })

  it('pagina defensas sin recargar las demás secciones ni duplicar la consulta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas
      .mockResolvedValueOnce(defensesResponse)
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [defenseRows[1]] })
    renderPage()
    const card = (await screen.findByRole('heading', { name: 'Defensas' })).parentElement
    fireEvent.click(within(card).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerHistorial).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
  })

  it('muestra vacío de defensas sin afectar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    expect(await screen.findByText('No se registraron defensas.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
  })

  it.each([
    ['Debes iniciar sesión para consultar las defensas.', 401],
    ['Las defensas solicitadas no están disponibles.', 404],
    ['No se pudo consultar las defensas. Comprueba tu conexión e intenta nuevamente.', undefined],
  ])('mantiene el expediente ante error parcial de defensas %s y permite reintentar', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(defensesResponse)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar defensas' }))
    expect(await screen.findByText('Defensa pública')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('aísla error de quórum, permite reintentar y cancela al cerrar el evento', async () => {
    let pendingSignal
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerQuorumDefensa
      .mockRejectedValueOnce({ status: 404, message: 'El evento de defensa no está disponible.' })
      .mockImplementationOnce((_event, signal) => { pendingSignal = signal; return new Promise(() => {}) })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[0])
    expect(await screen.findByRole('alert')).toHaveTextContent('El evento de defensa no está disponible.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar quórum técnico' }))
    await waitFor(() => expect(pendingSignal).toBeInstanceOf(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(pendingSignal.aborted).toBe(true)
  })

  it('cancela defensas al cambiar de expediente y usa la nueva postulación', async () => {
    const signals = []
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockImplementation((_id, _page, signal) => { signals.push(signal); return new Promise(() => {}) })
    const view = render(<MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar expediente de defensas</Link></>} /></Routes></MemoryRouter>)
    await waitFor(() => expect(signals).toHaveLength(1))
    fireEvent.click(screen.getByRole('link', { name: 'Cambiar expediente de defensas' }))
    await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith('8', 1, expect.any(AbortSignal)))
    expect(signals[0].aborted).toBe(true)
    view.unmount()
    expect(signals.at(-1).aborted).toBe(true)
  })

  it('muestra estado vacío sin afectar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    expect(await screen.findByText('No se registraron cambios de estado.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
  })

  it.each([
    ['Debes iniciar sesión para consultar el historial.', 401],
    ['El historial solicitado no está disponible.', 404],
    ['No se pudo cargar el historial. Intenta nuevamente.', undefined],
  ])('mantiene el expediente ante error parcial de historial %s y permite reintentar', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(historyResponse)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }))
    expect(await screen.findByText('Estado inicial → Registrada')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('cancela historial al desmontar y usa el nuevo id al cambiar de expediente', async () => {
    const signals = []
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockImplementation((_id, _page, signal) => {
      signals.push(signal)
      return new Promise(() => {})
    })
    const view = render(
      <MemoryRouter initialEntries={['/postulaciones/7']}>
        <Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar expediente</Link></>} /></Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(signals).toHaveLength(1))
    await userEvent.click(screen.getByRole('link', { name: 'Cambiar expediente' }))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenCalledWith('8', 1, expect.any(AbortSignal)))
    expect(signals[0].aborted).toBe(true)
    view.unmount()
    expect(signals.at(-1).aborted).toBe(true)
  })

  it('consulta documentos por postulación y muestra etiquetas sin acciones de escritura', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.getByText('Informe final')).toBeInTheDocument()
    expect(screen.getByText(/Estado técnico: Enviado/)).toBeInTheDocument()
    expect(screen.getByText('Requerida')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /subir|aprobar|rechazar|observar/i })).not.toBeInTheDocument()
  })

  it('abre detalle, pagina versiones y consulta observaciones por versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones
      .mockResolvedValueOnce({ ...versionsResponse, count: 21, next: 'page=2' })
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [versionsResponse.results[1]] })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(dialog).toBeInTheDocument()
    expect(await screen.findByText('Versión 1')).toBeInTheDocument()
    expect(screen.getByText('Versión 2')).toBeInTheDocument()
    expect(screen.getByText('Versión actual')).toBeInTheDocument()
    expect(screen.getByText('informe-largo.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Descargar' })).toHaveLength(2)
    expect(postulacionesService.obtenerVersiones).toHaveBeenCalledWith(31, 1, expect.any(AbortSignal))
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[0])
    expect(await screen.findByText('Corregir portada')).toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getByText('Corregida')).toBeInTheDocument()
    expect(postulacionesService.obtenerObservaciones).toHaveBeenCalledWith(301, 1, expect.any(AbortSignal))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' }).find((button) => !button.disabled))
    await waitFor(() => expect(postulacionesService.obtenerVersiones).toHaveBeenLastCalledWith(31, 2, expect.any(AbortSignal)))
    await userEvent.click(screen.getAllByRole('button', { name: 'Cerrar' }).at(-1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('descarga una versión mediante el endpoint protegido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const createObjectURL = vi.fn(() => 'blob:documento')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Descargar' }))[1])

    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(302, 'informe-final.pdf'))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento')
  })

  it('muestra un error limpio cuando falla la descarga', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.descargarVersion.mockRejectedValue({ status: 404, message: 'El archivo solicitado no está disponible.' })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Descargar' }))[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo solicitado no está disponible.')
  })

  it('muestra documentos y observaciones vacíos con lenguaje neutral', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    expect(await screen.findByText('No se registraron documentos.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
  })

  it('muestra versiones vacías, incluidos campos opcionales ausentes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('No se registraron versiones.')).toBeInTheDocument()
    expect(screen.getAllByText('No registrada').length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío de observaciones para la versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerObservaciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[0])
    expect(await screen.findByText('Sin observaciones registradas.')).toBeInTheDocument()
    expect(postulacionesService.obtenerObservaciones).toHaveBeenCalledWith(301, 1, expect.any(AbortSignal))
  })

  it('cancela versiones al cerrar el detalle y observaciones al cambiar de versión', async () => {
    const versionSignals = []
    const observationSignals = []
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones.mockImplementation((_id, _page, signal) => {
      versionSignals.push(signal)
      return versionSignals.length === 1 ? new Promise(() => {}) : Promise.resolve(versionsResponse)
    })
    postulacionesService.obtenerObservaciones.mockImplementation((_id, _page, signal) => {
      observationSignals.push(signal)
      return new Promise(() => {})
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await waitFor(() => expect(versionSignals).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(versionSignals[0].aborted).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[0])
    await waitFor(() => expect(observationSignals).toHaveLength(1))
    await userEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[1])
    await waitFor(() => expect(observationSignals).toHaveLength(2))
    expect(observationSignals[0].aborted).toBe(true)
  })

  it.each([
    ['Debes iniciar sesión para consultar los documentos.', 401],
    ['Los documentos no disponibles.', 404],
    ['No se pudieron cargar los documentos. Intenta nuevamente.', undefined],
  ])('mantiene expediente ante error documental parcial %s y reintenta', async (message, status) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(documentsResponse)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar documentos' }))
    expect(await screen.findByText('Informe final')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['staff con rol no reconocido localmente', { id: 9, is_staff: true, rol: { codigo: 'ADMIN-API' } }],
    ['superusuario sin código de rol', { id: 10, is_superuser: true, rol: null }],
  ])('muestra Cargar documento a un %s autorizado por capacidades', async (_label, user) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const auth = { user, roleCode: user.rol?.codigo || '', hasPermission: (name) => name === 'puede_cargar_documentos' }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByRole('button', { name: 'Cargar documento' })).toBeVisible()
  })

  it('oculta Cargar documento a un usuario sin la capacidad backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: () => false }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await screen.findByText('EXP-007')

    expect(screen.queryByRole('button', { name: 'Cargar documento' })).not.toBeInTheDocument()
  })

  it('mantiene Cargar documento para el propietario autorizado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()

    expect(await screen.findByRole('button', { name: 'Cargar documento' })).toBeVisible()
  })

  it('carga un documento inicial con postulación contextual y tipo por nombre', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByRole('option', { name: 'Informe final' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '4')
    expect(screen.queryByLabelText('Defensa Pública finalizada')).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: '4', archivo: file }, expect.any(AbortSignal),
    ))
    expect(await screen.findByText('Documento cargado')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2)
  })

  it('carga un ACTA_DEFENSA vinculada a una Defensa Pública finalizada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      ...defensesResponse,
      results: [defenseRows[0], { ...defenseRows[1], id: 86, tipo_evento: 'DEFENSA_PUBLICA', estado: 'PROGRAMADA' }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')
    const defenseSelect = screen.getByLabelText('Defensa Pública finalizada')
    expect(defenseSelect).toBeRequired()
    expect([...defenseSelect.options].map((option) => option.value)).toEqual(['', '81'])
    const file = new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    await userEvent.selectOptions(defenseSelect, '81')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: '5', archivo: file, eventoDefensaId: '81' }, expect.any(AbortSignal),
    ))
  })

  it('encuentra una Defensa Pública finalizada aunque no esté en la página visible', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockImplementation((_postulacion, page) => Promise.resolve(page === 1
      ? { count: 21, next: 'page=2', previous: null, results: [{ ...defenseRows[1], id: 86, tipo_evento: 'DEFENSA_PUBLICA', estado: 'PROGRAMADA' }] }
      : { count: 21, next: null, previous: 'page=1', results: [defenseRows[0]] }))
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')

    const selector = await screen.findByLabelText('Defensa Pública finalizada')
    expect([...selector.options].map((option) => option.value)).toEqual(['', '81'])
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith(7, 2, expect.any(AbortSignal))
  })

  it('bloquea ACTA_DEFENSA sin evento incluso ante un submit directo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [defenseRows[0], { ...defenseRows[0], id: 87, numero_intento: 2 }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')
    const selector = await screen.findByLabelText('Defensa Pública finalizada')
    expect(selector).toHaveValue('')
    const file = new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    fireEvent.submit(selector.closest('form'))

    expect(await screen.findByText('Selecciona la Defensa Pública finalizada.')).toBeVisible()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra ausencia de candidatas y no permite enviar el Acta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')

    expect(await screen.findByText('No existen Defensas Públicas finalizadas disponibles para vincular el Acta de Defensa.')).toBeVisible()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar documento' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra el error de consulta de candidatas y bloquea el Acta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas
      .mockResolvedValueOnce(defensesResponse)
      .mockRejectedValueOnce({ message: 'No se pudieron consultar las Defensas Públicas.' })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')
    const dialog = screen.getByRole('dialog')

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudieron consultar las Defensas Públicas.')
    expect(within(dialog).getByRole('button', { name: 'Cargar documento' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('limpia el evento al cambiar de postulación', async () => {
    postulacionesService.obtenerExpediente.mockImplementation((id) => Promise.resolve({ ...response, detalle: { ...response.detalle, id: Number(id), codigo: `EXP-${id}` } }))
    postulacionesService.obtenerDefensas.mockImplementation((id) => Promise.resolve({
      count: String(id) === '7' ? 2 : 1, next: null, previous: null,
      results: String(id) === '7' ? [defenseRows[0], { ...defenseRows[0], id: 87 }] : [{ ...defenseRows[0], id: 181 }],
    }))
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar postulación</Link></>} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')
    const firstSelector = await screen.findByLabelText('Defensa Pública finalizada')
    await userEvent.selectOptions(firstSelector, '81')
    await userEvent.click(screen.getByRole('link', { name: 'Cambiar postulación' }))
    await screen.findByText('EXP-8')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cargar documento' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo documental'), '5')
    expect(await screen.findByLabelText('Defensa Pública finalizada')).toHaveValue('181')
  })

  it('limpia el vínculo al dejar ACTA_DEFENSA y conserva otros documentos sin evento', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defenseRows[0]] })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const typeSelector = screen.getByLabelText('Tipo documental')
    await userEvent.selectOptions(typeSelector, '5')
    expect(await screen.findByLabelText('Defensa Pública finalizada')).toHaveValue('81')
    await userEvent.selectOptions(typeSelector, '4')
    expect(screen.queryByLabelText('Defensa Pública finalizada')).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar documento' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: '4', archivo: file }, expect.any(AbortSignal),
    ))
  })

  it('carga una nueva versión derivando postulación y tipo del detalle', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar nueva versión' }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe-v3.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    fireEvent.submit(screen.getByLabelText('Archivo').closest('form'))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file }, expect.any(AbortSignal),
    ))
    expect(await screen.findByText('Nueva versión cargada')).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerVersiones).toHaveBeenCalledTimes(2))
  })

  it('muestra revisión solo con capacidad y aprueba el documento seleccionado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    expect(screen.getByText(/Confirma la aprobación técnica/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: 'Revisado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.aprobarDocumento).toHaveBeenCalledWith(31, 'Revisado', expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2))
  })

  it('valida motivo y conserva el error de campo al rechazar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar documento' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este campo es obligatorio.')
    expect(postulacionesService.rechazarDocumento).not.toHaveBeenCalled()
  })

  it('observa el documento y marca una observación pendiente concreta como corregida', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar observación' }))
    fireEvent.change(screen.getByLabelText('Comentario'), { target: { value: 'Ajustar portada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.observarDocumento).toHaveBeenCalledWith(31, 'Ajustar portada', expect.any(AbortSignal)))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[1])
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar observación corregida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.marcarObservacionCorregida).toHaveBeenCalledWith(401, expect.any(AbortSignal)))
  })

  it('oculta acciones de revisión al estudiante propietario', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(screen.queryByRole('button', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar observación' })).not.toBeInTheDocument()
  })

  it('oculta transiciones para un documento que no está en ENV', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      ...documentsResponse,
      results: [{ ...documentsResponse.results[0], estado_codigo: 'APR', estado_nombre: 'Aprobado' }],
    })
    renderReviewerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(screen.queryByRole('button', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar observación' })).not.toBeInTheDocument()
  })

  it('bloquea doble revisión, muestra Procesando y cancela al cerrar', async () => {
    let signal
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.aprobarDocumento.mockImplementation((_id, _comment, receivedSignal) => {
      signal = receivedSignal
      return new Promise(() => {})
    })
    renderReviewerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar' })
    await userEvent.click(confirm)
    expect(await screen.findByRole('button', { name: 'Procesando…' })).toBeDisabled()
    expect(postulacionesService.aprobarDocumento).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getAllByRole('button', { name: 'Cerrar' }).at(-1))
    expect(signal.aborted).toBe(true)
  })

  it('muestra administración solo con puede_gestionar_defensas y programa con postulación, etapa y payload exactos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    expect(within(dialog).getByText(/regla de 48 horas/i)).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo de defensa'), 'DEFENSA_PRIVADA')
    expect(within(dialog).getByRole('option', { name: 'Defensa Privada — intento 2' })).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Etapa compatible'), '12')
    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala técnica')
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Registro técnico')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Programar defensa' }))
    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-08-20T14:00', lugar: 'Sala técnica', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: 'Registro técnico',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['VIRTUAL', false, true],
    ['MIXTA', true, true],
  ])('aplica campos condicionales de modalidad %s', async (mode, hasPlace, hasLink) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Modalidad técnica'), mode)
    expect(Boolean(within(dialog).queryByLabelText('Lugar'))).toBe(hasPlace)
    expect(Boolean(within(dialog).queryByLabelText('Enlace virtual'))).toBe(hasLink)
    expect(within(dialog).getByRole('note')).toHaveTextContent(/no acreditan autorización normativa/i)
    expect(within(dialog).getByRole('note')).toHaveTextContent(/48 horas.*no acredita publicación/i)
  })

  it('valida fecha, etapa y campos presenciales sin invocar backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Programar defensa' }))
    expect(await screen.findByText('Selecciona un tipo de defensa.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona una etapa compatible.')).toBeInTheDocument()
    expect(screen.getByText('La fecha y hora son obligatorias.')).toBeInTheDocument()
    expect(screen.getByText('El lugar es obligatorio para esta modalidad.')).toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it.each([
    [82, 'Iniciar defensa', 'iniciarDefensa', []],
    [82, 'Suspender defensa', 'suspenderDefensa', ['Motivo técnico']],
    [82, 'Cancelar defensa', 'cancelarDefensa', ['Motivo técnico']],
    [82, 'Reprogramar defensa', 'reprogramarDefensa', ['2026-09-01T10:00', 'Motivo técnico']],
    [83, 'Finalizar defensa', 'finalizarDefensa', []],
  ])('ejecuta %s respetando confirmación y contrato', async (eventId, label, method, args) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    const buttons = await screen.findAllByRole('button', { name: 'Consultar defensa' })
    await userEvent.click(buttons[defenseRows.findIndex((row) => row.id === eventId)])
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: label }))
    const confirm = screen.getAllByRole('dialog').at(-1)
    if (label === 'Reprogramar defensa') fireEvent.change(within(confirm).getByLabelText('Nueva fecha y hora'), { target: { value: args[0] } })
    if (args.at(-1)) await userEvent.type(within(confirm).getByLabelText('Motivo'), args.at(-1))
    await userEvent.click(within(confirm).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService[method]).toHaveBeenCalledWith(eventId, ...args, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2)
  })

  it('no muestra la advertencia de 48 horas para Tesis', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
    })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    expect(screen.queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()
  })

  it('exige motivo, bloquea doble envío, muestra Procesando y cancela la solicitud al cerrar', async () => {
    let signal
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.suspenderDefensa.mockImplementation((_id, _motivo, receivedSignal) => { signal = receivedSignal; return new Promise(() => {}) })
    renderDefenseManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[1])
    await userEvent.click(screen.getByRole('button', { name: 'Suspender defensa' }))
    let dialog = screen.getAllByRole('dialog').at(-1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByText('El motivo es obligatorio.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Pausa técnica')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByRole('button', { name: 'Procesando…' })).toBeDisabled()
    expect(postulacionesService.suspenderDefensa).toHaveBeenCalledTimes(1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(signal.aborted).toBe(true)
  })

  it.each([
    [400, 'No se pudo completar la acción. Revisa los datos y el estado técnico de la defensa.'],
    [401, 'Debes iniciar sesión para administrar defensas.'],
    [403, 'No tienes autorización para administrar defensas.'],
    [404, 'La postulación, etapa o defensa ya no está disponible.'],
    [undefined, 'No se pudo completar la acción sobre la defensa. Comprueba tu conexión e intenta nuevamente.'],
  ])('muestra error administrativo %s sin recargar el expediente', async (status, message) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.iniciarDefensa.mockRejectedValue({ status, message, fields: status === 400 ? { non_field_errors: ['Transición inválida.'] } : {} })
    renderDefenseManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[1])
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    await userEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    if (status === 400) expect(screen.getByText('Transición inválida.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('actualiza el detalle seleccionado y vuelve a consultar quórum al iniciar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[1])
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    await userEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('dialog', { name: 'Detalle de defensa' })).getByText('En curso')).toBeInTheDocument()
  })

  it('sincroniza flujo, resultado y cierre en la misma sesión después de consolidar', async () => {
    const privateDefense = {
      ...defenseRows[1],
      estado: 'FINALIZADA',
      estado_display: 'Finalizada',
      evaluaciones: [{ id: 201, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '28.00', ponderacion: '30.00', aporte_ponderado: '28.00' }],
    }
    const stale = {
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', orden: 5 },
      },
      resultado: { data: { nota_privada: null, nota_publica: null, nota_final: null }, error: '' },
      cierre: { data: { ...closureResponse, etapa_actual: 'DEFENSA_PRIVADA' }, error: '' },
    }
    const synchronized = {
      ...stale,
      flujo: {
        ...stale.flujo,
        etapa_actual: { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'PENDIENTE', orden: 6 },
        etapas: stale.flujo.etapas.map((stage) => stage.codigo === 'DEFENSA_PRIVADA'
          ? { ...stage, estado: 'APROBADA' }
          : stage),
      },
      resultado: { data: { nota_privada: '28.00', nota_publica: null, nota_final: null }, error: '' },
      cierre: { data: { ...closureResponse, etapa_actual: 'DEFENSA_PUBLICA' }, error: '' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(stale).mockResolvedValue(synchronized)
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [defenseRows[0], privateDefense] })
    postulacionesService.consolidarEvaluacionDefensa.mockResolvedValue({})
    postulacionesService.obtenerDefensa.mockResolvedValue({
      ...privateDefense,
      resultado_consolidado: { id: 202, tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '28.00', ponderacion: '30.00', aporte_ponderado: '28.00' },
    })

    renderDefenseEvaluationManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Consultar defensa' }))[1])
    await userEvent.click(await screen.findByRole('button', { name: 'Consolidar resultado del evento' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getByText('28.00')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getByText('/ 30')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).getByText('DEFENSA_PUBLICA')).toBeInTheDocument()
    expect(screen.getAllByText('Defensa Pública').length).toBeGreaterThan(0)
  })

  it('no muestra acciones para finalizada/cancelada ni funcionalidades de historias posteriores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    const buttons = await screen.findAllByRole('button', { name: 'Consultar defensa' })
    for (const index of [0, 4]) {
      await userEvent.click(buttons[index])
      const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(dialog).queryByRole('heading', { name: 'Administración técnica' })).not.toBeInTheDocument()
      expect(within(dialog).queryByRole('button', { name: /asistencia|evaluar|consolidar|condición|entrega|cierre/i })).not.toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    }
  })

  it('integra el cierre técnico con faltantes, resultado y advertencia legal sin acciones para lectura', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    const closure = await screen.findByRole('heading', { name: 'Cierre técnico' })
    const card = closure.parentElement
    expect(card).toHaveTextContent('ACTA')
    expect(card).toHaveTextContent('EJEMPLARES')
    expect(card).toHaveTextContent('INFORME')
    expect(card).toHaveTextContent('84.00')
    expect(card).toHaveTextContent(/no sustituye el acta oficial, firmas, legalización, titulación/i)
    expect(within(card).queryByRole('button', { name: /aprobar|concluir|reabrir/i })).not.toBeInTheDocument()
  })

  it('carga la ausencia de informes y muestra el registro solo con capacidad administrativa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    const managed = renderWorkflowManagerPage()
    expect(await screen.findByText('No existen informes registrados para esta etapa.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar informe del tribunal' })).toBeInTheDocument()
    expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal))
    managed.unmount()

    renderOwnerPage()
    await screen.findByRole('heading', { name: 'Revisión de Tribunal Previa' })
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
  })

  it('registra SUFICIENTE con la versión y evidencia correctas y recarga únicamente informes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByText('Documento Final — Versión 1')).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.type(within(dialog).getByLabelText(/Observaciones/), 'Consenso suficiente')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 601, resultado: 'SUFICIENTE', observaciones: 'Consenso suficiente', evidencia_version: 602,
    }, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
  })

  it('exige observaciones para INSUFICIENTE y evita el doble envío', async () => {
    let resolveRequest
    postulacionesService.registrarInformeRevisionTribunal.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'INSUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    const form = within(dialog).getByRole('button', { name: 'Registrar informe' }).closest('form')
    fireEvent.submit(form)
    expect(await within(dialog).findByText(/observaciones son obligatorias/i)).toBeInTheDocument()
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    await userEvent.type(within(dialog).getByLabelText(/Observaciones/), 'Corregir resultados')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledTimes(1)
    await act(async () => resolveRequest({ id: 9 }))
  })

  it('muestra historial ordenado y descarga la evidencia protegida', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:tribunal') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue(tribunalHistory)
    renderWorkflowManagerPage()
    const sufficient = await screen.findByRole('heading', { name: 'Suficiente' })
    const insufficient = screen.getByRole('heading', { name: 'Insuficiente' })
    expect(sufficient.compareDocumentPosition(insufficient) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Versión conforme')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Descargar evidencia' })[0])
    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(602, 'informe-tribunal.pdf'))
    vi.restoreAllMocks()
  })

  it.each([
    [400, 'Revisa el resultado.', { resultado: ['Resultado inválido.'] }, 'Resultado inválido.'],
    [403, 'No tienes autorización para gestionar los informes del tribunal.', {}, null],
    [404, 'El seguimiento o informe solicitado ya no está disponible.', {}, null],
  ])('presenta errores %s del backend completos y por campo', async (status, message, fields, fieldText) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.registrarInformeRevisionTribunal.mockRejectedValue({ status, message, fields })
    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    if (fieldText) expect(within(dialog).getByText(fieldText)).toBeInTheDocument()
  })

  it('aprueba revisión final con confirmación y actualización parcial', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderClosureManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar revisión final' }))
    await userEvent.type(screen.getByLabelText('Observaciones'), 'Revisión técnica completa')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.aprobarRevisionFinal).toHaveBeenCalledWith(7, 'Revisión técnica completa', expect.any(AbortSignal)))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Aprobada')).toBeInTheDocument()
    confirm.mockRestore()
  })

  it('exige motivo al reabrir y conserva errores funcionales por campo', async () => {
    const closed = { ...response, cierre: { data: { ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_aprobar_revision_final: false, puede_concluir: true }, error: '' } }
    postulacionesService.obtenerExpediente.mockResolvedValue(closed)
    postulacionesService.reabrirCierre.mockRejectedValue({ status: 409, message: 'La acción no cumple las precondiciones del cierre técnico.', fields: { motivo: ['Reapertura no permitida.'] } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderClosureManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir cierre' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Confirmar' }).closest('form'))
    expect(await screen.findByText('motivo: El motivo es obligatorio.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Motivo'), 'Corrección técnica')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('motivo: Reapertura no permitida.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })
})
