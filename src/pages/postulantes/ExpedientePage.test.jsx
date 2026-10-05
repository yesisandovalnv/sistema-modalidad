import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('../../services/postulacionesService', () => ({
  humanizeRequirementCode,
  postulacionesService: {
    obtenerExpediente: vi.fn(), obtenerCapacidadesModalidad: vi.fn(), inicializarFlujo: vi.fn(), iniciarEtapa: vi.fn(), aprobarEtapa: vi.fn(), obtenerHistorial: vi.fn(), obtenerActores: vi.fn(), obtenerDocumentos: vi.fn(),
    obtenerVersiones: vi.fn(), descargarVersion: vi.fn(), obtenerObservaciones: vi.fn(), obtenerTiposDocumento: vi.fn(), obtenerTiposDocumentosHistoricos: vi.fn(), cargarDocumento: vi.fn(), subirDocumentoHistorico: vi.fn(),
    aprobarDocumento: vi.fn(), rechazarDocumento: vi.fn(), observarDocumento: vi.fn(), marcarObservacionCorregida: vi.fn(),
    obtenerDefensas: vi.fn(), obtenerQuorumDefensa: vi.fn(), programarDefensa: vi.fn(), iniciarDefensa: vi.fn(),
    finalizarDefensa: vi.fn(), suspenderDefensa: vi.fn(), cancelarDefensa: vi.fn(), reprogramarDefensa: vi.fn(),
    registrarEvaluacionDefensa: vi.fn(), consolidarEvaluacionDefensa: vi.fn(), obtenerDefensa: vi.fn(),
    obtenerAsignacionesCandidatas: vi.fn(), agregarParticipanteDefensa: vi.fn(), retirarParticipanteDefensa: vi.fn(), registrarAsistenciaDefensa: vi.fn(),
    obtenerCondiciones: vi.fn(), verificarCondicion: vi.fn(), verificarCondiciones: vi.fn(), rechazarCondicion: vi.fn(),
    obtenerEntregas: vi.fn(), crearEntregaFisica: vi.fn(), registrarEntrega: vi.fn(), registrarEntregas: vi.fn(),
    obtenerCierre: vi.fn(), aprobarRevisionFinal: vi.fn(), aprobarCierreDocumental: vi.fn(),
    concluirPostulacion: vi.fn(), reabrirCierre: vi.fn(),
    obtenerCandidatosAsignacion: vi.fn(), obtenerCandidatosElegibles: vi.fn(), obtenerTribunalesActivos: vi.fn(), asignarActor: vi.fn(), reemplazarActor: vi.fn(), finalizarAsignacion: vi.fn(), registrarDecisionAcademica: vi.fn(),
    obtenerInformesRevisionTribunal: vi.fn(), registrarInformeRevisionTribunal: vi.fn(), actualizarEvidenciaInformeRevisionTribunal: vi.fn(),
    obtenerDictamenesRevision: vi.fn(),
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

function renderDefenseDocumentsAdminPage() {
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_defensas', 'puede_gestionar_documentos', 'puede_cargar_documentos'].includes(name) }
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

function renderWorkflowAssignmentManagerPage() {
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
    habilitada: proposalApproved,
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
    acciones_permitidas: proposalApproved ? [tutorAssigned ? 'REEMPLAZAR' : 'ASIGNAR'] : [],
    restriccion_identidad: null,
    bloqueo: proposalApproved ? null : { codigo: 'PROPUESTA_NO_APROBADA', mensaje: 'El Tutor se designa después de aprobar la propuesta.' },
    precondicion: { codigo: 'PROPUESTA_APROBADA', requerido: true, estado: proposalApproved ? 'CUMPLIDA' : 'PENDIENTE', enforcement: 'ACTIVO' },
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
    vi.resetAllMocks()
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
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
    postulacionesService.reabrirCierre.mockResolvedValue({ ...closureResponse, revision_final_aprobada: true, cierre_documental_aprobado: false, puede_aprobar_cierre: true })
    postulacionesService.programarDefensa.mockResolvedValue({ ...defenseRows[1], id: 86 })
    postulacionesService.iniciarDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'EN_CURSO', estado_display: 'En curso' })
    postulacionesService.finalizarDefensa.mockResolvedValue({ ...defenseRows[2], estado: 'FINALIZADA', estado_display: 'Finalizada' })
    postulacionesService.suspenderDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'SUSPENDIDA', estado_display: 'Suspendida' })
    postulacionesService.cancelarDefensa.mockResolvedValue({ ...defenseRows[1], estado: 'CANCELADA', estado_display: 'Cancelada' })
    postulacionesService.reprogramarDefensa.mockResolvedValue({ ...defenseRows[1], fecha_programada: '2026-09-01T10:00:00Z' })
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
    expect(within(dialog).getByRole('button', { name: /Cargar 0 documentos/i })).toBeDisabled()
    expect(postulacionesService.cargarDocumento).not.toHaveBeenCalled()
  })

  it('no muestra la acción de finalización si el usuario no puede gestionar asignaciones', async () => {
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage()

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
    await userEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
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
    await userEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))

    const reason = within(position).getByLabelText('Motivo u observación')
    await userEvent.type(reason, 'Regularización por conflicto de roles')
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
    await userEvent.click(within(actorsCard).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const position = within(dialog).getByRole('heading', { name: 'Tribunal 1 *' }).closest('section')
    await userEvent.click(within(position).getByRole('button', { name: 'Finalizar asignación' }))
    const reason = within(position).getByLabelText('Motivo u observación')
    await userEvent.type(reason, 'Motivo inválido')
    await userEvent.click(within(position).getByRole('button', { name: 'Confirmar finalización' }))

    expect(await within(position).findByText(error)).toBeInTheDocument()
  })

  it('muestra orientación y CTA de carga de evidencia cuando no hay Informe de Evaluación del Tribunal activo y el usuario puede cargar documentos', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(tribunalResponse)
    postulacionesService.obtenerDocumentos.mockResolvedValue({
      count: 1, next: null, previous: null, results: [
        { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.pdf', es_version_actual: true, activo: true }] },
      ],
    })
    postulacionesService.obtenerInformesRevisionTribunal.mockResolvedValue([])

    const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_cargar_documentos', 'puede_gestionar_seguimiento'].includes(name) }
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    const orientation = await screen.findByText('Antes de registrar el resultado, carga el Informe de Evaluación del Tribunal.')
    expect(orientation).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar Informe de Evaluación' })).toBeInTheDocument()
  })

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
    expect(await screen.findByRole('heading', { name: 'Estado actual de tu proceso académico' })).toBeInTheDocument()
    expect(screen.getByText('EXP-007')).toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument()
    expect(screen.getByText('Gestión 2026 - Semestre II')).toBeInTheDocument()
    expect(screen.getByText('En proceso')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Estado actual de tu proceso académico' }).parentElement).getByText('Perfil de Proyecto')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de tu proceso' })).toHaveValue(25)
    expect(screen.getByRole('navigation', { name: 'Secciones del expediente' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '#documentos')
    expect(screen.getByRole('heading', { name: 'Gestión administrativa pendiente' })).toBeInTheDocument()
    expect(screen.getByText('0 de 3 etapas completadas')).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).toHaveClass('overflow-hidden')
    expect(screen.getByText('ACTA')).toBeInTheDocument()
    expect(screen.getByText('EJEMPLARES')).toBeInTheDocument()
    expect(screen.getByText('INFORME')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute('href', '/postulantes')
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('ordena las secciones principales y la navegación según la jerarquía del estudiante', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    const { container } = renderOwnerPage()
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
    expect(within(sections[4]).getByRole('heading', { name: 'Etapas del flujo académico' })).toBeInTheDocument()

    const navigation = screen.getByRole('navigation', { name: 'Secciones del expediente' })
    const links = within(navigation).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Resumen', 'Documentos', 'Defensas', 'Actores', 'Etapas', 'Historial'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(sectionIds.map((id) => `#${id}`))

    const future = screen.getByText('Información de etapas posteriores').closest('details')
    expect(future).not.toHaveAttribute('open')
    expect(sections[5].compareDocumentPosition(future) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(future).getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
  })

  it('prioriza el bloque de revisión de tribunal previa antes de documentos y mantiene la información posterior colapsada', async () => {
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

    renderApplicationManagerPage()

    const reviews = await screen.findAllByRole('heading', { name: 'Revisión de Tribunal Previa' })
    expect(reviews.length).toBeGreaterThan(1)

    const reviewBlock = document.getElementById('informes-etapa')
    const documentsAnchor = document.getElementById('documentos')
    expect(reviewBlock.compareDocumentPosition(documentsAnchor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

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
    expect(screen.getByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Iniciar Revisión de Tribunal Previa' })).toBeVisible()
  })

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
    renderApplicationManagerPage()

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
    renderOwnerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).queryByText('La etapa está lista para iniciarse.')).not.toBeInTheDocument()
    expect(within(summary).getByText('Esta etapa está pendiente de inicio por el personal responsable.')).toBeInTheDocument()
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

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    await userEvent.click(within(summary).getByRole('link', { name: 'Gestionar actores' }))

    expect(screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })).toBeInTheDocument()
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
    expect(within(actors).queryByText('Recomendado')).not.toBeInTheDocument()
  })

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
    expect(within(summary).getByRole('link', { name: 'Ir a documentos' })).toHaveAttribute('href', '#documentos')
    expect(within(summary).getByRole('heading', { name: 'Requisitos de esta etapa' })).toBeInTheDocument()
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

  it('muestra 0/4 requisitos y oculta Aprobar Inscripción cuando la policy no habilita aprobar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(inscriptionStageResponse(false))
    renderApplicationManagerPage()

    const requirements = (await screen.findByRole('heading', { name: 'Requisitos de Inscripción' })).closest('section')
    expect(within(requirements).getByText('0 de 4 cumplidos')).toBeInTheDocument()
    expect(within(requirements).getByRole('heading', { name: 'Documentación de Inscripción' })).toBeInTheDocument()
    expect(within(requirements).getByText(/Carta de solicitud/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Matrícula vigente/)).toBeInTheDocument()
    expect(within(requirements).getByText(/Historial académico de prerrequisitos/)).toBeInTheDocument()
    expect(within(requirements).queryByRole('button', { name: 'Cargar documentos de Inscripción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar Inscripción' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recepción física' })).toBeInTheDocument()
    expect(await screen.findByText(/Fólder amarillo rotulado con nombre y modalidad/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Registrar recepción' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar recepción' }))
    await waitFor(() => expect(postulacionesService.crearEntregaFisica).toHaveBeenCalledWith(
      7,
      'FOLDER_AMARILLO',
      'Fólder amarillo rotulado con nombre y modalidad',
      1,
      expect.any(AbortSignal),
    ))
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
    expect(await within(dialog).findByText('3 documentos cargados correctamente.')).toBeInTheDocument()
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
    renderApplicationManagerPage()

    expect(await screen.findByText('3 de 4 cumplidos')).toBeInTheDocument()
    const physicalSection = document.getElementById('inscripcion-entregas')
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
    renderApplicationManagerPage()

    const requirements = (await screen.findByRole('heading', { name: 'Requisitos de Inscripción' })).closest('section')
    expect(within(requirements).getByText('4 de 4 cumplidos')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Aprobar Inscripción' })).toBeInTheDocument()
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })

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
    renderDefenseManagerPage()

    expect(await screen.findByText('Continuar Defensa de Perfil programada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a la defensa' })).toHaveAttribute('href', '#defensas')
    expect(screen.queryByRole('button', { name: 'Aprobar Perfil de Proyecto' })).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante cuando la Defensa de Perfil está en curso', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage()

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('La defensa está pendiente de finalización por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Gestionar y finalizar Defensa de Perfil')).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante para registrar la evaluación de Perfil', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'FINALIZADA', estado_display: 'Finalizada', evaluaciones: [], resultado_consolidado: null }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage()

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('La evaluación está pendiente de registro por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Registrar evaluación de Perfil')).not.toBeInTheDocument()
  })

  it('muestra espera administrativa al estudiante para consolidar el resultado de Perfil', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'FINALIZADA', estado_display: 'Finalizada', evaluaciones: [{ id: 301, tipo_evaluacion: 'PERFIL', modalidad_registro: 'CONSENSO', es_resultado_final_evento: false, resultado_cualitativo: 'SUFICIENTE' }], resultado_consolidado: null }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderOwnerPage()

    const summary = (await screen.findByRole('heading', { name: 'Gestión administrativa pendiente' })).parentElement
    expect(within(summary).getByText('El resultado está pendiente de consolidación por el personal responsable.')).toBeInTheDocument()
    expect(within(summary).queryByText('Consolidar resultado de Perfil')).not.toBeInTheDocument()
  })

  it('conserva la orientación operativa para administración con capacidad de gestionar defensas', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const profileDefense = { ...defenseRows[2], seguimiento_etapa: 11, estado: 'EN_CURSO', estado_display: 'En curso' }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [profileDefense] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderDefenseManagerPage()

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
    renderOwnerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Gestionar documentos')).toBeInTheDocument()
    expect(within(summary).getByRole('region', { name: 'Siguiente acción' })).toHaveAttribute('data-personal-action', 'true')
  })

  const projectStageResponse = (codigo, orientation = futureProfileOrientation) => {
    const stage = { id: 11, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const stages = [stage]
    if (codigo === 'REVISION_TRIBUNAL_PREVIA') stages.push({ id: 14, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: 1, activo: true })
    return { ...response, flujo: { ...response.flujo, etapa_actual: stage, etapas: stages, orientacion_etapa_actual: orientation } }
  }

  it('mantiene la información futura de Perfil dentro de una sección colapsada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('PERFIL_PROYECTO'))
    renderOwnerPage()

    const future = await screen.findByText('Información de etapas posteriores')
    expect(future.closest('details')).not.toHaveAttribute('open')
    expect(within(future.closest('details')).getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
    expect(within(future.closest('details')).getByText('Preparación para cierre')).toBeInTheDocument()
  })

  it('mantiene los documentos como recurso disponible en Documento Final', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('DOCUMENTO_FINAL'))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.getByText('Información de etapas posteriores')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resultado académico técnico' }).closest('details')).toBe(screen.getByText('Información de etapas posteriores').closest('details'))
  })

  it('muestra la revisión de tribunal cuando esa etapa es la actual', async () => {
    const reviewStage = { id: 14, codigo: 'REVISION_TRIBUNAL_PREVIA', nombre: 'Revisión de Tribunal Previa', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: reviewStage, etapas: [reviewStage], orientacion_etapa_actual: futureProfileOrientation } })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Revisión de Tribunal Previa', level: 2 }).closest('details')).toBeNull()
  })

  it.each(['DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'])('muestra defensas y resultado durante %s', async (codigo) => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse(codigo))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Defensas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultado académico técnico' }).closest('details')).toBeNull()
  })

  it('muestra preparación de cierre y sus recursos durante Cierre Documental', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('CIERRE_DOCUMENTAL'))
    renderPage()

    const closure = await screen.findByRole('heading', { name: 'Cierre técnico' })
    expect(closure.closest('details')).toHaveAttribute('open')
    expect(screen.getByText('ACTA')).toBeInTheDocument()
    expect(screen.getByText('EJEMPLARES')).toBeInTheDocument()
    expect(screen.getByText('INFORME')).toBeInTheDocument()
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    window.history.replaceState(window.history.state, '', '#documentos')
    renderClosureManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    await screen.findByRole('heading', { name: 'Condiciones y entregas técnicas' })
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#documentos')
  })

  it('oculta Programar defensa mientras la orientación reporta precondiciones pendientes', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(projectStageResponse('PERFIL_PROYECTO'))
    renderDefenseManagerPage()

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
    renderPage()
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
    renderPage()
    await screen.findByText('EXP-007')
    const result = (await screen.findByRole('heading', { name: 'Resultado académico técnico' })).parentElement
    expect(within(result).getAllByText('/ 100')).toHaveLength(2)
    expect(within(result).getByText('Aporte pública')).toBeInTheDocument()
    expect(within(result).getByText('56.00')).toBeInTheDocument()
    expect(within(result).getByText('/ 70')).toBeInTheDocument()
    expect(within(result).getByText('76.00')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Siguiente acción' })).toBeInTheDocument()
    expect(screen.getByText('Completa las asignaciones de Tesis.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a actores' })).toHaveAttribute('href', '#actores')
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
    renderPage()

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
    expect(screen.getByRole('link', { name: 'Ir a documentos' })).toHaveAttribute('href', '#documentos')
    expect(screen.queryByText('Aprobar etapa')).not.toBeInTheDocument()
    expect(screen.getByText('2 de 3 cumplidos')).toBeInTheDocument()
    expect(screen.getByText(/Resultado final aprobatorio/)).toHaveTextContent('77.00/100')
    expect(screen.getByText('Avance de tu proceso')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de tu proceso' })).toHaveValue(100)
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
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    expect(await screen.findByLabelText('Perfil de Tesis')).toBeInTheDocument()
    expect(screen.getByLabelText('Documento Final')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe del Tutor de Tesis')).toBeInTheDocument()
    expect(screen.getByLabelText('Informe del Tribunal de Tesis')).toBeInTheDocument()
    expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('7', expect.any(AbortSignal))
    expect(screen.getAllByRole('heading', { name: 'Dictamen del Tutor' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: 'Dictamen del Tribunal' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Correcciones posteriores a Defensa Privada' })).toBeInTheDocument()
  })

  it('reserva la Hoja de observaciones para la carga contextual de Defensa de Perfil', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 10, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', capacidad_carga: { permitida: true } },
      { id: 11, codigo: 'OBSERVACIONES_DEFENSA_PERFIL', nombre: 'Hoja de observaciones de Defensa de Perfil', capacidad_carga: { permitida: true } },
      { id: 12, codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', capacidad_carga: { permitida: true } },
    ] })
    renderDefenseDocumentsAdminPage()

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
    renderPage()
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
    await userEvent.click(within(document.querySelector('#historial')).getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(postulacionesService.obtenerHistorial).toHaveBeenLastCalledWith('7', 2, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('consulta y separa actores vigentes e históricos con etiquetas y advertencias contractuales', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo ? activeActorsResponse : historicalActorsResponse))
    renderPage()
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
    expect(within(second).getByRole('option', { name: /Willian Vargas/ })).toBeEnabled()
    expect(within(second).getByRole('option', { name: /Carlos Rojas.*Seleccionado como Tribunal 1/ })).toBeDisabled()
    await userEvent.selectOptions(first, '')
    expect(within(second).getByRole('option', { name: /Willian Vargas/ })).toBeEnabled()
    expect(within(second).getByRole('option', { name: /Carlos Rojas/ })).toBeEnabled()
  })

  it('no crea exclusividad entre posiciones sin restricción o de otro grupo', async () => {
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

    await userEvent.selectOptions(first, '40')
    expect(within(second).getByRole('option', { name: /Willian Vargas/ })).toBeEnabled()
    expect(within(third).getByRole('option', { name: /Willian Vargas/ })).toBeEnabled()
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
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: profileContracts().flow })
    postulacionesService.obtenerCandidatosElegibles.mockResolvedValue({ count: 1, next: null, previous: null, results: [
      { id: 44, username: 'docente', nombre_completo: 'Docente Vigente', codigo: 'DOC-044', rol_codigo: 'DOCENTE', rol_nombre: 'Docente', activo: true },
    ]})
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const tutorPosition = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    expect(within(tutorPosition).getByText('El Tutor se designa después de aprobar la propuesta.')).toBeInTheDocument()
    expect(within(tutorPosition).queryByRole('combobox')).not.toBeInTheDocument()
    expect(postulacionesService.obtenerCandidatosElegibles.mock.calls.some(([, filters]) => (
      filters.posicion === 'TUTOR_PROYECTO_1'
    ))).toBe(false)
  })

  it('renderiza y guarda una posición adicional solo a partir del contrato backend', async () => {
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
    renderAssignmentManagerPage()

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

  it('muestra asignaciones vigentes y bloquea solo cargos incompatibles en Completar autoridades', async () => {
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
    ]
    const activeAssignments = [
      { id: 70, usuario: 40, usuario_nombre: candidates[0].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 1, seguimiento_etapa: 11, activo: true },
      { id: 71, usuario: 41, usuario_nombre: candidates[1].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 2, seguimiento_etapa: 11, activo: true },
      { id: 72, usuario: 42, usuario_nombre: candidates[2].nombre_completo, tipo_participacion: 'TRIBUNAL', orden_cargo: 3, seguimiento_etapa: 11, activo: true },
      { id: 73, usuario: 43, usuario_nombre: candidates[3].nombre_completo, tipo_participacion: 'TUTOR', activo: true },
      { id: 74, usuario: 44, usuario_nombre: candidates[4].nombre_completo, tipo_participacion: 'DOCENTE_MODALIDAD', activo: true },
      { id: 75, usuario: 46, usuario_nombre: candidates[6].nombre_completo, tipo_participacion: 'PRESIDENTE', seguimiento_etapa: 12, activo: true },
      { id: 76, usuario: 47, usuario_nombre: candidates[7].nombre_completo, tipo_participacion: 'SECRETARIO', seguimiento_etapa: 12, activo: true },
    ]
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: false, estado_display: 'Pendiente' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores' },
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
    renderAssignmentManagerPage()

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
      expect(within(selector).getByRole('option', { name: /Willian Chau Rivero.*Asignación vigente: Tutor/ })).toBeEnabled()
      expect(within(selector).getByRole('option', { name: /Docente Modalidad.*Asignación vigente: Docente de modalidad/ })).toBeEnabled()
      expect(within(selector).getByRole('option', { name: 'Daniel Molina Cordova — Docente' })).toBeEnabled()
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
    await userEvent.selectOptions(presidentSelector, '43')
    expect(within(secretarySelector).getByRole('option', { name: /Willian Chau Rivero.*Asignación vigente: Tutor/ })).toBeDisabled()
  })

  it('refresca autoridades tras respuesta incierta y evita reenviar un cargo ya asignado', async () => {
    const publicStage = { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    let serverActors = []
    let secretaryApplied = false
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: {
        ...response.flujo,
        etapa_actual: publicStage,
        etapas: [publicStage],
        orientacion_etapa_actual: {
          mensaje: 'Completa las autoridades requeridas.',
          requisitos: [
            { tipo: 'ACTOR', codigo: 'PRESIDENTE', nombre: 'Presidente', cumplido: false, estado_display: 'Pendiente' },
            { tipo: 'ACTOR', codigo: 'SECRETARIO', nombre: 'Secretario', cumplido: false, estado_display: 'Pendiente' },
          ],
          siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Completar autoridades', estado: 'PENDIENTE', destino: '#actores' },
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
    renderAssignmentManagerPage()

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
    renderAssignmentManagerPage()

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
    renderAssignmentManagerPage()
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
    renderAssignmentManagerPage()
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    const selector = within(dialog).getByLabelText('Seleccionar candidato para Tutor')
    await within(selector).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(selector, '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar asignaciones' }))
    expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, { usuario: 41, tipo_participacion: 'TUTOR', observaciones: '' }, expect.any(AbortSignal))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Revisa los datos de la asignación. El candidato ya está asignado.')
  })

  it('pagina solo el bloque vigente sin recargar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerActores.mockImplementation((_id, activo, page) => Promise.resolve(activo
      ? { ...activeActorsResponse, count: 21, next: page === 1 ? 'page=2' : null, previous: page === 2 ? 'page=1' : null }
      : historicalActorsResponse))
    renderPage()
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
    renderPage()
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
    renderPage()
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
    renderPage()
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

  it('consume las posiciones del contrato, mantiene Tutor bloqueado y no lo envía', async () => {
    const contracts = profileContracts()
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: contracts.flow })
    renderAssignmentManagerPage()

    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    expect(within(actors).getByText('0 de 4 posiciones ocupadas')).toBeInTheDocument()
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const dialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    for (const order of [1, 2, 3]) expect(within(dialog).getByRole('heading', { name: `Tribunal ${order} *` })).toBeInTheDocument()
    const tutorPosition = within(dialog).getByRole('heading', { name: 'Tutor *' }).closest('section')
    expect(within(tutorPosition).getByText('El Tutor se designa después de aprobar la propuesta.')).toBeInTheDocument()
    expect(within(tutorPosition).queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conformar equipo' })).not.toBeInTheDocument()
    expect(within(actors).getAllByRole('button', { name: 'Gestionar actores' })).toHaveLength(1)
    expect(screen.getByText('Completar composición formal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar decisión' })).not.toBeInTheDocument()
    expect(postulacionesService.asignarActor).not.toHaveBeenCalled()
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

  it('registra decisión con participantes del contrato y refresca el Tutor habilitado', async () => {
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
    postulacionesService.obtenerExpediente
      .mockResolvedValueOnce({ ...response, flujo: incomplete.flow })
      .mockResolvedValue({ ...response, flujo: approved.flow })
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Aprobación de propuesta' })
    for (const name of ['Tribunal Uno', 'Tribunal Dos', 'Tribunal Tres']) {
      expect(within(dialog).getByText((text) => text.includes(name))).toBeInTheDocument()
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar decisión' }))

    await waitFor(() => expect(postulacionesService.registrarDecisionAcademica).toHaveBeenCalledWith(22, {
      codigo: 'PROPUESTA_APROBADA',
      resultado: 'APROBADA',
      observaciones: '',
      participantes: [
        { asignacion: 51, rol: 'TRIBUNAL', orden: 1 },
        { asignacion: 52, rol: 'TRIBUNAL', orden: 2 },
        { asignacion: 53, rol: 'TRIBUNAL', orden: 3 },
      ],
    }, expect.any(AbortSignal)))
    const actors = (await screen.findByRole('heading', { name: 'Gestión de actores' })).closest('section')
    await userEvent.click(within(actors).getByRole('button', { name: 'Gestionar actores' }))
    const actorDialog = screen.getByRole('dialog', { name: 'Gestionar actores — Perfil de Proyecto' })
    expect(within(actorDialog).getByLabelText('Seleccionar candidato para Tutor')).toBeInTheDocument()
    expect(within(actorDialog).getByRole('heading', { name: 'Tutor *' })).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
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
    renderAssignmentManagerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Reemplazar decisión' }))
    const dialog = screen.getByRole('dialog', { name: 'Aprobación de propuesta' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar decisión' }))

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

    await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
    const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
    expect(await within(detail).findByRole('button', { name: 'Registrar resultado de la defensa' })).toBeInTheDocument()
    expect(within(detail).queryByText('Registrar resultado de la defensa', { selector: 'p' })).not.toBeInTheDocument()
    await userEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado de la defensa' }))

    const flow = screen.getByRole('dialog', { name: 'Registrar resultado de la defensa' })
    expect(within(flow).getByText('Hay participantes con asistencia pendiente.')).toBeInTheDocument()
    await userEvent.click(within(flow).getByRole('button', { name: 'Revisar asistencias' }))
    expect(await screen.findByRole('dialog', { name: 'Registrar asistencia múltiple' })).toBeInTheDocument()
  })

  it('usa el flujo rápido de Defensa Privada con la acción principal de resultado de defensa', async () => {
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
    expect(within(detail).getByRole('heading', { name: 'Acción principal' })).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: 'Registrar resultado de la defensa' })).toBeInTheDocument()
    expect(within(detail).queryByText('Registrar resultado de la defensa', { selector: 'p' })).not.toBeInTheDocument()
  })

  it('omite secciones técnicas vacías y conserva el detalle colapsable', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: {}, faltantes: {}, detalle: {} })
    renderPage()
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

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
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
    renderOwnerPage()

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
    renderOwnerPage()

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
    await userEvent.upload(within(upload).getByLabelText('Archivo'), file)
    await userEvent.click(within(upload).getByRole('button', { name: 'Cargar nueva versión' }))

    await waitFor(() => expect(postulacionesService.cargarDocumento).toHaveBeenCalledWith({ postulacionId: 7, tipoDocumentoId: 99, archivo: file, eventoDefensaId: 83 }, expect.any(AbortSignal)))
    expect(postulacionesService.obtenerDefensa).toHaveBeenCalledWith(83, expect.any(AbortSignal))
  })

  it('muestra quórum inválido, faltantes y resultado consolidado ausente sin calcular cero', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: false, conteos: { TRIBUNAL: 1 }, faltantes: { TRIBUNAL: 1, SECRETARIO: 1 }, detalle: {} })
    renderPage()
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
    await userEvent.click(within(within(detail).getByText('Mirna Fernández Rojas').closest('li')).getByRole('button', { name: 'Retirar participante' }))
    const removal = screen.getByRole('dialog', { name: 'Retirar participante' })
    await userEvent.click(within(removal).getByRole('button', { name: 'Confirmar retiro' }))

    await waitFor(() => expect(postulacionesService.obtenerQuorumDefensa).toHaveBeenCalledTimes(2))
    expect(await within(detail).findByText('1 de 3 incorporados')).toBeInTheDocument()
    expect(within(detail).getByText('1 presente')).toBeInTheDocument()
    expect(within(detail).getByText('Falta 1 presencia para alcanzar el quórum.')).toBeInTheDocument()
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
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[0])
    expect(await screen.findByRole('alert')).toHaveTextContent('El evento de defensa no está disponible.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar quórum' }))
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
    renderDefenseDocumentsAdminPage()

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
    renderPage()
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
    renderPage()
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
    renderPage()
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
    const detailDialog = screen.getByRole('dialog', { name: 'Detalle del documento' })
    await userEvent.click(within(detailDialog).getByRole('button', { name: 'Cerrar' }))
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
    expect(await screen.findByText(/Informe final/)).toBeInTheDocument()
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

  it('mantiene el cargador genérico estable cuando no hay documentos aplicables', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
    expect(within(dialog).getByText('No hay tipos documentales activos disponibles.')).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Cargar 0 documentos' })).toBeDisabled()
    expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(0)
  })

  it('ofrece en carga múltiple únicamente documentos con capacidad permitida', async () => {
    postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
      { id: 41, codigo: 'CARTA_SOLICITUD', nombre: 'Carta de Solicitud', capacidad_carga: { permitida: true, codigo: 'RECHAZADO' } },
      { id: 42, codigo: 'MATRICULA_VIGENTE', nombre: 'Matrícula Vigente', capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
    ] })
    renderOwnerPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cargar documento' }))

    expect(await screen.findByLabelText('Carta de Solicitud')).toBeInTheDocument()
    expect(screen.queryByLabelText('Matrícula Vigente')).not.toBeInTheDocument()
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
    expect(await screen.findByText('1 documento cargado correctamente.')).toBeInTheDocument()
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
    expect(await screen.findByText('Nueva versión cargada')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Cargar nueva versión' })).getByText('Cerrar', { selector: 'button' }))
    expect(await screen.findByRole('dialog', { name: 'Detalle del documento' })).toBeInTheDocument()
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
    postulacionesService.obtenerExpediente.mockResolvedValue(genericProgrammingResponse)
    renderDefenseManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
    const institutionalDetails = within(dialog).getByText('Información institucional').closest('details')
    expect(institutionalDetails).not.toHaveAttribute('open')
    expect(within(institutionalDetails).queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()
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

    await userEvent.click(await screen.findByRole('button', { name: 'Programar Defensa de Perfil' }))
    const dialog = screen.getByRole('dialog', { name: 'Programar Defensa de Perfil' })
    expect(within(dialog).getByText('Perfil de Proyecto · Intento 1')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/regla de 48 horas/i)).not.toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-08-20T14:00' } })
    await userEvent.selectOptions(within(dialog).getByLabelText('Modalidad técnica'), 'VIRTUAL')
    await userEvent.type(within(dialog).getByLabelText('Enlace virtual'), 'https://meet.example.test/perfil')
    await userEvent.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Defensa de perfil')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa de Perfil' }))

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
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    await userEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Iniciar defensa' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    if (status === 400) expect(screen.getByText('Transición inválida.')).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(1)
  })

  it('actualiza el detalle seleccionado y vuelve a consultar quórum al iniciar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderDefenseManagerPage()
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver defensa' }))[1])
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar defensa' }))
    await userEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: 'Iniciar defensa' }))
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

    expect(start).toHaveClass('bg-black/25')
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
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getAllByText('28,00').length).toBeGreaterThan(0)
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getAllByText('/ 30')).toHaveLength(2)
    expect(within(screen.getByRole('heading', { name: 'Resultado académico técnico' }).parentElement).getByText('Registro con escala anterior')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Cierre técnico' }).parentElement).getByText('DEFENSA_PUBLICA')).toBeInTheDocument()
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
    expect((await screen.findAllByRole('heading', { name: 'Revisión de Tribunal Previa' })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
  })

  it('registra SUFICIENTE y refresca informes y flujo para mostrar la aprobación', async () => {
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
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
    await screen.findByText('El informe del tribunal está pendiente.')
    expect(screen.queryByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).not.toBeInTheDocument()
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
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
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
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

    expect((await screen.findAllByText(staleOrientation.mensaje))).toHaveLength(2)
    await waitFor(() => expect(reportReadsObserved.length).toBeGreaterThan(0))
    expect(reportReadsObserved[0].args[0]).toBe(4)
    expect(reportReadsObserved[0].args[1]).toBeInstanceOf(AbortSignal)
    expect(reportReadsObserved[0].payload).toEqual([staleReport])
    expect(screen.queryByRole('button', { name: 'Registrar informe del tribunal' })).not.toBeInTheDocument()
    const reportsPanel = document.getElementById('informes-etapa')
    await userEvent.click(within(reportsPanel).getByRole('button', { name: 'Actualizar informe del tribunal' }))
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
    expect(within(orientationCard).getByText('Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.')).toBeInTheDocument()
    expect(within(orientationCard).getByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toBe(approveButton)
    expect(screen.getAllByRole('button', { name: 'Aprobar Revisión de Tribunal Previa' })).toHaveLength(1)
    await userEvent.click(approveButton)
    await waitFor(() => expect(postulacionesService.aprobarEtapa).toHaveBeenCalledWith(approvableStage.id, expect.any(AbortSignal)))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Los actores están listos para programar la defensa privada.')).toBeInTheDocument()
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

    renderWorkflowAssignmentManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    let dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.type(within(dialog).getByLabelText(/Observaciones/), 'Ninguna')
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Asignar Tribunal 3' }))

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    expect(within(dialog).getByRole('heading', { name: 'Asignar Tribunal 3' })).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal')).toBeInTheDocument()
    expect(within(dialog).getByText('Revisión de Tribunal Previa')).toBeInTheDocument()
    expect(within(dialog).getByText('Tribunal 3')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Tipo de participación')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Etapa asociada (opcional)')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Orden del tribunal')).not.toBeInTheDocument()

    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Volver al informe' }))
    expect(within(dialog).getByLabelText('Resultado')).toHaveValue('SUFICIENTE')
    expect(within(dialog).getByLabelText('Evidencia')).toHaveValue('602')
    expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue('Ninguna')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Asignar Tribunal 3' }))
    await within(dialog).findByRole('option', { name: /Johnny Rosas/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('Candidato'), '41')
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Confirmar asignación' }))

    await waitFor(() => expect(postulacionesService.asignarActor).toHaveBeenCalledWith(7, {
      usuario: 41, tipo_participacion: 'TRIBUNAL', seguimiento_etapa: 4, orden_cargo: 3, observaciones: '',
    }, expect.any(AbortSignal)))
    expect(postulacionesService.asignarActor).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(postulacionesService.obtenerTribunalesActivos).toHaveBeenCalledTimes(2))
    expect(within(dialog).getByLabelText('Resultado')).toHaveValue('SUFICIENTE')
    expect(within(dialog).getByLabelText('Evidencia')).toHaveValue('602')
    expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue('Ninguna')
    expect(within(dialog).queryByText(/Tribunal incompleto/)).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
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
    renderWorkflowAssignmentManagerPage()
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
    renderWorkflowAssignmentManagerPage()
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
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))

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
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar informe del tribunal' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar informe del tribunal' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Resultado'), 'SUFICIENTE')
    await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar informe' }))
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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const refreshed = { ...response, cierre: { data: { ...closureResponse, revision_final_aprobada: true, puede_aprobar_revision_final: false, puede_aprobar_cierre: true }, error: '' } }
    postulacionesService.obtenerExpediente.mockResolvedValueOnce(response).mockResolvedValueOnce(refreshed)
    window.history.replaceState(window.history.state, '', '#condiciones-tecnicas')
    renderClosureManagerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar revisión final' }))
    await userEvent.type(screen.getByLabelText('Observaciones'), 'Revisión técnica completa')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
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
})
