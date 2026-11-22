/* eslint-disable react/only-export-components -- utilidades de prueba, no componentes */
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import ExpedientePage from '../../ExpedientePage'
import { postulacionesService } from '../../../../services/postulacionesService'
import { AuthContext } from '../../../../context/AuthContext'

// Selector de candidatos de "Gestionar actores": un solo campo con búsqueda (combobox) cuya
// lista se dibuja en <body>. Estas ayudas abren la lista y eligen una opción por su valor.
export function candidateList(combobox) {
  if (combobox.getAttribute('aria-expanded') !== 'true') fireEvent.click(combobox)
  return document.getElementById(combobox.getAttribute('aria-controls'))
}

export function selectCandidate(combobox, value) {
  const option = candidateList(combobox)?.querySelector(`[role="option"][data-value="${value}"]`)
  if (!option) throw new Error(`No existe la opción ${value}`)
  fireEvent.click(option)
}

export async function chooseCandidate(combobox, value) {
  await waitFor(() => {
    if (!candidateList(combobox)?.querySelector(`[role="option"][data-value="${value}"]`)) throw new Error(`Sin opción ${value}`)
  })
  selectCandidate(combobox, String(value))
}

export async function findCandidateOptionList(scope, query) {
  let found = null
  await waitFor(() => {
    for (const combobox of within(scope).getAllByRole('combobox')) {
      if (!combobox.hasAttribute('aria-controls')) continue
      const list = candidateList(combobox)
      if (list && within(list).queryAllByRole('option', query).length) { found = within(list); return }
    }
    throw new Error('Sin opción de candidato')
  })
  return found
}

export function expectCandidateValue(combobox, value) {
  if (value === '' || value == null) expect(combobox).not.toHaveAttribute('data-value')
  else expect(combobox).toHaveAttribute('data-value', String(value))
}

export function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

export const propertyRestorers = []

export function definePropertyForTest(target, property, descriptor) {
  const original = Object.getOwnPropertyDescriptor(target, property)
  Object.defineProperty(target, property, descriptor)
  propertyRestorers.push(() => {
    if (original) Object.defineProperty(target, property, original)
    else Reflect.deleteProperty(target, property)
  })
}

export const historyResponse = {
  count: 21,
  next: '/api/v1/postulaciones/historial/?page=2',
  previous: null,
  results: [
    { id: 1, estado_anterior_nombre: null, estado_nuevo_nombre: 'Registrada', actor_nombre: null, fecha_cambio: '2026-01-01T10:00:00Z', comentario: '' },
    { id: 2, estado_anterior_nombre: 'Registrada', estado_nuevo_nombre: 'En proceso', actor_nombre: 'María Rojas', fecha_cambio: '2026-01-02T10:00:00Z', comentario: 'Inicio de revisión' },
  ],
}

export const activeActorsResponse = {
  count: 5, next: null, previous: null, results: [
    { id: 1, usuario_nombre: 'Tutor Uno', tipo_participacion_display: 'Tutor', orden_cargo: null, etapa_nombre: 'Perfil de Proyecto', fecha_inicio: '2026-01-01T10:00:00Z', activo: true, observaciones: 'Acompañamiento técnico' },
    { id: 2, usuario_nombre: 'Tribunal Uno', tipo_participacion_display: 'Tribunal', orden_cargo: 1, etapa_nombre: 'Defensa pública', fecha_designacion: '2026-01-02T10:00:00Z', activo: true, observaciones: '' },
    { id: 3, usuario_nombre: 'Docente Uno', tipo_participacion_display: 'Docente de modalidad', orden_cargo: null, seguimiento_etapa: null, activo: true },
    { id: 4, usuario_nombre: 'Presidente Uno', tipo_participacion_display: 'Presidente', orden_cargo: 1, activo: true },
    { id: 5, usuario_nombre: 'Secretario Uno', tipo_participacion_display: 'Secretario', orden_cargo: 2, activo: true },
  ],
}

export const historicalActorsResponse = {
  count: 1, next: null, previous: null, results: [
    { id: 6, usuario_nombre: 'Tutor Histórico', tipo_participacion_display: 'Tutor', fecha_inicio: '2025-01-01T10:00:00Z', fecha_fin: null, activo: false, observaciones: null },
  ],
}

export const documentsResponse = {
  count: 1, next: null, previous: null,
  results: [{ id: 31, tipo_documento: 4, tipo_documento_nombre: 'Informe final', estado_codigo: 'ENV', estado_nombre: 'Enviado', fecha_subida: '2026-02-01T10:00:00Z', fecha_revision: null, requiere_correccion: true, tiene_observaciones_pendientes: false, observacion_general: 'Revisión técnica pendiente', versiones: [{ id: 301 }] }],
}

export const versionsResponse = {
  count: 2, next: null, previous: null,
  results: [
    { id: 301, numero_version: 1, fecha_subida: '2026-02-01T10:00:00Z', nombre_original: 'informe-largo.pdf', tamano_bytes: 2048, subido_por_nombre: 'Ana Pérez', es_version_actual: false, archivo: '/media/documentos/versiones/informe-v1.pdf' },
    { id: 302, numero_version: 2, fecha_subida: '2026-02-02T10:00:00Z', nombre_original: 'informe-final.pdf', tamano_bytes: 4096, subido_por_nombre: 'Ana Pérez', es_version_actual: true, archivo: '/media/documentos/versiones/informe-v2.pdf' },
  ],
}

export const observationsResponse = {
  count: 2, next: null, previous: null,
  results: [
    { id: 401, comentario: 'Corregir portada', usuario_nombre: 'Revisor Uno', fecha_observacion: '2026-02-03T10:00:00Z', corregida: false, fecha_correccion: null },
    { id: 402, comentario: 'Numeración corregida', usuario_nombre: 'Revisor Dos', fecha_observacion: '2026-02-04T10:00:00Z', corregida: true, fecha_correccion: '2026-02-05T10:00:00Z' },
  ],
}

export const defenseRows = [
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

export const defensesResponse = { count: 21, next: 'page=2', previous: null, results: defenseRows }

export const quorumResponse = { valido: true, conteos: { TRIBUNAL: 2, PRESIDENTE: 1 }, faltantes: {}, detalle: { TRIBUNAL: 2, PRESIDENTE: 1 } }

export const closureResponse = {
  estado_general: 'EN_PROCESO', etapa_actual: 'REVISION_FINAL_POST_PUBLICA', defensa_publica_aprobada: true,
  revision_final_aprobada: false, cierre_documental_aprobado: false, concluida: false,
  condiciones_faltantes: ['ACTA'], entregas_faltantes: ['EJEMPLARES'], documentos_faltantes: ['INFORME'],
  advertencias_normativas: ['La cantidad registrada no certifica la cantidad oficial.'],
  puede_aprobar_revision_final: true, puede_aprobar_cierre: false, puede_concluir: false,
}

export const response = {
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

// Proyecto de Grado y Tesis registran el resultado de sus defensas en un solo paso ("resultado
// directo"). El flujo operativo (iniciar, asistencia y quórum, evaluar, consolidar) sigue vigente
// en las demás modalidades: estas pruebas lo verifican con un expediente de Trabajo Dirigido.
export const operativeFlowModality = { id: 3, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' }

export const operativeFlowResponse = {
  ...response,
  detalle: { ...response.detalle, modalidad_detalle: operativeFlowModality },
  flujo: { ...response.flujo, modalidad: operativeFlowModality },
}

export const expedienteIdentityCases = [
  ['PROYECTO_GRADO', 'Proyecto de Grado'],
  ['TESIS_GRADO', 'Tesis de Grado'],
  ['TRABAJO_DIRIGIDO', 'Trabajo Dirigido'],
  ['EXAMEN_GRADO', 'Examen de Grado'],
  ['EXCELENCIA_ACADEMICA', 'Excelencia Acad\u00e9mica'],
  ['GRADUACION_VIA_DIPLOMADO', 'Graduaci\u00f3n V\u00eda Diplomado'],
].flatMap(([modalidadCodigo, modalidadNombre]) => ['SEGUIMIENTO', 'HISTORICO'].map((tipoRegistro) => ({
  modalidadCodigo, modalidadNombre, tipoRegistro,
})))

export const thesisPostPublicResponse = {
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

export const genericProgrammingResponse = {
  ...response,
  flujo: {
    ...response.flujo,
    etapa_actual: { id: 13, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true },
    orientacion_etapa_actual: { siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', estado: 'DISPONIBLE' }, requisitos: [] },
  },
}

export function trabajoDirigidoPublicDefenseResponse() {
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

export const tribunalStage = { id: 4, codigo: 'REVISION_TRIBUNAL_PREVIA', nombre: 'Revisión de Tribunal Previa', estado: 'EN_PROCESO', numero_intento: 1, activo: true }

export const tribunalResponse = { ...response, flujo: { ...response.flujo, etapa_actual: tribunalStage, etapas: [...response.flujo.etapas, tribunalStage] } }

export const tribunalDocuments = {
  count: 2, next: null, previous: null, results: [
    { id: 41, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 1, nombre_original: 'documento-final.doc', es_version_actual: true, activo: true }] },
    { id: 42, tipo_documento_codigo: 'INFORME_REVISION_TRIBUNAL_PREVIA', tipo_documento_nombre: 'Informe de Evaluación del Tribunal', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
  ],
}

export const tribunalHistory = [
  { id: 702, resultado: 'SUFICIENTE', resultado_display: 'Suficiente', numero_version_revisada: 2, evidencia_version: 602, evidencia_nombre_original: 'informe-v2.pdf', fecha_registro: '2026-08-16T12:00:00Z', registrado_por_nombre: 'Administradora', observaciones: 'Versión conforme', activo: true },
  { id: 701, resultado: 'INSUFICIENTE', resultado_display: 'Insuficiente', numero_version_revisada: 1, evidencia_version: 603, evidencia_nombre_original: 'informe-v1.pdf', fecha_registro: '2026-08-10T12:00:00Z', registrado_por_nombre: 'Administradora', observaciones: 'Requiere correcciones', activo: true },
]

export function renderPage(hash = null) {
  if (hash) selectInitialTab(hash)
  return render(
    <MemoryRouter initialEntries={['/postulaciones/7']}>
      <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
    </MemoryRouter>,
  )
}

export function selectInitialTab(hash) {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${hash}`)
}

export function renderOwnerPage(hash = 'documentos') {
  selectInitialTab(hash)
  const auth = { user: { id: 3, rol: { codigo: 'EST' } }, roleCode: 'EST', hasPermission: (name) => name === 'puede_cargar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function prepareContextualThesisActa() {
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

export function renderStudentPage({ permissions = ['puede_ver_postulaciones', 'puede_ver_documentos', 'puede_cargar_documentos'] } = {}) {
  const auth = { user: { id: 3, rol: { codigo: 'ESTUDIANTE' } }, roleCode: 'ESTUDIANTE', hasPermission: (name) => permissions.includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /><Route path="/documentos" element={<h1>Mis documentos</h1>} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderReviewerPage() {
  selectInitialTab('documentos')
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_documentos' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderDefenseManagerPage(hash = 'defensas') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_defensas' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderDefenseDocumentsAdminPage(hash = 'defensas') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_defensas', 'puede_gestionar_documentos', 'puede_cargar_documentos'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderDefenseEvaluationManagerPage() {
  selectInitialTab('defensas')
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_defensas', 'puede_gestionar_evaluaciones'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderClosureManagerPage(hash = 'condiciones-tecnicas') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_cierre' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderApplicationManagerPage(hash = null) {
  if (hash) selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_postulaciones' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderApplicationUploadManagerPage(hash = null) {
  if (hash) selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_postulaciones', 'puede_cargar_documentos'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderAssignmentManagerPage(hash = 'actores') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_asignaciones' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function thesisPublicAuthoritiesResponse({ president = 0, secretary = 0, stages, action = {} } = {}) {
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

export function renderWorkflowManagerPage() {
  selectInitialTab('informes-etapa')
  const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function renderWorkflowAssignmentManagerPage(hash = 'actores') {
  selectInitialTab(hash)
  const auth = { user: { id: 9 }, hasPermission: (name) => ['puede_gestionar_seguimiento', 'puede_gestionar_asignaciones'].includes(name) }
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

export function profileContracts({ assignedTribunals = [], proposalApproved = false, tutorAssigned = false, canRegister = true } = {}) {
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

export const projectStages = (inscriptionState = 'PENDIENTE', profileState = 'PENDIENTE') => [
  { id: 21, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: inscriptionState, numero_intento: 1, activo: true },
  { id: 22, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: profileState, numero_intento: 1, activo: true },
  ...['DOCUMENTO_FINAL', 'REVISION_TRIBUNAL_PREVIA', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA', 'REVISION_FINAL_POST_PUBLICA', 'CIERRE_DOCUMENTAL']
    .map((codigo, index) => ({ id: 23 + index, codigo, nombre: codigo, estado: 'PENDIENTE', numero_intento: 1, activo: true })),
]

export const emptyProjectFlow = {
  ...response,
  detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
  flujo: { ...response.flujo, etapa_actual: null, porcentaje_avance: 0, etapas: [] },
}

export const projectFlowAfterStart = (inscriptionState = 'APROBADA', profileState = 'PENDIENTE') => ({
  ...emptyProjectFlow,
  detalle: { ...emptyProjectFlow.detalle, estado_actual_detalle: { id: 2, codigo: 'EN_PROCESO', nombre: 'En proceso' } },
  flujo: {
    ...emptyProjectFlow.flujo,
    etapa_actual: { id: 22, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: profileState },
    porcentaje_avance: inscriptionState === 'APROBADA' ? 12.5 : 0,
    etapas: projectStages(inscriptionState, profileState),
  },
})

export const futureProfileOrientation = {
  mensaje: 'Verifica estas precondiciones antes de intentar programar la defensa.',
  requisitos: [{ tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 0, minimo: 2, cumplido: false, estado_display: '0/2 pendiente', destino: '#actores' }],
  siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Actores de la postulación', descripcion: 'Completa las asignaciones mínimas requeridas antes de programar.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#actores' },
}

export const inscriptionRequirements = (completedCount) => [
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

export const inscriptionStageResponse = (completedCount) => {
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

export const examInscriptionResponse = (completed) => {
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

export const excellenceInscriptionResponse = (completed) => {
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

export const profileThesisApplicable = (codigo = 'SIN_DOCUMENTO', permitida = true) => ({
  postulacion_id: 53, modalidad: 'TESIS_GRADO', etapa_actual: 'PERFIL_TESIS',
  documentos_aplicables: [
    { id: 153, codigo: 'PERFIL_TESIS', nombre: 'Perfil de Tesis', capacidad_carga: { codigo, permitida } },
    { id: 154, codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe del tutor de Tesis', capacidad_carga: { codigo, permitida } },
  ],
})

export const renderProfileThesisAction = ({ tutor = false, complete = false, canUpload = true, canAssign = true, requirements, stageCode = 'PERFIL_TESIS', modality = 'TESIS_GRADO', hash = 'resumen', actorManagement } = {}) => {
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

export const renderTutorDictamenContext = ({ canManage = true, canUpload = false, action = 'REGISTRAR_DICTAMEN', status = 'DISPONIBLE', modality = 'TESIS_GRADO', ambiguous = false, blocked = false, documentError = false, hash = 'resumen', type = 'TUTOR', missingEvidence = false, incompleteTribunal = false, orientation } = {}) => {
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

export const projectStageResponse = (codigo, orientation = futureProfileOrientation) => {
  const stage = { id: 11, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: 1, activo: true }
  const stages = [stage]
  if (codigo === 'REVISION_TRIBUNAL_PREVIA') stages.push({ id: 14, codigo, nombre: codigo, estado: 'EN_PROCESO', numero_intento: 1, activo: true })
  return { ...response, flujo: { ...response.flujo, etapa_actual: stage, etapas: stages, orientacion_etapa_actual: orientation } }
}

// Preparación común de cada archivo de pruebas del Expediente: simulaciones por defecto
// antes de cada prueba y limpieza después.
export function prepararExpediente() {
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
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    while (propertyRestorers.length) propertyRestorers.pop()()
  })
}
