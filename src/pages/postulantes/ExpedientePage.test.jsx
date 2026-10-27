import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExpedientePage from './ExpedientePage'
import { getActiveTribunalComposition } from './tribunalComposition'
import { postulacionesService } from '../../services/postulacionesService'
import { AuthContext } from '../../context/AuthContext'

const { humanizeRequirementCode } = vi.hoisted(() => {
  const humanizeRequirementCode = (value) => {
    const code = String(value || '').split(':').pop()
    const overrides = {
      ACTA_DEFENSA: 'Acta de Defensa',
      CD_RESPALDO: 'CD de respaldo',
      HOJA_APROBACION: 'Hoja de Aprobación',
      INFORME_FINAL_TUTOR: 'Informe Final del Tutor',
      PLAN_ESTUDIOS: 'Plan de estudios',
      PLAZO_MAXIMO: 'Plazo máximo',
    }
    return overrides[code] || code.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }
  return { humanizeRequirementCode }
})

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

const propertyRestorers = []

function definePropertyForTest(target, property, descriptor) {
  const original = Object.getOwnPropertyDescriptor(target, property)
  Object.defineProperty(target, property, descriptor)
  propertyRestorers.push(() => {
    if (original) Object.defineProperty(target, property, original)
    else Reflect.deleteProperty(target, property)
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  while (propertyRestorers.length) propertyRestorers.pop()()
})

vi.mock('../../services/postulacionesService', () => ({
  humanizeRequirementCode,
  postulacionesService: {
    obtenerExpediente: vi.fn(), obtenerCapacidadesModalidad: vi.fn(), inicializarFlujo: vi.fn(), iniciarEtapa: vi.fn(), aprobarEtapa: vi.fn(), obtenerHistorial: vi.fn(), obtenerActores: vi.fn(), obtenerDocumentos: vi.fn(),
    obtenerExamenGrado: vi.fn(), concluirExamenGrado: vi.fn(), obtenerExcelenciaAcademica: vi.fn(), concluirExcelenciaAcademica: vi.fn(), obtenerDiplomado: vi.fn(), obtenerTrabajoDirigido: vi.fn(), registrarInformeTrabajoDirigido: vi.fn(), concluirTrabajoDirigido: vi.fn(),
    obtenerVersiones: vi.fn(), descargarVersion: vi.fn(), obtenerObservaciones: vi.fn(), obtenerTiposDocumento: vi.fn(), obtenerTiposDocumentosHistoricos: vi.fn(), cargarDocumento: vi.fn(), subirDocumentoHistorico: vi.fn(),
    aprobarDocumento: vi.fn(), rechazarDocumento: vi.fn(), observarDocumento: vi.fn(), marcarObservacionCorregida: vi.fn(),
    obtenerDefensas: vi.fn(), obtenerQuorumDefensa: vi.fn(), programarDefensa: vi.fn(), iniciarDefensa: vi.fn(),
    finalizarDefensa: vi.fn(), suspenderDefensa: vi.fn(), cancelarDefensa: vi.fn(), reprogramarDefensa: vi.fn(),
    registrarEvaluacionDefensa: vi.fn(), consolidarEvaluacionDefensa: vi.fn(), obtenerDefensa: vi.fn(), concluirAcademicamente: vi.fn(),
    obtenerAsignacionesCandidatas: vi.fn(), agregarParticipanteDefensa: vi.fn(), retirarParticipanteDefensa: vi.fn(), registrarAsistenciaDefensa: vi.fn(),
    obtenerCondiciones: vi.fn(), verificarCondicion: vi.fn(), verificarCondiciones: vi.fn(), rechazarCondicion: vi.fn(),
    obtenerEntregas: vi.fn(), crearEntregaFisica: vi.fn(), registrarEntrega: vi.fn(), registrarEntregas: vi.fn(),
    obtenerCierre: vi.fn(), aprobarRevisionFinal: vi.fn(), aprobarCierreDocumental: vi.fn(),
    concluirPostulacion: vi.fn(), reabrirCierre: vi.fn(),
    obtenerCandidatosAsignacion: vi.fn(), obtenerCandidatosElegibles: vi.fn(), obtenerTribunalesActivos: vi.fn(), asignarActor: vi.fn(), reemplazarActor: vi.fn(), finalizarAsignacion: vi.fn(), registrarDecisionAcademica: vi.fn(), obtenerMemorandumsDesignacion: vi.fn(), publicarMemorandumDesignacion: vi.fn(),
    obtenerInformesRevisionTribunal: vi.fn(), registrarInformeRevisionTribunal: vi.fn(), actualizarEvidenciaInformeRevisionTribunal: vi.fn(),
    obtenerDictamenesRevision: vi.fn(), registrarDictamenRevision: vi.fn(),
    obtenerDocumentosAplicables: vi.fn(),
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
    evaluaciones: [{ id: 101, tipo_evaluacion: 'PUBLICA', tipo_display: 'Pública', evaluador_nombre: null, modalidad_registro: 'CONSENSO', modalidad_registro_display: 'Consenso', resultado_cualitativo: '', nota_numerica: '60.00', ponderacion: '70.00', aporte_ponderado: '60.00', semantica_nota: 'LEGACY_PONDERADA' }],
    resultado_consolidado: { id: 102, tipo_evaluacion: 'RESULTADO_FINAL', tipo_display: 'Resultado final', evaluador_nombre: null, modalidad_registro: 'CONSENSO', modalidad_registro_display: 'Consenso', resultado_cualitativo: '', nota_numerica: '60.00', ponderacion: '70.00', aporte_ponderado: '60.00', semantica_nota: 'LEGACY_PONDERADA' },
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
    etapas_completadas: 1,
    etapas_totales: 4,
    etapas: [
      { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
      { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'OBSERVADA', numero_intento: 2, activo: true },
      { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'PENDIENTE', numero_intento: 1, activo: true },
    ],
    gestion_actores: { contexto: null, posiciones: [] },
    gestion_decisiones_academicas: { contexto: null, decisiones: [] },
  },
  resultado: {
    data: { nota_privada: '24.00', nota_publica: '60.00', aporte_privada: '24.00', aporte_publica: '60.00', semantica_privada: 'LEGACY_PONDERADA', semantica_publica: 'LEGACY_PONDERADA', clasificacion: 'APROBACION_PLENA', resultado: 'APROBACION_PLENA', nota_final: '84.00', limitacion_normativa: '' },
    error: '',
  },
  cierre: {
    data: closureResponse,
    error: '',
  },
}

const thesisPostPublicResponse = {
  ...response,
  detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
  flujo: {
    ...response.flujo,
    modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
    etapa_actual: { id: 82, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true },
    porcentaje_avance: 100,
    etapas: Array.from({ length: 8 }, (_, index) => ({ id: 75 + index, codigo: index === 7 ? 'DEFENSA_PUBLICA' : `ETAPA_${index + 1}`, nombre: index === 7 ? 'Defensa Pública' : `Etapa ${index + 1}`, estado: 'APROBADA', activo: true })),
    orientacion_etapa_actual: {
      mensaje: 'Completa las precondiciones y gestiona la Defensa Publica.',
      requisitos: [{ tipo: 'OPERATIVO', codigo: 'RESULTADO_CONSOLIDADO', nombre: 'Resultado consolidado', cumplido: true, estado_display: 'Cumplido', destino: '#resumen' }],
      siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar etapa', descripcion: 'La defensa tiene un resultado consolidado.', estado: 'DISPONIBLE', estado_display: 'Disponible', destino: '#resumen' },
    },
  },
  resultado: { data: { nota_privada: '28.00', nota_publica: '70.00', aporte_publica: '49.00', nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
}

const genericProgrammingResponse = {
  ...response,
  flujo: {
    ...response.flujo,
    etapa_actual: { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
    orientacion_etapa_actual: { siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', estado: 'DISPONIBLE' }, requisitos: [] },
  },
}

function trabajoDirigidoPublicDefenseResponse() {
  const stage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
  const documentRequirements = Array.from({ length: 9 }, (_, index) => ({
    tipo: 'DOCUMENTO',
    codigo: `DOCUMENTO_TD_${index + 1}`,
    nombre: `Documento TD ${index + 1}`,
    cumplido: false,
    estado: 'NO_PRESENTADO',
    estado_display: 'No presentado',
    destino: '#documentos',
    bloquea_siguiente_accion: false,
  }))
  return {
    ...response,
    detalle: {
      ...response.detalle,
      modalidad_detalle: { id: 3, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
    },
    flujo: {
      ...response.flujo,
      modalidad: { id: 3, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      etapa_actual: stage,
      etapas: [stage],
      orientacion_etapa_actual: {
        mensaje: 'La programación requiere completar las autoridades de la Defensa Pública.',
        requisitos: [
          { tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 3, minimo: 3, cumplido: true, estado_display: '3/3 cumplido' },
          { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', actual: 0, minimo: 1, cumplido: false, estado_display: '0/1 pendiente' },
          { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', actual: 0, minimo: 1, cumplido: false, estado_display: '0/1 pendiente' },
          ...documentRequirements,
        ],
        siguiente_accion: {
          codigo: 'GESTIONAR_ACTORES',
          titulo: 'Completar autoridades',
          descripcion: 'Asigna el Presidente y el Secretario de esta Defensa Pública.',
          estado: 'PENDIENTE',
          destino: null,
          accion_label: 'Completar autoridades',
          capacidades: { modal: 'PUBLIC_AUTHORITIES' },
        },
      },
    },
  }
}

const tribunalStage = { id: 4, codigo: 'REVISION_TRIBUNAL_PREVIA', nombre: 'Revisión de Tribunal Previa', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
const tribunalResponse = { ...response, flujo: { ...response.flujo, etapa_actual: tribunalStage, etapas: [...response.flujo.etapas, tribunalStage] } }
const tribunalDocuments = {
  count: 2, next: null, previous: null, results: [
    { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.doc', es_version_actual: true, activo: true }] },
    { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de Evaluación del Tribunal', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
  ],
}
const tribunalHistory = [
  { id: 702, resultado: 'SUFICIENTE', resultado_display: 'Suficiente', numero_version_revisada: 2, evidencia_version: 602, evidencia_nombre_original: 'informe-v2.pdf', fecha_registro: '2026-08-16T12:00:00Z', registrado_por_nombre: 'Administradora', observaciones: 'Versión conforme', activo: true },
  { id: 701, resultado: 'INSUFICIENTE', resultado_display: 'Insuficiente', numero_version_revisada: 1, evidencia_version: 603, evidencia_nombre_original: 'informe-v1.pdf', fecha_registro: '2026-08-10T12:00:00Z', registrado_por_nombre: 'Administradora', observaciones: 'Requiere correcciones', activo: true },
]

function renderPage(hash = null) {
  if (hash) selectInitialTab(hash)
  return render(
    <MemoryRouter initialEntries={['/postulaciones/7']}>
      <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
    </MemoryRouter>,
  )
}

function selectInitialTab(hash) {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${hash}`)
}

function renderOwnerPage(hash = 'documentos') {
  selectInitialTab(hash)
  const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function prepareContextualThesisActa() {
  const stage = { ...thesisPostPublicResponse.flujo.etapa_actual }
  const fresh = { ...thesisPostPublicResponse, flujo: { ...thesisPostPublicResponse.flujo, etapas: [stage] } }
  const event = { ...defenseRows[0], id: 81, postulacion: 7, seguimiento_etapa: stage.id, numero_intento: stage.numero_intento, tipo_evento: 'DEFENSA_PUBLICA', estado: 'FINALIZADA', activo: true }
  const applicable = { postulacion_id: 7, modalidad: 'TESIS_GRADO', etapa_actual: 'DEFENSA_PUBLICA', documentos_aplicables: [{ id: 5, codigo: 'ACTA_DEFENSA', nombre: 'Acta de Defensa', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } }] }
  postulacionesService.obtenerExpediente.mockResolvedValue(fresh)
  postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, results: [] })
  postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, results: [event] })
  postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(applicable)
  return { stage, fresh, event, applicable }
}

function renderStudentPage({ permissions = ['puede_ver_postulaciones', 'puede_ver_documentos', 'puede_cargar_documentos'] } = {}) {
  const auth = { user: { id: 3, rol: { codigo: 'ESTUDIANTE' } }, roleCode: 'ESTUDIANTE', hasPermission: (name) => permissions.includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /><Route path="/documentos" element={<h1>Mis documentos</h1>} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderReviewerPage() {
  selectInitialTab('documentos')
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderDefenseManagerPage(hash = 'defensas') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_defensas' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderDefenseDocumentsAdminPage(hash = 'defensas') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_defensas', 'puede_gestionar_documentos', 'puede_cargar_documentos'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderDefenseEvaluationManagerPage() {
  selectInitialTab('defensas')
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_defensas', 'puede_gestionar_evaluaciones'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderClosureManagerPage(hash = 'condiciones-tecnicas') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_cierre' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderApplicationManagerPage(hash = null) {
  if (hash) selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_postulaciones' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderApplicationUploadManagerPage(hash = null) {
  if (hash) selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_cargar_documentos'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderAssignmentManagerPage(hash = 'actores') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_asignaciones' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function thesisPublicAuthoritiesResponse({ president = 0, secretary = 0, stages, action = {} } = {}) {
  const stage = { id: 82, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
  return {
    ...response,
    detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
    flujo: {
      ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO' }, etapa_actual: stage, etapas: stages || [stage],
      orientacion_etapa_actual: {
        operacion: 'ORIENTAR_ETAPA', mensaje: 'Completa las precondiciones y gestiona la Defensa Pública.',
        requisitos: [['TRIBUNAL', 'Tribunales', 3, 3], ['PRESIDENTE', 'Presidente', president, 1], ['SECRETARIO', 'Secretario', secretary, 1]].map(([codigo, nombre, actual, minimo]) => ({
          tipo: 'ACTOR', codigo, nombre, actual, minimo, cumplido: actual >= minimo, estado_display: actual >= minimo ? 'Cumplido' : 'Pendiente', destino: '#actores',
        })),
        siguiente_accion: {
          codigo: 'GESTIONAR_PRECONDICIONES', titulo: 'Actores de la postulación',
          descripcion: 'Completa las asignaciones requeridas antes de programar la Defensa Pública',
          estado: 'PENDIENTE', destino: '#actores', accion_label: 'Completar autoridades', requiere_permiso: 'GESTIONAR_ASIGNACIONES', ...action,
        },
      },
    },
  }
}

function renderWorkflowManagerPage() {
  selectInitialTab('informes-etapa')
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function renderWorkflowAssignmentManagerPage(hash = 'actores') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_seguimiento', 'puede_gestionar_asignaciones'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

function profileContracts({ assignedTribunals = [], proposalApproved = false, tutorAssigned = false, canRegister = true } = {}) {
  const stage = { id: 22, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
  const participants = assignedTribunals.map(({ id, name, order }) => ({
    asignacion: id, usuario: id + 100, usuario_nombre: name, rol: 'TRIBUNAL', orden: order,
  }))
  const complete = participants.length === 3 && participants.map((item) => item.orden).sort().join(',') === '1,2,3'
  const positions = [1, 2, 3].map((order) => {
    const participant = participants.find((item) => item.orden === order)
    return {
      clave: `TRIBUNAL_PERFIL_${order}`,
      tipo_participacion: 'TRIBUNAL',
      nombre: `Tribunal ${order}`,
      restriccion_identidad: { grupo: 'TRIBUNAL_PERFIL', unica_persona: true },
      orden_cargo: order,
      obligatoriedad: true,
      habilitada: true,
      estado_ocupacion: participant ? 'ASIGNADA' : 'VACANTE',
      ambito: 'ETAPA',
      seguimiento_etapa: stage.id,
      asignacion_actual: participant?.asignacion ?? null,
      asignacion_actual_detalle: participant ? {
        id: participant.asignacion,
        usuario: { id: participant.usuario, nombre: participant.name },
        tipo_participacion: 'TRIBUNAL',
        orden_cargo: order,
        ambito: 'ETAPA',
        seguimiento_etapa: stage.id,
      } : null,
      acciones_permitidas: participant ? ['REEMPLAZAR', 'FINALIZAR'] : ['ASIGNAR'],
      bloqueo: null,
      precondicion: null,
    }
  })
  positions.push({
    clave: 'TUTOR_PROYECTO_1',
    tipo_participacion: 'TUTOR',
    nombre: 'Tutor',
    orden_cargo: null,
    obligatoriedad: true,
    habilitada: true,
    estado_ocupacion: tutorAssigned ? 'ASIGNADA' : 'VACANTE',
    ambito: 'POSTULACION',
    seguimiento_etapa: null,
    asignacion_actual: tutorAssigned ? 90 : null,
    asignacion_actual_detalle: tutorAssigned ? {
      id: 90,
      usuario: { id: 190, nombre: 'María Tutora' },
      tipo_participacion: 'TUTOR',
      orden_cargo: null,
      ambito: 'POSTULACION',
      seguimiento_etapa: null,
    } : null,
    acciones_permitidas: [tutorAssigned ? 'REEMPLAZAR' : 'ASIGNAR'],
    restriccion_identidad: null,
    bloqueo: null,
    precondicion: null,
  })
  const decision = {
    codigo: 'PROPUESTA_APROBADA',
    nombre: 'Aprobación de propuesta',
    estado: proposalApproved ? 'CUMPLIDA' : 'PENDIENTE',
    cumplida: proposalApproved,
    resultados_permitidos: ['APROBADA'],
    resultado_actual: proposalApproved ? 'APROBADA' : null,
    participantes_requeridos: { roles: ['TRIBUNAL'], minimo: 3, maximo: 3, ordenes: [1, 2, 3] },
    participantes_disponibles: participants,
    participantes_actuales: participants,
    habilitada: complete || proposalApproved,
    acciones_permitidas: proposalApproved
      ? canRegister ? ['REEMPLAZAR'] : []
      : complete && canRegister ? ['REGISTRAR'] : [],
    bloqueo: complete ? null : { codigo: 'COMPOSICION_PARTICIPANTES_INCOMPLETA', mensaje: 'Falta completar la composición formal requerida para registrar la decisión.' },
    decision_actual: proposalApproved ? { id: 71, resultado: 'APROBADA', participantes: participants } : null,
    reemplazable: proposalApproved && canRegister,
    memorandum_designacion: {
      tipo_documento: 'MEMORANDUM_DESIGNACION_PROYECTO',
      decision_academica: 'PROPUESTA_APROBADA',
      titulo: 'Memorándum oficial de designación',
      publicacion_independiente: true,
    },
  }
  const orientationAction = proposalApproved
    ? { codigo: tutorAssigned ? 'CONTINUAR' : 'GESTIONAR_ACTORES', titulo: tutorAssigned ? 'Continuar' : 'Gestionar Tutor', descripcion: 'Gestiona las posiciones pendientes.', destino: '#actores', accion_label: 'Gestionar actores', estado: 'PENDIENTE' }
    : complete
      ? { codigo: 'REGISTRAR_DECISION', titulo: 'Registrar decisión académica', descripcion: 'Registra la decisión declarada por la policy.', destino: '#decisiones-academicas', accion_label: 'Registrar decisión', estado: 'PENDIENTE' }
      : { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar composición formal', descripcion: 'Completa las posiciones formales pendientes.', destino: '#actores', accion_label: 'Gestionar actores', estado: 'PENDIENTE' }
  return {
    stage,
    flow: {
      ...response.flujo,
      etapa_actual: stage,
      etapas: [stage],
      orientacion_etapa_actual: { mensaje: orientationAction.descripcion, requisitos: [], siguiente_accion: orientationAction },
      gestion_actores: { contexto: { tipo: 'ETAPA', seguimiento_etapa: stage.id, codigo_etapa: stage.codigo, regimen_workflow: 'PG_HITOS_V1' }, posiciones: positions },
      gestion_decisiones_academicas: { contexto: { seguimiento_etapa: stage.id, codigo_etapa: stage.codigo }, decisiones: [decision] },
    },
  }
}

describe('getActiveTribunalComposition', () => {
  it.each([
    [[1, 2, 3], [], true],
    [[1, 2], [3], false],
    [[1, 3], [2], false],
    [[2, 3], [1], false],
    [[1], [2, 3], false],
  ])('calcula órdenes %j', (orders, missingOrders, complete) => {
    const composition = getActiveTribunalComposition(orders.map((orden_cargo) => ({ tipo_participacion: 'TRIBUNAL', orden_cargo, activo: true })))
    expect(composition).toEqual({ occupiedOrders: orders, missingOrders, firstMissingOrder: missingOrders[0] ?? null, complete })
  })

  it('excluye autoridades, inactivos y órdenes fuera de 1 a 3', () => {
    expect(getActiveTribunalComposition([
      { tipo_participacion: 'PRESIDENTE', orden_cargo: 3, activo: true },
      { tipo_participacion: 'SECRETARIO', orden_cargo: 2, activo: true },
      { tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: false },
      { tipo_participacion: 'TRIBUNAL', orden_cargo: 4, activo: true },
    ])).toEqual({ occupiedOrders: [], missingOrders: [1, 2, 3], firstMissingOrder: 1, complete: false })
  })
})

describe('ExpedientePage US-008', () => {
  beforeEach(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    vi.resetAllMocks()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerExamenGrado.mockResolvedValue({ areas: [], resultado_final: null, tribunales: [] })
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterios: [], documentos_requeridos: [] })
    postulacionesService.obtenerDiplomado.mockResolvedValue({ modulos: [] })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true })
    postulacionesService.inicializarFlujo.mockResolvedValue({})
    postulacionesService.iniciarEtapa.mockResolvedValue({ id: 21, codigo: 'INSCRIPCION', estado: 'EN_PROCESO' })
    postulacionesService.aprobarEtapa.mockResolvedValue({ id: 21, codigo: 'INSCRIPCION', estado: 'APROBADA' })
    postulacionesService.obtenerHistorial.mockResolvedValue(historyResponse)
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([])
    postulacionesService.obtenerCandidatosAsignacion.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, username: 'Admin', nombre_completo: 'Yesenia Sandoval', codigo: 'Admin', rol_codigo: 'ADMINISTRADOR', rol_nombre: 'Administrador', activo: true },
      { id: 41, username: 'Johnny', nombre_completo: 'Johnny Rosas', codigo: 'Johnny', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ] })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, username: 'Admin', nombre_completo: 'Yesenia Sandoval', codigo: 'Admin', rol_codigo: 'ADMINISTRADOR', rol_nombre: 'Administrador', activo: true },
      { id: 41, username: 'Johnny', nombre_completo: 'Johnny Rosas', codigo: 'Johnny', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ] })
    postulacionesService.asignarActor.mockResolvedValue({ id: 90 })
    postulacionesService.reemplazarActor.mockResolvedValue({ id: 91 })
    postulacionesService.registrarDecisionAcademica.mockResolvedValue({ id: 7 })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([])
    postulacionesService.publicarMemorandumDesignacion.mockResolvedValue({ id: 8, vigente: true })
    postulacionesService.finalizarAsignacion.mockResolvedValue({ id: 7, activo: false })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])
    postulacionesService.actualizarEvidenciaInformeRevisionTribunal.mockResolvedValue({ id: 771, resultado: 'SUFICIENTE', evidencia_version: 603, activo: true })
    postulacionesService.obtenerDictamenesRevision.mockResolvedValue([])
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 4, codigo: 'INFORME_FINAL', nombre: 'Informe final', capacidad_carga: { permitida: true } },
      { id: 5, codigo: 'ACTA_DEFENSA', nombre: 'Acta de Defensa', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 21, codigo: 'ACTA_DEFENSA', nombre: 'Acta de defensa histórica' },
    ])
    postulacionesService.subirDocumentoHistorico.mockResolvedValue({ id: 303, numero_version: 1, es_version_actual: true })
    postulacionesService.registrarInformeRevisionTribunal.mockResolvedValue({ id: 501, resultado: 'SUFICIENTE' })
    postulacionesService.obtenerDocumentos.mockResolvedValue(documentsResponse)
    postulacionesService.obtenerVersiones.mockResolvedValue(versionsResponse)
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['archivo']), filename: 'informe-final.pdf' })
    postulacionesService.obtenerObservaciones.mockResolvedValue(observationsResponse)
    postulacionesService.obtenerTiposDocumento.mockResolvedValue([
      { id: 4, nombre: 'Informe final', activo: true },
      { id: 5, codigo: 'ACTA_DEFENSA', nombre: 'Acta de Defensa', activo: true },
    ])
    postulacionesService.cargarDocumento.mockResolvedValue({ id: 303, numero_version: 3, es_version_actual: true })
    postulacionesService.aprobarDocumento.mockResolvedValue({ id: 31, estado_codigo: 'APR' })
    postulacionesService.rechazarDocumento.mockResolvedValue({ id: 31, estado_codigo: 'REC' })
    postulacionesService.observarDocumento.mockResolvedValue({ id: 403, version_documento: 302 })
    postulacionesService.marcarObservacionCorregida.mockResolvedValue({ id: 401, corregida: true })
    postulacionesService.obtenerDefensas.mockResolvedValue(defensesResponse)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue(quorumResponse)
    postulacionesService.obtenerAsignacionesCandidatas.mockResolvedValue({ results: [] })
    postulacionesService.agregarParticipanteDefensa.mockResolvedValue({})
    postulacionesService.retirarParticipanteDefensa.mockResolvedValue({})
    postulacionesService.registrarAsistenciaDefensa.mockResolvedValue({})
    postulacionesService.obtenerDefensa.mockResolvedValue(defenseRows[2])
    postulacionesService.obtenerCondiciones.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.obtenerEntregas.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.crearEntregaFisica.mockResolvedValue({ id: 99 })
    postulacionesService.verificarCondiciones.mockResolvedValue([])
    postulacionesService.registrarEntregas.mockResolvedValue([])
    postulacionesService.obtenerCierre.mockResolvedValue(closureResponse)
    postulacionesService.aprobarRevisionFinal.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: true })
    postulacionesService.aprobarCierreDocumental.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: false, puede_concluir: true })
    postulacionesService.concluirPostulacion.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_concluir: false, concluida: true, estado_general: 'CONCLUIDA' })
    postulacionesService.concluirAcademicamente.mockResolvedValue({ ...response.detalle, estado_actual_detalle: { id: 5, codigo: 'CONCLUIDA', nombre: 'Concluida' } })
    postulacionesService.reabrirCierre.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: false, puede_aprobar_cierre: true })
    postulacionesService.programarDefensa.mockResolvedValue({ ...defenseRows[1], id: 86 })
    postulacionesService.iniciarDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'EN_CURSO', estado_display: 'En curso' })
    postulacionesService.finalizarDefensa.mockResolvedValue({ ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada' })
    postulacionesService.suspenderDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'SUSPENDIDA', estado_display: 'Suspendida' })
    postulacionesService.cancelarDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'CANCELADA', estado_display: 'Cancelada' })
    postulacionesService.reprogramarDefensa.mockResolvedValue({ ...defenseRows[1], fecha_programada: '2026-09-01T10:00:00Z' })
  })

  const directedConclusionResponse = ({ concluded = false, blocked = false, nota = '91.25' } = {}) => {
    const stage = { id: 901, codigo: 'CIERRE_DOCUMENTAL', nombre: 'Cierre Documental', orden: 8, estado: 'APROBADA', activo: true, acciones_permitidas: [] }
    const result = { nota_final: nota, clasificacion: 'APROBACION_PLENA_CON_FELICITACION' }
    const title = concluded ? 'Proceso académico concluido' : blocked ? 'Etapas completadas. Conclusión académica bloqueada' : 'Etapas completadas. Conclusión académica pendiente'
    const message = concluded ? 'La conclusión académica está formalizada.' : blocked ? 'La conclusión requiere ACTA_DEFENSA_TD aprobada y vinculada al intento vigente.' : `Las 8 etapas están aprobadas y el resultado final es ${nota.replace('.', ',')}/100 — Aprobación plena con felicitación. Falta formalizar la conclusión académica de la postulación.`
    return { ...response,
      capacidades: { soportada: true, configuracion_valida: true, cierre_soportado: false },
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' }, estado_actual_detalle: { codigo: concluded ? 'CONCLUIDA' : 'EN_PROCESO', nombre: concluded ? 'Concluida' : 'En proceso' } },
      flujo: { ...response.flujo, modalidad: { codigo: 'TRABAJO_DIRIGIDO' }, etapa_actual: stage,
        etapas: [...Array.from({ length: 7 }, (_, index) => ({ id: 910 + index, codigo: `ETAPA_${index}`, nombre: `Etapa ${index}`, estado: 'APROBADA', activo: true })), stage], porcentaje_avance: 100, etapas_completadas: 8, etapas_totales: 8,
        orientacion_etapa_actual: { operacion: 'ORIENTAR_CONCLUSION_ACADEMICA', mensaje: message, resultado_final: result, requisitos: [], siguiente_accion: { codigo: concluded ? 'CONSULTAR_RESULTADO' : blocked ? 'REVISAR_BLOQUEO_CONCLUSION' : 'CONCLUIR_ACADEMICAMENTE', titulo: title, estado: blocked ? 'PENDIENTE' : 'DISPONIBLE', destino: blocked ? '#documentos' : '#modalidad', accion_label: blocked ? 'Revisar bloqueo' : 'Concluir académicamente' } },
      }, resultado: { data: result, error: '' }, cierre: { data: null, error: '' },
    }
  }

  it.each(['resumen', 'modalidad'])('conclusión TD: ejecuta desde %s y refresca estado, orientación e historial', async (tab) => {
    const data = directedConclusionResponse()
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.concluirTrabajoDirigido.mockImplementation(async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse({ concluded: true }))
      return { etapa: 'CIERRE_DOCUMENTAL', estado: 'APROBADA' }
    })
    renderApplicationManagerPage(tab)
    const button = await screen.findByRole('button', { name: 'Concluir académicamente' })
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
    const historyCalls = postulacionesService.obtenerHistorial.mock.calls.length
    await userEvent.click(button)
    await waitFor(() => expect(postulacionesService.concluirTrabajoDirigido).toHaveBeenCalledWith(7, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerHistorial.mock.calls.length).toBeGreaterThan(historyCalls))
    if (tab === 'modalidad') await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('heading', { name: 'Proceso académico concluido' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirTrabajoDirigido).toHaveBeenCalledTimes(1)
  })

  it('conclusión TD: comparte bloqueo de envío entre Resumen y Modalidad, sin POST por navegación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse())
    const pending = deferred()
    postulacionesService.concluirTrabajoDirigido.mockReturnValue(pending.promise)
    renderApplicationManagerPage('resumen')
    const button = await screen.findByRole('button', { name: 'Concluir académicamente' })
    expect(screen.getByText(/Las 8 etapas.*91,25\/100/)).toBeVisible()
    await userEvent.click(screen.getByRole('link', { name: 'Consultar resultado' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
    fireEvent.click(button)
    fireEvent.click(button)
    await userEvent.click(screen.getByRole('tab', { name: 'Modalidad' }))
    expect(screen.getByRole('button', { name: 'Concluyendo…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Concluyendo…' }))
    expect(postulacionesService.concluirTrabajoDirigido).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve({}))
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.queryByText('Proceso académico concluido')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizando expediente…' })).toBeDisabled()
  })

  it('conclusión TD: presenta el error compartido y permite reintentar sin falso éxito', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse())
    postulacionesService.concluirTrabajoDirigido.mockRejectedValue({ message: 'El Acta dejó de estar vigente.' })
    renderApplicationManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Concluir académicamente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El Acta dejó de estar vigente.')
    expect(screen.queryByText('Proceso académico concluido')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Modalidad' }))
    expect(screen.getByRole('alert')).toHaveTextContent('El Acta dejó de estar vigente.')
    expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeEnabled()
  })

  it('conclusión TD: bloqueo oficial impide ambos accesos y orienta a documentos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse({ blocked: true }))
    renderApplicationManagerPage('resumen')
    expect(await screen.findByRole('heading', { name: /Conclusión académica bloqueada/ })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Revisar bloqueo' })).toHaveAttribute('href', '#documentos')
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('tab', { name: 'Modalidad' }))
    const button = screen.getByRole('button', { name: 'Concluir académicamente' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
  })

  it.each([false, true])('conclusión TD: consulta sin permiso administrativo, concluida %s', async (concluded) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse({ concluded, nota: '89.75' }))
    renderPage('resumen')
    expect(await screen.findByRole('heading', { name: concluded ? 'Proceso académico concluido' : /Conclusión académica pendiente/ })).toBeVisible()
    expect(screen.getByText(/Nota final: 89,75\/100/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Consultar resultado' })).toHaveAttribute('href', '#resultado-y-cierre')
    if (!concluded) expect(screen.getByText('La formalización corresponde al personal administrativo autorizado.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
  })

  it('conclusión TD: el estudiante consulta la orientación sin poder formalizar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedConclusionResponse())
    renderStudentPage()
    expect(await screen.findByText('La formalización corresponde al personal administrativo autorizado.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirTrabajoDirigido).not.toHaveBeenCalled()
  })

  it('muestra al estudiante una presentación resumida guiada por el contrato multimodalidad', async () => {
    const stages = Array.from({ length: 5 }, (_, index) => ({
      id: 901 + index,
      nombre: `Fase dinámica ${index + 1}`,
      orden: index + 1,
      estado: index < 2 ? 'APROBADA' : index === 2 ? 'EN_PROCESO' : 'PENDIENTE',
      estado_display: index < 2 ? 'Aprobada' : index === 2 ? 'En proceso' : 'Pendiente',
    }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, codigo: 'MOD-2030-01', modalidad_detalle: { id: 99, codigo: 'MODALIDAD_FUTURA', nombre: 'Modalidad futura' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 99, codigo: 'MODALIDAD_FUTURA', nombre: 'Modalidad futura' },
        porcentaje_avance: 40,
        etapas_completadas: 2,
        etapas_totales: 5,
        etapa_actual: stages[2],
        etapas: stages,
        orientacion_etapa_actual: {
          mensaje: 'Completa la actividad indicada por el engine.',
          siguiente_accion: { titulo: 'Continuar actividad', descripcion: 'Sigue la orientación académica vigente.', estado: 'PENDIENTE', estado_display: 'Pendiente' },
          requisitos: [{ tipo: 'ACADEMICO', codigo: 'REQUISITO_DINAMICO', nombre: 'Requisito dinámico', estado: 'PENDIENTE', estado_display: 'Pendiente' }],
        },
      },
    })

    renderStudentPage()

    expect(await screen.findByRole('heading', { name: 'Modalidad futura' })).toBeInTheDocument()
    expect(screen.getByText('MOD-2030-01')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso académico' })).toHaveValue(40)
    expect(screen.getByText('2 de 5 etapas completadas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fase dinámica 3' })).toBeInTheDocument()
    expect(screen.getByText('Completa la actividad indicada por el engine.')).toBeInTheDocument()
    expect(screen.getByText('Continuar actividad')).toBeInTheDocument()
    expect(screen.getByText('Requisito dinámico')).toBeInTheDocument()
    expect(screen.getAllByText('Fase dinámica 3').find((element) => element.closest('li'))?.closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('heading', { name: 'Cierre técnico' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secciones del expediente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Defensas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Gestión de actores' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Historial' })).not.toBeInTheDocument()
  })

  it.each([
    ['documento pendiente', 'No presentado', 'Ir a documentos'],
    ['documento observado', 'Requiere corrección', 'Corregir documentos'],
  ])('permite al estudiante navegar a Documentos cuando tiene un %s', async (_case, estadoDocumento, accionLabel) => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 31, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: '0/4 requisitos de Inscripción cumplidos.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'CARTA_SOLICITUD_PROYECTO', nombre: 'Carta de solicitud', cumplido: false, estado_display: estadoDocumento, destino: '#documentos' }],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos de Inscripción', descripcion: 'Presenta o corrige los documentos obligatorios.', estado: 'PENDIENTE', destino: '#documentos', accion_label: accionLabel },
        },
      },
    })

    renderStudentPage()

    const link = await screen.findByRole('link', { name: accionLabel })
    expect(link).toHaveAttribute('href', '/documentos')
    await userEvent.click(link)
    expect(await screen.findByRole('heading', { name: 'Mis documentos' })).toBeInTheDocument()
  })

  it('usa un texto de navegación documental de respaldo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Completa los documentos pendientes.', requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos' },
    } } })

    renderStudentPage()

    expect(await screen.findByRole('link', { name: 'Ir a documentos' })).toHaveAttribute('href', '/documentos')
  })

  it.each([
    ['sin permiso de carga', ['puede_ver_postulaciones', 'puede_ver_documentos']],
    ['sin permiso de lectura', ['puede_ver_postulaciones', 'puede_cargar_documentos']],
  ])('no ofrece navegación documental de carga %s', async (_case, permissions) => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Completa los documentos pendientes.', requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    } } })

    renderStudentPage({ permissions })

    await screen.findByText('Completa los documentos pendientes.')
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
  })

  it('permite consultar documentos sin exigir capacidad de carga cuando la acción es informativa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Los documentos están pendientes de revisión.', requisitos: [],
      siguiente_accion: { codigo: 'ESPERAR_REVISION_DOCUMENTOS', titulo: 'Documentos pendientes de revisión', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ver documentos' },
    } } })

    renderStudentPage({ permissions: ['puede_ver_postulaciones', 'puede_ver_documentos'] })

    expect(await screen.findByRole('link', { name: 'Ver documentos' })).toHaveAttribute('href', '/documentos')
  })

  it('no convierte en enlace una acción estudiantil sin destino y conserva la vista simplificada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Espera la revisión administrativa.', requisitos: [],
      siguiente_accion: { codigo: 'ESPERAR_REVISION_DOCUMENTOS', titulo: 'Documentos pendientes de revisión', estado: 'PENDIENTE', accion_label: 'Ir a documentos' },
    } } })

    renderStudentPage()

    expect(await screen.findByText('Documentos pendientes de revisión')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secciones del expediente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Documentos' })).not.toBeInTheDocument()
  })

  it('muestra un título neutral mientras carga la modalidad', () => {
    postulacionesService.obtenerExpediente.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('heading', { name: 'Expediente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expediente de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it('conserva el título neutral cuando falla la carga del expediente', async () => {
    postulacionesService.obtenerExpediente.mockRejectedValue({
      message: 'No se pudo cargar el expediente. Intenta nuevamente.',
    })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el expediente.')
    expect(screen.getByRole('heading', { name: 'Expediente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expediente de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it('muestra la modalidad real al cargar correctamente el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 4, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 4, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: { id: 31, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE' },
        etapas: [{ id: 31, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE' }],
      },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'EXP-007' })).toBeInTheDocument()
    expect(screen.getByText('Trabajo Dirigido')).toBeInTheDocument()
    expect(screen.queryByText('Expediente de Proyecto de Grado')).not.toBeInTheDocument()
  })

  it('mantiene estable la vista estudiantil con orientación nula y flujo vacío', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, porcentaje_avance: 0, etapas_completadas: 0, etapas_totales: 0, etapa_actual: null, etapas: [], orientacion_etapa_actual: null },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    })

    renderStudentPage()

    expect(await screen.findByText('0 de 0 etapas completadas')).toBeInTheDocument()
    expect(screen.getAllByText('Sin etapa actual').length).toBeGreaterThan(0)
    expect(screen.getByText('No hay una orientación pendiente para esta etapa.')).toBeInTheDocument()
    expect(screen.getByText('El flujo académico todavía no fue inicializado.')).toBeInTheDocument()
    expect(screen.getByText('El estado del cierre técnico todavía no está disponible.')).toBeInTheDocument()
  })

  it('conserva el expediente operativo completo para administración', async () => {
    renderPage()

    expect(await screen.findByRole('navigation', { name: 'Secciones del expediente' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Defensas' }))
    expect(screen.getByRole('heading', { name: 'Defensas' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Actores' }))
    expect(screen.getByRole('heading', { name: 'Gestión de actores' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeInTheDocument()
  })

  it('renderiza un expediente histórico como registro histórico y no como workflow operativo', async () => {
    const historicalDetail = {
      ...response,
      detalle: {
        ...response.detalle,
        tipo_registro: 'HISTORICO',
        vigencia: 'CERRADA',
        estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' },
      },
      flujo: {
        ...response.flujo,
        etapa_actual: null,
        porcentaje_avance: 0,
        etapas: [],
        orientacion_etapa_actual: null,
      },
      resultado: { data: null, error: '' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 99, tipo_documento_nombre: 'Acta de defensa histórica', requiere_correccion: false, versiones: [{ id: 991, numero_version: 1, es_version_actual: true, activo: true }] }] })

    renderPage()

    expect(await screen.findByText('Registro histórico')).toBeInTheDocument()
    expect(screen.getByText(/Concluida/i)).toBeInTheDocument()
    expect(screen.queryByText('Avance de tu proceso')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Iniciar proceso de Proyecto de Grado/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Inicializar flujo académico/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/El flujo académico todavía no fue inicializado/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Resultado académico técnico/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cierre técnico/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Condiciones técnicas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Entregas técnicas/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Etapas del flujo académico/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Participación actual/i })).not.toBeInTheDocument()
  })

  it('usa los endpoints históricos para cargar documentos en una postulación histórica', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([{ id: 21, codigo: 'ACTA_DEFENSA', nombre: 'Acta de defensa histórica' }])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    expect(postulacionesService.obtenerTiposDocumentosHistoricos).toHaveBeenCalledWith('7', expect.any(AbortSignal))
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra la carga múltiple histórica con filas por tipo y CTA por cantidad', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 101, nombre: 'Carta de Solicitud para Tesis' },
      { id: 102, nombre: 'Comprobante de Matrícula Vigente' },
      { id: 103, nombre: 'Historial Académico de Prerrequisitos' },
      { id: 104, nombre: 'Perfil de Tesis' },
      { id: 105, nombre: 'Informe del Tutor de Tesis' },
      { id: 106, nombre: 'Informe del Tribunal de Tesis' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    expect(within(dialog).getByText('Carta de Solicitud para Tesis')).toBeInTheDocument()
    expect(within(dialog).getByText('Comprobante de Matrícula Vigente')).toBeInTheDocument()
    expect(within(dialog).getByText('Historial Académico de Prerrequisitos')).toBeInTheDocument()
    expect(within(dialog).getByText('Perfil de Tesis')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe del Tutor de Tesis')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe del Tribunal de Tesis')).toBeInTheDocument()

    const file1 = new File(['a'], 'carta.pdf', { type: 'application/pdf' })
    const file2 = new File(['b'], 'matricula.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Carta de Solicitud para Tesis'), file1)
    await userEvent.upload(within(dialog).getByLabelText('Comprobante de Matrícula Vigente'), file2)

    expect(within(dialog).getByText('2 documentos seleccionados')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Cargar 2 documentos/i })).toBeEnabled()
    expect(within(dialog).getAllByRole('button', { name: /Quitar/i }).length).toBeGreaterThanOrEqual(2)
  })

  it('deshabilita la carga cuando no hay archivos seleccionados y usa el último archivo correcto en el reintento', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 201, nombre: 'Documento 1' },
      { id: 202, nombre: 'Documento 2' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()

    const file = new File(['x'], 'documento-1.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Documento 1'), file)
    expect(within(dialog).getByRole('button', { name: /Cargar 1 documento/i })).toBeEnabled()

    await userEvent.click(within(dialog).getAllByRole('button', { name: /Quitar/i })[0])
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()
  })

  it('ejecuta uploads históricos secuencialmente con los tipos y archivos correctos', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 301, nombre: 'Carta de Solicitud para Tesis' },
      { id: 302, nombre: 'Comprobante de Matrícula Vigente' },
      { id: 303, nombre: 'Perfil de Tesis' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    const first = new File(['uno'], 'carta.pdf', { type: 'application/pdf' })
    const second = new File(['dos'], 'matricula.pdf', { type: 'application/pdf' })
    const third = new File(['tres'], 'perfil.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText('Carta de Solicitud para Tesis'), first)
    await userEvent.upload(within(dialog).getByLabelText('Comprobante de Matrícula Vigente'), second)
    await userEvent.upload(within(dialog).getByLabelText('Perfil de Tesis'), third)
    await userEvent.click(within(dialog).getByRole('button', { name: /Cargar 3 documentos/i }))

    await waitFor(() => expect(postulacionesService.subirDocumentoHistorico).toHaveBeenCalledTimes(3))
    const calls = postulacionesService.subirDocumentoHistorico.mock.calls
    expect(calls[0][0]).toBe(7)
    expect(calls[0][1].get('tipo_documento_id')).toBe('301')
    expect(calls[0][1].get('archivo').name).toBe('carta.pdf')
    expect(calls[1][1].get('tipo_documento_id')).toBe('302')
    expect(calls[1][1].get('archivo').name).toBe('matricula.pdf')
    expect(calls[2][1].get('tipo_documento_id')).toBe('303')
    expect(calls[2][1].get('archivo').name).toBe('perfil.pdf')
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra fallo parcial sin anunciar éxito global ni cancelar los fallidos', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 401, nombre: 'Carta de Solicitud para Tesis' },
      { id: 402, nombre: 'Comprobante de Matrícula Vigente' },
      { id: 403, nombre: 'Perfil de Tesis' },
    ])
    postulacionesService.subirDocumentoHistorico.mockImplementation(async (_id, formData) => {
      const typeId = formData.get('tipo_documento_id')
      if (typeId === '402') throw new Error('Falla simulada del archivo')
      return { id: 900 + Number(typeId) }
    })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    await userEvent.upload(within(dialog).getByLabelText('Carta de Solicitud para Tesis'), new File(['a'], 'a.pdf', { type: 'application/pdf' }))
    await userEvent.upload(within(dialog).getByLabelText('Comprobante de Matrícula Vigente'), new File(['b'], 'b.pdf', { type: 'application/pdf' }))
    await userEvent.upload(within(dialog).getByLabelText('Perfil de Tesis'), new File(['c'], 'c.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Cargar 3 documentos/i }))

    await waitFor(() => expect(within(dialog).getByText(/2 documentos cargados. 1 documento no pudo cargarse./i)).toBeInTheDocument())
    expect(within(dialog).queryByText(/3 documentos cargados/i)).not.toBeInTheDocument()
    expect(within(dialog).getByText('Comprobante de Matrícula Vigente')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
  })

  it('muestra el mensaje de éxito y limpia la selección cuando todos los históricos cargan bien', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([
      { id: 501, nombre: 'Documento A' },
      { id: 502, nombre: 'Documento B' },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))
    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    await userEvent.upload(within(dialog).getByLabelText('Documento A'), new File(['a'], 'a.pdf', { type: 'application/pdf' }))
    await userEvent.upload(within(dialog).getByLabelText('Documento B'), new File(['b'], 'b.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Cargar 2 documentos/i }))

    await waitFor(() => expect(within(dialog).getByText(/2 documentos cargados correctamente/i)).toBeInTheDocument())
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalled()
  })

  it('no muestra fallback cuando el backend histórico devuelve []', async () => {
    const historicalDetail = {
      ...response,
      detalle: { ...response.detalle, tipo_registro: 'HISTORICO', vigencia: 'CERRADA', estado_actual_detalle: { id: 9, codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [], orientacion_etapa_actual: null },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(historicalDetail)
    postulacionesService.obtenerTiposDocumentosHistoricos.mockResolvedValue([])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_documentos'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Registro histórico')
    await userEvent.click(screen.getByRole('button', { name: /Cargar documento/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cargar documentación histórica/i })
    expect(within(dialog).getByText('No hay tipos documentales activos disponibles.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Cargar 0 documentos/i })).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('no muestra la acción de finalización si el usuario no puede gestionar asignaciones', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    const activeHeading = await screen.findByRole('heading', { name: 'Participación actual' })
    const activeGroup = activeHeading.closest('section')
    expect(within(activeGroup).queryByRole('button', { name: /Finalizar asignación/i })).not.toBeInTheDocument()
  })

  it('muestra el botón de finalización sólo para actores vigentes y abre la confirmación', async () => {
    const contracts = profileContracts({ assignedTribunals: [{ id: 1, name: 'Tribunal Uno', order: 1 }], proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderAssignmentManagerPage()

    const activeHeading = await screen.findByRole('heading', { name: 'Participación actual' })
    const activeGroup = activeHeading.closest('section')
    expect(within(activeGroup).queryByRole('button', { name: /Finalizar asignación/i })).not.toBeInTheDocument()
    const actorsCard = activeHeading.closest('[aria-labelledby="actores-title"]')
    fireEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    await userEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))
    expect(within(position).getByLabelText('Motivo u observación')).toBeInTheDocument()
  })

  it('confirma finalización con motivo y evita doble submit', async () => {
    const contracts = profileContracts({ assignedTribunals: [{ id: 1, name: 'Tribunal Uno', order: 1 }], proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    let resolveFinalization
    postulacionesService.finalizarAsignacion.mockImplementation(() => new Promise((resolve) => { resolveFinalization = resolve }))
    renderAssignmentManagerPage()

    const actorsCard = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('[aria-labelledby="actores-title"]')
    await userEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    fireEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))

    const reason = within(position).getByLabelText('Motivo u observación')
    fireEvent.change(reason, { target: { value: 'Regularización por conflicto de roles' } })
    const submit = within(position).getByRole('button', { name: 'Confirmar finalización' })
    fireEvent.click(submit)
    await waitFor(() => expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledWith(1, { observaciones: 'Regularización por conflicto de roles' }, expect.any(AbortSignal)))
    expect(submit).toBeDisabled()
    expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledTimes(1)
    await act(async () => resolveFinalization({ id: 1, activo: false }))
  })

  it('muestra el error específico del backend al finalizar', async () => {
    const contracts = profileContracts({ assignedTribunals: [{ id: 1, name: 'Tribunal Uno', order: 1 }], proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    const error = 'No se puede finalizar la asignación porque participa activamente en un evento PROGRAMADA o EN_CURSO.'
    postulacionesService.finalizarAsignacion.mockRejectedValue({
      message: error,
      response: { status: 400, data: { non_field_errors: ['No se puede finalizar la asignación porque participa activamente en un evento PROGRAMADA o EN_CURSO.'] } },
    })
    renderAssignmentManagerPage()

    const actorsCard = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('[aria-labelledby="actores-title"]')
    fireEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    fireEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))
    const reason = within(position).getByLabelText('Motivo u observación')
    fireEvent.change(reason, { target: { value: 'Motivo inválido' } })
    fireEvent.click(within(position).getByRole('button', { name: 'Confirmar finalización' }))

    expect((await within(position).findAllByText(error)).length).toBeGreaterThan(0)
  })

  it('muestra orientación y CTA de carga de evidencia cuando no hay Informe de Evaluación del Tribunal activo y el usuario puede cargar documentos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 1, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 42, codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', nombre: 'Informe de Evaluación del Tribunal', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_seguimiento'].includes(name) }
    selectInitialTab('resumen')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const notice = await screen.findByText('Carga el Informe de Evaluación del Tribunal.')
    const summary = document.getElementById('panel-resumen')
    const documents = document.getElementById('panel-documentos')
    expect(within(summary).getAllByText('Carga el Informe de Evaluación del Tribunal.')).toHaveLength(1)
    expect(within(documents).queryByText('Carga el Informe de Evaluación del Tribunal.')).not.toBeInTheDocument()
    expect(notice.closest('[data-expediente-panel]')).toBe(summary)
    const registerButton = await within(summary).findByRole('button', { name: 'Registrar informe del tribunal' })
    expect(notice.compareDocumentPosition(registerButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await userEvent.click(within(summary).getByRole('button', { name: 'Cargar Informe de Evaluación' }))
    const uploadDialog = await screen.findByRole('dialog', { name: 'Cargar nueva versión' })
    expect(within(uploadDialog).getByText('Informe de Evaluación del Tribunal')).toBeInTheDocument()
    expect(within(uploadDialog).getByLabelText('Archivo')).toBeInTheDocument()
    const uploadOpener = within(summary).getByRole('button', { name: 'Cargar Informe de Evaluación' })
    await userEvent.click(within(uploadDialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar nueva versión' })).not.toBeInTheDocument())
    expect(document.activeElement).toBe(uploadOpener)
  }, 15000)

  it('permite registrar informe cuando la evidencia viene identificada por su código de tipo documental', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
        { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de revisión', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    renderWorkflowManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })

    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Evidencia' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Registrar informe' })).toBeEnabled()
  })

  it('usa los códigos documentales de Trabajo Dirigido para presentar y enviar el informe del tribunal', async () => {
    const trabajoDirigidoResponse = {
      ...tribunalResponse,
      detalle: { ...tribunalResponse.detalle, modalidad_detalle: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: {
        ...tribunalResponse.flujo,
        modalidad: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 57, tipo_documento_codigo: 'DOCUMENTO_FINAL_TD', tipo_documento_nombre: 'Documento Final de Trabajo Dirigido', activo: true, versiones: [{ id: 537, numero_version: 1, nombre_original: 'documento-final-td.pdf', es_version_actual: true, activo: true }] },
        { id: 59, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_TD', tipo_documento_nombre: 'Informe de revisión del Tribunal', activo: true, versiones: [{ id: 541, numero_version: 3, nombre_original: 'informe-tribunal-td.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    renderWorkflowManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Documentos' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByText('Documento Final — Versión 1')).toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'informe-tribunal-td.pdf — Versión 3' })).toHaveValue('541')
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '541')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 537,
      resultado: 'SUFICIENTE',
      observaciones: '',
      evidencia_version: 541,
    }, expect.any(AbortSignal)))
  }, 15000)

  const directedReviewResponse = (ready = false) => ({ ...tribunalResponse,
    detalle: { ...tribunalResponse.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
    flujo: { ...tribunalResponse.flujo, etapa_actual: { ...tribunalStage, acciones_permitidas: ready ? ['aprobar'] : [] },
      orientacion_etapa_actual: { operacion: 'ORIENTAR_ETAPA', mensaje: ready ? 'Resultado suficiente válido.' : 'Falta registrar el resultado emitido por el Tribunal.',
        permite_aprobar_etapa: ready, requisitos: [], siguiente_accion: { codigo: ready ? 'APROBAR_ETAPA' : 'REGISTRAR_INFORME_TRIBUNAL',
          titulo: ready ? 'Aprobar Revisión de Tribunal Previa' : 'Registrar resultado de revisión del Tribunal',
          estado: 'DISPONIBLE', destino: ready ? '#resumen' : '#informes-etapa', accion_label: ready ? 'Aprobar etapa' : 'Registrar informe del Tribunal' } } },
  })
  const directedReviewDocuments = { count: 2, results: [
    { id: 57, tipo_documento_codigo: 'DOCUMENTO_FINAL_TD', versiones: [{ id: 537, numero_version: 1, es_version_actual: true, activo: true }] },
    { id: 59, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_TD', versiones: [{ id: 541, numero_version: 1, es_version_actual: true, activo: true, nombre_original: 'informe-tribunal-td.pdf' }] },
  ] }

  it('Revisión TD: abre desde Resumen y Documentos sin POST ni aprobación automática', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedReviewResponse())
    postulacionesService.obtenerDocumentos.mockResolvedValue(directedReviewDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])
    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    const trigger = await screen.findByRole('button', { name: 'Registrar informe del Tribunal' })
    await userEvent.dblClick(trigger)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })).toBeVisible()
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe del tribunal' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('Revisión TD: refresca la orientación tras registrar y conserva aprobación explícita', async () => {
    let recorded = false
    postulacionesService.obtenerExpediente.mockImplementation(() => Promise.resolve(directedReviewResponse(recorded)))
    postulacionesService.obtenerDocumentos.mockResolvedValue(directedReviewDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockImplementation(() => Promise.resolve(recorded ? [{ id: 81, activo: true, version_documento_revisada: 537, evidencia_version: 541, resultado: 'SUFICIENTE' }] : []))
    postulacionesService.registrarInformeRevisionTribunal.mockImplementation(async () => { recorded = true; return { id: 81 } })
    selectInitialTab('resumen')
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_seguimiento', 'puede_gestionar_postulaciones'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del Tribunal' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '541')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(await within(summary).findByRole('button', { name: 'Aprobar etapa' })).toBeEnabled()
    expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 537, evidencia_version: 541, resultado: 'SUFICIENTE', observaciones: '',
    }, expect.any(AbortSignal))
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it.each(['permiso', 'error', 'evidencia', 'informe', 'ambiguo'])('Revisión TD: conserva consulta segura con %s', async (reason) => {
    const data = directedReviewResponse()
    if (reason === 'ambiguo') data.flujo.etapas = [...data.flujo.etapas, { ...tribunalStage, id: 999 }]
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDocumentos.mockResolvedValue(reason === 'evidencia' ? { count: 1, results: [directedReviewDocuments.results[0]] } : directedReviewDocuments)
    if (reason === 'error') postulacionesService.obtenerInformesRevisionTribunal.mockRejectedValue({ message: 'Consulta fallida' })
    else postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue(reason === 'informe' ? [{ id: 81, activo: true, version_documento_revisada: 537, resultado: 'SUFICIENTE' }] : [])
    if (reason === 'permiso') renderPage('resumen')
    else { renderWorkflowManagerPage(); await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' })) }
    expect(await screen.findByRole('link', { name: 'Consultar revisión del Tribunal' })).toHaveAttribute('href', '#informes-etapa')
    expect(screen.queryByRole('button', { name: 'Registrar informe del Tribunal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
  })

  it('selecciona INFORME_REVISION_TRIBUNAL_TD al cargar la evidencia de Trabajo Dirigido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      detalle: { ...tribunalResponse.detalle, modalidad_detalle: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: { ...tribunalResponse.flujo, modalidad: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
    })
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 1, next: null, previous: null, results: [
        { id: 57, tipo_documento_codigo: 'DOCUMENTO_FINAL_TD', tipo_documento_nombre: 'Documento Final de Trabajo Dirigido', activo: true, versiones: [{ id: 537, numero_version: 1, nombre_original: 'documento-final-td.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 59, codigo: 'INFORME_REVISION_TRIBUNAL_TD', nombre: 'Informe de revisión del Tribunal', capacidad_carga: { permitida: true } },
    ] })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_seguimiento'].includes(name) }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar Informe de Evaluación' }))
    const uploadDialog = await screen.findByRole('dialog', { name: 'Cargar nueva versión' })
    expect(within(uploadDialog).getByText('Informe de revisión del Tribunal')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
  })

  it('renderiza el resumen, macroetapa, avance y advertencia institucional', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Cargando/)
    expect(await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Gestión 2026 - Semestre II')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Estado actual de tu proceso académico' }).parentElement).getByText('En proceso')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Estado actual de tu proceso académico' }).parentElement).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de tu proceso' })).toHaveValue(25)
    expect(screen.getByRole('navigation', { name: 'Secciones del expediente' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('href', '#documentos')
    expect(screen.getByRole('heading', { name: 'Gestión administrativa pendiente' })).toBeInTheDocument()
    expect(screen.getByText('0 de 3 etapas completadas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(screen.getAllByText('24,00')).toHaveLength(2)
    expect(screen.getAllByText('60,00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('84,00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Registro con escala anterior')).toHaveLength(2)
    expect(screen.getAllByText('Nota de Defensa Privada').length).toBeGreaterThan(0)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Límites normativos' })).not.toBeInTheDocument()
    expect(screen.queryByText(/nota privada es el aporte consensuado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/aprobación y originalidad del tema/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/escala específica confirmada/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cantidad oficial de ejemplares/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/proyectos grupales/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/plazos reglamentarios/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no equivale a legalización/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cierre técnico' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).toHaveClass('overflow-hidden')
    expect(within(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).getByText('En proceso')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Condiciones pendientes' })).getByText('ACTA')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Entregas pendientes' })).getByText('EJEMPLARES')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Documentos pendientes' })).getByText('INFORME')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute('href', '/postulantes')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('ordena las secciones principales y la navegación según la jerarquía del estudiante', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    const { container } = renderOwnerPage('resumen')
    await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })

    const sectionIds = ['resumen', 'documentos', 'defensas', 'actores', 'etapas', 'historial']
    const sections = sectionIds.map((id) => container.querySelector(`#${id}`))
    sections.forEach((section, index) => {
      expect(section, `falta #${sectionIds[index]}`).not.toBeNull()
      expect(container.querySelectorAll(`#${sectionIds[index]}`)).toHaveLength(1)
    })
    sections.slice(0, -1).forEach((section, index) => {
      expect(section.compareDocumentPosition(sections[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    expect(within(sections[0]).getByRole('heading', { name: 'Qué debes hacer ahora' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Etapas' }))
    expect(within(sections[4]).getByRole('heading', { name: 'Etapas del flujo académico' })).toBeInTheDocument()

    const navigation = screen.getByRole('navigation', { name: 'Secciones del expediente' })
    const tabs = within(navigation).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Resumen', 'Documentos', 'Defensas', 'Actores', 'Etapas', 'Historial', 'Resultado y cierre'])
    expect(tabs.slice(0, 6).map((tab) => tab.getAttribute('href'))).toEqual(sectionIds.map((id) => `#${id}`))
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[4]).toHaveAttribute('tabindex', '0')
    expect(tabs.filter((_tab, index) => index !== 4).every((tab) => tab.getAttribute('tabindex') === '-1')).toBe(true)

    await userEvent.click(tabs.at(-1))
    expect(tabs.at(-1)).toHaveClass('after:bg-blue-600')
    expect(tabs.slice(0, 6).every((tab) => !tab.classList.contains('after:bg-blue-600'))).toBe(true)
    const future = screen.getByText('Información de etapas posteriores').closest('details')
    expect(future).not.toHaveAttribute('open')
    expect(sections[5].compareDocumentPosition(future) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(future).getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
  })

  it('muestra solo la pestaña activa y conserva el encabezado principal', async () => {
    const { container } = renderPage()
    const header = await screen.findByRole('heading', { name: 'EXP-007' })
    const summaryPanel = container.querySelector('#panel-resumen')
    const documentsPanel = container.querySelector('#panel-documentos')
    const actorsPanel = container.querySelector('#panel-actores')

    expect(header).toBeVisible()
    expect(summaryPanel).toBeVisible()
    expect(documentsPanel).not.toBeVisible()
    expect(actorsPanel).not.toBeVisible()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveClass('after:bg-blue-600')
    expect(screen.getByRole('tab', { name: 'Documentos' })).not.toHaveClass('after:bg-blue-600')

    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(documentsPanel).toBeVisible()
    expect(summaryPanel).not.toBeVisible()
    expect(window.location.hash).toBe('#documentos')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveClass('after:bg-blue-600')
    expect(screen.getByRole('tab', { name: 'Resumen' })).not.toHaveClass('after:bg-blue-600')

    await userEvent.click(screen.getByRole('tab', { name: 'Actores' }))
    expect(actorsPanel).toBeVisible()
    expect(documentsPanel).not.toBeVisible()
    expect(header).toBeVisible()
  })

  it('selecciona la pestaña indicada por el hash al abrir el expediente', async () => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#actores`)
    const { container } = renderPage()

    await screen.findByRole('heading', { name: 'EXP-007' })

    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('#panel-actores')).toBeVisible()
    expect(container.querySelector('#panel-resumen')).not.toBeVisible()
  })

  it('actualiza la pestaña activa al recorrer el historial del navegador', async () => {
    const { container } = renderPage()
    await screen.findByRole('heading', { name: 'EXP-007' })
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Actores' }))

    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#documentos`)
    fireEvent.popState(window)

    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('#panel-documentos')).toBeVisible()
    expect(container.querySelector('#panel-actores')).not.toBeVisible()
  })

  it('permite cambiar pestaña con flechas y teclas Inicio y Fin', async () => {
    renderPage()
    const summaryTab = await screen.findByRole('tab', { name: 'Resumen' })
    summaryTab.focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Resultado y cierre' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Resultado y cierre' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveFocus()
  })

  it.each([
    ['PROYECTO_GRADO', 'Proyecto de Grado', null, null],
    ['TESIS_GRADO', 'Tesis de Grado', null, null],
    ['TRABAJO_DIRIGIDO', 'Trabajo Dirigido', 'trabajo', 'Trabajo Dirigido'],
    ['EXAMEN_GRADO', 'Examen de Grado', 'examen', 'Examen de Grado por Contenidos'],
    ['GRADUACION_VIA_DIPLOMADO', 'Graduación Vía Diplomado', 'diplomado', 'Graduación Vía Diplomado'],
    ['EXCELENCIA_ACADEMICA', 'Excelencia Académica', 'excelencia', 'Excelencia Académica'],
  ])('mantiene el panel de modalidad exclusivo de %s', async (code, name, service, heading) => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: code, nombre: name } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: code, nombre: name },
        etapa_actual: { ...response.flujo.etapa_actual, codigo: code === 'TRABAJO_DIRIGIDO' ? 'PERFIL_TRABAJO_DIRIGIDO' : 'MODULO_1' },
      },
    })
    if (service === 'trabajo') postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })
    if (service === 'examen') postulacionesService.obtenerExamenGrado.mockResolvedValue({ areas: [], resultado_final: null, tribunales: [] })
    if (service === 'diplomado') postulacionesService.obtenerDiplomado.mockResolvedValue({ modulos: [] })
    if (service === 'excelencia') postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterios: [], documentos_requeridos: [] })

    const { container } = renderApplicationManagerPage()
    await screen.findByRole('heading', { name: 'EXP-007' })

    if (!service) {
      expect(screen.queryByRole('tab', { name: 'Modalidad' })).not.toBeInTheDocument()
      return
    }

    const modalityTab = await screen.findByRole('tab', { name: 'Modalidad' })
    expect(screen.getAllByRole('tab', { name: 'Resultado y cierre' })).toHaveLength(1)
    await userEvent.click(modalityTab)
    expect(modalityTab).toHaveClass('after:bg-blue-600')
    expect(screen.getByRole('tab', { name: 'Resultado y cierre' })).not.toHaveClass('after:bg-blue-600')
    expect(container.querySelector('#modalidad')).toBeVisible()
    expect(within(container.querySelector('#modalidad')).getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(container.querySelector('#panel-resumen')).not.toBeVisible()
  })

  it('conserva el formulario de Trabajo Dirigido al cambiar de pestaña', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: { ...response.flujo.etapa_actual, codigo: 'PERFIL_TRABAJO_DIRIGIDO' },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Modalidad' }))
    const institutionInput = screen.getByLabelText('Institución')
    await userEvent.type(institutionInput, 'Entidad de prueba')
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Modalidad' }))

    expect(screen.getByLabelText('Institución')).toHaveValue('Entidad de prueba')
  })

  it('guía desde Resumen la revisión de tribunal previa y mantiene la información posterior colapsada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: { ...tribunalStage, estado: 'PENDIENTE' },
        etapas: [...response.flujo.etapas, { ...tribunalStage, estado: 'PENDIENTE' }],
        orientacion_etapa_actual: { requisitos: [], siguiente_accion: null },
      },
    })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    selectInitialTab('resumen')
    renderApplicationManagerPage()

    expect(await screen.findByText('Orientación del expediente')).toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    const documents = document.getElementById('panel-documentos')
    expect(within(summary).getByText('Orientación del expediente')).toBeInTheDocument()
    expect(within(summary).queryByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).not.toBeInTheDocument()
    const evidenceNotice = within(summary).getByText('Carga el Informe de Evaluación del Tribunal.')
    const reviewBlock = document.getElementById('informes-etapa')
    expect(reviewBlock).not.toBeNull()
    expect(reviewBlock.closest('[data-expediente-panel]')).toHaveAttribute('data-expediente-panel', 'documentos')
    expect(evidenceNotice.closest('[data-expediente-panel]')).toBe(summary)

    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    const reviews = await within(documents).findAllByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })
    expect(reviews).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Revisión de Tribunal Previa' })).toBeVisible()
    const documentsHeading = within(documents).getByRole('heading', { name: 'Documentos' })
    expect(reviewBlock.compareDocumentPosition(documentsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(document.getElementById('panel-documentos')).queryByText('Carga el Informe de Evaluación del Tribunal.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    const future = screen.getByText('Información de etapas posteriores').closest('details')
    expect(future).not.toHaveAttribute('open')
    const academicResult = within(future).getByRole('heading', { name: 'Resultado académico técnico' })
    const closurePreparation = within(future).getByText('Preparación para cierre')
    const technicalClosure = within(future).getByRole('heading', { name: 'Cierre técnico' })
    const conditions = await within(future).findByText(/^Condiciones técnicas/)
    const deliveries = await within(future).findByText(/^Entregas técnicas/)

    ;[academicResult, closurePreparation, technicalClosure, conditions, deliveries].forEach((block) => {
      expect(block).not.toBeVisible()
    })
    expect(screen.getAllByRole('heading', { name: 'Resultado académico técnico', hidden: true })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: 'Cierre técnico', hidden: true })).toHaveLength(1)

    await userEvent.click(within(future).getByText('Información de etapas posteriores'))

    expect(future).toHaveAttribute('open')
    ;[academicResult, closurePreparation, technicalClosure, conditions, deliveries].forEach((block) => {
      expect(block).toBeVisible()
    })
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(await within(documents).findByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).toBeInTheDocument()
  }, 15000)

  it('presenta el origen y el estado de los actores con los rótulos visuales del expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      flujo: { ...tribunalResponse.flujo, orientacion_etapa_actual: { requisitos: [], siguiente_accion: null } },
    })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))

    renderPage()

    const designations = await screen.findAllByText('Designado desde')
    expect(designations.length).toBeGreaterThan(0)
    expect(screen.getAllByText('Estado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vigente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Perfil de Proyecto').length).toBeGreaterThan(0)
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
    expect(screen.getAllByText('APROBACIÓN PLENA').length).toBeGreaterThan(0)
  })

  const projectStages = (inscriptionState = 'PENDIENTE', profileState = 'PENDIENTE') => [
    { id: 21, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: inscriptionState, numero_intento: 1, activo: true },
    { id: 22, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: profileState, numero_intento: 1, activo: true },
    ...['DOCUMENTO_FINAL', 'REVISION_TRIBUNAL_PREVIA', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA', 'REVISION_FINAL_POST_PUBLICA', 'CIERRE_DOCUMENTAL']
      .map((codigo, index) => ({ id: 23 + index, codigo, nombre: codigo, estado: 'PENDIENTE', numero_intento: 1, activo: true })),
  ]
  const emptyProjectFlow = {
    ...response,
    detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
    flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
  }
  const projectFlowAfterStart = (inscriptionState = 'APROBADA', profileState = 'PENDIENTE') => ({
    ...emptyProjectFlow,
    detalle: { ...emptyProjectFlow.detalle, estado_actual_detalle: { id: 2, codigo: 'EN_PROCESO', nombre: 'En proceso' } },
    flujo: {
      ...emptyProjectFlow.flujo,
      etapa_actual: { id: 22, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: profileState },
      porcentaje_avance: inscriptionState === 'APROBADA' ? 12.5 : 0,
      etapas: projectStages(inscriptionState, profileState),
    },
  })

  it('muestra la acción unificada de Proyecto de Grado solo cuando el flujo soportado está vacío', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })

    renderApplicationManagerPage()

    expect(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).toBeInTheDocument()
  })

  it('oculta inicialización si el flujo existe o el usuario no tiene permiso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const initialized = renderApplicationManagerPage()
    await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })
    expect(screen.queryByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).not.toBeInTheDocument()
    initialized.unmount()

    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
    })
    renderOwnerPage()
    await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })
    expect(screen.queryByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).not.toBeInTheDocument()
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

    await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })
    expect(screen.queryByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })).not.toBeInTheDocument()
  })

  it('inicia el proceso con una sola llamada backend y deja Perfil en proceso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(projectFlowAfterStart('APROBADA', 'EN_PROCESO'))
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('PENDIENTE') })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))

    await waitFor(() => expect(postulacionesService.inicializarFlujo).toHaveBeenCalledWith(7, expect.any(AbortSignal)))
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Iniciar Perfil de Proyecto' })).not.toBeInTheDocument()
    const stagesCard = screen.getByRole('heading', { name: 'Etapas del flujo académico' }).parentElement
    expect(within(stagesCard).getAllByText('PENDIENTE')).toHaveLength(6)
    expect(within(stagesCard).getByText(/APROBADA/)).toBeInTheDocument()
    expect(within(stagesCard).getByText('EN_PROCESO')).toBeInTheDocument()
    expect(projectFlowAfterStart('APROBADA', 'EN_PROCESO').flujo.etapas).toHaveLength(8)
    confirm.mockRestore()
  })

  it('bloquea el doble envío mientras inicia el proceso', async () => {
    let resolveInitialization
    postulacionesService.obtenerExpediente.mockResolvedValue(emptyProjectFlow)
    postulacionesService.inicializarFlujo.mockImplementation(() => new Promise((resolve) => { resolveInitialization = resolve }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    const button = await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(postulacionesService.inicializarFlujo).toHaveBeenCalledTimes(1)
    resolveInitialization({ etapas: projectStages('APROBADA') })
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    confirm.mockRestore()
  })

  it('delega al backend la continuación idempotente de una inicialización previa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(projectFlowAfterStart())
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('EN_PROCESO') })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('no repite operaciones si Inscripción ya está aprobada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(projectFlowAfterStart())
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('APROBADA') })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('recarga el estado real y muestra un error si falla después de inicializar', async () => {
    const pendingFlow = projectFlowAfterStart('PENDIENTE')
    pendingFlow.flujo.etapa_actual = pendingFlow.flujo.etapas[0]
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(emptyProjectFlow).mockResolvedValueOnce(pendingFlow)
    postulacionesService.inicializarFlujo.mockResolvedValue({ etapas: projectStages('PENDIENTE') })
    postulacionesService.inicializarFlujo.mockRejectedValue({ message: 'No se pudo iniciar la etapa. Intenta nuevamente.' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar proceso de Proyecto de Grado' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Se recargó el estado real del expediente.')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('button', { name: 'Iniciar Inscripción' })).toBeInTheDocument()
    confirm.mockRestore()
  })

  it('orienta a configurar Excelencia y bloquea el inicio cuando el backend no lo permite', async () => {
    const inscription = { id: 290, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE', numero_intento: 1, activo: true, acciones_permitidas: [] }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, codigo: 'EA-2026-02', modalidad_detalle: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' }, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' },
        etapa_actual: inscription,
        etapas: [inscription],
        porcentaje_avance: 0,
        etapas_completadas: 0,
        etapas_totales: 5,
        orientacion_etapa_actual: {
          operacion: 'CONFIGURAR_EXCELENCIA',
          mensaje: 'Selecciona el criterio normativo antes de iniciar el flujo.',
          requisitos: [],
          siguiente_accion: { codigo: 'CONFIGURAR_CRITERIO', titulo: 'Seleccionar criterio', descripcion: 'El criterio seleccionado queda inmutable al iniciar el flujo.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#excelencia', accion_label: 'Seleccionar criterio' },
          conflictos_identidad: [],
        },
      },
    })
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterio: null, criterios: [], documentos_requeridos: [] })

    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Selecciona el criterio normativo antes de iniciar el flujo.')).toBeInTheDocument()
    const configureLink = within(summary).getByRole('link', { name: 'Seleccionar criterio' })
    expect(configureLink).toHaveAttribute('href', '#excelencia')
    expect(screen.queryByRole('button', { name: 'Iniciar Inscripción' })).not.toBeInTheDocument()
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()

    await userEvent.click(configureLink)
    expect(window.location.hash).toBe('#excelencia')
  })

  it('permite iniciar Inscripción de Excelencia solo cuando el backend autoriza iniciar y refresca el expediente', async () => {
    const pending = { id: 290, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE', numero_intento: 1, activo: true, acciones_permitidas: ['iniciar'] }
    const inProgress = { ...pending, estado: 'EN_PROCESO', estado_display: 'En proceso', acciones_permitidas: [] }
    const excellenceResponse = (stage) => ({
      ...response,
      detalle: { ...response.detalle, codigo: 'EA-2026-02', modalidad_detalle: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' } },
      flujo: { ...response.flujo, modalidad: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' }, etapa_actual: stage, etapas: [stage], orientacion_etapa_actual: null },
    })
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(excellenceResponse(pending)).mockResolvedValueOnce(excellenceResponse(inProgress))
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterio: 'RENDIMIENTO_ACADEMICO', criterios: [], documentos_requeridos: [] })
    postulacionesService.iniciarEtapa.mockResolvedValue(inProgress)

    renderApplicationManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar Inscripción' }))

    expect(postulacionesService.iniciarEtapa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.iniciarEtapa).toHaveBeenCalledWith(290, expect.any(AbortSignal))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Iniciar InscripciÃ³n' })).not.toBeInTheDocument())
  })

  it('orienta al registro institucional y bloquea iniciar Desarrollo cuando el backend no autoriza', async () => {
    const stage = {
      id: 291,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Falta registrar la institución y el supervisor para iniciar Desarrollo.',
          requisitos: [{ tipo: 'INSTITUCION', codigo: 'INSTITUCION_SUPERVISOR_TD', nombre: 'Institución y supervisor', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de registro', destino: '#trabajo-dirigido' }],
          siguiente_accion: { codigo: 'GESTIONAR_INSTITUCION', titulo: 'Registrar institución y supervisor', descripcion: 'Completa y guarda los datos institucionales necesarios para iniciar Desarrollo', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#trabajo-dirigido', accion_label: 'Gestionar institución' },
        },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerTrabajoDirigido).toHaveBeenCalledWith('7', expect.any(AbortSignal)))
    expect(await screen.findByText('Registrar institución y supervisor')).toBeInTheDocument()
    expect(screen.getByText('Completa y guarda los datos institucionales necesarios para iniciar Desarrollo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Completar registro institucional' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Gestionar institución' }))
    expect(await screen.findByRole('heading', { name: 'Institución y supervisor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar institución' })).toBeInTheDocument()
  })

  it('permite iniciar Desarrollo de Trabajo Dirigido con institución cuando el backend habilita la acción', async () => {
    const pending = {
      id: 292,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: ['iniciar'],
    }
    const inProgress = { ...pending, estado: 'EN_PROCESO', acciones_permitidas: [] }
    const responseForStage = (stage) => ({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
      },
    })
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(responseForStage(pending))
      .mockResolvedValue(responseForStage(inProgress))
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: {
        institucion_nombre: 'Institución de prueba',
        supervisor_nombre: 'Supervisor de prueba',
        institucion_tipo: 'PUBLICA',
        tipo_ejecucion: 'INTERNO',
        constituida_legalmente: true,
        actividad_permanente: true,
      },
      informes: [],
    })
    postulacionesService.iniciarEtapa.mockResolvedValue(inProgress)

    renderApplicationManagerPage()

    expect(await screen.findByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Completar registro institucional' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' }))
    expect(postulacionesService.iniciarEtapa).toHaveBeenCalledWith(292, expect.any(AbortSignal))
  })

  it('presenta el documento de supervisión como siguiente acción sin confundirlo con el informe estructurado', async () => {
    const stage = {
      id: 295,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'EN_PROCESO',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Completa los documentos requeridos para continuar.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'INFORME_SUPERVISION_TD', nombre: 'Informe periódico de supervisión', cumplido: false, estado: 'PENDIENTE', estado_display: 'No presentado', destino: '#documentos' }],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documento: Informe periódico de supervisión', descripcion: 'Presenta el documento requerido para su revisión y aprobación', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Gestionar documentos' },
        },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: { institucion_nombre: 'Institución', supervisor_nombre: 'Supervisor' },
      informes: [],
    })

    renderApplicationUploadManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Completar documento: Informe periódico de supervisión')).toBeInTheDocument()
    expect(within(summary).getByText('Presenta el documento requerido para su revisión y aprobación')).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Gestionar documentos' })).toBeInTheDocument()
    expect(within(summary).queryByText('Registrar informe periódico de seguimiento')).not.toBeInTheDocument()
  })

  it('conserva la confirmación del informe después del refresco real del expediente', async () => {
    const stage = {
      id: 296,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'EN_PROCESO',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    const tdResponse = {
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(tdResponse)
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: {
        institucion_nombre: 'Institución', supervisor_nombre: 'Supervisor', institucion_tipo: 'PUBLICA',
        tipo_ejecucion: 'INTERNO', constituida_legalmente: true, actividad_permanente: true,
        convenio_requerido: false, convenio_vigente: false,
      },
      informes: [],
    })
    postulacionesService.registrarInformeTrabajoDirigido.mockResolvedValue({ id: 18, periodo: 'Agosto' })

    renderApplicationManagerPage('trabajo-dirigido')
    await userEvent.type(await screen.findByLabelText('Periodo'), 'Agosto')
    await userEvent.type(screen.getByLabelText('Descripción del desempeño'), 'Buen desempeño')
    await userEvent.type(screen.getByLabelText('Evaluación cualitativa'), 'Suficiente')
    await userEvent.type(screen.getByLabelText('Aporte laboral'), 'Automatización')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Informe periódico registrado correctamente.')).toBeInTheDocument()
    expect(screen.getByLabelText('Periodo')).toHaveValue('')
  })

  it('presenta de forma segura el motivo de validación al fallar el inicio de Trabajo Dirigido', async () => {
    const stage = {
      id: 294,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: ['iniciar'],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: { institucion_nombre: 'Institución', supervisor_nombre: 'Supervisor' },
      informes: [],
    })
    postulacionesService.iniciarEtapa.mockRejectedValue({
      status: 400,
      message: 'Debe registrar la institución y el supervisor de Trabajo Dirigido.',
    })

    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar Desarrollo y seguimiento institucional' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Debe registrar la institución y el supervisor de Trabajo Dirigido.')
  })

  it('informa el bloqueo institucional sin ofrecer navegación de gestión a usuarios sin permisos', async () => {
    const stage = {
      id: 293,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Falta registrar la institución y el supervisor para iniciar Desarrollo.',
          requisitos: [{ tipo: 'INSTITUCION', codigo: 'INSTITUCION_SUPERVISOR_TD', nombre: 'Institución y supervisor', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de registro', destino: '#trabajo-dirigido' }],
          siguiente_accion: { codigo: 'GESTIONAR_INSTITUCION', titulo: 'Registrar institución y supervisor', descripcion: 'Completa y guarda los datos institucionales necesarios para iniciar Desarrollo', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#trabajo-dirigido', accion_label: 'Gestionar institución' },
        },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })

    renderStudentPage()

    expect(await screen.findByText('Solicita al personal responsable que registre la institución y el supervisor.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar institución' })).not.toBeInTheDocument()
    expect(screen.queryByText('Registrar institución y supervisor')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar institución' })).not.toBeInTheDocument()
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
  })

  const futureProfileOrientation = {
    mensaje: 'Verifica estas precondiciones antes de intentar programar la defensa.',
    requisitos: [{ tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 0, minimo: 2, cumplido: false, estado_display: '0/2 pendiente', destino: '#actores' }],
    siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Actores de la postulación', descripcion: 'Completa las asignaciones mínimas requeridas antes de programar.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#actores' },
  }

  it('oculta la orientación operativa futura mientras la etapa actual está pendiente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...projectFlowAfterStart(),
      flujo: { ...projectFlowAfterStart().flujo, orientacion_etapa_actual: futureProfileOrientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('La etapa está lista para iniciarse.')).toBeInTheDocument()
    expect(within(summary).queryByText('Requisitos de esta etapa')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Tribunales')).not.toBeInTheDocument()
    expect(within(summary).queryByText(futureProfileOrientation.mensaje)).not.toBeInTheDocument()
    expect(within(summary).queryByText('Gestión de actores')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Perfil de Proyecto' })).toBeInTheDocument()
  })

  it('presenta el inicio pendiente como gestión administrativa sin ocultar la carga documental permitida', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...projectFlowAfterStart(),
      flujo: { ...projectFlowAfterStart().flujo, orientacion_etapa_actual: futureProfileOrientation },
    })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).queryByText('La etapa está lista para iniciarse.')).not.toBeInTheDocument()
    expect(within(summary).getByText('Esta etapa está pendiente de inicio por el personal responsable.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(screen.getByRole('button', { name: 'Cargar documento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar Perfil de Proyecto' })).not.toBeInTheDocument()
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it.each(['EN_PROCESO', 'OBSERVADA'])('muestra la siguiente acción del backend cuando la etapa está %s', async (estado) => {
    const contracts = profileContracts()
    const stage = { ...contracts.stage, estado }
    const flow = { ...contracts.flow, etapa_actual: stage, etapas: [stage] }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: flow })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(within(summary).getByText('Completar composición formal')).toBeInTheDocument()
    expect(within(summary).getAllByText('Completa las posiciones formales pendientes.')).toHaveLength(2)
    expect(within(summary).getByRole('link', { name: 'Gestionar actores' })).toHaveAttribute('href', '#actores')
    expect(within(summary).queryByText('Mínimo requerido: 2')).not.toBeInTheDocument()
  })

  it('abre el mismo modal genérico desde el CTA de orientación', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    await userEvent.click(within(summary).getByRole('link', { name: 'Gestionar actores' }))

    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
  })

  it('abre desde Siguiente acción el diálogo existente cuando hay una decisión registrable única', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 1, name: 'Tribunal Uno', order: 1 },
      { id: 2, name: 'Tribunal Dos', order: 2 },
      { id: 3, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderApplicationManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))

    const dialog = await screen.findByRole('dialog', { name: 'Confirmar autorización del perfil' })
    expect(within(dialog).getByRole('button', { name: 'Confirmar autorización' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
  })

  it('mantiene la navegación a Decisiones cuando la siguiente acción no está permitida', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 1, name: 'Tribunal Uno', order: 1 },
        { id: 2, name: 'Tribunal Dos', order: 2 },
        { id: 3, name: 'Tribunal Tres', order: 3 },
      ],
      canRegister: false,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderApplicationManagerPage('resumen')

    expect(await screen.findByRole('link', { name: 'Registrar decisión' })).toHaveAttribute('href', '#decisiones-academicas')
    expect(screen.queryByRole('dialog', { name: 'Aprobación de propuesta' })).not.toBeInTheDocument()
  })

  it('resume ocupación en la tarjeta y muestra las posiciones del contrato en el modal', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
      tutorAssigned: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo
      ? { count: 1, next: null, previous: null, results: [{ id: 90, usuario: 80, tipo_participacion: 'TUTOR', tipo_participacion_display: 'Tutor', usuario_nombre: 'María Tutora', activo: true }] }
      : historicalActorsResponse))
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getByText('María Tutora')).toBeInTheDocument()
    expect(within(actors).getByText('4 de 4 posiciones ocupadas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(within(dialog).getAllByText(/ASIGNADA/)).toHaveLength(4)
    expect(within(dialog).getByText('María Tutora')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Archivo')).toBeInTheDocument()
    expect(within(actors).queryByText('Recomendado')).not.toBeInTheDocument()
  })

  it('publica el memorándum desde Gestionar actores sin exigir Tutor ni registrar la decisión', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 8,
        vigente: true,
        fecha_publicacion: '2026-10-17T10:00:00Z',
        version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' },
      }])
    let resolvePublication
    postulacionesService.publicarMemorandumDesignacion.mockImplementation(() => new Promise((resolve) => { resolvePublication = resolve }))
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(within(dialog).queryByText('Asignada a María Tutora')).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' })
    const fileInput = within(dialog).getByLabelText('Archivo')
    expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf')
    expect(fileInput).toHaveClass('mt-1', 'block', 'w-full', 'rounded-lg', 'border', 'p-2', 'text-sm')
    await userEvent.upload(fileInput, file)
    expect(fileInput.files).toHaveLength(1)
    expect(fileInput.files[0]).toBe(file)
    const publish = within(dialog).getByRole('button', { name: 'Publicar memorándum' })
    fireEvent.click(publish)
    fireEvent.click(publish)

    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(7, 22, file))
    expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledTimes(1)
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(publish).toBeDisabled()
    await act(async () => resolvePublication({ id: 8, vigente: true }))
    expect(await within(dialog).findByText('Memorándum publicado correctamente.')).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerMemorandumsDesignacion).toHaveBeenCalledTimes(2))
    expect(await within(dialog).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-resumen')).toBeVisible()
    expect(document.getElementById('panel-actores')).not.toBeVisible()
  }, 15000)

  it.each([
    ['el botón Cerrar', async (dialog) => userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))],
    ['el botón ×', async (dialog) => userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' })[0])],
    ['el clic fuera', async (dialog) => fireEvent.mouseDown(dialog)],
    ['la tecla Escape', async () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('navega a Resumen tras publicar y cerrar mediante %s', async (_mechanism, close) => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 8, vigente: true, fecha_publicacion: '2026-10-17T10:00:00Z', version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' } }])
    postulacionesService.publicarMemorandumDesignacion.mockResolvedValue({ id: 8, vigente: true })
    selectInitialTab('actores')
    renderAssignmentManagerPage()
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    const opener = within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const fileInput = within(dialog).getByLabelText('Archivo')
    await userEvent.upload(fileInput, new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    expect(await within(dialog).findByText('Memorándum publicado correctamente.')).toBeInTheDocument()
    await close(dialog)

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-resumen')).toBeVisible()
    expect(document.getElementById('panel-actores')).not.toBeVisible()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Resumen' })))
  })

  it('conserva la pestaña anterior al cerrar sin publicación exitosa', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('actores')
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    const opener = within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#actores')
    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-actores')).toBeVisible()
    expect(document.getElementById('panel-resumen')).not.toBeVisible()
  })

  it('no navega automáticamente cuando falla la publicación y permite cerrar', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.publicarMemorandumDesignacion.mockRejectedValue(new Error('Publicación rechazada'))
    renderAssignmentManagerPage('actores')
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    await userEvent.click(within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Publicación rechazada')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))

    expect(window.location.hash).toBe('#actores')
    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-actores')).toBeVisible()
  })

  it('bloquea el cierre mientras la publicación está en curso', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    const publication = deferred()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.publicarMemorandumDesignacion.mockReturnValue(publication.promise)
    renderAssignmentManagerPage('actores')
    const actors = await screen.findByRole('heading', { name: 'Gestión de actores' })
    await userEvent.click(within(actors.closest('section')).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalled())
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.mouseDown(dialog)
    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#actores')
    await act(async () => publication.resolve({ id: 8, vigente: true }))
  })

  it('guarda los actores antes de mostrar el selector y permite publicar después de la recarga', async () => {
    const pendingContracts = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
    ] })
    const savedContracts = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
      { id: 53, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce({ ...response, flujo: pendingContracts.flow })
      .mockResolvedValue({ ...response, flujo: savedContracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 43, username: 'tribunal-tres', nombre_completo: 'Tribunal Tres', rol_nombre: 'Docente' }],
    })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    let dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const memorandumTitle = within(dialog).getByRole('heading', { name: 'Memorándum oficial de designación' })
    const memorandumSection = memorandumTitle.closest('section')

    const tribunalSelector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 3')
    await within(tribunalSelector).findByRole('option', { name: /Tribunal Tres/ })
    await userEvent.selectOptions(tribunalSelector, '43')
    const save = within(dialog).getByRole('button', { name: 'Guardar asignaciones' })
    expect(save.compareDocumentPosition(memorandumSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1).compareDocumentPosition(memorandumSection) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(within(memorandumSection).getByText('Guarda primero las asignaciones para publicar el memorándum.')).toBeInTheDocument()
    expect(within(memorandumSection).queryByLabelText('Archivo')).not.toBeInTheDocument()
    expect(within(memorandumSection).queryByRole('button', { name: 'Publicar memorándum' })).not.toBeInTheDocument()
    expect(postulacionesService.publicarMemorandumDesignacion).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 43,
      tipo_participacion: 'TRIBUNAL',
      observaciones: '',
      orden_cargo: 3,
      seguimiento_etapa: 22,
    }, expect.any(AbortSignal)))
    dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const fileInput = await within(dialog).findByLabelText('Archivo')
    const file = new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, file)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))
    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(7, 22, file))
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  }, 15000)

  it('ofrece publicar una nueva versión cuando ya existe un memorándum vigente', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
      { id: 53, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([{
      id: 8,
      vigente: true,
      fecha_publicacion: '2026-10-17T10:00:00Z',
      version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' },
    }])
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(await within(dialog).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum-v2.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar nueva versión' }))

    await waitFor(() => expect(postulacionesService.publicarMemorandumDesignacion).toHaveBeenCalledWith(
      7,
      22,
      expect.objectContaining({ name: 'memorandum-v2.pdf' }),
    ))
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  })

  it('muestra errores de publicación en el modal de gestión de actores', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
      ],
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.publicarMemorandumDesignacion.mockRejectedValue({
      message: 'Revisa los datos de la asignación.',
      fields: { asignaciones: ['Se requieren los tres tribunales oficiales con órdenes 1, 2 y 3.'] },
    })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['%PDF-1.4'], 'memorandum.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar memorándum' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Revisa los datos de la asignación. Se requieren los tres tribunales oficiales con órdenes 1, 2 y 3.')
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  })

  it('indica cuando una publicación existente no está vigente', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([{ id: 8, vigente: false, version: { id: 81, nombre_original: 'memorandum.pdf' } }])
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(await within(dialog).findByText('Existe una publicación, pero el documento no está vigente.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument()
  })

  it('permite al estudiante consultar y descargar el memorándum vigente desde el expediente', async () => {
    const contracts = profileContracts()
    const published = {
      id: 8,
      vigente: true,
      fecha_publicacion: '2026-10-17T10:00:00Z',
      version: { id: 81, numero_version: 1, nombre_original: 'memorandum.pdf' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerMemorandumsDesignacion.mockResolvedValue([published])
    renderStudentPage()

    const card = await screen.findByRole('heading', { name: 'Memorándum de designación de tribunales' })
    const memorandumCard = card.closest('section')
    expect(await within(memorandumCard).findByText(/Documento publicado y vigente/)).toBeInTheDocument()
    await userEvent.click(within(memorandumCard).getByRole('button', { name: 'Descargar' }))
    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(81, 'memorandum.pdf'))
  })

  it('dirige el contrato contextual del memorándum al modal de gestión de actores', async () => {
    const contracts = profileContracts()
    const memorandum = contracts.flow.gestion_decisiones_academicas.decisiones[0].memorandum_designacion
    contracts.flow.gestion_decisiones_academicas = {
      ...contracts.flow.gestion_decisiones_academicas,
      decisiones: [],
      memorandum_designacion_contextual: memorandum,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(dialog).getByLabelText('Archivo')).toBeInTheDocument()
    expect(within(dialog).getByText(/independiente del registro de la decisión académica/)).toBeInTheDocument()
  }, 15000)

  it('preserva una siguiente acción posterior declarada por el backend', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      mensaje: 'Los tribunales están completos. Programa la Defensa de Perfil.',
      requisitos: [{ tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 2, minimo: 2, cumplido: true, estado_display: '2/2 cumplido', destino: '#actores' }],
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa de Perfil', descripcion: 'Programa la defensa correspondiente a esta etapa.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa' },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: orientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Los tribunales están completos. Programa la Defensa de Perfil.')).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Ir a programar defensa' })).toHaveAttribute('href', '#defensas')
    expect(within(summary).getByText('2 vigentes')).toBeInTheDocument()
    expect(within(summary).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(summary).queryByRole('button', { name: 'Aprobar Perfil de Proyecto' })).not.toBeInTheDocument()
  })

  it('renderiza un solo enlace cuando requisito y siguiente acción comparten destino', async () => {
    const orientation = {
      ...futureProfileOrientation,
      requisitos: [{ ...futureProfileOrientation.requisitos[0], actual: 1, estado_display: '1/2 pendiente' }],
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: orientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    const links = within(summary).getAllByRole('link', { name: 'Ir a gestionar' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '#actores')
  })

  it('ofrece una única entrada genérica cuando la modalidad no declara posiciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        gestion_actores: {},
        gestion_decisiones_academicas: { contexto: null, decisiones: [] },
        orientacion_etapa_actual: { requisitos: [] },
      },
    })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Actores' }))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(dialog).getByText('No hay posiciones de actores declaradas para este contexto.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(actors).queryByRole('button', { name: /Conformar equipo|Asignar Tutor|Asignar Tribunal/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Decisiones académicas' })).not.toBeInTheDocument()
  })

  it('conserva el fallback genérico para requisitos distintos de Tribunal', async () => {
    const orientation = {
      mensaje: 'Completa el requisito documental.',
      requisitos: [{ tipo: 'DOCUMENTO', codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
      siguiente_accion: { codigo: 'GESTIONAR_DOCUMENTOS', titulo: 'Gestionar documentos', descripcion: 'Carga el Documento Final.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: orientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    const goToDocuments = within(summary).getByRole('link', { name: 'Ir a documentos' })
    expect(goToDocuments).toHaveAttribute('href', '#documentos')
    expect(within(summary).getByRole('heading', { name: 'Requisitos de esta etapa' })).toBeInTheDocument()
    await userEvent.click(goToDocuments)
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')
  })

  const inscriptionRequirements = (completedCount) => [
    ['CARTA_SOLICITUD_PROYECTO', 'Carta de solicitud', 'DOCUMENTO'],
    ['MATRICULA_VIGENTE', 'Matrícula vigente', 'DOCUMENTO'],
    ['HISTORIAL_PRERREQ', 'Historial académico de prerrequisitos', 'DOCUMENTO'],
    ['FOLDER_AMARILLO', 'Fólder amarillo rotulado con nombre y modalidad', 'ENTREGA_FISICA'],
  ].map(([codigo, nombre, tipo], index) => {
    const completed = completedCount === true || (completedCount !== false && index < completedCount)
    return {
    codigo,
    nombre,
    tipo,
    cumplido: completed,
    estado: completed ? 'CUMPLIDO' : 'PENDIENTE',
    estado_display: completed ? 'Cumplido' : 'Pendiente',
    destino: tipo === 'DOCUMENTO' ? '#documentos' : '#inscripcion-entregas',
    }
  })

  const inscriptionStageResponse = (completedCount) => {
    const completed = completedCount === true || completedCount === 4
    const count = completedCount === true ? 4 : completedCount === false ? 0 : completedCount
    const stage = {
      id: 31,
      codigo: 'INSCRIPCION',
      nombre: 'Inscripción',
      estado: 'EN_PROCESO',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: completed ? ['aprobar'] : [],
    }
    return {
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: stage,
        etapas: [stage],
        porcentaje_avance: 0,
        orientacion_etapa_actual: {
          mensaje: `${count}/4 requisitos de Inscripción cumplidos.`,
          requisitos: inscriptionRequirements(completedCount),
          requisitos_cumplidos: count,
          requisitos_totales: 4,
          permite_aprobar_etapa: completed,
          siguiente_accion: completed
            ? { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Inscripción', estado: 'DISPONIBLE', destino: '#resumen' }
            : { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos de Inscripción', estado: 'PENDIENTE', destino: '#documentos' },
        },
      },
    }
  }

  const examInscriptionResponse = (completed) => {
    const source = inscriptionStageResponse(completed)
    const names = ['Carta de Solicitud de Examen de Grado', 'Comprobante de Matrícula Vigente', 'Historial Académico', 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida']
    const codes = ['CARTA_SOLICITUD_EXAMEN', 'MATRICULA_VIGENTE', 'HISTORIAL_ACADEMICO', 'FOLDER_AMARILLO']
    return {
      ...source,
      detalle: { ...source.detalle, modalidad_detalle: { codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      flujo: {
        ...source.flujo, modalidad: { codigo: 'EXAMEN_GRADO' },
        orientacion_etapa_actual: {
          ...source.flujo.orientacion_etapa_actual,
          requisitos: source.flujo.orientacion_etapa_actual.requisitos.map((item, index) => ({ ...item, codigo: codes[index], nombre: names[index], ...(index === 3 ? { cantidad: null } : {}) })),
          siguiente_accion: completed === 3
            ? { codigo: 'GESTIONAR_ENTREGA_FISICA', titulo: 'Registrar recepción del fólder amarillo', destino: '#inscripcion-entregas', estado: 'PENDIENTE' }
            : source.flujo.orientacion_etapa_actual.siguiente_accion,
        },
      },
    }
  }

  const excellenceInscriptionResponse = (completed) => {
    const source = examInscriptionResponse(completed)
    const codes = ['CARTA_EXCELENCIA', 'RECIBO_MATRICULA_EXC', 'HISTORIAL_EXCELENCIA', 'FOLDER_AMARILLO']
    const names = ['Carta de Solicitud de Excelencia Académica', 'Recibo de Matrícula de Excelencia', 'Historial Académico de Excelencia', 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida']
    return {
      ...source,
      detalle: { ...source.detalle, modalidad_detalle: { codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' } },
      flujo: {
        ...source.flujo, modalidad: { codigo: 'EXCELENCIA_ACADEMICA' },
        orientacion_etapa_actual: {
          ...source.flujo.orientacion_etapa_actual,
          requisitos: source.flujo.orientacion_etapa_actual.requisitos.map((item, index) => ({ ...item, codigo: codes[index], nombre: names[index] })),
        },
      },
    }
  }

  it.each([0, 1, 2, 3, 4])('Inscripción de Excelencia reutiliza la distribución integrada con %s de cuatro', async (completed) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(excellenceInscriptionResponse(completed))
    renderApplicationManagerPage('resumen')
    const requirements = (await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })).closest('[aria-labelledby="inscription-requirements-title"]')
    expect(within(requirements).getByText(`${completed} de 4 cumplidos`)).toBeVisible()
    expect(within(requirements).getAllByRole('listitem')).toHaveLength(3)
    expect(within(requirements).queryByText(/Fólder/)).not.toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    expect(within(summary).getByRole('heading', { name: 'Recepción física', level: 3 })).toBeVisible()
    expect(await within(summary).findByText('Cantidad técnica requerida: No definida')).toBeVisible()
    expect(within(summary).getAllByText('Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida')).toHaveLength(1)
    expect(within(summary).queryByRole('heading', { name: 'Requisitos de esta etapa' })).not.toBeInTheDocument()
    if (completed === 4) expect(within(summary).getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
    else expect(within(summary).queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
  })

  it('Inscripción de Excelencia carga únicamente sus tres documentos digitales', async () => {
    const source = excellenceInscriptionResponse(0)
    postulacionesService.obtenerExpediente.mockResolvedValue(source)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: source.flujo.orientacion_etapa_actual.requisitos.filter((item) => item.tipo === 'DOCUMENTO').map((item, index) => ({ id: index + 101, codigo: item.codigo, nombre: item.nombre, capacidad_carga: { permitida: true } })) })
    renderApplicationUploadManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(3)
    for (const item of source.flujo.orientacion_etapa_actual.requisitos.slice(0, 3)) expect(within(dialog).getByLabelText(item.nombre)).toBeVisible()
    expect(within(dialog).queryByText(/Fólder|FOLDER_EXCELENCIA/i)).not.toBeInTheDocument()
  })

  it('Inscripción de Excelencia registra recepción sin cantidad institucional y refresca la aprobación', async () => {
    let created = false
    let received = false
    const delivery = { id: 501, codigo: 'FOLDER_AMARILLO', nombre: 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida', estado: 'PENDIENTE', cantidad: null, cantidad_recibida: 0 }
    postulacionesService.obtenerExpediente.mockImplementation(async () => excellenceInscriptionResponse(received ? 4 : 3))
    postulacionesService.obtenerEntregas.mockImplementation(async () => ({ results: created ? [{ ...delivery, estado: received ? 'COMPLETA' : 'PENDIENTE', cantidad_recibida: received ? 1 : 0 }] : [] }))
    postulacionesService.crearEntregaFisica.mockImplementation(async () => { created = true; return delivery })
    postulacionesService.registrarEntrega.mockImplementation(async () => { received = true; return {} })
    renderApplicationManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar recepción' }))
    expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(7, 'FOLDER_AMARILLO', delivery.nombre, null, expect.any(AbortSignal))
    const form = await screen.findByRole('form', { name: `Registrar entrega: ${delivery.nombre}` })
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(501, 1, '', expect.any(AbortSignal))
    expect(await screen.findByText('4 de 4 cumplidos')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
  })

  it('Inscripción de Excelencia conserva los permisos de recepción y aprobación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(excellenceInscriptionResponse(4))
    selectInitialTab('resumen')
    renderStudentPage()
    expect(await screen.findByRole('heading', { name: 'Excelencia Académica', level: 1 })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Registrar recepción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
  })

  it.each([0, 2, 3, 4])('Inscripción de Examen reutiliza los grupos y cuenta %s de cuatro requisitos', async (completed) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(examInscriptionResponse(completed))
    renderApplicationManagerPage('resumen')
    const requirements = (await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })).closest('[aria-labelledby="inscription-requirements-title"]')
    expect(within(requirements).getByText(`${completed} de 4 cumplidos`)).toBeVisible()
    expect(within(requirements).getAllByRole('listitem')).toHaveLength(3)
    expect(within(requirements).getByText(/Carta de Solicitud de Examen/)).toBeVisible()
    expect(within(requirements).queryByText(/Fólder/)).not.toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    expect(within(summary).getByRole('heading', { name: 'Recepción física', level: 3 })).toBeVisible()
    expect(await within(summary).findByText('Cantidad técnica requerida: No definida')).toBeVisible()
    expect(within(summary).getAllByText('Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida')).toHaveLength(1)
    expect(within(document.getElementById('panel-documentos')).queryByRole('heading', { name: 'Recepción física', hidden: true })).not.toBeInTheDocument()
    if (completed === 4) expect(within(summary).getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
    else expect(within(summary).queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
  })

  it('Inscripción de Examen carga solo tres documentos digitales y excluye el fólder', async () => {
    const source = examInscriptionResponse(0)
    postulacionesService.obtenerExpediente.mockResolvedValue(source)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: source.flujo.orientacion_etapa_actual.requisitos.filter((item) => item.tipo === 'DOCUMENTO').map((item, index) => ({ id: index + 101, codigo: item.codigo, nombre: item.nombre, capacidad_carga: { permitida: true } })) })
    renderApplicationUploadManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(3)
    expect(within(dialog).getByLabelText('Carta de Solicitud de Examen de Grado')).toBeVisible()
    expect(within(dialog).getByLabelText('Comprobante de Matrícula Vigente')).toBeVisible()
    expect(within(dialog).getByLabelText('Historial Académico')).toBeVisible()
    expect(within(dialog).queryByText(/Fólder/i)).not.toBeInTheDocument()
  })

  it('Inscripción de Examen registra recepción sin fijar cantidad normativa y refresca cuatro de cuatro', async () => {
    let created = false
    let received = false
    const delivery = { id: 501, codigo: 'FOLDER_AMARILLO', nombre: 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida', estado: 'PENDIENTE', cantidad: null, cantidad_recibida: 0 }
    postulacionesService.obtenerExpediente.mockImplementation(async () => examInscriptionResponse(received ? 4 : 3))
    postulacionesService.obtenerEntregas.mockImplementation(async () => ({ results: created ? [{ ...delivery, estado: received ? 'COMPLETA' : 'PENDIENTE', cantidad_recibida: received ? 1 : 0 }] : [] }))
    postulacionesService.crearEntregaFisica.mockImplementation(async () => { created = true; return delivery })
    postulacionesService.registrarEntrega.mockImplementation(async () => { received = true; return {} })
    renderApplicationManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar recepción' }))
    expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(7, 'FOLDER_AMARILLO', delivery.nombre, null, expect.any(AbortSignal))
    const form = await screen.findByRole('form', { name: `Registrar entrega: ${delivery.nombre}` })
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(501, 1, '', expect.any(AbortSignal))
    expect(await screen.findByText('4 de 4 cumplidos')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
  })

  it('muestra 0/4 requisitos y oculta Aprobar Inscripción cuando la policy no habilita aprobar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(false))
    renderApplicationManagerPage('resumen')

    const requirementsHeading = await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })
    const requirements = requirementsHeading.closest('[aria-labelledby="inscription-requirements-title"]')
    const summary = document.getElementById('panel-resumen')
    const documents = document.getElementById('panel-documentos')
    const orientationCard = summary.querySelector('#resumen > div')
    const orientation = within(summary).getByRole('heading', { name: 'Qué debes hacer ahora' })
    const physicalHeading = within(summary).getByRole('heading', { name: 'Recepción física', level: 3 })
    expect(orientation.compareDocumentPosition(requirementsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(requirementsHeading.compareDocumentPosition(physicalHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(orientationCard).toContainElement(requirementsHeading)
    expect(orientationCard).toContainElement(physicalHeading)
    expect(orientationCard).toHaveClass('border-sky-300', 'bg-sky-50')
    expect(requirements).not.toHaveClass('rounded-xl', 'shadow-[var(--card-shadow)]')
    const requirementRows = within(requirements).getAllByRole('listitem')
    expect(requirements.querySelector('ul')).toHaveClass('mt-3', 'space-y-2')
    requirementRows.forEach((row) => expect(row).toHaveClass('rounded-lg', 'border-sky-200', 'bg-white/70', 'px-4', 'py-3'))
    expect(within(requirements).getByText('0 de 4 cumplidos')).toBeInTheDocument()
    expect(within(requirements).getByRole('heading', { name: 'Documentación de Inscripción', level: 4 })).toBeInTheDocument()
    expect(within(requirements).getByText(/Carta de solicitud/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Matrícula vigente/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Historial académico de prerrequisitos/)).toBeInTheDocument()
    expect(within(requirements).queryByRole('button', { name: 'Cargar documentos de Inscripción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
    expect(within(documents).queryByRole('heading', { name: 'Requisitos de Inscripción' })).not.toBeInTheDocument()
    expect(within(documents).queryByRole('heading', { name: 'Recepción física' })).not.toBeInTheDocument()
    expect(within(documents).getByRole('heading', { name: 'Documentos', hidden: true })).toBeInTheDocument()
    expect(await within(summary).findByText(/Fólder amarillo rotulado con nombre y modalidad/)).toBeInTheDocument()
    expect(await within(summary).findByRole('button', { name: 'Registrar recepción' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar recepción' }))
    await waitFor(() => expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(
      7,
      'FOLDER_AMARILLO',
      'Fólder amarillo rotulado con nombre y modalidad',
      1,
      expect.any(AbortSignal),
    ))
  })

  it('abre desde la siguiente acción el diálogo de carga múltiple de Inscripción', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(false))
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD_PROYECTO', nombre: 'Carta de Solicitud de Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Comprobante de Matrícula Vigente', capacidad_carga: { permitida: true } },
    ] })
    renderApplicationUploadManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))

    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByLabelText(/Carta de Solicitud/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Matrícula Vigente/)).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  it('reutiliza la carga múltiple para los tres documentos de Inscripción', async () => {
    let uploadedDocuments = 0
    postulacionesService.obtenerExpediente.mockImplementation(async () => inscriptionStageResponse(uploadedDocuments))
    postulacionesService.cargarDocumento.mockImplementation(async () => { uploadedDocuments += 1 })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD_PROYECTO', nombre: 'Carta de Solicitud de Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Comprobante de Matrícula Vigente', capacidad_carga: { permitida: true } },
      { id: 43, codigo: 'HISTORIAL_PRERREQ', nombre: 'Historial Académico de Prerrequisitos', capacidad_carga: { permitida: true } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.queryByRole('button', { name: 'Cargar documentos de Inscripción' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(3)
    expect(within(dialog).getByLabelText(/Carta de Solicitud/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Matrícula Vigente/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Historial Académico de Prerrequisitos/)).toBeVisible()
    expect(within(dialog).queryByLabelText(/Fólder amarillo/i)).not.toBeInTheDocument()
    const documents = [
      [/Carta de Solicitud/, 'carta.pdf'],
      [/Matrícula Vigente/, 'matricula.pdf'],
      [/Historial Académico de Prerrequisitos/, 'historial.pdf'],
    ]
    for (const [index, [name, fileName]] of documents.entries()) {
      const file = new File([fileName], fileName, { type: 'application/pdf' })
      await userEvent.upload(within(dialog).getByLabelText(name), file)
      const selectedCount = index + 1
      const selectedLabel = `${selectedCount} documento${selectedCount === 1 ? '' : 's'} seleccionado${selectedCount === 1 ? '' : 's'}`
      expect(within(dialog).getByText(selectedLabel)).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: `Cargar ${selectedCount} documento${selectedCount === 1 ? '' : 's'}` })).toBeEnabled()
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 3 documentos' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
    for (const [index, [, fileName]] of documents.entries()) {
      const file = new File([fileName], fileName, { type: 'application/pdf' })
      expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({ postulacionId: 7, tipoDocumentoId: 41 + index, archivo: file }), expect.any(AbortSignal))
    }
    expect(within(dialog).queryByText(/Fólder amarillo/i)).not.toBeInTheDocument()
  })

  it('completa 3/4 a 4/4 al registrar la recepción física del fólder', async () => {
    let folderReceived = false
    let delivery = null
    let deliveryLoads = 0
    const creation = deferred()
    const refreshedDeliveries = deferred()
    postulacionesService.obtenerExpediente.mockImplementation(async () => inscriptionStageResponse(folderReceived ? 4 : 3))
    postulacionesService.obtenerEntregas.mockImplementation(() => {
      deliveryLoads += 1
      if (deliveryLoads <= 2) return Promise.resolve({ results: [] })
      return refreshedDeliveries.promise
    })
    postulacionesService.crearEntregaFisica.mockImplementation(() => {
      delivery = { id: 99, codigo: 'FOLDER_AMARILLO', nombre: 'Fólder amarillo rotulado con nombre y modalidad', estado: 'PENDIENTE', estado_display: 'Pendiente de recepción', cantidad: 1, cantidad_recibida: 0 }
      return creation.promise.then(() => delivery)
    })
    postulacionesService.registrarEntrega.mockImplementation(async () => {
      folderReceived = true
      delivery = { ...delivery, estado: 'COMPLETA', estado_display: 'Completa', cantidad_recibida: 1 }
    })
    renderApplicationManagerPage('resumen')

    expect(await screen.findByText('3 de 4 cumplidos')).toBeInTheDocument()
    const physicalSection = document.getElementById('inscripcion-entregas')
    expect(physicalSection.closest('[data-expediente-panel]')).toHaveAttribute('data-expediente-panel', 'resumen')
    expect(document.getElementById('panel-documentos').textContent).not.toContain('Recepción física')
    window.history.replaceState(window.history.state, '', '#inscripcion-entregas')
    const hash = window.location.hash
    const folder = await screen.findByText('Fólder amarillo rotulado con nombre y modalidad')
    const item = folder.closest('li')
    await userEvent.click(within(item).getByRole('button', { name: 'Registrar recepción' }))
    await waitFor(() => expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledTimes(1))
    expect(within(item).getByRole('button', { name: 'Preparando…' })).toBeDisabled()
    expect(postulacionesService.registrarEntrega).not.toHaveBeenCalled()
    const expedienteLoads = postulacionesService.obtenerExpediente.mock.calls.length

    await act(async () => creation.resolve())
    await waitFor(() => expect(postulacionesService.obtenerEntregas).toHaveBeenCalledTimes(3))
    expect(screen.queryByRole('form', { name: 'Registrar entrega: Fólder amarillo rotulado con nombre y modalidad' })).not.toBeInTheDocument()
    await act(async () => refreshedDeliveries.resolve({ results: [delivery] }))
    const form = await screen.findByRole('form', { name: 'Registrar entrega: Fólder amarillo rotulado con nombre y modalidad' })
    expect(form).toBeVisible()
    expect(form.isConnected).toBe(true)
    expect(document.getElementById('inscripcion-entregas')).toBe(physicalSection)
    expect(window.location.hash).toBe(hash)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(expedienteLoads)
    expect(postulacionesService.registrarEntrega).not.toHaveBeenCalled()
    expect(screen.getByText('Estado: Pendiente de recepción')).toBeInTheDocument()
    expect(screen.getByText('Cantidad recibida: 0')).toBeInTheDocument()
    expect(screen.getByText('Receptor: Pendiente')).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Guardar' })).toBeEnabled()
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('4 de 4 cumplidos')).toBeInTheDocument()
    expect(postulacionesService.registrarEntrega).toHaveBeenCalledWith(99, 1, '', expect.any(AbortSignal))
    expect(screen.queryByRole('dialog', { name: /Cargar documentos de Inscripción/ })).not.toBeInTheDocument()
  })

  it('ofrece Aprobar Inscripción cuando backend expone la acción con los 4/4 cumplidos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(true))
    renderApplicationManagerPage('resumen')

    const requirementsHeading = await screen.findByRole('heading', { name: 'Requisitos de Inscripción', level: 3 })
    const requirements = requirementsHeading.closest('[aria-labelledby="inscription-requirements-title"]')
    expect(within(requirements).getByText('4 de 4 cumplidos')).toBeInTheDocument()
    expect(document.getElementById('panel-documentos').textContent).not.toContain('Requisitos de Inscripción')
    expect(document.getElementById('panel-documentos').textContent).not.toContain('Recepción física')
    const headerButton = screen.getByRole('button', { name: 'Aprobar etapa' })
    expect(headerButton.parentElement).toHaveClass('flex', 'flex-wrap', 'items-end', 'justify-between')
    expect(headerButton).toHaveClass('shrink-0', 'px-3', 'py-1.5')
    expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aprobar etapa' })).toBeInTheDocument()
  })

  it.each([
    ['la acción no está disponible', true, false],
    ['el usuario no tiene permisos', false, true],
  ])('oculta Aprobar etapa en el encabezado cuando %s', async (_case, hasPermission, actionAvailable) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(actionAvailable))
    if (hasPermission) renderApplicationManagerPage('documentos')
    else renderOwnerPage('documentos')

    await screen.findByText('EXP-007')
    expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
  })

  it('aprueba desde el encabezado con una sola solicitud y actualiza el expediente', async () => {
    const approval = deferred()
    const approvedResponse = inscriptionStageResponse(true)
    approvedResponse.flujo.etapa_actual = { ...approvedResponse.flujo.etapa_actual, estado: 'APROBADA', acciones_permitidas: [] }
    approvedResponse.flujo.etapas = [approvedResponse.flujo.etapa_actual]
    approvedResponse.flujo.orientacion_etapa_actual = { mensaje: 'Etapa aprobada.', requisitos: [], siguiente_accion: null }
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(inscriptionStageResponse(true))
      .mockResolvedValueOnce(approvedResponse)
    postulacionesService.aprobarEtapa.mockReturnValue(approval.promise)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('etapas')

    const button = await screen.findByRole('button', { name: 'Aprobar etapa' })
    expect(screen.getByRole('tab', { name: 'Etapas' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(button)
    fireEvent.click(button)

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(1)
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(31, expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled()

    await act(async () => approval.resolve({ id: 31, codigo: 'INSCRIPCION', estado: 'APROBADA' }))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true'))
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getAllByText('Inscripción').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
    confirm.mockRestore()
  })

  it('navega de Documentos a Resumen después de cargar la nueva orientación', async () => {
    const approvedResponse = inscriptionStageResponse(true)
    approvedResponse.flujo.etapa_actual = { id: 32, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', acciones_permitidas: [] }
    approvedResponse.flujo.etapas = [approvedResponse.flujo.etapa_actual]
    approvedResponse.flujo.orientacion_etapa_actual = { mensaje: 'Gestiona el perfil de la nueva etapa.', requisitos: [], siguiente_accion: null }
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(inscriptionStageResponse(true))
      .mockResolvedValueOnce(approvedResponse)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('documentos')

    expect(await screen.findByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar etapa' }))

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByText('Gestiona el perfil de la nueva etapa.')).toBeInTheDocument()
    expect(screen.getAllByText('Perfil de Proyecto').length).toBeGreaterThan(0)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  it.each([
    ['la confirmación se cancela', false, null],
    ['la aprobación falla', true, { message: 'No se pudo aprobar la etapa.' }],
  ])('mantiene la pestaña actual cuando %s', async (_case, confirmed, approvalError) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(true))
    if (approvalError) postulacionesService.aprobarEtapa.mockRejectedValue(approvalError)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(confirmed)
    renderApplicationManagerPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar etapa' }))
    if (confirmed) await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(1))

    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')
    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledTimes(confirmed ? 1 : 0)
    confirm.mockRestore()
  })

  it('no muestra aprobar Documento Final si la orientación indica cargarlo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: 'Carga el Documento Final requerido para esta etapa.',
          requisitos: [],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
        },
      },
    })
    renderApplicationManagerPage()
    await screen.findByText('Cargar Documento Final del Proyecto de Grado')
    expect(screen.getAllByText('Carga el documento completo del Proyecto de Grado para continuar con la revisión correspondiente.').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Aprobar Documento Final' })).not.toBeInTheDocument()
  })

  it('muestra aprobar Documento Final solo con orientación APROBAR_ETAPA', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: 'El Documento Final está aprobado y la etapa está lista para aprobarse.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    })
    renderApplicationManagerPage()
    expect(await screen.findByRole('button', { name: 'Aprobar Documento Final del Proyecto de Grado' })).toBeInTheDocument()
  })

  it('refresca la orientación canónica tras cargar Documento Final y no aprueba la etapa automáticamente', async () => {
    const documentStage = { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' }
    const loadOrientation = {
      mensaje: 'Carga el Documento Final requerido para esta etapa.',
      requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    const approveOrientation = {
      mensaje: 'El Documento Final está aprobado y la etapa está lista para aprobarse.',
      requisitos: [],
      siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', estado: 'DISPONIBLE', destino: '#resumen' },
    }
    const beforeUpload = {
      ...response,
      flujo: { ...response.flujo, etapa_actual: documentStage, orientacion_etapa_actual: loadOrientation },
    }
    const afterUpload = {
      ...response,
      flujo: { ...response.flujo, etapa_actual: documentStage, orientacion_etapa_actual: approveOrientation },
    }
    postulacionesService.obtenerExpediente.mockReset().mockResolvedValueOnce(beforeUpload).mockResolvedValueOnce(afterUpload)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
    ] })
    let resolveUpload
    postulacionesService.cargarDocumento.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_cargar_documentos'].includes(name),
    }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByText('Cargar Documento Final del Proyecto de Grado')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const uploadDialog = screen.getByRole('dialog', { name: 'Cargar documentos' })
    const file = new File(['%PDF-1.4'], 'documento-final.pdf', { type: 'application/pdf' })
    await userEvent.upload(await within(uploadDialog).findByLabelText('Documento Final'), file)
    const submit = within(uploadDialog).getByRole('button', { name: 'Cargar 1 documento' })
    await userEvent.click(submit)

    expect(await screen.findByRole('button', { name: 'Cargando 1 de 1...' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cargando 1 de 1...' }))
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    resolveUpload({ id: 303, numero_version: 1, es_version_actual: true })

    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('button', { name: 'Aprobar Documento Final del Proyecto de Grado' })).toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Cargar Documento Final del Proyecto de Grado')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2)
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('no refresca el expediente ni los documentos cuando falla la carga', async () => {
    const documentStage = { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' }
    postulacionesService.obtenerExpediente.mockReset().mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: documentStage,
        orientacion_etapa_actual: {
          mensaje: 'Carga el Documento Final requerido para esta etapa.',
          requisitos: [],
          siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Documento Final', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
        },
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.cargarDocumento.mockRejectedValue({ status: 400, message: 'Carga rechazada.' })
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_cargar_documentos'].includes(name),
    }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await screen.findByText('Cargar Documento Final del Proyecto de Grado')
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const uploadDialog = screen.getByRole('dialog', { name: 'Cargar documentos' })
    await userEvent.upload(await within(uploadDialog).findByLabelText('Documento Final'), new File(['%PDF-1.4'], 'documento-final.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(uploadDialog).getByRole('button', { name: 'Cargar 1 documento' }))

    expect(await within(uploadDialog).findByText('0 documentos cargados. 1 documento no pudo cargarse.')).toBeVisible()
    expect(within(uploadDialog).getByText('Carga rechazada.')).toBeVisible()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
    expect(postulacionesService.inicializarFlujo).not.toHaveBeenCalled()
    expect(postulacionesService.aprobarEtapa).not.toHaveBeenCalled()
  })

  it('permite gestionar la Hoja de Aprobación desde Revisión Final Post Pública', async () => {
    const reviewStage = { id: 120, codigo: 'REVISION_FINAL_POST_PUBLICA', nombre: 'Revisión Final Post Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: reviewStage,
        etapas: [reviewStage],
        orientacion_etapa_actual: {
          mensaje: 'Carga la Hoja de Aprobación correspondiente a la Defensa Pública para continuar.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'HOJA_APROBACION', nombre: 'Hoja de Aprobación', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de carga', destino: '#documentos' }],
          siguiente_accion: { codigo: 'CARGAR_HOJA_APROBACION', titulo: 'Cargar Hoja de Aprobación', descripcion: 'La Hoja de Aprobación debe ser cargada por el personal administrativo.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Ir a documentos' },
        },
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({
      documentos_aplicables: [
        { id: 71, codigo: 'HOJA_APROBACION', nombre: 'Hoja de Aprobación', capacidad_carga: { permitida: true } },
      ],
    })
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    renderApplicationUploadManagerPage()

    const orientation = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(orientation).getByText('Carga la Hoja de Aprobación correspondiente a la Defensa Pública para continuar.')).toBeInTheDocument()
    expect(within(orientation).getByText('Pendiente de carga')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión Final Post Pública' })).not.toBeInTheDocument()

    const manageDocuments = within(orientation).getByRole('button', { name: 'Gestionar documentos' })
    expect(manageDocuments).toBeVisible()
    await userEvent.click(manageDocuments)

    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(window.location.hash).toBe('#documentos')
    const uploadDialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(uploadDialog).getByLabelText('Hoja de Aprobación')).toBeVisible()
    expect(within(uploadDialog).getByRole('button', { name: 'Cargar 0 documentos' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()

    await userEvent.click(within(uploadDialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')
  })

  it('muestra el faltante humano al fallar la aprobación de la etapa actual', async () => {
    const reviewStage = { id: 120, codigo: 'REVISION_FINAL_POST_PUBLICA', nombre: 'Revisión Final Post Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: reviewStage,
        etapas: [reviewStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa los requisitos de la etapa actual.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'HOJA_APROBACION', nombre: 'Hoja de Aprobación', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Revisión Final Post Pública', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    })
    postulacionesService.aprobarEtapa.mockRejectedValue({
      status: 400,
      message: 'No se puede aprobar la etapa. Falta completar: Hoja de Aprobación.',
      faltantes: ['DOCUMENTO:HOJA_APROBACION'],
      fields: { faltantes: ['DOCUMENTO:HOJA_APROBACION'] },
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage()
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })

    expect(await screen.findByText(/Hay 1 requisito pendiente/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar Revisión Final Post Pública' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede aprobar la Revisión Final Post Pública. Falta completar: Hoja de Aprobación.')
    expect(screen.queryByText('DOCUMENTO:HOJA_APROBACION')).not.toBeInTheDocument()
    const orientation = screen.getByRole('heading', { name: 'Qué debes hacer ahora' }).parentElement
    expect(within(orientation).getByText('Falta completar: Hoja de Aprobación.', { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ir a documentos' })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ir a documentos' }))
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    confirm.mockRestore()
  })

  it('mantiene orientación y aprobación de Preparación de Examen sin el aviso redundante', async () => {
    const stage = { id: 130, codigo: 'PREPARACION_EXAMEN', nombre: 'Preparación y habilitación', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          mensaje: 'Revisa los requisitos pendientes de preparación.',
          requisitos: Array.from({ length: 6 }, (_, index) => ({
            tipo: 'INFORMATIVO',
            codigo: `PREPARACION_${index + 1}`,
            nombre: `Requisito de preparación ${index + 1}`,
            cumplido: false,
          })),
          siguiente_accion: null,
        },
      },
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApplicationManagerPage('resumen')

    expect(await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).toBeVisible()
    expect(screen.getByText('Revisa los requisitos pendientes de preparación.')).toBeVisible()
    expect(screen.queryByText(/Puedes intentar la aprobación/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Hay 6 requisitos pendientes/)).not.toBeInTheDocument()
    const approvalButton = screen.getByRole('button', { name: 'Aprobar Preparación y habilitación' })
    expect(approvalButton).toBeEnabled()

    await userEvent.click(approvalButton)

    expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(130, expect.any(AbortSignal))
    confirm.mockRestore()
  })

  it('no ofrece aprobar Documento Final al estudiante aunque la orientación esté lista', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' },
        orientacion_etapa_actual: {
          mensaje: 'El Documento Final está aprobado y la etapa está lista para aprobarse.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    })
    renderOwnerPage()
    expect(await screen.findByText('El Documento Final del Proyecto de Grado está aprobado. Espera la aprobación de la etapa por el personal responsable.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Documento Final' })).not.toBeInTheDocument()
  })

  it('guía a continuar la Defensa de Perfil cuando ya está programada', async () => {
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'PROGRAMADA', estado_display: 'Programada' }
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation },
    })
    renderDefenseManagerPage('resumen')

    expect(await screen.findByText('Continuar Defensa de Perfil programada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a la defensa' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Aprobar Perfil de Proyecto' })).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante cuando la Defensa de Perfil está en curso', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('La defensa está pendiente de finalización por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Gestionar y finalizar Defensa de Perfil')).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante para registrar la evaluación de Perfil', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'FINALIZADA', estado_display: 'Finalizada', evaluaciones: [], resultado_consolidado: null }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('La evaluación está pendiente de registro por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Registrar evaluación de Perfil')).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante para consolidar el resultado de Perfil', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'FINALIZADA', estado_display: 'Finalizada', evaluaciones: [{ id: 301, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'SUFICIENTE' }], resultado_consolidado: null }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('El resultado está pendiente de consolidación por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Consolidar resultado de Perfil')).not.toBeInTheDocument()
  })

  it('conserva la orientación operativa para administración con capacidad de gestionar defensas', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderDefenseManagerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Gestionar y finalizar Defensa de Perfil')).toBeInTheDocument()
    expect(within(summary).queryByText('La defensa está pendiente de finalización por el personal responsable.')).not.toBeInTheDocument()
  })

  it('conserva una acción documental propia para el estudiante', async () => {
    const documentOrientation = {
      mensaje: 'Carga el Documento Final.', requisitos: [{ tipo: 'DOCUMENTO', codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
      siguiente_accion: { codigo: 'GESTIONAR_DOCUMENTOS', titulo: 'Gestionar documentos', descripcion: 'Carga el Documento Final.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' }, orientacion_etapa_actual: documentOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Gestionar documentos')).toBeInTheDocument()
    expect(within(summary).getByRole('region', { name: 'Siguiente acción' })).toHaveAttribute('data-personal-action', 'true')
  })

  it.each([
    ['el estudiante', renderOwnerPage],
    ['un gestor de postulaciones con permiso de carga', renderApplicationUploadManagerPage],
  ])('abre directamente desde la orientación documental de Perfil para %s', async (_case, renderAuthorizedPage) => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const documentOrientation = {
      mensaje: 'Completa los documentos requeridos.',
      requisitos: [
        { tipo: 'DOCUMENTO', codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO', nombre: 'Carta de solicitud de Tribunal', cumplido: false, estado_display: 'No presentado', destino: '#documentos' },
        { tipo: 'DOCUMENTO', codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico', cumplido: false, estado_display: 'No presentado', destino: '#documentos' },
      ],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga los documentos no presentados.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Cargar documentos' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: documentOrientation } })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 61, codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO', nombre: 'Carta de solicitud de Tribunal', capacidad_carga: { permitida: true } },
      { id: 62, codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico', capacidad_carga: { permitida: true } },
    ] })
    renderAuthorizedPage('resumen')

    const requirements = await screen.findByRole('region', { name: 'Requisitos de esta etapa' })
    expect(within(requirements).getByText(/Carta de solicitud de Tribunal/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Perfil acad.mico/)).toBeInTheDocument()
    expect(within(requirements).getByText('0 de 2 cumplidos')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByLabelText(/Carta de solicitud de Tribunal/)).toBeVisible()
    expect(within(dialog).getByLabelText(/Perfil académico/)).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
  })

  it('no muestra acción de carga documental a un usuario sin permiso', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const documentOrientation = {
      mensaje: 'Completa los documentos requeridos.',
      requisitos: [{ tipo: 'DOCUMENTO', codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico', cumplido: false, estado_display: 'No presentado', destino: '#documentos' }],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga el documento no presentado.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Cargar documentos' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: documentOrientation } })
    renderReviewerPage()

    await screen.findByText('Completa los documentos requeridos.')
    expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
  })

  it('abre el cargador compartido de Tesis desde Resumen sin navegar', async () => {
    const thesisStage = { id: 31, codigo: 'DICTAMEN_TUTOR', nombre: 'Dictamen de Tutor', estado: 'EN_PROCESO' }
    const orientation = {
      mensaje: 'Carga el documento requerido.',
      requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        etapa_actual: thesisStage,
        etapas: [thesisStage],
        orientacion_etapa_actual: orientation,
      },
    })
    renderApplicationUploadManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
    expect(await screen.findByRole('dialog', { name: 'Cargar documentos' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#resumen')
  })

  const profileThesisApplicable = (codigo = 'SIN_DOCUMENTO', permitida = true) => ({
    postulacion_id: 53, modalidad: 'TESIS_GRADO', etapa_actual: 'PERFIL_TESIS',
    documentos_aplicables: [
      { id: 153, codigo: 'PERFIL_TESIS', nombre: 'Perfil de Tesis', capacidad_carga: { codigo, permitida } },
      { id: 154, codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe del tutor de Tesis', capacidad_carga: { codigo, permitida } },
    ],
  })
  const renderProfileThesisAction = ({ tutor = false, complete = false, canUpload = true, canAssign = true, requirements, stageCode = 'PERFIL_TESIS', modality = 'TESIS_GRADO', hash = 'resumen', actorManagement } = {}) => {
    const stage = { id: 156, codigo: stageCode, nombre: 'Perfil de Tesis', estado: 'EN_PROCESO', activo: true, numero_intento: 1 }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response, detalle: { ...response.detalle, id: 53, codigo: 'TG-2026-02', modalidad_detalle: { codigo: modality, nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage],
        gestion_actores: actorManagement ?? response.flujo.gestion_actores,
        orientacion_etapa_actual: {
          mensaje: 'Completa el tutor, los documentos y la defensa del perfil según corresponda.',
          requisitos: requirements || [
            { tipo: 'OPERATIVO', codigo: 'TUTOR', nombre: 'Tutor', cumplido: tutor, destino: '#actores' },
            ...['PERFIL_TESIS', 'INFORME_TUTOR_TESIS'].map((codigo) => ({ tipo: 'OPERATIVO', codigo, nombre: codigo, cumplido: complete, destino: '#documentos' })),
          ],
          siguiente_accion: { codigo: 'COMPLETAR_PERFIL', titulo: 'Completar perfil de Tesis', descripcion: 'Completa el tutor y los documentos requeridos del perfil.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
        } },
    })
    selectInitialTab(hash)
    const permissions = ['puede_gestionar_postulaciones', ...(canUpload ? ['puede_cargar_documentos'] : []), ...(canAssign ? ['puede_gestionar_asignaciones'] : [])]
    return render(<AuthContext.Provider value={{ user: { id: 9 }, hasPermission: (name) => permissions.includes(name) }}><MemoryRouter initialEntries={['/postulaciones/53']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
  }

  it.each([
    ['SIN_DOCUMENTO', false], ['SIN_DOCUMENTO', true], ['RECHAZADO', false],
    ['CORRECCION_REQUERIDA', true], ['CORRECCION_POST_APROBACION', false],
  ])('Perfil contextual de Tesis: abre con capacidad %s y tutor asignado %s sin duplicar consultas', async (code, tutor) => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(profileThesisApplicable(code))
    renderProfileThesisAction({ tutor })
    const trigger = await screen.findByRole('button', { name: 'Ir a documentos' })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.getAllByRole('dialog', { name: 'Cargar documentos' })).toHaveLength(1)
    expect(within(dialog).getByText('Informe del tutor de Tesis')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledExactlyOnceWith('53', expect.any(AbortSignal))
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.getByText('Completa el tutor y los documentos requeridos del perfil.')).toBeInTheDocument()
  })

  it.each(['ESPERANDO_REVISION', 'PENDIENTE_REVISION', 'DOCUMENTO_APROBADO', 'ESTADO_NO_CARGABLE'])('Perfil contextual de Tesis: permite consultar %s aunque administración tenga carga permitida', async (code) => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(profileThesisApplicable(code, true))
    renderProfileThesisAction()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a documentos' }))
    await waitFor(() => expect(window.location.hash).toBe('#documentos'))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar documento' })).toBeVisible()
  })

  it('Perfil contextual de Tesis: deriva a Actores cuando solo falta tutor, sin consultar tipos ni abrir un formulario', async () => {
    renderProfileThesisAction({ complete: true })
    const link = await screen.findByRole('link', { name: 'Ir a actores' })
    expect(link).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    { canUpload: false }, { complete: true, canAssign: false },
    { complete: true, tutor: true }, { requirements: [] },
    { modality: 'TRABAJO_DIRIGIDO' }, { stageCode: 'INSCRIPCION' },
  ])('Perfil contextual de Tesis: conserva fallback ante contexto o permiso insuficiente %j', async (options) => {
    renderProfileThesisAction(options)
    expect(await screen.findByRole('link', { name: 'Ir a documentos' })).toHaveAttribute('href', '#documentos')
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
  })

  it.each(['vacio', 'error', 'otro contexto', 'sin capacidad', 'codigo desconocido', 'sin permiso documental'])('Perfil contextual de Tesis: fallback seguro para respuesta %s', async (scenario) => {
    const applicable = profileThesisApplicable()
    if (scenario === 'vacio') applicable.documentos_aplicables = []
    if (scenario === 'otro contexto') applicable.etapa_actual = 'DOCUMENTO_FINAL'
    if (scenario === 'sin capacidad') applicable.documentos_aplicables.forEach((type) => { delete type.capacidad_carga })
    if (scenario === 'codigo desconocido') applicable.documentos_aplicables.forEach((type) => { type.capacidad_carga.codigo = 'DESCONOCIDO' })
    if (scenario === 'sin permiso documental') applicable.documentos_aplicables.forEach((type) => { type.capacidad_carga.permitida = false })
    if (scenario === 'error') postulacionesService.obtenerDocumentosAplicables.mockRejectedValue({ message: 'Servicio no disponible' })
    else postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(applicable)
    renderProfileThesisAction()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a documentos' }))
    await waitFor(() => expect(window.location.hash).toBe('#documentos'))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
  })

  it('Perfil contextual de Tesis: impide doble apertura y permite cerrar y volver a cargar manualmente', async () => {
    let resolve
    postulacionesService.obtenerDocumentosAplicables.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    renderProfileThesisAction()
    const trigger = await screen.findByRole('button', { name: 'Ir a documentos' })
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
    await act(async () => resolve(profileThesisApplicable()))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.getAllByRole('dialog', { name: 'Cargar documentos' })).toHaveLength(1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue(profileThesisApplicable())
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByRole('dialog', { name: 'Cargar documentos' })).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(2)
  })

  it('Perfil contextual de Tesis: un hash documental no consulta tipos ni abre el cargador automáticamente', async () => {
    renderProfileThesisAction({ hash: 'documentos' })
    expect(await screen.findByRole('button', { name: 'Cargar documento' })).toBeVisible()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument()
  })

  const profileTutorManagement = () => ({
    contexto: { tipo: 'ETAPA', codigo_etapa: 'PERFIL_TESIS', seguimiento_etapa: 156 },
    posiciones: [{
      clave: 'TUTOR_TESIS_1', nombre: 'Tutor de Tesis', tipo_participacion: 'TUTOR', ambito: 'POSTULACION',
      seguimiento_etapa: null, orden_cargo: null, estado_ocupacion: 'VACANTE', habilitada: true,
      asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'], bloqueo: null,
      precondicion: { codigo: 'TEMATICA_TESIS_APROBADA', enforcement: 'ACTIVO', estado: 'CUMPLIDA' },
    }],
  })
  const profileTutorCandidates = { count: 1, results: [{ id: 81, nombre_completo: 'Tutora elegible', elegible: true }] }

  const privateSecretaryManagement = () => ({
    contexto: { tipo: 'ETAPA', codigo_etapa: 'DEFENSA_PRIVADA', seguimiento_etapa: 160 },
    posiciones: [
      { ...profileTutorManagement().posiciones[0], estado_ocupacion: 'ASIGNADA', asignacion_actual: 59,
        asignacion_actual_detalle: { id: 59, usuario: { id: 45, nombre: 'Tutor vigente' } }, acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'] },
      { clave: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', nombre: 'Docente de Modalidad', tipo_participacion: 'DOCENTE_MODALIDAD',
        ambito: 'POSTULACION', seguimiento_etapa: null, orden_cargo: null, estado_ocupacion: 'VACANTE', habilitada: true,
        asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'], bloqueo: null, precondicion: null },
    ],
  })
  const renderPrivateSecretary = ({ management = privateSecretaryManagement(), canAssign = true, modality = 'TESIS_GRADO', stageCode = 'DEFENSA_PRIVADA', hash = 'resumen' } = {}) => {
    const stage = { id: 160, codigo: stageCode, nombre: 'Defensa Privada', estado: 'EN_PROCESO', activo: true, numero_intento: 1 }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, id: 53, codigo: 'TG-2026-02', modalidad_detalle: { codigo: modality } },
      flujo: { ...response.flujo, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage], gestion_actores: management,
        orientacion_etapa_actual: { requisitos: [{ codigo: 'PRECONDICIONES_DEFENSA', cumplido: false, destino: '#actores' }],
          siguiente_accion: { codigo: 'GESTIONAR_PRECONDICIONES', titulo: 'Completar precondiciones de defensa', descripcion: 'Precondición pendiente', estado: 'PENDIENTE', destino: '#actores', accion_label: 'Ir a precondiciones' } } },
    })
    selectInitialTab(hash)
    const permissions = ['puede_gestionar_postulaciones', ...(canAssign ? ['puede_gestionar_asignaciones'] : [])]
    return render(<AuthContext.Provider value={{ user: { id: 9 }, hasPermission: (name) => permissions.includes(name) }}><MemoryRouter initialEntries={['/postulaciones/53']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
  }

  it('Secretario contextual de Tesis: abre desde Resumen sin POST y conserva cierre, foco y ambos puestos', async () => {
    renderPrivateSecretary()
    const trigger = await screen.findByRole('link', { name: 'Ir a precondiciones' })
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    expect(within(dialog).getByText('Tutor vigente')).toBeVisible()
    expect(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')).toBeVisible()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(53, expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', accion: 'ASIGNAR' }), expect.any(AbortSignal))
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.filter(([, params]) => params.posicion === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1')).toHaveLength(1)
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByText('Cerrar', { selector: 'button' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it.each([
    { canAssign: false }, { management: null }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' },
    ...[
      { estado_ocupacion: 'ASIGNADA', asignacion_actual: 80 }, { habilitada: false }, { bloqueo: { codigo: 'BLOQUEO' } },
      { precondicion: { estado: 'PENDIENTE' } }, { acciones_permitidas: [] }, { ambito: 'ETAPA' }, { seguimiento_etapa: 160 },
      { tipo_participacion: 'SECRETARIO' }, { clave: 'OTRO_PUESTO' },
    ].map((changes) => { const management = privateSecretaryManagement(); Object.assign(management.posiciones[1], changes); return { management } }),
    { management: { ...privateSecretaryManagement(), contexto: { tipo: 'ETAPA', codigo_etapa: 'DEFENSA_PRIVADA', seguimiento_etapa: 999 } } },
    { management: { ...privateSecretaryManagement(), posiciones: [...privateSecretaryManagement().posiciones, privateSecretaryManagement().posiciones[1]] } },
  ])('Secretario contextual de Tesis: conserva navegación segura %j', async (options) => {
    renderPrivateSecretary(options)
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    expect(window.location.hash).toBe('#actores')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Secretario contextual de Tesis: conserva apertura manual sin automatismo por hash', async () => {
    renderPrivateSecretary({ hash: 'actores' })
    const trigger = await screen.findByRole('button', { name: 'Gestionar actores' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(await screen.findByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })).toBeVisible()
  })

  it('Secretario contextual de Tesis: conserva candidatos vacíos sin asignaciones automáticas', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 0, results: [] })
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getAllByText('No se encontraron candidatos elegibles.')).toHaveLength(2))
    expect(within(dialog).queryByRole('button', { name: 'Guardar asignaciones' })).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Ocupaciones informativas: conserva habilitado al Tutor compatible y bloquea candidatos no elegibles incluso al enviar', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, results: [
      { id: 45, nombre_completo: 'Tutor compatible', elegible: true, asignaciones_vigentes: ['Tutor', 'Tribunal 1'] },
      { id: 82, nombre_completo: 'Docente incompatible', elegible: false, motivo_bloqueo: 'OCUPADO', asignaciones_vigentes: ['Docente de modalidad'] },
    ] })
    renderPrivateSecretary({ modality: 'TRABAJO_DIRIGIDO' })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    expect(await within(selector).findByRole('option', { name: /Tutor compatible.*Asignación vigente: Tutor, Tribunal 1/ })).toBeEnabled()
    expect(within(selector).getByRole('option', { name: /Docente incompatible.*Docente de modalidad/ })).toBeDisabled()
    fireEvent.change(selector, { target: { value: '82' } })
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    await userEvent.selectOptions(selector, '45')
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
  })

  it('Ocupaciones informativas: excluye del payload una selección que deja de ser elegible después de buscar', async () => {
    let stale = false
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(async (_id, params) => ({ count: 1, results: [
      { id: 81, nombre_completo: 'Docente cambiante', elegible: params.posicion === 'TUTOR_TESIS_1' || !stale, asignaciones_vigentes: stale ? ['Tribunal 1'] : [], asignaciones_vigentes_detalle: [] },
    ] }))
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    await within(selector).findByRole('option', { name: /Docente cambiante/ })
    await userEvent.selectOptions(selector, '81')
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
    stale = true
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato para Docente de Modalidad'), 'Docente')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Buscar' }).at(-1))
    await waitFor(() => expect(within(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')).getByRole('option', { name: /Docente cambiante.*Tribunal 1/ })).toBeDisabled())
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(within(dialog).queryByRole('button', { name: 'Guardar asignaciones' })).not.toBeInTheDocument()
  })

  const secretaryOccupation = (overrides = {}) => ({ id: 59, postulacion: 53, usuario: 81, codigo_posicion: 'TUTOR_TESIS_1',
    tipo_participacion: 'TUTOR', ambito: 'POSTULACION', seguimiento_etapa: null, activo: true, ...overrides })

  const directedSecretaryOccupation = (overrides = {}) => secretaryOccupation({ postulacion: 54,
    codigo_posicion: 'TUTOR_TRABAJO_DIRIGIDO_1', ...overrides })
  const openDirectedSecretary = async ({ details = [], own = false, candidates, modality = 'TRABAJO_DIRIGIDO' } = {}) => {
    const management = privateSecretaryManagement()
    management.posiciones[0].clave = 'TUTOR_TRABAJO_DIRIGIDO_1'
    Object.assign(management.posiciones[1], { clave: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1', ambito: 'ETAPA', seguimiento_etapa: 160 })
    if (own) Object.assign(management.posiciones[1], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 88,
      asignacion_actual_detalle: { id: 88, usuario: { id: 81, nombre: 'Titular propio' } }, acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'] })
    const stage = { id: 160, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', activo: true, numero_intento: 1 }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, id: 54, modalidad_detalle: { codigo: modality } },
      flujo: { ...response.flujo, etapa_actual: stage, etapas: [
        { id: 155, codigo: 'PERFIL_TRABAJO_DIRIGIDO', estado: 'APROBADA', activo: true, numero_intento: 2 },
        { id: 123, codigo: 'PERFIL_TRABAJO_DIRIGIDO', estado: 'APROBADA', activo: true, numero_intento: 1 }, stage,
      ], gestion_actores: management, orientacion_etapa_actual: null },
    })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(candidates || (() => Promise.resolve({ count: 2, results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes: details?.length ? ['Ocupación informada'] : [], asignaciones_vigentes_detalle: details },
      { id: 82, nombre_completo: 'Docente libre', elegible: true, asignaciones_vigentes_detalle: [] },
    ] })))
    renderAssignmentManagerPage('actores')
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    const selector = within(dialog).getByLabelText(`${own ? 'Seleccionar reemplazo' : 'Seleccionar candidato'} para Docente de Modalidad`)
    await within(selector).findByRole('option', { name: /Docente candidato/ })
    return { dialog, selector }
  }

  it.each([
    ['Tutor', [directedSecretaryOccupation()], true],
    ...[1, 2, 3].map((order) => [`Tribunal ${order}`, [directedSecretaryOccupation({ tipo_participacion: 'TRIBUNAL', codigo_posicion: `TRIBUNAL_PROPUESTA_TD_${order}`, ambito: 'ETAPA', seguimiento_etapa: 155, orden_cargo: order })], true]),
    ['Libre', [], false], ['Inactiva', [directedSecretaryOccupation({ activo: false })], false],
    ['Otro expediente', [directedSecretaryOccupation({ postulacion: 999 })], false],
    ['Histórica', [directedSecretaryOccupation({ tipo_participacion: 'TRIBUNAL', codigo_posicion: 'TRIBUNAL_PROPUESTA_TD_1', ambito: 'ETAPA', seguimiento_etapa: 123 })], false],
    ['Otro tribunal', [directedSecretaryOccupation({ tipo_participacion: 'TRIBUNAL', codigo_posicion: 'TRIBUNAL_AJENO_1', ambito: 'ETAPA', seguimiento_etapa: 155 })], false],
    ['Otro rol', [directedSecretaryOccupation({ tipo_participacion: 'PRESIDENTE', codigo_posicion: 'PRESIDENTE_TD_1', ambito: 'ETAPA', seguimiento_etapa: 160 })], false],
    ['Información ausente', null, true],
  ])('Docente TD: verifica ocupación %s', async (_label, details, blocked) => {
    const { dialog, selector } = await openDirectedSecretary({ details })
    const option = within(selector).getByRole('option', { name: /Docente candidato/ })
    if (blocked) expect(option).toBeDisabled()
    else expect(option).toBeEnabled()
    expect(within(selector).getByRole('option', { name: 'Docente libre' })).toBeEnabled()
    if (details?.length) expect(option).toHaveAccessibleName(/Asignación vigente: Ocupación informada/)
    if (blocked) {
      fireEvent.change(selector, { target: { value: '81' } })
      fireEvent.submit(dialog.querySelector('form'))
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    }
  })

  it('Docente TD: conserva al titular propio y el payload de un candidato libre', async () => {
    const { dialog, selector } = await openDirectedSecretary({ own: true, details: [directedSecretaryOccupation()] })
    expect(within(selector).getByRole('option', { name: /Docente candidato/ })).toBeEnabled()
    expect(within(dialog).getByText('Titular propio')).toBeVisible()
    await userEvent.selectOptions(selector, '82')
    postulacionesService.reemplazarActor.mockRejectedValueOnce({ message: 'Validación backend de prueba' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    await waitFor(() => expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(88, { nuevo_usuario: 82, observaciones: '' }, expect.any(AbortSignal)))
  })

  it('Docente TD: actualiza drafts y evita enviar duplicados temporales', async () => {
    const { dialog, selector } = await openDirectedSecretary()
    const tutor = within(dialog).getByLabelText('Seleccionar reemplazo para Tutor de Tesis')
    const calls = postulacionesService.obtenerCandidatosElegibles.mock.calls.length
    await userEvent.selectOptions(tutor, '81')
    expect(within(selector).getByRole('option', { name: /Docente candidato.*Seleccionado como/ })).toBeDisabled()
    await userEvent.selectOptions(tutor, '82')
    expect(within(selector).getByRole('option', { name: 'Docente candidato' })).toBeEnabled()
    await userEvent.selectOptions(tutor, '')
    expect(within(selector).getByRole('option', { name: 'Docente libre' })).toBeEnabled()
    await userEvent.selectOptions(selector, '81')
    await userEvent.selectOptions(tutor, '81')
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledTimes(calls)
  })

  it('Docente TD: conserva bloqueo en búsqueda y paginación', async () => {
    const { selector } = await openDirectedSecretary({ candidates: () => Promise.resolve({ count: 21, next: '?page=2', results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes_detalle: [directedSecretaryOccupation()] },
    ] }) })
    const section = selector.closest('section')
    await userEvent.type(within(section).getByRole('textbox'), 'Docente')
    await userEvent.click(within(section).getByRole('button', { name: 'Buscar' }))
    expect(await within(section).findByRole('option', { name: /Docente candidato/ })).toBeDisabled()
    await userEvent.click(within(section).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(54,
      expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1', page: 2, search: 'Docente' }), expect.any(AbortSignal)))
    expect(await within(section).findByRole('option', { name: /Docente candidato/ })).toBeDisabled()
  })

  it.each(['TESIS_GRADO', 'PROYECTO_GRADO'])('Docente TD: no extiende la prevención a %s', async (modality) => {
    const { selector } = await openDirectedSecretary({ modality, details: [directedSecretaryOccupation()] })
    expect(within(selector).getByRole('option', { name: /Docente candidato/ })).toBeEnabled()
  })

  it.each([
    ['Tutor', [secretaryOccupation()], true],
    ...[1, 2, 3].map((order) => [`Tribunal ${order}`, [secretaryOccupation({ codigo_posicion: `TRIBUNAL_TEMATICA_TESIS_${order}`, tipo_participacion: 'TRIBUNAL', ambito: 'ETAPA', seguimiento_etapa: 155 })], true]),
    ['Varias ocupaciones', [secretaryOccupation(), secretaryOccupation({ id: 60, codigo_posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', tipo_participacion: 'DOCENTE_MODALIDAD' })], true],
    ['Sin ocupaciones', [], false], ['Inactiva', [secretaryOccupation({ activo: false })], false],
    ['Otro expediente', [secretaryOccupation({ postulacion: 54 })], false],
    ['Sin contrato', undefined, true], ['Ambiguo', [secretaryOccupation(), secretaryOccupation()], true],
    ['Sin posición', [secretaryOccupation({ codigo_posicion: null })], true], ['Otro usuario', [secretaryOccupation({ usuario: 82 })], true],
  ])('Prevención privada de Tesis: %s se resuelve por datos estructurados', async (label, details, blocked) => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes: [label], asignaciones_vigentes_detalle: details },
    ] })
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    const option = await within(selector).findByRole('option', { name: new RegExp(`Docente candidato.*${label}`) })
    if (blocked) {
      expect(option).toBeDisabled()
      fireEvent.change(selector, { target: { value: '81' } })
      fireEvent.submit(dialog.querySelector('form'))
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    } else expect(option).toBeEnabled()
    const tutor = within(dialog).getByLabelText('Seleccionar reemplazo para Tutor de Tesis')
    expect(await within(tutor).findByRole('option', { name: /Docente candidato/ })).toBeEnabled()
  })

  it('Prevención privada de Tesis: una ocupación nueva impide guardar aunque elegible siga siendo true', async () => {
    let occupied = false
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(async () => ({ count: 1, results: [
      { id: 81, nombre_completo: 'Docente candidato', elegible: true, asignaciones_vigentes: occupied ? ['Tutor'] : [], asignaciones_vigentes_detalle: occupied ? [secretaryOccupation()] : [] },
    ] }))
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')
    await within(selector).findByRole('option', { name: /Docente candidato/ })
    await userEvent.selectOptions(selector, '81')
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
    occupied = true
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Buscar' }).at(-1))
    // Cambiar la búsqueda solicita datos nuevos mediante el mecanismo existente.
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato para Docente de Modalidad'), 'Docente')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Buscar' }).at(-1))
    await waitFor(() => expect(within(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad')).getByRole('option', { name: /Docente candidato.*Tutor/ })).toBeDisabled())
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Secretario contextual de Tesis: conserva errores, búsqueda, paginación y payload de postulación', async () => {
    let failed = false
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(async (_id, params) => {
      if (params.posicion === 'TUTOR_TESIS_1') return { count: 0, results: [] }
      if (!failed) { failed = true; throw { message: 'Error al consultar Secretario.' } }
      return { count: 21, next: '?page=2', results: [{ id: 81, nombre_completo: 'Docente elegible', elegible: true, asignaciones_vigentes_detalle: [] }] }
    })
    postulacionesService.asignarActor.mockRejectedValueOnce({ message: 'Asignación rechazada por backend.' })
    renderPrivateSecretary()
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Error al consultar Secretario.')).toBeVisible()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar candidatos' }))
    await within(dialog).findByRole('option', { name: /Docente elegible/ })
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' }).at(-1))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', page: 2 }), expect.any(AbortSignal)))
    await within(dialog).findByRole('option', { name: /Docente elegible/ })
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato para Docente de Modalidad'), 'Docente')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Buscar' }).at(-1))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1', search: 'Docente', page: 1 }), expect.any(AbortSignal)))
    await within(dialog).findByRole('option', { name: /Docente elegible/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar candidato para Docente de Modalidad'), '81')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.asignarActor).toHaveBeenCalledExactlyOnceWith(53, { usuario: 81, tipo_participacion: 'DOCENTE_MODALIDAD', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByText('Asignación rechazada por backend.')).toBeVisible()
    expect(within(dialog).getByText('Tutor vigente')).toBeVisible()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it.each(['Ir a gestionar', 'Ir a actores'])('Tutor contextual de Tesis: abre desde %s, conserva foco y evita aperturas duplicadas', async (label) => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue(profileTutorCandidates)
    renderProfileThesisAction({ complete: true, actorManagement: profileTutorManagement() })
    const trigger = await screen.findByRole('link', { name: label })
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor de Tesis')
    expect(await within(selector).findByRole('option', { name: /Tutora elegible/ })).toBeEnabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledExactlyOnceWith(53, expect.objectContaining({ posicion: 'TUTOR_TESIS_1', accion: 'ASIGNAR' }), expect.any(AbortSignal))
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByText('Cerrar', { selector: 'button' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Tutor contextual de Tesis: usa el payload canónico de postulación y conserva errores backend', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue(profileTutorCandidates)
    postulacionesService.asignarActor.mockRejectedValueOnce({ message: 'La asignación no está permitida.' })
    renderProfileThesisAction({ actorManagement: profileTutorManagement() })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a gestionar' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor de Tesis')
    await within(selector).findByRole('option', { name: /Tutora elegible/ })
    await userEvent.selectOptions(selector, '81')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.asignarActor).toHaveBeenCalledExactlyOnceWith(53, { usuario: 81, tipo_participacion: 'TUTOR', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByText('La asignación no está permitida.')).toBeInTheDocument()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
  })

  it.each([
    ['sin contrato', (contract) => { delete contract.contexto }],
    ['sin posiciones', (contract) => { contract.posiciones = [] }],
    ['ambiguo', (contract) => { contract.posiciones.push({ ...contract.posiciones[0], clave: 'OTRO_TUTOR' }) }],
    ['otra etapa', (contract) => { contract.contexto.codigo_etapa = 'TEMATICA_TESIS' }],
    ['otro seguimiento', (contract) => { contract.contexto.seguimiento_etapa = 999 }],
    ['sin seguimiento', (contract) => { delete contract.contexto.seguimiento_etapa }],
    ['otro puesto', (contract) => { contract.posiciones[0].clave = 'TUTOR_PROYECTO_1' }],
    ['otro ámbito', (contract) => { contract.posiciones[0].ambito = 'ETAPA' }],
    ['seguimiento en tutor', (contract) => { contract.posiciones[0].seguimiento_etapa = 156 }],
    ['asignado', (contract) => { Object.assign(contract.posiciones[0], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 98, acciones_permitidas: ['REEMPLAZAR'] }) }],
    ['asignación incoherente', (contract) => { contract.posiciones[0].asignacion_actual = 98 }],
    ['deshabilitado', (contract) => { contract.posiciones[0].habilitada = false }],
    ['sin ASIGNAR', (contract) => { contract.posiciones[0].acciones_permitidas = [] }],
    ['bloqueado', (contract) => { contract.posiciones[0].bloqueo = { codigo: 'BLOQUEO', mensaje: 'No permitido' } }],
    ['precondición pendiente', (contract) => { contract.posiciones[0].precondicion.estado = 'PENDIENTE' }],
  ])('Tutor contextual de Tesis: conserva navegación ante contrato %s', async (_label, change) => {
    const contract = profileTutorManagement()
    change(contract)
    renderProfileThesisAction({ complete: true, actorManagement: contract })
    for (const label of ['Ir a gestionar', 'Ir a actores']) {
      const link = await screen.findByRole('link', { name: label })
      expect(link).toHaveAttribute('href', '#actores')
      const click = new MouseEvent('click', { bubbles: true, cancelable: true })
      fireEvent(link, click)
      expect(window.location.hash).toBe('#actores')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    }
    expect(postulacionesService.obtenerCandidatosElegibles).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it.each([{ canAssign: false }, { tutor: true }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' }, { stageCode: 'INSCRIPCION' }])('Tutor contextual de Tesis: no intercepta otros permisos o contextos %j', async (options) => {
    renderProfileThesisAction({ actorManagement: profileTutorManagement(), ...options })
    const link = await screen.findByRole('link', { name: 'Ir a gestionar' })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(link, click)
    expect(window.location.hash).toBe('#actores')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles).not.toHaveBeenCalled()
  })

  it('Tutor contextual de Tesis: conserva la apertura manual y no abre por hash', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 0, results: [] })
    renderProfileThesisAction({ actorManagement: profileTutorManagement(), hash: 'actores' })
    const trigger = await screen.findByRole('button', { name: 'Gestionar actores' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles).not.toHaveBeenCalled()
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    expect(await within(dialog).findByText('No se encontraron candidatos elegibles.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByText('Cerrar', { selector: 'button' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Tutor contextual de Tesis: conserva error, reintento, búsqueda y paginación de candidatos', async () => {
    postulacionesService.obtenerCandidatosElegibles.mockRejectedValueOnce({ message: 'No fue posible consultar candidatos.' }).mockResolvedValue({ ...profileTutorCandidates, count: 21, next: '?page=2' })
    renderProfileThesisAction({ actorManagement: profileTutorManagement() })
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a gestionar' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Tesis' })
    expect(await within(dialog).findByText('No fue posible consultar candidatos.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar candidatos' }))
    await within(dialog).findByRole('option', { name: /Tutora elegible/ })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'TUTOR_TESIS_1', page: 2 }), expect.any(AbortSignal)))
    await within(dialog).findByRole('option', { name: /Tutora elegible/ })
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato para Tutor de Tesis'), 'Tutora')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(53, expect.objectContaining({ posicion: 'TUTOR_TESIS_1', search: 'Tutora', page: 1 }), expect.any(AbortSignal)))
  })

  const renderTutorDictamenContext = ({ canManage = true, canUpload = false, action = 'REGISTRAR_DICTAMEN', status = 'DISPONIBLE', modality = 'TESIS_GRADO', ambiguous = false, blocked = false, documentError = false, hash = 'resumen', type = 'TUTOR', missingEvidence = false, incompleteTribunal = false, orientation } = {}) => {
    const stage = { id: type === 'TUTOR' ? 158 : 159, codigo: `REVISION_${type}`, nombre: `Revisión de ${type === 'TUTOR' ? 'Tutor' : 'Tribunal'}`, numero_intento: 1, estado: 'EN_PROCESO', activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, id: 53, codigo: 'TG-2026-02', modalidad_detalle: { codigo: modality, nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { codigo: modality }, etapa_actual: stage, etapas: ambiguous ? [stage, { ...stage, id: 999 }] : [stage],
        orientacion_etapa_actual: orientation ?? { requisitos: [], siguiente_accion: { codigo: action, estado: status, titulo: `Registrar dictamen del ${type === 'TUTOR' ? 'Tutor' : 'Tribunal'}`, accion_label: 'Ir a registrar dictamen', destino: type === 'TUTOR' ? '#dictamen-tutor' : '#dictamen-tribunal', bloqueo: blocked ? { codigo: 'BLOQUEO' } : null } } },
    })
    const docs = { count: 2, results: [
      { id: 55, postulacion: 53, activo: true, tipo_documento_codigo: 'DOCUMENTO_FINAL', versiones: [{ id: 57, numero_version: 1, activo: true, es_version_actual: true }] },
      { id: 53, postulacion: 53, activo: true, tipo_documento_codigo: 'INFORME_TUTOR_TESIS', versiones: [{ id: 55, numero_version: 1, activo: true, es_version_actual: true, nombre_original: 'informe-tutor.pdf' }] },
    ] }
    if (type === 'TRIBUNAL') docs.results[1] = { ...docs.results[1], tipo_documento_codigo: 'INFORME_TRIB_TESIS' }
    if (missingEvidence) { docs.results.pop(); docs.count = 1 }
    if (documentError) postulacionesService.obtenerDocumentos.mockRejectedValue({ message: 'Error documental' })
    else postulacionesService.obtenerDocumentos.mockResolvedValue(docs)
    postulacionesService.obtenerActores.mockResolvedValue(type === 'TUTOR'
      ? { count: 1, results: [{ id: 59, postulacion: 53, tipo_participacion: 'TUTOR', activo: true, usuario_nombre: 'Tutor vigente' }] }
      : { count: incompleteTribunal ? 2 : 3, results: (incompleteTribunal ? [1, 2] : [1, 2, 3]).map((order) => ({ id: 55 + order, usuario: 100 + order, postulacion: 53, tipo_participacion: 'TRIBUNAL', activo: true, etapa_codigo: 'TEMATICA_TESIS', seguimiento_etapa: 155, orden_cargo: order })) })
    postulacionesService.obtenerDictamenesRevision.mockResolvedValue([])
    selectInitialTab(hash)
    const permissions = ['puede_gestionar_postulaciones', ...(canManage ? ['puede_gestionar_seguimiento'] : []), ...(canUpload ? ['puede_cargar_documentos'] : [])]
    return render(<AuthContext.Provider value={{ user: { id: 9 }, hasPermission: (name) => permissions.includes(name) }}><MemoryRouter initialEntries={['/postulaciones/53']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
  }

  const tribunalReportOrientation = {
    requisitos: [{ tipo: 'OPERATIVO', codigo: 'INFORME_TRIB_TESIS', nombre: 'Informe del Tribunal de Tesis', cumplido: false, estado: 'PENDIENTE', destino: '#documentos' }],
    siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar Informe del Tribunal de Tesis', descripcion: 'Adjunta el Informe del Tribunal de Tesis requerido para registrar el dictamen correspondiente.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Gestionar documentos' },
  }

  it('Prioridad documental del Tribunal: carga el informe y actualiza la orientación para abrir el dictamen sin recargar', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', canUpload: true, missingEvidence: true, orientation: tribunalReportOrientation })
    let pendingResponse
    await act(async () => { pendingResponse = await postulacionesService.obtenerExpediente.mock.results[0].value })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 154, codigo: 'INFORME_TRIB_TESIS', nombre: 'Informe del Tribunal de Tesis', capacidad_carga: { codigo: 'SIN_DOCUMENTO', permitida: true } },
    ] })
    postulacionesService.cargarDocumento.mockImplementation(async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue({ ...pendingResponse, flujo: { ...pendingResponse.flujo,
        orientacion_etapa_actual: { requisitos: [], siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN', titulo: 'Registrar nuevo dictamen del Tribunal', estado: 'DISPONIBLE', destino: '#dictamen-tribunal', accion_label: 'Ir a registrar dictamen' } },
      } })
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, results: [
        { id: 55, postulacion: 53, activo: true, tipo_documento_codigo: 'DOCUMENTO_FINAL', versiones: [{ id: 57, numero_version: 1, activo: true, es_version_actual: true }] },
        { id: 53, postulacion: 53, activo: true, tipo_documento_codigo: 'INFORME_TRIB_TESIS', versiones: [{ id: 55, numero_version: 1, activo: true, es_version_actual: true }] },
      ] })
      return { id: 55, numero_version: 1, es_version_actual: true }
    })
    const trigger = await screen.findByRole('button', { name: 'Gestionar documentos' })
    await userEvent.click(trigger)
    const upload = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledExactlyOnceWith('53', expect.any(AbortSignal))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    const file = new File(['informe'], 'informe-tribunal.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(upload).getByLabelText('Informe del Tribunal de Tesis'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ postulacionId: 53, tipoDocumentoId: 154, archivo: file }), expect.any(AbortSignal))
    await userEvent.click(await screen.findByRole('link', { name: 'Ir a registrar dictamen' }))
    const dictamen = await screen.findByRole('dialog', { name: 'Dictamen del Tribunal' })
    expect(within(dictamen).getByLabelText('Evidencia').options).toHaveLength(2)
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#resumen')
  })

  it('Prioridad documental del Tribunal: respeta el permiso de carga sin abrir ni consultar el cargador', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', missingEvidence: true, orientation: tribunalReportOrientation })
    expect(await screen.findByText('Cargar Informe del Tribunal de Tesis')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Dictamen contextual de Tesis: abre el formulario existente desde Resumen sin navegar ni registrar', async () => {
    renderTutorDictamenContext()
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Dictamen del Tutor' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(document.getElementById('panel-documentos')).not.toBeVisible()
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDictamenesRevision).toHaveBeenCalledExactlyOnceWith(158, expect.any(AbortSignal))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Dictamen contextual de Tesis: conserva payload y la apertura manual, sin automatismo por hash', async () => {
    renderTutorDictamenContext({ hash: 'dictamen-tutor' })
    const trigger = await screen.findByRole('button', { name: 'Registrar dictamen' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Tutor'), '59')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '55')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledExactlyOnceWith(158, {
      tipo_revision: 'TUTOR', version_documento_revisada: 57, evidencia_version: 55, asignacion_emisora: 59, resultado: 'SUFICIENTE', observaciones: '',
    }, expect.any(AbortSignal))
  })

  it.each([{ canManage: false }, { status: 'PENDIENTE' }, { action: 'CORREGIR_DOCUMENTO_FINAL' }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' }, { ambiguous: true }, { blocked: true }, { documentError: true }])('Dictamen contextual de Tesis: mantiene navegación segura para %j', async (options) => {
    renderTutorDictamenContext(options)
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.click(trigger)
    expect(window.location.hash).toBe('#dictamen-tutor')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('Tribunal contextual de Tesis: abre desde Resumen sin navegación ni POST y conserva el payload sin emisor', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL' })
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Dictamen del Tribunal' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    expect(postulacionesService.obtenerDictamenesRevision).toHaveBeenCalledExactlyOnceWith(159, expect.any(AbortSignal))
    expect(within(dialog).queryByLabelText('Tutor')).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '55')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledExactlyOnceWith(159, {
      tipo_revision: 'TRIBUNAL', version_documento_revisada: 57, evidencia_version: 55, resultado: 'SUFICIENTE', observaciones: '',
    }, expect.any(AbortSignal))
  })

  it('Tribunal contextual de Tesis: abre sin INFORME_TRIB_TESIS y conserva el registro deshabilitado', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', missingEvidence: true })
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Dictamen del Tribunal' })
    expect(dialog).toBeVisible()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(window.location.hash).toBe('#resumen')
    const evidence = within(dialog).getByLabelText('Evidencia')
    expect(evidence).toHaveValue('')
    expect(evidence.options).toHaveLength(1)
    expect(within(dialog).getByRole('button', { name: 'Registrar' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it.each([{ incompleteTribunal: true }, { canManage: false }, { ambiguous: true }, { blocked: true }, { documentError: true }, { status: 'PENDIENTE' }, { modality: 'PROYECTO_GRADO' }, { modality: 'TRABAJO_DIRIGIDO' }])('Tribunal contextual de Tesis: conserva navegación segura %j', async (options) => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', ...options })
    const trigger = await screen.findByRole('link', { name: 'Ir a registrar dictamen' })
    await waitFor(() => expect(screen.queryByText('Cargando dictámenes…')).not.toBeInTheDocument())
    await userEvent.click(trigger)
    expect(window.location.hash).toBe('#dictamen-tribunal')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDictamenRevision).not.toHaveBeenCalled()
  })

  it('Tribunal contextual de Tesis: conserva apertura manual sin automatismo por hash', async () => {
    renderTutorDictamenContext({ type: 'TRIBUNAL', hash: 'dictamen-tribunal' })
    const trigger = await screen.findByRole('button', { name: 'Registrar dictamen' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  const projectStageResponse = (codigo, orientation = futureProfileOrientation) => {
    const stage = { id: 11, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const stages = [stage]
    if (codigo === 'REVISION_TRIBUNAL_PREVIA') stages.push({ id: 14, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: 1, activo: true })
    return { ...response, flujo: { ...response.flujo, etapa_actual: stage, etapas: stages, orientacion_etapa_actual: orientation } }
  }

  it('mantiene la información futura de Perfil dentro de una sección colapsada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('PERFIL_PROYECTO'))
    renderOwnerPage('resultado-y-cierre')

    const future = await screen.findByText('Información de etapas posteriores')
    expect(future.closest('details')).not.toHaveAttribute('open')
    expect(within(future.closest('details')).getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(within(future.closest('details')).getByText('Preparación para cierre')).toBeInTheDocument()
  })

  it('mantiene los documentos como recurso disponible en Documento Final', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('DOCUMENTO_FINAL'))
    renderPage('documentos')

    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(screen.getByText('Información de etapas posteriores')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).closest('details')).toBe(screen.getByText('Información de etapas posteriores').closest('details'))
  })

  it('muestra la revisión de tribunal cuando esa etapa es la actual', async () => {
    const reviewStage = { id: 14, codigo: 'REVISION_TRIBUNAL_PREVIA', nombre: 'Revisión de Tribunal Previa', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: reviewStage, etapas: [reviewStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderPage('resumen')

    expect(await screen.findByText('Orientación del expediente')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    const reviewHeading = await screen.findByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })
    expect(reviewHeading.closest('details')).toBeNull()
  })

  it.each(['DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'])('muestra defensas y resultado durante %s', async (codigo) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse(codigo))
    renderPage('defensas')

    expect(await screen.findByRole('heading', { name: 'Defensas' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).closest('details')).toBeNull()
  })

  it('muestra preparación de cierre y sus recursos durante Cierre Documental', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('CIERRE_DOCUMENTAL'))
    renderPage('resultado-y-cierre')

    const closure = await screen.findByRole('heading', { name: 'Cierre técnico' })
    expect(closure.closest('details')).toHaveAttribute('open')
    expect(screen.getByText('ACTA')).toBeInTheDocument()
    expect(screen.getByText('EJEMPLARES')).toBeInTheDocument()
    expect(screen.getByText('INFORME')).toBeInTheDocument()
  })

  it('orienta a cargar documentos de seguimiento pendientes desde el Resumen', async () => {
    const closureStage = {
      ...projectStageResponse('CIERRE_DOCUMENTAL'),
      cierre: {
        data: {
          ...closureResponse,
          etapa_actual: 'CIERRE_DOCUMENTAL',
          documentos_requeridos: ['DOCUMENTO_FINAL', 'ACTA_DEFENSA', 'HOJA_APROBACION', 'INFORME_FINAL_TUTOR'],
          documentos_aprobados: ['DOCUMENTO_FINAL', 'HOJA_APROBACION'],
          documentos_faltantes: ['ACTA_DEFENSA', 'INFORME_FINAL_TUTOR'],
          puede_aprobar_cierre: true,
        },
        error: '',
      },
      flujo: {
        ...projectStageResponse('CIERRE_DOCUMENTAL').flujo,
        etapa_actual: { ...projectStageResponse('CIERRE_DOCUMENTAL').flujo.etapa_actual, acciones_permitidas: ['aprobar'] },
        orientacion_etapa_actual: {
          mensaje: 'El cierre documental está listo para aprobación.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Cierre Documental', descripcion: 'Aprueba el cierre.', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(closureStage)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({
      documentos_aplicables: [
        { id: 4, codigo: 'ACTA_DEFENSA', nombre: 'Acta de Defensa', capacidad_carga: { permitida: true } },
        { id: 5, codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', capacidad_carga: { permitida: true } },
      ],
    })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_cierre', 'puede_cargar_documentos'].includes(name) }
    selectInitialTab('resumen')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByText('Cargar documentos', { selector: 'p' })).toBeInTheDocument()
    const summary = document.getElementById('panel-resumen')
    const actaRequirement = within(summary).getByText(/Acta de Defensa/i).closest('li')
    const tutorReportRequirement = within(summary).getByText(/Informe Final del Tutor/i).closest('li')
    expect(actaRequirement).toHaveTextContent('Pendiente')
    expect(tutorReportRequirement).toHaveTextContent('Pendiente')
    await userEvent.click(screen.getByRole('button', { name: 'Gestionar documentos' }))

    expect(window.location.hash).toBe('#documentos')
    const uploadDialog = await screen.findByRole('dialog')
    expect(uploadDialog).toHaveAccessibleName('Cargar documentos')
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(within(uploadDialog).getAllByRole('button', { name: 'Cerrar' })[0])
    expect(window.location.hash).toBe('#documentos')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
  })

  it('mantiene la aprobación administrativa como siguiente acción cuando no hay documentos de seguimiento pendientes', async () => {
    const closureStage = {
      ...projectStageResponse('CIERRE_DOCUMENTAL'),
      cierre: {
        data: {
          ...closureResponse,
          etapa_actual: 'CIERRE_DOCUMENTAL',
          documentos_requeridos: ['DOCUMENTO_FINAL', 'ACTA_DEFENSA', 'HOJA_APROBACION', 'INFORME_FINAL_TUTOR'],
          documentos_aprobados: ['DOCUMENTO_FINAL', 'ACTA_DEFENSA', 'HOJA_APROBACION', 'INFORME_FINAL_TUTOR'],
          documentos_faltantes: [],
          puede_aprobar_cierre: true,
        },
        error: '',
      },
      flujo: {
        ...projectStageResponse('CIERRE_DOCUMENTAL').flujo,
        etapa_actual: { ...projectStageResponse('CIERRE_DOCUMENTAL').flujo.etapa_actual, acciones_permitidas: ['aprobar'] },
        orientacion_etapa_actual: {
          mensaje: 'El cierre documental está listo para aprobación.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Cierre Documental', descripcion: 'Aprueba el cierre.', estado: 'DISPONIBLE', destino: '#resumen' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(closureStage)
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_cierre', 'puede_gestionar_postulaciones'].includes(name) }
    selectInitialTab('resumen')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByRole('button', { name: 'Aprobar Cierre Documental' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
    expect(screen.getByText(/Acta de Defensa/i).closest('li')).toHaveTextContent('Aprobado')
    expect(screen.getByText(/Informe Final del Tutor/i).closest('li')).toHaveTextContent('Aprobado')
  })

  it('restaura condiciones técnicas después del refresh por verificar condiciones seleccionadas', async () => {
    const refreshedExpediente = deferred()
    const pendingConditions = [
      { id: 101, nombre: 'Condición uno', estado: 'PENDIENTE', estado_display: 'Pendiente' },
      { id: 102, nombre: 'Condición dos', estado: 'PENDIENTE', estado_display: 'Pendiente' },
    ]
    const closureStage = projectStageResponse('CIERRE_DOCUMENTAL')
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(closureStage)
      .mockReturnValueOnce(refreshedExpediente.promise)
    postulacionesService.obtenerCondiciones
      .mockResolvedValueOnce({ results: pendingConditions })
      .mockResolvedValue({ results: pendingConditions.map((item) => ({ ...item, estado: 'CUMPLE', estado_display: 'Cumple' })) })
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    window.history.replaceState(window.history.state, '', window.location.pathname)
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Verificar seleccionadas (2)' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#condiciones-tecnicas')
    expect(scrollIntoView).not.toHaveBeenCalled()

    await act(async () => refreshedExpediente.resolve(closureStage))

    await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas' })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(window.location.hash).toBe('#condiciones-tecnicas')
  })

  it('restaura condiciones técnicas después del refresh por registrar entregas seleccionadas', async () => {
    const refreshedExpediente = deferred()
    const pendingDeliveries = [
      { id: 201, codigo: 'CD_RESPALDO', nombre: 'CD de respaldo', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 1, cantidad_recibida: 0 },
      { id: 202, codigo: 'EJEMPLARES_IMPRESOS', nombre: 'Ejemplares impresos', estado: 'PENDIENTE', estado_display: 'Pendiente', cantidad: 2, cantidad_recibida: 0 },
    ]
    const closureStage = projectStageResponse('CIERRE_DOCUMENTAL')
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(closureStage)
      .mockReturnValueOnce(refreshedExpediente.promise)
    postulacionesService.obtenerEntregas
      .mockResolvedValueOnce({ results: pendingDeliveries })
      .mockResolvedValue({ results: pendingDeliveries.map((item) => ({ ...item, estado: 'COMPLETA', estado_display: 'Completa', cantidad_recibida: item.cantidad })) })
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    window.history.replaceState(window.history.state, '', window.location.pathname)
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar pendientes (entregas)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar seleccionadas (2)' }))
    const form = screen.getByRole('form', { name: 'Registrar entregas seleccionadas (2)' })
    await userEvent.type(within(form).getByLabelText('Cantidad recibida: CD de respaldo'), '1')
    await userEvent.type(within(form).getByLabelText('Cantidad recibida: Ejemplares impresos'), '2')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar lotes' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#condiciones-tecnicas')
    expect(scrollIntoView).not.toHaveBeenCalled()

    await act(async () => refreshedExpediente.resolve(closureStage))

    await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas' })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(window.location.hash).toBe('#condiciones-tecnicas')
  })

  it('no restaura condiciones técnicas durante un refresh ajeno a esa sección', async () => {
    const closureStage = projectStageResponse('CIERRE_DOCUMENTAL')
    postulacionesService.obtenerExpediente
      .mockRejectedValueOnce({ message: 'No se pudo cargar temporalmente.' })
      .mockResolvedValueOnce(closureStage)
    const scrollIntoView = vi.fn()
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    renderClosureManagerPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    const technicalConditions = await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas', hidden: true })
    expect(technicalConditions).not.toBeVisible()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#documentos')
  })

  it('oculta Programar defensa mientras la orientación reporta precondiciones pendientes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('PERFIL_PROYECTO'))
    renderDefenseManagerPage('resumen')

    await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })
    expect(screen.queryByRole('button', { name: 'Programar defensa' })).not.toBeInTheDocument()
  })

  it('oculta Programar defensa cuando Proyecto no tiene orientación de programación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...projectStageResponse('DOCUMENTO_FINAL'),
      flujo: { ...projectStageResponse('DOCUMENTO_FINAL').flujo, orientacion_etapa_actual: null },
    })
    renderDefenseManagerPage()

    expect(screen.queryByRole('button', { name: 'Programar defensa' })).not.toBeInTheDocument()
  })

  it('oculta Programar defensa para Documento Final pendiente sin PROGRAMAR_EVENTO', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('DOCUMENTO_FINAL'))
    renderDefenseManagerPage()

    expect(screen.queryByRole('button', { name: 'Programar defensa' })).not.toBeInTheDocument()
  })

  const programmingStageResponse = (codigo, tipoEvento, numeroIntento = 1, evento = null) => {
    const stage = { id: 12, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: numeroIntento, activo: true }
    const orientation = {
      tipo_evento: tipoEvento,
      requisitos: [],
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
    }
    return {
      ...response,
      flujo: { ...response.flujo, etapa_actual: stage, etapas: [stage], orientacion_etapa_actual: orientation },
      defenses: evento ? { count: 1, next: null, previous: null, results: [evento] } : { count: 0, next: null, previous: null, results: [] },
    }
  }

  it('abre desde Siguiente acción el diálogo contextual existente de programación', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Ir a gestionar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Programar Defensa privada' })
    expect(within(dialog).getByText('DEFENSA_PRIVADA · Intento 1')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  const directedProfileProgrammingResponse = (attempt = 1) => {
    const data = programmingStageResponse('PERFIL_TRABAJO_DIRIGIDO', 'DEFENSA_PERFIL', attempt)
    const stage = { ...data.flujo.etapa_actual, id: 163, nombre: 'Perfil de Trabajo Dirigido' }
    return { ...data, detalle: { ...data.detalle, id: 54, codigo: 'TD-2026-03', modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: { ...data.flujo, modalidad: { codigo: 'TRABAJO_DIRIGIDO' }, etapa_actual: stage, etapas: [stage],
        orientacion_etapa_actual: { ...data.flujo.orientacion_etapa_actual,
          siguiente_accion: { ...data.flujo.orientacion_etapa_actual.siguiente_accion, titulo: 'Programar Defensa de Perfil', accion_label: 'Ir a programar defensa' } } } }
  }

  it.each(['resumen', 'defensas'])('Perfil TD: abre desde %s sin POST, evita duplicación y conserva Escape', async (origin) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedProfileProgrammingResponse())
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, results: [] })
    renderDefenseManagerPage(origin)
    const trigger = await screen.findByRole('button', { name: origin === 'resumen' ? 'Ir a programar defensa' : 'Programar Defensa de Perfil' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.dblClick(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa de Perfil' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(dialog).getByText('Perfil de Trabajo Dirigido · Intento 1')).toBeVisible()
    expect(dialog.querySelector('[name="tipo_evento"]')).toHaveValue('DEFENSA_PERFIL')
    expect(dialog.querySelector('[name="seguimiento_etapa"]')).toHaveValue('163')
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(window.location.hash).toBe(`#${origin}`)
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await userEvent.click(trigger)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it.each([1, 2])('Perfil TD: conserva el payload y el intento %s al confirmar explícitamente', async (attempt) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(directedProfileProgrammingResponse(attempt))
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.programarDefensa.mockRejectedValueOnce({ message: 'Validación backend de prueba' })
    renderDefenseManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Ir a programar defensa' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(`Perfil de Trabajo Dirigido · Intento ${attempt}`)).toBeVisible()
    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-11-20T15:00' } })
    await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala de prueba')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa de Perfil' }))
    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(54, {
      seguimiento_etapa: 163, tipo_evento: 'DEFENSA_PERFIL', fecha_programada: '2026-11-20T15:00',
      lugar: 'Sala de prueba', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: '',
    }, expect.any(AbortSignal)))
    expect(await within(dialog).findByText('Validación backend de prueba')).toBeVisible()
    expect(postulacionesService.programarDefensa).toHaveBeenCalledTimes(1)
  })

  it.each(['permiso', 'pendiente', 'existente', 'ambiguo', 'incompleto', 'inactivo'])('Perfil TD: mantiene fallback seguro con contexto %s', async (reason) => {
    const data = directedProfileProgrammingResponse()
    if (reason === 'pendiente') data.flujo.orientacion_etapa_actual.siguiente_accion.estado = 'PENDIENTE'
    if (reason === 'incompleto') delete data.flujo.orientacion_etapa_actual.tipo_evento
    if (reason === 'inactivo') data.flujo.etapa_actual.activo = false
    if (reason === 'ambiguo') data.flujo.etapas.push({ ...data.flujo.etapa_actual, id: 999 })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: reason === 'existente' ? 1 : 0, results: reason === 'existente' ? [{ id: 500, seguimiento_etapa: 163, tipo_evento: 'DEFENSA_PERFIL', numero_intento: 1, activo: true, estado: 'PROGRAMADA' }] : [] })
    if (reason === 'permiso') renderPage('resumen')
    else renderDefenseManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Ir a programar defensa' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a programar defensa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it('no abre la programación desde Resumen sin el permiso de gestión de defensas', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderPage('resumen')

    expect(await screen.findByRole('link', { name: 'Ir a gestionar' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Ir a gestionar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Programar Defensa privada' })).not.toBeInTheDocument()
  })

  it('abre el modal contextual desde PROGRAMAR_EVENTO de Tesis', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    data.detalle = { ...data.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } }
    data.flujo = {
      ...data.flujo,
      modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
      orientacion_etapa_actual: {
        ...data.flujo.orientacion_etapa_actual,
        siguiente_accion: { ...data.flujo.orientacion_etapa_actual.siguiente_accion, accion_label: 'Ir a programar defensa' },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Ir a programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa privada' })
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
  })

  it('muestra Programar defensa cuando no existe evento activo del contexto actual', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA')
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    expect(await screen.findByRole('button', { name: 'Programar Defensa privada' })).toBeInTheDocument()
  })

  it('muestra Defensa Pública cuando la anticipación mínima es informativa', async () => {
    const data = programmingStageResponse('DEFENSA_PUBLICA', 'DEFENSA_PUBLICA')
    data.flujo.orientacion_etapa_actual = {
      tipo_evento: 'DEFENSA_PUBLICA',
      requisitos: [
        { codigo: 'TRIBUNAL', cumplido: true, estado: 'CUMPLIDO' },
        { codigo: 'PRESIDENTE', cumplido: true, estado: 'CUMPLIDO' },
        { codigo: 'SECRETARIO', cumplido: true, estado: 'CUMPLIDO' },
        { codigo: 'ANTICIPACION_MINIMA', cumplido: null, estado: 'INFORMATIVO', valor: 48, unidad: 'horas' },
      ],
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
    }
    data.defenses = { count: 0, next: null, previous: null, results: [] }
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    expect(await screen.findByRole('button', { name: 'Programar Defensa pública' })).toBeInTheDocument()
  })

  it.each(['PROGRAMADA', 'EN_CURSO', 'SUSPENDIDA', 'FINALIZADA', 'CANCELADA'])('oculta Programar defensa cuando existe evento privado activo en estado %s', async (estado) => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 1, {
      id: 901, tipo_evento: 'DEFENSA_PRIVADA', seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 1, estado, activo: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    await screen.findByRole('heading', { name: 'Defensas' })
    expect(screen.queryByRole('button', { name: 'Programar Defensa privada' })).not.toBeInTheDocument()
  })

  it('no bloquea por un evento de otro tipo ni por un intento anterior', async () => {
    const data = programmingStageResponse('DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 2, {
      id: 902, tipo_evento: 'DEFENSA_PRIVADA', seguimiento_etapa: 11, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 1, estado: 'EN_CURSO', activo: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      ...data.defenses.results,
      { id: 903, tipo_evento: 'DEFENSA_PUBLICA', seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PRIVADA', numero_intento: 2, estado: 'EN_CURSO', activo: true },
    ]})
    renderDefenseManagerPage()

    expect(await screen.findByRole('button', { name: 'Programar Defensa privada' })).toBeInTheDocument()
  })

  it('aplica el mismo mecanismo cuando la orientación indica Defensa Pública', async () => {
    const data = programmingStageResponse('DEFENSA_PUBLICA', 'DEFENSA_PUBLICA', 1, {
      id: 904, tipo_evento: 'DEFENSA_PUBLICA', seguimiento_etapa: 12, etapa_codigo: 'DEFENSA_PUBLICA', numero_intento: 1, estado: 'PROGRAMADA', activo: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue(data)
    postulacionesService.obtenerDefensas.mockResolvedValue(data.defenses)
    renderDefenseManagerPage()

    await screen.findByRole('heading', { name: 'Defensas' })
    expect(screen.queryByRole('button', { name: 'Programar Defensa pública' })).not.toBeInTheDocument()
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
    renderPage('resultado-y-cierre')
    await screen.findByText('EXP-007')
    expect(screen.queryByRole('heading', { name: 'Cierre técnico' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Condiciones y entregas técnicas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Límites normativos' })).not.toBeInTheDocument()
  })

  it('muestra resultado de Tesis con nota pública sobre 100 y aporte ponderado del backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' }, orientacion_etapa_actual: { mensaje: 'Completa los actores de Tesis.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Actores de la postulación', descripcion: 'Completa las asignaciones de Tesis.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#actores', accion_label: 'Ir a actores' } } },
      resultado: { data: { nota_privada: '20.00', nota_publica: '80.00', aporte_publica: '56.00', nota_final: '76.00', clasificacion: 'APROBACION_PLENA', resultado: 'APROBACION_PLENA', limitacion_normativa: '' }, error: '' },
    })
    renderPage('resultado-y-cierre')
    await screen.findByText('EXP-007')
    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    expect(within(result).getAllByText('/ 100')).toHaveLength(2)
    expect(within(result).getByText('Aporte pública')).toBeInTheDocument()
    expect(within(result).getByText('56.00')).toBeInTheDocument()
    expect(within(result).getByText('/ 70')).toBeInTheDocument()
    expect(within(result).getByText('76.00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(screen.getByText('Completa las asignaciones de Tesis.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a actores' })).toHaveAttribute('href', '#actores')
  })

  it.each([false, true])('presenta la formalización pendiente de Examen con última etapa devuelta=%s aunque falle el resultado genérico', async (returnsLastStage) => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({
      id: 500 + index,
      codigo: index === 7 ? 'CONCLUSION_ACADEMICA' : `ETAPA_${index + 1}`,
      nombre: index === 7 ? 'Conclusión académica' : `Etapa ${index + 1}`,
      estado: 'APROBADA',
      activo: true,
    }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        codigo: 'EG-2026-02',
        modalidad_detalle: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' },
        estado_actual_detalle: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' },
        etapa_actual: returnsLastStage ? completedStages.at(-1) : null,
        porcentaje_avance: 100,
        etapas: completedStages,
        orientacion_etapa_actual: null,
      },
      resultado: { data: null, error: 'Resultado final todavía no disponible' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: false })
    postulacionesService.obtenerExamenGrado.mockResolvedValue({
      areas: [], tribunales: [],
      resultado_final: { completo: true, nota_final: '94.25', clasificacion: 'APROBACION_PLENA_CON_FELICITACION' },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Conclusión de la postulación pendiente' })).toBeInTheDocument()
    expect(screen.getByText('Calificación final: 94,25/100')).toBeInTheDocument()
    expect(screen.getByText(/el flujo académico terminó, pero la postulación continúa En proceso/i)).toBeInTheDocument()
    expect(screen.queryByText('No existe una etapa actual disponible.')).not.toBeInTheDocument()
    expect(screen.queryByText('Resultado final todavía no disponible')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a concluir académicamente' })).toHaveAttribute('href', '#examen')
    expect(postulacionesService.concluirExamenGrado).not.toHaveBeenCalled()
    expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    const result = screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement
    expect(within(result).getByText('94,25')).toBeInTheDocument()
    expect(within(result).getByText('/ 100')).toBeInTheDocument()
    expect(within(result).getByText('APROBACIÓN PLENA CON FELICITACIÓN')).toBeInTheDocument()
  })

  const academicExcellenceResponse = ({ conclusionState = 'APROBADA' } = {}) => {
    const stages = ['INSCRIPCION', 'REVISION_REQUISITOS', 'EVALUACION_TRIBUNAL', 'REGISTRO_ACTA', 'CONCLUSION_ACADEMICA'].map((codigo, index) => ({
      id: 700 + index,
      codigo,
      nombre: codigo === 'CONCLUSION_ACADEMICA' ? 'Conclusión académica' : `Etapa ${index + 1}`,
      estado: codigo === 'CONCLUSION_ACADEMICA' ? conclusionState : 'APROBADA',
      activo: true,
    }))
    return {
      ...response,
      detalle: {
        ...response.detalle,
        codigo: 'EA-2026-02',
        modalidad_detalle: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' },
        estado_actual_detalle: { id: 4, codigo: 'EN_PROCESO', nombre: 'En proceso' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 6, codigo: 'EXCELENCIA_ACADEMICA', nombre: 'Excelencia Académica' },
        etapa_actual: stages.at(-1),
        porcentaje_avance: conclusionState === 'APROBADA' ? 100 : 80,
        etapas: stages,
        orientacion_etapa_actual: null,
      },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
  }

  it('Excelencia muestra su resultado y formaliza únicamente mediante la acción explícita existente', async () => {
    let formalized = false
    postulacionesService.obtenerExpediente.mockImplementation(async () => {
      const value = academicExcellenceResponse()
      value.resultado = { data: null, error: '' }
      value.cierre = { data: null, error: '' }
      if (formalized) value.detalle.estado_actual_detalle = { codigo: 'CONCLUIDA', nombre: 'Concluida' }
      return value
    })
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'FAVORABLE', promedio_general: '100.00' }, criterios: [], documentos_requeridos: [],
    })
    postulacionesService.concluirExcelenciaAcademica.mockImplementation(async () => { formalized = true })
    renderApplicationManagerPage('resultado-y-cierre')
    const heading = await screen.findByRole('heading', { name: 'Resultado académico de Excelencia' })
    const panel = heading.closest('[role="tabpanel"]')
    expect(within(panel).getByText('FAVORABLE')).toBeVisible()
    expect(within(panel).getByText('100.00')).toBeVisible()
    expect(within(panel).getByText(/Falta formalizar/)).toBeVisible()
    expect(within(panel).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirExcelenciaAcademica).not.toHaveBeenCalled()
    await userEvent.click(within(panel).getByRole('button', { name: 'Concluir académicamente' }))
    await waitFor(() => expect(within(panel).getByText('La conclusión de la postulación está formalizada.')).toBeVisible())
    expect(postulacionesService.concluirExcelenciaAcademica).toHaveBeenCalledExactlyOnceWith(7)
    expect(within(panel).queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
    expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
  })

  it('presenta el cierre académico de Rendimiento con su promedio aunque el estado administrativo siga En proceso', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse())
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RENDIMIENTO_ACADEMICO',
      resultado: { estado: 'FAVORABLE', promedio_general: '90.00' },
      criterios: [], documentos_requeridos: [],
    })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    const summary = (await screen.findByRole('heading', { name: 'Resultado académico final' })).parentElement
    expect(within(summary).getByText('Conclusión académica')).toBeInTheDocument()
    expect(within(summary).getByText('Aprobada')).toBeInTheDocument()
    expect(within(summary).getByText('Resultado académico')).toBeInTheDocument()
    expect(within(summary).getByText(/Favorable/)).toBeInTheDocument()
    expect(within(summary).getByText('Promedio académico')).toBeInTheDocument()
    expect(within(summary).getByText('90.00')).toBeInTheDocument()
    expect(within(summary).getByText(/independientemente del estado administrativo general/i)).toBeInTheDocument()
    expect(screen.queryByText('No existe una etapa actual disponible.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nota final/)).not.toBeInTheDocument()
  })

  it('presenta el cierre de Reconocimiento a la calidad sin una calificación numérica', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse())
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RECONOCIMIENTO_CALIDAD',
      resultado: { estado: 'FAVORABLE', promedio_general: null },
      criterios: [], documentos_requeridos: [],
    })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    const summary = (await screen.findByRole('heading', { name: 'Resultado académico final' })).parentElement
    expect(within(summary).getByText(/Favorable/)).toBeInTheDocument()
    expect(within(summary).queryByText('Promedio académico')).not.toBeInTheDocument()
    expect(within(summary).queryByText(/Nota final/)).not.toBeInTheDocument()
  })

  it.each([
    ['la conclusión está pendiente', { conclusionState: 'PENDIENTE' }, { criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'FAVORABLE', promedio_general: '90.00' } }],
    ['el resultado está pendiente', {}, { criterio: 'RENDIMIENTO_ACADEMICO', resultado: { estado: 'PENDIENTE', promedio_general: null } }],
    ['el resultado está incompleto', {}, { criterio: 'RENDIMIENTO_ACADEMICO', resultado: null }],
  ])('no presenta un cierre académico exitoso cuando %s', async (_case, flowOptions, excellence) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse(flowOptions))
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ ...excellence, criterios: [], documentos_requeridos: [] })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Resultado académico final' })).not.toBeInTheDocument()
    expect(screen.queryByText('Promedio académico')).not.toBeInTheDocument()
  })

  it('presenta el resultado Desfavorable sin identificarlo como favorable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(academicExcellenceResponse())
    postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({
      criterio: 'RECONOCIMIENTO_CALIDAD',
      resultado: { estado: 'DESFAVORABLE', promedio_general: null },
      criterios: [], documentos_requeridos: [],
    })

    renderApplicationManagerPage()

    await waitFor(() => expect(postulacionesService.obtenerExcelenciaAcademica).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { name: 'Resultado académico final' })).toBeInTheDocument()
    expect(screen.getByText('Desfavorable')).toBeInTheDocument()
    expect(screen.queryByText('Favorable')).not.toBeInTheDocument()
  })

  it('no presenta una calificación definitiva de Examen cuando el resultado específico está incompleto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 5, codigo: 'EXAMEN_GRADO', nombre: 'Examen de Grado' } },
      resultado: { data: { nota_final: '99.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
    })
    postulacionesService.obtenerExamenGrado.mockResolvedValue({
      areas: [], tribunales: [],
      resultado_final: { completo: false, nota_final: null, clasificacion: null, areas: { AREA_1: '85.00', AREA_2: null } },
    })

    renderPage('resultado-y-cierre')

    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    expect(within(result).getByText('Pendiente')).toBeInTheDocument()
    expect(within(result).queryByText('99.00')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Conclusión de la postulación pendiente' })).not.toBeInTheDocument()
  })

  it('distingue nota bruta, aportes, ponderaciones y clasificación de Proyecto nuevo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      resultado: { data: {
        nota_privada: '85.00', aporte_privada: '25.50', semantica_privada: 'BRUTA_100',
        nota_publica: '95.00', aporte_publica: '66.50', semantica_publica: 'BRUTA_100',
        nota_final: '92.00', clasificacion: 'APROBACION_PLENA_CON_FELICITACION',
      }, error: '' },
    })
    renderPage('resultado-y-cierre')

    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    await within(result).findByText('Nota de Defensa Privada')
    expect(within(result).getByText('85,00')).toBeInTheDocument()
    expect(within(result).getAllByText('/ 100')).toHaveLength(3)
    expect(within(result).getByText('Aporte de Defensa Privada')).toBeInTheDocument()
    expect(within(result).getByText('Nota de Defensa Pública')).toBeInTheDocument()
    expect(within(result).getByText('Aporte de Defensa Pública')).toBeInTheDocument()
    expect(within(result).getByText('Nota Final')).toBeInTheDocument()
    expect(within(result).getAllByText('Calificación')).toHaveLength(2)
    expect(within(result).getByText('25,50')).toBeInTheDocument()
    expect(within(result).getByText('66,50')).toBeInTheDocument()
    expect(within(result).getAllByText('Ponderación 30%')).toHaveLength(1)
    expect(within(result).getAllByText('Ponderación 70%')).toHaveLength(1)
    expect(within(result).getByText('/ 30')).toBeInTheDocument()
    expect(within(result).getByText('/ 70')).toBeInTheDocument()
    expect(within(result).getByText('92,00')).toBeInTheDocument()
    expect(within(result).getByText('APROBACIÓN PLENA CON FELICITACIÓN')).toBeInTheDocument()
  })

  it('orienta a cargar el Acta cuando la Defensa Pública de Tesis ya está aprobada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPostPublicResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()

    expect(await screen.findByText('Cargar Acta de Defensa')).toBeInTheDocument()
    expect(screen.getByText(/debes cargar y vincular el Acta de Defensa vigente/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    expect(screen.queryByText('Aprobar etapa')).not.toBeInTheDocument()
    expect(screen.getByText('2 de 3 cumplidos')).toBeInTheDocument()
    expect(screen.getByText(/Resultado final aprobatorio/)).toHaveTextContent('77.00/100')
    expect(screen.getByText('Avance de tu proceso')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de tu proceso' })).toHaveValue(100)
  })

  it.each(['administración', 'estudiante'])('Acta contextual Tesis: abre sin navegar, preselecciona y guarda con %s', async (actor) => {
    const { event } = prepareContextualThesisActa()
    if (actor === 'estudiante') renderStudentPage()
    else renderDefenseDocumentsAdminPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    await userEvent.dblClick(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Cargar Acta de Defensa' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await waitFor(() => expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toHaveValue(String(event.id)))
    expect(within(dialog).getByLabelText('Tipo documental')).toHaveValue('5')
    expect(within(dialog).getByLabelText('Tipo documental')).toBeDisabled()
    expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    const pending = deferred()
    postulacionesService.cargarDocumento.mockReturnValueOnce(pending.promise)
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Cargar documento' }))
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1)
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(expect.objectContaining({ postulacionId: 7, tipoDocumentoId: 5, eventoDefensaId: 81 }), expect.any(AbortSignal))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(dialog).toBeInTheDocument()
    await act(async () => pending.resolve({ id: 991 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.obtenerExpediente.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(postulacionesService.obtenerDocumentos.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('Acta contextual Tesis: cancelar y Escape no cargan y restauran el foco', async () => {
    prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Cargar Acta de Defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await screen.findByRole('dialog', { name: 'Cargar Acta de Defensa' })
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it.each(['anterior', 'otra postulación', 'otro seguimiento', 'no finalizada', 'inactiva', 'ambiguo', 'sin intento', 'sin capacidad', 'consulta fallida', 'tipos fallidos'])('Acta contextual Tesis: rechaza contexto %s sin POST', async (scenario) => {
    const { fresh, event, applicable } = prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    const changed = { ...event }
    if (scenario === 'anterior') changed.numero_intento = 0
    if (scenario === 'otra postulación') changed.postulacion = 9
    if (scenario === 'otro seguimiento') changed.seguimiento_etapa = 77
    if (scenario === 'no finalizada') changed.estado = 'PROGRAMADA'
    if (scenario === 'inactiva') changed.activo = false
    postulacionesService.obtenerDefensas.mockResolvedValue({ results: scenario === 'ambiguo' ? [event, { ...event, id: 99 }] : [changed] })
    if (scenario === 'sin intento') postulacionesService.obtenerExpediente.mockResolvedValue({ ...fresh, flujo: { ...fresh.flujo, etapas: [{ ...fresh.flujo.etapa_actual, numero_intento: null }] } })
    if (scenario === 'sin capacidad') postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ ...applicable, documentos_aplicables: [{ ...applicable.documentos_aplicables[0], capacidad_carga: { permitida: false } }] })
    if (scenario === 'consulta fallida') postulacionesService.obtenerDefensas.mockRejectedValueOnce({ message: 'No se pudo consultar la defensa.' })
    if (scenario === 'tipos fallidos') postulacionesService.obtenerDocumentosAplicables.mockRejectedValueOnce({ message: 'No se pudieron consultar los tipos documentales.' })
    await userEvent.click(trigger)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a documentos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar Acta de Defensa' })).toBeEnabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Acta contextual Tesis: excluye eventos históricos y ajenos de todas las páginas', async () => {
    const { event } = prepareContextualThesisActa()
    postulacionesService.obtenerDefensas.mockImplementation((_id, page) => Promise.resolve(page === 1 ? { next: 'page2', results: [{ ...event, id: 99, postulacion: 9 }, { ...event, id: 98, numero_intento: 0 }] } : { next: null, results: [event] }))
    renderOwnerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar Acta de Defensa' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toHaveValue('81'))
    expect(within(within(dialog).getByLabelText('Defensa Pública finalizada')).getAllByRole('option')).toHaveLength(2)
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it.each(['ENV', 'APR', 'REC'])('Acta contextual Tesis: un Acta aparecida entretanto (%s) abre el detalle sin crear otra versión', async (state) => {
    prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    const acta = { id: 91, tipo_documento: 5, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: state, evento_defensa: 81, activo: true, versiones: [{ id: 911, activo: true, es_version_actual: true }] }
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, results: [acta] })
    await userEvent.click(trigger)
    expect(await screen.findByText(/El Acta ya está registrada/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Cargar Acta de Defensa' })).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Acta contextual Tesis: mantiene el error de carga y permite reintentar explícitamente', async () => {
    prepareContextualThesisActa()
    postulacionesService.cargarDocumento.mockRejectedValueOnce({ message: 'El archivo no pudo guardarse.' })
    renderOwnerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar Acta de Defensa' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Defensa Pública finalizada')).toHaveValue('81'))
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar documento' }))
    expect(await within(dialog).findByText('El archivo no pudo guardarse.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cargar documento' })).toBeEnabled()
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1)
  })

  it.each(['resumen', 'documentos'])('Acta contextual Tesis: no abre por hash %s', async (hash) => {
    prepareContextualThesisActa()
    renderOwnerPage(hash)
    await screen.findByRole('heading', { name: 'EXP-007' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('Acta contextual Tesis: vuelve a comprobar seguimiento e intento al montar el cargador', async () => {
    const { fresh } = prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(fresh).mockResolvedValue({ ...fresh, flujo: { ...fresh.flujo, etapas: [{ ...fresh.flujo.etapa_actual, id: 83, numero_intento: 2 }] } })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/El contexto de Defensa Pública cambió/)).toBeInTheDocument()
    await userEvent.upload(within(dialog).getByLabelText('Archivo'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('button', { name: 'Cargar documento' })).toBeDisabled()
  })

  it.each(['REC', 'corrección', 'vínculo incorrecto'])('Acta contextual Tesis: conserva detalle y versionado explícito ante %s', async (state) => {
    prepareContextualThesisActa()
    renderOwnerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Cargar Acta de Defensa' })
    const acta = { id: 91, tipo_documento: 5, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: state === 'REC' ? 'REC' : 'APR', requiere_correccion: state === 'corrección', evento_defensa: state === 'vínculo incorrecto' ? 99 : 81, activo: true, versiones: [{ id: 911, activo: true, es_version_actual: true }] }
    postulacionesService.obtenerDocumentos.mockResolvedValue({ results: [acta] })
    await userEvent.click(trigger)
    await screen.findByRole('dialog', { name: 'Detalle del documento' })
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
    if (state === 'vínculo incorrecto') {
      expect(screen.getByText(/Revisa su estado, vínculo y versiones/)).toBeInTheDocument()
      return
    }
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar nueva versión' }))
    const upload = await screen.findByRole('dialog', { name: 'Cargar nueva versión' })
    await waitFor(() => expect(within(upload).getByLabelText('Defensa Pública finalizada')).toHaveValue('81'))
    await userEvent.upload(within(upload).getByLabelText('Archivo'), new File(['corrección'], 'acta-v2.pdf', { type: 'application/pdf' }))
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(1))
    expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(expect.objectContaining({ tipoDocumentoId: 5, eventoDefensaId: '81' }), expect.any(AbortSignal))
  })

  it('Acta contextual Tesis: un estudiante sin permiso de carga recibe orientación informativa', async () => {
    prepareContextualThesisActa()
    renderStudentPage({ permissions: ['puede_ver_postulaciones', 'puede_ver_documentos'] })
    await screen.findByText('Acta de Defensa vigente vinculada')
    expect(screen.queryByRole('button', { name: 'Cargar Acta de Defensa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('orienta a completar un Acta existente que todavía no está aprobada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPostPublicResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [{
      id: 91, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: 'ENV', requiere_correccion: false, evento_defensa: 81, activo: true,
      versiones: [{ id: 911, activo: true, es_version_actual: true }],
    }] })
    renderPage()

    expect(await screen.findByText('Completar Acta de Defensa')).toBeInTheDocument()
    expect(screen.getByText(/todavía debe quedar vigente, aprobada y correctamente vinculada/i)).toBeInTheDocument()
    expect(screen.getByText('2 de 3 cumplidos')).toBeInTheDocument()
    expect(screen.queryByText('Aprobar etapa')).not.toBeInTheDocument()
  })

  it('orienta a concluir académicamente cuando el Acta vigente está aprobada y vinculada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPostPublicResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [{
      id: 91, tipo_documento_codigo: 'ACTA_DEFENSA', tipo_documento_nombre: 'Acta de Defensa', estado_codigo: 'APR', requiere_correccion: false, evento_defensa: 81, activo: true,
      versiones: [{ id: 911, activo: true, es_version_actual: true }],
    }] })
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{ ...defenseRows[0], seguimiento_etapa: 82 }],
    })
    renderPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).closest('section')
    expect(within(summary).getByText('Concluir académicamente')).toBeInTheDocument()
    expect(within(summary).getByText('3 de 3 cumplidos')).toBeInTheDocument()
    expect(within(summary).getByText('Disponible')).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Ir a concluir académicamente' })).toHaveAttribute('href', '#resumen')
    expect(within(summary).queryByText('Aprobar etapa')).not.toBeInTheDocument()
  })

  it('consume documentos aplicables de Tesis y deja accesibles revisiones y correcciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' }, etapa_actual: { codigo: 'REVISION_TRIBUNAL', nombre: 'Revisión de Tribunal' }, etapas: [
        { id: 21, codigo: 'REVISION_TUTOR', nombre: 'Revisión de Tutor', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
        { id: 22, codigo: 'REVISION_TRIBUNAL', nombre: 'Revisión de Tribunal', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
      ] },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 10, codigo: 'PERFIL_TESIS', nombre: 'Perfil de Tesis', capacidad_carga: { permitida: true } },
      { id: 11, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
      { id: 12, codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe del Tutor de Tesis', capacidad_carga: { permitida: true } },
      { id: 13, codigo: 'INFORME_TRIB_TESIS', nombre: 'Informe del Tribunal de Tesis', capacidad_carga: { permitida: true } },
    ] })
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Perfil de Tesis')).toBeInTheDocument()
    expect(screen.getByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe del Tutor de Tesis')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe del Tribunal de Tesis')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
    expect(screen.getAllByRole('heading', { name: 'Dictamen del Tutor' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: 'Dictamen del Tribunal' }).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('tab', { name: 'Defensas' }))
    expect(screen.getByRole('heading', { name: 'Correcciones posteriores a Defensa Privada' })).toBeInTheDocument()
  })

  it('reserva la Hoja de observaciones para la carga contextual de Defensa de Perfil', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 10, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
      { id: 11, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', nombre: 'Hoja de observaciones de Defensa de Perfil', capacidad_carga: { permitida: true } },
      { id: 12, codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', capacidad_carga: { permitida: true } },
    ] })
    renderDefenseDocumentsAdminPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe Final del Tutor')).toBeInTheDocument()
    expect(screen.queryByLabelText('Hoja de observaciones de Defensa de Perfil')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
  })

  it('mantiene expediente y advertencias ante errores parciales y permite reintentar', async () => {
    const partial = {
      ...response,
      resultado: { data: null, error: 'Resultado final todavía no disponible' },
      cierre: { data: null, error: 'Estado de cierre técnico todavía no disponible' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(partial).mockResolvedValueOnce(response)
    renderPage('resultado-y-cierre')
    expect(await screen.findByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('Resultado final todavía no disponible')).toBeInTheDocument()
    expect(screen.getByText('Estado de cierre técnico todavía no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Límites normativos' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    expect(await screen.findByText('84,00')).toBeInTheDocument()
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
    renderPage('historial')
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
    await userEvent.click(within(document.querySelector('#historial')).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('consulta y separa actores vigentes e históricos con etiquetas y advertencias contractuales', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage('actores')
    const card = (await screen.findByRole('heading', { name: 'Gestión de actores' })).parentElement
    expect(within(card).getByRole('heading', { name: 'Participación actual' })).toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Participaciones anteriores' })).toBeInTheDocument()
    for (const label of ['Tutor', 'Tribunal', 'Docente de modalidad', 'Presidente', 'Secretario']) expect(within(card).getAllByText(new RegExp(`^${label}(?: \\d+)?$`)).length).toBeGreaterThan(0)
    expect(within(card).getAllByText('Vigente')).toHaveLength(5)
    expect(within(card).getAllByText('Anterior').length).toBeGreaterThan(0)
    expect(within(card).getByText('Tutor Uno')).toBeInTheDocument()
    expect(within(card).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(within(card).getByText('Acompañamiento técnico')).toBeInTheDocument()
    expect(within(card).getAllByText('Sin etapa asociada').length).toBeGreaterThan(0)
    expect(within(card).getAllByText('Sin observaciones').length).toBeGreaterThan(0)
    expect(within(card).getAllByText('No registrada').length).toBeGreaterThan(0)
    expect(within(card).queryByLabelText('Advertencias sobre las asignaciones')).not.toBeInTheDocument()
    expect(within(card).queryByText(/no sustituye un memorando/i)).not.toBeInTheDocument()
    expect(within(card).queryByText(/participación finalizada/i)).not.toBeInTheDocument()
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', true, 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', false, 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerActores).toHaveBeenCalledTimes(2)
    expect(within(card).queryByRole('button', { name: /asignar|reemplazar|finalizar|designar/i })).not.toBeInTheDocument()
  })

  const thesisTribunalCandidates = [40, 41, 42].map((id) => ({ id, nombre_completo: `Docente ${id}`, elegible: true }))
  const openThesisTribunal = async ({ assigned = false, configure, candidates, modality = 'TESIS_GRADO', stageCode = 'TEMATICA_TESIS' } = {}) => {
    const { flow } = profileContracts({ proposalApproved: true })
    const stage = { ...flow.etapa_actual, codigo: stageCode, nombre: 'Temática de Tesis' }
    const positions = flow.gestion_actores.posiciones.map((position) => ({
      ...position,
      clave: position.tipo_participacion === 'TRIBUNAL' ? `TRIBUNAL_TEMATICA_TESIS_${position.orden_cargo}` : 'TUTOR_TESIS_1',
      restriccion_identidad: null,
    }))
    if (assigned) Object.assign(positions[0], {
      estado_ocupacion: 'ASIGNADA', asignacion_actual: 901,
      asignacion_actual_detalle: { id: 901, usuario: { id: 99, nombre: 'Docente guardado' } },
      acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'],
    })
    configure?.(positions)
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: modality, nombre: modality } },
      flujo: { ...flow, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage],
        orientacion_etapa_actual: null, gestion_decisiones_academicas: {},
        gestion_actores: { contexto: { codigo_etapa: stage.codigo }, posiciones: positions } },
    })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation(candidates || (() => Promise.resolve({ count: 3, results: thesisTribunalCandidates })))
    renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Temática de Tesis' })
    const selectors = [1, 2, 3].map((order) => within(dialog).getByLabelText(`${positions[order - 1].estado_ocupacion === 'ASIGNADA' ? 'Seleccionar reemplazo' : 'Seleccionar candidato'} para Tribunal ${order}`))
    await Promise.all(selectors.map((selector) => within(selector).findByRole('option', { name: /Docente 40/ })))
    return { dialog, selectors }
  }

  it('Tesis: bloquea los tres puestos cruzados, conserva etiquetas y libera cambios y limpieza', async () => {
    const { selectors } = await openThesisTribunal()
    for (const [index, selector] of selectors.entries()) {
      await userEvent.selectOptions(selector, String(40 + index))
      expect(within(selector).getByRole('option', { name: `Docente ${40 + index}` })).toBeEnabled()
      for (const other of selectors.filter((item) => item !== selector)) {
        const option = within(other).getByRole('option', { name: new RegExp(`Docente ${40 + index}.*Seleccionado como Tribunal ${index + 1}`) })
        expect(option).toBeDisabled()
        const previous = other.value
        await userEvent.selectOptions(other, String(40 + index))
        expect(other).toHaveValue(previous)
      }
    }
    await userEvent.selectOptions(selectors[0], '')
    expect(within(selectors[1]).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    await userEvent.selectOptions(selectors[1], '40')
    expect(within(selectors[0]).getByRole('option', { name: 'Docente 41' })).toBeEnabled()
    expect(within(selectors[2]).getByRole('option', { name: /Docente 40.*Tribunal 2/ })).toBeDisabled()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Tesis: rechaza localmente drafts duplicados incluso ante un cambio sintético', async () => {
    const { dialog, selectors } = await openThesisTribunal()
    await userEvent.selectOptions(selectors[0], '40')
    fireEvent.change(selectors[1], { target: { value: '40' } })
    expect(within(dialog).getByText(/La misma persona está seleccionada en Tribunal 1 y Tribunal 2/)).toBeInTheDocument()
    fireEvent.submit(selectors[0].closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('Tesis: mantiene independientes tutor y tribunales de otros contextos', async () => {
    const { dialog, selectors } = await openThesisTribunal({ configure: (positions) => {
      positions.push({ ...positions[2], clave: 'OTRO_TRIBUNAL', nombre: 'Otro tribunal', seguimiento_etapa: 999 })
      positions.push({ ...positions[2], clave: 'SIN_CONTEXTO', nombre: 'Tribunal sin contexto', seguimiento_etapa: null })
    } })
    await userEvent.selectOptions(selectors[0], '40')
    for (const name of ['Tutor', 'Otro tribunal', 'Tribunal sin contexto']) {
      const selector = within(dialog).getByLabelText(`Seleccionar candidato para ${name}`)
      expect(await within(selector).findByRole('option', { name: /Docente 40/ })).toBeEnabled()
      await userEvent.selectOptions(selector, '40')
    }
    expect(within(dialog).queryByText(/La misma persona está seleccionada/)).not.toBeInTheDocument()
    expect(within(selectors[1]).getByRole('option', { name: /Docente 40/ })).toBeDisabled()
  })

  it('Tesis: conserva asignación guardada, bloqueo de elegibilidad y reemplazo con payload compatible', async () => {
    postulacionesService.reemplazarActor.mockRejectedValueOnce({ message: 'El usuario ya tiene una asignación activa como TRIBUNAL en el mismo contexto.' })
    const { dialog, selectors } = await openThesisTribunal({ assigned: true, candidates: () => Promise.resolve({ count: 3, results: [
      ...thesisTribunalCandidates.slice(0, 2), { id: 42, nombre_completo: 'Docente 42', elegible: false },
    ] }) })
    expect(within(dialog).getByText('Docente guardado')).toBeInTheDocument()
    expect(within(selectors[1]).queryByRole('option', { name: 'Docente guardado' })).not.toBeInTheDocument()
    expect(within(selectors[1]).getByRole('option', { name: 'Docente 42' })).toBeDisabled()
    await userEvent.selectOptions(selectors[0], '40')
    expect(within(selectors[1]).getByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(901, {
      nuevo_usuario: 40, observaciones: '',
    }, expect.any(AbortSignal))
    expect(await within(dialog).findByText(/El usuario ya tiene una asignación activa/)).toBeInTheDocument()
  })

  it('Tesis: conserva bloqueo y selección propia al buscar y paginar sin consultar al cambiar drafts', async () => {
    const { dialog, selectors } = await openThesisTribunal({ candidates: (_id, filters) => Promise.resolve({
      count: filters.posicion === 'TRIBUNAL_TEMATICA_TESIS_2' ? 21 : 3,
      next: filters.posicion === 'TRIBUNAL_TEMATICA_TESIS_2' && filters.page === 1 ? '?page=2' : null,
      previous: filters.page === 2 ? '?page=1' : null,
      results: filters.search ? thesisTribunalCandidates.slice(1) : thesisTribunalCandidates,
    }) })
    const calls = postulacionesService.obtenerCandidatosElegibles.mock.calls.length
    await userEvent.selectOptions(selectors[0], '40')
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledTimes(calls)
    const secondSection = selectors[1].closest('section')
    const firstSection = selectors[0].closest('section')
    await userEvent.click(within(secondSection).getByRole('button', { name: 'Siguiente' }))
    expect(await within(secondSection).findByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato para Tribunal 1'), 'Docente 41')
    await userEvent.click(within(firstSection).getByRole('button', { name: 'Buscar' }))
    const own = await within(firstSection).findByRole('option', { name: 'Docente 40' })
    expect(own).toBeEnabled()
    expect(within(firstSection).getByLabelText('Seleccionar candidato para Tribunal 1')).toHaveValue('40')
  })

  it.each(['TESIS_GRADO', 'PROYECTO_GRADO', 'TRABAJO_DIRIGIDO'].flatMap((modality) => [1, 2, 3].map((order) => [modality, order])))('tribunal guardado %s: puesto %s bloquea los otros y rechaza un cambio sintético', async (modality, order) => {
    const { dialog, selectors } = await openThesisTribunal({ modality, stageCode: 'REVISION_TRIBUNAL', configure: (positions) => {
      Object.assign(positions[order - 1], {
        estado_ocupacion: 'ASIGNADA', asignacion_actual: 900 + order,
        asignacion_actual_detalle: { id: 900 + order, usuario: { id: 40, nombre: 'Docente 40' } },
        acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'],
      })
    } })
    const own = within(dialog).getByLabelText(`Seleccionar reemplazo para Tribunal ${order}`)
    expect(within(own).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    for (const other of selectors.filter((_, index) => index !== order - 1)) {
      expect(within(other).getByRole('option', { name: /Docente 40.*Seleccionado como Tribunal/ })).toBeDisabled()
      expect(within(other).getByRole('option', { name: 'Docente 41' })).toBeEnabled()
    }
    const other = selectors[order % 3]
    fireEvent.change(other, { target: { value: '40' } })
    fireEvent.submit(other.closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it('tribunal guardado: otros seguimientos y ocupaciones externas no bloquean candidatos', async () => {
    const { selectors } = await openThesisTribunal({ configure: (positions) => {
      Object.assign(positions[0], { seguimiento_etapa: 999, estado_ocupacion: 'ASIGNADA',
        asignacion_actual_detalle: { usuario: { id: 40 } }, acciones_permitidas: ['REEMPLAZAR'] })
    }, candidates: () => Promise.resolve({ count: 3, results: thesisTribunalCandidates.map((candidate) => ({
      ...candidate, asignaciones_vigentes: ['Tutor', 'Tribunal 1 de otro expediente'],
      asignaciones_vigentes_detalle: [{ usuario: candidate.id, postulacion: 999, seguimiento_etapa: 888, tipo_participacion: 'TRIBUNAL', activo: true }],
    })) }) })
    for (const selector of selectors) expect(within(selector).getByRole('option', { name: /Docente 40/ })).toBeEnabled()
  })

  const openDirectedTutor = async ({ assigned = true, own = false, candidates } = {}) => {
    const result = await openThesisTribunal({ modality: 'TRABAJO_DIRIGIDO', stageCode: 'PERFIL_TRABAJO_DIRIGIDO',
      candidates: candidates || (() => Promise.resolve({ count: 4, results: [...thesisTribunalCandidates, { id: 43, nombre_completo: 'Docente libre', elegible: true }] })),
      configure: (positions) => {
        positions[3].clave = 'TUTOR_TRABAJO_DIRIGIDO_1'
        if (assigned) positions.slice(0, 3).forEach((position, index) => Object.assign(position, {
          estado_ocupacion: 'ASIGNADA', asignacion_actual: 910 + index,
          asignacion_actual_detalle: { usuario: { id: 40 + index, nombre: `Docente ${40 + index}` } },
          acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'],
        }))
        if (own) Object.assign(positions[3], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 920,
          asignacion_actual_detalle: { usuario: { id: 40, nombre: 'Tutor actual' } }, acciones_permitidas: ['REEMPLAZAR', 'FINALIZAR'] })
      },
    })
    const tutor = within(result.dialog).getByLabelText(`${own ? 'Seleccionar reemplazo' : 'Seleccionar candidato'} para Tutor`)
    await within(tutor).findByRole('option', { name: /Docente 40/ })
    return { ...result, tutor }
  }

  it('Tutor TD: bloquea los tres tribunales guardados y evita enviar una selección forzada', async () => {
    const { tutor } = await openDirectedTutor()
    for (const id of [40, 41, 42]) expect(within(tutor).getByRole('option', { name: new RegExp(`Docente ${id}.*Tribunal ${id - 39}`) })).toBeDisabled()
    expect(within(tutor).getByRole('option', { name: 'Docente libre' })).toBeEnabled()
    fireEvent.change(tutor, { target: { value: '40' } })
    fireEvent.submit(tutor.closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it('Tutor TD: actualiza el bloqueo con cambios temporales y limpieza sin nuevas consultas', async () => {
    const { tutor, selectors } = await openDirectedTutor({ assigned: false })
    const calls = postulacionesService.obtenerCandidatosElegibles.mock.calls.length
    await userEvent.selectOptions(selectors[0], '40')
    expect(within(tutor).getByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.selectOptions(selectors[0], '41')
    expect(within(tutor).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    expect(within(tutor).getByRole('option', { name: /Docente 41.*Tribunal 1/ })).toBeDisabled()
    await userEvent.selectOptions(selectors[0], '')
    expect(within(tutor).getByRole('option', { name: 'Docente 41' })).toBeEnabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledTimes(calls)
  })

  it('Tutor TD: preserva al titular propio y no bloquea ocupaciones externas ni otros roles', async () => {
    const { tutor } = await openDirectedTutor({ own: true, candidates: () => Promise.resolve({ count: 4, results: [
      ...thesisTribunalCandidates, { id: 43, nombre_completo: 'Otro expediente y Docente de modalidad', elegible: true,
        asignaciones_vigentes: ['Tribunal 1', 'Docente de modalidad'],
        asignaciones_vigentes_detalle: [{ id: 999, usuario: 43, postulacion: 999, tipo_participacion: 'TRIBUNAL', activo: true }] },
    ] }) })
    expect(within(tutor).getByRole('option', { name: 'Docente 40' })).toBeEnabled()
    expect(within(tutor).getByRole('option', { name: /Otro expediente/ })).toBeEnabled()
    await userEvent.selectOptions(tutor, '40')
    expect(tutor).toHaveValue('40')
  })

  it('Tutor TD: conserva el bloqueo al buscar y paginar', async () => {
    const { tutor } = await openDirectedTutor({ candidates: () => Promise.resolve({ count: 21, next: '?page=2', results: thesisTribunalCandidates }) })
    const section = tutor.closest('section')
    await userEvent.type(within(section).getByRole('textbox'), 'Docente')
    await userEvent.click(within(section).getByRole('button', { name: 'Buscar' }))
    expect(await within(section).findByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    await userEvent.click(within(section).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(7,
      expect.objectContaining({ posicion: 'TUTOR_TRABAJO_DIRIGIDO_1', page: 2, search: 'Docente' }), expect.any(AbortSignal)))
    expect(await within(section).findByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
  })

  it('Tutor TD: rechaza duplicados temporales incluso si el Tutor se selecciona primero', async () => {
    const { tutor, selectors, dialog } = await openDirectedTutor({ assigned: false })
    await userEvent.selectOptions(tutor, '40')
    await userEvent.selectOptions(selectors[0], '40')
    expect(within(tutor).getByRole('option', { name: /Docente 40.*Tribunal 1/ })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/La misma persona/)
    fireEvent.submit(tutor.closest('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it.each([
    ['PROYECTO_GRADO', 'PERFIL_PROYECTO'], ['TESIS_GRADO', 'TEMATICA_TESIS'],
    ['TRABAJO_DIRIGIDO', 'DEFENSA_PRIVADA'],
  ])('Tutor TD: no extiende la prevención a %s en %s', async (modality, stageCode) => {
    const { dialog } = await openThesisTribunal({ modality, stageCode, configure: (positions) => {
      positions[3].clave = 'TUTOR_TRABAJO_DIRIGIDO_1'
      Object.assign(positions[0], { estado_ocupacion: 'ASIGNADA', asignacion_actual: 930,
        asignacion_actual_detalle: { usuario: { id: 40 } }, acciones_permitidas: ['REEMPLAZAR'] })
    } })
    const tutor = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    expect(await within(tutor).findByRole('option', { name: 'Docente 40' })).toBeEnabled()
  })

  const excellenceActorNames = ['Tribunal docente 1', 'Tribunal docente 2', 'Presidente', 'Secretario', 'Director del Instituto de Investigación']
  const excellenceActorResponse = ({ assigned = {}, modality = 'EXCELENCIA_ACADEMICA', stageCode = 'EVALUACION_TRIBUNAL', id = 7 } = {}) => {
    const stage = { id: 290, codigo: stageCode, nombre: 'Evaluación del tribunal', estado: 'EN_PROCESO', activo: true }
    const positions = excellenceActorNames.map((nombre, index) => ({
      clave: `EXCELENCIA_ACTOR_${index}`, nombre,
      tipo_participacion: ['TRIBUNAL', 'TRIBUNAL', 'PRESIDENTE', 'SECRETARIO', 'DIRECTOR_INSTITUTO_INVESTIGACION'][index],
      orden_cargo: index < 2 ? index + 1 : null, ambito: 'POSTULACION', seguimiento_etapa: null,
      obligatoriedad: true, habilitada: true,
      restriccion_identidad: index < 2 ? { grupo: 'TRIBUNAL_EXCELENCIA', unica_persona: true } : null,
      ocupacion_actor: index < 2 ? { aplica: true, relevantes: ['TRIBUNAL'] } : null,
      estado_ocupacion: assigned[index] ? 'ASIGNADA' : 'VACANTE',
      asignacion_actual: assigned[index] ? index + 700 : null,
      asignacion_actual_detalle: assigned[index] ? { id: index + 700, usuario: { id: assigned[index], nombre: 'Raúl' } } : null,
      acciones_permitidas: assigned[index] ? ['REEMPLAZAR', 'FINALIZAR'] : ['ASIGNAR'],
    }))
    return {
      ...response, detalle: { ...response.detalle, id, modalidad_detalle: { codigo: modality, nombre: 'Excelencia Académica' } },
      flujo: { ...response.flujo, modalidad: { codigo: modality }, etapa_actual: stage, etapas: [stage],
        gestion_actores: { contexto: { codigo_etapa: stageCode }, posiciones: positions }, gestion_decisiones_academicas: {}, orientacion_etapa_actual: null },
    }
  }
  const openExcellenceActors = async (options = {}) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(excellenceActorResponse(options))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, results: [
      { id: 41, nombre_completo: 'Raúl', elegible: true }, { id: 42, nombre_completo: 'Persona libre', elegible: true },
    ] })
    const rendered = renderAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
    await within(dialog).findAllByRole('option', { name: 'Persona libre' })
    return { dialog, ...rendered }
  }

  describe('Selección operativa de Excelencia', () => {
    const directions = [[0, 2], [1, 3], [2, 0], [3, 4], [4, 2], [2, 3]]
    it.each(directions)('bloquea selección pendiente de posición %s en %s y libera al cancelar la selección', async (from, to) => {
      const { dialog } = await openExcellenceActors()
      const source = within(dialog).getByLabelText(`Seleccionar candidato para ${excellenceActorNames[from]}`)
      const target = within(dialog).getByLabelText(`Seleccionar candidato para ${excellenceActorNames[to]}`)
      await userEvent.selectOptions(source, '41')
      const occupied = within(target).getByRole('option', { name: new RegExp(`Raúl.*Seleccionado como ${excellenceActorNames[from]}`) })
      expect(occupied).toBeDisabled()
      expect(within(target).getByRole('option', { name: 'Persona libre' })).toBeEnabled()
      await userEvent.selectOptions(source, '')
      expect(within(target).getByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it.each(directions)('bloquea asignación guardada de posición %s en %s aunque backend permita acumular', async (from, to) => {
      const { dialog } = await openExcellenceActors({ assigned: { [from]: 41 } })
      const target = within(dialog).getByLabelText(`Seleccionar candidato para ${excellenceActorNames[to]}`)
      expect(within(target).getByRole('option', { name: new RegExp(`Raúl.*Asignación vigente: ${excellenceActorNames[from]}`) })).toBeDisabled()
      expect(within(target).getByRole('option', { name: 'Persona libre' })).toBeEnabled()
      expect(within(dialog).getByLabelText(`Seleccionar reemplazo para ${excellenceActorNames[from]}`)).toBeEnabled()
    })

    it('conserva cargos acumulados, permite reemplazar y no exige corregir otros cargos', async () => {
      const { dialog } = await openExcellenceActors({ assigned: { 0: 41, 2: 41 } })
      expect(within(dialog).getAllByText('Raúl', { selector: 'strong' })).toHaveLength(2)
      const replacement = within(dialog).getByLabelText('Seleccionar reemplazo para Presidente')
      expect(within(replacement).getByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
      expect(within(replacement).getByRole('option', { name: 'Persona libre' })).toBeEnabled()
      await userEvent.selectOptions(replacement, '42')
      postulacionesService.reemplazarActor.mockResolvedValue({ id: 702 })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
      await waitFor(() => expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(702, { nuevo_usuario: 42, observaciones: '' }, expect.any(AbortSignal)))
      expect(postulacionesService.finalizarAsignacion).not.toHaveBeenCalled()
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it('cierra y reabre sin persistir ni conservar selecciones pendientes', async () => {
      const { dialog } = await openExcellenceActors()
      await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar candidato para Presidente'), '41')
      await userEvent.click(within(dialog).getByLabelText('Cerrar'))
      await userEvent.click(screen.getByRole('button', { name: 'Gestionar actores' }))
      const reopened = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
      const secretary = within(reopened).getByLabelText('Seleccionar candidato para Secretario')
      expect(await within(secretary).findByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(within(reopened).getByLabelText('Seleccionar candidato para Presidente')).toHaveValue('')
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it('permite finalizar un cargo acumulado sin finalizar los demás', async () => {
      const { dialog } = await openExcellenceActors({ assigned: { 0: 41, 2: 41 } })
      const president = within(dialog).getByRole('heading', { name: 'Presidente *' }).closest('section')
      await userEvent.click(within(president).getByRole('button', { name: 'Finalizar asignación' }))
      postulacionesService.finalizarAsignacion.mockResolvedValue({})
      await userEvent.click(within(president).getByRole('button', { name: 'Confirmar finalización' }))
      await waitFor(() => expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledWith(702, { observaciones: '' }, expect.any(AbortSignal)))
      expect(postulacionesService.finalizarAsignacion).toHaveBeenCalledTimes(1)
      expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    })

    it('descarta el diálogo y los bloqueos del expediente anterior al cambiar la ruta', async () => {
      postulacionesService.obtenerExpediente.mockImplementation(async (id) => excellenceActorResponse({ id: Number(id), assigned: id === '7' ? { 0: 41 } : {} }))
      postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, results: [{ id: 41, nombre_completo: 'Raúl', elegible: true }] })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_asignaciones' }
      selectInitialTab('actores')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar expediente de actores</Link></>} /></Routes></MemoryRouter></AuthContext.Provider>)
      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
      const first = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
      expect(await within(within(first).getByLabelText('Seleccionar candidato para Presidente')).findByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
      await userEvent.click(screen.getByRole('link', { name: 'Cambiar expediente de actores' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar actores' }))
      const next = screen.getByRole('dialog', { name: 'Gestionar actores — Evaluación del tribunal' })
      expect(await within(within(next).getByLabelText('Seleccionar candidato para Presidente')).findByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(8, expect.any(Object), expect.any(AbortSignal))
      expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    })

    it('conserva bloqueo, búsqueda y paginación sin depender de la lista paginada de actores', async () => {
      const { dialog } = await openExcellenceActors({ assigned: { 0: 41 } })
      postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 21, next: '?page=2', previous: null, results: [{ id: 41, nombre_completo: 'Raúl', elegible: true }] })
      const field = within(dialog).getByLabelText('Buscar candidato para Presidente')
      await userEvent.type(field, 'Raúl')
      const section = field.closest('section')
      await userEvent.click(within(section).getByRole('button', { name: 'Buscar', exact: true }))
      const selector = within(section).getByLabelText('Seleccionar candidato para Presidente')
      expect(await within(selector).findByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
      await userEvent.click(within(section).getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(7, expect.objectContaining({ posicion: 'EXCELENCIA_ACTOR_2', search: 'Raúl', page: 2 }), expect.any(AbortSignal)))
      expect(await within(selector).findByRole('option', { name: /Raúl.*Tribunal docente 1/ })).toBeDisabled()
    })

    it.each(['TESIS_GRADO', 'EXAMEN_GRADO', 'TRABAJO_DIRIGIDO', 'GRADUACION_VIA_DIPLOMADO'])('no añade bloqueo a %s', async (modality) => {
      const { dialog } = await openExcellenceActors({ modality, assigned: { 0: 41 } })
      const president = within(dialog).getByLabelText('Seleccionar candidato para Presidente')
      expect(within(president).getByRole('option', { name: 'Raúl' })).toBeEnabled()
      await userEvent.selectOptions(president, '41')
      expect(within(within(dialog).getByLabelText('Seleccionar candidato para Secretario')).getByRole('option', { name: /Raúl.*Seleccionado como Presidente/ })).toBeEnabled()
    })

    it('no aplica fuera de Evaluación del tribunal y aísla postulaciones al navegar', async () => {
      const first = await openExcellenceActors({ assigned: { 0: 41 } })
      expect(within(within(first.dialog).getByLabelText('Seleccionar candidato para Presidente')).getByRole('option', { name: /Raúl/ })).toBeDisabled()
      first.unmount()
      const second = await openExcellenceActors({ id: 8 })
      expect(within(within(second.dialog).getByLabelText('Seleccionar candidato para Presidente')).getByRole('option', { name: 'Raúl' })).toBeEnabled()
      expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(8, expect.any(Object), expect.any(AbortSignal))
      second.unmount()
      const otherStage = await openExcellenceActors({ stageCode: 'REVISION_REQUISITOS', assigned: { 0: 41 } })
      expect(within(within(otherStage.dialog).getByLabelText('Seleccionar candidato para Presidente')).getByRole('option', { name: 'Raúl' })).toBeEnabled()
    })
  })

  it('Gestionar actores consulta candidatos elegibles por posición y busca independientemente', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation((_postulacion, filters) => Promise.resolve({
      count: 21,
      next: filters.page === 1 ? '?page=2' : null,
      previous: filters.page > 1 ? '?page=1' : null,
      results: [
        { id: 40, username: 'Admin', nombre_completo: 'Yesenia Sandoval', rol_nombre: 'Administrador' },
        { id: 41, username: 'Johnny', nombre_completo: 'Johnny Rosas', rol_nombre: 'Docente' },
        { id: 42, username: 'willian', codigo: 'RU-0042', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente', elegible: false, motivo_bloqueo: 'YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION', asignaciones_vigentes: ['Tutor', 'Tribunal 1'] },
      ],
    }))
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    expect(await within(selector).findByRole('option', { name: /Johnny Rosas.*Docente/ })).toBeInTheDocument()
    expect(within(selector).getByRole('option', { name: /Willian Vargas.*Docente.*RU-0042.*Asignación vigente: Tutor, Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    expect(within(dialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    const tutorSelector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    expect(tutorSelector).toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TUTOR_PROYECTO_1', accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    await userEvent.type(within(dialog).getByLabelText('Buscar candidato para Tribunal 1'), 'Rosas')
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Buscar' })[0])
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenLastCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'ASIGNAR', search: 'Rosas', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    ))
    expect(within(selector).getByRole('option', { name: /Willian Vargas.*RU-0042.*Asignación vigente: Tutor, Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1' && filters.search === 'Rosas'
    ))).toBe(false)

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Siguiente' })[0])
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'ASIGNAR', search: 'Rosas', ordering: 'apellido_paterno', page: 2, page_size: 20 },
      expect.any(AbortSignal),
    ))
    expect(within(selector).getByRole('option', { name: /Willian Vargas.*RU-0042.*Asignación vigente: Tutor, Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1' && filters.page === 2
    ))).toBe(false)
  })

  it('bloquea drafts del mismo grupo inmediatamente antes de guardar', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 3, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
      { id: 41, username: 'carlos', nombre_completo: 'Carlos Rojas', rol_nombre: 'Docente' },
      { id: 42, username: 'otro', nombre_completo: 'Otro Candidato', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    const third = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 3')
    await Promise.all([first, second, third].map((selector) => within(selector).findByRole('option', { name: /Willian Vargas/ })))

    await userEvent.selectOptions(first, '40')
    expect(within(second).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await userEvent.selectOptions(second, '41')
    expect(within(third).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    expect(within(third).getByRole('option', { name: /Carlos Rojas.*Seleccionado como Tribunal 2/ })).toBeDisabled()
    expect(within(third).getByRole('option', { name: /Otro Candidato/ })).toBeEnabled()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('libera y reasigna candidatos al cambiar o limpiar un draft', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
      { id: 41, username: 'carlos', nombre_completo: 'Carlos Rojas', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await within(second).findByRole('option', { name: /Willian Vargas/ })

    await userEvent.selectOptions(first, '40')
    expect(within(second).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await userEvent.selectOptions(first, '41')
    const releasedWillian = within(second).getByRole('option', { name: /Willian Vargas/ })
    expect(releasedWillian).toBeEnabled()
    expect(releasedWillian).not.toHaveAccessibleName(/Seleccionado como/)
    expect(within(second).getByRole('option', { name: /Carlos Rojas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await userEvent.selectOptions(first, '')
    const clearedWillian = within(second).getByRole('option', { name: /Willian Vargas/ })
    const clearedCarlos = within(second).getByRole('option', { name: /Carlos Rojas/ })
    expect(clearedWillian).toBeEnabled()
    expect(clearedCarlos).toBeEnabled()
    expect(clearedWillian).not.toHaveAccessibleName(/Seleccionado como/)
    expect(clearedCarlos).not.toHaveAccessibleName(/Seleccionado como/)
  })

  it('bloquea el mismo tribunal aunque falte el grupo de identidad o sea diferente', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    contracts.flow.gestion_actores.posiciones[1].restriccion_identidad = null
    contracts.flow.gestion_actores.posiciones[2].restriccion_identidad = { grupo: 'OTRO_GRUPO', unica_persona: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    const third = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 3')
    await Promise.all([first, second, third].map((selector) => within(selector).findByRole('option', { name: /Willian Vargas/ })))
    expect(within(second).getByRole('option', { name: /Willian Vargas/ })).not.toHaveAccessibleName(/Seleccionado como/)

    await userEvent.selectOptions(first, '40')
    expect(within(second).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    expect(within(third).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
  })

  it('mantiene bloqueos en búsquedas y páginas posteriores', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockImplementation((_postulacion, filters) => {
      const willian = { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' }
      const other = { id: 42, username: 'otro', nombre_completo: 'Otro Candidato', rol_nombre: 'Docente' }
      if (filters.posicion === 'TRIBUNAL_PERFIL_1') {
        return Promise.resolve({ count: 1, next: null, previous: null, results: [willian] })
      }
      if (filters.posicion === 'TRIBUNAL_PERFIL_2' && filters.search === 'Willian') {
        return Promise.resolve({ count: 1, next: null, previous: null, results: [willian] })
      }
      if (filters.posicion === 'TRIBUNAL_PERFIL_2' && filters.page === 2) {
        return Promise.resolve({ count: 21, next: null, previous: '?page=1', results: [willian] })
      }
      if (filters.posicion === 'TRIBUNAL_PERFIL_2') {
        return Promise.resolve({ count: 21, next: '?page=2', previous: null, results: [other] })
      }
      return Promise.resolve({ count: 1, next: null, previous: null, results: [other] })
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await within(first).findByRole('option', { name: /Willian Vargas/ })
    await within(second).findByRole('option', { name: /Otro Candidato/ })
    await userEvent.selectOptions(first, '40')
    expect(within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')).toHaveValue('40')

    let currentSecond = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    let secondSection = currentSecond.closest('section')
    await userEvent.click(within(secondSection).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_2', accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 2, page_size: 20 },
      expect.any(AbortSignal),
    ))
    await waitFor(() => {
      currentSecond = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
      expect(within(currentSecond).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    })
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()

    secondSection = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2').closest('section')
    await userEvent.type(within(secondSection).getByLabelText('Buscar candidato para Tribunal 2'), 'Willian')
    await userEvent.click(within(secondSection).getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_2', accion: 'ASIGNAR', search: 'Willian', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    ))
    await waitFor(() => {
      const currentSecond = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
      expect(within(currentSecond).getByRole('option', { name: /Willian Vargas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    })
  })

  it('aplica el bloqueo temporal también a candidatos elegidos como reemplazo', async () => {
    const contracts = profileContracts({
      assignedTribunals: [{ id: 51, name: 'Tribunal Vigente', order: 1 }],
      proposalApproved: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 99, username: 'replacement', nombre_completo: 'Candidata Reemplazo', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const replacement = within(dialog).getByLabelText('Seleccionar reemplazo para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await Promise.all([replacement, second].map((selector) => within(selector).findByRole('option', { name: /Candidata Reemplazo/ })))

    await userEvent.selectOptions(replacement, '99')
    expect(within(second).getByRole('option', { name: /Candidata Reemplazo.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
  })

  it.each([
    ['Tribunal 1', 'Tutor'],
    ['Tutor', 'Tribunal 1'],
  ])('ocupacion_actor bloquea %s → %s y valida antes de guardar', async (source, target) => {
    const contracts = profileContracts({ proposalApproved: true })
    contracts.flow.gestion_actores.posiciones.forEach((position) => {
      position.ocupacion_actor = { aplica: true, ambito: 'POSTULACION', relevantes: ['TUTOR', 'TRIBUNAL'] }
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, nombre_completo: 'Docente Ocupado', elegible: true },
      { id: 41, nombre_completo: 'Docente Libre', elegible: true },
    ] })
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const sourceSelector = within(dialog).getByLabelText(`Seleccionar candidato para ${source}`)
    const targetSelector = within(dialog).getByLabelText(`Seleccionar candidato para ${target}`)
    await Promise.all([sourceSelector, targetSelector].map((selector) => within(selector).findByRole('option', { name: 'Docente Ocupado' })))
    await userEvent.selectOptions(sourceSelector, '40')
    expect(within(targetSelector).getByRole('option', { name: `Docente Ocupado — Seleccionado como ${source}` })).toBeDisabled()
    expect(within(targetSelector).getByRole('option', { name: 'Docente Libre' })).toBeEnabled()
    if (source === 'Tutor') {
      for (const order of [2, 3]) {
        const selector = within(dialog).getByLabelText(`Seleccionar candidato para Tribunal ${order}`)
        expect(within(selector).getByRole('option', { name: 'Docente Ocupado — Seleccionado como Tutor' })).toBeDisabled()
      }
    }
    fireEvent.change(targetSelector, { target: { value: '40' } })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/seleccionada en Tribunal 1 y Tutor/i)
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    await userEvent.selectOptions(targetSelector, '41')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
    await userEvent.selectOptions(sourceSelector, '')
    expect(within(targetSelector).getByRole('option', { name: 'Docente Ocupado' })).toBeEnabled()
  })

  it.each([
    ['TESIS_GRADO', undefined],
    ['TRABAJO_DIRIGIDO', undefined],
    ['PROYECTO_GRADO', { aplica: false, relevantes: ['TUTOR', 'TRIBUNAL'] }],
    ['PROYECTO_GRADO', { aplica: true, relevantes: ['PRESIDENTE'] }],
  ])('conserva selecciones entre grupos sin ocupación aplicable en %s (%j)', async (code, rule) => {
    const contracts = profileContracts({ proposalApproved: true })
    contracts.flow.modalidad = { codigo: code }
    contracts.flow.gestion_actores.posiciones.forEach((position) => { position.ocupacion_actor = rule })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, modalidad_detalle: { codigo: code }, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, results: [{ id: 40, nombre_completo: 'Docente Disponible' }] })
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const tribunal = screen.getByLabelText('Seleccionar candidato para Tribunal 1')
    const tutor = screen.getByLabelText('Seleccionar candidato para Tutor')
    await Promise.all([tribunal, tutor].map((selector) => within(selector).findByRole('option', { name: 'Docente Disponible' })))
    await userEvent.selectOptions(tribunal, '40')
    expect(within(tutor).getByRole('option', { name: /Docente Disponible.*Seleccionado como Tribunal 1/ })).toBeEnabled()
    await userEvent.selectOptions(tutor, '40')
    expect(within(tribunal).getByRole('option', { name: /Docente Disponible.*Seleccionado como Tutor/ })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar asignaciones' })).toBeEnabled()
  })

  it('rechaza drafts conflictivos localmente antes de crear solicitudes', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 40, username: 'willian', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const first = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    const second = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await Promise.all([first, second].map((selector) => within(selector).findByRole('option', { name: /Willian Vargas/ })))
    await userEvent.selectOptions(first, '40')
    fireEvent.change(second, { target: { value: '40' } })

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/seleccionada en Tribunal 1 y Tribunal 2/i)
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('permite asignar otro tipo al candidato que participa en una etapa distinta', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockResolvedValue({ count: 4, next: null, previous: null, results: [
      { id: 101, usuario: 40, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 102, usuario: 42, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      { id: 103, usuario: 43, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true },
      { id: 104, usuario: 44, tipo_participacion: 'DOCENTE_MODALIDAD', orden_cargo: null, activo: true },
    ]})
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 4, next: null, previous: null, results: [
      { id: 40, username: 'raul', nombre_completo: 'Raúl Marcelo Calderon Fuertes', codigo: '562879', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
      { id: 42, username: 'mirna', nombre_completo: 'Mirna Fernández Rojas', codigo: '494080', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
      { id: 43, username: 'carlos', nombre_completo: 'Carlos Méndez Suárez', codigo: '494062', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
      { id: 45, username: 'nuevo', nombre_completo: 'Docente Nuevo', codigo: 'DOC-045', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ]})
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const tutorSelector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    expect(within(tutorSelector).getByRole('option', { name: /Raúl Marcelo Calderon Fuertes.*Docente/ })).toBeEnabled()
    expect(within(tutorSelector).getByRole('option', { name: /Docente Nuevo/ })).toBeEnabled()
  })

  it('bloquea posiciones del contrato sin acción ASIGNAR aunque haya candidatos', async () => {
    const contracts = profileContracts()
    contracts.flow.gestion_actores.posiciones = contracts.flow.gestion_actores.posiciones.map((position) => (
      position.tipo_participacion === 'TUTOR'
        ? { ...position, habilitada: false, acciones_permitidas: [], bloqueo: { codigo: 'PRECONDICION', mensaje: 'Posición bloqueada por la policy.' } }
        : position
    ))
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 44, username: 'docente', nombre_completo: 'Docente Vigente', codigo: 'DOC-044', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ]})
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const tutorPosition = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    expect(within(tutorPosition).getByText('Posición bloqueada por la policy.')).toBeInTheDocument()
    expect(within(tutorPosition).queryByRole('combobox')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1'
    ))).toBe(false)
  })

  it('regresa a Resumen al guardar el docente de modalidad de Defensa Privada', async () => {
    const privateStage = { id: 23, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', activo: true }
    const tutor = {
      clave: 'TUTOR_PROYECTO_1', tipo_participacion: 'TUTOR', nombre: 'Tutor', orden_cargo: null,
      obligatoriedad: true, habilitada: true, estado_ocupacion: 'ASIGNADA', ambito: 'POSTULACION',
      seguimiento_etapa: null, asignacion_actual: 90,
      asignacion_actual_detalle: { id: 90, usuario: { id: 190, nombre: 'María Tutora' }, tipo_participacion: 'TUTOR', ambito: 'POSTULACION', seguimiento_etapa: null },
      acciones_permitidas: [], bloqueo: null, precondicion: null,
    }
    const position = {
      clave: 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1', tipo_participacion: 'DOCENTE_MODALIDAD',
      nombre: 'Docente de modalidad', orden_cargo: null, obligatoriedad: true, habilitada: true,
      estado_ocupacion: 'VACANTE', ambito: 'ETAPA', seguimiento_etapa: privateStage.id,
      asignacion_actual: null, asignacion_actual_detalle: null, acciones_permitidas: ['ASIGNAR'],
      bloqueo: null, precondicion: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: privateStage,
        etapas: [privateStage],
        gestion_actores: {
          contexto: { tipo: 'ETAPA', seguimiento_etapa: privateStage.id, codigo_etapa: privateStage.codigo },
          posiciones: [tutor, position],
        },
        gestion_decisiones_academicas: { contexto: null, decisiones: [] },
      },
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })
    const tutorSection = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    expect(tutorSection).toHaveTextContent(/Asignada a\s+María Tutora/)
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Docente de modalidad')
    await within(selector).findByRole('option', { name: /Johnny Rosas/ })
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: position.clave, accion: 'ASIGNAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    await userEvent.selectOptions(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41,
      tipo_participacion: 'DOCENTE_MODALIDAD',
      observaciones: '',
      seguimiento_etapa: privateStage.id,
    }, expect.any(AbortSignal)))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' })[1])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Defensa Privada' })).not.toBeInTheDocument())
    expect(window.location.hash).toBe('#resumen')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-resumen')).toBeVisible()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Resumen' })))
  })

  it('muestra el valor vigente, el mínimo requerido y el estado del requisito', async () => {
    const privateStage = { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      mensaje: 'Verifica las asignaciones antes de programar.',
      requisitos: [
        { tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 3, minimo: 2, cumplido: true, estado_display: '3/2 cumplido' },
        { tipo: 'ACTOR', codigo: 'DOCENTE_MODALIDAD', nombre: 'Docente de modalidad', actual: 0, minimo: 1, cumplido: false, estado_display: '0/1 pendiente' },
      ],
      siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Actores de la postulación', estado: 'PENDIENTE', destino: '#actores' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: orientation } })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('3 vigentes')).toBeInTheDocument()
    expect(within(summary).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(summary).getByText('Requisito cumplido')).toBeInTheDocument()
    expect(within(summary).getByText('0 vigentes')).toBeInTheDocument()
    expect(within(summary).getByText('Mínimo requerido: 1')).toBeInTheDocument()
    expect(within(summary).getByText('Pendiente')).toBeInTheDocument()
  })

  it.each([false, true])('Inscripción de Trabajo Dirigido muestra cuatro obligaciones con documentos aprobados %s', async (approved) => {
    const documents = [
      ['CARTA_SOLICITUD_TD', 'Carta de solicitud de Trabajo Dirigido'],
      ['MATRICULA_VIGENTE_TD', 'Matrícula vigente de Trabajo Dirigido'],
      ['HISTORIAL_PRERREQ_TD', 'Historial de prerrequisitos'],
    ]
    const folderName = 'Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida'
    const requirements = [
      ...documents.map(([codigo, nombre]) => ({ tipo: 'DOCUMENTO', codigo, nombre, cumplido: approved, estado: approved ? 'CUMPLIDO' : 'PENDIENTE', estado_display: approved ? 'Aprobado' : 'No presentado', destino: '#documentos' })),
      { tipo: 'ENTREGA_FISICA', codigo: 'FOLDER_AMARILLO', nombre: folderName, cumplido: true, estado: 'CUMPLIDO', estado_display: 'Recepción registrada', destino: '#inscripcion-entregas' },
    ]
    const stage = { id: 162, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'EN_PROCESO', activo: true, numero_intento: 1, acciones_permitidas: approved ? ['aprobar'] : [] }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: { ...response.flujo, modalidad: { codigo: 'TRABAJO_DIRIGIDO' }, etapa_actual: stage, etapas: [stage], porcentaje_avance: 0, etapas_completadas: 0,
        orientacion_etapa_actual: { requisitos: requirements, requisitos_cumplidos: approved ? 4 : 1, requisitos_totales: 4, permite_aprobar_etapa: approved,
          siguiente_accion: { codigo: approved ? 'APROBAR_ETAPA' : 'COMPLETAR_DOCUMENTOS', titulo: approved ? 'Aprobar Inscripción' : 'Completar documentos de Inscripción', estado: approved ? 'DISPONIBLE' : 'PENDIENTE', destino: approved ? '#resumen' : '#documentos' } },
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: documents.map(([codigo, nombre], index) => ({ id: 49 + index, codigo, nombre, capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } })) })
    renderApplicationUploadManagerPage('resumen')
    const section = (await screen.findByRole('heading', { name: 'Requisitos de esta etapa' })).parentElement
    expect(within(section).getAllByRole('listitem')).toHaveLength(4)
    expect(within(section).getByText(`${approved ? 4 : 1} de 4 cumplidos`)).toBeVisible()
    expect(within(section).getAllByText(folderName, { exact: false })).toHaveLength(1)
    expect(within(section).getByText('Recepción registrada')).toBeVisible()
    expect(within(section).queryByText('Fólder amarillo', { exact: true })).not.toBeInTheDocument()
    if (approved) expect(screen.getByRole('button', { name: 'Aprobar Inscripción' })).toBeEnabled()
    else {
      expect(screen.queryByRole('button', { name: /Aprobar Inscripción/ })).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Gestionar documentos' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      for (const [, name] of documents) expect(within(dialog).getByLabelText(name)).toBeVisible()
      expect(within(dialog).queryByText(/Fólder/)).not.toBeInTheDocument()
    }
  })

  it('separa el checklist documental no bloqueante en la orientación de Trabajo Dirigido', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoPublicDefenseResponse())
    renderAssignmentManagerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Completar autoridades' })).toBeInTheDocument()
    expect(within(summary).getByRole('heading', { name: 'Checklist documental' })).toBeInTheDocument()
    expect(within(summary).getByText(/no bloquean la siguiente acción académica/)).toBeInTheDocument()
    expect(within(summary).getByText('0 de 9 documentos aprobados')).toBeInTheDocument()
    expect(within(summary).getAllByText(/Presidente/).length).toBeGreaterThan(1)
    expect(within(summary).getAllByText(/Secretario/).length).toBeGreaterThan(1)
    expect(within(summary).queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    await userEvent.click(within(summary).getByRole('button', { name: 'Completar autoridades' }))
    const dialog = await screen.findByRole('dialog', { name: 'Completar autoridades' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Presidente'), '40')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(2))
    expect(postulacionesService.asignarActor).toHaveBeenNthCalledWith(1, 7, {
      usuario: 40,
      tipo_participacion: 'PRESIDENTE',
      seguimiento_etapa: 13,
    }, expect.any(AbortSignal))
    expect(postulacionesService.asignarActor).toHaveBeenNthCalledWith(2, 7, {
      usuario: 41,
      tipo_participacion: 'SECRETARIO',
      seguimiento_etapa: 13,
    }, expect.any(AbortSignal))
  })

  it('muestra a estudiantes la orientación y el checklist sin ofrecer acciones administrativas', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoPublicDefenseResponse())
    renderStudentPage({ permissions: ['puede_ver_postulaciones', 'puede_ver_documentos'] })

    expect(await screen.findByText('Completar autoridades')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Checklist documental' })).toBeInTheDocument()
    expect(screen.getByText(/no bloquean la siguiente acción académica/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
  })

  it('mantiene el acceso documental separado cuando el estudiante tiene permiso de carga', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoPublicDefenseResponse())
    renderStudentPage()

    const documentLink = await screen.findByRole('link', { name: 'Gestionar documentos' })
    expect(documentLink).toHaveAttribute('href', '/documentos')
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
  })

  it('solicita únicamente la autoridad pendiente y muestra el cargo ya asignado', async () => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: true, estado_display: 'Cumplido' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores' },
        },
      },
    })
    postulacionesService.obtenerActores.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 71, usuario: 40, usuario_nombre: 'Presidente actual', tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 13, activo: true },
    ] })
    postulacionesService.obtenerCandidatosAsignacion.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, nombre_completo: 'Presidente actual', rol_codigo: 'DOCENTE' },
      { id: 41, nombre_completo: 'Secretario nuevo', rol_codigo: 'DOCENTE' },
    ] })
    renderAssignmentManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    expect(within(dialog).getByText('✓ Asignado')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Seleccionar persona para Presidente')).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1))
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 13,
    }, expect.any(AbortSignal))
  })

  it.each(['PROYECTO_GRADO', 'TRABAJO_DIRIGIDO'])('Completar autoridades conserva etiquetas y delimita el bloqueo operativo en %s', async (code) => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const candidates = [
      { id: 40, nombre_completo: 'Raúl Marcelo Calderon Fuertes', rol_nombre: 'Docente' },
      { id: 41, nombre_completo: 'Mirna Fernández Rojas', rol_nombre: 'Docente' },
      { id: 42, nombre_completo: 'Carlos Méndez Suárez', rol_nombre: 'Docente' },
      { id: 43, nombre_completo: 'Willian Chau Rivero', rol_nombre: 'Docente' },
      { id: 44, nombre_completo: 'Docente Modalidad', rol_nombre: 'Docente' },
      { id: 45, nombre_completo: 'Daniel Molina Cordova', rol_nombre: 'Docente' },
      { id: 46, nombre_completo: 'Presidenta vigente', rol_nombre: 'Docente' },
      { id: 47, nombre_completo: 'Secretario vigente', rol_nombre: 'Docente' },
      { id: 48, nombre_completo: 'Persona de otra postulación', rol_nombre: 'Docente', asignaciones_vigentes: ['Tutor'] },
    ]
    const activeAssignments = [
      { id: 70, usuario: 40, usuario_nombre: candidates[0].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
      { id: 71, usuario: 41, usuario_nombre: candidates[1].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
      { id: 72, usuario: 42, usuario_nombre: candidates[2].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, seguimiento_etapa: 11, activo: true },
      { id: 73, usuario: 43, usuario_nombre: candidates[3].nombre_completo, tipo_participacion: 'TUTOR', activo: true },
      { id: 74, usuario: 44, usuario_nombre: candidates[4].nombre_completo, tipo_participacion: 'DOCENTE_MODALIDAD', activo: true },
      { id: 75, usuario: 46, usuario_nombre: candidates[6].nombre_completo, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 12, activo: true },
      { id: 76, usuario: 47, usuario_nombre: candidates[7].nombre_completo, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 12, activo: true },
      { id: 77, usuario: 45, tipo_participacion: 'TUTOR', activo: false },
    ]
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: code, nombre: code } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: code, nombre: code },
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: false, estado_display: 'Pendiente' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores', capacidades: { modal: 'PUBLIC_AUTHORITIES' } },
        },
      },
    })
    postulacionesService.obtenerActores.mockResolvedValue({ count: activeAssignments.length, next: null, previous: null, results: activeAssignments })
    postulacionesService.obtenerCandidatosAsignacion.mockImplementation(({ search }) => Promise.resolve({
      count: candidates.filter((candidate) => candidate.nombre_completo.includes(search || '')).length,
      next: null,
      previous: null,
      results: candidates.filter((candidate) => candidate.nombre_completo.includes(search || '')),
    }))
    renderAssignmentManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    const selectors = await within(dialog).findAllByRole('combobox')
    for (const [name, assignment] of [
      ['Raúl Marcelo Calderon Fuertes', 'Tribunal 1'],
      ['Mirna Fernández Rojas', 'Tribunal 2'],
      ['Carlos Méndez Suárez', 'Tribunal 3'],
      ['Willian Chau Rivero', 'Tutor'],
      ['Docente Modalidad', 'Docente de modalidad'],
      ['Presidenta vigente', 'Presidente'],
      ['Secretario vigente', 'Secretario'],
    ]) {
      for (const selector of selectors) expect(within(selector).getByRole('option', { name: new RegExp(`${name}.*Asignación vigente: ${assignment}`) })).toBeInTheDocument()
    }
    for (const selector of selectors) {
      expect(within(selector).getByRole('option', { name: /Raúl Marcelo Calderon Fuertes.*Asignación vigente: Tribunal 1/ })).toBeDisabled()
      expect(within(selector).getByRole('option', { name: /Mirna Fernández Rojas.*Asignación vigente: Tribunal 2/ })).toBeDisabled()
      expect(within(selector).getByRole('option', { name: /Carlos Méndez Suárez.*Asignación vigente: Tribunal 3/ })).toBeDisabled()
      for (const name of [/Willian Chau Rivero.*Asignación vigente: Tutor/, /Docente Modalidad.*Asignación vigente: Docente de modalidad/]) {
        const option = within(selector).getByRole('option', { name })
        if (code === 'PROYECTO_GRADO') expect(option).toBeDisabled()
        else expect(option).toBeEnabled()
      }
      expect(within(selector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeEnabled()
      expect(within(selector).getByRole('option', { name: 'Persona de otra postulación — Docente' })).toBeEnabled()
      expect(within(selector).getByRole('option', { name: /Presidenta vigente.*Asignación vigente: Presidente/ })).toBeDisabled()
      expect(within(selector).getByRole('option', { name: /Secretario vigente.*Asignación vigente: Secretario/ })).toBeDisabled()
    }

    await userEvent.type(within(dialog).getByLabelText('Buscar persona'), 'Mirna')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    const filteredSecretary = within(dialog).getAllByRole('combobox')[1]
    expect(await within(filteredSecretary).findByRole('option', { name: /Mirna Fernández Rojas.*Asignación vigente: Tribunal 2/ })).toBeDisabled()

    await userEvent.clear(within(dialog).getByLabelText('Buscar persona'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    const presidentSelector = within(dialog).getByLabelText('Seleccionar persona para Presidente')
    const secretarySelector = within(dialog).getByLabelText('Seleccionar persona para Secretario')
    await within(presidentSelector).findByRole('option', { name: 'Daniel Molina Cordova — Docente' })
    await userEvent.selectOptions(presidentSelector, '45')
    expect(within(secretarySelector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeDisabled()
    await userEvent.selectOptions(presidentSelector, '')
    await userEvent.selectOptions(secretarySelector, '45')
    expect(within(presidentSelector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeDisabled()
    expect(postulacionesService.obtenerActores).toHaveBeenCalledWith(7, true, 1, expect.any(AbortSignal))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it.each(['PROYECTO_GRADO', 'TESIS_GRADO'])('refresca autoridades tras respuesta incierta y evita reenviar un cargo ya asignado en %s', async (code) => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    let serverActors = []
    let secretaryApplied = false
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: code, nombre: code } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: code },
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: false, estado_display: 'Pendiente' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores', capacidades: { modal: 'PUBLIC_AUTHORITIES' } },
        },
      },
    })
    postulacionesService.obtenerActores.mockImplementation(() => Promise.resolve({ count: serverActors.length, next: null, previous: null, results: serverActors }))
    postulacionesService.obtenerCandidatosAsignacion.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 40, nombre_completo: 'Presidenta', rol_codigo: 'DOCENTE' },
      { id: 41, nombre_completo: 'Secretario', rol_codigo: 'DOCENTE' },
    ] })
    postulacionesService.asignarActor.mockImplementation(async (_id, payload) => {
      serverActors = [...serverActors, {
        id: payload.tipo_participacion === 'PRESIDENTE' ? 71 : 72,
        usuario: payload.usuario,
        usuario_nombre: payload.tipo_participacion === 'PRESIDENTE' ? 'Presidenta' : 'Secretario',
        tipo_participacion: payload.tipo_participacion,
        seguimiento_etapa: 13,
        activo: true,
      }]
      if (payload.tipo_participacion === 'SECRETARIO' && !secretaryApplied) {
        secretaryApplied = true
        throw { message: 'Se perdió la respuesta de la asignación.' }
      }
      return { id: payload.tipo_participacion === 'PRESIDENTE' ? 71 : 72 }
    })
    renderAssignmentManagerPage('resumen')

    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Presidente'), '40')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))

    expect(await within(dialog).findByText(/Se perdió la respuesta de la asignación/)).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getAllByText('✓ Asignado')).toHaveLength(2))
    expect(postulacionesService.obtenerActores.mock.calls.length).toBeGreaterThanOrEqual(4)
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(2)
    expect(within(dialog).getByRole('button', { name: 'Reintentar pendientes' })).toBeDisabled()
  })

  it.each(['PRESIDENTE', 'SECRETARIO'])('autoridades Tesis: conserva %s de otro seguimiento y guarda solo el cargo pendiente', async (existingRole) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    const existing = { id: 90, usuario: 40, usuario_nombre: 'Autoridad vigente', tipo_participacion: existingRole, seguimiento_etapa: 19, activo: true }
    postulacionesService.obtenerActores.mockImplementation((_id, active, page = 1) => Promise.resolve({ count: active ? 1 : 0, next: active && page === 1 ? 'next' : null, results: active && page === 2 ? [existing] : [] }))
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    expect(await within(dialog).findByText('Autoridad vigente')).toBeInTheDocument()
    const pendingRole = existingRole === 'PRESIDENTE' ? 'Secretario' : 'Presidente'
    expect(within(dialog).queryByLabelText(`Seleccionar persona para ${existingRole === 'PRESIDENTE' ? 'Presidente' : 'Secretario'}`)).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText(`Seleccionar persona para ${pendingRole}`), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, { usuario: 41, tipo_participacion: pendingRole.toUpperCase(), seguimiento_etapa: 82 }, expect.any(AbortSignal))
    expect(postulacionesService.reemplazarActor).not.toHaveBeenCalled()
    expect(postulacionesService.finalizarAsignacion).not.toHaveBeenCalled()
  })

  it('autoridades Tesis: espera verificación tras respuesta incierta antes de permitir un reintento', async () => {
    const verification = deferred()
    let uncertain = false
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse({ president: 1 }))
    postulacionesService.obtenerActores.mockImplementation(() => uncertain ? verification.promise : Promise.resolve({ count: 0, results: [] }))
    postulacionesService.asignarActor.mockImplementation(async () => { uncertain = true; throw { message: 'Respuesta incierta' } })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(await within(dialog).findByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    expect(await within(dialog).findByText('Verificando autoridades asignadas…')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar autoridades' })).toBeDisabled()
    fireEvent.submit(dialog.querySelector('form'))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await act(async () => verification.resolve({ count: 1, results: [{ id: 92, usuario: 41, usuario_nombre: 'Secretario confirmado', tipo_participacion: 'SECRETARIO', seguimiento_etapa: 82, activo: true }] }))
    expect(await within(dialog).findByText('Secretario confirmado')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar autoridades' })).toBeDisabled()
    expect(within(dialog).queryByLabelText('Seleccionar persona para Secretario')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
  })

  it('autoridades Tesis: mantiene compatibilidades de asignación y etiquetas sin copiar exclusiones de Proyecto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    const actors = ['TRIBUNAL', 'TUTOR', 'DOCENTE_MODALIDAD'].map((role, index) => ({ id: index + 10, usuario: 41, tipo_participacion: role, orden_cargo: role === 'TRIBUNAL' ? 1 : null, seguimiento_etapa: 19, activo: true }))
    postulacionesService.obtenerActores.mockResolvedValue({ count: actors.length, results: actors })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog')
    const president = await within(dialog).findByLabelText('Seleccionar persona para Presidente')
    const secretary = within(dialog).getByLabelText('Seleccionar persona para Secretario')
    expect(within(president).getByRole('option', { name: /Johnny Rosas.*Asignación vigente: Tribunal 1, Tutor, Docente de modalidad/ })).toBeEnabled()
    await userEvent.selectOptions(president, '41')
    expect(within(secretary).getByRole('option', { name: /Johnny Rosas/ })).toBeEnabled()
    await userEvent.selectOptions(secretary, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(2))
    expect(postulacionesService.asignarActor.mock.calls.map((call) => call[1])).toEqual([
      { usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82 },
      { usuario: 41, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 82 },
    ])
  })

  it.each(['TESIS_GRADO', 'PROYECTO_GRADO'])('autoridades conserva selecciones en páginas distintas y bloquea todos los cierres durante envío en %s', async (code) => {
    const initial = thesisPublicAuthoritiesResponse()
    initial.detalle.modalidad_detalle.codigo = code
    initial.flujo.modalidad.codigo = code
    postulacionesService.obtenerExpediente.mockResolvedValue(initial)
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, results: [] })
    postulacionesService.obtenerCandidatosAsignacion.mockImplementation(({ page }) => Promise.resolve({ count: 21, next: page === 1 ? 'next' : null, previous: page === 2 ? 'prev' : null, results: page === 1 ? [{ id: 41, nombre_completo: 'Persona Primera', rol_nombre: 'Docente' }] : [{ id: 42, nombre_completo: 'Persona Segunda', rol_nombre: 'Docente' }] }))
    const pending = deferred()
    postulacionesService.asignarActor.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ id: 102 })
    renderAssignmentManagerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Completar autoridades' })
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    const president = await within(dialog).findByLabelText('Seleccionar persona para Presidente')
    await userEvent.selectOptions(president, '41')
    await userEvent.type(within(dialog).getByLabelText('Buscar persona'), 'Persona')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(postulacionesService.obtenerCandidatosAsignacion).toHaveBeenCalledWith(expect.objectContaining({ search: 'Persona', page: 1 }), expect.any(AbortSignal)))
    await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente/ }))
    const secretary = await within(dialog).findByLabelText('Seleccionar persona para Secretario')
    await userEvent.selectOptions(secretary, '42')
    expect(within(dialog).getByLabelText('Seleccionar persona para Presidente')).toHaveValue('41')
    const save = within(dialog).getByRole('button', { name: 'Guardar autoridades' })
    await userEvent.dblClick(save)
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(dialog).toBeInTheDocument()
    expect(postulacionesService.asignarActor.mock.calls[0][2].aborted).toBe(false)
    await act(async () => pending.resolve({ id: 101 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.asignarActor.mock.calls.map((call) => call[1])).toEqual([
      { usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82 },
      { usuario: 42, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 82 },
    ])
  })

  it('abre autoridades de Tesis con requisitos individuales y cancelar no envía asignaciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    renderAssignmentManagerPage('resumen')
    const trigger = await screen.findByRole('button', { name: 'Completar autoridades' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const requirements = screen.getByRole('heading', { name: 'Requisitos de esta etapa' }).closest('section')
    expect(within(requirements).getByText(/Tribunales/)).toBeInTheDocument()
    expect(within(requirements).getByText('3 vigentes')).toBeInTheDocument()
    expect(within(requirements).getByText('Mínimo requerido: 3')).toBeInTheDocument()
    expect(within(requirements).getAllByText('0 vigentes')).toHaveLength(2)
    expect(within(requirements).getByText(/1 de 3/)).toBeInTheDocument()
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    for (const role of ['Presidente', 'Secretario']) expect(await within(dialog).findByLabelText(`Seleccionar persona para ${role}`)).toBeInTheDocument()
    expect(within(dialog).queryByRole('option', { name: 'Tribunal' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('recalcula autoridades estructuradas de Tesis al guardar y conserva el bloqueo de doble envío', async () => {
    const pending = deferred()
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(thesisPublicAuthoritiesResponse())
      .mockResolvedValue(thesisPublicAuthoritiesResponse({ president: 1 }))
    postulacionesService.asignarActor.mockReturnValueOnce(pending.promise).mockRejectedValueOnce({ message: 'Secretario pendiente' })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await within(dialog).findByLabelText('Seleccionar persona para Presidente')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Presidente'), '41')
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    const submit = within(dialog).getByRole('button', { name: 'Guardar autoridades' })
    await userEvent.dblClick(submit)
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, expect.objectContaining({ usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82 }), expect.any(AbortSignal))
    await act(async () => pending.resolve({ id: 100 }))
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText(/Secretario pendiente/)).toBeInTheDocument())
    const refreshedDialog = screen.getByRole('dialog')
    expect(await within(refreshedDialog).findByText('✓ Asignado')).toBeInTheDocument()
    expect(within(refreshedDialog).queryByLabelText('Seleccionar persona para Presidente')).not.toBeInTheDocument()
    expect(within(refreshedDialog).getByLabelText('Seleccionar persona para Secretario')).toHaveValue('41')
    await userEvent.click(within(refreshedDialog).getByRole('button', { name: 'Reintentar pendientes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(postulacionesService.asignarActor.mock.calls.map((call) => call[1].tipo_participacion)).toEqual(['PRESIDENTE', 'SECRETARIO', 'SECRETARIO'])
  })

  it('muestra autoridades de Tesis como información sin permiso de asignaciones', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    renderPage('resumen')
    expect(await screen.findByText('Actores de la postulación')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('transita de autoridades de Tesis a la programación pública existente tras completar el último cargo', async () => {
    const ready = thesisPublicAuthoritiesResponse({ president: 1, secretary: 1, action: {
      codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Pública', descripcion: 'Programa la defensa correspondiente a esta etapa.',
      estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa', requiere_permiso: undefined,
    } })
    ready.flujo.orientacion_etapa_actual.tipo_evento = 'DEFENSA_PUBLICA'
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(thesisPublicAuthoritiesResponse({ president: 1 })).mockResolvedValue(ready)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, results: [] })
    selectInitialTab('resumen')
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_asignaciones', 'puede_gestionar_defensas'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    const program = await screen.findByRole('button', { name: 'Ir a programar defensa' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(program)
    const programming = screen.getByRole('dialog')
    expect(within(programming).getByText(/Intento 1/)).toBeInTheDocument()
    expect(within(programming).getByLabelText('Fecha y hora programada')).toBeInTheDocument()
    expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
  })

  it.each(['ambiguo', 'ausente', 'incompatible'])('conserva navegación segura de Tesis ante seguimiento público %s', async (context) => {
    const base = thesisPublicAuthoritiesResponse()
    if (context === 'ambiguo') base.flujo.etapas.push({ ...base.flujo.etapa_actual, id: 83, numero_intento: 2 })
    if (context === 'ausente') base.flujo.etapa_actual = { ...base.flujo.etapa_actual, id: null }
    if (context === 'incompatible') base.flujo.etapas = [{ ...base.flujo.etapa_actual, id: 83, numero_intento: 2 }]
    postulacionesService.obtenerExpediente.mockResolvedValue(base)
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Completar autoridades' })).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['actores', 'resumen'])('no abre autoridades de Tesis automáticamente por hash %s', async (hash) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    renderAssignmentManagerPage(hash)
    await screen.findByRole('heading', { name: 'EXP-007' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('conserva el error backend de asignación contextual de Tesis y permite reintentar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse({ president: 1 }))
    postulacionesService.asignarActor.mockRejectedValueOnce({ message: 'La asignación ya cambió; actualiza el expediente.' })
    renderAssignmentManagerPage('resumen')
    await userEvent.click(await screen.findByRole('button', { name: 'Completar autoridades' }))
    const dialog = screen.getByRole('dialog', { name: 'Completar autoridades' })
    await within(dialog).findByLabelText('Seleccionar persona para Secretario')
    expect(within(dialog).queryByLabelText('Seleccionar persona para Presidente')).not.toBeInTheDocument()
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Seleccionar persona para Secretario'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar autoridades' }))
    expect(await within(dialog).findByText(/La asignación ya cambió; actualiza el expediente/)).toBeInTheDocument()
    await within(dialog).findByLabelText('Seleccionar persona para Secretario')
    expect(within(dialog).getByRole('button', { name: 'Guardar autoridades' })).toBeEnabled()
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
  })

  it.each(['#documentos', '#defensas'])('no convierte bloqueos de Tesis en asignación de autoridades: %s', async (destino) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse({ action: {
      titulo: 'Completar precondiciones de defensa', descripcion: 'Completa la habilitación pendiente.', destino, accion_label: 'Consultar bloqueo', requiere_permiso: undefined,
    } }))
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Consultar bloqueo' })).toHaveAttribute('href', destino)
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByText('Para programar la Defensa Pública faltan:')).not.toBeInTheDocument()
  })

  it('no abre autoridades de Tesis ante defensa pública existente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(thesisPublicAuthoritiesResponse())
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, results: [{ id: 98, tipo_evento: 'DEFENSA_PUBLICA', seguimiento_etapa: 82, numero_intento: 1, estado: 'PROGRAMADA', activo: true }] })
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Completar autoridades' })).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
  })

  it('guía la asignación de autoridades faltantes de Defensa Pública de Tesis y recalcula el siguiente rol', async () => {
    const publicStage = { id: 82, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const thesisResponse = (description) => ({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        etapa_actual: publicStage,
        etapas: [...response.flujo.etapas.filter((stage) => stage.codigo !== 'DEFENSA_PUBLICA'), publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las precondiciones y gestiona la Defensa Pública.',
          requisitos: [{ tipo: 'OPERATIVO', codigo: 'PRECONDICIONES_DEFENSA', nombre: 'Precondiciones de defensa', cumplido: false, estado_display: 'Pendiente', destino: '#actores' }],
          siguiente_accion: { codigo: 'GESTIONAR_PRECONDICIONES', titulo: 'Completar precondiciones de defensa', descripcion: description, estado: 'PENDIENTE', destino: '#actores', accion_label: 'Ir a precondiciones' },
        },
      },
    })
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(thesisResponse("La Defensa Pública de Tesis requiere: {'PRESIDENTE': 1, 'SECRETARIO': 1}."))
      .mockResolvedValue(thesisResponse("La Defensa Pública de Tesis requiere: {'SECRETARIO': 1}."))
    renderAssignmentManagerPage('resumen')

    expect(await screen.findByText('Para programar la Defensa Pública faltan:')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Ir a precondiciones' }))
    const dialog = screen.getByRole('dialog', { name: 'Asignar actor' })
    expect(within(dialog).getByRole('option', { name: 'Presidente' })).toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'Secretario' })).toBeInTheDocument()
    for (const excluded of ['Tribunal', 'Tutor', 'Docente de modalidad']) expect(within(dialog).queryByRole('option', { name: excluded })).not.toBeInTheDocument()

    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo de participación'), 'PRESIDENTE')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, expect.objectContaining({
      usuario: 41, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 82,
    }), expect.any(AbortSignal))
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(within(dialog).queryByRole('option', { name: 'Presidente' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'Secretario' })).toBeInTheDocument()
  })

  it('orienta a programar Defensa Pública cuando el contrato ya no informa autoridades faltantes', async () => {
    const publicStage = { id: 82, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO' }, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: {
        mensaje: 'Gestiona la Defensa Pública.', requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Programa la defensa correspondiente a esta etapa.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa' },
      } },
    })
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByText('Programar Defensa Pública')).toBeInTheDocument()
    expect(screen.queryByText('Para programar la Defensa Pública faltan:')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a programar defensa' })).toHaveAttribute('href', '#defensas')
  })

  it('representa las tres posiciones de Tribunal declaradas e impide una cuarta', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 21, name: 'Tribunal Uno', order: 1 },
      { id: 22, name: 'Tribunal Dos', order: 2 },
      { id: 23, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({ id: order, usuario_nombre: `Tribunal ${order}`, tipo_participacion: 'TRIBUNAL', tipo_participacion_display: 'Tribunal', orden_cargo: order, seguimiento_etapa: 12, activo: true })),
    } : historicalActorsResponse))
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
      expect(within(dialog).getByLabelText(`Seleccionar reemplazo para Tribunal ${order}`)).toBeInTheDocument()
    }
    expect(within(dialog).queryByRole('heading', { name: 'Tribunal 4 *' })).not.toBeInTheDocument()
    expect(within(actors).getByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
  })

  it('mantiene visibles los actores de Perfil sin proyectarlos como posiciones de otra etapa', async () => {
    const reviewStage = tribunalResponse.flujo.etapa_actual
    const contracts = profileContracts({ proposalApproved: true })
    const tutorPosition = contracts.flow.gestion_actores.posiciones.find((position) => position.tipo_participacion === 'TUTOR')
    const flow = {
      ...tribunalResponse.flujo,
      etapa_actual: reviewStage,
      etapas: [reviewStage],
      gestion_actores: {
        contexto: { tipo: 'ETAPA', seguimiento_etapa: reviewStage.id, codigo_etapa: reviewStage.codigo, regimen_workflow: 'PG_HITOS_V1' },
        posiciones: [{ ...tutorPosition, seguimiento_etapa: null, ambito: 'POSTULACION' }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 2, next: null, previous: null, results: [
        { id: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
        { id: 22, usuario_nombre: 'Mirna Fernández Rojas', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
      ],
    } : historicalActorsResponse))
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
      { id: 22, usuario_nombre: 'Mirna Fernández Rojas', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
    ])
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    const activeGroup = within(actors).getByRole('heading', { name: 'Participación actual' }).closest('section')
    expect(within(activeGroup).getByText('Raúl Marcelo Calderon Fuertes')).toBeInTheDocument()
    expect(within(activeGroup).getByText('Mirna Fernández Rojas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Revisión de Tribunal Previa' })
    expect(within(dialog).getByText('Etapa: REVISION_TRIBUNAL_PREVIA')).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: /Tribunal [123] \*/ })).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Seleccionar candidato para Tutor')).toBeInTheDocument()
  })

  it('usa las posiciones canónicas del contrato aunque la página visible no contenga Tribunal 3', async () => {
    const contracts = profileContracts({ assignedTribunals: [
      { id: 21, name: 'Tribunal Uno', order: 1 },
      { id: 22, name: 'Tribunal Dos', order: 2 },
      { id: 23, name: 'Tribunal Tres', order: 3 },
    ] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? {
      count: 22, next: '/api/v1/asignaciones/?page=2', previous: null, results: [
        { id: 21, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
        { id: 22, usuario_nombre: 'Tribunal Dos', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      ],
    } : historicalActorsResponse))
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 21, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 22, usuario_nombre: 'Tribunal Dos', tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      { id: 23, usuario_nombre: 'Tribunal Tres', tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true },
    ])

    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(dialog).getByRole('heading', { name: 'Tribunal 3 *' })).toBeInTheDocument()
    expect(within(dialog).getAllByText(/ASIGNADA/)).toHaveLength(3)
    expect(within(dialog).getAllByLabelText(/Seleccionar reemplazo para Tribunal/)).toHaveLength(3)
    expect(within(actors).getByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
  })

  it('envía orden y seguimiento declarados por la posición y refresca actores vigentes', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 2')
    await within(selector).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 22, observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === true)).toHaveLength(2))
    expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === false)).toHaveLength(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('permite asignar sin etapa y muestra errores de validación del backend', async () => {
    const contracts = profileContracts({ proposalApproved: true })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.asignarActor.mockRejectedValue({ status: 400, message: 'Revisa los datos de la asignación.', fields: { usuario: ['El candidato ya está asignado.'] } })
    const { container } = renderAssignmentManagerPage()
    await waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('EXP-007'))
    const actors = container.querySelector('[aria-labelledby="actores-title"]')
    expect(actors).not.toBeNull()
    await act(async () => {
      fireEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
      await Promise.resolve()
    })
    const dialog = container.querySelector('[role="dialog"][aria-label="Gestionar actores — Perfil de Proyecto"]')
    expect(dialog).not.toBeNull()
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    await within(selector).findByRole('option', { name: /Johnny Rosas/ })
    await act(async () => {
      fireEvent.change(selector, { target: { value: '41' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
      await Promise.resolve()
    })
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, { usuario: 41, tipo_participacion: 'TUTOR', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Revisa los datos de la asignación. El candidato ya está asignado.')
  })

  it('pagina solo el bloque vigente sin recargar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo, page) => Promise.resolve(activo
      ? { ...activeActorsResponse, count: 21, next: page === 1 ? 'page=2' : null, previous: page === 2 ? 'page=1' : null }
      : historicalActorsResponse))
    renderPage('actores')
    const group = (await screen.findByRole('heading', { name: 'Participación actual' })).parentElement
    await userEvent.click(within(group).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerActores).toHaveBeenCalledWith('7', true, 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerActores.mock.calls.filter(([, activo]) => activo === false)).toHaveLength(1)
  })

  it('oculta el bloque institucional y ofrece una sola entrada para gestionar actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderAssignmentManagerPage()

    const card = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('[aria-labelledby="actores-title"]')
    expect(within(card).queryByText('Información institucional')).not.toBeInTheDocument()
    expect(within(card).queryByText(/no sustituye un memorando o acto formal/i)).not.toBeInTheDocument()
    expect(within(card).queryByText(/participación anterior representa una participación finalizada/i)).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Participación actual' })).toBeInTheDocument()
    expect(within(card).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
  })

  it('mantiene la orientación visible sin accesos repetidos del expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: { ...response.flujo.etapa_actual, estado: 'EN_PROCESO' } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).toBeInTheDocument()
    expect(screen.queryByText('Accesos del expediente')).not.toBeInTheDocument()
  })

  it('mantiene vacíos separados y reintenta un error parcial de actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => activo
      ? Promise.reject({ status: 401, message: 'Debes iniciar sesión para consultar los actores.' })
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] }))
    renderPage('actores')
    expect(await screen.findByRole('alert')).toHaveTextContent('Debes iniciar sesión para consultar los actores.')
    expect(screen.getByText('No hay participaciones anteriores registradas.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar participación actual' }))
    expect(await screen.findByText('No hay participaciones vigentes registradas.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('consulta y lista defensas de Perfil, Privada y Pública con cinco estados técnicos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage('defensas')
    const card = (await screen.findByRole('heading', { name: 'Defensas' })).parentElement
    expect(within(card).getByText('Defensas registradas en tu proceso académico.')).toBeInTheDocument()
    expect(within(card).queryByText('Eventos técnicos registrados para esta postulación.')).not.toBeInTheDocument()
    expect(within(card).getByText('Defensa pública')).toBeInTheDocument()
    expect(within(card).getAllByText('Defensa privada')).toHaveLength(2)
    expect(within(card).getAllByText('Defensa de perfil')).toHaveLength(2)
    for (const state of ['Programada', 'En curso', 'Finalizada', 'Suspendida', 'Cancelada']) expect(within(card).getByText(state)).toBeInTheDocument()
    expect(within(card).getAllByText('Intento 2').length).toBeGreaterThan(0)
    expect(within(card).getByText('Auditorio central')).toBeInTheDocument()
    expect(within(card).getByText('Mixta')).toBeInTheDocument()
    expect(within(card).getByText('Defensa Pública')).toBeInTheDocument()
    expect(within(card).getAllByText('Etapa').length).toBeGreaterThan(0)
    expect(within(card).queryByText('Etapa técnica')).not.toBeInTheDocument()
    expect(within(card).queryByText('Información institucional')).not.toBeInTheDocument()
    expect(within(card).queryByLabelText('Alcance contractual de las defensas')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(1)
    expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
    expect(within(card).queryByRole('button', { name: /programar|reprogramar|iniciar|finalizar|suspender|cancelar|asistencia|evaluación|consolidar/i })).not.toBeInTheDocument()
  })

  it('abre detalle de solo lectura y consulta quórum únicamente para el evento seleccionado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderPage('defensas')
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledWith(81, expect.any(AbortSignal))
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(1)
    expect(await within(dialog).findByText(/Quórum: Válido/)).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Estado operativo' })).toBeInTheDocument()
    expect(within(dialog).getByText('Información técnica del quórum').closest('details')).not.toHaveAttribute('open')
    expect(within(dialog).queryByText(/La incorporación como participante no sustituye memorando/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Información institucional')).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('Tribunal: 2').length).toBeGreaterThan(0)
    expect(within(dialog).queryByText('Sin participantes faltantes.')).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('María Tribunal').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Tribunal · Convocado · Presente')).toBeInTheDocument()
    expect(within(dialog).getByText('Presente en sala')).toBeInTheDocument()
    expect(within(dialog).getAllByText('60.00').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('70.00').length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('link', { name: 'Abrir enlace virtual de la defensa' })).toHaveAttribute('href', 'https://meet.example.test/defensa')
    expect(within(dialog).getByText(/no certifica validez institucional/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /programar|reprogramar|iniciar|finalizar|suspender|cancelar|registrar|consolidar/i })).not.toBeInTheDocument()
  })

  it('presenta la jerarquía operativa de una Defensa Pública programada', async () => {
    const scheduledPublicDefense = {
      ...defenseRows[0],
      estado: 'PROGRAMADA',
      estado_display: 'Programada',
      numero_intento: 1,
      fecha_programada: '2026-09-18T09:00:00Z',
      fecha_inicio_real: null,
      fecha_fin_real: null,
      lugar: 'Salón Bicentenario',
      modalidad_evento: 'PRESENCIAL',
      modalidad_display: 'Presencial',
      participantes: [],
      evaluaciones: [],
      resultado_consolidado: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [scheduledPublicDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: {}, faltantes: { TRIBUNAL: 2 }, detalle: {} })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Defensa pública' })).toBeInTheDocument()
    expect(within(dialog).getByText('Programada')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Estado operativo' })).toBeInTheDocument()
    const operationalSummary = within(dialog).getByRole('heading', { name: 'Estado operativo' }).closest('section')
    expect(operationalSummary).toHaveTextContent('Participantes: 0 · Quórum: No válido · Resultado: Pendiente')
    expect(operationalSummary.querySelectorAll('div.rounded-lg.border')).toHaveLength(0)
    expect(within(dialog).queryByRole('heading', { name: 'Resultado' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Participantes' })).toBeInTheDocument()
    expect(within(dialog).queryByText(/de 3 incorporados/)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Mínimo requerido:/)).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Pendientes de incorporar')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Más acciones' })).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Acción principal' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Iniciar defensa' })).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Acción destructiva' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: 'Evaluación' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Intento 1 · Etapa Defensa Pública')).toBeInTheDocument()
    expect(within(dialog).queryByText('Inicio real')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Finalización real')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Información técnica del quórum').closest('details')).not.toHaveAttribute('open')
    expect(within(dialog).queryByText('Información institucional')).not.toBeInTheDocument()
  })

  it.each([
    ['Cerrar/×', async (dialog) => userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))],
    ['backdrop', async (dialog) => fireEvent.mouseDown(dialog)],
    ['Escape', async () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('regresa a Resumen después de consolidar y cerrar mediante %s', async (_mechanism, close) => {
    const consolidatable = {
      ...defenseRows[1],
      estado: 'FINALIZADA',
      estado_display: 'Finalizada',
      postulacion_modalidad_codigo: 'TRABAJO_DIRIGIDO',
      participantes: [{ id: 92, usuario_nombre: 'Tribunal', rol_evento: 'TRIBUNAL', activo: true, presente: true }],
      evaluaciones: [{ id: 201, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 }],
    }
    const completed = {
      ...consolidatable,
      resultado_consolidado: { id: 202, tipo_evaluacion: 'RESULTADO_FINAL', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [consolidatable] })
    postulacionesService.obtenerDefensa.mockResolvedValue(completed)
    postulacionesService.consolidarEvaluacionDefensa.mockResolvedValue(completed.resultado_consolidado)
    renderDefenseEvaluationManagerPage()

    const opener = await screen.findByRole('button', { name: 'Ver defensa' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Consolidar resultado del evento' }))
    await waitFor(() => expect(postulacionesService.consolidarEvaluacionDefensa).toHaveBeenCalledTimes(1))
    await close(screen.getByRole('dialog', { name: 'Detalle de defensa' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument())
    const summaryTab = screen.getByRole('tab', { name: 'Resumen' })
    expect(window.location.hash).toBe('#resumen')
    expect(summaryTab).toHaveAttribute('aria-selected', 'true')
    expect(document.querySelector('#panel-resumen')).not.toHaveAttribute('hidden')
    await waitFor(() => expect(document.activeElement).toBe(summaryTab))
    expect(document.querySelector('[data-expediente-panel="defensas"]')).toHaveAttribute('hidden')
  })

  it('conserva Defensas y el foco del abridor al consultar una defensa finalizada sin operar', async () => {
    renderDefenseManagerPage()
    const opener = (await screen.findAllByRole('button', { name: 'Ver defensa' }))[0]
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))

    expect(window.location.hash).toBe('#defensas')
    expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
    expect(opener.closest('[hidden]')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('no navega a Resumen si falla la consolidación de la defensa', async () => {
    const consolidatable = {
      ...defenseRows[1],
      estado: 'FINALIZADA',
      estado_display: 'Finalizada',
      postulacion_modalidad_codigo: 'TRABAJO_DIRIGIDO',
      participantes: [{ id: 92, usuario_nombre: 'Tribunal', rol_evento: 'TRIBUNAL', activo: true, presente: true }],
      evaluaciones: [{ id: 201, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'CONSENSO', resultado_cualitativo: 'SUFICIENTE', nota_numerica: 28 }],
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [consolidatable] })
    postulacionesService.obtenerDefensa.mockResolvedValue(consolidatable)
    postulacionesService.consolidarEvaluacionDefensa.mockRejectedValue({ message: 'No se pudo consolidar.' })
    renderDefenseEvaluationManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Consolidar resultado del evento' }))
    expect(await within(dialog).findByText('No se pudo consolidar.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))

    expect(window.location.hash).toBe('#defensas')
    expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'false')
  })

  it('permite seleccionar y guardar Tutor junto con los Tribunales antes de aprobar la propuesta', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 44, username: 'tutora', nombre_completo: 'Tutora Anticipada', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getByText('0 de 4 posiciones ocupadas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    const tutorPosition = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    const tutorSelector = within(tutorPosition).getByLabelText('Seleccionar candidato para Tutor')
    await within(tutorSelector).findByRole('option', { name: /Tutora Anticipada/ })
    await userEvent.selectOptions(tutorSelector, '44')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 44, tipo_participacion: 'TUTOR', observaciones: '',
    }, expect.any(AbortSignal)))
    expect(screen.queryByRole('button', { name: 'Conformar equipo' })).not.toBeInTheDocument()
    expect(within(actors).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
    expect(screen.getByText('Completar composición formal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar decisión' })).not.toBeInTheDocument()
  })

  it('asigna una posición individual dentro del modal genérico con orden y contexto del backend', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 41, username: 'tribunal-one', nombre_completo: 'Tribunal Disponible', rol_nombre: 'Docente' },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tribunal 1')
    await within(selector).findByRole('option', { name: /Tribunal Disponible/ })
    await userEvent.selectOptions(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', observaciones: '', orden_cargo: 1, seguimiento_etapa: 22,
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor.mock.calls.some(([, payload]) => payload.tipo_participacion === 'TUTOR')).toBe(false)
  })

  it('mantiene el expediente renderizado al refrescar posiciones asignadas desde Gestionar actores', async () => {
    const initial = profileContracts()
    const names = ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']
    const assignedTribunals = names.map((name, index) => ({ id: 50 + index, name, order: index + 1 }))
    const refreshed = profileContracts({ assignedTribunals })
    refreshed.flow.gestion_actores.posiciones = refreshed.flow.gestion_actores.posiciones.map((position) => {
      const assignment = assignedTribunals.find(({ order }) => order === position.orden_cargo)
      if (!assignment) return position
      return {
        ...position,
        asignacion_actual_detalle: {
          id: position.asignacion_actual,
          usuario: { id: assignment.id + 100, nombre: assignment.name },
          tipo_participacion: 'TRIBUNAL',
          orden_cargo: assignment.order,
          ambito: 'ETAPA',
          seguimiento_etapa: initial.stage.id,
        },
      }
    })
    let serverActors = []
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce({ ...response, flujo: initial.flow })
      .mockResolvedValue({ ...response, flujo: refreshed.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, active) => Promise.resolve(active
      ? { count: serverActors.length, next: null, previous: null, results: serverActors }
      : { count: 0, next: null, previous: null, results: [] }))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 3, next: null, previous: null, results: names.map((name, index) => ({
      id: 150 + index, username: `tribunal-${index + 1}`, nombre_completo: name, rol_nombre: 'Docente',
    })) })
    postulacionesService.asignarActor.mockImplementation(async (_id, payload) => {
      const id = 50 + payload.orden_cargo - 1
      serverActors = [...serverActors, {
        id,
        usuario: payload.usuario,
        usuario_nombre: names[payload.orden_cargo - 1],
        tipo_participacion: payload.tipo_participacion,
        orden_cargo: payload.orden_cargo,
        etapa_nombre: 'Perfil de Proyecto',
        seguimiento_etapa: initial.stage.id,
        activo: true,
      }]
      return { id }
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      await userEvent.selectOptions(within(dialog).getByLabelText(`Seleccionar candidato para Tribunal ${order}`), String(149 + order))
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(3))
    expect(await screen.findByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
    const activeGroup = within(actors).getByRole('heading', { name: 'Participación actual' }).closest('section')
    for (const name of names) {
      expect(within(dialog).getByText(name, { exact: true })).toBeInTheDocument()
      expect(within(activeGroup).getByText(name, { exact: true })).toBeInTheDocument()
    }
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('conserva éxitos y reintenta solo posiciones fallidas tras refrescar el expediente', async () => {
    const initial = profileContracts()
    const names = ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']
    const candidates = names.map((name, index) => ({
      id: 151 + index, username: `tribunal-${index + 1}`, nombre_completo: name, rol_nombre: 'Docente',
    }))
    let serverActors = []
    let failedOnce = false
    const buildRefreshedFlow = () => {
      const assignedTribunals = serverActors.map((actor) => ({
        id: actor.id, name: actor.usuario_nombre, order: actor.orden_cargo,
      }))
      const refreshed = profileContracts({ assignedTribunals })
      refreshed.flow.gestion_actores.posiciones = refreshed.flow.gestion_actores.posiciones.map((position) => {
        const assignment = assignedTribunals.find(({ order }) => order === position.orden_cargo)
        return assignment ? {
          ...position,
          asignacion_actual_detalle: {
            id: position.asignacion_actual,
            usuario: { id: assignment.id + 100, nombre: assignment.name },
            tipo_participacion: 'TRIBUNAL',
            orden_cargo: assignment.order,
            ambito: 'ETAPA',
            seguimiento_etapa: initial.stage.id,
          },
        } : position
      })
      return refreshed.flow
    }
    postulacionesService.obtenerExpediente.mockImplementation(async () => ({
      ...response,
      flujo: serverActors.length ? buildRefreshedFlow() : initial.flow,
    }))
    postulacionesService.obtenerActores.mockImplementation((_id, active) => Promise.resolve(active
      ? { count: serverActors.length, next: null, previous: null, results: serverActors }
      : { count: 0, next: null, previous: null, results: [] }))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: candidates.length, next: null, previous: null, results: candidates })
    postulacionesService.asignarActor.mockImplementation(async (_id, payload) => {
      if (payload.orden_cargo === 2 && !failedOnce) {
        failedOnce = true
        throw { message: 'Conflicto de asignación.' }
      }
      const actor = {
        id: 70 + payload.orden_cargo,
        usuario: payload.usuario,
        usuario_nombre: names[payload.orden_cargo - 1],
        tipo_participacion: payload.tipo_participacion,
        orden_cargo: payload.orden_cargo,
        etapa_nombre: 'Perfil de Proyecto',
        seguimiento_etapa: initial.stage.id,
        activo: true,
      }
      serverActors = [...serverActors.filter((item) => item.orden_cargo !== payload.orden_cargo), actor]
      return { id: actor.id }
    })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) {
      await userEvent.selectOptions(within(dialog).getByLabelText(`Seleccionar candidato para Tribunal ${order}`), String(150 + order))
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    expect(await within(dialog).findByText('Conflicto de asignación.')).toBeInTheDocument()
    expect(await screen.findByText('2 de 4 posiciones ocupadas')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Guardado')).toHaveLength(2)
    const activeGroup = within(actors).getByRole('heading', { name: 'Participación actual' }).closest('section')
    expect(within(activeGroup).getByText('Tribunal Uno')).toBeInTheDocument()
    expect(within(activeGroup).getByText('Tribunal Tres')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar pendientes' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(4))
    expect(postulacionesService.asignarActor.mock.calls.map(([, payload]) => payload.orden_cargo)).toEqual([1, 2, 3, 2])
    expect(await screen.findByText('3 de 4 posiciones ocupadas')).toBeInTheDocument()
    expect(within(dialog).queryByText('Conflicto de asignación.')).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('Guardado')).toHaveLength(3)
    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
  })

  it('confirma la autorización del perfil con participantes, observaciones y orientación actualizada', async () => {
    const incomplete = profileContracts({ assignedTribunals: [
      { id: 51, name: 'Tribunal Uno', order: 1 },
      { id: 52, name: 'Tribunal Dos', order: 2 },
      { id: 53, name: 'Tribunal Tres', order: 3 },
    ] })
    const approved = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
    })
    const refreshed = {
        ...approved.flow,
        orientacion_etapa_actual: {
          mensaje: 'El perfil cumple las condiciones para programar su defensa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'PROGRAMAR_EVENTO',
            titulo: 'Programar Defensa de Perfil',
            descripcion: 'Programa la Defensa de Perfil.',
            estado: 'DISPONIBLE',
            estado_display: 'Disponible',
            destino: '#defensas',
            accion_label: 'Programar defensa',
          },
        },
    }
    postulacionesService.obtenerExpediente
        .mockResolvedValueOnce({ ...response, flujo: incomplete.flow })
        .mockResolvedValue({ ...response, flujo: refreshed })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar autorización del perfil' })
    expect(within(dialog).queryByLabelText('Archivo')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Resultado')).not.toBeInTheDocument()
    for (const name of ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']) {
        expect(within(dialog).getByText((text) => text.includes(name))).toBeInTheDocument()
    }
    const participants = within(dialog).getAllByRole('listitem')
    expect(participants.map((row) => row.firstElementChild.textContent)).toEqual(['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres'])
    participants.forEach((row, index) => expect(within(row).getByText(`TRIBUNAL ${index + 1}`)).toBeInTheDocument())
    const cancel = within(dialog).getByRole('button', { name: 'Cancelar' })
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar autorización' })
    expect(cancel.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Autorización respaldada por memorándum.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar autorización' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, {
        codigo: 'PROPUESTA_APROBADA',
        resultado: 'APROBADA',
        observaciones: 'Autorización respaldada por memorándum.',
        participantes: [
          { asignacion: 51, rol: 'TRIBUNAL', orden: 1 },
          { asignacion: 52, rol: 'TRIBUNAL', orden: 2 },
          { asignacion: 53, rol: 'TRIBUNAL', orden: 3 },
        ],
    }, expect.any(AbortSignal)))
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByText('Programar Defensa de Perfil')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Actores' }))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const actorDialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(actorDialog).getByLabelText('Seleccionar candidato para Tutor')).toBeInTheDocument()
    expect(within(actorDialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('conserva el selector y el registro de RECHAZADA para decisiones académicas generales', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
    })
    contracts.flow.gestion_decisiones_academicas.decisiones[0] = {
      ...contracts.flow.gestion_decisiones_academicas.decisiones[0],
      codigo: 'DECISION_GENERAL',
      nombre: 'Decisión académica general',
      resultados_permitidos: ['APROBADA', 'RECHAZADA'],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Decisión académica general' })
    const result = within(dialog).getByLabelText('Resultado')
    await userEvent.selectOptions(result, 'RECHAZADA')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar decisión' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, expect.objectContaining({
      codigo: 'DECISION_GENERAL',
      resultado: 'RECHAZADA',
    }), expect.any(AbortSignal)))
  })

  it('no permite registrar decisión cuando el backend no concede acción de escritura', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      canRegister: false,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    selectInitialTab('etapas')
    render(<AuthContext.Provider value={{ user: { id: 12 }, hasPermission: () => false }}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect(await screen.findByRole('heading', { name: 'Decisiones académicas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar decisión' })).not.toBeInTheDocument()
    expect(postulacionesService.registrarDecisionAcademica).not.toHaveBeenCalled()
  })

  it('reemplaza una decisión solo cuando el backend declara REEMPLAZAR', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage('etapas')

    await userEvent.click(await screen.findByRole('button', { name: 'Reemplazar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar autorización del perfil' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar autorización' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, expect.objectContaining({
      codigo: 'PROPUESTA_APROBADA',
      resultado: 'APROBADA',
      reemplaza_decision: 71,
    }), expect.any(AbortSignal)))
  })

  it('reemplaza actor desde el modal genérico conservando posición y contexto del contrato', async () => {
    const contracts = profileContracts({
      assignedTribunals: [
        { id: 51, name: 'Tribunal Uno', order: 1 },
        { id: 52, name: 'Tribunal Dos', order: 2 },
        { id: 53, name: 'Tribunal Tres', order: 3 },
      ],
      proposalApproved: true,
    })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerActores.mockImplementation((_id, active) => Promise.resolve(active
      ? { count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({
        id: 50 + order, usuario: 150 + order, usuario_nombre: `Tribunal ${order}`,
        tipo_participacion: 'TRIBUNAL', orden_cargo: order, seguimiento_etapa: 22, activo: true,
      })) }
      : { count: 0, next: null, previous: null, results: [] }))
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      { id: 98, username: 'busy', codigo: 'RU-0098', nombre_completo: 'Willian Vargas', rol_nombre: 'Docente', elegible: false, motivo_bloqueo: 'YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION', asignaciones_vigentes: ['Tutor'] },
      { id: 99, username: 'replacement', codigo: 'RU-0099', nombre_completo: 'Nuevo Tribunal', rol_nombre: 'Docente', elegible: true, motivo_bloqueo: null, asignaciones_vigentes: [] },
    ] })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar reemplazo para Tribunal 1')
    await within(selector).findByRole('option', { name: /Nuevo Tribunal/ })
    expect(within(selector).queryByRole('option', { name: /Tribunal Uno/ })).not.toBeInTheDocument()
    expect(within(selector).getByRole('option', { name: /Willian Vargas.*RU-0098.*Asignación vigente: Tutor/ })).toBeDisabled()
    expect(within(selector).getByRole('option', { name: /Nuevo Tribunal.*RU-0099/ })).toBeEnabled()
    expect(postulacionesService.obtenerCandidatosElegibles).toHaveBeenCalledWith(
      7,
      { posicion: 'TRIBUNAL_PERFIL_1', accion: 'REEMPLAZAR', search: '', ordering: 'apellido_paterno', page: 1, page_size: 20 },
      expect.any(AbortSignal),
    )
    await userEvent.selectOptions(selector, '99')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))

    await waitFor(() => expect(postulacionesService.reemplazarActor).toHaveBeenCalledWith(51, {
      nuevo_usuario: 99,
      observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
  })

  it('oculta PROGRAMAR_EVENTO dentro de una defensa existente en curso', async () => {
    const runningDefense = { ...defenseRows[2], estado: 'EN_CURSO', estado_display: 'En curso', fecha_inicio_real: '2026-09-21T16:36:51Z' }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: { requisitos: [], siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Programa la defensa.' } } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [runningDefense] })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByText('En curso')).toBeInTheDocument()
    expect(within(dialog).queryByText('Programar defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Siguiente acción:.*Programar defensa/)).not.toBeInTheDocument()
  })

  it('conserva una orientación compatible con el estado de la defensa', async () => {
    const runningDefense = { ...defenseRows[2], estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: { requisitos: [], siguiente_accion: { codigo: 'FINALIZAR_DEFENSA', titulo: 'Finalizar defensa', descripcion: 'Finaliza el evento en curso.' } } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [runningDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Acción principal' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Finalizar defensa' })).toBeEnabled()
    expect(within(dialog).getByText('Finaliza el evento en curso.')).toBeInTheDocument()
  })

  it('abre el registro de asistencia múltiple desde el flujo rápido de Perfil cuando hay participantes pendientes', async () => {
    const profileDefense = {
      ...defenseRows[2],
      estado: 'EN_CURSO',
      estado_display: 'En curso',
      participantes: [
        { id: 191, asignacion: 21, usuario_nombre: 'Raúl', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: null },
        { id: 192, asignacion: 22, usuario_nombre: 'Mirna', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
      ],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
    renderDefenseManagerPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(detail).findByRole('button', { name: 'Registrar resultado de la defensa' })).toBeInTheDocument()
    expect(within(detail).queryByText('Registrar resultado de la defensa', { selector: 'p' })).not.toBeInTheDocument()
    fireEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado de la defensa' }))

    const flow = screen.getByRole('dialog', { name: 'Registrar resultado de la defensa' })
    expect(within(flow).getByText('Hay participantes con asistencia pendiente.')).toBeInTheDocument()
    fireEvent.click(within(flow).getByRole('button', { name: 'Revisar asistencias' }))
    expect(await screen.findByRole('dialog', { name: 'Registrar asistencia múltiple' })).toBeInTheDocument()
  })

  it('usa un único formulario estándar para evaluar Defensa Privada de Tesis', async () => {
    const privateDefense = {
      ...defenseRows[0],
      tipo_evento: 'DEFENSA_PRIVADA',
      postulacion_modalidad_codigo: 'TESIS_GRADO',
      tipo_display: 'Defensa privada',
      estado: 'EN_CURSO',
      estado_display: 'En curso',
      participantes: [
        { id: 201, asignacion: 31, usuario_nombre: 'Ana', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
      ],
      evaluaciones: [],
      resultado_consolidado: null,
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [privateDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 1 }, faltantes: {}, detalle: { TRIBUNAL: 1 } })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(detail).getAllByRole('button', { name: 'Registrar evaluación' })).toHaveLength(1)
    await userEvent.click(within(detail).getByRole('button', { name: 'Registrar evaluación' }))
    expect(within(detail).getByLabelText('Modo')).toBeInTheDocument()
    expect(within(detail).queryByRole('button', { name: 'Registrar resultado de la defensa' })).not.toBeInTheDocument()
  })

  it('omite secciones técnicas vacías y conserva el detalle colapsable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: {}, faltantes: {}, detalle: {} })
    renderPage('defensas')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    const technical = within(dialog).getByText('Información técnica del quórum').closest('details')
    expect(technical).not.toHaveAttribute('open')
    expect(within(technical).queryByRole('heading', { name: /Conteos|Faltantes|Detalles/ })).not.toBeInTheDocument()
    expect(within(technical).queryByText(/Sin conteos|Sin participantes faltantes|Sin detalle adicional/)).not.toBeInTheDocument()
  })

  it('no abre automáticamente los detalles técnicos de quórum y evaluación para administradores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseEvaluationManagerPage()

    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText(/Quórum: Válido/)).toBeInTheDocument()
    expect(within(dialog).getByText('Información técnica del quórum').closest('details')).not.toHaveAttribute('open')
    within(dialog).getAllByText('Detalles de la evaluación').forEach((summary) => {
      expect(summary.closest('details')).not.toHaveAttribute('open')
    })
    expect(within(dialog).getAllByText('60.00').length).toBeGreaterThan(0)
  })

  it('muestra y descarga la hoja de observaciones de una Defensa de Perfil finalizada', async () => {
    const profileDefense = {
      ...defenseRows[2],
      estado: 'FINALIZADA', estado_display: 'Finalizada',
      hoja_observaciones: {
        id: 901, tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil', fecha_subida: '2026-06-02T10:00:00Z',
        versiones: [{ id: 902, numero_version: 1, nombre_original: 'observaciones-perfil.pdf', fecha_subida: '2026-06-02T10:00:00Z', tamano_bytes: 1024, subido_por_nombre: 'Administradora', es_version_actual: true, activo: true }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'observaciones-perfil.pdf' })
    renderDefenseDocumentsAdminPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Hoja de observaciones' })).toBeInTheDocument()
    expect(within(dialog).getByText('Versión 1')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(902, 'observaciones-perfil.pdf')
  })

  it('permite al estudiante consultar y descargar la hoja de observaciones sin ofrecer cargas', async () => {
    const profileDefense = {
      ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada',
      hoja_observaciones: {
        id: 901, tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil',
        versiones: [{ id: 902, numero_version: 1, nombre_original: 'observaciones-perfil.pdf', fecha_subida: '2026-06-02T10:00:00Z', es_version_actual: true, activo: true }],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'observaciones-perfil.pdf' })
    renderOwnerPage('defensas')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByRole('heading', { name: 'Hoja de observaciones' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /cargar hoja|cargar nueva versión/i })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(902, 'observaciones-perfil.pdf')
  })

  it('muestra el estado vacío y no ofrece carga administrativa al estudiante', async () => {
    const profileDefense = { ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada', hoja_observaciones: null }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    renderOwnerPage('defensas')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(within(dialog).getByText('No se registró una hoja de observaciones para esta defensa.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /cargar hoja|cargar nueva versión/i })).not.toBeInTheDocument()
  })

  it('permite al administrador cargar una hoja de observaciones vinculada al evento', async () => {
    const profileDefense = { ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada', hoja_observaciones: null }
    const file = new File(['%PDF-1.4'], 'observaciones.pdf', { type: 'application/pdf' })
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerDefensa.mockResolvedValue(profileDefense)
    postulacionesService.obtenerTiposDocumento.mockResolvedValue([
      { id: 4, codigo: 'INFORME_FINAL', nombre: 'Informe final' },
      { id: 99, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', nombre: 'Hoja de observaciones de Defensa de Perfil' },
    ])
    postulacionesService.cargarDocumento.mockResolvedValue({ id: 100 })
    renderDefenseDocumentsAdminPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: 'Cargar hoja de observaciones' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    const upload = screen.getByRole('dialog', { name: 'Cargar nueva versión' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const uploadOpener = within(detail).getByRole('button', { name: 'Cargar hoja de observaciones' })
    await userEvent.upload(within(upload).getByLabelText('Archivo'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith({ postulacionId: 7, tipoDocumentoId: 99, archivo: file, eventoDefensaId: 83 }, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(83, expect.any(AbortSignal))
    await userEvent.click(within(upload).getAllByRole('button', { name: 'Cerrar' })[1])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar nueva versión' })).not.toBeInTheDocument())
    expect(document.activeElement).not.toBe(uploadOpener)
  })

  it('muestra quórum inválido, faltantes y resultado consolidado ausente sin calcular cero', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1, SECRETARIO: 1 }, detalle: {} })
    renderPage('defensas')
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText(/Quórum: No válido/)).toBeInTheDocument()
    expect(within(dialog).getByText('Secretario: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('No se registraron participantes.')).toBeInTheDocument()
    expect(within(dialog).getByText('No se registraron evaluaciones.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Resultado:\s*Pendiente/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: 'Resultado' })).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/^0(?:\.00)?$/)).not.toBeInTheDocument()
  })

  it('orienta el quórum de Perfil y permite incorporar explícitamente un tribunal elegible', async () => {
    const raul = { id: 191, asignacion: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }
    const profileDefense = { ...defenseRows[2], postulacion: 7, estado: 'PROGRAMADA', participantes: [raul] }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [defenseRows[0], defenseRows[1], profileDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1 }, detalle: { TRIBUNAL: 1 } })
    postulacionesService.obtenerAsignacionesCandidatas.mockResolvedValue({ results: [
      { id: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', tipo_participacion: 'TRIBUNAL', activo: true },
      { id: 22, usuario_nombre: 'Mirna Fernández Rojas', tipo_participacion: 'TRIBUNAL', activo: true },
      { id: 23, usuario_nombre: 'Tribunal Histórico', tipo_participacion: 'TRIBUNAL', activo: false },
      { id: 24, usuario_nombre: 'Tutor Activo', tipo_participacion: 'TUTOR', activo: true },
    ] })
    postulacionesService.obtenerDefensa.mockResolvedValue({ ...profileDefense, participantes: [...profileDefense.participantes, { id: 192, asignacion: 22, usuario_nombre: 'Mirna Fernández Rojas', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }] })
    renderDefenseManagerPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[2])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText('1 de 3 incorporados')).toBeInTheDocument()
    expect(within(dialog).getByText('1 presente')).toBeInTheDocument()
    expect(within(dialog).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(dialog).getByText('Falta 1 presencia para alcanzar el quórum.')).toBeInTheDocument()
    expect(within(dialog).getByText('Raúl Marcelo Calderon Fuertes')).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal · Incorporado · Asistencia pendiente')).toBeInTheDocument()
    expect(await within(dialog).findByText('Mirna Fernández Rojas')).toBeInTheDocument()
    expect(within(dialog).queryByText('Tribunal Histórico')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Tutor Activo')).not.toBeInTheDocument()
    expect(postulacionesService.agregarParticipanteDefensa).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar a la defensa' }))
    await waitFor(() => expect(postulacionesService.agregarParticipanteDefensa).toHaveBeenCalledWith(83, 22, 'TRIBUNAL', expect.any(AbortSignal)))
    expect(within(dialog).getByRole('button', { name: 'Agregar participante' })).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: 'Retirar participante' }).length).toBeGreaterThan(0)
  })

  it('muestra quórum mínimo en Perfil usando la respuesta del backend', async () => {
    const profileDefense = { ...defenseRows[2], postulacion: 7, estado: 'PROGRAMADA', participantes: [
      { id: 191, asignacion: 21, usuario_nombre: 'Raúl', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
      { id: 192, asignacion: 22, usuario_nombre: 'Mirna', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true, presente: true },
    ] }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [profileDefense] })
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
    renderDefenseManagerPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(dialog).findByText('2 de 3 incorporados')).toBeInTheDocument()
    expect(within(dialog).getByText('2 presentes')).toBeInTheDocument()
    expect(within(dialog).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(dialog).getByText('✓ Válido')).toBeInTheDocument()
    expect(within(dialog).queryByText('Tribunal completo')).not.toBeInTheDocument()
  })

  it('vuelve a consultar el quórum backend y refleja 1/2 después de retirar un tribunal', async () => {
    const raul = { id: 191, asignacion: 21, usuario_nombre: 'Raúl Marcelo Calderon Fuertes', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }
    const mirna = { id: 192, asignacion: 22, usuario_nombre: 'Mirna Fernández Rojas', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', activo: true }
    const profileDefense = { ...defenseRows[2], postulacion: 7, estado: 'PROGRAMADA', participantes: [raul, mirna] }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [profileDefense] })
    postulacionesService.obtenerDefensa.mockResolvedValue({ ...profileDefense, participantes: [raul] })
    postulacionesService.obtenerQuorumDefensa
      .mockResolvedValueOnce({ valido: true, conteos: { TRIBUNAL: 2 }, faltantes: {}, detalle: { TRIBUNAL: 2 } })
      .mockResolvedValueOnce({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1 }, detalle: { TRIBUNAL: 1 } })
    renderDefenseManagerPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(detail).findByText('2 de 3 incorporados')).toBeInTheDocument()
    fireEvent.click(within(within(detail).getByText('Mirna Fernández Rojas').closest('li')).getByRole('button', { name: 'Retirar participante' }))
    const removal = screen.getByRole('dialog', { name: 'Retirar participante' })
    fireEvent.click(within(removal).getByRole('button', { name: 'Confirmar retiro' }))

    expect(await within(detail).findByText('1 de 3 incorporados')).toBeInTheDocument()
    expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2)
    expect(within(detail).getByText('1 presente')).toBeInTheDocument()
    expect(within(detail).getByText('Falta 1 presencia para alcanzar el quórum.')).toBeInTheDocument()
  })

  it('pagina defensas sin recargar las demás secciones ni duplicar la consulta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas
      .mockResolvedValueOnce(defensesResponse)
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [defenseRows[1]] })
    renderPage('defensas')
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
    renderPage('defensas')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar defensas' }))
    expect(await screen.findByText('Defensa pública')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('aísla error de quórum, permite reintentar y cancela al cerrar el evento', async () => {
    let pendingSignal
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 1, next: null, previous: null, results: [defenseRows[0]],
    })
    postulacionesService.obtenerQuorumDefensa
      .mockRejectedValueOnce({ status: 404, message: 'El evento de defensa no está disponible.' })
      .mockImplementationOnce((_event, signal) => { pendingSignal = signal; return new Promise(() => {}) })
    renderPage('defensas')
    const defensesTab = await screen.findByText('Defensas', { selector: '[role="tab"]' })
    expect(defensesTab).toHaveAttribute('aria-selected', 'true')
    const defensesPanel = document.getElementById(defensesTab.getAttribute('aria-controls'))
    expect(defensesPanel).not.toHaveAttribute('hidden')
    const defenseButtons = await within(defensesPanel).findAllByText('Ver defensa', { selector: 'button' })
    fireEvent.click(defenseButtons[0])
    const dialog = screen.getByLabelText('Detalle de defensa', { selector: '[role="dialog"]' })
    const errorMessage = await within(dialog).findByText('El evento de defensa no está disponible.')
    expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Reintentar quórum', { selector: 'button' }))
    await waitFor(() => expect(pendingSignal).toBeInstanceOf(AbortSignal))
    fireEvent.click(within(dialog).getByLabelText('Cerrar', { selector: 'button' }))
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
    renderPage('historial')
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
    renderPage('historial')
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
    renderPage('documentos')
    const card = (await screen.findByRole('heading', { name: 'Documentos' })).closest('[aria-labelledby="documentos-title"]')
    expect(within(card).getByText('Consulta y gestiona los documentos vinculados a tu proceso académico.')).toBeInTheDocument()
    expect(within(card).getByText(/Informe final/)).toBeInTheDocument()
    expect(within(card).getByText(/Estado: Enviado/)).toBeInTheDocument()
    expect(within(card).getByText('Fecha de carga')).toBeInTheDocument()
    expect(within(card).getByText('Fecha de revisión')).toBeInTheDocument()
    expect(within(card).getByText('Pendiente')).toBeInTheDocument()
    expect(within(card).queryByText('Subido')).not.toBeInTheDocument()
    expect(within(card).queryByText('Revisado')).not.toBeInTheDocument()
    expect(within(card).getByText('Requerida')).toBeInTheDocument()
    expect(within(card).getByText('1')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledWith('7', 1, expect.any(AbortSignal))
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /subir|aprobar|rechazar|observar/i })).not.toBeInTheDocument()
  })

  it('mantiene nueva versión para un documento ordinario autorizado y unifica las fechas del detalle', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByRole('button', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    expect(within(dialog).getByText('Fecha de carga')).toBeInTheDocument()
    expect(within(dialog).getByText('Fecha de revisión')).toBeInTheDocument()
    expect(within(dialog).getByText('Pendiente')).toBeInTheDocument()
    expect(within(dialog).queryByText('Fecha de subida')).not.toBeInTheDocument()
  })

  it('restringe al estudiante el versionado de la hoja de observaciones sin quitar consulta ni descarga', async () => {
    const observationDocument = {
      id: 91, postulacion: 7, evento_defensa: 83, tipo_documento: 99,
      tipo_documento_codigo: 'OBSERVACIONES_DEFENSA_PERFIL', tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil',
      estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-06-02T10:00:00Z', fecha_revision: null,
      requiere_correccion: false, versiones: [{ id: 902 }],
    }
    const observationVersion = { id: 902, numero_version: 1, nombre_original: 'observaciones-perfil.pdf', fecha_subida: '2026-06-02T10:00:00Z', es_version_actual: true, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [observationDocument] })
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 1, next: null, previous: null, results: [observationVersion] })
    postulacionesService.descargarVersion.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'observaciones-perfil.pdf' })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(await within(dialog).findByText('Versión 1')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Cargar nueva versión' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ver observaciones' }))
    expect(await within(dialog).findByText('Corregir portada')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descargar' }))
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(902, 'observaciones-perfil.pdf')
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('conserva el versionado administrativo de la hoja con su evento de Defensa de Perfil', async () => {
    const observationDocument = {
      id: 91, postulacion: 7, evento_defensa: 83, tipo_documento: 99,
      tipo_documento_codigo: 'OBSERVACIONES_DEFENSA_PERFIL', tipo_documento_nombre: 'Hoja de observaciones de Defensa de Perfil',
      estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-06-02T10:00:00Z', fecha_revision: null,
      requiere_correccion: false, versiones: [{ id: 902 }],
    }
    const file = new File(['%PDF-1.4'], 'observaciones-v2.pdf', { type: 'application/pdf' })
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [observationDocument] })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [{ id: 99, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', capacidad_carga: { permitida: true } }] })
    renderDefenseDocumentsAdminPage('documentos')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Detalle del documento' })).getByRole('button', { name: 'Cargar nueva versión' }))
    const upload = screen.getByRole('dialog', { name: 'Cargar nueva versión' })
    await userEvent.upload(within(upload).getByLabelText('Archivo'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith({ postulacionId: 7, tipoDocumentoId: 99, archivo: file, eventoDefensaId: 83 }, expect.any(AbortSignal)))
  })

  it('abre detalle, pagina versiones y consulta observaciones por versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones
      .mockResolvedValueOnce({ ...versionsResponse, count: 21, next: 'page=2' })
      .mockResolvedValueOnce({ count: 21, next: null, previous: 'page=1', results: [versionsResponse.results[1]] })
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    expect(dialog).toBeInTheDocument()
    expect(await screen.findByText('Versión 1')).toBeInTheDocument()
    expect(screen.getByText('Versión 2')).toBeInTheDocument()
    expect(screen.getByText('Versión actual')).toBeInTheDocument()
    expect(screen.getByText('informe-largo.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver', exact: true })).toHaveLength(2)
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
    definePropertyForTest(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    definePropertyForTest(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Descargar' }))[1])

    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(302, 'informe-final.pdf'))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento')
  })

  it('abre la versión seleccionada en una pestaña nueva usando el blob autenticado', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    const deferredDownload = deferred()
    postulacionesService.descargarVersion.mockReturnValue(deferredDownload.promise)
    let cleanupPreview
    const previewWindow = {
      closed: false,
      opener: window,
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    const open = vi.spyOn(window, 'open').mockReturnValue(previewWindow)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const setInterval = vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      cleanupPreview = callback
      return 41
    })
    const clearInterval = vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver', exact: true }))[1])

    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(previewWindow.opener).toBeNull()
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(302, 'informe-final.pdf')
    expect(createObjectURL).not.toHaveBeenCalled()
    await act(async () => deferredDownload.resolve({ blob, filename: 'informe-final.pdf' }))

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(previewWindow.location.replace).toHaveBeenCalledWith('blob:preview')
    expect(revokeObjectURL).not.toHaveBeenCalled()
    previewWindow.closed = true
    act(() => cleanupPreview())
    expect(clearInterval).toHaveBeenCalledWith(41)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    open.mockRestore()
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    setInterval.mockRestore()
    clearInterval.mockRestore()
  })

  it('cierra la pestaña reservada y muestra el error si falla la vista previa', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.descargarVersion.mockRejectedValue({ status: 403, message: 'No tienes autorización para descargar este archivo.' })
    const previewWindow = {
      closed: false,
      opener: window,
      location: { replace: vi.fn() },
      close: vi.fn(function close() { this.closed = true }),
    }
    const open = vi.spyOn(window, 'open').mockReturnValue(previewWindow)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver', exact: true }))[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes autorización para descargar este archivo.')
    expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(301, 'informe-largo.pdf')
    expect(previewWindow.close).toHaveBeenCalledOnce()
    expect(previewWindow.location.replace).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    open.mockRestore()
    createObjectURL.mockRestore()
  })

  it('muestra un error limpio cuando falla la descarga', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.descargarVersion.mockRejectedValue({ status: 404, message: 'El archivo solicitado no está disponible.' })
    renderPage('documentos')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    fireEvent.click((await screen.findAllByRole('button', { name: 'Descargar' }))[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo solicitado no está disponible.')
  })

  it('muestra documentos y observaciones vacíos con lenguaje neutral', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('documentos')
    expect(await screen.findByText('No se registraron documentos.')).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
  })

  it('muestra versiones vacías, incluidos campos opcionales ausentes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerVersiones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('No se registraron versiones.')).toBeInTheDocument()
    expect(screen.getAllByText('No registrada').length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío de observaciones para la versión exacta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerObservaciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('documentos')
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
    renderPage('documentos')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await waitFor(() => expect(versionSignals).toHaveLength(1))
    const detailDialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Cerrar' }))
    expect(versionSignals[0].aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver observaciones' }))[0])
    await waitFor(() => expect(observationSignals).toHaveLength(1))
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver observaciones' })[1])
    await waitFor(() => expect(observationSignals).toHaveLength(2))
    expect(observationSignals[0].aborted).toBe(true)
  })

  it.each([
    ['Debes iniciar sesión para consultar los documentos.', 401],
    ['Los documentos no disponibles.', 404],
    ['No se pudieron cargar los documentos. Intenta nuevamente.', undefined],
  ])('mantiene expediente ante error documental parcial %s y reintenta', async (message, status) => {
    const user = userEvent.setup()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(documentsResponse)
    renderPage('documentos')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar documentos' }))
    expect(await screen.findByText(/Informe final/)).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['staff con rol no reconocido localmente', { id: 9, is_staff: true, rol: { codigo: 'ADMIN-API' } }],
    ['superusuario sin código de rol', { id: 10, is_superuser: true, rol: null }],
  ])('muestra Cargar documento a un %s autorizado por capacidades', async (_label, user) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    const auth = { user, roleCode: user.rol?.codigo || '', hasPermission: (name) => name === 'puede_cargar_documentos' }
    selectInitialTab('documentos')
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

  it('mantiene el cargador genérico estable cuando no hay documentos aplicables', async () => {
    const user = userEvent.setup()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [] })
    renderOwnerPage()

    await user.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByText('No hay tipos documentales activos disponibles.')).toBeVisible()
    expect(within(dialog).queryByRole('button', { name: 'Cargar 0 documentos' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(0)
  })

  it('ofrece carga corregible y presenta aprobados y pendientes de revisión sin selectores', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD', nombre: 'Carta de Solicitud', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Matrícula Vigente', capacidad_carga: { permitida: true, codigo: 'RECHAZADO' } },
      { id: 43, codigo: 'HISTORIAL', nombre: 'Historial académico', capacidad_carga: { permitida: true, codigo: 'CORRECCION_REQUERIDA' } },
      { id: 44, codigo: 'INFORME', nombre: 'Informe enviado', capacidad_carga: { permitida: true, codigo: 'ESPERANDO_REVISION' } },
      { id: 45, codigo: 'ACTA', nombre: 'Acta aprobada', capacidad_carga: { permitida: true, codigo: 'DOCUMENTO_APROBADO' } },
      { id: 46, codigo: 'RESERVADO', nombre: 'Documento reservado', capacidad_carga: { permitida: false, codigo: 'ACTOR_CARGA_NO_AUTORIZADO', mensaje: 'Carga reservada a administración.' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Carta de Solicitud')).toBeInTheDocument()
    expect(screen.getByLabelText('Matrícula Vigente')).toBeInTheDocument()
    expect(screen.getByLabelText('Historial académico')).toBeInTheDocument()
    expect(screen.getByText(/Pendientes de revisión/)).toBeInTheDocument()
    expect(screen.getByText(/Informe enviado.*No necesitas volver a cargarlo/)).toBeInTheDocument()
    expect(screen.getByText('Aprobados (1)')).toBeInTheDocument()
    expect(screen.getByText('Acta aprobada')).toBeInTheDocument()
    expect(screen.getByText(/Documento reservado.*Carga reservada a administración/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Informe enviado')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Acta aprobada')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Documento reservado')).not.toBeInTheDocument()
  })

  it('mantiene disponible la corrección post-aprobación cuando la policy la autoriza', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 47, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true, codigo: 'CORRECCION_POST_APROBACION' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.queryByText('No hay documentos pendientes de carga o corrección permitida.')).not.toBeInTheDocument()
  })

  it('no ofrece selector ni botón de carga cuando solo hay documentos en revisión o aprobados', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 48, codigo: 'INFORME', nombre: 'Informe en revisión', capacidad_carga: { permitida: true, codigo: 'ESPERANDO_REVISION' } },
      { id: 49, codigo: 'ACTA', nombre: 'Acta aprobada', capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })

    expect(within(dialog).getByText('No hay documentos pendientes de carga o corrección permitida.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Informe en revisión.*No necesitas volver a cargarlo/)).toBeInTheDocument()
    expect(within(dialog).getByText('Aprobados (1)')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Cargar 0 documentos' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(0)
  })

  it('carga juntos la carta de Tribunal y el Perfil académico en PERFIL_PROYECTO', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 61, codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO', nombre: 'Carta de solicitud de asignación de Tribunal', capacidad_carga: { permitida: true } },
      { id: 62, codigo: 'PERFIL_ACADEMICO_PROYECTO', nombre: 'Perfil académico del Proyecto de Grado', capacidad_carga: { permitida: true } },
      { id: 63, codigo: 'MEMORANDUM_DESIGNACION_PROYECTO', nombre: 'Memorándum oficial', capacidad_carga: { permitida: true } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    const carta = new File(['%PDF-1.4'], 'carta.pdf', { type: 'application/pdf' })
    const perfil = new File(['perfil'], 'perfil.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    await userEvent.upload(within(dialog).getByLabelText('Carta de solicitud de asignación de Tribunal'), carta)
    await userEvent.upload(within(dialog).getByLabelText('Perfil académico del Proyecto de Grado'), perfil)
    expect(within(dialog).queryByLabelText('Memorándum oficial')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 2 documentos' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledTimes(2))
    expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(1,
      { postulacionId: 7, tipoDocumentoId: 61, archivo: carta, eventoDefensaId: undefined }, expect.any(AbortSignal))
    expect(postulacionesService.cargarDocumento).toHaveBeenNthCalledWith(2,
      { postulacionId: 7, tipoDocumentoId: 62, archivo: perfil, eventoDefensaId: undefined }, expect.any(AbortSignal))
  })

  it('refresca documentos aplicables tras una carga individual en el modal múltiple', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    const carta = {
      id: 61,
      codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO',
      nombre: 'Carta de solicitud de asignación de Tribunal',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    const perfil = {
      id: 62,
      codigo: 'PERFIL_ACADEMICO_PROYECTO',
      nombre: 'Perfil académico del Proyecto de Grado',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    postulacionesService.obtenerDocumentosAplicables
      .mockResolvedValueOnce({ documentos_aplicables: [carta, perfil] })
      .mockResolvedValueOnce({
        documentos_aplicables: [
          { ...carta, capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
          { ...perfil, capacidad_carga: { permitida: false, codigo: 'ESPERANDO_REVISION' } },
        ],
      })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    await userEvent.upload(
      within(dialog).getByLabelText(carta.nombre),
      new File(['carta'], 'carta.pdf', { type: 'application/pdf' }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 1 documento' }))

    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
  })

  it('actualiza capacidades tras una carga parcial y conserva para reintento el documento rechazado', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    const carta = {
      id: 61,
      codigo: 'CARTA_SOLICITUD_TRIBUNAL_PROYECTO',
      nombre: 'Carta de solicitud de asignación de Tribunal',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    const perfil = {
      id: 62,
      codigo: 'PERFIL_ACADEMICO_PROYECTO',
      nombre: 'Perfil académico del Proyecto de Grado',
      capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' },
    }
    postulacionesService.obtenerDocumentosAplicables
      .mockResolvedValueOnce({ documentos_aplicables: [carta, perfil] })
      .mockResolvedValueOnce({
        documentos_aplicables: [
          { ...carta, capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
          { ...perfil, capacidad_carga: { permitida: true, codigo: 'RECHAZADO' } },
        ],
      })
    postulacionesService.cargarDocumento
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce({ message: 'No se pudo guardar el perfil.' })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    const cartaFile = new File(['carta'], 'carta.pdf', { type: 'application/pdf' })
    const perfilFile = new File(['perfil'], 'perfil.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(dialog).getByLabelText(carta.nombre), cartaFile)
    await userEvent.upload(within(dialog).getByLabelText(perfil.nombre), perfilFile)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cargar 2 documentos' }))

    expect(await within(dialog).findByText('1 documento cargado. 1 documento no pudo cargarse.')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(2)
    expect(within(dialog).queryByLabelText(carta.nombre)).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText(perfil.nombre)).toBeInTheDocument()
    expect(within(dialog).getByText(perfilFile.name)).toBeInTheDocument()
    expect(within(dialog).getByText('No se pudo guardar el perfil.')).toBeInTheDocument()
  })

  it('carga un documento inicial con postulación contextual y tipo por nombre', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Informe final')).toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Informe final'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file, eventoDefensaId: undefined }, expect.any(AbortSignal),
    ))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(2)
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('carga un ACTA_DEFENSA vinculada a una Defensa Pública finalizada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({
      ...defensesResponse,
      results: [defenseRows[0], { ...defenseRows[1], id: 86, tipo_evento: 'DEFENSA_PUBLICA', estado: 'PROGRAMADA' }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const defenseSelect = await screen.findByLabelText('Defensa Pública finalizada')
    expect(defenseSelect).toBeRequired()
    expect([...defenseSelect.options].map((option) => option.value)).toEqual(['', '81'])
    const file = new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Acta de Defensa'), file)
    await userEvent.selectOptions(defenseSelect, '81')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 5, archivo: file, eventoDefensaId: '81' }, expect.any(AbortSignal),
    ))
  })

  it('carga ACTA_DEFENSA_TD solo con la Defensa Pública del intento aprobado vigente', async () => {
    const currentStage = { id: 502, codigo: 'DEFENSA_PUBLICA', estado: 'APROBADA', numero_intento: 2, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 8, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: { id: 503, codigo: 'CIERRE_DOCUMENTAL', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
        etapas: [
          { id: 501, codigo: 'DEFENSA_PUBLICA', estado: 'RECHAZADA', numero_intento: 1, activo: true },
          currentStage,
        ],
      },
    })
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 95, codigo: 'ACTA_DEFENSA_TD', nombre: 'Acta de Defensa TD', capacidad_carga: { permitida: true } },
    ] })
    postulacionesService.obtenerDefensas.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [
        { ...defenseRows[0], id: 181, seguimiento_etapa: 501, numero_intento: 1 },
        { ...defenseRows[0], id: 182, seguimiento_etapa: currentStage.id, numero_intento: currentStage.numero_intento },
      ],
    })

    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const defenseSelect = await screen.findByLabelText('Defensa Pública finalizada')
    expect([...defenseSelect.options].map((option) => option.value)).toEqual(['', '182'])

    const file = new File(['%PDF-1.4'], 'acta-td.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Acta de Defensa TD'), file)
    expect(defenseSelect).toHaveValue('182')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 95, archivo: file, eventoDefensaId: '182' }, expect.any(AbortSignal),
    ))
  })

  it('encuentra una Defensa Pública finalizada aunque no esté en la página visible', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockImplementation((_postulacion, page) => Promise.resolve(page === 1
      ? { count: 21, next: 'page=2', previous: null, results: [{ ...defenseRows[1], id: 86, tipo_evento: 'DEFENSA_PUBLICA', estado: 'PROGRAMADA' }] }
      : { count: 21, next: null, previous: 'page=1', results: [defenseRows[0]] }))
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
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
    const selector = await screen.findByLabelText('Defensa Pública finalizada')
    expect(selector).toHaveValue('')
    const file = new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Acta de Defensa'), file)
    fireEvent.submit(selector.closest('form'))

    expect(await screen.findByText('Selecciona la Defensa Pública finalizada.')).toBeVisible()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra ausencia de candidatas y no permite enviar el Acta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByText('No existen Defensas Públicas finalizadas disponibles para vincular el Acta de Defensa.')).toBeVisible()
    await userEvent.upload(screen.getByLabelText('Acta de Defensa'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('muestra el error de consulta de candidatas y bloquea el Acta', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas
      .mockResolvedValueOnce(defensesResponse)
      .mockRejectedValueOnce({ message: 'No se pudieron consultar las Defensas Públicas.' })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = screen.getByRole('dialog')

    expect(await within(dialog).findByText('No se pudieron consultar las Defensas Públicas.')).toBeVisible()
    await userEvent.upload(within(dialog).getByLabelText('Acta de Defensa'), new File(['acta'], 'acta.pdf', { type: 'application/pdf' }))
    expect(within(dialog).getByRole('button', { name: 'Cargar 1 documento' })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('limpia el evento al cambiar de postulación', async () => {
    postulacionesService.obtenerExpediente.mockImplementation((id) => Promise.resolve({ ...response, detalle: { ...response.detalle, id: Number(id), codigo: `EXP-${id}` } }))
    postulacionesService.obtenerDefensas.mockImplementation((id) => Promise.resolve({
      count: String(id) === '7' ? 2 : 1, next: null, previous: null,
      results: String(id) === '7' ? [defenseRows[0], { ...defenseRows[0], id: 87 }] : [{ ...defenseRows[0], id: 181 }],
    }))
    const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
    selectInitialTab('documentos')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<><ExpedientePage /><Link to="/postulaciones/8">Cambiar postulación</Link></>} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const firstSelector = await screen.findByLabelText('Defensa Pública finalizada')
    await userEvent.selectOptions(firstSelector, '81')
    await userEvent.click(screen.getByRole('link', { name: 'Cambiar postulación' }))
    await screen.findByText('EXP-8')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Defensa Pública finalizada')).toHaveValue('181')
  })

  it('conserva documentos ordinarios sin evento aunque ACTA_DEFENSA también sea aplicable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defenseRows[0]] })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Defensa Pública finalizada')).toHaveValue('81')
    const file = new File(['%PDF-1.4'], 'informe.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Informe final'), file)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar 1 documento' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file, eventoDefensaId: undefined }, expect.any(AbortSignal),
    ))
  })

  it('carga una nueva versión derivando postulación y tipo del detalle', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      ...documentsResponse,
      results: [{ ...documentsResponse.results[0], tipo_documento_nombre: 'Documento Final' }],
    })
    renderOwnerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar nueva versión' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Cargar nueva versión' })).toBeInTheDocument()
    expect(screen.getByText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Archivo')).toBeVisible()
    expect(screen.queryByRole('dialog', { name: 'Detalle del documento' })).not.toBeInTheDocument()
    const file = new File(['%PDF-1.4'], 'informe-v3.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Archivo'), file)
    fireEvent.submit(screen.getByLabelText('Archivo').closest('form'))
    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith(
      { postulacionId: 7, tipoDocumentoId: 4, archivo: file }, expect.any(AbortSignal),
    ))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar nueva versión' })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Detalle del documento' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
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

  it('muestra loading de versiones solo durante la carga inicial', async () => {
    let resolveVersions
    postulacionesService.obtenerVersiones.mockImplementation(() => new Promise((resolve) => { resolveVersions = resolve }))
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('Cargando versiones…')).toBeInTheDocument()
    resolveVersions(versionsResponse)
    expect(await screen.findByText('Versión 2')).toBeInTheDocument()
  })

  it('conserva el detalle y versiones visibles durante el refetch posterior a aprobar', async () => {
    let resolveRefreshVersions
    postulacionesService.obtenerVersiones
      .mockResolvedValueOnce(versionsResponse)
      .mockImplementation(() => new Promise((resolve) => { resolveRefreshVersions = resolve }))
    postulacionesService.obtenerDocumentos
      .mockResolvedValueOnce(documentsResponse)
      .mockResolvedValueOnce({
        ...documentsResponse,
        results: [{ ...documentsResponse.results[0], estado_codigo: 'APR', estado_nombre: 'Aprobado', fecha_revision: '2026-02-05T10:00:00Z' }],
      })
    postulacionesService.aprobarDocumento.mockResolvedValue({ id: 31, estado_codigo: 'APR' })
    renderReviewerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('Versión 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar documento' }))
    await userEvent.type(screen.getByLabelText(/Comentario/), 'Revisado')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(postulacionesService.aprobarDocumento).toHaveBeenCalledWith(31, 'Revisado', expect.any(AbortSignal)))
    expect(screen.queryByRole('dialog', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerVersiones.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(screen.getByRole('dialog', { name: 'Detalle del documento' })).toBeInTheDocument()
    expect(screen.getByText('Versión 2')).toBeInTheDocument()

    resolveRefreshVersions({
      ...versionsResponse,
      results: [...versionsResponse.results, { id: 303, numero_version: 3, fecha_subida: '2026-02-05T10:00:00Z', nombre_original: 'informe-v3.pdf', tamano_bytes: 4096, subido_por_nombre: 'Ana Pérez', es_version_actual: true, archivo: '/media/documentos/versiones/informe-v3.pdf' }],
    })
    expect(await screen.findByText('Versión 3')).toBeInTheDocument()
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
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
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(screen.queryByRole('button', { name: 'Aprobar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar observación' })).not.toBeInTheDocument()
  })

  it('oculta transiciones para un documento que no está en ENV', async () => {
    const user = userEvent.setup()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      ...documentsResponse,
      results: [{ ...documentsResponse.results[0], estado_codigo: 'APR', estado_nombre: 'Aprobado' }],
    })
    renderReviewerPage()
    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))
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
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    const institutionalDetails = within(dialog).getByText('Información institucional').closest('details')
    expect(institutionalDetails).not.toHaveAttribute('open')
    expect(within(institutionalDetails).queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Tipo de defensa'), { target: { value: 'DEFENSA_PRIVADA' } })
    expect(within(dialog).getByRole('option', { name: 'Defensa Privada — intento 2' })).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Etapa compatible'), { target: { value: '12' } })
    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    fireEvent.change(within(dialog).getByLabelText('Lugar'), { target: { value: 'Sala técnica' } })
    fireEvent.change(within(dialog).getByLabelText('Observaciones (opcional)'), { target: { value: 'Registro técnico' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Programar defensa' }))
    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-08-20T14:00', lugar: 'Sala técnica', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: 'Registro técnico',
    }, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('usa programación contextual para Defensa de Perfil sin selectores redundantes', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      tipo_evento: 'DEFENSA_PERFIL',
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa de Perfil', descripcion: 'Programa la Defensa de Perfil.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa' },
      requisitos: [{ codigo: 'TRIBUNAL', actual: 2, minimo: 2, cumplido: true, estado_display: '2/2 cumplido' }],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: orientation },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })

    renderDefenseManagerPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Programar Defensa de Perfil' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa de Perfil' })
    expect(within(dialog).getByText('Perfil de Proyecto · Intento 1')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    fireEvent.change(within(dialog).getByLabelText('Modalidad técnica'), { target: { value: 'VIRTUAL' } })
    fireEvent.change(within(dialog).getByLabelText('Enlace virtual'), { target: { value: 'https://meet.example.test/perfil' } })
    fireEvent.change(within(dialog).getByLabelText('Observaciones (opcional)'), { target: { value: 'Defensa de perfil' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa de Perfil' }))

    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 11, tipo_evento: 'DEFENSA_PERFIL', fecha_programada: '2026-08-20T14:00', lugar: '', modalidad_evento: 'VIRTUAL', enlace_virtual: 'https://meet.example.test/perfil', observaciones: 'Defensa de perfil',
    }, expect.any(AbortSignal)))
  })

  it('usa programación contextual para Defensa Privada y conserva el payload explícito', async () => {
    const privateStage = { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      tipo_evento: 'DEFENSA_PRIVADA',
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
      requisitos: [
        { tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 3, minimo: 2, cumplido: true },
        { tipo: 'ACTOR', codigo: 'DOCENTE_MODALIDAD', nombre: 'Docente de modalidad', actual: 1, minimo: 1, cumplido: true },
      ],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: orientation } })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Programar Defensa privada' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa privada' })
    expect(within(dialog).getByText('Defensa privada')).toBeInTheDocument()
    expect(within(dialog).getByText('Defensa Privada · Intento 1')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/48 horas/i)).not.toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala privada')
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Defensa privada')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa privada' }))

    await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
      seguimiento_etapa: 12, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-08-20T14:00', lugar: 'Sala privada', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: 'Defensa privada',
    }, expect.any(AbortSignal)))
  })

  it('muestra la anticipación pública solo cuando la orientación la informa', async () => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      tipo_evento: 'DEFENSA_PUBLICA',
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
      requisitos: [{ tipo: 'ANTICIPACION', codigo: 'ANTICIPACION_MINIMA', valor: 48, unidad: 'HORAS', cumplido: true, estado_display: '48 h' }],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: publicStage, etapas: [publicStage], orientacion_etapa_actual: orientation } })
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Programar Defensa pública' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa pública' })
    expect(within(dialog).getByText('Anticipación mínima informada')).toBeInTheDocument()
    expect(within(dialog).getByText('48 HORAS')).toBeInTheDocument()
  })

  it('conserva el formulario genérico cuando el contexto no es inequívoco', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    expect(within(dialog).getByLabelText('Tipo de defensa')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Etapa compatible')).toBeInTheDocument()
  })

  it.each([
    ['VIRTUAL', false, true],
    ['MIXTA', true, true],
  ])('aplica campos condicionales de modalidad %s', async (mode, hasPlace, hasLink) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Modalidad técnica'), mode)
    expect(Boolean(within(dialog).queryByLabelText('Lugar'))).toBe(hasPlace)
    expect(Boolean(within(dialog).queryByLabelText('Enlace virtual'))).toBe(hasLink)
    expect(within(dialog).getByRole('note')).toHaveTextContent(/no acreditan autorización normativa/i)
    expect(within(dialog).getByRole('note')).not.toHaveTextContent(/48 horas.*no acredita publicación/i)
  })

  it('valida fecha, etapa y campos presenciales sin invocar backend', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
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
    if (eventId === 83) {
      const profileWithEvaluation = { ...defenseRows[2], evaluaciones: [{ id: 103, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'SUFICIENTE' }] }
      postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: defensesResponse.results.map((row) => row.id === 83 ? profileWithEvaluation : row) })
    }
    renderDefenseManagerPage()
    const buttons = await screen.findAllByRole('button', { name: 'Ver defensa' })
    await userEvent.click(buttons[defenseRows.findIndex((row) => row.id === eventId)])
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: label }))
    if (label === 'Finalizar defensa') expect(within(detail).getByRole('button', { name: label })).toHaveClass('app-button--primary')
    if (label === 'Suspender defensa') expect(within(detail).getByRole('button', { name: label })).toHaveClass('app-button--secondary')
    if (label === 'Cancelar defensa') expect(within(detail).getByRole('button', { name: label })).toHaveClass('app-button--outline')
    const confirm = screen.getAllByRole('dialog').at(-1)
    if (label === 'Reprogramar defensa') fireEvent.change(within(confirm).getByLabelText('Nueva fecha y hora'), { target: { value: args[0] } })
    if (args.at(-1)) await userEvent.type(within(confirm).getByLabelText('Motivo'), args.at(-1))
    const confirmLabel = method === 'iniciarDefensa' ? 'Iniciar defensa' : 'Confirmar'
    await userEvent.click(within(confirm).getByRole('button', { name: confirmLabel }))
    if (method === 'iniciarDefensa') {
      await waitFor(() => expect(postulacionesService[method]).toHaveBeenCalledWith(eventId, [], expect.any(AbortSignal)))
    } else {
      await waitFor(() => expect(postulacionesService[method]).toHaveBeenCalledWith(eventId, ...args, expect.any(AbortSignal)))
    }
    expect(postulacionesService.obtenerDefensas).toHaveBeenCalledTimes(2)
  })

  it('no muestra la advertencia de 48 horas para Tesis', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' } },
      flujo: { ...response.flujo, modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' }, orientacion_etapa_actual: {
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', estado: 'DISPONIBLE', destino: '#defensas' },
      } },
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
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
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
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    if (status === 400) expect(screen.getByText('Transición inválida.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('actualiza el detalle seleccionado y vuelve a consultar quórum al iniciar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Iniciar defensa' }))
    await waitFor(() => expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('dialog', { name: 'Detalle de defensa' })).getByText('En curso')).toBeInTheDocument()
  })

  it('confirma solo asistencias pendientes, preserva las previas y refresca participantes y quórum', async () => {
    const participants = [
      { id: 901, usuario_nombre: 'Tribunal Presente', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: true, fecha_asistencia: '2026-09-27T17:00:00Z' },
      { id: 902, usuario_nombre: 'Tribunal Ausente', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: false, fecha_asistencia: '2026-09-27T17:01:00Z' },
      { id: 903, usuario_nombre: 'Tribunal Pendiente', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: null },
      { id: 905, usuario_nombre: 'Tribunal Pendiente 2', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: true, presente: null },
      { id: 904, usuario_nombre: 'Retirado', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, activo: false, presente: null },
    ]
    const scheduled = { ...defenseRows[1], participantes: participants }
    const started = {
      ...scheduled,
      estado: 'EN_CURSO',
      estado_display: 'En curso',
      fecha_inicio_real: '2026-09-27T18:15:20Z',
      participantes: participants.map((participant) => participant.id === 903
        ? { ...participant, presente: false, fecha_asistencia: '2026-09-27T18:15:21Z' }
        : participant.id === 905
          ? { ...participant, presente: true, fecha_asistencia: '2026-09-27T18:15:22Z' }
          : participant),
    }
    let resolveStart
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [scheduled] })
    postulacionesService.iniciarDefensa
      .mockRejectedValueOnce({ status: 400, message: 'Fallo temporal al registrar asistencia.' })
      .mockReturnValueOnce(new Promise((resolve) => { resolveStart = resolve }))
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    await userEvent.click(within(detail).getByRole('button', { name: 'Iniciar defensa' }))
    const start = screen.getByRole('dialog', { name: 'Iniciar defensa' })

    expect(detail).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black/60')
    expect(start).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black/60')
    expect(screen.getAllByRole('dialog')).toEqual([detail, start])
    expect(detail.closest('.space-y-5')).toBeNull()
    expect(start.closest('.space-y-5')).toBeNull()
    expect(detail.parentElement).toHaveClass('mx-auto', 'max-w-6xl')
    expect(detail.parentElement.querySelector(':scope > .space-y-5')).toBeInTheDocument()
    expect(within(start).getByText('Confirma los participantes presentes antes de iniciar la defensa.')).toBeInTheDocument()
    expect(within(start).getByRole('checkbox', { name: 'Tribunal Pendiente — Tribunal' })).toBeChecked()
    expect(within(start).getByRole('checkbox', { name: 'Tribunal Pendiente 2 — Tribunal' })).toBeChecked()
    expect(within(start).queryByRole('checkbox', { name: 'Tribunal Presente — Tribunal' })).not.toBeInTheDocument()
    expect(within(start).queryByRole('checkbox', { name: 'Tribunal Ausente — Tribunal' })).not.toBeInTheDocument()
    expect(within(start).getByText('Asistencia ya registrada · Presente')).toBeInTheDocument()
    expect(within(start).getByText('Asistencia ya registrada · Ausente')).toBeInTheDocument()
    expect(within(start).queryByText('Retirado')).not.toBeInTheDocument()
    await userEvent.click(within(start).getByRole('checkbox', { name: 'Tribunal Pendiente — Tribunal' }))
    await userEvent.click(within(start).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await within(start).findByRole('alert')).toHaveTextContent('Fallo temporal al registrar asistencia.')
    expect(within(start).getByRole('button', { name: 'Iniciar defensa' })).toBeEnabled()
    await userEvent.click(within(start).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await within(start).findByRole('button', { name: 'Procesando…' })).toBeDisabled()
    await userEvent.click(within(start).getByRole('button', { name: 'Procesando…' }))
    expect(postulacionesService.iniciarDefensa).toHaveBeenCalledTimes(2)
    expect(postulacionesService.iniciarDefensa).toHaveBeenLastCalledWith(82, [
      { participante: 903, presente: false },
      { participante: 905, presente: true },
    ], expect.any(AbortSignal))
    resolveStart(started)

    await waitFor(() => expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2))
    const refreshedDetail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(screen.queryByRole('dialog', { name: 'Iniciar defensa' })).not.toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Presente')).toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Ausente')).toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Pendiente')).toBeInTheDocument()
    expect(within(refreshedDetail).getByText('Tribunal Pendiente 2')).toBeInTheDocument()
    const absentParticipantRow = within(refreshedDetail).getByText('Tribunal Ausente').closest('li')
    const pendingParticipantRow = within(refreshedDetail).getByText('Tribunal Pendiente').closest('li')
    expect(within(absentParticipantRow).getByText('Tribunal · Convocado · Ausente')).toBeInTheDocument()
    expect(within(pendingParticipantRow).getByText('Tribunal · Convocado · Ausente')).toBeInTheDocument()
    const newlyPresentRow = within(refreshedDetail).getByText('Tribunal Pendiente 2').closest('li')
    expect(within(newlyPresentRow).getByText('Tribunal · Convocado · Presente')).toBeInTheDocument()
    expect(within(refreshedDetail).queryByRole('button', { name: 'Registrar asistencia múltiple' })).not.toBeInTheDocument()
    expect(postulacionesService.registrarAsistenciaDefensa).not.toHaveBeenCalled()
    await userEvent.click(within(refreshedDetail).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Detalle de defensa' })).not.toBeInTheDocument()
    expect(postulacionesService.retirarParticipanteDefensa).not.toHaveBeenCalled()
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
      resultado: { data: { nota_privada: '28.00', nota_publica: null, aporte_privada: '28.00', semantica_privada: 'LEGACY_PONDERADA', nota_final: null }, error: '' },
      cierre: { data: { ...closureResponse, etapa_actual: 'DEFENSA_PUBLICA' }, error: '' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(stale).mockResolvedValue(synchronized)
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [defenseRows[0], privateDefense] })
    postulacionesService.consolidarEvaluacionDefensa.mockResolvedValue({})
    postulacionesService.obtenerDefensa.mockResolvedValue({
      ...privateDefense,
      resultado_consolidado: { id: 202, tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE', nota_numerica: '28.00', ponderacion: '30.00', aporte_ponderado: '28.00', semantica_nota: 'LEGACY_PONDERADA' },
    })

    renderDefenseEvaluationManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    await userEvent.click(await screen.findByRole('button', { name: 'Consolidar resultado del evento' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado y cierre' }))
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getAllByText('28,00').length).toBeGreaterThan(0)
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getAllByText('/ 30')).toHaveLength(2)
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getByText('Registro con escala anterior')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).getByText('Defensa Pública')).toBeInTheDocument()
    expect(screen.getAllByText('Defensa Pública').length).toBeGreaterThan(0)
  })

  it('no muestra acciones para finalizada/cancelada ni funcionalidades de historias posteriores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    const buttons = await screen.findAllByRole('button', { name: 'Ver defensa' })
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
    renderOwnerPage('resultado-y-cierre')
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
    await screen.findByRole('heading', { name: 'EXP-007' })
    await waitFor(() => expect(screen.getByText('No existen informes registrados para esta etapa.')).toBeInTheDocument(), { timeout: 10000 })
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.getByRole('button', { name: 'Registrar informe del tribunal' })).toBeInTheDocument()
    expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal))
    managed.unmount()

    renderOwnerPage('resumen')
    expect(await screen.findByText('Orientación del expediente')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(await screen.findByRole('heading', { name: 'Revisión de Tribunal Previa' })).toBeInTheDocument()
  }, 15000)

  it('mantiene pendiente la consulta de informes antes de mostrar el estado vacío', async () => {
    let resolveReports
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockReturnValue(new Promise((resolve) => { resolveReports = resolve }))

    renderWorkflowManagerPage()

    expect(await screen.findByText('Cargando informes del tribunal…')).toBeInTheDocument()
    expect(screen.queryByText('No existen informes registrados para esta etapa.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal)))

    await act(async () => resolveReports([]))

    expect(await screen.findByText('No existen informes registrados para esta etapa.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(screen.getByRole('button', { name: 'Registrar informe del tribunal' })).toBeInTheDocument()
  })

  it('registra SUFICIENTE y refresca informes y flujo para mostrar la aprobación', async () => {
    const user = userEvent.setup()
    const pendingStage = { ...tribunalStage, acciones_permitidas: [] }
    const pendingResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: pendingStage,
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'El informe del tribunal está pendiente.',
          requisitos: [],
          siguiente_accion: null,
        },
      },
    }
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const approvableResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? approvableStage : stage),
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'APROBAR_ETAPA',
            titulo: 'Aprobar Revisión de Tribunal Previa',
            descripcion: 'La etapa está lista para aprobarse.',
            estado: 'DISPONIBLE',
            accion_label: 'Aprobar Revisión de Tribunal Previa',
          },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(pendingResponse).mockResolvedValue(approvableResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_seguimiento'].includes(name),
    }
    selectInitialTab('informes-etapa')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await screen.findByText('El informe del tribunal está pendiente.')
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Resumen' }))
    await user.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByText('Documento Final — Versión 1')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await user.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    fireEvent.change(within(dialog).getByLabelText(/Observaciones/), { target: { value: 'Consenso suficiente' } })
    await user.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 601, resultado: 'SUFICIENTE', observaciones: 'Consenso suficiente', evidencia_version: 602,
    }, expect.any(AbortSignal)))
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledTimes(2))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentos).toHaveBeenCalledTimes(1)
  })

  it('actualiza evidencia vencida sin duplicar informe y habilita aprobar tras refrescar acciones', async () => {
    const staleOrientation = {
      operacion: 'ORIENTAR_ETAPA',
      mensaje: 'El informe del tribunal utiliza una versión anterior de la evidencia. Actualiza el informe con la versión vigente.',
      requisitos: [{ tipo: 'DOCUMENTO', codigo: 'EVIDENCIA_INFORME_TRIBUNAL_VIGENTE', cumplido: false, estado: 'REQUIERE_ACTUALIZACION' }],
      siguiente_accion: { codigo: 'ACTUALIZAR_INFORME_TRIBUNAL', titulo: 'Actualizar informe del tribunal', estado: 'PENDIENTE', destino: '#informes-etapa' },
    }
    const staleResponse = {
      ...tribunalResponse,
      flujo: { ...tribunalResponse.flujo, orientacion_etapa_actual: staleOrientation },
    }
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const validResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.codigo === 'REVISION_TRIBUNAL_PREVIA' ? approvableStage : stage),
        orientacion_etapa_actual: { siguiente_accion: { codigo: 'APROBAR_ETAPA', estado: 'DISPONIBLE' }, requisitos: [] },
      },
    }
    const staleReport = {
      id: 771,
      seguimiento_etapa: 4,
      version_documento_revisada: 601,
      numero_version_revisada: 1,
      resultado: 'SUFICIENTE',
      resultado_display: 'Suficiente',
      evidencia_version: 602,
      evidencia_nombre_original: 'informe-tribunal.pdf',
      observaciones: 'Consenso suficiente',
      activo: true,
    }
    const updatedReport = { ...staleReport, evidencia_version: 603 }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(staleResponse).mockResolvedValue(validResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 2, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
        { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de Evaluación del Tribunal', activo: true, versiones: [
          { id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: false, activo: true },
          { id: 603, numero_version: 2, nombre_original: 'informe-tribunal-v2.pdf', es_version_actual: true, activo: true },
        ] },
      ],
    })
    let reportReads = 0
    const reportReadsObserved = []
    postulacionesService.obtenerInformesRevisionTribunal.mockImplementation(async (...args) => {
      reportReads += 1
      const payload = [reportReads === 1 ? staleReport : updatedReport]
      reportReadsObserved.push({ args, payload })
      return payload
    })
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 11, usuario: 45, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 12, usuario: 42, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
      { id: 13, usuario: 43, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true },
    ])
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_seguimiento', 'puede_gestionar_postulaciones'].includes(name) }
    selectInitialTab('informes-etapa')
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect((await screen.findAllByText(staleOrientation.mensaje))).toHaveLength(2)
    await waitFor(() => expect(reportReadsObserved.length).toBeGreaterThan(0))
    expect(reportReadsObserved[0].args[0]).toBe(4)
    expect(reportReadsObserved[0].args[1]).toBeInstanceOf(AbortSignal)
    expect(reportReadsObserved[0].payload).toEqual([staleReport])
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Actualizar informe del tribunal' }))
    let dialog = screen.getByRole('dialog', { name: 'Actualizar informe del tribunal' })
    expect(within(dialog).getByText(/Resultado conservado:/)).toHaveTextContent('Suficiente')
    expect(within(dialog).queryByLabelText('Resultado')).not.toBeInTheDocument()
    const evidence = within(dialog).getByRole('combobox', { name: 'Evidencia vigente' })
    expect(within(evidence).getAllByRole('option')).toHaveLength(2)
    expect(within(evidence).getByRole('option', { name: /Versión 2/ })).toHaveValue('603')
    await userEvent.selectOptions(evidence, '603')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Actualizar informe' }))

    await waitFor(() => expect(postulacionesService.actualizarEvidenciaInformeRevisionTribunal).toHaveBeenCalledWith(
      4,
      771,
      { evidencia_version: 603 },
      expect.any(AbortSignal),
    ))
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    expect(screen.getByText('Suficiente')).toBeInTheDocument()
  })

  it('ejecuta una sola aprobación desde Orientación y refresca al nuevo seguimiento', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const approvableResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? approvableStage : stage),
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.',
          requisitos: [],
          siguiente_accion: {
            codigo: 'APROBAR_ETAPA',
            titulo: 'Aprobar Revisión de Tribunal Previa',
            descripcion: 'La aprobación cerrará esta etapa mediante el workflow y ejecutará la transición configurada.',
            estado: 'DISPONIBLE',
            estado_display: 'Disponible',
            destino: '#resumen',
            accion_label: 'Aprobar Revisión de Tribunal Previa',
          },
        },
      },
    }
    const privateStage = { id: 5, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', acciones_permitidas: ['observar', 'rechazar'] }
    const afterApprovalResponse = {
      ...approvableResponse,
      flujo: {
        ...approvableResponse.flujo,
        etapa_actual: privateStage,
        etapas: [...approvableResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? { ...stage, estado: 'APROBADA', acciones_permitidas: [] } : stage), privateStage],
        orientacion_etapa_actual: {
          operacion: 'PROGRAMAR_EVENTO',
          mensaje: 'Los actores están listos para programar la defensa privada.',
          requisitos: [],
          siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Privada', descripcion: 'Programa el evento según el workflow.', estado: 'DISPONIBLE', destino: '#defensas' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(approvableResponse).mockResolvedValue(afterApprovalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([{
      id: 771,
      seguimiento_etapa: approvableStage.id,
      numero_version_revisada: 1,
      resultado: 'SUFICIENTE',
      resultado_display: 'Suficiente',
      evidencia_version: 602,
      evidencia_nombre_original: 'informe-tribunal.pdf',
      activo: true,
    }])
    const auth = {
      user: { id: 9 },
      hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_seguimiento'].includes(name),
    }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const approveButton = await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })
    const orientationLabel = screen.getByText('Orientación del expediente')
    const orientationCard = orientationLabel.parentElement
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(within(orientationCard).getByText('Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.')).toBeInTheDocument()
    expect(within(orientationCard).getByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBe(approveButton)
    expect(screen.getAllByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toHaveLength(1)
    await userEvent.click(approveButton)
    await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(approvableStage.id, expect.any(AbortSignal)))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Los actores están listos para programar la defensa privada.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#resumen')
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })

  it('muestra orientación informativa pero no aprobación a un usuario sin permiso', async () => {
    const readOnlyStage = { ...tribunalStage, acciones_permitidas: [] }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: readOnlyStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === readOnlyStage.id ? readOnlyStage : stage),
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'La etapa está en curso. Las acciones administrativas corresponden al personal responsable.',
          requisitos: [],
          siguiente_accion: null,
        },
      },
    })
    const auth = { user: { id: 55 }, hasPermission: () => false }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const orientation = (await screen.findByText('Orientación del expediente')).parentElement
    expect(await within(orientation).findByText(/acciones administrativas corresponden al personal responsable/i)).toBeInTheDocument()
    expect(within(orientation).queryByRole('button', { name: /aprobar/i })).not.toBeInTheDocument()
  })

  it('refresca acciones tras rechazo concurrente y retira una aprobación que dejó de estar permitida', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const approvableStage = { ...tribunalStage, acciones_permitidas: ['aprobar', 'observar', 'rechazar'] }
    const approvableResponse = {
      ...tribunalResponse,
      flujo: {
        ...tribunalResponse.flujo,
        etapa_actual: approvableStage,
        etapas: tribunalResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id ? approvableStage : stage),
        orientacion_etapa_actual: {
          mensaje: 'Los requisitos de esta etapa están cumplidos.',
          requisitos: [],
          siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Revisión de Tribunal Previa', estado: 'DISPONIBLE', accion_label: 'Aprobar Revisión de Tribunal Previa' },
        },
      },
    }
    const blockedResponse = {
      ...approvableResponse,
      flujo: {
        ...approvableResponse.flujo,
        etapa_actual: { ...approvableStage, acciones_permitidas: ['observar', 'rechazar'] },
        etapas: approvableResponse.flujo.etapas.map((stage) => stage.id === approvableStage.id
          ? { ...stage, acciones_permitidas: ['observar', 'rechazar'] }
          : stage),
        orientacion_etapa_actual: {
          mensaje: 'El informe dejó de cumplir las condiciones de aprobación.',
          requisitos: [{ tipo: 'DOCUMENTO', codigo: 'EVIDENCIA_INFORME_TRIBUNAL_VIGENTE', nombre: 'Evidencia vigente', cumplido: false }],
          siguiente_accion: { codigo: 'ACTUALIZAR_INFORME_TRIBUNAL', titulo: 'Actualizar informe del tribunal', estado: 'PENDIENTE', destino: '#informes-etapa' },
        },
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(approvableResponse).mockResolvedValue(blockedResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.aprobarEtapa.mockRejectedValue({ status: 400, message: 'El informe ya no cumple las condiciones.' })
    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_gestionar_seguimiento'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' }))
    await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(approvableStage.id, expect.any(AbortSignal)))
    expect(await screen.findAllByText('El informe dejó de cumplir las condiciones de aprobación.')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })

  it('exige observaciones para INSUFICIENTE y evita el doble envío', async () => {
    const user = userEvent.setup()
    let resolveRequest
    postulacionesService.registrarInformeRevisionTribunal.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    renderWorkflowManagerPage()
    await user.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await user.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await user.selectOptions(within(dialog).getByLabelText('Resultado'), 'INSUFICIENTE')
    await user.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    const form = within(dialog).getByRole('button', { name: 'Registrar informe' }).closest('form')
    fireEvent.submit(form)
    expect(await within(dialog).findByText(/observaciones son obligatorias/i)).toBeInTheDocument()
    expect(postulacionesService.registrarInformeRevisionTribunal).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByLabelText(/Observaciones/), { target: { value: 'Corregir resultados' } })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledTimes(1)
    await act(async () => resolveRequest({ id: 9 }))
  })

  it('muestra historial ordenado y descarga la evidencia protegida', async () => {
    definePropertyForTest(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:tribunal') })
    definePropertyForTest(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue(tribunalHistory)
    renderWorkflowManagerPage()
    await waitFor(() => expect(postulacionesService.obtenerInformesRevisionTribunal).toHaveBeenCalledWith(4, expect.any(AbortSignal)))
    const sufficient = await screen.findByRole('heading', { name: 'Suficiente' })
    const insufficient = screen.getByRole('heading', { name: 'Insuficiente' })
    expect(sufficient.compareDocumentPosition(insufficient) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Versión conforme')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Descargar evidencia' })[0])
    await waitFor(() => expect(postulacionesService.descargarVersion).toHaveBeenCalledWith(602, 'informe-tribunal.pdf'))
    vi.restoreAllMocks()
  })

  it('muestra una sola alerta general y orientación amigable para tribunal incompleto con enlace a actores', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 2, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 3, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
    ])
    postulacionesService.registrarInformeRevisionTribunal.mockRejectedValue({
      status: 400,
      message: 'REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con órdenes 1, 2 y 3.',
      fields: {
        detail: ['REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con órdenes 1, 2 y 3.'],
        non_field_errors: ['REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con órdenes 1, 2 y 3.'],
      },
    })

    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    expect(await within(dialog).findByText('Falta completar el tribunal. Para registrar el informe deben estar vigentes Tribunal 1, Tribunal 2 y Tribunal 3.')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('alert')).toHaveLength(1)
    expect(within(dialog).getByText('Tribunal incompleto: falta Tribunal 3.')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Ir a actores' })).toHaveAttribute('href', '#actores')
    expect(within(dialog).getByRole('button', { name: 'Registrar informe' })).toBeEnabled()
  })

  it('asigna el tribunal faltante dentro del mismo modal y conserva el borrador del informe', async () => {
    const initialTribunals = [
      { id: 21, usuario: 51, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 22, usuario: 52, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
    ]
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerTribunalesActivos
      .mockResolvedValueOnce(initialTribunals)
      .mockResolvedValueOnce([...initialTribunals, { id: 23, usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, activo: true }])

    const { container } = renderWorkflowAssignmentManagerPage('informes-etapa')
    await waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('EXP-007'))
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
      await Promise.resolve()
    })
    let dialog = container.querySelector('[role="dialog"][aria-label="Registrar informe del tribunal"]')
    expect(dialog).not.toBeNull()
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
      fireEvent.change(within(dialog).getByLabelText('Evidencia'), { target: { value: '602' } })
      fireEvent.change(within(dialog).getByLabelText(/Observaciones/), { target: { value: 'Ninguna' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Asignar Tribunal 3' }))
      await Promise.resolve()
    })

    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    dialog = container.querySelector('[role="dialog"][aria-label="Registrar informe del tribunal"]')
    expect(within(dialog).getByRole('heading', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal')).toBeInTheDocument()
    expect(within(dialog).getByText('Revisión de Tribunal Previa')).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal 3')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de participación')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa asociada (opcional)')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Orden del tribunal')).not.toBeInTheDocument()

    const candidateSelector = within(dialog).getByLabelText('Candidato')
    await within(candidateSelector).findByRole('option', { name: /Johnny Rosas/ })
    await act(async () => {
      fireEvent.change(candidateSelector, { target: { value: '41' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Volver al informe' }))
      await Promise.resolve()
    })
    expect(within(dialog).getByLabelText('Resultado')).toHaveValue('SUFICIENTE')
    expect(within(dialog).getByLabelText('Evidencia')).toHaveValue('602')
    expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue('Ninguna')

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Asignar Tribunal 3' }))
      await Promise.resolve()
    })
    const reopenedCandidateSelector = within(dialog).getByLabelText('Candidato')
    await within(reopenedCandidateSelector).findByRole('option', { name: /Johnny Rosas/ })
    await act(async () => {
      fireEvent.change(reopenedCandidateSelector, { target: { value: '41' } })
      await Promise.resolve()
    })
    const confirmAssignment = within(dialog).getByRole('button', { name: 'Confirmar asignación' })
    await act(async () => {
      fireEvent.click(confirmAssignment)
      fireEvent.click(confirmAssignment)
      await Promise.resolve()
    })

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', seguimiento_etapa: 4, orden_cargo: 3, observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerTribunalesActivos).toHaveBeenCalledTimes(2))
    expect(within(dialog).getByLabelText('Resultado')).toHaveValue('SUFICIENTE')
    expect(within(dialog).getByLabelText('Evidencia')).toHaveValue('602')
    expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue('Ninguna')
    expect(within(dialog).queryByText(/Tribunal incompleto/)).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
      await Promise.resolve()
    })
    await waitFor(() => expect(postulacionesService.registrarInformeRevisionTribunal).toHaveBeenCalledWith(4, {
      version_documento_revisada: 601, resultado: 'SUFICIENTE', observaciones: 'Ninguna', evidencia_version: 602,
    }, expect.any(AbortSignal)))
  })

  it('mantiene la vista contextual y el candidato cuando falla la asignación', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerTribunalesActivos.mockResolvedValue([
      { id: 21, usuario: 51, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true },
      { id: 22, usuario: 52, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true },
    ])
    postulacionesService.asignarActor.mockRejectedValue({ status: 400, message: 'El candidato ya está asignado.', fields: { usuario: ['El candidato ya está asignado.'] } })
    renderWorkflowAssignmentManagerPage('informes-etapa')
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 3' }))
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    expect((await within(dialog).findAllByText('El candidato ya está asignado.')).length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('heading', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox')).toHaveValue('41')
  })

  it('muestra el siguiente orden faltante después del refresco canónico', async () => {
    const tribunalOne = { id: 21, usuario: 51, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.obtenerTribunalesActivos
      .mockResolvedValueOnce([tribunalOne])
      .mockResolvedValueOnce([tribunalOne, { id: 22, usuario: 41, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, activo: true }])
    renderWorkflowAssignmentManagerPage('informes-etapa')
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 2' }))
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    expect(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, expect.objectContaining({ orden_cargo: 2 }), expect.any(AbortSignal))
  })

  it('preserva el mensaje original del backend cuando el error no es el patrón de tribunal incompleto', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue(tribunalDocuments)
    postulacionesService.registrarInformeRevisionTribunal.mockRejectedValue({
      status: 400,
      message: 'Error extraño del backend no reconocido.',
      fields: {
        detail: ['Error extraño del backend no reconocido.'],
        non_field_errors: ['Error extraño del backend no reconocido.'],
      },
    })

    renderWorkflowManagerPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    fireEvent.change(within(dialog).getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
    fireEvent.change(within(dialog).getByLabelText('Evidencia'), { target: { value: '602' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

    expect(await within(dialog).findByText('Error extraño del backend no reconocido.')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('alert')).toHaveLength(1)
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
    await userEvent.click(await screen.findByRole('tab', { name: 'Resumen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    fireEvent.change(within(dialog).getByLabelText('Resultado'), { target: { value: 'SUFICIENTE' } })
    fireEvent.change(within(dialog).getByLabelText('Evidencia'), { target: { value: '602' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    if (fieldText) expect(within(dialog).getByText(fieldText)).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
  })

  it.each([true, false])('orienta al cierre técnico con workflow completo aunque puede_concluir sea %s', async (puedeConcluir) => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({
      id: 100 + index,
      codigo: `ETAPA_${index + 1}`,
      nombre: index === 7 ? 'Cierre Documental' : `Etapa ${index + 1}`,
      estado: 'APROBADA',
      activo: true,
    }))
    const pendingClosure = {
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: completedStages.at(-1),
        porcentaje_avance: 100,
        etapas: completedStages,
        orientacion_etapa_actual: null,
      },
      cierre: {
        data: {
          ...closureResponse,
          estado_general: 'EN_PROCESO',
          etapa_actual: null,
          cierre_documental_aprobado: true,
          concluida: false,
          puede_concluir: puedeConcluir,
        },
        error: '',
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(pendingClosure)
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: true })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Flujo académico completado' })).toBeInTheDocument()
    expect(screen.getByText('8 de 8 etapas completadas · 100% de etapas')).toBeInTheDocument()
    expect(screen.getByText(/aún está en proceso y requiere completar el cierre técnico/i)).toBeInTheDocument()
    expect(screen.queryByText('No existe una etapa actual disponible.')).not.toBeInTheDocument()
    const manageClosure = screen.getByRole('link', { name: 'Gestionar cierre técnico' })
    expect(manageClosure).toHaveAttribute('href', '#condiciones-tecnicas')
    await userEvent.click(manageClosure)
    expect(window.location.hash).toBe('#condiciones-tecnicas')
  })

  it('mantiene el estado concluido con prioridad sobre la orientación de cierre', async () => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({ id: 200 + index, codigo: `ETAPA_${index + 1}`, nombre: `Etapa ${index + 1}`, estado: 'APROBADA', activo: true }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: completedStages.at(-1), porcentaje_avance: 100, etapas: completedStages, orientacion_etapa_actual: null },
      cierre: { data: { ...closureResponse, estado_general: 'CONCLUIDA', cierre_documental_aprobado: true, concluida: true }, error: '' },
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue({ soportada: true, configuracion_valida: true, cierre_soportado: true })

    renderPage()

    expect(await screen.findByText('✓ Expediente concluido')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar cierre técnico' })).not.toBeInTheDocument()
  })

  it.each([
    ['cierre no soportado', { soportada: true, configuracion_valida: true, cierre_soportado: false }, { data: { ...closureResponse, cierre_documental_aprobado: true, concluida: false }, error: '' }],
    ['payload de cierre no disponible', { soportada: true, configuracion_valida: true, cierre_soportado: true }, { data: null, error: 'Estado de cierre técnico todavía no disponible' }],
  ])('conserva el fallback seguro cuando %s', async (_case, capabilities, cierre) => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({ id: 300 + index, codigo: `ETAPA_${index + 1}`, nombre: `Etapa ${index + 1}`, estado: 'APROBADA', activo: true }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: completedStages.at(-1), porcentaje_avance: 100, etapas: completedStages, orientacion_etapa_actual: null },
      cierre,
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue(capabilities)

    renderPage()

    expect(await screen.findByText('No existe una etapa actual disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar cierre técnico' })).not.toBeInTheDocument()
  })

  it('aprueba revisión final con confirmación y refresh canónico sin navegación final', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const refreshed = { ...response, cierre: { data: { ...closureResponse, revision_final_aprobada: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: true }, error: '' } }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(response).mockResolvedValueOnce(refreshed)
    window.history.replaceState(window.history.state, '', '#condiciones-tecnicas')
    renderClosureManagerPage()
    await user.click(await screen.findByRole('button', { name: 'Aprobar revisión final' }))
    await user.type(screen.getByLabelText('Observaciones'), 'Revisión técnica completa')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(postulacionesService.aprobarRevisionFinal).toHaveBeenCalledWith(7, 'Revisión técnica completa', expect.any(AbortSignal)))
    expect(confirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Aprobada')).toBeInTheDocument()
    expect(window.location.hash).toBe('#condiciones-tecnicas')
    confirm.mockRestore()
  })

  it('concluye con refetch canónico demorado y restaura únicamente el resumen final', async () => {
    const readyToConclude = {
      ...response,
      cierre: { data: { ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: false, puede_concluir: true }, error: '' },
    }
    const concludedClosure = { ...readyToConclude.cierre.data, estado_general: 'CONCLUIDA', etapa_actual: null, concluida: true, puede_concluir: false }
    const concludedExpediente = {
      ...readyToConclude,
      detalle: { ...response.detalle, estado_actual_detalle: { codigo: 'CONCLUIDA', nombre: 'Concluida' } },
      flujo: { ...response.flujo, etapa_actual: null },
      cierre: { data: concludedClosure, error: '' },
    }
    const refreshedExpediente = deferred()
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce(readyToConclude)
      .mockReturnValueOnce(refreshedExpediente.promise)
    postulacionesService.concluirPostulacion.mockResolvedValue(concludedClosure)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const scrolledIds = []
    definePropertyForTest(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(function scrollIntoView() { scrolledIds.push(this.id) }),
    })
    window.history.replaceState(window.history.state, '', '#condiciones-tecnicas')
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Concluir técnicamente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(window.location.hash).toBe('#resumen')
    expect(screen.queryByText('✓ Expediente concluido')).not.toBeInTheDocument()
    expect(scrolledIds).toEqual([])

    await act(async () => refreshedExpediente.resolve(concludedExpediente))

    expect(await screen.findByText('✓ Expediente concluido')).toBeInTheDocument()
    expect(screen.getByText('Nota final: 84.00')).toBeInTheDocument()
    expect(screen.getAllByText('APROBACIÓN PLENA').length).toBeGreaterThan(0)
    expect(window.location.hash).toBe('#resumen')
    expect(scrolledIds).toEqual(['resumen'])
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

  describe('integración UX/UI de Tesis de Grado', () => {
    const thesisStageNames = {
      INSCRIPCION: 'Inscripción',
      TEMATICA_TESIS: 'Temática de Tesis',
      PERFIL_TESIS: 'Perfil de Tesis',
      DOCUMENTO_FINAL: 'Documento Final',
      REVISION_TUTOR: 'Revisión del Tutor',
      REVISION_TRIBUNAL: 'Revisión del Tribunal',
      DEFENSA_PRIVADA: 'Defensa Privada',
      DEFENSA_PUBLICA: 'Defensa Pública',
    }

    const thesisStageCodes = Object.keys(thesisStageNames)

    const thesisResponseFor = (stageCode, orientation, overrides = {}) => ({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        etapa_actual: {
          id: 200 + thesisStageCodes.indexOf(stageCode),
          codigo: stageCode,
          nombre: thesisStageNames[stageCode],
          estado: 'EN_PROCESO',
          numero_intento: 1,
          activo: true,
          acciones_permitidas: ['aprobar'],
        },
        porcentaje_avance: Math.round((thesisStageCodes.indexOf(stageCode) / thesisStageCodes.length) * 100),
        etapas: thesisStageCodes.map((code, index) => ({
          id: 200 + index,
          codigo: code,
          nombre: thesisStageNames[code],
          estado: index < thesisStageCodes.indexOf(stageCode) ? 'APROBADA' : code === stageCode ? 'EN_PROCESO' : 'PENDIENTE',
          numero_intento: 1,
          activo: true,
        })),
        orientacion_etapa_actual: orientation,
      },
      resultado: { data: null, error: '' },
      cierre: { data: null, error: '' },
      ...overrides,
    })

    const renderThesis = (hash = 'resumen', permissions = ['puede_cargar_documentos', 'puede_gestionar_asignaciones', 'puede_gestionar_defensas', 'puede_gestionar_evaluaciones', 'puede_gestionar_seguimiento', 'puede_gestionar_cierre'], postulacionId = 7) => {
      const auth = {
        user: { id: 9, rol: { codigo: 'ADM' } },
        roleCode: 'ADM',
        hasPermission: (name) => permissions.includes(name),
      }
      selectInitialTab(hash)
      return render(
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={['/postulaciones/' + postulacionId]}>
            <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      )
    }

    it.each([
      ['INSCRIPCION', 'Completar documentos'],
      ['TEMATICA_TESIS', 'Completar tribunales'],
      ['PERFIL_TESIS', 'Completar perfil de Tesis'],
      ['DOCUMENTO_FINAL', 'Completar documentos'],
      ['REVISION_TUTOR', 'Registrar dictamen del Tutor'],
      ['REVISION_TRIBUNAL', 'Registrar dictamen del Tribunal'],
      ['DEFENSA_PRIVADA', 'Gestionar defensa'],
      ['DEFENSA_PUBLICA', 'Programar Defensa Pública'],
    ])('presenta orientación y siguiente acción para %s', async (stageCode, expectedAction) => {
      const orientation = {
        mensaje: `Orientación de ${stageCode}.`,
        requisitos: [{ tipo: 'OPERATIVO', codigo: `${stageCode}_REQUISITO`, nombre: 'Requisito de prueba', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
        siguiente_accion: {
          codigo: stageCode === 'TEMATICA_TESIS' ? 'GESTIONAR_ACTORES' : 'COMPLETAR_DOCUMENTOS',
          titulo: expectedAction,
          descripcion: `Siguiente acción de ${stageCode}.`,
          estado: 'PENDIENTE',
          estado_display: 'Pendiente',
          destino: stageCode === 'TEMATICA_TESIS' ? '#actores' : '#documentos',
          accion_label: stageCode === 'TEMATICA_TESIS' ? 'Ir a actores' : 'Gestionar documentos',
        },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor(stageCode, orientation))
      renderThesis()

      expect(await screen.findByRole('heading', { name: thesisStageNames[stageCode] })).toBeInTheDocument()
      expect(screen.getByText(`Orientación de ${stageCode}.`)).toBeInTheDocument()
      expect(screen.getByText(expectedAction)).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
      expect(document.getElementById('panel-resumen')).toBeVisible()
    })

    it('muestra resolución académica pendiente para Temática insuficiente sin acción de aprobar', async () => {
      const message = 'La Temática obtuvo resultado INSUFICIENTE. La continuación requiere resolución académica conforme al Art. 44 del Reglamento de Tesis.'
      const orientation = {
        mensaje: message,
        requisitos: [{ tipo: 'ACADEMICO', codigo: 'RESOLUCION_ACADEMICA', nombre: 'Resolución académica conforme al Art. 44', cumplido: false, estado_display: 'Pendiente' }],
        siguiente_accion: {
          codigo: 'RESOLUCION_ACADEMICA_PENDIENTE',
          titulo: 'Resolución académica pendiente',
          descripcion: message,
          estado: 'PENDIENTE',
          estado_display: 'Pendiente',
          destino: null,
          accion_label: 'Pendiente de resolución académica',
        },
      }
      const thesisResponse = thesisResponseFor('TEMATICA_TESIS', orientation)
      thesisResponse.flujo.etapa_actual.acciones_permitidas = ['rechazar']
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponse)
      renderThesis()

      expect((await screen.findAllByText(message)).length).toBe(2)
      const nextAction = screen.getByText('Resolución académica pendiente')
        .closest('section[aria-labelledby="next-action-title"]')
      expect(nextAction).not.toBeNull()
      expect(within(nextAction).getByText('Pendiente')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
    })

    it('abre directamente documentos dinámicos de TG-2026-02 sin navegar y conserva el contexto al cerrar', async () => {
      const orientation = {
        mensaje: 'Carga los documentos de inscripción pendientes.',
        requisitos: [{ tipo: 'DOCUMENTO', codigo: 'CARTA_SOLICITUD', nombre: 'Carta de solicitud', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
        siguiente_accion: {
          codigo: 'COMPLETAR_DOCUMENTOS',
          titulo: 'Cargar documentos',
          descripcion: 'Completa los documentos de inscripción.',
          estado: 'PENDIENTE',
          destino: '#documentos',
          accion_label: 'Gestionar documentos',
        },
      }
      const thesis = thesisResponseFor('INSCRIPCION', orientation)
      thesis.detalle = { ...thesis.detalle, id: 53, codigo: 'TG-2026-02' }
      thesis.flujo.id = 53
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
        { id: 10, codigo: 'CARTA_SOLICITUD', nombre: 'Carta de Solicitud para Tesis', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
        { id: 11, codigo: 'MATRICULA_VIGENTE', nombre: 'Comprobante de Matrícula Vigente', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
        { id: 12, codigo: 'HISTORIAL_PRERREQ', nombre: 'Historial Académico de Prerrequisitos', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      ] })
      renderThesis('resumen', undefined, 53)

      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      expect(await within(dialog).findByLabelText('Carta de Solicitud para Tesis')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Comprobante de Matrícula Vigente')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Historial Académico de Prerrequisitos')).toBeInTheDocument()
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('53', expect.any(AbortSignal))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
      expect(window.location.hash).toBe('#resumen')
      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    })

    it.each(['vacía', 'completos', 'error'])('presenta respuesta documental %s al abrir directamente desde Tesis', async (mode) => {
      const orientation = {
        requisitos: [], siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', orientation))
      if (mode === 'error') postulacionesService.obtenerDocumentosAplicables.mockRejectedValue({ message: 'No se pudieron consultar los documentos aplicables.' })
      else postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: mode === 'vacía' ? [] : [
        { id: 10, codigo: 'CARTA_SOLICITUD', nombre: 'Carta aprobada', capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
      ] })
      renderThesis()
      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
      const dialog = screen.getByRole('dialog', { name: 'Cargar documentos' })
      if (mode === 'vacía') expect(await within(dialog).findByText('No hay tipos documentales activos disponibles.')).toBeInTheDocument()
      if (mode === 'error') expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudieron consultar los documentos aplicables.')
      if (mode === 'completos') {
        expect(await within(dialog).findByText('No hay documentos pendientes de carga o corrección permitida.')).toBeInTheDocument()
        expect(within(dialog).queryByLabelText('Carta aprobada')).not.toBeInTheDocument()
        expect(within(dialog).getByText('Aprobados (1)')).toBeInTheDocument()
      }
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('mantiene Cargar documento y no abre el modal automáticamente por hash en Tesis', async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', {
        requisitos: [], siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', estado: 'PENDIENTE', destino: '#documentos' },
      }))
      renderThesis('documentos')
      const button = await screen.findByRole('button', { name: 'Cargar documento' })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
      await userEvent.click(button)
      await screen.findByRole('dialog', { name: 'Cargar documentos' })
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(document.activeElement).toBe(button)
      expect(window.location.hash).toBe('#documentos')
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
      await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
    })

    it.each(['sin permiso', 'otra acción'])('no abre la carga documental de Tesis con %s', async (mode) => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', {
        requisitos: [], siguiente_accion: { codigo: mode === 'otra acción' ? 'APROBAR_ETAPA' : 'COMPLETAR_DOCUMENTOS', titulo: 'Siguiente paso', estado: 'DISPONIBLE', destino: '#documentos' },
      }))
      renderThesis('resumen', mode === 'sin permiso' ? [] : undefined)
      await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })
      expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    })

    it('conserva la navegación documental de Tesis para acciones sin apertura directa', async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', {
        requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DOCUMENTOS', titulo: 'Consultar documentos', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
      }))
      renderThesis()
      await userEvent.click(await screen.findByRole('link', { name: 'Ir a documentos' }))
      expect(window.location.hash).toBe('#documentos')
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    })

    it('abre y cierra la gestión de tribunales de Temática desde la orientación', async () => {
      const orientation = {
        mensaje: 'Designa los tres tribunales requeridos para la temática.',
        requisitos: [{ tipo: 'OPERATIVO', codigo: 'TRIBUNALES', nombre: 'Tribunales', cumplido: false, estado_display: '0/3', destino: '#actores' }],
        siguiente_accion: {
          codigo: 'GESTIONAR_ACTORES',
          titulo: 'Completar tribunales',
          descripcion: 'Designa los tres tribunales requeridos para la temática.',
          estado: 'PENDIENTE',
          destino: '#actores',
          accion_label: 'Ir a actores',
        },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('TEMATICA_TESIS', orientation, {
        flujo: {
          ...thesisResponseFor('TEMATICA_TESIS', orientation).flujo,
          gestion_actores: {
            contexto: { seguimiento_etapa: 201, etapa_codigo: 'TEMATICA_TESIS', etapa_nombre: 'Temática de Tesis' },
            posiciones: [
              { clave: 'TRIBUNAL_1', nombre: 'Tribunal 1', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, ambito: 'ETAPA', seguimiento_etapa: 201, estado_ocupacion: 'PENDIENTE', acciones_permitidas: ['ASIGNAR'], habilitada: true },
            ],
          },
        },
      }))
      postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
      renderThesis()

      await userEvent.click(await screen.findByRole('link', { name: 'Ir a actores' }))
      expect(window.location.hash).toBe('#actores')
      expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
      await userEvent.click(screen.getByRole('button', { name: 'Gestionar actores' }))
      const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Temática de Tesis' })
      expect(within(dialog).getByRole('heading', { name: 'Tribunal 1' })).toBeInTheDocument()
      await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Temática de Tesis' })).not.toBeInTheDocument())
      expect(window.location.hash).toBe('#actores')
    })

    it('muestra el estado vacío de defensas y el error de carga sin ocultar la orientación', async () => {
      const orientation = {
        mensaje: 'La defensa privada todavía no está programada.',
        requisitos: [{ tipo: 'OPERATIVO', codigo: 'DEFENSA', nombre: 'Estado de la defensa', cumplido: false, estado_display: 'Pendiente', destino: '#defensas' }],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Programa la defensa privada.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a defensas' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PRIVADA', orientation))
      postulacionesService.obtenerDefensas.mockRejectedValue(new Error('No se pudo cargar defensas'))
      renderThesis()

      expect(await screen.findByText('La defensa privada todavía no está programada.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('link', { name: 'Ir a defensas' }))
      expect(window.location.hash).toBe('#defensas')
      expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
      expect((await screen.findAllByRole('alert')).some((item) => item.textContent.includes('No se pudo cargar defensas'))).toBe(true)
    })

    it('muestra conclusión académica de Tesis después de Defensa Pública aprobada y acta válida', async () => {
      const publicStage = {
        id: 207,
        codigo: 'DEFENSA_PUBLICA',
        nombre: 'Defensa Pública',
        estado: 'APROBADA',
        numero_intento: 1,
        activo: true,
      }
      const acta = {
        id: 501,
        tipo_documento_codigo: 'ACTA_DEFENSA',
        tipo_documento_nombre: 'Acta de Defensa',
        estado_codigo: 'APR',
        requiere_correccion: false,
        evento_defensa: 81,
        activo: true,
        versiones: [{ id: 502, es_version_actual: true, activo: true }],
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', {
        mensaje: 'Defensa Pública aprobada.',
        requisitos: [],
        siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar etapa', descripcion: 'Resultado consolidado.', estado: 'DISPONIBLE', destino: '#resumen' },
      }, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({ id: 200 + index, codigo: code, nombre: thesisStageNames[code], estado: 'APROBADA', activo: true })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [acta] })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{ ...defenseRows[0], seguimiento_etapa: publicStage.id }],
      })
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeEnabled()
      expect(screen.getByText(/Acta de Defensa vigente vinculada/)).toBeInTheDocument()
    })

    it('no considera válida el acta aprobada del intento público anterior', async () => {
      const oldPublicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'RECHAZADA', numero_intento: 1, activo: true }
      const currentPublicStage = { id: 208, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 2, activo: true }
      const currentResponse = thesisResponseFor('DEFENSA_PUBLICA', {}, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: currentPublicStage,
          etapas: [
            ...thesisStageCodes.map((code, index) => ({
              id: code === 'DEFENSA_PUBLICA' ? oldPublicStage.id : 200 + index,
              codigo: code,
              nombre: thesisStageNames[code],
              estado: code === 'DEFENSA_PUBLICA' ? oldPublicStage.estado : 'APROBADA',
              numero_intento: 1,
              activo: true,
            })),
            currentPublicStage,
          ],
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(currentResponse)
      postulacionesService.obtenerDocumentos.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{
          id: 501, tipo_documento_codigo: 'ACTA_DEFENSA', estado_codigo: 'APR',
          requiere_correccion: false, evento_defensa: 81, activo: true,
          versiones: [{ id: 502, es_version_actual: true, activo: true }],
        }],
      })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 2, next: null, previous: null,
        results: [
          { ...defenseRows[0], id: 81, seguimiento_etapa: oldPublicStage.id },
          { ...defenseRows[0], id: 88, seguimiento_etapa: currentPublicStage.id },
        ],
      })
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeDisabled()
      expect(screen.getByText(/El Acta de Defensa vigente debe estar aprobada y vinculada/)).toBeInTheDocument()
    })

    it('no habilita la conclusión cuando el intento público aprobado actual no tiene acta', async () => {
      const publicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', {}, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({
            id: 200 + index, codigo: code, nombre: thesisStageNames[code],
            estado: 'APROBADA', numero_intento: 1, activo: true,
          })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{ ...defenseRows[0], seguimiento_etapa: publicStage.id }],
      })
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeDisabled()
      expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
    })

    it('no ofrece concluir cuando la postulación ya está concluida', async () => {
      const publicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true }
      const concludedResponse = thesisResponseFor('DEFENSA_PUBLICA', {}, {
        detalle: {
          ...response.detalle,
          modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
          estado_actual_detalle: { id: 5, codigo: 'CONCLUIDA', nombre: 'Concluida' },
        },
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({
            id: 200 + index, codigo: code, nombre: thesisStageNames[code],
            estado: 'APROBADA', numero_intento: 1, activo: true,
          })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(concludedResponse)
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
      expect(screen.getByText('La postulación ya está concluida académicamente.')).toBeInTheDocument()
      expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
    })

    it('evita envíos duplicados mientras la conclusión está pendiente', async () => {
      const pendingConclusion = deferred()
      const publicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', {}, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({
            id: 200 + index, codigo: code, nombre: thesisStageNames[code],
            estado: 'APROBADA', numero_intento: 1, activo: true,
          })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{
          id: 501, tipo_documento_codigo: 'ACTA_DEFENSA', estado_codigo: 'APR',
          requiere_correccion: false, evento_defensa: 81, activo: true,
          versiones: [{ id: 502, es_version_actual: true, activo: true }],
        }],
      })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{ ...defenseRows[0], seguimiento_etapa: publicStage.id }],
      })
      postulacionesService.concluirAcademicamente.mockReturnValue(pendingConclusion.promise)
      renderThesis('resultado-y-cierre')

      const concludeButton = await screen.findByRole('button', { name: 'Concluir académicamente' })
      await userEvent.click(concludeButton)
      await userEvent.click(concludeButton)

      expect(postulacionesService.concluirAcademicamente).toHaveBeenCalledTimes(1)
      pendingConclusion.resolve({})
      expect(await screen.findByText('La postulación ya está concluida académicamente.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: 'Concluir académicamente' }))
      expect(postulacionesService.concluirAcademicamente).toHaveBeenCalledTimes(1)
    })

    it('integra el dictamen del Tutor, refresca el expediente y conserva Documentos', async () => {
      const tutorStage = { id: 210, codigo: 'REVISION_TUTOR', nombre: 'Revisión del Tutor', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        mensaje: 'Registra el dictamen del Tutor sobre el Documento Final.',
        requisitos: [{ tipo: 'DOCUMENTO', codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe del Tutor', cumplido: true, estado_display: 'Cumplido', destino: '#documentos' }],
        siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN_TUTOR', titulo: 'Registrar dictamen del Tutor', descripcion: 'Registra el dictamen.', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Registrar dictamen del Tutor' },
      }
      const tutorResponse = thesisResponseFor('REVISION_TUTOR', orientation, {
        flujo: {
          ...thesisResponseFor('REVISION_TUTOR', orientation).flujo,
          etapas: [tutorStage],
          etapa_actual: tutorStage,
          gestion_actores: { contexto: { seguimiento_etapa: 210, etapa_codigo: 'REVISION_TUTOR' }, posiciones: [] },
        },
      })
      const refreshed = { ...tutorResponse, flujo: { ...tutorResponse.flujo, orientacion_etapa_actual: { ...orientation, siguiente_accion: { ...orientation.siguiente_accion, estado: 'PENDIENTE', titulo: 'Esperar revisión del Tutor' } } } }
      postulacionesService.obtenerExpediente.mockResolvedValueOnce(tutorResponse).mockResolvedValue(refreshed)
      postulacionesService.obtenerDocumentos.mockResolvedValue({
        count: 3, next: null, previous: null, results: [
          { id: 501, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 2, es_version_actual: true, activo: true }] },
          { id: 502, tipo_documento_codigo: 'INFORME_TUTOR_TESIS', tipo_documento_nombre: 'Informe del Tutor', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tutor.pdf', es_version_actual: true, activo: true }] },
        ],
      })
      postulacionesService.obtenerActores.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 701, tipo_participacion: 'TUTOR', usuario_nombre: 'Dra. Tutor', activo: true }] })
      postulacionesService.obtenerDictamenesRevision.mockResolvedValue([])
      postulacionesService.registrarDictamenRevision.mockResolvedValue({ id: 801 })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
      selectInitialTab('documentos')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

      const panel = await screen.findByRole('tabpanel', { name: 'Documentos' })
      const opener = await within(panel).findByRole('button', { name: 'Registrar dictamen' })
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(window.location.hash).toBe('#documentos')
      await userEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
      await userEvent.selectOptions(within(dialog).getByLabelText('Tutor'), '701')
      await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))

      await waitFor(() => expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1))
      expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(210, expect.objectContaining({ tipo_revision: 'TUTOR', version_documento_revisada: 601, evidencia_version: 602, resultado: 'SUFICIENTE', asignacion_emisora: 701 }), expect.any(AbortSignal))
      await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
      expect(window.location.hash).toBe('#documentos')
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(document.getElementById('panel-documentos')).toBeVisible()
      expect(screen.getByText('Esperar revisión del Tutor')).toBeInTheDocument()
    })

    it('integra el error del dictamen del Tutor sin duplicar solicitudes ni cambiar de panel', async () => {
      const tutorStage = { id: 211, codigo: 'REVISION_TUTOR', nombre: 'Revisión del Tutor', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = { mensaje: 'Registra el dictamen del Tutor.', requisitos: [], siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN_TUTOR', titulo: 'Registrar dictamen del Tutor', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Registrar dictamen del Tutor' } }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('REVISION_TUTOR', orientation, { flujo: { ...thesisResponseFor('REVISION_TUTOR', orientation).flujo, etapas: [tutorStage], etapa_actual: tutorStage } }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, next: null, previous: null, results: [
        { id: 511, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 611, numero_version: 1, es_version_actual: true, activo: true }] },
        { id: 512, tipo_documento_codigo: 'INFORME_TUTOR_TESIS', tipo_documento_nombre: 'Informe del Tutor', activo: true, versiones: [{ id: 612, numero_version: 1, es_version_actual: true, activo: true }] },
      ] })
      postulacionesService.obtenerActores.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 711, tipo_participacion: 'TUTOR', usuario_nombre: 'Dra. Tutor', activo: true }] })
      postulacionesService.obtenerDictamenesRevision.mockResolvedValue([])
      postulacionesService.registrarDictamenRevision.mockRejectedValue({ message: 'La evidencia no es vigente.', fields: { evidencia_version: ['Selecciona una evidencia vigente.'] } })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
      selectInitialTab('documentos')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
      const panel = await screen.findByRole('tabpanel', { name: 'Documentos' })
      const opener = await within(panel).findByRole('button', { name: 'Registrar dictamen' })
      await userEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
      await userEvent.selectOptions(within(dialog).getByLabelText('Tutor'), '711')
      await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '612')
      const submit = within(dialog).getByRole('button', { name: 'Registrar' })
      await userEvent.click(submit)
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('La evidencia no es vigente.')
      expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1)
      expect(window.location.hash).toBe('#documentos')
      expect(document.getElementById('panel-documentos')).toBeVisible()
    })

    it('integra el dictamen del Tribunal, conserva histórico y actualiza la orientación', async () => {
      const tribunalStage = { id: 212, codigo: 'REVISION_TRIBUNAL', nombre: 'Revisión del Tribunal', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        mensaje: 'Registra el dictamen del Tribunal.',
        requisitos: [],
        siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN_TRIBUNAL', titulo: 'Registrar dictamen del Tribunal', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Registrar dictamen del Tribunal' },
      }
      const tribunalResponse = thesisResponseFor('REVISION_TRIBUNAL', orientation, {
        flujo: { ...thesisResponseFor('REVISION_TRIBUNAL', orientation).flujo, etapas: [tribunalStage], etapa_actual: tribunalStage },
      })
      const refreshed = { ...tribunalResponse, flujo: { ...tribunalResponse.flujo, orientacion_etapa_actual: { ...orientation, siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Privada', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a defensas' } } } }
      postulacionesService.obtenerExpediente.mockResolvedValueOnce(tribunalResponse).mockResolvedValue(refreshed)
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, next: null, previous: null, results: [
        { id: 521, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 621, numero_version: 2, es_version_actual: true, activo: true }] },
        { id: 522, tipo_documento_codigo: 'INFORME_TRIB_TESIS', tipo_documento_nombre: 'Informe del Tribunal', activo: true, versiones: [{ id: 622, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
      ] })
      postulacionesService.obtenerActores.mockResolvedValue({ count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({ id: 720 + order, tipo_participacion: 'TRIBUNAL', orden_cargo: order, usuario_nombre: `Tribunal ${order}`, activo: true })) })
      postulacionesService.obtenerDictamenesRevision.mockResolvedValue([{ id: 901, tipo_revision: 'TRIBUNAL', resultado: 'INSUFICIENTE', resultado_display: 'Insuficiente', version_documento_revisada: 1, evidencia_version: 619, evidencia_version_nombre: 'informe-anterior.pdf', activo: false, observaciones: 'Histórico' }])
      postulacionesService.registrarDictamenRevision.mockResolvedValue({ id: 902 })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
      selectInitialTab('documentos')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
      const panel = await screen.findByRole('tabpanel', { name: 'Documentos' })
      expect(await within(panel).findAllByText('Histórico')).toHaveLength(2)
      const opener = within(panel).getByRole('button', { name: 'Registrar dictamen' })
      await userEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })
      await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '622')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
      await waitFor(() => expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1))
      expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(212, expect.objectContaining({ tipo_revision: 'TRIBUNAL', version_documento_revisada: 621, evidencia_version: 622, resultado: 'SUFICIENTE' }), expect.any(AbortSignal))
      await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
      expect(window.location.hash).toBe('#documentos')
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Programar Defensa Privada')).toBeInTheDocument()
    })

    it.each([
      ['TEMATICA_TESIS', 'DEFENSA_TEMATICA', 'resumen', 1],
      ['PERFIL_TESIS', 'DEFENSA_PERFIL', 'defensas', 2],
      ['DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 'resumen', 2],
      ['DEFENSA_PUBLICA', 'DEFENSA_PUBLICA', 'defensas', 1],
    ])('programa Tesis contextual %s desde %s con intento correcto', async (stageCode, eventType, origin, attempt) => {
      const orientation = {
        tipo_evento: eventType, requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Abrir programación contextual' },
      }
      const thesis = thesisResponseFor(stageCode, orientation)
      thesis.flujo.etapa_actual.numero_intento = attempt
      thesis.flujo.etapas.find((s) => s.codigo === stageCode).numero_intento = attempt
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      let rejectRequest
      postulacionesService.programarDefensa.mockImplementation(() => new Promise((resolve, reject) => { rejectRequest = reject }))
      renderThesis(origin)
      const button = origin === 'resumen'
        ? await screen.findByRole('button', { name: 'Abrir programación contextual' })
        : await screen.findByRole('button', { name: /^Programar Defensa/i })
      await userEvent.click(button)
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText(new RegExp('Intento ' + attempt))).toBeInTheDocument()
      expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
      fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-10-26T14:00' } })
      fireEvent.change(within(dialog).getByLabelText('Lugar'), { target: { value: 'Sala de Tesis' } })
      const submit = within(dialog).getByRole('button', { name: /^Programar Defensa/i })
      fireEvent.click(submit)
      fireEvent.click(submit)
      expect(postulacionesService.programarDefensa).toHaveBeenCalledTimes(1)
      expect(submit).toBeDisabled()
      expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
        seguimiento_etapa: thesis.flujo.etapa_actual.id, tipo_evento: eventType,
        fecha_programada: '2026-10-26T14:00', lugar: 'Sala de Tesis', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: '',
      }, expect.any(AbortSignal))
      await act(async () => { rejectRequest({ message: 'Gate académico pendiente.', fields: { fecha_programada: ['Fecha no permitida.'] } }) })
      expect(within(dialog).getByText('Gate académico pendiente.')).toBeInTheDocument()
      expect(within(dialog).getByText('Fecha no permitida.')).toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it.each(['incompleto', 'ambiguo', 'incompatible'])('conserva fallback genérico de Tesis con contexto %s', async (mode) => {
      const orientation = {
        ...(mode === 'incompleto' ? {} : { tipo_evento: mode === 'incompatible' ? 'DEFENSA_PUBLICA' : 'DEFENSA_PRIVADA' }),
        requisitos: [], siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation)
      if (mode === 'ambiguo') thesis.flujo.etapas.push({ ...thesis.flujo.etapa_actual, id: 999, numero_intento: 2 })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      renderThesis('defensas')
      await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
      const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
      expect(within(dialog).getByLabelText('Tipo de defensa')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Etapa compatible')).toBeInTheDocument()
    })

    it.each(['permiso', 'gate', 'defensa existente'])('no permite programar Tesis con %s', async (reason) => {
      const orientation = {
        tipo_evento: 'DEFENSA_PRIVADA', requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: reason === 'gate' ? 'PENDIENTE' : 'DISPONIBLE', destino: '#defensas' },
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation)
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      if (reason === 'defensa existente') postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, results: [{ id: 99, seguimiento_etapa: thesis.flujo.etapa_actual.id, tipo_evento: 'DEFENSA_PRIVADA', estado: 'PROGRAMADA', numero_intento: 1, activo: true }] })
      renderThesis('defensas', reason === 'permiso' ? [] : undefined)
      await screen.findByRole('tab', { name: 'Defensas' })
      await waitFor(() => expect(document.getElementById('panel-defensas')).toBeVisible())
      expect(within(document.getElementById('panel-defensas')).queryByRole('button', { name: /^Programar/i })).not.toBeInTheDocument()
      expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
    })

    it('integra la programación de Defensa Privada de Tesis y conserva el contexto de Defensas', async () => {
      const privateStage = { id: 213, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        tipo_evento: 'DEFENSA_PRIVADA',
        mensaje: 'La Defensa Privada está lista para programarse.',
        requisitos: [
          { tipo: 'ACTOR', codigo: 'TRIBUNAL', actual: 2, minimo: 2, cumplido: true, estado_display: '2/2 cumplido' },
          { tipo: 'ACTOR', codigo: 'DOCENTE_MODALIDAD', actual: 1, minimo: 1, cumplido: true, estado_display: '1/1 cumplido' },
        ],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Privada', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Programar Defensa Privada' },
      }
      const privateDefense = {
        id: 214, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA',
        tipo_display: 'Defensa privada', numero_intento: 1, estado: 'PROGRAMADA', estado_display: 'Programada',
        fecha_programada: '2026-10-22T14:00:00Z', lugar: 'Sala privada', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PRIVADA', etapa_nombre: 'Defensa Privada', participantes: [], evaluaciones: [], resultado_consolidado: null,
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation, {
        flujo: { ...thesisResponseFor('DEFENSA_PRIVADA', orientation).flujo, etapas: [privateStage], etapa_actual: privateStage },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      let programmed = false
      postulacionesService.obtenerDefensas.mockImplementation(() => Promise.resolve({
        count: programmed ? 1 : 0, next: null, previous: null, results: programmed ? [privateDefense] : [],
      }))
      postulacionesService.programarDefensa.mockImplementation(async () => {
        programmed = true
        return privateDefense
      })
      renderThesis('defensas')

      expect(await screen.findByText('La Defensa Privada está lista para programarse.')).toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
      expect(document.getElementById('panel-defensas')).toBeVisible()
      await userEvent.click(screen.getByRole('button', { name: /Programar defensa/i }))
      const dialog = screen.getByRole('dialog', { name: 'Programar Defensa Privada' })
      expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
      expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
      await userEvent.clear(within(dialog).getByLabelText('Fecha y hora programada'))
      await userEvent.type(within(dialog).getByLabelText('Fecha y hora programada'), '2026-10-22T14:00')
      await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala privada')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa Privada' }))

      await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
        seguimiento_etapa: 213, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-10-22T14:00',
        lugar: 'Sala privada', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: '',
      }, expect.any(AbortSignal)))
      await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenCalled())
      expect(screen.queryByRole('dialog', { name: 'Programar Defensa Privada' })).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(document.getElementById('panel-defensas')).toBeVisible()
      expect(await screen.findByText('Programada')).toBeInTheDocument()
    })

    it('integra participantes, autoridades, asistencia y reintento de quórum en Defensa Pública de Tesis', async () => {
      const publicStage = { id: 215, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        mensaje: 'Gestiona los participantes de la Defensa Pública.',
        requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa Pública', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Gestionar Defensa Pública' },
      }
      const publicDefense = {
        id: 216, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PUBLICA',
        tipo_display: 'Defensa pública', numero_intento: 1, estado: 'EN_CURSO', estado_display: 'En curso',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Auditorio', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PUBLICA', etapa_nombre: 'Defensa Pública',
        participantes: [
          { id: 921, asignacion: 31, usuario_nombre: 'Tribunal Uno', rol_evento: 'TRIBUNAL', rol_display: 'Tribunal', convocado: true, presente: null, activo: true },
          { id: 922, asignacion: 32, usuario_nombre: 'Presidente Uno', rol_evento: 'PRESIDENTE', rol_display: 'Presidente', convocado: true, presente: true, activo: true },
          { id: 923, asignacion: 33, usuario_nombre: 'Secretario Uno', rol_evento: 'SECRETARIO', rol_display: 'Secretario', convocado: true, presente: true, activo: true },
        ],
        evaluaciones: [], resultado_consolidado: null,
      }
      const thesis = thesisResponseFor('DEFENSA_PUBLICA', orientation, {
        flujo: { ...thesisResponseFor('DEFENSA_PUBLICA', orientation).flujo, etapas: [publicStage], etapa_actual: publicStage },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [publicDefense] })
      let attendanceRecorded = false
      postulacionesService.obtenerDefensa.mockImplementation(async () => ({
        ...publicDefense,
        participantes: publicDefense.participantes.map((participant) => participant.id === 921 && attendanceRecorded
          ? { ...participant, presente: false }
          : participant),
      }))
      postulacionesService.obtenerQuorumDefensa
        .mockRejectedValueOnce({ message: 'No se pudo consultar el quórum.' })
        .mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 1, PRESIDENTE: 1, SECRETARIO: 1 }, faltantes: {}, detalle: { TRIBUNAL: 1 } })
      postulacionesService.registrarAsistenciaDefensa
        .mockRejectedValueOnce({ message: 'No se pudo registrar la asistencia.' })
        .mockImplementation(async () => {
          attendanceRecorded = true
          return { id: 921, presente: false }
        })
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      expect(within(detail).getByText('Presidente Uno')).toBeInTheDocument()
      expect(within(detail).getByText('Secretario Uno')).toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(document.getElementById('panel-defensas')).toBeVisible()
      expect(within(detail).getByText(/Quórum:\s*No disponible/)).toBeInTheDocument()
      await userEvent.click(within(detail).getByRole('button', { name: 'Reintentar quórum' }))
      await waitFor(() => expect(within(detail).getByText(/Quórum:\s*Válido/)).toBeInTheDocument())

      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar asistencia' }))
      const attendance = screen.getByRole('dialog', { name: 'Registrar asistencia' })
      await userEvent.selectOptions(within(attendance).getByLabelText('Asistencia'), 'false')
      await userEvent.click(within(attendance).getByRole('button', { name: 'Guardar asistencia' }))
      expect(await within(attendance).findByRole('alert')).toHaveTextContent('No se pudo registrar la asistencia.')
      await userEvent.click(within(attendance).getByRole('button', { name: 'Guardar asistencia' }))
      await waitFor(() => expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenCalledTimes(2))
      expect(postulacionesService.registrarAsistenciaDefensa).toHaveBeenLastCalledWith(216, 921, false, '', expect.any(AbortSignal))
      expect(await within(detail).findByText('Tribunal · Convocado · Ausente')).toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(document.getElementById('panel-defensas')).toBeVisible()
    })

    it('presenta el formulario estándar con modos académicos para Defensa Privada de Tesis', async () => {
      const orientation = {
        mensaje: 'Gestiona el resultado de la Defensa Privada.',
        requisitos: [],
        siguiente_accion: { codigo: 'REGISTRAR_EVALUACION', titulo: 'Registrar resultado', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const privateDefense = {
        id: 216, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA',
        tipo_display: 'Defensa privada', estado: 'EN_CURSO', estado_display: 'En curso',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Aula', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PRIVADA', etapa_nombre: 'Defensa Privada',
        participantes: [{ id: 921, asignacion: 31, usuario_nombre: 'Tribunal Uno', rol_evento: 'TRIBUNAL', activo: true, presente: true }],
        evaluaciones: [], resultado_consolidado: null,
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation)
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [privateDefense] })
      postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 1 }, faltantes: {}, detalle: { TRIBUNAL: 1 } })
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getAllByRole('button', { name: 'Registrar evaluación' })).toHaveLength(1)
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar evaluación' }))
      expect(screen.getByLabelText('Modo')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Por consenso' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Individual' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Registrar resultado de la defensa' })).not.toBeInTheDocument()
    })

    it('reanuda evaluaciones individuales de Defensa Privada de Tesis sin ofrecer consenso', async () => {
      const orientation = {
        mensaje: 'Continúa el resultado de la Defensa Privada.',
        requisitos: [],
        siguiente_accion: { codigo: 'REGISTRAR_EVALUACION', titulo: 'Registrar resultado', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const privateDefense = {
        id: 216, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA',
        tipo_display: 'Defensa privada', estado: 'EN_CURSO', estado_display: 'En curso',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Aula', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PRIVADA', etapa_nombre: 'Defensa Privada',
        participantes: [
          { id: 921, asignacion: 31, usuario_nombre: 'Tribunal Uno', rol_evento: 'TRIBUNAL', activo: true, presente: true },
          { id: 922, asignacion: 32, usuario_nombre: 'Tribunal Dos', rol_evento: 'TRIBUNAL', activo: true, presente: true },
          { id: 923, asignacion: 33, usuario_nombre: 'Tribunal Tres', rol_evento: 'TRIBUNAL', activo: true, presente: true },
        ],
        evaluaciones: [{
          id: 301, evento: 216, evaluador: 921, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
          resultado_cualitativo: 'SUFICIENTE', nota_numerica: '20.00', es_resultado_final_evento: false,
        }],
        resultado_consolidado: null,
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PRIVADA', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [privateDefense] })
      postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 1 }, faltantes: {}, detalle: { TRIBUNAL: 1 } })
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getByText('1/3 evaluaciones individuales registradas')).toBeInTheDocument()
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar siguiente evaluación individual' }))
      expect(within(detail).getByLabelText('Modo')).toHaveValue('INDIVIDUAL')
      expect(within(detail).getByLabelText('Modo')).toBeDisabled()
      expect(within(detail).getByRole('option', { name: 'Tribunal Dos' })).toBeInTheDocument()
      expect(within(detail).queryByRole('option', { name: 'Por consenso' })).not.toBeInTheDocument()
      expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
      expect(postulacionesService.finalizarDefensa).not.toHaveBeenCalled()
      expect(postulacionesService.consolidarEvaluacionDefensa).not.toHaveBeenCalled()
    })

    it('registra Defensa Pública de Tesis desde el detalle y muestra la respuesta canónica', async () => {
      const orientation = {
        mensaje: 'Registra la evaluación de la Defensa Pública.',
        requisitos: [],
        siguiente_accion: { codigo: 'REGISTRAR_EVALUACION', titulo: 'Registrar evaluación', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const publicDefense = {
        id: 217, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PUBLICA',
        tipo_display: 'Defensa pública', estado: 'EN_CURSO', estado_display: 'En curso',
        fecha_programada: '2026-10-26T14:00:00Z', lugar: 'Auditorio', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PUBLICA', etapa_nombre: 'Defensa Pública',
        participantes: [{ id: 931, asignacion: 41, usuario_nombre: 'Tribunal Uno', rol_evento: 'TRIBUNAL', activo: true, presente: true }],
        evaluaciones: [], resultado_consolidado: null,
      }
      const evaluatedDefense = {
        ...publicDefense,
        evaluaciones: [{
          id: 302, evento: 217, tipo_evaluacion: 'PUBLICA', modalidad_registro: 'CONSENSO',
          resultado_cualitativo: '', nota_numerica: '80.00', es_resultado_final_evento: false,
        }],
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [publicDefense] })
      postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 3, PRESIDENTE: 1, SECRETARIO: 1 }, faltantes: {}, detalle: {} })
      postulacionesService.registrarEvaluacionDefensa.mockResolvedValue(evaluatedDefense.evaluaciones[0])
      postulacionesService.obtenerDefensa.mockResolvedValue(evaluatedDefense)
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getAllByRole('button', { name: 'Registrar evaluación' })).toHaveLength(1)
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar evaluación' }))
      const input = screen.getByLabelText('Nota pública (1–100)')
      await userEvent.type(input, '80')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

      expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledTimes(1)
      expect(postulacionesService.registrarEvaluacionDefensa).toHaveBeenCalledWith(217, 'publica', {
        observaciones: '', modalidad_registro: 'CONSENSO', nota: '80',
      }, expect.any(AbortSignal))
      expect(await within(detail).findByText('Evaluación consensuada registrada')).toBeInTheDocument()
      expect(within(detail).getByText('Nota: 80.00')).toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(document.getElementById('panel-defensas')).toBeVisible()
    })

    it('restaura el foco al botón que abrió el cargador de Tesis', async () => {
      const orientation = {
        mensaje: 'Carga los documentos pendientes.',
        requisitos: [],
        siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga documentos.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Gestionar documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', orientation))
      postulacionesService.obtenerTiposDocumento.mockResolvedValue([
        { id: 102, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', activo: true, capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      ])
      renderThesis()
      const openButton = await screen.findByRole('button', { name: 'Gestionar documentos' })
      openButton.focus()
      await userEvent.click(openButton)
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
      expect(document.activeElement).toBe(openButton)
    })

    it.each([
      ['deshabilitado', (button) => { button.disabled = true }],
      ['oculto', (button) => { button.hidden = true }],
      ['desmontado', (button) => { button.remove() }],
    ])('no enfoca el disparador %s al cerrar el cargador', async (_description, invalidateOpener) => {
      const orientation = {
        mensaje: 'Carga los documentos pendientes.',
        requisitos: [],
        siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga documentos.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Gestionar documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', orientation))
      postulacionesService.obtenerTiposDocumento.mockResolvedValue([
        { id: 102, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', activo: true, capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      ])
      renderThesis()
      const openButton = await screen.findByRole('button', { name: 'Gestionar documentos' })
      await userEvent.click(openButton)
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      invalidateOpener(openButton)
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
      expect(document.activeElement).not.toBe(openButton)
    })
  })
})
