import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, DataState, Modal } from '../../components/crud/CrudShell'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/reports/ReportComponents'
import { humanizeRequirementCode, postulacionesService } from '../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { AuthContext } from '../../context/AuthContext'
import DefenseParticipants from './DefenseParticipants'
import DefenseEvaluation from './DefenseEvaluation'
import ProjectGradeDirectResult from './ProjectGradeDirectResult'
import DefenseDetailErrorBoundary from './DefenseDetailErrorBoundary'
import ClosureRequirements from './ClosureRequirements'
import TechnicalClosure from './TechnicalClosure'
import DocumentReviewDictamens from './DocumentReviewDictamens'
import CorrectionConfirmations from './CorrectionConfirmations'
import AcademicConclusion from './AcademicConclusion'
import ExamenGradoAreas from './ExamenGradoAreas'
import ExcelenciaAcademica from './ExcelenciaAcademica'
import Diplomado from './Diplomado'
import TrabajoDirigido from './TrabajoDirigido'
import UploadDialog from '../../components/documentos/UploadDialog'
import DocumentDetailDialog, { DownloadVersionButton } from '../../components/documentos/DocumentDetailDialog'
import { getActiveTribunalComposition } from './tribunalComposition'

const EMPTY = 'No registrado'
const PROJECT_GRADE_DEFENSE_TYPES = ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA']
const CANCELLED_DEFENSE_RESCHEDULING_TYPES = {
  PROYECTO_GRADO: PROJECT_GRADE_DEFENSE_TYPES,
  TESIS_GRADO: ['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'],
  TRABAJO_DIRIGIDO: ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'],
}
function supportsCancelledDefenseRescheduling(defense) {
  return (CANCELLED_DEFENSE_RESCHEDULING_TYPES[defense?.postulacion_modalidad_codigo] || []).includes(defense?.tipo_evento)
}
// Preferencia operativa de selección; no modifica la elegibilidad académica.
const ACTOR_SELECTION_PRESENTATION = {
  TRABAJO_DIRIGIDO: {
    PERFIL_TRABAJO_DIRIGIDO: { preventTribunalForTutor: true },
    DEFENSA_PRIVADA: { preventOccupiedDirectedSecretary: true },
  },
  TESIS_GRADO: {
    DEFENSA_PRIVADA: { preventOccupiedPrivateSecretary: true },
  },
  EXCELENCIA_ACADEMICA: {
    EVALUACION_TRIBUNAL: { blockOtherPositions: true },
  },
}
const INSCRIPTION_PRESENTATION = {
  PROYECTO_GRADO: { integrated: true },
  EXAMEN_GRADO: { integrated: true },
  EXCELENCIA_ACADEMICA: { integrated: true },
}
const EXPEDIENTE_HASH_TABS = {
  resumen: 'resumen',
  documentos: 'documentos',
  'inscripcion-entregas': 'documentos',
  'informes-etapa': 'documentos',
  'dictamen-tutor': 'documentos',
  'dictamen-tribunal': 'documentos',
  defensas: 'defensas',
  actores: 'actores',
  etapas: 'etapas',
  'decisiones-academicas': 'etapas',
  historial: 'historial',
  'condiciones-tecnicas': 'resultado-cierre',
  'resultado-y-cierre': 'resultado-cierre',
  modalidad: 'modalidad',
  'trabajo-dirigido': 'modalidad',
  examen: 'modalidad',
  excelencia: 'modalidad',
  diplomado: 'modalidad',
}
const EXPEDIENTE_PRIMARY_TABS = [
  { id: 'resumen', label: 'Resumen', hash: 'resumen' },
  { id: 'documentos', label: 'Documentos', hash: 'documentos' },
  { id: 'defensas', label: 'Defensas', hash: 'defensas' },
  { id: 'actores', label: 'Actores', hash: 'actores' },
  { id: 'etapas', label: 'Etapas', hash: 'etapas' },
  { id: 'historial', label: 'Historial', hash: 'historial' },
]
const ORIENTATION_TO_DEFENSE_ACTION = {
  INICIAR_DEFENSA: 'iniciar',
  FINALIZAR_DEFENSA: 'finalizar',
  REGISTRAR_EVALUACION: 'registrar_evaluacion',
  CONSOLIDAR_RESULTADO: 'consolidar_resultado',
}
const DEFENSE_WARNING = 'Los datos de defensa, quórum y evaluación mostrados por el sistema son registros técnicos y no sustituyen convocatoria formal, acta firmada, legalización ni resultado académico institucional.'
const CLOSURE_TRACKING_DOCUMENT_CODES = ['ACTA_DEFENSA', 'INFORME_FINAL_TUTOR']

function closureDocumentCode(item) {
  return typeof item === 'string' ? item : item?.codigo || item?.code
}

function getClosureTrackingRequirements(cierre, currentStage) {
  if (currentStage?.codigo !== 'CIERRE_DOCUMENTAL') return []
  const required = Array.isArray(cierre?.documentos_requeridos)
    ? cierre.documentos_requeridos
    : [...(cierre?.documentos_aprobados || []), ...(cierre?.documentos_faltantes || [])]
  const approved = new Set((cierre?.documentos_aprobados || []).map(closureDocumentCode))
  const missing = new Set((cierre?.documentos_faltantes || []).map(closureDocumentCode))
  return required
    .map((item) => {
      const codigo = closureDocumentCode(item)
      if (!CLOSURE_TRACKING_DOCUMENT_CODES.includes(codigo)) return null
      const cumplido = approved.has(codigo) ? true : missing.has(codigo) ? false : undefined
      return {
        tipo: 'DOCUMENTO',
        codigo,
        nombre: typeof item === 'object' && item?.nombre ? item.nombre : humanizeRequirementCode(codigo),
        cumplido,
        estado_display: cumplido === true ? 'Aprobado' : cumplido === false ? 'Pendiente' : 'Estado no disponible',
      }
    })
    .filter(Boolean)
}

function expedienteTabFromHash(hash) {
  if (!hash || hash === '#') return 'resumen'
  const id = decodeURIComponent(hash.slice(1))
  return EXPEDIENTE_HASH_TABS[id] || 'resumen'
}
const CONTRACT_WARNINGS = [
  'La aprobación y originalidad del tema no están certificadas automáticamente por el sistema.',
  'La nota privada es el aporte consensuado del Tribunal sobre 30 puntos; no se calcula automáticamente desde las observaciones.',
  'La clasificación mostrada aplica la escala específica confirmada para Proyecto de Grado.',
  'La cantidad oficial de ejemplares permanece pendiente de validación institucional.',
  'Los proyectos grupales no están soportados actualmente.',
  'Los plazos reglamentarios no se calculan automáticamente.',
  'El cierre técnico o documental no equivale a legalización o cierre universitario oficial.',
]
const TESIS_WARNINGS = [
  'Los plazos reglamentarios y los pendientes de validación institucional no se calculan automáticamente.',
  'La Defensa Pública permanece bloqueada hasta contar con evidencia normada de correcciones de forma y quórum confirmado.',
  'Los proyectos grupales no están soportados actualmente.',
]
const PROJECT_STAGE_UI = {
  PERFIL_PROYECTO: { review: false, academicResult: false, closure: false, corrections: false },
  DOCUMENTO_FINAL: { review: false, academicResult: false, closure: false, corrections: false },
  REVISION_TRIBUNAL_PREVIA: { review: true, academicResult: false, closure: false, corrections: false },
  DEFENSA_PRIVADA: { review: false, academicResult: true, closure: false, corrections: true },
  DEFENSA_PUBLICA: { review: false, academicResult: true, closure: false, corrections: true },
  REVISION_FINAL_POST_PUBLICA: { review: false, academicResult: true, closure: true, corrections: true },
  CIERRE_DOCUMENTAL: { review: false, academicResult: true, closure: true, corrections: true },
}

const TRIBUNAL_REVIEW_DOCUMENTS = {
  PROYECTO_GRADO: {
    finalDocumentCode: 'DOCUMENTO_FINAL',
    evidenceDocumentCode: 'INFORME_REVISION_TRIBUNAL_PREVIA',
  },
  TRABAJO_DIRIGIDO: {
    finalDocumentCode: 'DOCUMENTO_FINAL_TD',
    evidenceDocumentCode: 'INFORME_REVISION_TRIBUNAL_TD',
  },
}

function getTribunalReviewDocuments(modalityCode) {
  return TRIBUNAL_REVIEW_DOCUMENTS[modalityCode] || TRIBUNAL_REVIEW_DOCUMENTS.PROYECTO_GRADO
}

function getStageUiVisibility(modalityCode, stageCode) {
  if (modalityCode !== 'PROYECTO_GRADO') return { review: true, academicResult: true, closure: true, corrections: true }
  return PROJECT_STAGE_UI[stageCode] || { review: true, academicResult: true, closure: true, corrections: true }
}

function getMemorandumPublicationContract(data) {
  const management = data?.flujo?.gestion_decisiones_academicas
  return management?.decisiones?.find((decision) => decision.memorandum_designacion)?.memorandum_designacion
    || management?.memorandum_designacion_contextual
    || null
}

export default function ExpedientePage() {
  const { id } = useParams()
  const auth = useContext(AuthContext)
  const [data, setData] = useState(null)
  const dictamenOpener = useRef(null)
  const registerDictamenOpener = useCallback((open) => { dictamenOpener.current = open }, [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const preserveExpedienteDuringMemorandumRefresh = useRef(false)
  const [closureRevision, setClosureRevision] = useState(0)
  const pendingSectionRestore = useRef(null)
  const pendingHashNavigation = useRef(null)
  const [activeTab, setActiveTab] = useState(() => expedienteTabFromHash(window.location.hash))
  const [history, setHistory] = useState({ data: null, loading: true, error: '' })
  const [historyRevision, setHistoryRevision] = useState(0)
  const [historyView, setHistoryView] = useState({ id: null, page: 1 })
  const historyPage = String(historyView.id) === String(id) ? historyView.page : 1
  const [activeActors, setActiveActors] = useState({ data: null, loading: true, error: '' })
  const [historicalActors, setHistoricalActors] = useState({ data: null, loading: true, error: '' })
  const [actorsView, setActorsView] = useState({ id: null, activePage: 1, historicalPage: 1 })
  const [activeActorsRevision, setActiveActorsRevision] = useState(0)
  const [activeTribunals, setActiveTribunals] = useState({ data: null, loading: false, error: '' })
  const [activeTribunalsRevision, setActiveTribunalsRevision] = useState(0)
  const activeTribunalsController = useRef(null)
  const [historicalActorsRevision, setHistoricalActorsRevision] = useState(0)
  const [assignment, setAssignment] = useState(null)
  const assignmentController = useRef(null)
  const assignmentSubmitting = useRef(false)
  const [actorManagement, setActorManagement] = useState(null)
  const [memorandums, setMemorandums] = useState({ data: [], loading: true, error: '' })
  const [memorandumRevision, setMemorandumRevision] = useState(0)
  const actorManagementController = useRef(null)
  const actorManagementSubmitting = useRef(false)
  const actorManagementOpener = useRef(null)
  const actorManagementSummaryNavigationPending = useRef(false)
  const [academicDecision, setAcademicDecision] = useState(null)
  const academicDecisionController = useRef(null)
  const [teamAssignment, setTeamAssignment] = useState(null)
  const teamAssignmentController = useRef(null)
  const teamAssignmentSubmitting = useRef(false)
  const activeActorsPage = String(actorsView.id) === String(id) ? actorsView.activePage : 1
  const historicalActorsPage = String(actorsView.id) === String(id) ? actorsView.historicalPage : 1
  const [documents, setDocuments] = useState({ data: null, loading: true, error: '' })
  const [documentsView, setDocumentsView] = useState({ id: null, page: 1 })
  const [documentsRevision, setDocumentsRevision] = useState(0)
  const documentsPage = String(documentsView.id) === String(id) ? documentsView.page : 1
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [versionsRevision, setVersionsRevision] = useState(0)
  const [observationsRevision, setObservationsRevision] = useState(0)
  const [documentTypes, setDocumentTypes] = useState({ data: [], loading: false, error: '' })
  const [upload, setUpload] = useState(null)
  const [uploadOrigin, setUploadOrigin] = useState(null)
  const uploadOpener = useRef(null)
  const uploadController = useRef(null)
  const contextualUploadPending = useRef(false)
  const contextualUploadSubmitting = useRef(false)
  const [contextualUploadMessage, setContextualUploadMessage] = useState('')
  const [review, setReview] = useState(null)
  const reviewController = useRef(null)
  const [defenses, setDefenses] = useState({ data: null, loading: true, error: '' })
  const [defensesView, setDefensesView] = useState({ id: null, page: 1 })
  const [defensesRevision, setDefensesRevision] = useState(0)
  const defensesPage = String(defensesView.id) === String(id) ? defensesView.page : 1
  const [selectedDefense, setSelectedDefense] = useState(null)
  const defenseOpener = useRef(null)
  const defenseCompletionPendingNavigation = useRef(false)
  const [quorum, setQuorum] = useState({ data: null, loading: false, error: '' })
  const quorumController = useRef(null)
  const [defenseOperation, setDefenseOperation] = useState(null)
  const defenseOperationController = useRef(null)
  const [flowInitialization, setFlowInitialization] = useState({ submitting: false, error: '' })
  const flowInitializationController = useRef(null)
  const flowInitializationSubmitting = useRef(false)
  const [stageInitialization, setStageInitialization] = useState({ submitting: false, error: '' })
  const stageInitializationController = useRef(null)
  const stageInitializationSubmitting = useRef(false)
  const [stageApproval, setStageApproval] = useState({ submitting: false, error: '', fields: {} })
  const stageApprovalController = useRef(null)
  const stageApprovalSubmitting = useRef(false)
  const [tribunalReports, setTribunalReports] = useState({ data: null, loading: true, error: '' })
  const [tribunalReportsRevision, setTribunalReportsRevision] = useState(0)
  const [tribunalReportDialog, setTribunalReportDialog] = useState(null)
  const tribunalReportController = useRef(null)
  const tribunalReportSubmitting = useRef(false)
  const tribunalAssignmentController = useRef(null)
  const tribunalAssignmentSubmitting = useRef(false)
  const [examen, setExamen] = useState(null)
  const [examenRevision, setExamenRevision] = useState(0)
  const [excelencia, setExcelencia] = useState(null)
  const [excelenciaRevision, setExcelenciaRevision] = useState(0)
  const [diplomado, setDiplomado] = useState(null)
  const [diplomadoRevision, setDiplomadoRevision] = useState(0)
  const [trabajoDirigido, setTrabajoDirigido] = useState(null)
  const [trabajoDirigidoRevision, setTrabajoDirigidoRevision] = useState(0)
  const [trabajoDirigidoReportSuccess, setTrabajoDirigidoReportSuccess] = useState('')
  const [directedConclusion, setDirectedConclusion] = useState({ submitting: false, error: '', done: false })
  const directedConclusionRequest = useRef(null)

  useEffect(() => {
    setDirectedConclusion({ submitting: false, error: '', done: false })
    directedConclusionRequest.current = null
    return () => directedConclusionRequest.current?.abort()
  }, [id])

  useEffect(() => {
    uploadController.current?.abort()
    reviewController.current?.abort()
    setUpload(null)
    setReview(null)
    setSelectedDocument(null)
    quorumController.current?.abort()
    quorumController.current = null
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation(null)
    setSelectedDefense(null)
    setQuorum({ data: null, loading: false, error: '' })
    flowInitializationController.current?.abort()
    flowInitializationController.current = null
    flowInitializationSubmitting.current = false
    setFlowInitialization({ submitting: false, error: '' })
    stageInitializationController.current?.abort()
    stageInitializationController.current = null
    stageInitializationSubmitting.current = false
    setStageInitialization({ submitting: false, error: '' })
    stageApprovalController.current?.abort()
    stageApprovalController.current = null
    stageApprovalSubmitting.current = false
    setStageApproval({ submitting: false, error: '', fields: {} })
    assignmentController.current?.abort()
    assignmentController.current = null
    assignmentSubmitting.current = false
    setAssignment(null)
    actorManagementController.current?.abort()
    actorManagementController.current = null
    actorManagementSubmitting.current = false
    setActorManagement(null)
    teamAssignmentController.current?.abort()
    teamAssignmentController.current = null
    teamAssignmentSubmitting.current = false
    setTeamAssignment(null)
    tribunalReportController.current?.abort()
    tribunalReportController.current = null
    tribunalReportSubmitting.current = false
    setTribunalReportDialog(null)
    tribunalAssignmentController.current?.abort()
    tribunalAssignmentController.current = null
    tribunalAssignmentSubmitting.current = false
    setTribunalReports({ data: null, loading: true, error: '' })
    setTrabajoDirigidoReportSuccess('')
  }, [id])

  useEffect(() => () => {
    uploadController.current?.abort()
    reviewController.current?.abort()
    quorumController.current?.abort()
    defenseOperationController.current?.abort()
    flowInitializationController.current?.abort()
    stageInitializationController.current?.abort()
    stageApprovalController.current?.abort()
    assignmentController.current?.abort()
    actorManagementController.current?.abort()
    teamAssignmentController.current?.abort()
    tribunalReportController.current?.abort()
    tribunalAssignmentController.current?.abort()
    activeTribunalsController.current?.abort()
  }, [])

  useEffect(() => {
    reviewController.current?.abort()
    reviewController.current = null
    setReview(null)
  }, [selectedDocument?.id])

  const load = useCallback(async (signal) => {
    const preserveCurrentView = preserveExpedienteDuringMemorandumRefresh.current
    if (!preserveCurrentView) setData(null)
    setLoading(true)
    setError('')
    try {
      const expediente = await postulacionesService.obtenerExpediente(id, signal)
      let capacidades = null
      try {
        capacidades = await postulacionesService.obtenerCapacidadesModalidad(expediente.detalle.modalidad, signal)
      } catch (capabilityError) {
        if (capabilityError.canceled) throw capabilityError
      }
      setData({ ...expediente, capacidades })
    } catch (requestError) {
      if (!requestError.canceled) setError(requestError.message)
    } finally {
      if (preserveCurrentView) preserveExpedienteDuringMemorandumRefresh.current = false
      if (!signal?.aborted) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, revision])
  useEffect(() => {
    if (!getMemorandumPublicationContract(data)) {
      setMemorandums({ data: [], loading: false, error: '' })
      return undefined
    }
    const controller = new AbortController()
    setMemorandums((current) => ({ ...current, loading: true, error: '' }))
    postulacionesService.obtenerMemorandumsDesignacion(id, controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setMemorandums({ data: rows || [], loading: false, error: '' }) })
      .catch((requestError) => { if (!requestError.canceled && !controller.signal.aborted) setMemorandums({ data: [], loading: false, error: requestError.message }) })
    return () => controller.abort()
  }, [data?.flujo?.gestion_decisiones_academicas, id, memorandumRevision])
  useLayoutEffect(() => {
    if (loading || !data) return
    const pendingNavigation = pendingSectionRestore.current
      ? { sectionId: pendingSectionRestore.current }
      : pendingHashNavigation.current
    if (!pendingNavigation) return
    const pendingId = typeof pendingNavigation === 'string' ? pendingNavigation : pendingNavigation.sectionId
    const section = document.getElementById(pendingId)
    const sectionPanel = section?.closest('[data-expediente-panel]')?.dataset.expedientePanel
      || EXPEDIENTE_HASH_TABS[pendingId]
    if (sectionPanel && activeTab !== sectionPanel) {
      setActiveTab(sectionPanel)
      return
    }
    pendingSectionRestore.current = null
    pendingHashNavigation.current = null
    if (section && !section.closest('[data-expediente-panel][hidden]') && typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({
        ...(pendingNavigation.behavior ? { behavior: pendingNavigation.behavior } : {}),
        block: 'start',
      })
    }
  }, [activeTab, data, loading])
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      pendingHashNavigation.current = hash ? { sectionId: hash.slice(1) } : null
      setActiveTab(expedienteTabFromHash(hash))
    }
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])
  useEffect(() => {
    if (data?.detalle?.modalidad_detalle?.codigo !== 'EXAMEN_GRADO') {
      setExamen(null)
      return undefined
    }
    const controller = new AbortController()
    postulacionesService.obtenerExamenGrado(id, controller.signal)
      .then((value) => { if (!controller.signal.aborted) setExamen(value) })
      .catch((requestError) => { if (!requestError.canceled && !controller.signal.aborted) setExamen(null) })
    return () => controller.abort()
  }, [data, examenRevision, id])
  useEffect(() => {
    if (data?.detalle?.modalidad_detalle?.codigo !== 'EXCELENCIA_ACADEMICA') {
      setExcelencia(null)
      return undefined
    }
    const controller = new AbortController()
    postulacionesService.obtenerExcelenciaAcademica(id, controller.signal)
      .then((value) => { if (!controller.signal.aborted) setExcelencia(value) })
      .catch((requestError) => { if (!requestError.canceled && !controller.signal.aborted) setExcelencia(null) })
    return () => controller.abort()
  }, [data, excelenciaRevision, id])
  useEffect(() => {
    if (data?.detalle?.modalidad_detalle?.codigo !== 'GRADUACION_VIA_DIPLOMADO') {
      setDiplomado(null)
      return undefined
    }
    const controller = new AbortController()
    postulacionesService.obtenerDiplomado(id, controller.signal)
      .then((value) => { if (!controller.signal.aborted) setDiplomado(value) })
      .catch((requestError) => { if (!requestError.canceled && !controller.signal.aborted) setDiplomado(null) })
    return () => controller.abort()
  }, [data, diplomadoRevision, id])
  useEffect(() => {
    if (data?.detalle?.modalidad_detalle?.codigo !== 'TRABAJO_DIRIGIDO') {
      setTrabajoDirigido(null)
      return undefined
    }
    const controller = new AbortController()
    postulacionesService.obtenerTrabajoDirigido(id, controller.signal)
      .then((value) => { if (!controller.signal.aborted) setTrabajoDirigido(value) })
      .catch((requestError) => { if (!requestError.canceled && !controller.signal.aborted) setTrabajoDirigido(null) })
    return () => controller.abort()
  }, [data, trabajoDirigidoRevision, id])

  useEffect(() => {
    const controller = new AbortController()
    setHistory({ data: null, loading: true, error: '' })
    postulacionesService.obtenerHistorial(id, historyPage, controller.signal)
      .then((historyData) => setHistory({ data: historyData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setHistory({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, historyPage, historyRevision])

  useEffect(() => {
    const controller = new AbortController()
    setActiveActors({ data: null, loading: true, error: '' })
    postulacionesService.obtenerActores(id, true, activeActorsPage, controller.signal)
      .then((actorsData) => setActiveActors({ data: actorsData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setActiveActors({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, activeActorsPage, activeActorsRevision])

  const reloadActiveTribunals = useCallback(async () => {
    activeTribunalsController.current?.abort()
    const controller = new AbortController()
    activeTribunalsController.current = controller
    setActiveTribunals({ data: null, loading: true, error: '' })
    try {
      const tribunals = await postulacionesService.obtenerTribunalesActivos(id, { signal: controller.signal })
      if (!controller.signal.aborted) {
        setActiveTribunals({ data: tribunals, loading: false, error: '' })
        activeTribunalsController.current = null
      }
      return tribunals
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        setActiveTribunals({ data: null, loading: false, error: requestError.message })
        activeTribunalsController.current = null
      }
      throw requestError
    }
  }, [id])

  useEffect(() => {
    const isProject = data?.detalle?.modalidad_detalle?.codigo === 'PROYECTO_GRADO'
    const hasTribunalReview = data?.flujo?.etapas?.some((stage) => stage.codigo === 'REVISION_TRIBUNAL_PREVIA')
    const isProjectProfile = data?.flujo?.etapa_actual?.codigo === 'PERFIL_PROYECTO'
    if (!isProject || (!hasTribunalReview && !isProjectProfile)) {
      setActiveTribunals({ data: null, loading: false, error: '' })
      return undefined
    }
    reloadActiveTribunals().catch(() => {})
    return () => activeTribunalsController.current?.abort()
  }, [data?.detalle?.modalidad_detalle?.codigo, data?.flujo?.etapa_actual?.codigo, data?.flujo?.etapas, activeTribunalsRevision, reloadActiveTribunals])

  useEffect(() => {
    const controller = new AbortController()
    setHistoricalActors({ data: null, loading: true, error: '' })
    postulacionesService.obtenerActores(id, false, historicalActorsPage, controller.signal)
      .then((actorsData) => setHistoricalActors({ data: actorsData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setHistoricalActors({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, historicalActorsPage, historicalActorsRevision])

  useEffect(() => {
    const controller = new AbortController()
    setDocuments({ data: null, loading: true, error: '' })
    postulacionesService.obtenerDocumentos(id, documentsPage, controller.signal)
      .then((documentData) => {
        setDocuments({ data: documentData, loading: false, error: '' })
        setSelectedDocument((current) => current ? (documentData.results || []).find((item) => item.id === current.id) || current : null)
      })
      .catch((requestError) => {
        if (!requestError.canceled) setDocuments({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, documentsPage, documentsRevision])

  useEffect(() => {
    const controller = new AbortController()
    setDefenses({ data: null, loading: true, error: '' })
    postulacionesService.obtenerDefensas(id, defensesPage, controller.signal)
      .then((defenseData) => {
        if (!controller.signal.aborted) setDefenses({ data: defenseData, loading: false, error: '' })
      })
      .catch((requestError) => {
        if (!requestError.canceled && !controller.signal.aborted) setDefenses({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, defensesPage, defensesRevision])

  useEffect(() => {
    if (!data) return undefined
    const stage = data?.flujo?.etapas?.find((item) => item.codigo === 'REVISION_TRIBUNAL_PREVIA')
    if (!stage) {
      setTribunalReports({ data: null, loading: false, error: '' })
      return undefined
    }
    const controller = new AbortController()
    setTribunalReports({ data: null, loading: true, error: '' })
    postulacionesService.obtenerInformesRevisionTribunal(stage.id, controller.signal)
      .then((reports) => {
        if (!controller.signal.aborted) setTribunalReports({ data: reports, loading: false, error: '' })
      })
      .catch((requestError) => {
        if (!requestError.canceled && !controller.signal.aborted) setTribunalReports({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [data, tribunalReportsRevision])

  const actorSelectionPresentation = useMemo(() => {
    const stage = data?.flujo?.etapa_actual
    const presentation = ACTOR_SELECTION_PRESENTATION[data?.detalle?.modalidad_detalle?.codigo]?.[stage?.codigo]
    if (!presentation?.preventOccupiedDirectedSecretary) return presentation
    const profile = (data?.flujo?.etapas || [])
      .filter((item) => item.codigo === 'PERFIL_TRABAJO_DIRIGIDO' && item.activo !== false)
      .sort((first, second) => Number(second.numero_intento) - Number(first.numero_intento))[0]
    return { ...presentation, profileSeguimiento: profile?.id ?? null, seguimientoEtapa: stage?.id }
  }, [data?.detalle?.modalidad_detalle?.codigo, data?.flujo?.etapa_actual, data?.flujo?.etapas])

  if ((loading && !preserveExpedienteDuringMemorandumRefresh.current) || error || !data) {
    const modalityName = data?.detalle?.modalidad_detalle?.nombre || data?.flujo?.modalidad?.nombre
    return (
      <section className="mx-auto max-w-5xl space-y-5">
        <PageHeader title={modalityName ? `Expediente de ${modalityName}` : 'Expediente'} description="Estado actual de tu proceso académico." />
        <DataState loading={loading} error={error} empty={!loading && !error && !data} onRetry={() => setRevision((value) => value + 1)} />
        <BackLink />
      </section>
    )
  }

  const { detalle, flujo, resultado, cierre } = data
  const isHistorical = String(detalle?.tipo_registro || '').toUpperCase() === 'HISTORICO'
  const cierreSoportado = data.capacidades?.cierre_soportado ?? detalle.modalidad_detalle?.codigo === 'PROYECTO_GRADO'
  const student = detalle.estudiante_detalle
  const period = detalle.periodo_detalle
  const modalityCode = detalle.modalidad_detalle?.codigo
  const currentStage = flujo.etapa_actual
  const progress = flujo.porcentaje_avance === null || flujo.porcentaje_avance === undefined
    ? null
    : Number(flujo.porcentaje_avance)
  const safeProgress = progress !== null && Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : null
  const canUpload = auth?.hasPermission?.('puede_cargar_documentos') === true
  const canReview = auth?.hasPermission?.('puede_gestionar_documentos') === true
  const canManageDefenses = auth?.hasPermission?.('puede_gestionar_defensas') === true
  const canManageEvaluations = auth?.hasPermission?.('puede_gestionar_evaluaciones') === true && canManageDefenses
  const canManageClosure = auth?.hasPermission?.('puede_gestionar_cierre') === true
  const canManageApplications = auth?.hasPermission?.('puede_gestionar_postulaciones') === true
  const canManageAssignments = auth?.hasPermission?.('puede_gestionar_asignaciones') === true
  const canManageTribunalReports = auth?.hasPermission?.('puede_gestionar_seguimiento') === true
  const isProjectGrade = detalle.modalidad_detalle?.codigo === 'PROYECTO_GRADO'
  const isExamGrade = detalle.modalidad_detalle?.codigo === 'EXAMEN_GRADO'
  const isAcademicExcellence = detalle.modalidad_detalle?.codigo === 'EXCELENCIA_ACADEMICA'
  const examResult = isExamGrade ? examen?.resultado_final : null
  const effectiveResult = isExamGrade
    ? {
        data: examResult
          ? examResult.completo === true
            ? examResult
            : { ...examResult, nota_final: null, clasificacion: null }
          : null,
        error: '',
      }
    : resultado
  const tribunalReviewStage = (flujo.etapas || []).find((stage) => stage.codigo === 'REVISION_TRIBUNAL_PREVIA')
  const documentRows = documents.data?.results || []
  const tribunalReviewDocuments = getTribunalReviewDocuments(modalityCode)
  const finalDocument = documentRows.find((document) => document.tipo_documento_codigo === tribunalReviewDocuments.finalDocumentCode)
  const currentFinalVersion = finalDocument?.versiones?.find((version) => version.es_version_actual && version.activo !== false)
  const evidenceDocuments = documentRows.filter((document) => (
    document.activo !== false
    && document.tipo_documento_codigo === tribunalReviewDocuments.evidenceDocumentCode
  ))
  const currentEvidenceVersions = evidenceDocuments.flatMap((document) => document.versiones || []).filter((version) => version.es_version_actual && version.activo !== false)
  const isCurrentProjectTribunalReview = isProjectGrade && currentStage?.codigo === 'REVISION_TRIBUNAL_PREVIA'
  const allDocumentVersions = documentRows.flatMap((document) => document.versiones || [])
  const canInitializeFlow = canManageApplications
    && detalle.activo !== false
    && data.capacidades?.soportada === true
    && data.capacidades?.configuracion_valida === true
    && (flujo.etapas || []).length === 0
  const stages = flujo.etapas || []
  const stageUi = getStageUiVisibility(detalle.modalidad_detalle?.codigo, currentStage?.codigo)
  const capabilityStages = data.capacidades?.etapas || []
  const lastCapabilityOrder = capabilityStages.reduce((last, stage) => Math.max(last, Number(stage.orden) || 0), 0)
  const closureIsRelevant = isProjectGrade
    ? stageUi.closure
    : cierreSoportado && currentStage?.orden && lastCapabilityOrder > 0
      && Number(currentStage.orden) >= lastCapabilityOrder - 1
  const closureDetailsOpen = closureIsRelevant
    || (isProjectGrade && currentStage?.codigo === 'REVISION_TRIBUNAL_PREVIA')
  const completedStages = stages.filter((stage) => ['APROBADA', 'COMPLETADA', 'CERRADA'].includes(stage.estado)).length
  const academicExcellenceResult = isAcademicExcellence
    && stages.some((stage) => stage.codigo === 'CONCLUSION_ACADEMICA' && stage.estado === 'APROBADA')
    && ['FAVORABLE', 'DESFAVORABLE'].includes(excelencia?.resultado?.estado)
    ? {
        criterio: excelencia.criterio,
        estado: excelencia.resultado.estado,
        promedioGeneral: excelencia.resultado.promedio_general,
      }
    : null
  const pendingTechnicalClosure = Boolean(
    data.capacidades?.cierre_soportado === true
    && stages.length > 0
    && completedStages === stages.length
    && safeProgress === 100
    && cierre.data?.cierre_documental_aprobado === true
    && cierre.data?.concluida === false
    && cierre.data?.estado_general !== 'CONCLUIDA'
  )
  const currentRequirements = flujo.orientacion_etapa_actual?.requisitos || []
  const pendingCurrentRequirements = currentRequirements.filter((item) => item.estado !== 'INFORMATIVO' && item.bloquea_siguiente_accion !== false && item.cumplido === false).length
  const currentOrientation = flujo.orientacion_etapa_actual
  const stageApprovalAllowed = Array.isArray(currentStage?.acciones_permitidas)
    ? currentStage.acciones_permitidas.includes('aprobar')
    : !currentOrientation?.siguiente_accion
      || (currentOrientation.siguiente_accion.codigo === 'APROBAR_ETAPA' && currentOrientation.siguiente_accion.estado === 'DISPONIBLE')
  const physicalRequirements = currentRequirements.filter((item) => item.tipo === 'ENTREGA_FISICA')
  const isIntegratedInscription = INSCRIPTION_PRESENTATION[detalle.modalidad_detalle?.codigo]?.integrated === true
    && currentStage?.codigo === 'INSCRIPCION'
  const inscriptionDocumentRequirements = isIntegratedInscription
    ? currentRequirements.filter((item) => item.tipo === 'DOCUMENTO')
    : []
  const isConcluded = detalle.estado_actual_detalle?.codigo === 'CONCLUIDA'
    || cierre.data?.concluida === true
    || cierre.data?.estado_general === 'CONCLUIDA'
  const isThesisGrade = detalle.modalidad_detalle?.codigo === 'TESIS_GRADO' || flujo.modalidad?.codigo === 'TESIS_GRADO'
  const isThesisPublicStage = isThesisGrade && currentStage?.codigo === 'DEFENSA_PUBLICA'
  const latestPublicStage = stages
    .filter((stage) => stage.codigo === 'DEFENSA_PUBLICA' && stage.activo !== false)
    .sort((left, right) => Number(right.numero_intento) - Number(left.numero_intento))[0]
  const publicDefenseMissingRoles = isThesisPublicStage
    ? getMissingPublicDefenseRoles(flujo.orientacion_etapa_actual)
    : []
  const thesisConclusionOrientation = isThesisPublicStage && currentStage?.estado === 'APROBADA'
    ? getThesisConclusionOrientation({
        publicStage: latestPublicStage,
        concluded: isConcluded,
        resultado,
        documents,
        defenses,
      })
    : null
  const actionOrientation = thesisConclusionOrientation || flujo.orientacion_etapa_actual
  const registerableAcademicDecisions = actionOrientation?.siguiente_accion?.codigo === 'REGISTRAR_DECISION'
    ? (flujo.gestion_decisiones_academicas?.decisiones || []).filter((decision) => decision.acciones_permitidas?.includes('REGISTRAR'))
    : []
  const orientationAcademicDecision = registerableAcademicDecisions.length === 1 ? registerableAcademicDecisions[0] : null
  const orientationApprovalDeclared = actionOrientation?.siguiente_accion?.codigo === 'APROBAR_ETAPA'
  const orientationApprovalAvailable = orientationApprovalDeclared
    && actionOrientation.siguiente_accion.estado === 'DISPONIBLE'
    && stageApprovalAllowed
  const canApproveStage = canManageApplications && orientationApprovalAvailable
  const isTrabajoDirigido = modalityCode === 'TRABAJO_DIRIGIDO'
  const directedConclusionOrientation = isTrabajoDirigido && currentOrientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA'
    ? currentOrientation : null
  const canConcludeDirected = isTrabajoDirigido && canManageApplications && !isConcluded
    && currentStage?.codigo === 'CIERRE_DOCUMENTAL'
    && (!directedConclusionOrientation || (directedConclusionOrientation.siguiente_accion?.codigo === 'CONCLUIR_ACADEMICAMENTE'
      && directedConclusionOrientation.siguiente_accion.estado === 'DISPONIBLE'))
  const directedConclusionState = { ...directedConclusion, allowed: canConcludeDirected, concluded: isConcluded }
  const concludeDirected = async () => {
    if (!canConcludeDirected || directedConclusionRequest.current || directedConclusion.done) return
    const controller = new AbortController()
    directedConclusionRequest.current = controller
    setDirectedConclusion({ submitting: true, error: '', done: false })
    try {
      await postulacionesService.concluirTrabajoDirigido(detalle.id, controller.signal)
      if (controller.signal.aborted) return
      setDirectedConclusion({ submitting: false, error: '', done: true })
      setTrabajoDirigidoRevision((value) => value + 1)
      setRevision((value) => value + 1)
      setHistoryRevision((value) => value + 1)
    } catch (requestError) {
      if (controller.signal.aborted) return
      directedConclusionRequest.current = null
      setDirectedConclusion({ submitting: false, error: requestError.message || 'No se pudo concluir académicamente el Trabajo Dirigido.', done: false })
    }
  }
  const activeCurrentDefense = hasActiveCurrentDefense({
    defenses: defenses.data?.results || [],
    orientation: actionOrientation,
    currentStage,
  })
  const thesisPublicCandidates = stages.filter((stage) => stage.codigo === 'DEFENSA_PUBLICA'
    && stage.activo !== false && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado))
  const canOpenThesisAuthorities = canManageAssignments && isThesisPublicStage
    && currentStage?.id && currentStage.activo !== false
    && ['EN_PROCESO', 'OBSERVADA'].includes(currentStage.estado) && !activeCurrentDefense
    && thesisPublicCandidates.length === 1
    && String(thesisPublicCandidates[0].id) === String(currentStage.id)
    && thesisPublicCandidates[0].numero_intento === currentStage.numero_intento
  const defenseProgrammingContext = getDefenseProgrammingContext({
    stages,
    currentStage,
    orientation: actionOrientation,
    activeCurrentDefense,
  })
  const openCurrentDefenseProgramming = () => openDefenseOperation('programar', null, defenseProgrammingContext)
  const canProgramDefense = canManageDefenses
    && !activeCurrentDefense
    && (!isThesisGrade || (
      actionOrientation?.siguiente_accion?.codigo === 'PROGRAMAR_EVENTO'
      && actionOrientation?.siguiente_accion?.estado === 'DISPONIBLE'
    ))
    && (!isProjectGrade || (
      actionOrientation?.siguiente_accion?.codigo === 'PROGRAMAR_EVENTO'
      && actionOrientation?.siguiente_accion?.estado === 'DISPONIBLE'
      && !pendingCurrentRequirements
    ))
  const canStartCurrentStage = canManageApplications
    && currentStage?.id
    && currentStage.estado === 'PENDIENTE'
    && !isConcluded
    && (!isTrabajoDirigido || currentStage.acciones_permitidas?.includes('iniciar'))
    && (!isAcademicExcellence || currentStage.acciones_permitidas?.includes('iniciar'))
  const examConclusionPending = Boolean(
    isExamGrade
    && examResult?.completo === true
    && detalle.estado_actual_detalle?.codigo === 'EN_PROCESO'
    && (currentStage == null || (currentStage.codigo === 'CONCLUSION_ACADEMICA' && currentStage.estado === 'APROBADA'))
    && stages.length > 0
    && completedStages === stages.length
  )
  const isStudentView = auth?.roleCode === 'ESTUDIANTE'

  const initializeFlow = async () => {
    if (flowInitializationSubmitting.current) return
    const confirmed = window.confirm(
      isProjectGrade
        ? 'Se iniciará el proceso de Proyecto de Grado. Inscripción quedará aprobada y Perfil de Proyecto quedará en proceso.'
        : 'Se crearán las etapas iniciales del flujo académico para esta postulación.\nEsta acción no inicia ni aprueba ninguna etapa.',
    )
    if (!confirmed) return
    flowInitializationSubmitting.current = true
    flowInitializationController.current?.abort()
    const controller = new AbortController()
    flowInitializationController.current = controller
    setFlowInitialization({ submitting: true, error: '' })
    try {
      await postulacionesService.inicializarFlujo(detalle.id, controller.signal)
      if (!controller.signal.aborted) {
        flowInitializationSubmitting.current = false
        setFlowInitialization({ submitting: false, error: '' })
        setRevision((value) => value + 1)
      }
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        flowInitializationSubmitting.current = false
        setFlowInitialization({
          submitting: false,
          error: isProjectGrade
            ? `${requestError.message || 'No se pudo completar el inicio del proceso.'} Se recargó el estado real del expediente.`
            : requestError.message,
        })
        if (isProjectGrade) setRevision((value) => value + 1)
      }
    }
  }

  const startCurrentStage = async () => {
    if (stageInitializationSubmitting.current || !canStartCurrentStage) return
    stageInitializationSubmitting.current = true
    stageInitializationController.current?.abort()
    const controller = new AbortController()
    stageInitializationController.current = controller
    setStageInitialization({ submitting: true, error: '' })
    try {
      await postulacionesService.iniciarEtapa(currentStage.id, controller.signal)
      if (!controller.signal.aborted) {
        stageInitializationSubmitting.current = false
        setStageInitialization({ submitting: false, error: '' })
        setRevision((value) => value + 1)
      }
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        stageInitializationSubmitting.current = false
        setStageInitialization({ submitting: false, error: requestError.message })
      }
    }
  }

  const approveCurrentStage = async () => {
    if (stageApprovalSubmitting.current || !currentStage?.id || !['EN_PROCESO', 'OBSERVADA'].includes(currentStage.estado)) return
    const confirmed = window.confirm(
      `¿Confirmas la aprobación de la etapa ${currentStage.nombre || formatCode(currentStage.codigo)}? Esta acción es explícita y no inicia ninguna etapa.`,
    )
    if (!confirmed) return
    stageApprovalSubmitting.current = true
    stageApprovalController.current?.abort()
    const controller = new AbortController()
    stageApprovalController.current = controller
    setStageApproval({ submitting: true, error: '', fields: {} })
    try {
      await postulacionesService.aprobarEtapa(currentStage.id, controller.signal)
      if (!controller.signal.aborted) {
        stageApprovalSubmitting.current = false
        setStageApproval({ submitting: false, error: '', fields: {} })
        pendingSectionRestore.current = 'resumen'
        window.history.replaceState(window.history.state, '', '#resumen')
        setRevision((value) => value + 1)
      }
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        stageApprovalSubmitting.current = false
        const error = requestError.faltantes?.length
          ? `No se puede aprobar la ${currentStage.nombre || formatCode(currentStage.codigo)}. Falta completar: ${requestError.faltantes.map(humanizeRequirementCode).join(', ')}.`
          : requestError.message
        setStageApproval({ submitting: false, error, fields: requestError.fields || {} })
        setRevision((value) => value + 1)
      }
    }
  }

  const navigateToSection = (sectionId, { history = 'push', behavior = 'smooth' } = {}) => {
    const section = document.getElementById(sectionId)
    const panel = section?.closest('[data-expediente-panel]')?.dataset.expedientePanel
      || EXPEDIENTE_HASH_TABS[sectionId]
    if (panel) setActiveTab(panel)

    if (history !== 'none') {
      const url = `${window.location.pathname}${window.location.search}#${sectionId}`
      if (history === 'replace') window.history.replaceState(window.history.state, '', url)
      else if (window.location.hash !== `#${sectionId}`) window.history.pushState(window.history.state, '', url)
    }

    pendingHashNavigation.current = { sectionId, behavior }
    if (section && panel === activeTab && !section.closest('[data-expediente-panel][hidden]') && typeof section.scrollIntoView === 'function') {
      pendingHashNavigation.current = null
      section.scrollIntoView({ behavior, block: 'start' })
    }
  }

  const handleSectionClick = (event) => {
    const link = event.target.closest?.('a[href^="#"]')
    if (!link) return
    const sectionId = link.getAttribute('href').slice(1)
    if (!document.getElementById(sectionId)) return
    event.preventDefault()
    navigateToSection(sectionId)
  }

  const scrollToDocuments = () => navigateToSection('documentos', { history: 'replace' })

  const closeAssignment = () => {
    assignmentController.current?.abort()
    assignmentController.current = null
    assignmentSubmitting.current = false
    setAssignment(null)
  }

  const submitAssignment = async (payload) => {
    if (assignmentSubmitting.current) return
    assignmentSubmitting.current = true
    assignmentController.current?.abort()
    const controller = new AbortController()
    assignmentController.current = controller
    setAssignment((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      if (assignment.replacementPosition) {
        await postulacionesService.reemplazarActor(
          assignment.replacementPosition.asignacion_actual,
          { nuevo_usuario: payload.usuario, observaciones: payload.observaciones },
          controller.signal,
        )
      } else {
        await postulacionesService.asignarActor(detalle.id, payload, controller.signal)
      }
      if (!controller.signal.aborted) {
        if (assignment?.context === 'TESIS_DEFENSA_PUBLICA') {
          assignmentSubmitting.current = false
          setAssignment((current) => ({ ...current, submitting: false, fields: {}, error: '' }))
        } else closeAssignment()
        setActiveActorsRevision((value) => value + 1)
        setActiveTribunalsRevision((value) => value + 1)
        setRevision((value) => value + 1)
      }
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        assignmentSubmitting.current = false
        setAssignment((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
      }
    }
  }

  const submitAcademicDecision = async (payload) => {
    academicDecisionController.current?.abort()
    const controller = new AbortController()
    academicDecisionController.current = controller
    setAcademicDecision((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      await postulacionesService.registrarDecisionAcademica(
        flujo.gestion_decisiones_academicas.contexto.seguimiento_etapa,
        payload,
        controller.signal,
      )
      if (!controller.signal.aborted) {
        setAcademicDecision(null)
        setRevision((value) => value + 1)
      }
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        setAcademicDecision((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
      }
    }
  }

  const openAcademicDecision = (decision) => setAcademicDecision({ decision, submitting: false, fields: {}, error: '' })

  const profileTutorPositions = (flujo.gestion_actores?.posiciones || []).filter((position) => position.tipo_participacion === 'TUTOR')
  const profileTutorPosition = profileTutorPositions.length === 1 ? profileTutorPositions[0] : null
  const profileTutorRequirements = (flujo.orientacion_etapa_actual?.requisitos || []).filter((item) => item.codigo === 'TUTOR')
  const canOpenProfileTutor = isThesisGrade && currentStage?.codigo === 'PERFIL_TESIS'
    && currentStage.activo !== false && currentStage.estado === 'EN_PROCESO'
    && String(detalle.id) === String(id) && canManageAssignments
    && flujo.gestion_actores?.contexto?.tipo === 'ETAPA'
    && flujo.gestion_actores?.contexto?.codigo_etapa === currentStage.codigo
    && flujo.gestion_actores?.contexto?.seguimiento_etapa != null
    && String(flujo.gestion_actores.contexto.seguimiento_etapa) === String(currentStage.id)
    && profileTutorRequirements.length === 1 && profileTutorRequirements[0].cumplido === false
    && profileTutorRequirements[0].destino === '#actores'
    && profileTutorPosition?.clave === 'TUTOR_TESIS_1' && profileTutorPosition.ambito === 'POSTULACION'
    && profileTutorPosition.seguimiento_etapa == null && profileTutorPosition.orden_cargo == null
    && profileTutorPosition.estado_ocupacion === 'VACANTE' && profileTutorPosition.habilitada === true
    && profileTutorPosition.asignacion_actual == null && !profileTutorPosition.asignacion_actual_detalle
    && profileTutorPosition.acciones_permitidas?.includes('ASIGNAR') && !profileTutorPosition.bloqueo
    && (!profileTutorPosition.precondicion || profileTutorPosition.precondicion.estado === 'CUMPLIDA')

  const privateSecretaryPositions = (flujo.gestion_actores?.posiciones || []).filter((position) =>
    position.tipo_participacion === 'DOCENTE_MODALIDAD' || position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1')
  const privateSecretaryPosition = privateSecretaryPositions.length === 1 ? privateSecretaryPositions[0] : null
  const privateSecretaryAction = flujo.orientacion_etapa_actual?.siguiente_accion
  const canOpenPrivateSecretary = !isHistorical && isThesisGrade && canManageAssignments
    && String(detalle.id) === String(id) && currentStage?.codigo === 'DEFENSA_PRIVADA'
    && currentStage.activo === true && ['EN_PROCESO', 'OBSERVADA'].includes(currentStage.estado)
    && stages.filter((stage) => stage.codigo === currentStage.codigo && stage.activo !== false
      && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado)).length === 1
    && stages.some((stage) => String(stage.id) === String(currentStage.id) && stage.codigo === currentStage.codigo)
    && privateSecretaryAction?.codigo === 'GESTIONAR_PRECONDICIONES'
    && privateSecretaryAction.estado === 'PENDIENTE' && privateSecretaryAction.destino === '#actores'
    && !privateSecretaryAction.bloqueo && !loading && !error
    && flujo.gestion_actores?.contexto?.tipo === 'ETAPA'
    && flujo.gestion_actores.contexto.codigo_etapa === currentStage.codigo
    && currentStage.id != null && flujo.gestion_actores.contexto.seguimiento_etapa != null
    && String(flujo.gestion_actores.contexto.seguimiento_etapa) === String(currentStage.id)
    && privateSecretaryPosition?.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1'
    && privateSecretaryPosition.tipo_participacion === 'DOCENTE_MODALIDAD'
    && privateSecretaryPosition.ambito === 'POSTULACION' && privateSecretaryPosition.seguimiento_etapa === null
    && privateSecretaryPosition.estado_ocupacion === 'VACANTE' && privateSecretaryPosition.habilitada === true
    && privateSecretaryPosition.asignacion_actual === null && !privateSecretaryPosition.asignacion_actual_detalle
    && privateSecretaryPosition.acciones_permitidas?.includes('ASIGNAR') && !privateSecretaryPosition.bloqueo
    && (!privateSecretaryPosition.precondicion || privateSecretaryPosition.precondicion.estado === 'CUMPLIDA')

  const reviewDestination = { REVISION_TUTOR: '#dictamen-tutor', REVISION_TRIBUNAL: '#dictamen-tribunal' }[currentStage?.codigo]
  const reviewStages = stages.filter((stage) => reviewDestination && stage.codigo === currentStage.codigo
    && stage.activo !== false && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado))
  const supportsContextualDictamen = !isHistorical && isThesisGrade && canManageTribunalReports
    && String(detalle.id) === String(id) && Boolean(reviewDestination)
    && currentStage.id && currentStage.numero_intento != null && currentStage.activo !== false
    && ['EN_PROCESO', 'OBSERVADA'].includes(currentStage.estado)
    && reviewStages.length === 1 && String(reviewStages[0].id) === String(currentStage.id)
    && reviewStages[0].numero_intento === currentStage.numero_intento
    && flujo.orientacion_etapa_actual?.siguiente_accion?.codigo === 'REGISTRAR_DICTAMEN'
    && flujo.orientacion_etapa_actual.siguiente_accion.estado === 'DISPONIBLE'
    && flujo.orientacion_etapa_actual.siguiente_accion.destino === reviewDestination
    && !flujo.orientacion_etapa_actual.siguiente_accion.bloqueo
  const openContextualDictamen = (event) => {
    if (supportsContextualDictamen && dictamenOpener.current?.(event)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const openActorManagement = (event) => {
    actorManagementOpener.current = event?.currentTarget || null
    actorManagementSummaryNavigationPending.current = false
    setActorManagement({ submitting: false, results: {} })
  }

  const closeActorManagement = () => {
    const shouldNavigateToSummary = actorManagementSummaryNavigationPending.current
    actorManagementSummaryNavigationPending.current = false
    setActorManagement(null)
    if (shouldNavigateToSummary) navigateToSection('resumen')
    requestAnimationFrame(() => {
      const focusTarget = shouldNavigateToSummary
        ? document.getElementById('expediente-tab-resumen')
        : actorManagementOpener.current
      if (focusTarget?.isConnected && !focusTarget.closest('[hidden]')) focusTarget.focus()
    })
  }

  const refreshActorManagement = ({ close = false } = {}) => {
    setActiveActorsRevision((value) => value + 1)
    setHistoricalActorsRevision((value) => value + 1)
    setActiveTribunalsRevision((value) => value + 1)
    setRevision((value) => value + 1)
    if (close) closeActorManagement()
  }

  const submitActorManagement = async (jobs) => {
    if (actorManagementSubmitting.current || jobs.length === 0) return
    actorManagementSubmitting.current = true
    actorManagementController.current?.abort()
    const controller = new AbortController()
    actorManagementController.current = controller
    setActorManagement((current) => ({ ...current, submitting: true }))
    const outcomes = {}

    for (const job of jobs) {
      setActorManagement((current) => ({
        ...current,
        results: { ...current.results, [job.position.clave]: { state: 'PROCESSING', message: '' } },
      }))
      try {
        if (job.action === 'REEMPLAZAR') {
          await postulacionesService.reemplazarActor(
            job.position.asignacion_actual,
            { nuevo_usuario: job.payload.usuario, observaciones: job.payload.observaciones },
            controller.signal,
          )
        } else if (job.action === 'FINALIZAR') {
          await postulacionesService.finalizarAsignacion(
            job.position.asignacion_actual,
            { observaciones: job.payload.observaciones },
            controller.signal,
          )
        } else {
          await postulacionesService.asignarActor(detalle.id, job.payload, controller.signal)
        }
        if (controller.signal.aborted) return
        outcomes[job.position.clave] = 'SUCCESS'
        const assignedPrivateDefenseTeacher = job.action === 'ASIGNAR'
          && job.position.tipo_participacion === 'DOCENTE_MODALIDAD'
          && stages.find((stage) => String(stage.id) === String(job.position.seguimiento_etapa))?.codigo === 'DEFENSA_PRIVADA'
        if (assignedPrivateDefenseTeacher) actorManagementSummaryNavigationPending.current = true
        setActorManagement((current) => ({
          ...current,
          results: { ...current.results, [job.position.clave]: { state: 'SUCCESS', message: '' } },
        }))
      } catch (requestError) {
        if (requestError.canceled || controller.signal.aborted) return
        const responseErrors = requestError.response?.data?.non_field_errors || []
        const fieldErrors = Object.values(requestError.fields || {}).flat().filter(Boolean)
        const message = [...new Set([
          requestError.message,
          ...(Array.isArray(responseErrors) ? responseErrors : [responseErrors]),
          ...fieldErrors,
        ].filter(Boolean))].join(' ')
        outcomes[job.position.clave] = { state: 'ERROR', message: message || 'No se pudo guardar esta asignación.' }
        setActorManagement((current) => ({
          ...current,
          results: { ...current.results, [job.position.clave]: outcomes[job.position.clave] },
        }))
      }
    }

    if (!controller.signal.aborted) {
      actorManagementSubmitting.current = false
      setActorManagement((current) => ({ ...current, submitting: false }))
      refreshActorManagement()
    }
    return outcomes
  }

  const closeTeamAssignment = () => {
    if (teamAssignmentSubmitting.current) return
    teamAssignmentController.current?.abort()
    teamAssignmentController.current = null
    teamAssignmentSubmitting.current = false
    setTeamAssignment(null)
  }

  const submitTeamAssignment = async (jobs) => {
    if (teamAssignmentSubmitting.current || jobs.length === 0) return
    const closeOnSuccess = teamAssignment?.mode === 'PUBLIC_AUTHORITIES'
    teamAssignmentSubmitting.current = true
    teamAssignmentController.current?.abort()
    const controller = new AbortController()
    teamAssignmentController.current = controller
    setTeamAssignment((current) => ({ ...current, submitting: true, error: '' }))
    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index]
      setTeamAssignment((current) => ({ ...current, results: { ...current.results, [job.key]: { state: 'PROCESSING', message: '' } } }))
      try {
        await postulacionesService.asignarActor(detalle.id, job.payload, controller.signal)
        if (controller.signal.aborted) return
        setTeamAssignment((current) => ({ ...current, results: { ...current.results, [job.key]: { state: 'SUCCESS', message: 'Asignado', name: job.name } } }))
      } catch (requestError) {
        if (requestError.canceled || controller.signal.aborted) return
        setTeamAssignment((current) => ({ ...current, submitting: false, results: { ...current.results, [job.key]: { state: 'ERROR', message: requestError.message || 'No se pudo asignar.', name: job.name } } }))
        teamAssignmentSubmitting.current = false
        setActiveActorsRevision((value) => value + 1)
        setActiveTribunalsRevision((value) => value + 1)
        setRevision((value) => value + 1)
        return
      }
    }
    if (!controller.signal.aborted) {
      teamAssignmentSubmitting.current = false
      setActiveActorsRevision((value) => value + 1)
      setActiveTribunalsRevision((value) => value + 1)
      setRevision((value) => value + 1)
      if (closeOnSuccess) closeTeamAssignment()
      else setTeamAssignment((current) => ({ ...current, submitting: false }))
    }
  }

  const loadApplicableDocumentTypes = async (
    signal,
    { preserveCurrent = false, excludeTypeIds = [] } = {},
  ) => {
    const excludedTypeIds = new Set(excludeTypeIds.map(String))
    setDocumentTypes((current) => ({
      data: preserveCurrent
        ? current.data.filter((type) => !excludedTypeIds.has(String(type.id)))
        : [],
      loading: true,
      error: '',
    }))
    try {
      const response = await postulacionesService.obtenerDocumentosAplicables(id, signal)
      const rows = (response.documentos_aplicables || []).filter(
        (type) => !['OBSERVACIONES_DEFENSA_PERFIL', 'MEMORANDUM_DESIGNACION_PROYECTO'].includes(type.codigo || type.tipo_documento_codigo),
      )
      if (!signal.aborted) setDocumentTypes({ data: rows, loading: false, error: '' })
      return { ...response, documentos_aplicables: rows }
    } catch (requestError) {
      if (!requestError.canceled && !signal.aborted) {
        setDocumentTypes((current) => ({ ...current, loading: false, error: requestError.message }))
      }
      return false
    }
  }

  const openUpload = async (document = null, { typesLoaded = false, opener = globalThis.document.activeElement, context = null } = {}) => {
    if (document && !isHistorical && document.capacidad_carga?.permitida !== true) return
    uploadOpener.current = opener
    uploadController.current?.abort()
    const controller = new AbortController()
    uploadController.current = controller
    const eventoDefensaId = document?.tipo_documento_codigo === 'OBSERVACIONES_DEFENSA_PERFIL'
      ? document.evento_defensa
      : undefined
    setUpload({ document, context, eventoDefensaId, multiple: !document && !context, title: context ? 'Cargar Acta de Defensa' : document || isHistorical ? undefined : 'Cargar documentos', submitting: false, fields: {}, error: '', success: '' })
    if (document || typesLoaded) return
    setDocumentTypes((current) => ({ ...current, loading: true, error: '' }))
    try {
      if (isHistorical) {
        const rows = await postulacionesService.obtenerTiposDocumentosHistoricos(id, controller.signal)
        setDocumentTypes({ data: rows, loading: false, error: '' })
        return
      }
      await loadApplicableDocumentTypes(controller.signal)
    } catch (requestError) {
      if (!requestError.canceled) setDocumentTypes({ data: [], loading: false, error: requestError.message })
    }
  }

  const openUploadFromDetail = (document) => {
    setSelectedDocument(null)
    openUpload(document)
  }

  const openContextualDocumentUpload = async (navigate = false, pendingCodes = null) => {
    if (pendingCodes === 'ACTA_DEFENSA') {
      if (!canUpload || !isThesisGrade || actionOrientation?.siguiente_accion?.codigo !== 'CARGAR_ACTA_DEFENSA'
        || contextualUploadPending.current || upload) return
      contextualUploadPending.current = true
      setContextualUploadMessage('')
      const opener = globalThis.document.activeElement
      const controller = new AbortController()
      uploadController.current?.abort()
      uploadController.current = controller
      const readAll = async (reader) => {
        const rows = []
        const seen = new Set()
        for (let page = 1; !controller.signal.aborted; page += 1) {
          const result = await reader(id, page, controller.signal)
          rows.push(...(Array.isArray(result) ? result : result?.results || []))
          if (Array.isArray(result) || !result?.next) return rows
          if (seen.has(result.next)) throw new Error('No se pudo verificar toda la documentación del expediente.')
          seen.add(result.next)
        }
        return rows
      }
      try {
        const [fresh, applicable, existing, events] = await Promise.all([
          postulacionesService.obtenerExpediente(id, controller.signal),
          loadApplicableDocumentTypes(controller.signal),
          readAll(postulacionesService.obtenerDocumentos),
          readAll(postulacionesService.obtenerDefensas),
        ])
        if (controller.signal.aborted) return
        if (String(fresh.detalle?.id) !== String(id) || fresh.detalle?.modalidad_detalle?.codigo !== 'TESIS_GRADO'
          || fresh.detalle?.estado_actual_detalle?.codigo === 'CONCLUIDA'
          || String(applicable?.postulacion_id) !== String(id) || applicable?.modalidad !== 'TESIS_GRADO'
          || applicable?.etapa_actual !== 'DEFENSA_PUBLICA') throw new Error('El contexto documental cambió. Revisa el expediente actualizado.')
        const stages = (fresh.flujo?.etapas || []).filter((stage) => stage.codigo === 'DEFENSA_PUBLICA' && stage.activo !== false)
        const latest = Math.max(...stages.map((stage) => Number(stage.numero_intento)))
        const candidates = stages.filter((stage) => Number(stage.numero_intento) === latest)
        const stage = candidates[0]
        if (candidates.length !== 1 || !stage?.id || stage.estado !== 'APROBADA'
          || String(stage.id) !== String(latestPublicStage?.id) || Number(stage.numero_intento) !== Number(latestPublicStage?.numero_intento)) {
          throw new Error('No se pudo verificar el seguimiento aprobado vigente de Defensa Pública.')
        }
        const actas = existing.filter((document) => document.tipo_documento_codigo === 'ACTA_DEFENSA')
        if (actas.length > 1) throw new Error('Existen registros de Acta que requieren revisión documental.')
        if (actas.length) {
          setContextualUploadMessage('El Acta ya está registrada. Revisa su estado, vínculo y versiones antes de cargar otro archivo.')
          const page = await postulacionesService.obtenerDocumentos(id, documentsPage, controller.signal)
          if (controller.signal.aborted) return
          setDocuments({ data: page, loading: false, error: '' })
          setRevision((value) => value + 1)
          await openDocumentDetail(actas[0])
          return
        }
        const verifiedOrientation = getThesisConclusionOrientation({ publicStage: stage, concluded: false, resultado: fresh.resultado,
          documents: { data: { results: existing } }, defenses: { data: { results: events } } })
        if (verifiedOrientation?.siguiente_accion?.codigo !== 'CARGAR_ACTA_DEFENSA') throw new Error('Las condiciones académicas cambiaron. Revisa el expediente actualizado.')
        const types = applicable.documentos_aplicables.filter((type) => type.codigo === 'ACTA_DEFENSA')
        const type = types[0]
        if (types.length !== 1 || !type?.id || type.capacidad_carga?.permitida !== true || type.capacidad_carga.codigo !== 'SIN_DOCUMENTO') {
          throw new Error('La carga del Acta no está disponible. Consulta su estado y los permisos documentales.')
        }
        const valid = events.filter((event) => String(event.postulacion) === String(id)
          && event.tipo_evento === 'DEFENSA_PUBLICA' && event.estado === 'FINALIZADA' && event.activo !== false
          && String(event.seguimiento_etapa) === String(stage.id) && Number(event.numero_intento) === Number(stage.numero_intento))
        const unique = [...new Map(valid.map((event) => [event.id, event])).values()]
        if (unique.length !== 1 || !unique[0].id) throw new Error('No se pudo identificar una única Defensa Pública finalizada del intento vigente.')
        await openUpload(null, { typesLoaded: true, opener, context: { typeId: type.id, eventId: unique[0].id, stageId: stage.id, attempt: stage.numero_intento } })
      } catch (error) {
        if (!error.canceled && !controller.signal.aborted) {
          setDocumentTypes((current) => ({ ...current, loading: false }))
          setContextualUploadMessage(error.message || 'No se pudo verificar el contexto del Acta de Defensa.')
        }
      } finally {
        contextualUploadPending.current = false
      }
      return
    }
    if (!pendingCodes) {
      if (navigate) navigateToSection('documentos')
      return openUpload()
    }
    if (contextualUploadPending.current || upload) return
    if (!canUpload || !isThesisGrade || currentStage?.codigo !== 'PERFIL_TESIS'
      || flujo.orientacion_etapa_actual?.siguiente_accion?.codigo !== 'COMPLETAR_PERFIL') {
      scrollToDocuments()
      return
    }
    contextualUploadPending.current = true
    const opener = globalThis.document.activeElement
    const controller = new AbortController()
    uploadController.current?.abort()
    uploadController.current = controller
    try {
      const applicable = await loadApplicableDocumentTypes(controller.signal)
      if (controller.signal.aborted) return
      const matchesContext = String(applicable?.postulacion_id) === String(id)
        && applicable?.modalidad === 'TESIS_GRADO' && applicable?.etapa_actual === 'PERFIL_TESIS'
      const hasPendingUpload = matchesContext && applicable.documentos_aplicables.some((type) => (
        pendingCodes.includes(type.codigo || type.tipo_documento_codigo)
        && type.capacidad_carga?.permitida === true
        && ['SIN_DOCUMENTO', 'RECHAZADO', 'CORRECCION_REQUERIDA', 'CORRECCION_POST_APROBACION'].includes(type.capacidad_carga.codigo)
      ))
      if (hasPendingUpload) await openUpload(null, { typesLoaded: true, opener })
      else scrollToDocuments()
    } finally {
      contextualUploadPending.current = false
    }
  }

  const openDocumentDetail = async (document) => {
    setSelectedDocument(document)
    if (isHistorical) return
    const controller = new AbortController()
    try {
      const response = await postulacionesService.obtenerDocumentosAplicables(id, controller.signal)
      const applicable = (response.documentos_aplicables || []).find((type) => (
        String(type.id) === String(document.tipo_documento)
        || String(type.codigo) === String(document.tipo_documento_codigo)
      ))
      setSelectedDocument((current) => current?.id === document.id
        ? { ...current, capacidad_carga: applicable?.capacidad_carga || null }
        : current)
    } catch (requestError) {
      if (!requestError.canceled) {
        setSelectedDocument((current) => current?.id === document.id
          ? { ...current, capacidad_carga: null }
          : current)
      }
    }
  }

  const openProfileObservationUpload = async (defense) => {
    uploadOpener.current = globalThis.document.activeElement
    uploadController.current?.abort()
    const controller = new AbortController()
    uploadController.current = controller
    setSelectedDefense(null)
    setDocumentTypes((current) => ({ ...current, loading: true, error: '' }))
    try {
      const types = await postulacionesService.obtenerTiposDocumento(controller.signal)
      const type = types.find((item) => item.codigo === 'OBSERVACIONES_DEFENSA_PERFIL')
      if (!type) throw new Error('El tipo documental de observaciones de Defensa de Perfil no está disponible.')
      if (!controller.signal.aborted) {
        setDocumentTypes({ data: types, loading: false, error: '' })
        setUpload({ document: { ...type, tipo_documento: type.id }, eventoDefensaId: defense.id, profileDefenseId: defense.id, submitting: false, fields: {}, error: '', success: '' })
      }
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        setDocumentTypes({ data: [], loading: false, error: '' })
        setUpload({ document: null, submitting: false, fields: {}, error: requestError.message, success: '' })
      }
    }
  }

  const closeUpload = ({ restoreDocumentDetail = true } = {}) => {
    if (contextualUploadSubmitting.current) return
    const document = upload?.document
    const profileDefenseId = upload?.profileDefenseId
    const refreshedDefense = upload?.refreshedDefense
    const origin = uploadOrigin
    const opener = uploadOpener.current
    uploadController.current?.abort()
    uploadController.current = null
    uploadOpener.current = null
    setUpload(null)
    setUploadOrigin(null)
    if (profileDefenseId) {
      if (refreshedDefense) {
        setSelectedDefense(refreshedDefense)
        loadQuorum(refreshedDefense)
      }
    } else if (document && origin !== 'TRIBUNAL_REVIEW_EVIDENCE') {
      setSelectedDocument(restoreDocumentDetail ? document : null)
      if (restoreDocumentDetail) setVersionsRevision((value) => value + 1)
    }
    if (origin === 'TRIBUNAL_REVIEW_EVIDENCE') {
      setTribunalReportDialog({ view: 'REGISTER_REPORT', draft: { resultado: '', evidencia_version: '', observaciones: '' }, assignment: { submitting: false, fields: {}, error: '' }, submitting: false, fields: {}, error: '' })
    }
    requestAnimationFrame(() => {
      if (opener?.isConnected && !opener.closest('[hidden]') && !opener.disabled && typeof opener.focus === 'function') opener.focus()
    })
  }

  const closeSuccessfulUpload = () => {
    const shouldReturnToSummary = !isHistorical
      && !upload?.profileDefenseId
      && uploadOrigin !== 'TRIBUNAL_REVIEW_EVIDENCE'
    closeUpload({ restoreDocumentDetail: false })
    if (shouldReturnToSummary) navigateToSection('resumen', { history: 'replace' })
  }

  const openTribunalEvidenceUpload = async () => {
    uploadOpener.current = globalThis.document.activeElement
    closeTribunalReport()
    setUploadOrigin('TRIBUNAL_REVIEW_EVIDENCE')
    const controller = new AbortController()
    uploadController.current?.abort()
    uploadController.current = controller
    setDocumentTypes((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await postulacionesService.obtenerDocumentosAplicables(id, controller.signal)
      const rows = response.documentos_aplicables || []
      setDocumentTypes({ data: rows, loading: false, error: '' })
      const fixedType = rows.find((type) => (
        String(type.codigo || type.tipo_documento_codigo) === tribunalReviewDocuments.evidenceDocumentCode
      ))
      if (!fixedType) {
        setUpload({ document: null, eventoDefensaId: undefined, submitting: false, fields: {}, error: 'No existe un tipo documental disponible para el Informe de Evaluación del Tribunal.', success: '' })
        return
      }
      const normalizedType = {
        ...fixedType,
        tipo_documento: fixedType.id,
        id: fixedType.id,
        codigo: fixedType.codigo || fixedType.tipo_documento_codigo || tribunalReviewDocuments.evidenceDocumentCode,
        tipo_documento_codigo: fixedType.codigo || fixedType.tipo_documento_codigo || tribunalReviewDocuments.evidenceDocumentCode,
        nombre: fixedType.nombre || fixedType.tipo_documento_nombre || 'Informe de Evaluación del Tribunal',
        tipo_documento_nombre: fixedType.nombre || fixedType.tipo_documento_nombre || 'Informe de Evaluación del Tribunal',
      }
      setUpload({ document: normalizedType, eventoDefensaId: undefined, submitting: false, fields: {}, error: '', success: '' })
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        setDocumentTypes({ data: [], loading: false, error: requestError.message })
        setUpload({ document: null, eventoDefensaId: undefined, submitting: false, fields: {}, error: requestError.message, success: '' })
      }
    }
  }

  const submitUpload = async (event) => {
    event.preventDefault()
    if (!upload || upload.submitting || contextualUploadSubmitting.current) return
    const form = event.currentTarget.elements
    const file = form.archivo?.files?.[0]
    const typeId = upload.context?.typeId || upload.document?.tipo_documento || form.tipo_documento_id?.value
    const selectedType = upload.document || documentTypes.data.find((type) => String(type.id) === String(typeId))
    const isDefenseRecord = selectedType?.codigo === 'ACTA_DEFENSA' || selectedType?.tipo_documento_codigo === 'ACTA_DEFENSA'
    const eventoDefensaId = upload.context?.eventId || upload.eventoDefensaId || form.evento_defensa_id?.value
    if (!file || typeof file.size !== 'number' || file.size === 0 || !file.name) {
      setUpload((current) => ({ ...current, fields: { archivo: ['Selecciona un archivo no vacío.'] }, error: '' }))
      return
    }
    const controller = new AbortController()
    if (upload.context) contextualUploadSubmitting.current = true
    uploadController.current?.abort()
    uploadController.current = controller
    setUpload((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      if (isDefenseRecord && !eventoDefensaId) {
        setUpload((current) => ({ ...current, submitting: false, fields: { evento_defensa_id: ['Selecciona la Defensa Pública finalizada.'] }, error: '' }))
        return
      }
      if (isHistorical) {
        const body = new FormData()
        body.append('tipo_documento_id', String(typeId))
        body.append('archivo', file)
        await postulacionesService.subirDocumentoHistorico(detalle.id, body, controller.signal)
        setUpload((current) => ({ ...current, submitting: false, success: current.document ? 'Nueva versión cargada' : 'Documento cargado' }))
        setDocumentsRevision((value) => value + 1)
        setRevision((value) => value + 1)
        return
      }
      const uploadPayload = { postulacionId: detalle.id, tipoDocumentoId: typeId, archivo: file }
      if (eventoDefensaId) uploadPayload.eventoDefensaId = eventoDefensaId
      await postulacionesService.cargarDocumento(uploadPayload, controller.signal)
      const refreshedDefense = upload.profileDefenseId
        ? (await postulacionesService.obtenerDefensa(upload.profileDefenseId, controller.signal))
        : null
      setUpload((current) => ({ ...current, submitting: false, success: current.document ? 'Nueva versión cargada' : 'Documento cargado', refreshedDefense }))
      setDocumentsRevision((value) => value + 1)
      setRevision((value) => value + 1)
      if (upload.profileDefenseId) setDefensesRevision((value) => value + 1)
      if (upload.document) setVersionsRevision((value) => value + 1)
      contextualUploadSubmitting.current = false
      if (!isHistorical && !upload.profileDefenseId && uploadOrigin !== 'TRIBUNAL_REVIEW_EVIDENCE') closeSuccessfulUpload()
    } catch (requestError) {
      if (!requestError.canceled) setUpload((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
    } finally {
      contextualUploadSubmitting.current = false
    }
  }

  const submitMultipleUpload = async (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { total: 0, successCount: 0, failureCount: 0, items: [], summary: 'No hay documentos seleccionados.' }
    }
    const results = []
    let flowRefreshFailed = false
    const controller = new AbortController()
    uploadController.current?.abort()
    uploadController.current = controller
    setUpload((current) => ({ ...current, submitting: true, fields: {}, error: '', success: '', progress: { current: 0, total: entries.length } }))

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      const formData = new FormData()
      formData.append('tipo_documento_id', String(entry.tipo_documento_id))
      formData.append('archivo', entry.archivo)
      setUpload((current) => ({ ...current, progress: { current: index + 1, total: entries.length }, error: '', success: `Cargando ${index + 1} de ${entries.length}...` }))
      try {
        if (isHistorical) {
          await postulacionesService.subirDocumentoHistorico(detalle.id, formData, controller.signal)
        } else {
          await postulacionesService.cargarDocumento({
            postulacionId: detalle.id,
            tipoDocumentoId: entry.tipo_documento_id,
            archivo: entry.archivo,
            eventoDefensaId: entry.evento_defensa_id,
          }, controller.signal)
          if (upload.trackIndividualStatus) {
            try {
              const refreshed = await refreshExpedienteFlow(controller.signal)
              const requirements = refreshed?.flujo?.orientacion_etapa_actual?.requisitos || []
              setUpload((current) => ({ ...current, stageProgress: {
                completed: requirements.filter((item) => item.cumplido === true).length,
                total: requirements.length,
              } }))
            } catch (refreshError) {
              if (!refreshError.canceled) flowRefreshFailed = true
            }
          }
        }
        results.push({ ...entry, status: 'success', message: 'Cargado' })
      } catch (requestError) {
        results.push({ ...entry, status: 'error', message: requestError.message || 'No se pudo cargar este documento.' })
      }
    }

    if (controller.signal.aborted) {
      return { total: entries.length, successCount: 0, failureCount: entries.length, items: results, summary: 'Carga cancelada.' }
    }

    const successCount = results.filter((item) => item.status === 'success').length
    const failureCount = results.length - successCount
    const summary = failureCount === 0
      ? `${successCount} documento${successCount === 1 ? '' : 's'} cargado${successCount === 1 ? '' : 's'} correctamente.`
      : `${successCount} documento${successCount === 1 ? '' : 's'} cargado${successCount === 1 ? '' : 's'}. ${failureCount} documento${failureCount === 1 ? '' : 's'} no pudo${failureCount === 1 ? '' : 'ieron'} cargarse.`

    if (successCount > 0 && !isHistorical) {
      await loadApplicableDocumentTypes(controller.signal, {
        preserveCurrent: true,
        excludeTypeIds: results
          .filter((item) => item.status === 'success')
          .map((item) => item.tipo_documento_id),
      })
    }

    setUpload((current) => ({
      ...current,
      submitting: false,
      progress: null,
      success: summary,
      error: flowRefreshFailed ? 'Los documentos se cargaron, pero no se pudo actualizar el avance de requisitos.' : '',
      results,
      failedTypeIds: results.filter((item) => item.status === 'error').map((item) => item.tipo_documento_id),
    }))
    if (successCount > 0) {
      setDocumentsRevision((value) => value + 1)
      setRevision((value) => value + 1)
    }
    if (!isHistorical && failureCount === 0 && successCount === entries.length) closeSuccessfulUpload()

    return { total: entries.length, successCount, failureCount, items: results, summary }
  }

  const openReview = (action, observation = null) => {
    reviewController.current?.abort()
    reviewController.current = new AbortController()
    setReview({ action, observation, submitting: false, fields: {}, error: '' })
  }

  const loadQuorum = (defense) => {
    quorumController.current?.abort()
    if ((isProjectGrade && ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))
      || (isThesisGrade && ['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))) {
      quorumController.current = null
      setQuorum({ data: null, loading: false, error: '' })
      return
    }
    const controller = new AbortController()
    quorumController.current = controller
    setQuorum({ data: null, loading: true, error: '' })
    postulacionesService.obtenerQuorumDefensa(defense.id, controller.signal)
      .then((quorumData) => {
        if (!controller.signal.aborted) setQuorum({ data: quorumData, loading: false, error: '' })
      })
      .catch((requestError) => {
        if (!requestError.canceled && !controller.signal.aborted) setQuorum({ data: null, loading: false, error: requestError.message })
      })
  }

  const openDefense = (defense) => {
    defenseOpener.current = document.activeElement
    defenseCompletionPendingNavigation.current = false
    setSelectedDefense(defense)
    loadQuorum(defense)
  }

  const refreshExpedienteFlow = async (signal) => {
    const expediente = await postulacionesService.obtenerExpediente(id, signal)
    if (!signal?.aborted) {
      setData((current) => current ? {
        ...current,
        flujo: expediente.flujo,
        resultado: expediente.resultado,
        cierre: expediente.cierre,
        capacidades: expediente.capacidades ?? current.capacidades,
      } : current)
    }
    return expediente
  }

  const refreshSelectedDefense = async (signalOrDefense = null, knownDefense = null) => {
    const returnedDefense = signalOrDefense?.id ? signalOrDefense : knownDefense
    const signal = returnedDefense ? undefined : signalOrDefense
    const targetId = returnedDefense?.id || selectedDefense?.id
    if (!targetId) return
    const updated = returnedDefense || await postulacionesService.obtenerDefensa(targetId, signal)
    if (!signal?.aborted) {
      setSelectedDefense(updated)
      setDefensesRevision((value) => value + 1)
      loadQuorum(updated)
    }
    try {
      await refreshExpedienteFlow(signal)
    } catch {
      setRevision((value) => value + 1)
    }
    return updated
  }

  const closeDefense = () => {
    const shouldNavigateToSummary = defenseCompletionPendingNavigation.current
    defenseCompletionPendingNavigation.current = false
    quorumController.current?.abort()
    quorumController.current = null
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation(null)
    setSelectedDefense(null)
    setQuorum({ data: null, loading: false, error: '' })
    if (shouldNavigateToSummary) navigateToSection('resumen')
    requestAnimationFrame(() => {
      const focusTarget = shouldNavigateToSummary
        ? document.getElementById('expediente-tab-resumen')
        : defenseOpener.current
      if (focusTarget?.isConnected && !focusTarget.closest('[hidden]')) focusTarget.focus()
    })
  }

  const openDefenseOperation = (action, defense = null, programmingContext = null) => {
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation({ action, defense, programmingContext, submitting: false, fields: {}, error: '' })
  }

  const closeDefenseOperation = () => {
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation(null)
  }

  const submitDefenseOperation = async (event, attendanceDecisions = []) => {
    event.preventDefault()
    if (!defenseOperation || defenseOperation.submitting) return
    const elements = event.currentTarget.elements
    const action = defenseOperation.action
    const fields = {}
    const motivo = elements.motivo?.value?.trim() || ''
    const nuevaFecha = elements.nueva_fecha?.value || ''
    let payload
    if (action === 'programar') {
      const modalidad = elements.modalidad_evento.value
      payload = {
        seguimiento_etapa: elements.seguimiento_etapa.value ? Number(elements.seguimiento_etapa.value) : '',
        tipo_evento: elements.tipo_evento.value,
        fecha_programada: elements.fecha_programada.value,
        lugar: elements.lugar?.value?.trim() || '',
        modalidad_evento: modalidad,
        enlace_virtual: elements.enlace_virtual?.value?.trim() || '',
        observaciones: elements.observaciones?.value?.trim() || '',
      }
      if (!payload.tipo_evento) fields.tipo_evento = ['Selecciona un tipo de defensa.']
      if (!payload.seguimiento_etapa) fields.seguimiento_etapa = ['Selecciona una etapa compatible.']
      if (!payload.fecha_programada) fields.fecha_programada = ['La fecha y hora son obligatorias.']
      if ((modalidad === 'PRESENCIAL' || modalidad === 'MIXTA') && !payload.lugar) fields.lugar = ['El lugar es obligatorio para esta modalidad.']
      if ((modalidad === 'VIRTUAL' || modalidad === 'MIXTA') && !payload.enlace_virtual) fields.enlace_virtual = ['El enlace virtual es obligatorio para esta modalidad.']
    } else {
      if (['suspender', 'cancelar', 'reprogramar'].includes(action) && !motivo) fields.motivo = ['El motivo es obligatorio.']
      if (action === 'reprogramar' && !nuevaFecha) fields.nueva_fecha = ['La nueva fecha y hora son obligatorias.']
    }
    if (Object.keys(fields).length) {
      setDefenseOperation((current) => ({ ...current, fields, error: '' }))
      return
    }
    const controller = new AbortController()
    defenseOperationController.current?.abort()
    defenseOperationController.current = controller
    setDefenseOperation((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      let updated
      if (action === 'programar') updated = await postulacionesService.programarDefensa(detalle.id, payload, controller.signal)
      if (action === 'iniciar') updated = await postulacionesService.iniciarDefensa(defenseOperation.defense.id, attendanceDecisions, controller.signal)
      if (action === 'finalizar') updated = await postulacionesService.finalizarDefensa(defenseOperation.defense.id, controller.signal)
      if (action === 'suspender') updated = await postulacionesService.suspenderDefensa(defenseOperation.defense.id, motivo, controller.signal)
      if (action === 'cancelar') updated = await postulacionesService.cancelarDefensa(defenseOperation.defense.id, motivo, controller.signal)
      if (action === 'reprogramar') updated = await postulacionesService.reprogramarDefensa(defenseOperation.defense.id, nuevaFecha, motivo, controller.signal)
      defenseOperationController.current = null
      setDefenseOperation(null)
      if (updated && selectedDefense && (
        String(updated.id) === String(selectedDefense.id)
        || (action === 'reprogramar' && defenseOperation.defense?.estado === 'CANCELADA')
      )) {
        setSelectedDefense(updated)
        if (updated.estado === 'EN_CURSO') loadQuorum(updated)
      }
      setDefensesRevision((value) => value + 1)
      if (action === 'finalizar') await refreshExpedienteFlow(controller.signal)
    } catch (requestError) {
      if (!requestError.canceled) setDefenseOperation((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
    }
  }

  const closeReview = () => {
    reviewController.current?.abort()
    reviewController.current = null
    setReview(null)
  }

  const submitReview = async (event) => {
    event.preventDefault()
    if (!review || review.submitting) return
    const fields = event.currentTarget.elements
    const value = fields.comentario?.value?.trim() || fields.motivo?.value?.trim() || ''
    if ((review.action === 'rechazar' || review.action === 'observar') && !value) {
      const name = review.action === 'rechazar' ? 'motivo' : 'comentario'
      setReview((current) => ({ ...current, fields: { [name]: ['Este campo es obligatorio.'] }, error: '' }))
      return
    }
    const controller = new AbortController()
    reviewController.current?.abort()
    reviewController.current = controller
    setReview((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      if (review.action === 'aprobar') await postulacionesService.aprobarDocumento(selectedDocument.id, value, controller.signal)
      if (review.action === 'rechazar') await postulacionesService.rechazarDocumento(selectedDocument.id, value, controller.signal)
      if (review.action === 'observar') await postulacionesService.observarDocumento(selectedDocument.id, value, controller.signal)
      if (review.action === 'corregir') await postulacionesService.marcarObservacionCorregida(review.observation.id, controller.signal)
      setReview(null)
      reviewController.current = null
      setStageApproval({ submitting: false, error: '', fields: {} })
      setClosureRevision((current) => current + 1)
      setRevision((current) => current + 1)
      setDocumentsRevision((current) => current + 1)
      setVersionsRevision((current) => current + 1)
      setObservationsRevision((current) => current + 1)
    } catch (requestError) {
      if (!requestError.canceled) setReview((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
    }
  }

  const closeTribunalReport = () => {
    tribunalReportController.current?.abort()
    tribunalReportController.current = null
    tribunalReportSubmitting.current = false
    tribunalAssignmentController.current?.abort()
    tribunalAssignmentController.current = null
    tribunalAssignmentSubmitting.current = false
    setTribunalReportDialog(null)
  }

  const updateTribunalReportDraft = (name, value) => {
    setTribunalReportDialog((current) => ({ ...current, draft: { ...current.draft, [name]: value } }))
  }

  const openTribunalReportUpdate = (report) => {
    tribunalReportSubmitting.current = false
    setTribunalReportDialog({
      view: 'UPDATE_EVIDENCE',
      report,
      draft: { resultado: report.resultado, evidencia_version: '' },
      assignment: { submitting: false, fields: {}, error: '' },
      submitting: false,
      fields: {},
      error: '',
    })
  }

  const submitMissingTribunal = async (payload) => {
    if (!tribunalReportDialog || tribunalAssignmentSubmitting.current) return
    tribunalAssignmentSubmitting.current = true
    tribunalAssignmentController.current?.abort()
    const controller = new AbortController()
    tribunalAssignmentController.current = controller
    setTribunalReportDialog((current) => ({ ...current, assignment: { ...current.assignment, submitting: true, fields: {}, error: '' } }))
    let assigned = false
    try {
      await postulacionesService.asignarActor(detalle.id, payload, controller.signal)
      if (controller.signal.aborted) return
      assigned = true
      await reloadActiveTribunals()
      tribunalAssignmentController.current = null
      tribunalAssignmentSubmitting.current = false
      setTribunalReportDialog((current) => ({ ...current, view: 'REGISTER_REPORT', assignment: { submitting: false, fields: {}, error: '' } }))
      setActiveActorsRevision((value) => value + 1)
    } catch (requestError) {
      if (!requestError.canceled) {
        tribunalAssignmentSubmitting.current = false
        setTribunalReportDialog((current) => assigned
          ? { ...current, view: 'REGISTER_REPORT', assignment: { ...current.assignment, submitting: false, fields: {}, error: '' } }
          : { ...current, assignment: { ...current.assignment, submitting: false, fields: requestError.fields || {}, error: requestError.message } })
      }
    }
  }

  const submitTribunalReport = async (event) => {
    event.preventDefault()
    if (!tribunalReportDialog || tribunalReportSubmitting.current || !tribunalReviewStage) return
    const updatingEvidence = tribunalReportDialog.view === 'UPDATE_EVIDENCE'
    const resultado = tribunalReportDialog.draft.resultado
    const observaciones = tribunalReportDialog.draft.observaciones?.trim() || ''
    const evidenciaVersion = Number(tribunalReportDialog.draft.evidencia_version) || null
    const fields = {}
    if (!evidenciaVersion) fields.evidencia_version = ['Selecciona la evidencia del informe.']
    if (!updatingEvidence && !resultado) fields.resultado = ['Selecciona un resultado.']
    if (!updatingEvidence && resultado === 'INSUFICIENTE' && !observaciones) fields.observaciones = ['Las observaciones son obligatorias para un resultado insuficiente.']
    if (!currentFinalVersion) fields.version_documento_revisada = ['No existe una versión actual activa del Documento Final en el expediente.']
    if (Object.keys(fields).length) {
      setTribunalReportDialog((current) => ({ ...current, fields, error: '' }))
      return
    }
    const payload = updatingEvidence
      ? { evidencia_version: evidenciaVersion }
      : { version_documento_revisada: currentFinalVersion.id, resultado, observaciones, evidencia_version: evidenciaVersion }
    const controller = new AbortController()
    tribunalReportController.current?.abort()
    tribunalReportController.current = controller
    tribunalReportSubmitting.current = true
    setTribunalReportDialog((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      if (updatingEvidence) {
        await postulacionesService.actualizarEvidenciaInformeRevisionTribunal(
          tribunalReviewStage.id,
          tribunalReportDialog.report.id,
          payload,
          controller.signal,
        )
      } else {
        await postulacionesService.registrarInformeRevisionTribunal(tribunalReviewStage.id, payload, controller.signal)
      }
      tribunalReportSubmitting.current = false
      setTribunalReportDialog(null)
      if (updatingEvidence) {
        setTribunalReportsRevision((value) => value + 1)
        setRevision((value) => value + 1)
      } else {
        try {
          await refreshExpedienteFlow(controller.signal)
        } catch (refreshError) {
          if (!refreshError.canceled && !controller.signal.aborted) {
            setRevision((value) => value + 1)
          }
        }
      }
      tribunalReportController.current = null
    } catch (requestError) {
      if (!requestError.canceled && !controller.signal.aborted) {
        tribunalReportSubmitting.current = false
        setTribunalReportDialog((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
      }
    }
  }

  const tribunalReviewState = tribunalReviewStage
    ? getTribunalReviewState(tribunalReviewStage, tribunalReports, currentFinalVersion, currentOrientation, canManageTribunalReports)
    : null
  const onRegisterTribunalReport = () => {
      tribunalReportSubmitting.current = false
      setTribunalReportDialog({ view: 'REGISTER_REPORT', draft: { resultado: '', evidencia_version: '', observaciones: '' }, assignment: { submitting: false, fields: {}, error: '' }, submitting: false, fields: {}, error: '' })
  }
  const reviewActions = tribunalReviewStage && <TribunalReviewActions
    reviewState={tribunalReviewState}
    orientation={currentOrientation}
    evidenceVersions={currentEvidenceVersions}
    canUpload={canUpload}
    onRegister={onRegisterTribunalReport}
    onUpdate={openTribunalReportUpdate}
    onUploadEvidence={openTribunalEvidenceUpload}
  />
  const reviewSection = tribunalReviewStage && <TribunalReviewReports
    reviewState={tribunalReviewState}
    versions={allDocumentVersions}
    evidenceVersions={currentEvidenceVersions}
    showOperations={!isCurrentProjectTribunalReview}
    orientation={currentOrientation}
    canUpload={canUpload}
    onRetry={() => setTribunalReportsRevision((value) => value + 1)}
    onRegister={onRegisterTribunalReport}
    onUpdate={openTribunalReportUpdate}
    onUploadEvidence={openTribunalEvidenceUpload}
  />
  const correctionSection = <CorrectionConfirmations postulacion={id} modalidadCodigo={detalle.modalidad_detalle?.codigo} defenses={defenses} assignments={activeActors} canManage={canManageTribunalReports} onChanged={() => { setDocumentsRevision((value) => value + 1); setDefensesRevision((value) => value + 1); setRevision((value) => value + 1) }} />
  const academicResultSection = isAcademicExcellence ? (
    excelencia ? <ExcelenciaAcademica postulacion={detalle.id} excelencia={excelencia} etapaCodigo={currentStage?.codigo} canManage={canManageApplications} concluida={isConcluded} conclusionAprobada={Boolean(academicExcellenceResult)} resultView onChanged={() => { setExcelenciaRevision((value) => value + 1); setRevision((value) => value + 1); setHistoryRevision((value) => value + 1) }} />
      : <Card><p role="status">El resultado de Excelencia Académica todavía no está disponible. Consulta la sección de modalidad.</p></Card>
  ) : <>
    <Card className="overflow-hidden" aria-labelledby="resultado-academico-title">
      <h2 id="resultado-academico-title" className="text-xl font-bold">Resultado académico técnico</h2>
      {effectiveResult.error ? <PartialState message={effectiveResult.error} onRetry={() => setRevision((value) => value + 1)} /> : (
        <dl className={`mt-5 grid gap-3 ${isProjectGrade ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {isProjectGrade ? <>
            <Score label="Nota de Defensa Privada" value={effectiveResult.data?.nota_privada} scale={effectiveResult.data?.semantica_privada === 'LEGACY_PONDERADA' ? '30' : effectiveResult.data?.semantica_privada === 'BRUTA_100' ? '100' : null} detail={effectiveResult.data?.semantica_privada === 'LEGACY_PONDERADA' ? 'Registro con escala anterior' : effectiveResult.data?.semantica_privada === 'BRUTA_100' ? 'Calificación' : null} decimalComma />
          </> : isExamGrade ? <>
            <Score label="Calificación final" value={effectiveResult.data?.nota_final} scale="100" fallback="Pendiente" decimalComma />
          </> : isThesisGrade ? <>
            <Score label="Nota privada" value={effectiveResult.data?.nota_privada} scale={effectiveResult.data?.semantica_privada === 'BRUTA_100' ? '100' : effectiveResult.data?.semantica_privada === 'MODALIDAD_ESPECIFICA' ? '30' : null} detail={effectiveResult.data?.semantica_privada === 'BRUTA_100' ? 'Calificación bruta' : effectiveResult.data?.semantica_privada === 'MODALIDAD_ESPECIFICA' ? 'Escala histórica' : null} />
            <Score label="Aporte privado" value={effectiveResult.data?.aporte_privada} scale={effectiveResult.data?.aporte_privada != null ? '30' : null} detail={effectiveResult.data?.aporte_privada != null ? 'Ponderación 30%' : null} />
            <Score label="Nota pública" value={effectiveResult.data?.nota_publica} scale="100" />
            <Score label="Aporte pública" value={effectiveResult.data?.aporte_publica} scale={effectiveResult.data?.aporte_publica != null ? '70' : null} detail={effectiveResult.data?.aporte_publica != null ? 'Ponderación 70%' : null} />
          </> : <>
            <Score label="Privada" value={effectiveResult.data?.nota_privada} scale="30" />
            <Score label="Pública" value={effectiveResult.data?.nota_publica} scale={detalle.modalidad_detalle?.codigo === 'TESIS_GRADO' ? '100' : '70'} />
          </>}
          {!isExamGrade && <Score label={isProjectGrade ? 'Nota Final' : 'Final'} value={effectiveResult.data?.nota_final} scale="100" fallback="Pendiente" decimalComma={isProjectGrade} />}
        </dl>
      )}
      {effectiveResult.data?.clasificacion && <p className="mt-5 rounded-lg bg-slate-100 px-4 py-3 text-center font-bold tracking-wide dark:bg-slate-800">{formatAcademicClassification(effectiveResult.data.clasificacion)}</p>}
      {effectiveResult.data?.limitacion_normativa && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{effectiveResult.data.limitacion_normativa}</p>}
    </Card>
    <AcademicConclusion postulacion={detalle.id} modalidadCodigo={detalle.modalidad_detalle?.codigo} resultado={resultado} defensaPublicaAprobada={latestPublicStage?.estado === 'APROBADA'} actaValida={thesisConclusionOrientation?.actaValida} concluida={isConcluded} canManage={canManageClosure} onChanged={() => { setRevision((value) => value + 1); setHistoryRevision((value) => value + 1) }} />
  </>
  const closureSection = cierreSoportado && <details id="condiciones-tecnicas" open={closureDetailsOpen} className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
    <summary className="cursor-pointer list-none px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
      <span className="text-lg font-bold">{currentStage?.codigo === 'REVISION_FINAL_POST_PUBLICA' ? 'Información para el cierre documental posterior' : closureIsRelevant ? 'Cierre técnico' : 'Preparación para cierre'}</span>
      <span className="mt-1 block text-sm text-slate-500">{formatClosureSummary(cierre.data)}</span>
      <span className="mt-2 block text-sm font-medium text-sky-700 dark:text-sky-300">Ver detalle</span>
    </summary>
    <div className="border-t border-slate-200 p-5 dark:border-slate-700">
      <div className="grid gap-5">
        <TechnicalClosure
        key={detalle.id}
        postulacion={detalle.id}
        initialClosure={cierre}
        resultado={effectiveResult}
        showAcademicResult={!isProjectGrade}
        stages={flujo.etapas}
        canManage={canManageClosure}
        refreshToken={closureRevision}
        onChanged={(updatedClosure) => { if (updatedClosure?.concluida === true) { pendingSectionRestore.current = 'resumen'; window.history.replaceState(window.history.state, '', '#resumen') }; setHistoryRevision((value) => value + 1); setRevision((value) => value + 1) }}
        />
        <ClosureRequirements postulacion={detalle.id} canManage={canManageClosure} collapseDetailsByDefault={isProjectGrade} deliveryCodes={Array.isArray(cierre.data?.entregas_requeridas) ? cierre.data.entregas_requeridas : null} onChanged={() => { pendingSectionRestore.current = 'condiciones-tecnicas'; window.history.replaceState(window.history.state, '', '#condiciones-tecnicas'); setStageApproval({ submitting: false, error: '', fields: {} }); setClosureRevision((value) => value + 1); setRevision((value) => value + 1) }} />
      </div>
    </div>
  </details>
  const futureSections = isProjectGrade && (!stageUi.review || !stageUi.academicResult || !stageUi.closure || !stageUi.corrections)
    && <details className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <summary className="cursor-pointer list-none px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
        <span className="text-lg font-bold">Información de etapas posteriores</span>
        <span className="mt-1 block text-sm text-slate-500">Consulta la revisión, resultados y cierre cuando esas etapas sean relevantes.</span>
        <span className="mt-2 block text-sm font-medium text-sky-700 dark:text-sky-300">Ver información futura</span>
      </summary>
      <div className="border-t border-slate-200 p-5 dark:border-slate-700">
        <div className="grid gap-5">
          {!stageUi.review && reviewSection}
          {!stageUi.corrections && correctionSection}
          {!stageUi.academicResult && academicResultSection}
          {!stageUi.closure && closureSection}
        </div>
      </div>
    </details>
  const hasModalityTab = !isHistorical && (
    (modalityCode === 'TRABAJO_DIRIGIDO' && Boolean(trabajoDirigido))
    || (modalityCode === 'EXAMEN_GRADO' && Boolean(examen))
    || (modalityCode === 'EXCELENCIA_ACADEMICA' && Boolean(excelencia))
    || (modalityCode === 'GRADUACION_VIA_DIPLOMADO' && Boolean(diplomado))
  )
  const hasOutcomeTab = !isHistorical && Boolean(
    stageUi.academicResult || stageUi.closure || futureSections,
  )

  const uploadDialog = upload && <UploadDialog upload={upload} types={documentTypes} postulacion={detalle.id} isHistorical={isHistorical} onSubmit={submitUpload} onMultipleSubmit={submitMultipleUpload} onClose={closeUpload} />
  const documentDetailDialog = selectedDocument && <DocumentDetailDialog document={selectedDocument} onClose={() => setSelectedDocument(null)} canUpload={canUpload && (isHistorical || selectedDocument.capacidad_carga?.permitida === true) && (selectedDocument.tipo_documento_codigo !== 'OBSERVACIONES_DEFENSA_PERFIL' || canReview)} onUpload={() => openUploadFromDetail(selectedDocument)} canReview={canReview} onReview={openReview} refreshKey={`${versionsRevision}:${observationsRevision}`} />
  const contextualNotice = contextualUploadMessage && <p role="alert" className="rounded-lg border border-amber-300 p-3">{contextualUploadMessage} {isStudentView ? <Link to="/documentos" className="font-semibold underline">Ir a documentos</Link> : <button type="button" className="font-semibold underline" onClick={scrollToDocuments}>Ir a documentos</button>}</p>
  if (isStudentView) {
    return <><StudentProcessView detalle={detalle} flujo={flujo} cierre={cierre} cierreSoportado={cierreSoportado} progress={safeProgress} canViewDocuments={auth?.hasPermission?.('puede_ver_documentos') === true} canUploadDocuments={canUpload} orientationOverride={thesisConclusionOrientation} onLoadDefenseRecord={() => openContextualDocumentUpload(false, 'ACTA_DEFENSA')} memorandumContract={getMemorandumPublicationContract(data)} memorandums={memorandums} onRetryMemorandums={() => setMemorandumRevision((value) => value + 1)} />{contextualNotice}{uploadDialog}{documentDetailDialog}</>
  }
  return (
    <section className="mx-auto max-w-6xl" onClick={handleSectionClick}>
      <div className="space-y-5">
      <BackLink />
      {contextualNotice}

      <Card className="overflow-hidden border-slate-300 dark:border-slate-700">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre || 'Postulación'}</p>
            {isHistorical && <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Registro histórico</p>}
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight">{student ? formatStudentLabel(student) : EMPTY}</h1>
            <p className="mt-1 text-sm text-slate-500">{period ? formatPeriodoLabel(period) : EMPTY}</p>
          </div>
          <StatusBadge value={detalle.estado_actual_detalle?.nombre || detalle.estado_actual_detalle?.codigo} positive={isConcluded} />
        </div>
        {isHistorical ? (
          <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
            Este expediente corresponde a un registro histórico y no representa un flujo operativo activo.
          </div>
        ) : (
          <>
            <h2 className="sr-only">Estado actual de tu proceso académico</h2>
            <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <Info label="Etapa actual" value={currentStage?.nombre || 'Sin etapa pendiente'} />
                {canApproveStage && (
                  <Button type="button" className="shrink-0 px-3 py-1.5" disabled={stageApproval.submitting} onClick={approveCurrentStage}>
                    {stageApproval.submitting ? 'Procesando…' : 'Aprobar etapa'}
                  </Button>
                )}
              </div>
            </dl>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold">Avance de tu proceso</span>
                <span>{safeProgress === null ? EMPTY : `${safeProgress}%`}</span>
              </div>
              {safeProgress !== null && (
                <progress className="mt-2 h-3 w-full" max="100" value={safeProgress} aria-label="Avance de tu proceso">
                  {safeProgress}%
                </progress>
              )}
              {canInitializeFlow && (
                <div className="mt-5">
                  <Button disabled={flowInitialization.submitting} onClick={initializeFlow}>
                    {flowInitialization.submitting
                      ? (isProjectGrade ? 'Iniciando proceso...' : 'Inicializando…')
                      : (isProjectGrade ? 'Iniciar proceso de Proyecto de Grado' : 'Inicializar flujo académico')}
                  </Button>
                  <p className="mt-2 text-sm text-slate-500">{isProjectGrade
                    ? 'Registra la Inscripción y deja Perfil de Proyecto listo como siguiente etapa.'
                    : 'Crea las etapas pendientes configuradas por el backend; no inicia ni aprueba ninguna etapa.'}</p>
                </div>
              )}
              {flowInitialization.error && <p role="alert" className="mt-3 text-sm text-red-600">{flowInitialization.error}</p>}
              {canStartCurrentStage && (
                <div className="mt-5">
                  <Button disabled={stageInitialization.submitting} onClick={startCurrentStage}>
                    {stageInitialization.submitting ? 'Iniciando…' : `Iniciar ${currentStage.nombre || formatCode(currentStage.codigo)}`}
                  </Button>
                  {stageInitialization.error && <p role="alert" className="mt-2 text-sm text-red-600">{stageInitialization.error}</p>}
                </div>
              )}
              {canManageApplications && stageApprovalAllowed && !orientationApprovalDeclared && currentStage?.id && ['EN_PROCESO', 'OBSERVADA'].includes(currentStage.estado) && !['PERFIL_PROYECTO', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(currentStage.codigo) && !isConcluded && (
                <div className="mt-5">
                  <Button variant={pendingCurrentRequirements > 0 ? 'secondary' : 'default'} disabled={stageApproval.submitting} onClick={approveCurrentStage}>
                    {stageApproval.submitting ? 'Procesando...' : `Aprobar ${currentStage.nombre || formatCode(currentStage.codigo)}`}
                  </Button>
                  {stageApproval.error && (
                    <>
                      <p role="alert" className="mt-2 text-sm text-red-600">{stageApproval.error}</p>
                    </>
                  )}
                  {!stageApproval.error && Array.isArray(stageApproval.fields?.faltantes) && stageApproval.fields.faltantes.length > 0 && (
                    <p className="mt-2 text-sm text-red-600">Faltantes: {stageApproval.fields.faltantes.map(humanizeRequirementCode).join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {!isHistorical && <ExpedienteNav activeTab={activeTab} hasModalityTab={hasModalityTab} hasOutcomeTab={hasOutcomeTab} onActivate={(sectionId) => navigateToSection(sectionId)} />}
      <div id="panel-resumen" role="tabpanel" aria-labelledby="expediente-tab-resumen" data-expediente-panel="resumen" hidden={!isHistorical && activeTab !== 'resumen'}>
        {!isHistorical && <div id="resumen" className="scroll-mt-24">
          <OperationalSummary
            cierre={cierre.data}
            cierreSoportado={cierreSoportado}
            currentStage={currentStage}
            orientation={thesisConclusionOrientation || flujo.orientacion_etapa_actual}
            stageApproval={stageApproval}
            pendingCurrentRequirements={pendingCurrentRequirements}
            onApproveStage={approveCurrentStage}
            canApproveStage={canApproveStage}
            onGoToDocuments={scrollToDocuments}
            completedStages={completedStages}
            totalStages={stages.length}
            workflowProgress={safeProgress}
            pendingTechnicalClosure={pendingTechnicalClosure}
            examConclusionPending={examConclusionPending}
            academicExcellenceResult={academicExcellenceResult}
            resultado={effectiveResult}
            concluded={isConcluded}
            defenses={defenses.data?.results || []}
            isProjectGrade={isProjectGrade}
            isExamGrade={isExamGrade}
            isAcademicExcellence={isAcademicExcellence}
            isThesisGrade={isThesisGrade}
            isThesisPublicStage={isThesisPublicStage}
            publicDefenseMissingRoles={publicDefenseMissingRoles}
            canUpload={canUpload}
            canManageApplications={canManageApplications}
            canManageAssignments={canManageAssignments}
            canManageDefenses={canManageDefenses}
            canProgramDefense={canProgramDefense}
            canManageEvaluations={canManageEvaluations}
            programmingContext={defenseProgrammingContext}
            orientationAcademicDecision={orientationAcademicDecision}
            onRegisterAcademicDecision={openAcademicDecision}
            onOpenDocumentUpload={openContextualDocumentUpload}
            documentActionPending={documentTypes.loading}
            onProgramDefense={openCurrentDefenseProgramming}
            onOpenDefense={openDefense}
            directedConclusion={isTrabajoDirigido ? directedConclusionState : null}
            onConcludeDirected={concludeDirected}
            onRegisterTribunalReport={isTrabajoDirigido && currentStage?.codigo === 'REVISION_TRIBUNAL_PREVIA'
              && String(tribunalReviewStage?.id) === String(currentStage.id)
              && (stages.filter((stage) => stage.codigo === 'REVISION_TRIBUNAL_PREVIA' && stage.activo !== false).length === 1)
              && tribunalReviewState?.canRegister && currentFinalVersion && currentEvidenceVersions.length > 0
              ? onRegisterTribunalReport : null}
            hideRequirements={isIntegratedInscription}
            additionalContent={isIntegratedInscription ? <>
              <InscriptionDocumentsSection
                embedded
                requirements={inscriptionDocumentRequirements}
                completed={currentRequirements.filter((item) => item.cumplido === true).length}
                total={currentRequirements.length}
              />
              {physicalRequirements.length > 0 && <div id="inscripcion-entregas" className="scroll-mt-24">
                <ClosureRequirements
                  embedded
                  postulacion={detalle.id}
                  canManage={canManageApplications}
                  showConditions={false}
                  requiredDeliveries={physicalRequirements}
                  title="Recepción física"
                  description=""
                  titleId="inscripcion-entregas-title"
                  createLabel="Registrar recepción"
                  onChanged={() => {
                    setRevision((value) => value + 1)
                    setStageApproval({ submitting: false, error: '', fields: {} })
                  }}
                />
              </div>}
            </> : null}
            onCompleteAuthorities={() => setTeamAssignment({ mode: 'PUBLIC_AUTHORITIES', stageId: currentStage.id, submitting: false, error: '' })}
            onManageActors={openActorManagement}
            canOpenProfileTutor={canOpenProfileTutor}
            canOpenPrivateSecretary={canOpenPrivateSecretary}
            onOpenDictamen={supportsContextualDictamen ? openContextualDictamen : undefined}
            onManageMissingActors={canOpenThesisAuthorities ? () => {
              if (publicDefenseMissingRoles.length === 0) return
              if (flujo.orientacion_etapa_actual?.requisitos?.some((item) => PUBLIC_DEFENSE_AUTHORITY_ROLES.includes(item.codigo))) {
                setTeamAssignment({ mode: 'PUBLIC_AUTHORITIES', stageId: currentStage.id, submitting: false, error: '' })
                return
              }
              assignmentSubmitting.current = false
              setAssignment({ submitting: false, fields: {}, error: '', context: 'TESIS_DEFENSA_PUBLICA' })
            } : undefined}
          />
        </div>}
        {!isHistorical && isCurrentProjectTribunalReview && reviewActions}
      </div>

      <div id="panel-documentos" role="tabpanel" aria-labelledby="expediente-tab-documentos" data-expediente-panel="documentos" hidden={!isHistorical && activeTab !== 'documentos'}>
        {!isHistorical && currentStage?.codigo === 'REVISION_TRIBUNAL_PREVIA' && reviewSection}
        {!isHistorical && !isIntegratedInscription && physicalRequirements.length > 0 && <div id="inscripcion-entregas" className="scroll-mt-24"><ClosureRequirements postulacion={detalle.id} canManage={canManageApplications} showConditions={false} requiredDeliveries={physicalRequirements} title="Recepción física" description="" titleId="inscripcion-entregas-title" createLabel="Registrar recepción" onChanged={() => { setRevision((value) => value + 1); setStageApproval({ submitting: false, error: '', fields: {} }) }} /></div>}
        <div id="documentos" className="scroll-mt-24"><DocumentsCard
          documents={documents}
          page={documentsPage}
          onPage={(page) => setDocumentsView({ id, page })}
          onRetry={() => setDocumentsRevision((value) => value + 1)}
          canUpload={canUpload}
          onUpload={() => openUpload()}
          onSelect={openDocumentDetail}
        /></div>
        {!isHistorical && (flujo.etapas || []).filter((stage) => ['REVISION_TUTOR', 'REVISION_TRIBUNAL'].includes(stage.codigo)).map((stage) => <DocumentReviewDictamens key={stage.id} stage={stage} documents={documents} assignments={activeActors} canManage={canManageTribunalReports} contextualPostulacion={detalle.id} onRegisterContextualOpen={supportsContextualDictamen && String(stage.id) === String(currentStage.id) ? registerDictamenOpener : undefined} onChanged={async () => { setDocumentsRevision((value) => value + 1); setRevision((value) => value + 1) }} />)}
      </div>

      <div id="panel-defensas" role="tabpanel" aria-labelledby="expediente-tab-defensas" data-expediente-panel="defensas" hidden={!isHistorical && activeTab !== 'defensas'}>
        {!isHistorical && <div id="defensas" className="scroll-mt-24"><DefensesCard
          defenses={defenses}
          page={defensesPage}
          onPage={(page) => { closeDefense(); setDefensesView({ id, page }) }}
          onRetry={() => setDefensesRevision((value) => value + 1)}
          onSelect={openDefense}
          canManage={canManageDefenses}
          canProgram={canProgramDefense}
          programmingContext={defenseProgrammingContext}
          onProgram={openCurrentDefenseProgramming}
        /></div>}
        {!isHistorical && stageUi.corrections && correctionSection}
      </div>

      <div id="panel-actores" role="tabpanel" aria-labelledby="expediente-tab-actores" data-expediente-panel="actores" hidden={!isHistorical && activeTab !== 'actores'}>
        {!isHistorical && <div id="actores" className="scroll-mt-24"><ActorsCard
          active={activeActors}
          historical={historicalActors}
          activePage={activeActorsPage}
          historicalPage={historicalActorsPage}
          onActivePage={(page) => setActorsView((current) => ({ id, activePage: page, historicalPage: String(current.id) === String(id) ? current.historicalPage : 1 }))}
          onHistoricalPage={(page) => setActorsView((current) => ({ id, activePage: String(current.id) === String(id) ? current.activePage : 1, historicalPage: page }))}
          onRetryActive={() => setActiveActorsRevision((value) => value + 1)}
          onRetryHistorical={() => setHistoricalActorsRevision((value) => value + 1)}
          canManage={canManageAssignments}
          management={flujo.gestion_actores}
          memorandumContract={getMemorandumPublicationContract(data)}
          memorandums={memorandums}
          onRetryMemorandums={() => setMemorandumRevision((value) => value + 1)}
          onManage={openActorManagement}
        /></div>}
      </div>

      <div id="panel-etapas" role="tabpanel" aria-labelledby="expediente-tab-etapas" data-expediente-panel="etapas" hidden={!isHistorical && activeTab !== 'etapas'}>
        {!isHistorical && <div id="decisiones-academicas" className="scroll-mt-24"><AcademicDecisionsCard
          management={flujo.gestion_decisiones_academicas}
          onAction={openAcademicDecision}
          onMemorandumAction={openActorManagement}
        /></div>}
        {!isHistorical && <Card id="etapas" className="scroll-mt-24 overflow-hidden" aria-labelledby="etapas-flujo-title">
          <h2 id="etapas-flujo-title" className="text-xl font-bold">Etapas del flujo académico</h2>
          {(flujo.etapas || []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">El flujo académico todavía no fue inicializado.</p>
          ) : (
            <ol className="mt-5">
              {flujo.etapas.map((stage) => (
                <li key={stage.id} className="relative flex gap-4 pb-5 last:pb-0">
                  <span aria-hidden="true" className="absolute bottom-0 left-[0.7rem] top-6 w-px bg-slate-200 last:hidden dark:bg-slate-700" />
                  <StageMarker state={stage.estado} />
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{stage.nombre || stage.codigo}</strong>
                      <StatusBadge value={stage.estado_display || stage.estado} compact positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(stage.estado)} />
                    </div>
                    <p className="mt-1 text-slate-500">Intento {stage.numero_intento ?? 1}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>}
      </div>

      <div id="panel-historial" role="tabpanel" aria-labelledby="expediente-tab-historial" data-expediente-panel="historial" hidden={!isHistorical && activeTab !== 'historial'}>
        <div id="historial" className="scroll-mt-24"><HistoryCard
          history={history}
          page={historyPage}
          onPage={(page) => setHistoryView({ id, page })}
          onRetry={() => setHistoryRevision((value) => value + 1)}
        /></div>
      </div>

      {hasModalityTab && <div id="modalidad" role="tabpanel" aria-labelledby="expediente-tab-modalidad" data-expediente-panel="modalidad" hidden={activeTab !== 'modalidad'}>
        {modalityCode === 'EXAMEN_GRADO' && <ExamenGradoAreas postulacion={detalle.id} examen={examen} etapaCodigo={currentStage?.codigo} postulacionConcluida={isConcluded} canManage={canManageEvaluations} onChanged={() => { setExamenRevision((value) => value + 1); setRevision((value) => value + 1) }} />}
        {modalityCode === 'EXCELENCIA_ACADEMICA' && <ExcelenciaAcademica postulacion={detalle.id} excelencia={excelencia} etapaCodigo={currentStage?.codigo} canManage={canManageApplications} concluida={isConcluded} conclusionAprobada={Boolean(academicExcellenceResult)} onChanged={() => { setExcelenciaRevision((value) => value + 1); setRevision((value) => value + 1); setHistoryRevision((value) => value + 1) }} />}
        {modalityCode === 'GRADUACION_VIA_DIPLOMADO' && <Diplomado postulacion={detalle.id} diplomado={diplomado} etapaCodigo={currentStage?.codigo} canManage={canManageApplications} onChanged={() => { setDiplomadoRevision((value) => value + 1); setRevision((value) => value + 1) }} />}
        {modalityCode === 'TRABAJO_DIRIGIDO' && <TrabajoDirigido postulacion={detalle.id} trabajo={trabajoDirigido} etapaCodigo={currentStage?.codigo} canManage={canManageApplications} conclusion={directedConclusionState} onConclude={concludeDirected} reportSuccess={trabajoDirigidoReportSuccess} onReportSuccess={setTrabajoDirigidoReportSuccess} onChanged={() => { setTrabajoDirigidoRevision((value) => value + 1); setRevision((value) => value + 1) }} />}
      </div>}

      {hasOutcomeTab && <div id="resultado-y-cierre" role="tabpanel" aria-labelledby="expediente-tab-resultado-cierre" data-expediente-panel="resultado-cierre" hidden={activeTab !== 'resultado-cierre'}>
        {!isHistorical && stageUi.academicResult && academicResultSection}
        {!isHistorical && false && <details role="note" aria-label="Límites normativos" className="overflow-hidden rounded-xl border border-amber-300 bg-amber-50 p-5 dark:bg-amber-950">
          <summary className="cursor-pointer list-none font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Información y límites normativos ({(cierreSoportado ? CONTRACT_WARNINGS : TESIS_WARNINGS).length + (cierreSoportado ? (cierre.data?.advertencias_normativas || []).length : 0)}) <span className="ml-2 text-sm font-normal">Ver detalles</span></summary>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
            {(cierreSoportado ? CONTRACT_WARNINGS : TESIS_WARNINGS).map((warning) => <li key={warning}>{warning}</li>)}
            {cierreSoportado && (cierre.data?.advertencias_normativas || []).map((warning) => <li key={`backend-${warning}`}>{warning}</li>)}
          </ul>
        </details>}
        {!isHistorical && stageUi.closure && closureSection}
        {!isHistorical && futureSections}
      </div>}

      </div>

      {uploadDialog}

      {documentDetailDialog}
      {selectedDefense && <ProtectedDefenseDetail defense={selectedDefense} quorum={quorum} nextAction={flujo.orientacion_etapa_actual?.siguiente_accion} onRetryQuorum={() => loadQuorum(selectedDefense)} onClose={closeDefense} onDefenseCompleted={() => { defenseCompletionPendingNavigation.current = true }} canManage={canManageDefenses} canEvaluate={canManageEvaluations} canManageDocuments={canReview} isProjectGrade={isProjectGrade} isThesisGrade={isThesisGrade} onParticipantsChanged={refreshSelectedDefense} onUploadProfileObservations={openProfileObservationUpload} onManageActors={openActorManagement} onAction={(action) => openDefenseOperation(action, selectedDefense)} />}
      {defenseOperation && <DefenseOperationDialog operation={defenseOperation} stages={flujo.etapas || []} quorum={quorum} onSubmit={submitDefenseOperation} onClose={closeDefenseOperation} />}
      {review && <ReviewDialog review={review} onSubmit={submitReview} onClose={closeReview} />}
      {assignment && (assignment.context !== 'TESIS_DEFENSA_PUBLICA' || publicDefenseMissingRoles.length > 0) && <AssignmentDialog assignment={assignment} stages={flujo.etapas || []} activeActors={activeActors.data?.results || []} activeTribunals={activeTribunals} onRetryActiveTribunals={() => setActiveTribunalsRevision((value) => value + 1)} isProjectGrade={detalle.modalidad_detalle?.codigo === 'PROYECTO_GRADO' || flujo.modalidad?.codigo === 'PROYECTO_GRADO'} allowedTypes={assignment.context === 'TESIS_DEFENSA_PUBLICA' ? publicDefenseMissingRoles : detalle.modalidad_detalle?.codigo === 'EXAMEN_GRADO' ? ['TRIBUNAL', 'PRESIDENTE', 'SECRETARIO'] : detalle.modalidad_detalle?.codigo === 'EXCELENCIA_ACADEMICA' ? ['TRIBUNAL', 'PRESIDENTE', 'SECRETARIO', 'DIRECTOR_INSTITUTO_INVESTIGACION'] : detalle.modalidad_detalle?.codigo === 'GRADUACION_VIA_DIPLOMADO' ? ['VICERRECTOR_POSGRADO', 'DECANO_FACULTAD', 'DIRECTOR_CARRERA', 'TRIBUNAL'] : detalle.modalidad_detalle?.codigo === 'TRABAJO_DIRIGIDO' ? ['TUTOR', 'TRIBUNAL', 'DOCENTE_MODALIDAD', 'PRESIDENTE', 'SECRETARIO', 'SUPERVISOR_INSTITUCIONAL'] : undefined} initialStageId={assignment.context === 'TESIS_DEFENSA_PUBLICA' ? currentStage?.id : undefined} fixedAssignment={assignment.fixedAssignment} replacementPosition={assignment.replacementPosition} onSubmit={submitAssignment} onClose={closeAssignment} />}
      {academicDecision && <AcademicDecisionDialog
        state={academicDecision}
        isProjectProfileAuthorization={isProjectGrade
          && currentStage?.codigo === 'PERFIL_PROYECTO'
          && academicDecision.decision.codigo === 'PROPUESTA_APROBADA'}
        onSubmit={submitAcademicDecision}
        onClose={() => setAcademicDecision(null)}
      />}
      {actorManagement && <ActorManagementDialog state={actorManagement} postulacion={detalle.id} management={flujo.gestion_actores} selectionPresentation={actorSelectionPresentation} stageName={currentStage?.nombre || currentStage?.codigo} memorandumContract={isProjectGrade && currentStage?.codigo === 'PERFIL_PROYECTO' ? getMemorandumPublicationContract(data) : null} memorandumSeguimientoEtapa={flujo.gestion_decisiones_academicas?.contexto?.seguimiento_etapa} memorandums={memorandums} canPublishMemorandum={canManageAssignments}       onMemorandumPublished={() => { actorManagementSummaryNavigationPending.current = true; preserveExpedienteDuringMemorandumRefresh.current = true; setMemorandumRevision((value) => value + 1); setRevision((value) => value + 1) }} onRetryMemorandums={() => setMemorandumRevision((value) => value + 1)} onSubmit={submitActorManagement} onFinalize={(position, observaciones) => submitActorManagement([{ action: 'FINALIZAR', position, payload: { observaciones } }])} onClose={closeActorManagement} />}
      {teamAssignment?.mode === 'PUBLIC_AUTHORITIES'
        ? <PublicAuthoritiesDialog assignment={teamAssignment} postulacion={detalle.id} stage={currentStage} orientation={flujo.orientacion_etapa_actual} blockOccupiedCandidates={isProjectGrade} allowIdentityReuse={isThesisGrade || flujo.orientacion_etapa_actual?.siguiente_accion?.capacidades?.permite_identidad_reutilizada === true} authoritiesAcrossStages={isThesisGrade} onSelectCandidate={(role, candidate) => setTeamAssignment((current) => ({ ...current, selections: { ...current.selections, [role]: candidate } }))} onSubmit={submitTeamAssignment} onClose={closeTeamAssignment} />
        : null}
      {tribunalReportDialog && <TribunalReportDialog report={tribunalReportDialog} finalVersion={currentFinalVersion} evidenceVersions={currentEvidenceVersions} canUpload={canUpload} canManageAssignments={canManageAssignments} tribunalReviewStage={tribunalReviewStage} activeActors={activeActors.data?.results || []} activeTribunals={activeTribunals} onRetryActiveTribunals={() => setActiveTribunalsRevision((value) => value + 1)} onDraftChange={updateTribunalReportDraft} onAssignMissing={(order) => setTribunalReportDialog((current) => ({ ...current, view: 'ASSIGN_MISSING_TRIBUNAL', assignment: { order, submitting: false, fields: {}, error: '' } }))} onBackToReport={() => setTribunalReportDialog((current) => ({ ...current, view: 'REGISTER_REPORT' }))} onSubmitMissing={submitMissingTribunal} onUploadEvidence={openTribunalEvidenceUpload} onSubmit={submitTribunalReport} onClose={closeTribunalReport} />}
    </section>
  )
}

function ProtectedDefenseDetail(props) {
  const { defense, isProjectGrade, isThesisGrade, onClose } = props
  const detail = <DefenseDetail {...props} />
  if ((isProjectGrade || isThesisGrade) && ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense?.tipo_evento)) {
    return <DefenseDetailErrorBoundary resetKey={defense.id} onClose={onClose}>{detail}</DefenseDetailErrorBoundary>
  }
  return detail
}

function StudentProcessView({ detalle, flujo, cierre, cierreSoportado, progress, canViewDocuments = false, canUploadDocuments = false, orientationOverride, onLoadDefenseRecord, memorandumContract, memorandums, onRetryMemorandums }) {
  const student = detalle.estudiante_detalle
  const period = detalle.periodo_detalle
  const currentStage = flujo.etapa_actual
  const orientation = orientationOverride || flujo.orientacion_etapa_actual
  const requirements = orientation?.requisitos || []
  const stageRequirements = requirements.filter((item) => item.bloquea_siguiente_accion !== false)
  const documentaryChecklist = requirements.filter((item) => item.bloquea_siguiente_accion === false)
  const stages = flujo.etapas || []
  const completed = flujo.etapas_completadas
  const total = flujo.etapas_totales
  const nextAction = orientation?.siguiente_accion
  const institutionManagementPending = nextAction?.codigo === 'GESTIONAR_INSTITUCION'
  const isDocumentAction = nextAction?.destino === '#documentos'
  const requiresDocumentUpload = /^(COMPLETAR|CARGAR|CORREGIR|ACTUALIZAR)_/.test(nextAction?.codigo || '')
  const canNavigateToDocuments = isDocumentAction
    && canViewDocuments
    && (!requiresDocumentUpload || canUploadDocuments)

  return <section className="mx-auto max-w-4xl space-y-5" aria-labelledby="student-process-title">
    <Card className="overflow-hidden border-slate-300 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mi proceso</p>
      <h1 id="student-process-title" className="mt-2 break-words text-3xl font-bold tracking-tight">{detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre || 'Proceso académico'}</h1>
      <p className="mt-1 text-base font-medium">{student ? formatStudentLabel(student) : EMPTY}</p>
      <p className="mt-1 text-sm text-slate-500">{period ? formatPeriodoLabel(period) : EMPTY}</p>
      <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-800">
        <Info label="Estado general" value={detalle.estado_actual_detalle?.nombre || detalle.estado_actual_detalle?.codigo} />
        <Info label="Etapa actual" value={currentStage?.nombre || 'Sin etapa actual'} />
      </dl>
      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold">Progreso académico</span><span>{progress === null ? EMPTY : `${progress}%`}</span></div>
        {progress !== null && <progress className="mt-2 h-3 w-full" max="100" value={progress} aria-label="Progreso académico">{progress}%</progress>}
        {Number.isInteger(completed) && Number.isInteger(total) && <p className="mt-2 text-sm text-slate-500">{completed} de {total} etapas completadas</p>}
      </div>
    </Card>

    <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">Etapa actual</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold">{currentStage?.nombre || 'Sin etapa actual'}</h2>
        {currentStage?.estado && <StatusBadge value={currentStage.estado_display || formatStatus(currentStage.estado)} positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(currentStage.estado)} />}
      </div>
      <section className="mt-5 border-t border-sky-200 pt-5 dark:border-sky-800" aria-labelledby="student-orientation-title">
        <h3 id="student-orientation-title" className="text-lg font-bold">Qué debes hacer ahora</h3>
        <p className="mt-2 text-sm">{orientation?.mensaje || 'No hay una orientación pendiente para esta etapa.'}</p>
        {detalle.modalidad_detalle?.codigo === 'TRABAJO_DIRIGIDO' && orientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA' && <>
          {detalle.estado_actual_detalle?.codigo !== 'CONCLUIDA' && <p className="mt-2 text-sm">La formalización corresponde al personal administrativo autorizado.</p>}
          {orientation.resultado_final?.nota_final != null && <p className="mt-2 font-semibold">Nota final: {String(orientation.resultado_final.nota_final).replace('.', ',')}/100 — {formatAcademicClassification(orientation.resultado_final.clasificacion)}</p>}
        </>}
        {institutionManagementPending && <p className="mt-2 text-sm">Solicita al personal responsable que registre la institución y el supervisor.</p>}
        {nextAction && !institutionManagementPending && <div className="mt-4 rounded-lg border border-sky-200 bg-white/70 p-4 dark:border-sky-800 dark:bg-slate-900/60">
          <p className="font-semibold">{nextAction.titulo}</p>
          {nextAction.descripcion && <p className="mt-1 text-sm">{nextAction.descripcion}</p>}
          {nextAction.estado && <p className="mt-2 text-sm font-medium">{nextAction.estado_display || formatStatus(nextAction.estado)}</p>}
          {canUploadDocuments && nextAction.codigo === 'CARGAR_ACTA_DEFENSA' && detalle.modalidad_detalle?.codigo === 'TESIS_GRADO'
            ? <Button type="button" className="mt-3" onClick={onLoadDefenseRecord}>Cargar Acta de Defensa</Button>
            : canNavigateToDocuments && <Link className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" to="/documentos">{nextAction.accion_label || 'Ir a documentos'}</Link>}
        </div>}
        {stageRequirements.length > 0 && <div className="mt-5"><h4 className="font-semibold">Requisitos relevantes</h4><ul className="mt-3 space-y-2">{stageRequirements.map((requirement) => <li key={`${requirement.tipo}-${requirement.codigo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 text-sm dark:border-sky-800 dark:bg-slate-900/60"><span className="font-medium">{requirement.nombre}</span><span>{requirement.estado_display || formatStatus(requirement.estado)}</span></li>)}</ul></div>}
        {documentaryChecklist.length > 0 && <div className="mt-5"><h4 className="font-semibold">Checklist documental</h4><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Estos documentos se muestran para seguimiento y no bloquean la siguiente acción académica.</p>{canViewDocuments && canUploadDocuments && <Link className="mt-2 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" to="/documentos">Gestionar documentos</Link>}<ul className="mt-3 space-y-2">{documentaryChecklist.map((requirement) => <li key={`${requirement.tipo}-${requirement.codigo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 text-sm dark:border-sky-800 dark:bg-slate-900/60"><span className="font-medium">{requirement.nombre}</span><span>{requirement.estado_display || formatStatus(requirement.estado)}</span></li>)}</ul></div>}
      </section>
    </Card>

    <Card className="overflow-hidden" aria-labelledby="student-stages-title">
      <h2 id="student-stages-title" className="text-xl font-bold">Etapas del proceso</h2>
      {stages.length === 0 ? <p className="mt-3 text-sm text-slate-500">El flujo académico todavía no fue inicializado.</p> : <ol className="mt-5">{stages.map((stage) => {
        const isCurrent = stage.id === currentStage?.id
        return <li key={stage.id} aria-current={isCurrent ? 'step' : undefined} className="relative flex gap-4 pb-5 last:pb-0">
          <span aria-hidden="true" className="absolute bottom-0 left-[0.7rem] top-6 w-px bg-slate-200 last:hidden dark:bg-slate-700" />
          <StageMarker state={stage.estado} />
          <div className={`min-w-0 flex-1 rounded-lg border px-4 py-3 text-sm ${isCurrent ? 'border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{stage.nombre}</strong><StatusBadge value={stage.estado_display || formatStatus(stage.estado)} compact positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(stage.estado)} /></div>
            {isCurrent && <p className="mt-1 font-medium text-sky-700 dark:text-sky-300">Etapa actual</p>}
          </div>
        </li>
      })}</ol>}
    </Card>

    {detalle.modalidad_detalle?.codigo === 'PROYECTO_GRADO' && memorandumContract && <MemorandumStatusCard memorandums={memorandums} onRetry={onRetryMemorandums} />}
    <StudentClosureSummary cierre={cierre} supported={cierreSoportado} />
  </section>
}

function StudentClosureSummary({ cierre, supported }) {
  const data = cierre?.data
  let message = 'El estado del cierre técnico todavía no está disponible.'
  if (!supported) message = 'Esta modalidad no requiere un cierre técnico gestionado por el sistema.'
  else if (data?.concluida || data?.estado_general === 'CONCLUIDA') message = 'El proceso se encuentra concluido.'
  else if (data?.cierre_documental_aprobado) message = 'El cierre documental está aprobado; la conclusión técnica permanece pendiente.'
  else if (data) message = 'El cierre técnico permanece pendiente.'

  return <Card className="overflow-hidden" aria-labelledby="student-closure-title">
    <h2 id="student-closure-title" className="text-xl font-bold">Cierre técnico</h2>
    <p className="mt-3 text-sm">{message}</p>
    {supported && data?.estado_general && <p className="mt-2 text-sm text-slate-500">Estado general: {formatStatus(data.estado_general)}</p>}
    {supported && cierre?.error && <p className="mt-2 text-sm text-slate-500">{cierre.error}</p>}
  </Card>
}

function ExpedienteNav({ activeTab, hasModalityTab, hasOutcomeTab, onActivate }) {
  const items = [
    ...EXPEDIENTE_PRIMARY_TABS,
    ...(hasModalityTab ? [{ id: 'modalidad', label: 'Modalidad', hash: 'modalidad' }] : []),
    ...(hasOutcomeTab ? [{ id: 'resultado-cierre', label: 'Resultado y cierre', hash: 'resultado-y-cierre' }] : []),
  ]
  const handleKeyDown = (event, index) => {
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = items.length - 1
    else return
    event.preventDefault()
    const nextTab = items[nextIndex]
    onActivate(nextTab.hash)
    document.getElementById(`expediente-tab-${nextTab.id}`)?.focus()
  }

  return <nav aria-label="Secciones del expediente" className="sticky top-2 z-10 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
    <ul className="flex min-w-max gap-1" role="tablist" aria-label="Pestañas del expediente">
      {items.map((item, index) => <li key={item.id}>
        <a
          id={`expediente-tab-${item.id}`}
          href={`#${item.hash}`}
          role="tab"
          aria-controls={item.id === 'modalidad' ? 'modalidad' : item.id === 'resultado-cierre' ? 'resultado-y-cierre' : `panel-${item.id}`}
          aria-selected={activeTab === item.id}
          tabIndex={activeTab === item.id ? 0 : -1}
          className={`block rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:hover:bg-slate-800${activeTab === item.id ? " relative after:absolute after:bottom-1 after:left-4 after:right-4 after:h-0.5 after:bg-blue-600 after:content-['']" : ''}`}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >{item.label}</a>
      </li>)}
    </ul>
  </nav>
}

function clarifyProjectFinalDocumentOrientation(orientation, isProjectGrade, currentStage) {
  if (!orientation || !isProjectGrade || currentStage?.codigo !== 'DOCUMENTO_FINAL') return orientation
  const clarify = (value) => typeof value === 'string'
    ? value.replaceAll('Documento Final', 'Documento Final del Proyecto de Grado')
    : value
  const action = orientation.siguiente_accion
    ? {
        ...orientation.siguiente_accion,
        titulo: clarify(orientation.siguiente_accion.titulo),
        descripcion: clarify(orientation.siguiente_accion.descripcion),
      }
    : null
  if (action?.codigo === 'COMPLETAR_DOCUMENTOS' && orientation.siguiente_accion?.titulo === 'Cargar Documento Final') {
    action.titulo = 'Cargar Documento Final del Proyecto de Grado'
    action.descripcion = 'Carga el documento completo del Proyecto de Grado para continuar con la revisión correspondiente.'
  }
  return {
    ...orientation,
    mensaje: action?.codigo === 'COMPLETAR_DOCUMENTOS' && orientation.siguiente_accion?.titulo === 'Cargar Documento Final'
      ? 'Carga el documento completo del Proyecto de Grado para continuar con la revisión correspondiente.'
      : clarify(orientation.mensaje),
    siguiente_accion: action,
  }
}

function OperationalSummary({ directedConclusion, onConcludeDirected, cierre, cierreSoportado, currentStage, orientation, stageApproval, pendingCurrentRequirements = 0, onApproveStage, canApproveStage = false, onGoToDocuments, onOpenDocumentUpload, documentActionPending = false, onProgramDefense, onOpenDefense, programmingContext, canProgramDefense = false, orientationAcademicDecision, onRegisterAcademicDecision, completedStages = 0, totalStages = 0, workflowProgress = null, pendingTechnicalClosure = false, examConclusionPending = false, academicExcellenceResult = null, resultado, concluded, defenses = [], isProjectGrade = false, isExamGrade = false, isAcademicExcellence = false, isThesisGrade = false, isThesisPublicStage = false, publicDefenseMissingRoles = [], canUpload = false, canManageApplications = false, canManageAssignments = false, canManageDefenses = false, canManageEvaluations = false, hideRequirements = false, additionalContent = null, onCompleteAuthorities, onManageActors, onManageMissingActors, canOpenProfileTutor = false, canOpenPrivateSecretary = false, onOpenDictamen, onRegisterTribunalReport }) {
  if (directedConclusion && (concluded || orientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA')) {
    const action = orientation?.siguiente_accion
    const canConclude = !concluded && action?.codigo === 'CONCLUIR_ACADEMICAMENTE' && action.estado === 'DISPONIBLE'
    const finalResult = orientation?.resultado_final || resultado?.data
    return <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950" aria-labelledby="directed-conclusion-title">
      <p className="text-xs font-bold uppercase tracking-[0.16em]">Orientación del expediente</p>
      <h2 id="directed-conclusion-title" className="mt-2 text-xl font-bold">{concluded ? 'Proceso académico concluido' : action?.titulo}</h2>
      <p className="mt-3 text-sm">{orientation?.mensaje || 'La conclusión académica está formalizada. Puedes consultar el resultado final de la postulación.'}</p>
      {finalResult?.nota_final != null && <p className="mt-3 font-semibold">Nota final: {String(finalResult.nota_final).replace('.', ',')}/100 — {formatAcademicClassification(finalResult.clasificacion)}</p>}
      {!concluded && !canManageApplications && <p className="mt-3 text-sm">La formalización corresponde al personal administrativo autorizado.</p>}
      {canConclude && directedConclusion.allowed && <Button className="mt-4" type="button" disabled={directedConclusion.submitting || directedConclusion.done} onClick={onConcludeDirected}>{directedConclusion.submitting ? 'Concluyendo…' : directedConclusion.done ? 'Actualizando expediente…' : 'Concluir académicamente'}</Button>}
      {!concluded && !canConclude && action?.destino && <a className="mt-4 mr-4 inline-block font-semibold text-sky-700 hover:underline dark:text-sky-300" href={action.destino}>{action.accion_label || 'Revisar bloqueo'}</a>}
      <a className="mt-4 ml-4 inline-block font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#resultado-y-cierre">Consultar resultado</a>
      {directedConclusion.error && <p role="alert" className="mt-3 text-sm text-red-600">{directedConclusion.error}</p>}
    </Card>
  }
  if (isAcademicExcellence && academicExcellenceResult) {
    const favorable = academicExcellenceResult.estado === 'FAVORABLE'
    const showAverage = academicExcellenceResult.criterio === 'RENDIMIENTO_ACADEMICO'
      && academicExcellenceResult.promedioGeneral !== null
      && academicExcellenceResult.promedioGeneral !== undefined
      && academicExcellenceResult.promedioGeneral !== ''
    return <Card className="overflow-hidden border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-200">Orientación del expediente</p>
      <h2 className="mt-2 text-xl font-bold">Resultado académico final</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div><dt className="text-xs uppercase text-slate-500">Conclusión académica</dt><dd className="font-semibold">Aprobada</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Resultado académico</dt><dd className="font-semibold"><StatusBadge value={favorable ? 'Favorable' : 'Desfavorable'} positive={favorable} /></dd></div>
        {showAverage && <div><dt className="text-xs uppercase text-slate-500">Promedio académico</dt><dd className="font-semibold">{academicExcellenceResult.promedioGeneral}</dd></div>}
      </dl>
      <p className="mt-4 text-sm">La conclusión académica está registrada independientemente del estado administrativo general de la postulación.</p>
      <p className="mt-2 text-sm">{concluded ? 'La conclusión de la postulación está formalizada.' : 'Falta formalizar la conclusión de la postulación.'}</p>
    </Card>
  }
  if (concluded) return <Card className="overflow-hidden border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-200">✓ Expediente concluido</p>
    <p className="mt-3 font-medium">{cierreSoportado ? 'Todas las etapas académicas y el cierre documental se encuentran completados.' : 'Todas las etapas académicas se encuentran completadas.'}</p>
    <div className="mt-4 flex flex-wrap items-center gap-3"><strong className="text-2xl">Nota final: {isExamGrade && resultado?.data?.nota_final != null ? String(resultado.data.nota_final).replace('.', ',') : resultado?.data?.nota_final ?? 'No registrada'}{isExamGrade && resultado?.data?.nota_final != null ? '/100' : ''}</strong>{resultado?.data?.clasificacion && <StatusBadge value={formatAcademicClassification(resultado.data.clasificacion)} positive />}</div>
  </Card>
  if (examConclusionPending) return <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">Orientación del expediente</p>
    <h2 className="mt-2 text-xl font-bold">Conclusión de la postulación pendiente</h2>
    <section className="mt-4 rounded-xl border border-sky-200 bg-white/70 p-4 dark:border-sky-800 dark:bg-slate-900/60" aria-labelledby="exam-conclusion-guidance-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="exam-conclusion-guidance-title" className="text-lg font-bold">Flujo académico completado</h3><p className="mt-1 text-sm text-slate-500">{completedStages} de {totalStages} etapas completadas · {workflowProgress}% de etapas</p></div>
        <StatusBadge value="Aprobada" positive />
      </div>
    </section>
    <div className="mt-4 flex flex-wrap items-center gap-3"><strong className="text-2xl">Calificación final: {String(resultado.data.nota_final).replace('.', ',')}/100</strong>{resultado.data.clasificacion && <StatusBadge value={formatAcademicClassification(resultado.data.clasificacion)} positive />}</div>
    <p className="mt-4 text-sm">El flujo académico terminó, pero la postulación continúa En proceso. Falta ejecutar la conclusión de la postulación con la operación administrativa existente.</p>
    <a className="mt-4 inline-block font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#examen">Ir a concluir académicamente</a>
  </Card>
  if (pendingTechnicalClosure) return <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">Cierre técnico del expediente</p>
    <section className="mt-4 rounded-xl border border-sky-200 bg-white/70 p-4 dark:border-sky-800 dark:bg-slate-900/60" aria-labelledby="technical-closure-guidance-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="technical-closure-guidance-title" className="text-lg font-bold">Flujo académico completado</h3><p className="mt-1 text-sm text-slate-500">{completedStages} de {totalStages} etapas completadas · {workflowProgress}% de etapas</p></div>
        <StatusBadge value="Flujo académico completado" positive />
      </div>
    </section>
    <p className="mt-4 text-sm">Todas las etapas del proceso académico fueron aprobadas. La postulación aún está en proceso y requiere completar el cierre técnico.</p>
    <a className="mt-4 inline-block font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#condiciones-tecnicas">Gestionar cierre técnico</a>
  </Card>
  const stageMessage = currentStage?.estado === 'PENDIENTE'
    ? canManageApplications
      ? 'La etapa está lista para iniciarse.'
      : 'Esta etapa está pendiente de inicio por el personal responsable.'
    : ['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado)
      ? 'La etapa se encuentra en curso. Revisa la información y las acciones disponibles.'
      : 'No existe una etapa actual disponible.'
  const operationIsCurrent = ['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado)
    || orientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA'
    || (isAcademicExcellence && orientation?.operacion === 'CONFIGURAR_EXCELENCIA')
    || orientation?.siguiente_accion?.codigo === 'GESTIONAR_INSTITUCION'
    || currentStage?.estado == null
  const effectiveOrientation = operationIsCurrent
    ? clarifyProjectFinalDocumentOrientation(orientation, isProjectGrade, currentStage)
    : null
  const requirements = [...(effectiveOrientation?.requisitos || []), ...getClosureTrackingRequirements(cierre, currentStage)]
  const pendingClosureTrackingDocuments = requirements.filter((item) => item.tipo === 'DOCUMENTO' && CLOSURE_TRACKING_DOCUMENT_CODES.includes(item.codigo) && item.cumplido === false)
  const publicAuthoritiesCapability = effectiveOrientation?.siguiente_accion?.capacidades
  const supportsPublicAuthoritiesDialog = isProjectGrade
    || publicAuthoritiesCapability?.modal === 'PUBLIC_AUTHORITIES'
  const publicAuthorityRequirements = supportsPublicAuthoritiesDialog && currentStage?.codigo === 'DEFENSA_PUBLICA'
    ? requirements.filter((item) => ['PRESIDENTE', 'SECRETARIO'].includes(item.codigo))
    : []
  const publicAuthorityConflict = publicAuthorityRequirements.some((item) => item.conflicto_identidad === true)
    || (effectiveOrientation?.conflictos_identidad || []).length > 0
  const publicAuthorityAction = canManageAssignments
    && supportsPublicAuthoritiesDialog
    && currentStage?.codigo === 'DEFENSA_PUBLICA'
    && ['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado)
    && publicAuthorityRequirements.some((item) => item.cumplido === false)
    && (publicAuthoritiesCapability?.permite_identidad_reutilizada || !publicAuthorityConflict)
  const profileDefenseCandidates = isProjectGrade && currentStage?.codigo === 'PERFIL_PROYECTO'
    && currentStage?.activo !== false && currentStage?.id != null && currentStage?.numero_intento != null
    ? defenses.filter((defense) => defense.tipo_evento === 'DEFENSA_PERFIL'
      && String(defense.seguimiento_etapa) === String(currentStage.id)
      && Number(defense.numero_intento) === Number(currentStage.numero_intento)
      && defense.estado !== 'CANCELADA'
      && defense.activo !== false)
    : []
  const profileDefense = profileDefenseCandidates.length === 1 ? profileDefenseCandidates[0] : null
  const privateDefenseCandidates = isProjectGrade && currentStage?.codigo === 'DEFENSA_PRIVADA'
    && currentStage?.id != null && currentStage?.numero_intento != null
    ? defenses.filter((defense) => defense.tipo_evento === 'DEFENSA_PRIVADA'
      && String(defense.seguimiento_etapa) === String(currentStage.id)
      && Number(defense.numero_intento) === Number(currentStage.numero_intento)
      && defense.estado !== 'CANCELADA'
      && defense.activo !== false)
    : []
  const privateDefense = privateDefenseCandidates.length === 1 ? privateDefenseCandidates[0] : null
  const publicDefenseCandidates = isProjectGrade && currentStage?.codigo === 'DEFENSA_PUBLICA'
    && currentStage?.id != null && currentStage?.numero_intento != null
    ? defenses.filter((defense) => defense.tipo_evento === 'DEFENSA_PUBLICA'
      && String(defense.seguimiento_etapa) === String(currentStage.id)
      && Number(defense.numero_intento) === Number(currentStage.numero_intento)
      && defense.estado !== 'CANCELADA'
      && defense.activo !== false)
    : []
  const publicDefense = publicDefenseCandidates.length === 1 ? publicDefenseCandidates[0] : null
  const profileEvaluation = profileDefense?.evaluaciones?.some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const profileDefenseAction = profileDefense ? {
    codigo: 'CONSULTAR_DEFENSA_PERFIL',
    titulo: profileDefense.estado === 'PROGRAMADA'
      ? 'Continuar Defensa de Perfil programada'
      : profileDefense.estado === 'EN_CURSO'
        ? 'Gestionar y finalizar Defensa de Perfil'
        : profileDefense.estado === 'FINALIZADA' && !profileEvaluation
          ? 'Registrar evaluación de Perfil'
          : profileDefense.estado === 'FINALIZADA' && !profileDefense.resultado_consolidado
            ? 'Consolidar resultado de Perfil'
            : 'Ver Defensa de Perfil',
    descripcion: 'Abre la defensa vinculada a esta etapa para continuar con las acciones habilitadas por su estado.',
    estado: 'DISPONIBLE',
    estado_display: 'Disponible',
    destino: '#defensas',
    accion_label: 'Ir a la defensa',
    requiredCapability: ['PROGRAMADA', 'EN_CURSO'].includes(profileDefense.estado) ? 'DEFENSE_MANAGEMENT'
      : profileDefense.estado === 'FINALIZADA' && (!profileEvaluation || !profileDefense.resultado_consolidado) ? 'EVALUATION_MANAGEMENT'
        : null,
    waitingMessage: profileDefense.estado === 'EN_CURSO'
      ? 'La defensa está pendiente de finalización por el personal responsable.'
      : profileDefense.estado === 'FINALIZADA' && !profileEvaluation
        ? 'La evaluación está pendiente de registro por el personal responsable.'
        : profileDefense.estado === 'FINALIZADA' && !profileDefense.resultado_consolidado
          ? 'El resultado está pendiente de consolidación por el personal responsable.'
          : profileDefense.estado === 'PROGRAMADA'
            ? 'La defensa programada está pendiente de gestión por el personal responsable.'
            : 'No necesitas realizar ninguna acción por el momento.',
  } : null
  const orientationAction = effectiveOrientation?.siguiente_accion
  const studentMustWaitForApproval = !canManageApplications && orientationAction?.codigo === 'APROBAR_ETAPA'
  const closureDocumentAction = pendingClosureTrackingDocuments.length > 0
    ? {
        codigo: 'COMPLETAR_DOCUMENTOS',
        titulo: 'Cargar documentos',
        descripcion: 'Carga los documentos de seguimiento pendientes para continuar con el cierre documental.',
        estado: 'PENDIENTE',
        estado_display: 'Pendiente',
        destino: '#documentos',
        accion_label: 'Gestionar documentos',
      }
    : null
  const nextAction = profileDefenseAction || closureDocumentAction || (studentMustWaitForApproval ? null : orientationAction)
  const assignmentActionUnavailable = nextAction?.requiere_permiso === 'GESTIONAR_ASIGNACIONES' && !canManageAssignments
  const profileActionAvailable = profileDefenseAction?.requiredCapability === 'DEFENSE_MANAGEMENT'
    ? canManageDefenses
    : profileDefenseAction?.requiredCapability === 'EVALUATION_MANAGEMENT'
      ? canManageEvaluations
      : true
  const administrativeActionPending = Boolean(profileDefenseAction?.requiredCapability && !profileActionAvailable)
  const personalDocumentAction = !profileDefenseAction && nextAction?.destino === '#documentos' && canUpload
  const managesMissingPublicActors = publicDefenseMissingRoles.length > 0 && nextAction?.destino === '#actores'
  const thesisAuthoritiesAction = isThesisPublicStage && managesMissingPublicActors
    && nextAction?.accion_label === 'Completar autoridades'
  const nextActionTitle = isThesisPublicStage && publicDefenseMissingRoles.length === 0 && nextAction?.codigo === 'PROGRAMAR_EVENTO'
    ? 'Programar Defensa Pública'
    : nextAction?.titulo
  const visibleNextActionTitle = nextActionTitle
  const stageRequirements = requirements.filter((item) => item.bloquea_siguiente_accion !== false)
  const documentaryChecklist = requirements.filter((item) => item.bloquea_siguiente_accion === false)
  const completedRequirements = stageRequirements.filter((item) => item.cumplido).length
  const approvalMissingLabels = Array.isArray(stageApproval?.fields?.faltantes)
    ? stageApproval.fields.faltantes.map(humanizeRequirementCode).join(', ')
    : ''
  const orientationMessage = approvalMissingLabels
    ? `Falta completar: ${approvalMissingLabels}.`
    : publicAuthorityAction
      ? effectiveOrientation?.mensaje || 'Completa las autoridades requeridas para continuar con la Defensa Pública.'
    : studentMustWaitForApproval
    ? isProjectGrade && currentStage?.codigo === 'DOCUMENTO_FINAL'
      ? 'El Documento Final del Proyecto de Grado está aprobado. Espera la aprobación de la etapa por el personal responsable.'
      : currentStage?.codigo === 'DOCUMENTO_FINAL'
        ? 'El Documento Final está aprobado. Espera la aprobación de la etapa por el personal responsable.'
        : `La aprobación de ${currentStage?.nombre || 'esta etapa'} está pendiente del personal responsable.`
    : effectiveOrientation?.mensaje || stageMessage
  const visibleOrientationAction = approvalMissingLabels ? null : nextAction
  const isThesisProfileAction = isThesisGrade && currentStage?.codigo === 'PERFIL_TESIS'
    && visibleOrientationAction?.codigo === 'COMPLETAR_PERFIL'
  const profileDocumentRequirements = isThesisProfileAction
    ? stageRequirements.filter((item) => item.destino === '#documentos' && item.codigo)
    : []
  const pendingProfileDocumentCodes = profileDocumentRequirements
    .filter((item) => item.cumplido === false).map((item) => item.codigo)
  const canResolveProfileDocuments = isThesisProfileAction && canUpload && pendingProfileDocumentCodes.length > 0
  const onlyProfileTutorPending = isThesisProfileAction && profileDocumentRequirements.length > 0
    && profileDocumentRequirements.every((item) => item.cumplido === true)
    && stageRequirements.some((item) => item.codigo === 'TUTOR' && item.cumplido === false && item.destino === '#actores')
    && stageRequirements.filter((item) => item.cumplido === false).every((item) => item.codigo === 'TUTOR')
  const isDocumentUploadAction = ['COMPLETAR_DOCUMENTOS', 'CARGAR_HOJA_APROBACION'].includes(visibleOrientationAction?.codigo)
  const isThesisActaUpload = isThesisGrade && visibleOrientationAction?.codigo === 'CARGAR_ACTA_DEFENSA'
  const navigatesToDocumentUpload = visibleOrientationAction?.codigo === 'CARGAR_HOJA_APROBACION'
    || pendingClosureTrackingDocuments.length > 0
  const canNavigateToDocumentUpload = isDocumentUploadAction && canUpload
  const canOpenDocumentUpload = canNavigateToDocumentUpload
  const canOpenDefenseProgramming = nextAction?.codigo === 'PROGRAMAR_EVENTO'
    && canProgramDefense
    && Boolean(programmingContext)
  const canOpenAcademicDecision = nextAction?.codigo === 'REGISTRAR_DECISION'
    && Boolean(orientationAcademicDecision)
    && !isThesisGrade
  return <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">Orientación del expediente</p>
    <h2 className="mt-2 text-xl font-bold">{administrativeActionPending ? 'Gestión administrativa pendiente' : 'Qué debes hacer ahora'}</h2>
    <section className="mt-4 rounded-xl border border-sky-200 bg-white/70 p-4 dark:border-sky-800 dark:bg-slate-900/60" aria-labelledby="current-stage-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="current-stage-title" className="text-lg font-bold">{currentStage?.nombre || formatCode(cierre?.etapa_actual) || 'Sin etapa pendiente'}</h3><p className="mt-1 text-sm text-slate-500">{totalStages ? `${completedStages} de ${totalStages} etapas completadas` : 'Flujo académico sin etapas registradas'}</p></div>
        {currentStage?.estado && <StatusBadge value={currentStage.estado_display || formatStatus(currentStage.estado)} positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(currentStage.estado)} />}
      </div>
    </section>
    {isExamGrade && resultado?.data?.nota_final != null && <div className="mt-4 flex flex-wrap items-center gap-3"><strong className="text-2xl">Calificación final: {String(resultado.data.nota_final).replace('.', ',')}/100</strong>{resultado.data.clasificacion && <StatusBadge value={formatAcademicClassification(resultado.data.clasificacion)} positive />}</div>}
    <p className="mt-4 text-sm">{orientationMessage}</p>
    {approvalMissingLabels ? <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950" aria-labelledby="missing-document-action-title">
      <h3 id="missing-document-action-title" className="text-lg font-bold">Siguiente acción</h3>
      <p className="mt-1 text-sm">Completa el documento pendiente para volver a intentar la aprobación.</p>
      <Button className="mt-3" onClick={onGoToDocuments}>Ir a documentos</Button>
      {stageApproval.error && <p role="alert" className="mt-2 text-sm text-red-600">{stageApproval.error}</p>}
    </section> : administrativeActionPending ? <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950" aria-labelledby="administrative-action-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 id="administrative-action-title" className="text-lg font-bold">En espera del personal responsable</h3><p className="mt-1 text-sm">{profileDefenseAction.waitingMessage}</p></div><StatusBadge value="Pendiente" compact /></div>
      <a className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#defensas">Ver defensa</a>
    </section> : publicAuthorityAction ? <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950" aria-labelledby="public-authority-action-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 id="public-authority-action-title" className="text-lg font-bold">Siguiente acción</h3><p className="mt-1 font-semibold">{effectiveOrientation?.siguiente_accion?.titulo || 'Completar autoridades'}</p><p className="mt-1 text-sm">{effectiveOrientation?.siguiente_accion?.descripcion || 'Completa las autoridades requeridas para continuar con la Defensa Pública.'}</p></div><StatusBadge value="Pendiente" compact /></div>
      <p className="mt-2 text-sm">Pendientes: {publicAuthorityRequirements.filter((item) => item.cumplido === false).map((item) => item.nombre).join(', ')}.</p>
      <Button className="mt-3" type="button" onClick={onCompleteAuthorities}>{effectiveOrientation?.siguiente_accion?.accion_label || 'Completar autoridades'}</Button>
    </section> : visibleOrientationAction && <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950" aria-labelledby="next-action-title" data-personal-action={personalDocumentAction || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 id="next-action-title" className="text-lg font-bold">Siguiente acción</h3><p className="mt-1 font-semibold">{visibleNextActionTitle}</p><p className="mt-1 text-sm">{nextAction.descripcion}</p></div>
        {nextAction.estado && <StatusBadge value={nextAction.estado_display || nextAction.estado} positive={nextAction.estado === 'COMPLETADA'} compact />}
      </div>
      {managesMissingPublicActors && <div className="mt-3 rounded-lg border border-amber-300 bg-white/70 p-3 text-sm dark:bg-slate-900/50"><p className="font-semibold">Para programar la Defensa Pública faltan:</p><ul className="mt-2 list-disc pl-5">{publicDefenseMissingRoles.map((role) => <li key={role}>{assignmentTypeLabel(role)}</li>)}</ul></div>}
      {nextAction.codigo === 'APROBAR_ETAPA' ? canApproveStage ? <>
        <Button type="button" className="mt-3" disabled={stageApproval.submitting} onClick={onApproveStage}>{stageApproval.submitting ? 'Procesando…' : nextAction.accion_label || nextAction.titulo || `Aprobar ${currentStage?.nombre || formatCode(currentStage?.codigo) || 'etapa'}`}</Button>
        {pendingCurrentRequirements > 0 && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Hay {pendingCurrentRequirements} {pendingCurrentRequirements === 1 ? 'requisito pendiente' : 'requisitos pendientes'}. El backend realizará la validación definitiva al aprobar.</p>}
      </> : null
        : onlyProfileTutorPending && canManageAssignments ? <a className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#actores" onClick={canOpenProfileTutor ? (event) => { event.preventDefault(); event.stopPropagation(); onManageActors(event) } : undefined}>Ir a actores</a>
          : canResolveProfileDocuments ? <button type="button" disabled={documentActionPending} className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={() => onOpenDocumentUpload(false, pendingProfileDocumentCodes)}>{nextAction.accion_label || 'Ir a documentos'}</button>
          : isThesisActaUpload ? canUpload && <Button type="button" disabled={documentActionPending} className="mt-3" onClick={() => onOpenDocumentUpload(false, 'ACTA_DEFENSA')}>Cargar Acta de Defensa</Button>
          : canOpenDocumentUpload ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={() => onOpenDocumentUpload(navigatesToDocumentUpload)}>Gestionar documentos</button>
          : canNavigateToDocumentUpload ? <a className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#documentos" onClick={(event) => { event.preventDefault(); onGoToDocuments() }}>Gestionar documentos</a>
            : canOpenAcademicDecision ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={() => onRegisterAcademicDecision(orientationAcademicDecision)}>{nextAction.accion_label || 'Ir a gestionar'}</button>
            : nextAction.codigo === 'REGISTRAR_INFORME_TRIBUNAL' && nextAction.estado === 'DISPONIBLE' && onRegisterTribunalReport
              ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={onRegisterTribunalReport}>{nextAction.accion_label}</button>
            : thesisAuthoritiesAction && onManageMissingActors ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={onManageMissingActors}>Completar autoridades</button>
            : canOpenDefenseProgramming ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={onProgramDefense}>{nextAction.accion_label || 'Ir a gestionar'}</button>
          : profileDefenseAction && profileDefense && onOpenDefense
            ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={(event) => { event.preventDefault(); onOpenDefense(profileDefense) }}>{nextAction.accion_label}</button>
            : isProjectGrade && currentStage?.codigo === 'DEFENSA_PRIVADA'
              && nextAction.destino === '#defensas' && nextAction.estado === 'DISPONIBLE'
              && privateDefense && onOpenDefense
              ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={(event) => { event.preventDefault(); onOpenDefense(privateDefense) }}>{nextAction.accion_label || 'Ir a gestionar'}</button>
            : isProjectGrade && currentStage?.codigo === 'DEFENSA_PUBLICA'
              && nextAction.destino === '#defensas' && nextAction.estado === 'DISPONIBLE'
              && publicDefense && onOpenDefense
              ? <button type="button" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={(event) => { event.preventDefault(); onOpenDefense(publicDefense) }}>{nextAction.accion_label || 'Ir a gestionar'}</button>
            : nextAction.destino && !assignmentActionUnavailable && (!isDocumentUploadAction || canNavigateToDocumentUpload) && <a className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" href={nextAction.destino} onClick={nextAction.codigo === 'REGISTRAR_DICTAMEN' && onOpenDictamen ? onOpenDictamen : (nextAction.codigo === 'GESTIONAR_ACTORES' || canOpenPrivateSecretary) ? (event) => { event.preventDefault(); if (canOpenPrivateSecretary) event.stopPropagation(); onManageActors(event) } : managesMissingPublicActors ? onManageMissingActors : undefined}>{nextAction.codigo === 'REGISTRAR_INFORME_TRIBUNAL' ? 'Consultar revisión del Tribunal' : nextAction.accion_label || 'Ir a gestionar'}</a>}
      {nextAction.codigo === 'APROBAR_ETAPA' && stageApproval.error && <p role="alert" className="mt-2 text-sm text-red-600">{stageApproval.error}</p>}
    </section>}
    {!hideRequirements && stageRequirements.length > 0 && <section className="mt-5 border-t border-sky-200 pt-5 dark:border-sky-800" aria-labelledby="stage-requirements-title">
      <h3 id="stage-requirements-title" className="text-lg font-bold">Requisitos de esta etapa</h3>
      <ul className="mt-3 space-y-2">{stageRequirements.map((item) => (
        <li key={`${item.tipo}-${item.codigo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 dark:border-sky-800 dark:bg-slate-900/60">
            <span className="font-medium">{item.cumplido === true ? '✓' : item.cumplido === false ? '⚠' : 'ℹ'} {item.nombre}</span>
            {item.actual !== undefined && item.minimo !== undefined ? <span className="text-right text-sm"><span className="block font-semibold">{item.actual} vigentes</span><span className="block text-slate-600 dark:text-slate-300">Mínimo requerido: {item.minimo}</span><span className={item.cumplido === true ? 'font-semibold text-emerald-700 dark:text-emerald-300' : item.cumplido === false ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-sky-700 dark:text-sky-300'}>{item.cumplido === true ? 'Requisito cumplido' : item.cumplido === false ? 'Pendiente' : item.estado_display}</span></span> : <span className={item.cumplido === true ? 'font-semibold text-emerald-700 dark:text-emerald-300' : item.cumplido === false ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-sky-700 dark:text-sky-300'}>{item.estado_display}</span>}
            {item.destino && item.destino !== nextAction?.destino && !(publicAuthorityAction && ['PRESIDENTE', 'SECRETARIO'].includes(item.codigo)) && <a className="w-full text-sm font-medium text-sky-700 hover:underline dark:text-sky-300" href={item.destino} onClick={canOpenProfileTutor && item.codigo === 'TUTOR' && item.cumplido === false && item.destino === '#actores' ? (event) => { event.preventDefault(); event.stopPropagation(); onManageActors(event) } : undefined}>Ir a gestionar</a>}
        </li>
      ))}</ul>
      <p className="mt-3 text-sm font-semibold">{completedRequirements} de {stageRequirements.length} cumplidos</p>
    </section>}
    {!hideRequirements && documentaryChecklist.length > 0 && <section className="mt-5 border-t border-sky-200 pt-5 dark:border-sky-800" aria-labelledby="documentary-checklist-title">
      <h3 id="documentary-checklist-title" className="text-lg font-bold">Checklist documental</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Seguimiento de documentos; estos pendientes no bloquean la siguiente acción académica.</p>
      <ul className="mt-3 space-y-2">{documentaryChecklist.map((item) => (
        <li key={`${item.tipo}-${item.codigo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 dark:border-sky-800 dark:bg-slate-900/60">
          <span className="font-medium">{item.cumplido === true ? '✓' : '⚠'} {item.nombre}</span>
          <span className={item.cumplido === true ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-amber-700 dark:text-amber-300'}>{item.estado_display}</span>
          {canUpload && item.destino && <a className="w-full text-sm font-medium text-sky-700 hover:underline dark:text-sky-300" href={item.destino}>Ir a documentos</a>}
        </li>
      ))}</ul>
      <p className="mt-3 text-sm font-semibold">{documentaryChecklist.filter((item) => item.cumplido).length} de {documentaryChecklist.length} documentos aprobados</p>
    </section>}
    {additionalContent && <div className="mt-5 grid gap-5 border-t border-sky-200 pt-5 dark:border-sky-800">{additionalContent}</div>}
  </Card>
}

function InscriptionDocumentsSection({ requirements, completed, total, embedded = false }) {
  const Heading = embedded ? 'h3' : 'h2'
  const Subheading = embedded ? 'h4' : 'h3'
  return <Card className={embedded ? 'overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none' : 'overflow-hidden'} aria-labelledby="inscription-requirements-title">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <Heading id="inscription-requirements-title" className="text-xl font-bold">Requisitos de Inscripción</Heading>
      <p className="font-semibold text-slate-700 dark:text-slate-200">{completed} de {total} cumplidos</p>
    </div>
    <section className={embedded ? 'mt-3' : 'mt-6 border-t border-slate-200 pt-5 dark:border-slate-700'} aria-labelledby="inscription-documents-title">
      <Subheading id="inscription-documents-title" className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Documentación de Inscripción</Subheading>
      <ul className={embedded ? 'mt-3 space-y-2' : 'mt-4 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700'}>
        {requirements.map((item) => <li key={item.codigo} className={embedded
          ? 'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 dark:border-sky-800 dark:bg-slate-900/60'
          : 'flex flex-wrap items-center justify-between gap-3 py-3'}>
          <span className="font-medium">{item.cumplido ? '✓' : '⚠'} {item.nombre}</span>
          <span className={item.cumplido ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-amber-700 dark:text-amber-300'}>{item.estado_display}</span>
        </li>)}
      </ul>
    </section>
  </Card>
}

function ContextLink({ href, label, value, valueLabel }) {
  return <div className="rounded-lg border border-sky-200 bg-white/70 p-3 dark:border-sky-800 dark:bg-slate-900/60"><dt className="font-semibold">{label}</dt><dd className="mt-1 text-sm text-slate-600 dark:text-slate-300"><strong className="text-lg text-slate-900 dark:text-slate-100">{value}</strong> {valueLabel}</dd><a className="mt-2 block text-sm font-medium text-sky-700 hover:underline dark:text-sky-300" href={href}>Ver sección</a></div>
}

function formatStatus(value) {
  const text = formatCode(value).toLocaleLowerCase('es-BO')
  return text ? text.charAt(0).toLocaleUpperCase('es-BO') + text.slice(1) : EMPTY
}

function formatClosureSummary(cierre) {
  if (!cierre) return 'Estado de cierre técnico no disponible.'
  const conditions = cierre.condiciones_faltantes?.length || 0
  const deliveries = cierre.entregas_faltantes?.length || 0
  const documents = cierre.documentos_faltantes?.length || 0
  return `${conditions} condiciones pendientes · ${deliveries} entregas pendientes · ${documents} documentos pendientes`
}

function StatusBadge({ value, positive = false, compact = false }) {
  return <span className={`inline-flex w-fit items-center rounded-full border font-semibold ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${positive ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100' : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>{positive ? '✓ ' : ''}{value || EMPTY}</span>
}

function StageMarker({ state }) {
  const complete = ['APROBADA', 'COMPLETADA', 'CERRADA'].includes(state)
  const active = ['EN_PROCESO', 'OBSERVADA'].includes(state)
  return <span aria-hidden="true" className={`relative z-[1] mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${complete ? 'border-emerald-600 bg-emerald-600 text-white' : active ? 'border-sky-600 bg-white text-sky-700 dark:bg-slate-900' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900'}`}>{complete ? '✓' : active ? '●' : '○'}</span>
}

function Score({ label, value, scale, fallback = EMPTY, detail = null, decimalComma = false }) {
  const displayValue = decimalComma && value !== null && value !== undefined ? String(value).replace('.', ',') : value
  return <div className="rounded-lg border border-slate-200 p-4 text-center dark:border-slate-700"><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-bold">{displayValue ?? fallback}{scale && value !== null && value !== undefined ? <span className="text-sm font-medium text-slate-500"> / {scale}</span> : null}</dd>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>
}

function formatAcademicClassification(value) {
  if (value === 'APROBACION_PLENA_CON_FELICITACION') return 'APROBACIÓN PLENA CON FELICITACIÓN'
  if (value === 'APROBACION_PLENA') return 'APROBACIÓN PLENA'
  return formatCode(value)
}

function formatCode(value) {
  return String(value || '').replaceAll('_', ' ')
}

function getDefenseProgrammingContext({ stages, currentStage, orientation, activeCurrentDefense }) {
  if (!currentStage?.id || currentStage.activo === false || !['EN_PROCESO', 'OBSERVADA'].includes(currentStage.estado) || activeCurrentDefense) return null
  const action = orientation?.siguiente_accion
  const tipoEvento = orientation?.tipo_evento
  if (action?.codigo !== 'PROGRAMAR_EVENTO' || action.estado !== 'DISPONIBLE' || !tipoEvento) return null
  const expectedStage = DEFENSE_TYPES.find(([value]) => value === tipoEvento)?.[2]
  const stageCodes = Array.isArray(expectedStage) ? expectedStage : [expectedStage]
  const candidates = stages.filter((stage) => stageCodes.includes(stage.codigo)
    && stage.activo !== false && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado))
  if (!stageCodes.includes(currentStage.codigo) || candidates.length !== 1
    || String(candidates[0].id) !== String(currentStage.id)
    || candidates[0].numero_intento !== currentStage.numero_intento) return null
  const typeLabel = DEFENSE_TYPES.find(([value]) => value === tipoEvento)?.[1] || formatCode(tipoEvento)
  const anticipation = orientation.requisitos?.find((item) => item.codigo === 'ANTICIPACION_MINIMA' && item.valor !== undefined)
  return {
    tipoEvento,
    seguimientoEtapa: currentStage.id,
    typeLabel,
    stageLabel: `${currentStage.nombre || formatCode(currentStage.codigo)} · Intento ${currentStage.numero_intento ?? 1}`,
    anticipationLabel: anticipation ? `${anticipation.valor} ${anticipation.unidad || 'horas'}` : null,
    title: action.titulo === 'Programar defensa' ? `Programar ${typeLabel}` : action.titulo,
    actionLabel: action.titulo === 'Programar defensa' ? `Programar ${typeLabel}` : action.titulo,
  }
}

function hasActiveCurrentDefense({ defenses, orientation, currentStage }) {
  const tipoEvento = orientation?.tipo_evento
  if (!currentStage) return false
  return defenses.some((defense) => {
    const sameStage = defense.seguimiento_etapa && currentStage.id
      ? String(defense.seguimiento_etapa) === String(currentStage.id)
      : defense.etapa_codigo && currentStage.codigo
        ? defense.etapa_codigo === currentStage.codigo
        : false
    const sameAttempt = defense.numero_intento === undefined || currentStage.numero_intento === undefined
      || Number(defense.numero_intento) === Number(currentStage.numero_intento)
    const sameType = !tipoEvento || defense.tipo_evento === tipoEvento
    const cancelledReplacementEligible = defense.estado === 'CANCELADA'
      && defense.postulacion_modalidad_codigo !== 'PROYECTO_GRADO'
      && supportsCancelledDefenseRescheduling(defense)
    return defense.activo !== false && (defense.estado !== 'CANCELADA' || cancelledReplacementEligible) && sameType && sameStage && sameAttempt
  })
}

function getTribunalReviewState(stage, reports, currentFinalVersion, orientation, canManage) {
  const rows = Array.isArray(reports.data) ? reports.data : reports.data?.results || []
  const currentReport = rows.find((report) => report.activo !== false
    && String(report.version_documento_revisada) === String(currentFinalVersion?.id))
  const updateRequired = orientation?.siguiente_accion?.codigo === 'ACTUALIZAR_INFORME_TRIBUNAL'
  const stageEditable = ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado)
  return {
    reports,
    rows,
    currentReport,
    updateRequired,
    canRegister: canManage && stageEditable && !reports.loading && !reports.error && !currentReport && !updateRequired,
    canUpdate: canManage && stageEditable && currentReport && updateRequired,
  }
}

function TribunalReviewActions({ reviewState, orientation, evidenceVersions, canUpload, onRegister, onUpdate, onUploadEvidence }) {
  const { canRegister, canUpdate, currentReport, updateRequired } = reviewState
  const noEvidence = evidenceVersions.length === 0
  return <>
    {updateRequired && <div role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{orientation.mensaje}</p>
      {canUpdate && <Button className="mt-3" onClick={() => onUpdate(currentReport)}>Actualizar informe del tribunal</Button>}
    </div>}
    {noEvidence && <div role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Carga el Informe de Evaluación del Tribunal.</p>
      {canUpload && <Button className="mt-3" variant="secondary" onClick={onUploadEvidence}>Cargar Informe de Evaluación</Button>}
    </div>}
    {canRegister && <Button className="mt-4" onClick={onRegister}>Registrar informe del tribunal</Button>}
  </>
}

function TribunalReviewReports({ reviewState, versions, evidenceVersions, showOperations = true, orientation, canUpload, onRetry, onRegister, onUpdate, onUploadEvidence }) {
  const { reports, rows, currentReport, updateRequired, canRegister, canUpdate } = reviewState
  const versionById = new Map(versions.map((version) => [String(version.id), version]))
  return <Card id="informes-etapa" className="scroll-mt-24 overflow-hidden" aria-labelledby="revision-tribunal-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="revision-tribunal-title" className="text-xl font-bold">Revisión de Tribunal Previa</h2><p className="mt-1 text-sm text-slate-500">Informes del tribunal vinculados a versiones exactas del Documento Final.</p></div>
      {showOperations && canRegister && <Button onClick={onRegister}>Registrar informe del tribunal</Button>}
    </div>
    {showOperations && updateRequired && <div role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{orientation.mensaje}</p>
      {canUpdate && <Button className="mt-3" onClick={() => onUpdate(currentReport)}>Actualizar informe del tribunal</Button>}
    </div>}
    {showOperations && evidenceVersions.length === 0 && <div role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Carga el Informe de Evaluación del Tribunal.</p>
      {canUpload && <Button className="mt-3" variant="secondary" onClick={onUploadEvidence}>Cargar Informe de Evaluación</Button>}
    </div>}
    {reports.loading && <p role="status" className="mt-4 text-sm">Cargando informes del tribunal…</p>}
    {reports.error && <SectionError message={reports.error} label="Reintentar informes" onRetry={onRetry} />}
    {!reports.loading && !reports.error && rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No existen informes registrados para esta etapa.</p>}
    {!reports.loading && !reports.error && rows.length > 0 && <ol className="mt-5 space-y-4">{rows.map((report) => {
      const evidence = versionById.get(String(report.evidencia_version)) || { id: report.evidencia_version, nombre_original: report.evidencia_nombre_original }
      return <li key={report.id} className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{report.resultado_display || formatReportResult(report.resultado)}</h3><span className="rounded-full border px-2 py-1 text-xs font-semibold">{report.activo ? 'Activo' : 'Histórico'}</span></div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Documento Final revisado" value={`Versión ${report.numero_version_revisada ?? 'no registrada'}`} />
          <Info label="Evidencia" value={`${report.evidencia_nombre_original || evidence.nombre_original || 'No registrada'}${evidence.numero_version ? ` — Versión ${evidence.numero_version}` : ''}`} />
          <Info label="Fecha" value={formatDocumentDate(report.fecha_registro)} />
          <Info label="Registrado por" value={report.registrado_por_nombre || 'No registrado'} />
        </dl>
        <p className="mt-3 break-words text-sm"><span className="font-semibold">Observaciones:</span> {report.observaciones?.trim() || 'Sin observaciones'}</p>
        {evidence.id && <div className="mt-3"><DownloadVersionButton version={evidence} label="Descargar evidencia" /></div>}
      </li>
    })}</ol>}
  </Card>
}

function describeTribunalOrderGap(activeActors = []) {
  const composition = getActiveTribunalComposition(activeActors)
  if (composition.complete) return ''
  return `Tribunal incompleto: falta Tribunal ${composition.firstMissingOrder}.`
}

function friendlyTribunalCompletionError(errorMessage) {
  const normalized = String(errorMessage || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  const knownTribunalIncomplete = normalized.includes('revision tribunal previa')
    && normalized.includes('requiere tres tribunales activos distintos')
    && normalized.includes('con ordenes 1 2 y 3')
  if (!knownTribunalIncomplete) return errorMessage
  return 'Falta completar el tribunal. Para registrar el informe deben estar vigentes Tribunal 1, Tribunal 2 y Tribunal 3.'
}

function TribunalReportDialog({ report, finalVersion, evidenceVersions, canUpload, canManageAssignments, tribunalReviewStage, activeActors, activeTribunals, onRetryActiveTribunals, onDraftChange, onAssignMissing, onBackToReport, onSubmitMissing, onUploadEvidence, onSubmit, onClose }) {
  const updatingEvidence = report.view === 'UPDATE_EVIDENCE'
  const fieldMessage = (name) => {
    const value = report.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  const fieldError = (name) => fieldMessage(name) && <span role="alert" className="mt-1 block text-sm text-red-600">{fieldMessage(name)}</span>
  const generalMessage = friendlyTribunalCompletionError(report.error || '')
  const composition = activeTribunals.data ? getActiveTribunalComposition(activeTribunals.data) : null
  const tribunalOrientation = composition ? describeTribunalOrderGap(activeTribunals.data) : ''
  const missingOrder = report.view === 'ASSIGN_MISSING_TRIBUNAL' ? report.assignment.order : composition?.firstMissingOrder
  return <Modal title={updatingEvidence ? 'Actualizar informe del tribunal' : 'Registrar informe del tribunal'} onClose={onClose}>
    {report.view === 'ASSIGN_MISSING_TRIBUNAL' ? <section className="mt-4 grid gap-4">
      <div><h3 className="text-lg font-semibold">Asignar Tribunal {missingOrder}</h3><p className="mt-1 text-sm text-slate-500">Selecciona a la persona que ocupará Tribunal {missingOrder} para completar la conformación requerida.</p></div>
      <dl className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-3"><Info label="Tipo de participación" value="Tribunal" /><Info label="Etapa" value={tribunalReviewStage?.nombre || 'Revisión de Tribunal Previa'} /><Info label="Orden" value={`Tribunal ${missingOrder}`} /></dl>
      <ActorAssignmentForm assignment={report.assignment} stages={[tribunalReviewStage]} activeActors={activeActors} activeTribunals={activeTribunals} isProjectGrade fixedAssignment={{ tipo_participacion: 'TRIBUNAL', seguimiento_etapa: tribunalReviewStage.id, orden_cargo: missingOrder, observaciones: '' }} onSubmit={onSubmitMissing} onClose={onBackToReport} closeLabel="Volver al informe" />
    </section> :
    <form className="mt-4 grid gap-4" onSubmit={onSubmit} noValidate>
      <div><p className="text-sm text-slate-500">Versión del Documento Final revisada</p><p className="font-medium">{finalVersion ? `Documento Final — Versión ${finalVersion.numero_version}` : 'No existe una versión actual disponible'}</p>{fieldError('version_documento_revisada')}</div>
      {updatingEvidence
        ? <p className="rounded-lg border border-slate-200 p-3 text-sm">Resultado conservado: <strong>{formatReportResult(report.report.resultado)}</strong></p>
        : <label className="text-sm">Resultado<select name="resultado" value={report.draft.resultado} onChange={(event) => onDraftChange('resultado', event.target.value)} required disabled={report.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un resultado</option><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select>{fieldError('resultado')}</label>}
      <label className="text-sm">{updatingEvidence ? 'Evidencia vigente' : 'Evidencia'}<select name="evidencia_version" value={report.draft.evidencia_version} onChange={(event) => onDraftChange('evidencia_version', event.target.value)} required disabled={report.submitting || evidenceVersions.length === 0} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una evidencia</option>{evidenceVersions.map((version) => <option key={version.id} value={version.id}>{version.nombre_original || 'Archivo sin nombre'} — Versión {version.numero_version}</option>)}</select>{fieldError('evidencia_version')}</label>
      {evidenceVersions.length === 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950">
        <p role="status" className="text-sm font-medium text-amber-800 dark:text-amber-200">{updatingEvidence ? 'No hay una versión vigente disponible. Carga el Informe de Evaluación del Tribunal para actualizar el informe existente.' : 'Carga el Informe de Evaluación del Tribunal.'}</p>
        {canUpload && <Button type="button" className="mt-3" variant="secondary" disabled={report.submitting} onClick={onUploadEvidence}>Cargar Informe de Evaluación</Button>}
      </div>}
      {!updatingEvidence && <label className="text-sm">Observaciones {report.draft.resultado === 'INSUFICIENTE' ? '(obligatorias)' : '(opcionales)'}<textarea name="observaciones" value={report.draft.observaciones} onChange={(event) => onDraftChange('observaciones', event.target.value)} required={report.draft.resultado === 'INSUFICIENTE'} disabled={report.submitting} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" />{fieldError('observaciones')}</label>}
      {activeTribunals.loading && <p role="status" className="text-sm text-slate-500">Verificando composición del tribunal…</p>}
      {activeTribunals.error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:bg-red-950"><p role="alert" className="text-sm text-red-700 dark:text-red-200">{activeTribunals.error}</p><Button type="button" variant="secondary" className="mt-2" onClick={onRetryActiveTribunals}>Reintentar composición</Button></div>}
      {!activeTribunals.loading && !activeTribunals.error && tribunalOrientation && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{tribunalOrientation}</p>
        {canManageAssignments ? <Button type="button" className="mt-2" variant="secondary" onClick={() => onAssignMissing(missingOrder)}>Asignar Tribunal {missingOrder}</Button> : <a className="mt-2 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#actores">Ir a actores</a>}
      </div>}
      {report.error && <p role="alert" className="text-red-600">{generalMessage}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={report.submitting || !finalVersion || evidenceVersions.length === 0}>{report.submitting ? (updatingEvidence ? 'Actualizando…' : 'Registrando…') : updatingEvidence ? 'Actualizar informe' : 'Registrar informe'}</Button><Button type="button" variant="secondary" disabled={report.submitting} onClick={onClose}>Cancelar</Button></div>
    </form>}
  </Modal>
}

function formatReportResult(value) {
  if (value === 'SUFICIENTE') return 'Suficiente'
  if (value === 'INSUFICIENTE') return 'Insuficiente'
  return value || 'No registrado'
}

function AcademicDecisionsCard({ management, onAction, onMemorandumAction }) {
  const decisions = management?.decisiones || []
  const contextualMemorandum = management?.memorandum_designacion_contextual
  if (decisions.length === 0 && !contextualMemorandum) return null
  return <Card className="overflow-hidden" aria-labelledby="academic-decisions-title">
    <h2 id="academic-decisions-title" className="text-xl font-bold">Decisiones académicas</h2>
    <div className="mt-4 grid gap-3">{decisions.map((decision) => <section key={decision.codigo} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{decision.nombre}</h3><p className="mt-1 text-sm text-slate-500">{decision.cumplida ? `Resultado: ${formatCode(decision.resultado_actual)}` : 'Pendiente de registro'}</p></div><StatusBadge value={decision.estado} positive={decision.cumplida} compact /></div>
      {decision.bloqueo && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{decision.bloqueo.mensaje}</p>}
      {decision.acciones_permitidas?.includes('REGISTRAR') && <Button className="mt-3" onClick={() => onAction(decision)}>Registrar decisión</Button>}
      {decision.acciones_permitidas?.includes('REEMPLAZAR') && <Button className="mt-3" variant="secondary" onClick={() => onAction(decision)}>Reemplazar decisión</Button>}
    </section>)}
    {contextualMemorandum && <section className="rounded-lg border p-4"><h3 className="font-semibold">{contextualMemorandum.titulo || 'Memorándum oficial de designación'}</h3><p className="mt-1 text-sm text-slate-500">La publicación se gestiona junto con las asignaciones de actores, de forma independiente a la decisión académica.</p><Button className="mt-3" onClick={() => onMemorandumAction(contextualMemorandum)}>Gestionar actores</Button></section>}
    </div>
  </Card>
}

function AcademicDecisionDialog({ state, isProjectProfileAuthorization = false, onSubmit, onClose }) {
  const { decision } = state
  const allowedResults = decision.resultados_permitidos || []
  const confirmationResult = isProjectProfileAuthorization && allowedResults.includes('APROBADA')
    ? 'APROBADA'
    : null
  const [result, setResult] = useState(allowedResults[0] || '')
  const submittedResult = confirmationResult || result
  const submit = (event) => {
    event.preventDefault()
    const payload = {
      codigo: decision.codigo,
      resultado: submittedResult,
      observaciones: event.currentTarget.elements.observaciones.value.trim(),
      participantes: decision.participantes_disponibles.map(({ asignacion, rol, orden }) => ({ asignacion, rol, orden })),
    }
    if (decision.acciones_permitidas.includes('REEMPLAZAR')) payload.reemplaza_decision = decision.decision_actual.id
    onSubmit(payload)
  }
  const title = confirmationResult ? 'Confirmar autorización del perfil' : decision.nombre
  const submitLabel = confirmationResult
    ? 'Confirmar autorización'
    : decision.acciones_permitidas.includes('REEMPLAZAR') ? 'Reemplazar decisión' : 'Registrar decisión'
  return <Modal title={title} onClose={onClose}><div className="mt-3"><form className="grid gap-4" onSubmit={submit}>
    {!confirmationResult && <label className="text-sm">Resultado<select value={result} onChange={(event) => setResult(event.target.value)} disabled={state.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950">{allowedResults.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}</select></label>}
    <section><h3 className="text-sm font-semibold">Participantes</h3><ul className="mt-2 divide-y divide-slate-200 border-y border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700">{decision.participantes_disponibles.map((participant) => <li key={participant.asignacion} className="flex items-start justify-between gap-3 py-2">
      <span className="min-w-0 flex-1 py-1 font-medium [overflow-wrap:anywhere]">{participant.usuario_nombre}</span>
      <span className="max-w-[45%] shrink-0"><StatusBadge compact value={`${formatCode(participant.rol)}${participant.orden ? ` ${participant.orden}` : ''}`} /></span>
    </li>)}</ul></section>
    <label className="text-sm font-medium">Observaciones (opcional)<textarea name="observaciones" rows={3} disabled={state.submitting} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal dark:bg-slate-950" /></label>
    {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-700"><Button type="button" variant="secondary" disabled={state.submitting} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={state.submitting || !submittedResult}>{state.submitting ? 'Registrando…' : submitLabel}</Button></div>
  </form></div></Modal>
}

function MemorandumStatus({ memorandums, onRetry }) {
  const publications = memorandums?.data || []
  const current = publications.find((item) => item.vigente)
  if (memorandums?.loading) return <p role="status" className="mt-2 text-sm">Consultando memorándum…</p>
  if (memorandums?.error) return <div className="mt-2"><p role="alert" className="text-sm text-red-600">{memorandums.error}</p>{onRetry && <Button type="button" variant="secondary" className="mt-2" onClick={onRetry}>Reintentar consulta</Button>}</div>
  if (current) return <div className="mt-2 text-sm"><p>Documento publicado y vigente desde {formatDocumentDate(current.fecha_publicacion)}.</p><DownloadVersionButton version={current.version} /></div>
  if (publications.length > 0) return <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-300">Existe una publicación, pero el documento no está vigente.</p>
  return <p role="status" className="mt-2 text-sm text-slate-500">Pendiente de memorándum.</p>
}

function MemorandumStatusCard({ memorandums, onRetry }) {
  return <Card className="overflow-hidden" aria-labelledby="student-memorandum-title">
    <h2 id="student-memorandum-title" className="text-xl font-bold">Memorándum de designación de tribunales</h2>
    <MemorandumStatus memorandums={memorandums} onRetry={onRetry} />
  </Card>
}

function MemorandumPublicationSection({ postulacion, seguimientoEtapa, contract, memorandums, canPublish, disabled, hasPendingAssignments, onPublished, onPublishingChange, onRetry }) {
  const [file, setFile] = useState(null)
  const [publication, setPublication] = useState({ submitting: false, error: '', success: '' })
  const submittingRef = useRef(false)
  const publish = async () => {
    if (!file || !canPublish || disabled || submittingRef.current) return
    submittingRef.current = true
    onPublishingChange?.(true)
    setPublication({ submitting: true, error: '', success: '' })
    try {
      await postulacionesService.publicarMemorandumDesignacion(postulacion, seguimientoEtapa, file)
      setFile(null)
      setPublication({ submitting: false, error: '', success: 'Memorándum publicado correctamente.' })
      onPublished()
    } catch (requestError) {
      const fieldErrors = Object.values(requestError.fields || {}).flat().filter(Boolean)
      const errors = [...new Set([requestError.message, ...fieldErrors].filter(Boolean))]
      setPublication({ submitting: false, error: errors.join(' '), success: '' })
    } finally {
      submittingRef.current = false
      onPublishingChange?.(false)
    }
  }
  return <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="memorandum-designacion-title">
    <h3 id="memorandum-designacion-title" className="font-semibold">{contract.titulo || 'Memorándum oficial de designación'}</h3>
    <p className="mt-1 text-sm text-slate-500">La publicación del PDF es independiente del registro de la decisión académica.</p>
    <MemorandumStatus memorandums={memorandums} onRetry={onRetry} />
    {canPublish && hasPendingAssignments && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Guarda primero las asignaciones para publicar el memorándum.</p>}
    {canPublish && !hasPendingAssignments && <label className="mt-3 block text-sm">Archivo<input type="file" accept=".pdf,application/pdf" disabled={disabled || publication.submitting} onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border p-2 text-sm" /></label>}
    {!canPublish && <p className="mt-3 text-sm text-slate-500">La publicación está reservada al personal administrativo autorizado.</p>}
    {publication.error && <p role="alert" className="mt-2 text-sm text-red-600">{publication.error}</p>}
    {publication.success && <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{publication.success}</p>}
    {canPublish && !hasPendingAssignments && <Button type="button" className="mt-3" disabled={!file || disabled || publication.submitting} onClick={publish}>{publication.submitting ? 'Publicando…' : (memorandums?.data || []).some((item) => item.vigente) ? 'Publicar nueva versión' : 'Publicar memorándum'}</Button>}
  </section>
}

function ActorsCard({ active, historical, activePage, historicalPage, onActivePage, onHistoricalPage, onRetryActive, onRetryHistorical, canManage, management, memorandumContract, memorandums, onRetryMemorandums, onManage }) {
  const positions = management?.posiciones || []
  const occupiedCount = positions.filter((position) => position.estado_ocupacion === 'ASIGNADA').length
  const activeCount = active.data?.count || 0
  return (
    <Card className="overflow-hidden" aria-labelledby="actores-title">
      <h2 id="actores-title" className="text-xl font-bold">Gestión de actores</h2>
      <p className="mt-1 text-sm text-slate-500">{positions.length > 0
        ? `${occupiedCount} de ${positions.length} posiciones ocupadas`
        : `${activeCount} actores vigentes`}</p>
      {canManage && <Button className="mt-3" onClick={onManage}>Gestionar actores</Button>}
      {memorandumContract && <section className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="memorandum-vigente-title">
        <h3 id="memorandum-vigente-title" className="font-semibold">{memorandumContract.titulo || 'Memorándum oficial de designación'}</h3>
        <MemorandumStatus memorandums={memorandums} onRetry={onRetryMemorandums} />
      </section>}
      {false && <details className="mt-4 overflow-hidden rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Información institucional</summary>
        <aside aria-label="Advertencias sobre las asignaciones" className="border-t border-amber-300 p-4 text-sm">
          <p>La asignación registrada en el sistema no sustituye un memorando o acto formal de designación institucional.</p>
          <p className="mt-2">Una participación anterior representa una participación finalizada y no una función vigente.</p>
        </aside>
      </details>}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ActorGroup title="Participación actual" stateLabel="Vigente" actors={active} page={activePage} onPage={onActivePage} onRetry={onRetryActive} empty="No hay participaciones vigentes registradas." />
        <ActorGroup title="Participaciones anteriores" stateLabel="Anterior" actors={historical} page={historicalPage} onPage={onHistoricalPage} onRetry={onRetryHistorical} empty="No hay participaciones anteriores registradas." />
      </div>
    </Card>
  )
}

function ActorManagementDialog({ state, postulacion, management, selectionPresentation, stageName, memorandumContract, memorandumSeguimientoEtapa, memorandums, canPublishMemorandum, onMemorandumPublished, onRetryMemorandums, onSubmit, onFinalize, onClose }) {
  const positions = management?.posiciones || []
  const [candidateStatuses, setCandidateStatuses] = useState({})
  const [selections, setSelections] = useState({})
  const [candidateRevision, setCandidateRevision] = useState(0)
  const [finishPosition, setFinishPosition] = useState(null)
  const [finishObservations, setFinishObservations] = useState('')
  const [finishError, setFinishError] = useState('')
  const [memorandumSubmitting, setMemorandumSubmitting] = useState(false)
  const reportCandidateStatus = useCallback((positionKey, status) => {
    setCandidateStatuses((current) => {
      const previous = current[positionKey]
      if (previous?.loading === status.loading && previous?.error === status.error
        && previous?.invalidSelection === status.invalidSelection) return current
      return { ...current, [positionKey]: status }
    })
  }, [])

  const assignedSelections = Object.fromEntries(positions
    .filter((position) => position.estado_ocupacion === 'ASIGNADA')
    .map((position) => [position.clave, { candidateId: position.asignacion_actual_detalle?.usuario?.id }]))
  const draftConflicts = findIdentityDraftConflicts(positions, selections, selectionPresentation)
  const draftError = draftConflicts.length > 0
    ? `La misma persona está seleccionada en ${draftConflicts[0][0].position.nombre} y ${draftConflicts[0][1].position.nombre}. Cambia una selección antes de guardar.`
    : ''
  const jobs = (draftConflicts.length > 0 ? [] : positions).flatMap((position) => {
    const result = state.results?.[position.clave]
    const action = position.estado_ocupacion === 'ASIGNADA' ? 'REEMPLAZAR' : 'ASIGNAR'
    const selected = selections[position.clave]
    if (!selected?.candidateId || result?.state === 'SUCCESS' || position.habilitada === false
      || selected.eligible === false || selected.selectable === false || candidateStatuses[position.clave]?.invalidSelection
      || findConflictingDraft(position, selected.candidateId, positions.filter((other) => positionsShareTribunalContext(position, other) || isPreventiveActorConflict(position, other, selectionPresentation)), assignedSelections, selectionPresentation)
      || !position.acciones_permitidas?.includes(action)) return []
    const payload = {
      usuario: Number(selected.candidateId),
      tipo_participacion: position.tipo_participacion,
      observaciones: '',
    }
    if (position.orden_cargo !== null && position.orden_cargo !== undefined) {
      payload.orden_cargo = Number(position.orden_cargo)
    }
    if (position.ambito === 'ETAPA' && position.seguimiento_etapa != null) {
      payload.seguimiento_etapa = Number(position.seguimiento_etapa)
    }
    return [{ action, position, payload }]
  })
  const hasFailures = Object.values(state.results || {}).some((result) => result.state === 'ERROR')
  const candidatesBusy = jobs.some(({ position }) => candidateStatuses[position.clave]?.loading || candidateStatuses[position.clave]?.error)
  const hasPendingAssignments = Object.values(selections).some((selection) => Boolean(selection?.candidateId))
  const hasMemorandumSection = Boolean(memorandumContract)

  const saveAssignments = async (event) => {
    event.preventDefault()
    if (state.submitting || candidatesBusy || jobs.length === 0) return
    const outcomes = await onSubmit(jobs)
    setSelections((current) => {
      const next = { ...current }
      jobs.forEach((job) => {
        if (outcomes?.[job.position.clave] === 'SUCCESS') delete next[job.position.clave]
      })
      return next
    })
    if (Object.keys(outcomes || {}).length > 0) setCandidateRevision((current) => current + 1)
  }

  const finalize = async (position) => {
    if (state.submitting) return
    const outcomes = await onFinalize(position, finishObservations.trim())
    if (outcomes?.[position.clave] === 'SUCCESS') {
      setFinishPosition(null)
      setFinishObservations('')
      setFinishError('')
    } else {
      setFinishError(outcomes?.[position.clave]?.message || 'No se pudo finalizar la asignación.')
    }
  }

  const modalTitle = stageName ? `Gestionar actores — ${stageName}` : 'Gestionar actores'
  const close = state.submitting || memorandumSubmitting ? () => {} : onClose
  return <Modal title={modalTitle} onClose={close}>
    <form className="mt-4 grid gap-4" onSubmit={saveAssignments} noValidate>
      {management?.contexto?.codigo_etapa && <p className="text-sm text-slate-500">Etapa: {management.contexto.codigo_etapa}</p>}
      {positions.length === 0 && <p role="status" className="text-sm text-slate-500">No hay posiciones de actores declaradas para este contexto.</p>}
      <div className="grid gap-3">
        {positions.map((position) => {
          const result = state.results?.[position.clave]
          const assigned = position.estado_ocupacion === 'ASIGNADA'
          const actions = position.acciones_permitidas || []
          const canAssign = !assigned && position.habilitada !== false && actions.includes('ASIGNAR')
          const canReplace = assigned && position.habilitada !== false && actions.includes('REEMPLAZAR')
          const showSelector = (canAssign || canReplace) && result?.state !== 'SUCCESS'
          const detail = position.asignacion_actual_detalle
          const currentPerson = detail?.usuario?.nombre || 'Persona asignada'
          const blocked = position.habilitada === false || Boolean(position.bloqueo)
          return <section key={position.clave} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="font-semibold">{position.nombre}{position.obligatoriedad ? ' *' : ''}</h3>
                <p className="mt-1 text-sm text-slate-500">{position.ambito}{position.orden_cargo != null ? ` · Orden ${position.orden_cargo}` : ''}</p>
              </div>
              <StatusBadge value={blocked && !assigned ? 'BLOQUEADA' : position.estado_ocupacion} positive={assigned} compact />
            </div>
            {assigned && <p className="mt-3 text-sm">Asignada a <strong>{currentPerson}</strong></p>}
            {position.bloqueo?.mensaje && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{position.bloqueo.mensaje}</p>}
            {showSelector && <EligibleActorCandidates
              postulacion={postulacion}
              position={position}
              positions={positions}
              drafts={selections}
              assignedSelections={assignedSelections}
              selectionPresentation={selectionPresentation}
              candidateRevision={candidateRevision}
              action={canReplace ? 'REEMPLAZAR' : 'ASIGNAR'}
              selected={selections[position.clave] || null}
              disabled={state.submitting}
              onSelect={(candidate) => {
                setSelections((current) => {
                  const next = { ...current }
                  if (candidate) {
                    next[position.clave] = {
                      candidateId: String(candidate.id),
                      label: candidate.nombre_completo || candidate.username,
                      eligible: candidate.elegible !== false,
                      selectable: candidate.preventiveSelectionAllowed !== false,
                      positionKey: position.clave,
                    }
                  } else {
                    delete next[position.clave]
                  }
                  return next
                })
              }}
              onStatusChange={reportCandidateStatus}
            />}
            {result?.state === 'SUCCESS' && <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Guardado</p>}
            {result?.state === 'ERROR' && <p role="alert" className="mt-2 text-sm text-red-600">{result.message}</p>}
            {assigned && actions.includes('FINALIZAR') && result?.state !== 'SUCCESS' && <div className="mt-3">
              {finishPosition === position.clave ? <div className="grid gap-3">
                <label className="text-sm">Motivo u observación<textarea value={finishObservations} onChange={(event) => setFinishObservations(event.target.value)} disabled={state.submitting} className="mt-1 min-h-20 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
                {finishError && <p role="alert" className="text-sm text-red-600">{finishError}</p>}
                <div className="flex gap-3"><Button type="button" disabled={state.submitting} onClick={() => finalize(position)}>Confirmar finalización</Button><Button type="button" variant="secondary" disabled={state.submitting} onClick={() => { setFinishPosition(null); setFinishError('') }}>Cancelar</Button></div>
              </div> : <Button type="button" variant="secondary" disabled={state.submitting} onClick={() => { setFinishPosition(position.clave); setFinishObservations(''); setFinishError('') }}>Finalizar asignación</Button>}
            </div>}
          </section>
        })}
      </div>
      {draftError && <p role="alert" className="text-sm text-red-600">{draftError}</p>}
      {hasMemorandumSection && <div className="flex flex-wrap gap-3">
        {jobs.length > 0 && <Button type="submit" disabled={state.submitting || candidatesBusy}>{state.submitting ? 'Guardando…' : hasFailures ? 'Reintentar pendientes' : 'Guardar asignaciones'}</Button>}
      </div>}
      {hasMemorandumSection && <MemorandumPublicationSection
        postulacion={postulacion}
        seguimientoEtapa={memorandumSeguimientoEtapa}
        contract={memorandumContract}
        memorandums={memorandums}
        canPublish={canPublishMemorandum}
        disabled={state.submitting || memorandumSubmitting}
        hasPendingAssignments={hasPendingAssignments}
        onPublished={onMemorandumPublished}
        onPublishingChange={setMemorandumSubmitting}
        onRetry={onRetryMemorandums}
      />}
      <div className="flex flex-wrap gap-3">
        {!hasMemorandumSection && jobs.length > 0 && <Button type="submit" disabled={state.submitting || candidatesBusy}>{state.submitting ? 'Guardando…' : hasFailures ? 'Reintentar pendientes' : 'Guardar asignaciones'}</Button>}
        <Button type="button" variant="secondary" disabled={state.submitting || memorandumSubmitting} onClick={close}>Cerrar</Button>
      </div>
    </form>
  </Modal>
}

function hasUniqueIdentityRestriction(position) {
  const restriction = position.restriccion_identidad
  return restriction?.unica_persona === true && typeof restriction.grupo === 'string' && restriction.grupo.trim() !== ''
}

function restrictionsShareIdentityGroup(first, second) {
  return hasUniqueIdentityRestriction(first)
    && hasUniqueIdentityRestriction(second)
    && first.restriccion_identidad.grupo === second.restriccion_identidad.grupo
}

function positionsShareTribunalContext(first, second) {
  return first.tipo_participacion === 'TRIBUNAL' && second.tipo_participacion === 'TRIBUNAL'
    && first.ambito === second.ambito
    && ((first.ambito === 'ETAPA' && first.seguimiento_etapa != null && second.seguimiento_etapa != null
      && String(first.seguimiento_etapa) === String(second.seguimiento_etapa))
      || (first.ambito === 'POSTULACION' && first.seguimiento_etapa === null && second.seguimiento_etapa === null))
}

function isPreventiveActorConflict(position, other, presentation) {
  if (presentation?.preventOccupiedDirectedSecretary && position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1'
    && position.tipo_participacion === 'DOCENTE_MODALIDAD' && position.ambito === 'ETAPA'
    && String(position.seguimiento_etapa) === String(presentation.seguimientoEtapa)) {
    return (other.clave === 'TUTOR_TRABAJO_DIRIGIDO_1' && other.tipo_participacion === 'TUTOR'
      && other.ambito === 'POSTULACION' && other.seguimiento_etapa === null)
      || (other.tipo_participacion === 'TRIBUNAL' && /^TRIBUNAL_PROPUESTA_TD_[123]$/.test(other.clave)
        && other.ambito === 'ETAPA' && presentation.profileSeguimiento != null
        && String(other.seguimiento_etapa) === String(presentation.profileSeguimiento))
  }
  return presentation?.preventTribunalForTutor === true
    && position.clave === 'TUTOR_TRABAJO_DIRIGIDO_1'
    && position.tipo_participacion === 'TUTOR' && position.ambito === 'POSTULACION'
    && position.seguimiento_etapa === null
    && other.tipo_participacion === 'TRIBUNAL' && other.ambito === 'ETAPA'
    && other.seguimiento_etapa != null
}

function positionsHaveIdentityConflict(first, second, selectionPresentation) {
  const blocksOccupation = (position, other) => {
    const rule = position.ocupacion_actor
    return rule?.aplica === true
      && (!rule.relevantes?.length || rule.relevantes.includes(other.tipo_participacion))
  }
  return selectionPresentation?.blockOtherPositions === true
    || positionsShareTribunalContext(first, second)
    || isPreventiveActorConflict(first, second, selectionPresentation)
    || restrictionsShareIdentityGroup(first, second)
    || blocksOccupation(first, second)
    || blocksOccupation(second, first)
}

function findSelectedDraft(position, candidateId, positions, drafts) {
  if (!candidateId) return null
  return positions.find((otherPosition) => (
    otherPosition.clave !== position.clave
    && String(drafts[otherPosition.clave]?.candidateId || '') === String(candidateId)
  )) || null
}

function findConflictingDraft(position, candidateId, positions, drafts, selectionPresentation) {
  if (!candidateId) return null
  if (((selectionPresentation?.preventTribunalForTutor && position.clave === 'TUTOR_TRABAJO_DIRIGIDO_1')
    || (selectionPresentation?.preventOccupiedDirectedSecretary && position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1'))
    && String(position.asignacion_actual_detalle?.usuario?.id) === String(candidateId)) return null
  return positions.find((otherPosition) => (
    otherPosition.clave !== position.clave
    && positionsHaveIdentityConflict(position, otherPosition, selectionPresentation)
    && String(drafts[otherPosition.clave]?.candidateId || '') === String(candidateId)
  )) || null
}

function findIdentityDraftConflicts(positions, drafts, selectionPresentation) {
  const conflicts = []
  positions.forEach((position, index) => {
    const draft = drafts[position.clave]
    if (!draft?.candidateId) return
    positions.slice(index + 1).forEach((otherPosition) => {
      if ((positionsHaveIdentityConflict(position, otherPosition, selectionPresentation)
        || positionsHaveIdentityConflict(otherPosition, position, selectionPresentation))
        && String(drafts[otherPosition.clave]?.candidateId || '') === String(draft.candidateId)) {
        conflicts.push([{ position, draft }, { position: otherPosition, draft: drafts[otherPosition.clave] }])
      }
    })
  })
  return conflicts
}

function privateSecretaryAvailability(candidate, postulacion, position, presentation, action) {
  const directed = presentation?.preventOccupiedDirectedSecretary === true
    && position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1'
  if (!directed && (!presentation?.preventOccupiedPrivateSecretary || action !== 'ASIGNAR'
    || position.clave !== 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1')) return 'NOT_APPLICABLE'
  if (directed && String(position.asignacion_actual_detalle?.usuario?.id) === String(candidate.id)) return 'NOT_APPLICABLE'
  if (position.tipo_participacion !== 'DOCENTE_MODALIDAD' || !Array.isArray(candidate.asignaciones_vigentes_detalle)
    || (directed ? position.ambito !== 'ETAPA' || presentation.profileSeguimiento == null
      || String(position.seguimiento_etapa) !== String(presentation.seguimientoEtapa)
      : position.ambito !== 'POSTULACION' || position.seguimiento_etapa !== null)) return 'UNKNOWN'
  const details = candidate.asignaciones_vigentes_detalle
  const ids = new Set()
  let occupied = false
  for (const item of details) {
    if (!item || !Number.isInteger(item.id) || item.id <= 0 || !Number.isInteger(item.postulacion)
      || typeof item.activo !== 'boolean' || String(item.usuario) !== String(candidate.id)) return 'UNKNOWN'
    if (!item.activo || String(item.postulacion) !== String(postulacion)) continue
    if (ids.has(item.id) || typeof item.codigo_posicion !== 'string' || !item.codigo_posicion.trim()
      || typeof item.tipo_participacion !== 'string' || !item.tipo_participacion
      || !['POSTULACION', 'ETAPA'].includes(item.ambito)
      || (item.ambito === 'POSTULACION' ? item.seguimiento_etapa !== null : !Number.isInteger(item.seguimiento_etapa))) return 'UNKNOWN'
    ids.add(item.id)
    if (!directed || (item.tipo_participacion === 'TUTOR' && item.codigo_posicion === 'TUTOR_TRABAJO_DIRIGIDO_1'
      && item.ambito === 'POSTULACION' && item.seguimiento_etapa === null)
      || (item.tipo_participacion === 'TRIBUNAL' && /^TRIBUNAL_PROPUESTA_TD_[123]$/.test(item.codigo_posicion)
        && item.ambito === 'ETAPA' && String(item.seguimiento_etapa) === String(presentation.profileSeguimiento))) occupied = true
  }
  return occupied ? 'OCCUPIED' : candidate.elegible === true ? 'AVAILABLE' : 'UNKNOWN'
}

function EligibleActorCandidates({ postulacion, position, positions, drafts, assignedSelections, selectionPresentation, candidateRevision, action, selected, disabled, onSelect, onStatusChange }) {
  const [knownEligibility, setKnownEligibility] = useState({})
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [candidates, setCandidates] = useState({ data: null, loading: true, error: '' })
  const rows = (candidates.data?.results || []).map((candidate) => ({ ...candidate,
    preventiveSelectionAllowed: ['AVAILABLE', 'NOT_APPLICABLE'].includes(privateSecretaryAvailability(candidate, postulacion, position, selectionPresentation, action)),
  }))
  const unknownOccupation = rows.some((candidate) => privateSecretaryAvailability(candidate, postulacion, position, selectionPresentation, action) === 'UNKNOWN')
  const invalidSelection = selected?.eligible === false || selected?.selectable === false
    || knownEligibility[selected?.candidateId] === false
    || rows.some((candidate) => String(candidate.id) === String(selected?.candidateId) && candidate.elegible === false)
  const visibleRows = selected && !rows.some((candidate) => String(candidate.id) === String(selected.candidateId))
    ? [...rows, { id: selected.candidateId, nombre_completo: selected.label, elegible: selected.eligible }]
    : rows

  useEffect(() => {
    const controller = new AbortController()
    setCandidates((current) => ({ ...current, loading: true, error: '' }))
    postulacionesService.obtenerCandidatosElegibles(postulacion, {
      posicion: position.clave,
      accion: action,
      search,
      ordering: 'apellido_paterno',
      page,
      page_size: 20,
    }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setKnownEligibility((current) => {
            const next = { ...current }
            for (const candidate of data?.results || []) {
              const availability = privateSecretaryAvailability(candidate, postulacion, position, selectionPresentation, action)
              if (typeof candidate.elegible === 'boolean' || availability !== 'NOT_APPLICABLE') {
                next[candidate.id] = candidate.elegible !== false && ['AVAILABLE', 'NOT_APPLICABLE'].includes(availability)
              }
            }
            return next
          })
          setCandidates({ data, loading: false, error: '' })
        }
      })
      .catch((requestError) => {
        if (!requestError.canceled && !controller.signal.aborted) {
          setCandidates({ data: null, loading: false, error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [postulacion, position, selectionPresentation, action, search, page, revision, candidateRevision])

  useEffect(() => {
    onStatusChange(position.clave, { loading: candidates.loading, error: candidates.error, invalidSelection })
  }, [position.clave, candidates.loading, candidates.error, invalidSelection, onStatusChange])

  return <div className="mt-3 grid gap-2">
    <label className="text-sm">Buscar candidato para {position.nombre}
      <input value={query} onChange={(event) => setQuery(event.target.value)} disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />
    </label>
    <Button type="button" variant="secondary" className="justify-self-start" disabled={disabled} onClick={() => { setSearch(query.trim()); setPage(1) }}>Buscar</Button>
    {candidates.loading && <p role="status">Cargando candidatos elegibles…</p>}
    {!candidates.loading && unknownOccupation && <p role="status">No se pudieron verificar las ocupaciones de algunos candidatos. Esas opciones no pueden guardarse; vuelve a consultar los candidatos.</p>}
    {candidates.error && <div><p role="alert" className="text-red-600">{candidates.error}</p><Button type="button" variant="secondary" disabled={disabled} onClick={() => setRevision((value) => value + 1)}>Reintentar candidatos</Button></div>}
    {!candidates.loading && !candidates.error && <>
      <label className="text-sm">{action === 'REEMPLAZAR' ? 'Seleccionar reemplazo' : 'Seleccionar candidato'}
        <select aria-label={`${action === 'REEMPLAZAR' ? 'Seleccionar reemplazo para' : 'Seleccionar candidato para'} ${position.nombre}`} value={selected?.candidateId || ''} disabled={disabled || visibleRows.length === 0} onChange={(event) => onSelect(visibleRows.find((candidate) => String(candidate.id) === event.target.value) || null)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950">
          <option value="">Seleccione una persona</option>
          {visibleRows.map((candidate) => {
            const selectedDraft = findSelectedDraft(position, candidate.id, positions, drafts)
            const conflict = findConflictingDraft(position, candidate.id, positions, drafts, selectionPresentation)
            const assignedPosition = findConflictingDraft(position, candidate.id, positions.filter((other) => (
              selectionPresentation?.blockOtherPositions || positionsShareTribunalContext(position, other)
              || isPreventiveActorConflict(position, other, selectionPresentation)
            )), assignedSelections, selectionPresentation)
            const label = candidate.nombre_completo || candidate.username || candidate.label
            const role = candidate.rol_nombre || candidate.rol_codigo
            const identifier = candidate.codigo || candidate.username
            const backendAssignmentLabels = Array.isArray(candidate.asignaciones_vigentes) && candidate.asignaciones_vigentes.length > 0
              ? candidate.asignaciones_vigentes
              : []
            const activeAssignmentLabels = assignedPosition
              ? [...new Set([...backendAssignmentLabels, assignedPosition.nombre])]
              : backendAssignmentLabels
            const disabled = candidate.elegible === false || candidate.preventiveSelectionAllowed === false || knownEligibility[candidate.id] === false || Boolean(conflict) || Boolean(assignedPosition)
            return <option key={candidate.id} value={candidate.id} disabled={disabled}>
              {label}{role ? ` — ${role}` : ''}{identifier ? ` · ${identifier}` : ''}{activeAssignmentLabels.length > 0 ? ` · Asignación vigente: ${activeAssignmentLabels.join(', ')}` : ''}{selectedDraft || assignedPosition ? ` — Seleccionado como ${(selectedDraft || assignedPosition).nombre}` : ''}
            </option>
          })}
        </select>
      </label>
      {visibleRows.length === 0 && <p role="status" className="text-sm text-slate-500">No se encontraron candidatos elegibles.</p>}
      {candidates.data && <Pagination count={candidates.data.count || 0} page={page} hasNext={Boolean(candidates.data.next)} hasPrevious={Boolean(candidates.data.previous)} onPage={setPage} />}
    </>}
  </div>
}

function ActorGroup({ title, stateLabel, actors, page, onPage, onRetry, empty }) {
  const rows = actors.data?.results || []
  const slug = stateLabel === 'Vigente' ? 'vigentes' : 'historicas'
  return <section aria-labelledby={`actores-${slug}`} className="min-w-0 rounded-lg border border-slate-200 dark:border-slate-700">
    <h3 id={`actores-${slug}`} className="p-4 text-lg font-semibold">{title}</h3>
    {actors.loading && <p role="status" className="px-4 pb-4 text-sm">Cargando {title.toLowerCase()}…</p>}
    {actors.error && <div className="px-4 pb-4"><SectionError message={actors.error} label={`Reintentar ${title.toLowerCase()}`} onRetry={onRetry} /></div>}
    {!actors.loading && !actors.error && rows.length === 0 && <p className="px-4 pb-4 text-sm text-slate-500">{empty}</p>}
    {!actors.loading && !actors.error && rows.length > 0 && <>
      <ul className="space-y-3 px-4 pb-4">{rows.map((actor) => <ActorItem key={actor.id} actor={actor} stateLabel={stateLabel} />)}</ul>
      <Pagination count={actors.data.count} page={page} hasNext={Boolean(actors.data.next)} hasPrevious={Boolean(actors.data.previous)} onPage={onPage} />
    </>}
  </section>
}

function ActorItem({ actor, stateLabel }) {
  const order = actor.orden_cargo === null || actor.orden_cargo === undefined ? null : actor.orden_cargo
  return <li className="min-w-0 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
    <div className="grid items-start gap-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1.5fr)_minmax(8rem,1fr)]">
      <div className="min-w-0"><p className="text-xs text-slate-500">{actor.tipo_participacion_display || actor.tipo_participacion_nombre || 'Tipo no registrado'}{order !== null ? ` ${order}` : ''}</p><h4 className="mt-1 break-words font-semibold">{actor.usuario_nombre || 'Usuario no disponible'}</h4></div>
      <div><p className="text-xs text-slate-500">Designado desde</p><p className="mt-1 break-words font-medium">{actor.etapa_nombre || 'Sin etapa asociada'}</p></div>
      <div><p className="text-xs text-slate-500">Estado</p><p className="mt-1 break-words font-medium">{stateLabel}</p></div>
    </div>
    <dl className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
      <Info label="Fecha de inicio" value={formatActorDate(actor.fecha_inicio || actor.fecha_designacion)} />
      {stateLabel === 'Anterior' && <Info label="Fecha de finalización" value={formatActorDate(actor.fecha_fin || actor.fecha_finalizacion, 'No registrada')} />}
    </dl>
    <div className="mt-4"><p className="text-sm text-slate-500">Observaciones</p><p className="mt-1 break-words font-medium">{actor.observaciones?.trim() || 'Sin observaciones'}</p></div>
  </li>
}

const ASSIGNMENT_TYPES = [
  ['TUTOR', 'Tutor'],
  ['TRIBUNAL', 'Tribunal'],
  ['DOCENTE_MODALIDAD', 'Docente de modalidad'],
  ['PRESIDENTE', 'Presidente'],
  ['SECRETARIO', 'Secretario'],
  ['DIRECTOR_INSTITUTO_INVESTIGACION', 'Director del Instituto de Investigación'],
  ['VICERRECTOR_POSGRADO', 'Vicerrector de Posgrado'],
  ['DECANO_FACULTAD', 'Decano de Facultad'],
  ['DIRECTOR_CARRERA', 'Director de Carrera'],
  ['SUPERVISOR_INSTITUCIONAL', 'Supervisor institucional'],
]

const PUBLIC_DEFENSE_AUTHORITY_ROLES = ['PRESIDENTE', 'SECRETARIO']
const assignmentTypeLabel = (role) => ASSIGNMENT_TYPES.find(([value]) => value === role)?.[1] || formatCode(role)

function getActiveAssignmentLabels(userId, activeActors) {
  return activeActors
    .filter((actor) => actor.activo !== false && String(actor.usuario) === String(userId))
    .map((actor) => {
      const label = assignmentTypeLabel(actor.tipo_participacion)
      return actor.tipo_participacion === 'TRIBUNAL' && actor.orden_cargo ? `${label} ${actor.orden_cargo}` : label
    })
}

function getMissingPublicDefenseRoles(orientation) {
  const structuredRequirements = (orientation?.requisitos || [])
    .filter((item) => PUBLIC_DEFENSE_AUTHORITY_ROLES.includes(item.codigo))
  if (structuredRequirements.length > 0) {
    return PUBLIC_DEFENSE_AUTHORITY_ROLES.filter((role) => (
      structuredRequirements.some((item) => item.codigo === role && item.cumplido === false)
    ))
  }
  const contractText = [orientation?.mensaje, orientation?.siguiente_accion?.titulo, orientation?.siguiente_accion?.descripcion,
    ...(orientation?.requisitos || []).flatMap((item) => [item.codigo, item.nombre, item.estado_display])].filter(Boolean).join(' ')
  return PUBLIC_DEFENSE_AUTHORITY_ROLES.filter((role) => new RegExp(`\\b${role}\\b`).test(contractText))
}

function getThesisConclusionOrientation({ publicStage, concluded, resultado, documents, defenses }) {
  if (!publicStage || publicStage.estado !== 'APROBADA' || concluded || documents.loading || defenses.loading || documents.error || defenses.error) return null

  const result = resultado?.data
  const resultApproved = result?.nota_final != null && result?.clasificacion && result.clasificacion !== 'POSTERGADO'
  if (!resultApproved) return null

  const documentRows = documents.data?.results || []
  const defenseRows = defenses.data?.results || []
  const acta = documentRows.find((document) => document.activo !== false && document.tipo_documento_codigo === 'ACTA_DEFENSA')
  const currentPublicDefense = defenseRows.find((defense) => String(defense.seguimiento_etapa) === String(publicStage.id)
    && defense.tipo_evento === 'DEFENSA_PUBLICA' && defense.estado === 'FINALIZADA' && defense.activo !== false)
  const currentVersion = acta?.versiones?.some((version) => version.activo !== false && version.es_version_actual)
  const validActa = Boolean(acta && acta.estado_codigo === 'APR' && !acta.requiere_correccion && currentVersion
    && currentPublicDefense && String(acta.evento_defensa) === String(currentPublicDefense.id))
  const requirements = [
    { tipo: 'ACADEMICO', codigo: 'DEFENSA_PUBLICA_APROBADA', nombre: 'Defensa Pública aprobada', cumplido: true, estado: 'CUMPLIDO', estado_display: 'Cumplido', destino: '#resumen' },
    { tipo: 'ACADEMICO', codigo: 'RESULTADO_FINAL_APROBATORIO', nombre: `Resultado final aprobatorio (${result.nota_final}/100)`, cumplido: true, estado: 'CUMPLIDO', estado_display: 'Cumplido', destino: '#resumen' },
    { tipo: 'DOCUMENTO', codigo: 'ACTA_DEFENSA_VIGENTE', nombre: 'Acta de Defensa vigente vinculada', cumplido: validActa, estado: validActa ? 'CUMPLIDO' : 'PENDIENTE', estado_display: validActa ? 'Cumplido' : 'Pendiente', destino: validActa ? null : '#documentos' },
  ]

  let action
  if (validActa) {
    action = { codigo: 'CONCLUIR_ACADEMICAMENTE', titulo: 'Concluir académicamente', descripcion: 'La Defensa Pública, el resultado final y el Acta de Defensa cumplen las precondiciones. El backend realizará la validación definitiva.', estado: 'DISPONIBLE', estado_display: 'Disponible', destino: '#resumen', accion_label: 'Ir a concluir académicamente' }
  } else if (acta) {
    action = { codigo: 'COMPLETAR_ACTA_DEFENSA', titulo: 'Completar Acta de Defensa', descripcion: 'La Defensa Pública está aprobada. El Acta de Defensa registrada todavía debe quedar vigente, aprobada y correctamente vinculada para concluir académicamente.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Ir a documentos' }
  } else {
    action = { codigo: 'CARGAR_ACTA_DEFENSA', titulo: 'Cargar Acta de Defensa', descripcion: 'La Defensa Pública está aprobada. Para concluir académicamente el expediente debes cargar y vincular el Acta de Defensa vigente.', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#documentos', accion_label: 'Ir a documentos' }
  }
  return { operacion: 'ORIENTAR_CONCLUSION_ACADEMICA', mensaje: 'Completa las precondiciones posteriores al macroflujo para concluir académicamente el expediente.', requisitos: requirements, siguiente_accion: action, conflictos_identidad: [], actaValida: validActa }
}

function PublicAuthoritiesDialog({ assignment, postulacion, stage, orientation, blockOccupiedCandidates = false, allowIdentityReuse = false, authoritiesAcrossStages = false, onSelectCandidate, onSubmit, onClose }) {
  useEffect(() => {
    const opener = document.activeElement
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidatePage, setCandidatePage] = useState(1)
  const [candidateRevision, setCandidateRevision] = useState(0)
  const [candidates, setCandidates] = useState({ data: null, loading: true, error: '' })
  const [existingAuthorityRevision, setExistingAuthorityRevision] = useState(0)
  const [existingAuthorities, setExistingAuthorities] = useState({ data: null, loading: true, error: '' })
  const selections = assignment.selections || {}
  const [validationError, setValidationError] = useState('')
  const roles = ['PRESIDENTE', 'SECRETARIO']
  const roleRequirements = new Map((orientation?.requisitos || [])
    .filter((item) => roles.includes(item.codigo))
    .map((item) => [item.codigo, item]))
  const roleRows = roles.filter((role) => roleRequirements.has(role))
  const candidateRows = candidates.data?.results || []
  const activeAssignmentRows = existingAuthorities.data || []
  const successfulCount = roles.filter((role) => assignment.results?.[role]?.state === 'SUCCESS').length
  const roleAssignments = (role) => (existingAuthorities.data || []).filter((actor) => (
    actor.activo !== false
    && actor.tipo_participacion === role
    && (authoritiesAcrossStages || !actor.seguimiento_etapa || String(actor.seguimiento_etapa) === String(stage?.id))
  ))
  const roleIsAssigned = (role) => roleRequirements.get(role)?.cumplido === true
    || roleAssignments(role).length > 0
    || assignment.results?.[role]?.state === 'SUCCESS'
  const pendingRoles = roleRows.filter((role) => (
    roleRequirements.get(role)?.cumplido === false
    && !roleAssignments(role).length
    && assignment.results?.[role]?.state !== 'SUCCESS'
  ))

  useEffect(() => {
    const controller = new AbortController()
    setCandidates({ data: null, loading: true, error: '' })
    postulacionesService.obtenerCandidatosAsignacion({
      search: candidateSearch,
      rol: '',
      ordering: 'apellido_paterno',
      page: candidatePage,
    }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCandidates({ data, loading: false, error: '' })
      })
      .catch((error) => {
        if (!error.canceled && !controller.signal.aborted) setCandidates({ data: null, loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [candidateSearch, candidatePage, candidateRevision])

  useEffect(() => {
    const controller = new AbortController()
    setExistingAuthorities({ data: null, loading: true, error: '' })
    const load = async () => {
      const rows = []
      let page = 1
      while (!controller.signal.aborted) {
        const response = await postulacionesService.obtenerActores(postulacion, true, page, controller.signal)
        rows.push(...(Array.isArray(response) ? response : response?.results || []))
        if (Array.isArray(response) || !response?.next) break
        page += 1
      }
      if (!controller.signal.aborted) setExistingAuthorities({ data: rows, loading: false, error: '' })
    }
    load().catch((error) => {
      if (!error.canceled && !controller.signal.aborted) setExistingAuthorities({ data: null, loading: false, error: error.message })
    })
    return () => controller.abort()
  }, [postulacion, stage?.id, existingAuthorityRevision])

  const submit = async (event) => {
    event.preventDefault()
    if (assignment.submitting || existingAuthorities.loading || existingAuthorities.error || candidates.loading || candidates.error) return
    if (stage?.codigo !== 'DEFENSA_PUBLICA' || !stage?.id) {
      setValidationError('No se pudo identificar la etapa actual de Defensa Pública.')
      return
    }
    const jobs = pendingRoles.map((role) => {
      const candidate = selections[role]
      if (!candidate) return null
      return {
        key: role,
        name: candidate.nombre_completo || candidate.username,
        payload: {
          usuario: Number(candidate.id),
          tipo_participacion: role,
          seguimiento_etapa: Number(stage.id),
        },
      }
    })
    if (jobs.some((job) => !job)) {
      setValidationError('Selecciona una persona para cada cargo pendiente.')
      return
    }
    const selectedIds = jobs.map((job) => String(job.payload.usuario))
    if (!allowIdentityReuse && new Set(selectedIds).size !== selectedIds.length) {
      setValidationError('Selecciona personas distintas para Presidente y Secretario.')
      return
    }
    setValidationError('')
    await onSubmit(jobs)
    setExistingAuthorities({ data: null, loading: true, error: '' })
    setExistingAuthorityRevision((value) => value + 1)
  }

  const retryCandidates = () => setCandidateRevision((value) => value + 1)

  return <Modal title="Completar autoridades" onClose={() => { if (!assignment.submitting) onClose() }}>
    <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
      <p className="text-sm text-slate-600 dark:text-slate-300">Asigna las autoridades que faltan para esta Defensa Pública.</p>
      {stage?.codigo !== 'DEFENSA_PUBLICA' && <p role="alert" className="text-sm text-red-600">La etapa actual no corresponde a Defensa Pública.</p>}
      {existingAuthorities.loading && <p role="status">Verificando autoridades asignadas…</p>}
      {existingAuthorities.error && <div><p role="alert" className="text-sm text-red-600">{existingAuthorities.error}</p><Button type="button" variant="secondary" onClick={() => setExistingAuthorityRevision((value) => value + 1)}>Reintentar asignaciones</Button></div>}
      <div><label className="text-sm">Buscar persona<input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label><Button type="button" variant="secondary" className="mt-2" disabled={assignment.submitting} onClick={() => { setCandidateSearch(candidateQuery.trim()); setCandidatePage(1) }}>Buscar</Button></div>
      {candidates.loading && <p role="status">Cargando candidatos…</p>}
      {candidates.error && <div><p role="alert" className="text-sm text-red-600">{candidates.error}</p><Button type="button" variant="secondary" onClick={retryCandidates}>Reintentar candidatos</Button></div>}
      {!existingAuthorities.loading && !existingAuthorities.error && !candidates.loading && !candidates.error && roleRows.map((role) => {
        const label = assignmentTypeLabel(role)
        const assigned = roleAssignments(role)
        const result = assignment.results?.[role]
        const completed = roleIsAssigned(role)
        const otherRole = role === 'PRESIDENTE' ? 'SECRETARIO' : 'PRESIDENTE'
        const otherAssignedIds = new Set(roleAssignments(otherRole).map((actor) => String(actor.usuario)))
        const otherSelection = selections[otherRole]?.id
        const selectedCandidate = selections[role]
        const selectedValue = selectedCandidate?.id ? String(selectedCandidate.id) : ''
        const visibleCandidates = selectedCandidate && !candidateRows.some((candidate) => String(candidate.id) === selectedValue)
          ? [selectedCandidate, ...candidateRows] : candidateRows
        return <section key={role} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <h3 className="font-semibold">{label}{!completed && <span aria-hidden="true"> *</span>}</h3>
          {completed ? <div className="mt-2"><p className="font-medium text-emerald-700 dark:text-emerald-300">✓ Asignado</p>{assigned.length > 0
            ? assigned.map((actor) => <p key={actor.id} className="mt-1 text-sm">{actor.usuario_nombre || actor.usuario_nombre_completo || 'Persona asignada'}</p>)
            : <p className="mt-1 text-sm">{result?.name || 'Asignación registrada'}</p>}</div>
            : <label className="mt-2 block text-sm">Seleccionar persona<select aria-label={`Seleccionar persona para ${label}`} value={selectedValue} onChange={(event) => { onSelectCandidate(role, visibleCandidates.find((candidate) => String(candidate.id) === event.target.value) || null); setValidationError('') }} disabled={assignment.submitting || visibleCandidates.length === 0} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una persona</option>{visibleCandidates.map((candidate) => {
              const id = String(candidate.id)
              const currentAssignments = getActiveAssignmentLabels(candidate.id, activeAssignmentRows)
              const hasIncompatibleAssignment = !allowIdentityReuse && activeAssignmentRows.some((actor) => (
                actor.activo !== false
                && String(actor.usuario) === id
                && ['TRIBUNAL', 'PRESIDENTE', 'SECRETARIO'].includes(actor.tipo_participacion)
              ))
              const conflictsWithOtherAuthority = !allowIdentityReuse
                && ((otherSelection && id === String(otherSelection)) || otherAssignedIds.has(id))
              const disabled = (blockOccupiedCandidates && currentAssignments.length > 0) || hasIncompatibleAssignment || conflictsWithOtherAuthority
              const assignmentDescription = currentAssignments.length > 0 ? ` · Asignación vigente: ${currentAssignments.join(', ')}` : ''
              return <option key={candidate.id} value={id} disabled={disabled}>{candidate.nombre_completo || candidate.username} — {candidate.rol_nombre || candidate.rol_codigo}{assignmentDescription}</option>
            })}</select></label>}
          {result?.state === 'PROCESSING' && <p role="status" className="mt-2 text-sm">Guardando…</p>}
          {result?.state === 'ERROR' && <p role="alert" className="mt-2 text-sm text-red-600">⚠ No se pudo asignar: {result.message}</p>}
        </section>
      })}
      {!candidates.loading && !candidates.error && candidateRows.length === 0 && <p role="status">No se encontraron candidatos.</p>}
      {!candidates.loading && !candidates.error && candidates.data && <Pagination count={candidates.data.count || 0} page={candidatePage} hasNext={Boolean(candidates.data.next)} hasPrevious={Boolean(candidates.data.previous)} onPage={setCandidatePage} />}
      {validationError && <p role="alert" className="text-sm text-red-600">{validationError}</p>}
      {assignment.error && <p role="alert" className="text-sm text-red-600">{assignment.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={assignment.submitting || existingAuthorities.loading || Boolean(existingAuthorities.error) || candidates.loading || Boolean(candidates.error) || pendingRoles.length === 0 || pendingRoles.some((role) => !selections[role])}>{assignment.submitting ? 'Guardando autoridades…' : successfulCount > 0 ? 'Reintentar pendientes' : 'Guardar autoridades'}</Button><Button type="button" variant="secondary" disabled={assignment.submitting} onClick={onClose}>Cancelar</Button></div>
    </form>
  </Modal>
}

function AssignmentDialog(props) {
  const title = props.replacementPosition?.nombre
    ? `Reemplazar ${props.replacementPosition.nombre}`
    : props.fixedAssignment?.nombre ? `Asignar ${props.fixedAssignment.nombre}` : 'Asignar actor'
  return <Modal title={title} onClose={props.onClose}><ActorAssignmentForm {...props} /></Modal>
}

function ActorAssignmentForm({ assignment, stages, activeActors, activeTribunals, onRetryActiveTribunals, isProjectGrade, allowedTypes, initialStageId, fixedAssignment = null, onSubmit, onClose, closeLabel = 'Cancelar' }) {
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidatePage, setCandidatePage] = useState(1)
  const [candidateRevision, setCandidateRevision] = useState(0)
  const [candidates, setCandidates] = useState({ data: null, loading: true, error: '' })
  const [type, setType] = useState(fixedAssignment?.tipo_participacion || '')
  const [stageId, setStageId] = useState(fixedAssignment?.seguimiento_etapa ? String(fixedAssignment.seguimiento_etapa) : initialStageId ? String(initialStageId) : '')
  const [localFields, setLocalFields] = useState({})

  useEffect(() => {
    if (allowedTypes && type && !allowedTypes.includes(type)) setType('')
  }, [allowedTypes, type])

  useEffect(() => {
    const controller = new AbortController()
    setCandidates({ data: null, loading: true, error: '' })
    postulacionesService.obtenerCandidatosAsignacion({ search: candidateSearch, rol: '', ordering: 'apellido_paterno', page: candidatePage }, controller.signal)
      .then((data) => setCandidates({ data, loading: false, error: '' }))
      .catch((error) => {
        if (!error.canceled) setCandidates({ data: null, loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [candidateSearch, candidatePage, candidateRevision])

  const selectedStage = stages.find((stage) => String(stage.id) === String(stageId))
  const usesPersistentTribunalComposition = isProjectGrade && selectedStage?.codigo === 'REVISION_TRIBUNAL_PREVIA'
  const contextActors = activeActors.filter((actor) => String(actor.seguimiento_etapa || '') === String(stageId))
  const tribunals = (usesPersistentTribunalComposition ? activeTribunals.data || [] : contextActors)
    .filter((actor) => actor.activo !== false && actor.tipo_participacion === 'TRIBUNAL')
  const tribunalComposition = getActiveTribunalComposition(tribunals)
  const occupiedOrders = new Set(tribunalComposition.occupiedOrders)
  const tribunalByOrder = new Map(tribunals.map((actor) => [Number(actor.orden_cargo), actor]))
  const tribunalCompositionPending = usesPersistentTribunalComposition && (activeTribunals.loading || Boolean(activeTribunals.error) || !activeTribunals.data)
  const tribunalComplete = isProjectGrade && tribunalComposition.complete
  const availableTypes = allowedTypes ? ASSIGNMENT_TYPES.filter(([value]) => allowedTypes.includes(value)) : ASSIGNMENT_TYPES
  const unavailableCandidateIds = new Set(fixedAssignment && type
    ? (activeTribunals.data || []).map((actor) => String(actor.usuario))
    : type ? activeActors.filter((actor) => actor.tipo_participacion === type).map((actor) => String(actor.usuario)) : [])
  const fieldMessage = (name) => {
    const value = localFields[name] || assignment.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  const error = (name) => fieldMessage(name) && <span role="alert" className="mt-1 block text-sm text-red-600">{fieldMessage(name)}</span>

  const submit = (event) => {
    event.preventDefault()
    if (assignment.submitting) return
    const elements = event.currentTarget.elements
    const fields = {}
    const candidate = elements.usuario.value
    const order = fixedAssignment?.orden_cargo || elements.orden_cargo?.value || ''
    if (!candidate) fields.usuario = ['Selecciona un candidato.']
    if (!type) fields.tipo_participacion = ['Selecciona un tipo de participación.']
    if (type === 'TRIBUNAL' && !order) fields.orden_cargo = ['Selecciona el orden de tribunal requerido.']
    if (!fixedAssignment && type === 'TRIBUNAL' && tribunalComplete) fields.orden_cargo = ['Ya existen tres tribunales designados en este contexto.']
    if (!fixedAssignment && order && occupiedOrders.has(Number(order))) fields.orden_cargo = ['Ese orden de tribunal ya está ocupado en este contexto.']
    setLocalFields(fields)
    if (Object.keys(fields).length) return
    const payload = {
      usuario: Number(candidate),
      tipo_participacion: type,
      observaciones: fixedAssignment ? (fixedAssignment.observaciones || '') : elements.observaciones.value.trim(),
    }
    if (type === 'TRIBUNAL') payload.orden_cargo = Number(order)
    if (stageId) payload.seguimiento_etapa = Number(stageId)
    onSubmit(payload)
  }

  const rows = candidates.data?.results || []
  const activeStages = stages.filter((stage) => stage.activo !== false)
  return <form className="grid gap-4" onSubmit={submit} noValidate>
      {allowedTypes && <aside role="note" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:bg-sky-950"><p className="font-semibold">Para programar la Defensa Pública faltan:</p><ul className="mt-2 list-disc pl-5">{availableTypes.map(([value, label]) => <li key={value}>{label}</li>)}</ul><p className="mt-2">Cada rol se registra como una asignación independiente y explícita.</p></aside>}
      <div>
        <label className="text-sm">Buscar candidato<input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
        <Button type="button" variant="secondary" className="mt-2" disabled={assignment.submitting} onClick={() => { setCandidateSearch(candidateQuery.trim()); setCandidatePage(1) }}>Buscar</Button>
      </div>
      {candidates.loading && <p role="status">Cargando candidatos…</p>}
      {candidates.error && <div><p role="alert" className="text-red-600">{candidates.error}</p><Button type="button" variant="secondary" className="mt-2" onClick={() => setCandidateRevision((value) => value + 1)}>Reintentar candidatos</Button></div>}
      {!candidates.loading && !candidates.error && <>
        <label className="text-sm">Candidato<select name="usuario" required disabled={assignment.submitting || rows.length === 0} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una persona</option>{rows.map((candidate) => { const activeAssignments = getActiveAssignmentLabels(candidate.id, activeActors); return <option key={candidate.id} value={candidate.id} disabled={unavailableCandidateIds.has(String(candidate.id))}>{candidate.nombre_completo || candidate.username} — {candidate.rol_nombre || candidate.rol_codigo} — {candidate.codigo || candidate.username}{activeAssignments.length > 0 ? ` · Asignación vigente: ${activeAssignments.join(', ')}` : ''}</option> })}</select>{error('usuario')}</label>
        {rows.length === 0 && <p role="status" className="text-sm text-slate-500">No se encontraron candidatos.</p>}
        <Pagination count={candidates.data?.count || 0} page={candidatePage} hasNext={Boolean(candidates.data?.next)} hasPrevious={Boolean(candidates.data?.previous)} onPage={setCandidatePage} />
      </>}
      {!fixedAssignment && <label className="text-sm">Tipo de participación<select name="tipo_participacion" value={type} onChange={(event) => { setType(event.target.value); setLocalFields({}) }} required disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un tipo</option>{availableTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('tipo_participacion')}</label>}
      {!fixedAssignment && <label className="text-sm">Etapa asociada (opcional)<select name="seguimiento_etapa" value={stageId} onChange={(event) => { setStageId(event.target.value); setLocalFields({}) }} disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Sin etapa asociada</option>{activeStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.nombre || stage.codigo} — intento {stage.numero_intento ?? 1} — {stage.estado_display || stage.estado}</option>)}</select>{error('seguimiento_etapa')}</label>}
      {!fixedAssignment && type === 'TRIBUNAL' && <>
        {usesPersistentTribunalComposition && activeTribunals.loading && <p role="status" className="text-sm text-slate-500">Verificando composición del tribunal…</p>}
        {usesPersistentTribunalComposition && activeTribunals.error && <div><p role="alert" className="text-sm text-red-600">{activeTribunals.error}</p><Button type="button" variant="secondary" className="mt-2" onClick={onRetryActiveTribunals}>Reintentar composición</Button></div>}
        {isProjectGrade && !tribunalCompositionPending && <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:bg-sky-950">{usesPersistentTribunalComposition ? 'Tribunales vigentes' : 'Tribunales designados'}: <strong>{tribunalComposition.occupiedOrders.length} de 3</strong>. La designación completa requiere Tribunal 1, Tribunal 2 y Tribunal 3; esto no representa quórum.</p>}
        <label className="text-sm">Orden del tribunal<select name="orden_cargo" required disabled={assignment.submitting || tribunalComplete || tribunalCompositionPending} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un orden</option>{[1, 2, 3].map((order) => {
          const assignedTribunal = tribunalByOrder.get(order)
          const assignedName = assignedTribunal?.usuario_nombre || assignedTribunal?.usuario_nombre_completo
          const status = assignedTribunal
            ? usesPersistentTribunalComposition ? ` — ocupado por ${assignedName || 'usuario asignado'}` : ' — ocupado'
            : usesPersistentTribunalComposition ? ' — disponible' : ''
          return <option key={order} value={order} disabled={occupiedOrders.has(order)}>Tribunal {order}{status}</option>
        })}</select>{error('orden_cargo')}</label>
        {tribunalComplete && <p role="alert" className="text-sm text-amber-700">Ya están designados los tres tribunales para el contexto seleccionado.</p>}
      </>}
      {!fixedAssignment && <label className="text-sm">Observaciones (opcional)<textarea name="observaciones" disabled={assignment.submitting} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>}
      {error('non_field_errors')}{error('detail')}
      {assignment.error && <p role="alert" className="text-red-600">{assignment.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={assignment.submitting || candidates.loading || Boolean(candidates.error) || (!fixedAssignment && type === 'TRIBUNAL' && (tribunalComplete || tribunalCompositionPending))}>{assignment.submitting ? 'Procesando…' : 'Confirmar asignación'}</Button><Button type="button" variant="secondary" disabled={assignment.submitting} onClick={onClose}>{closeLabel}</Button></div>
    </form>
}

function formatActorDate(value, fallback = 'No registrada') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString('es-BO')
}

function DefensesCard({ defenses, page, onPage, onRetry, onSelect, canManage, canProgram = true, programmingContext, onProgram }) {
  const rows = defenses.data?.results || []
  return <Card className="overflow-hidden" aria-labelledby="defensas-title">
    <h2 id="defensas-title" className="text-xl font-bold">Defensas</h2>
    {canManage && canProgram && <Button className="mt-3" onClick={onProgram}>{programmingContext?.actionLabel || 'Programar defensa'}</Button>}
    <p className="mt-1 text-sm text-slate-500">Defensas registradas en tu proceso académico.</p>
    {false && <details className="mt-4 overflow-hidden rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Información institucional</summary>
      <p role="note" aria-label="Alcance contractual de las defensas" className="border-t border-amber-300 p-4 text-sm">{DEFENSE_WARNING}</p>
    </details>}
    {defenses.loading && <p role="status" className="mt-4 text-sm">Cargando defensas…</p>}
    {defenses.error && <SectionError message={defenses.error} label="Reintentar defensas" onRetry={onRetry} />}
    {!defenses.loading && !defenses.error && rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No se registraron defensas.</p>}
    {!defenses.loading && !defenses.error && rows.length > 0 && <>
      <ul className="mt-5 space-y-4">{rows.map((defense) => <li key={defense.id} className="min-w-0 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><h3 className="break-words font-semibold">{defense.tipo_display || defense.tipo_evento || EMPTY}</h3><p className="mt-1 text-sm">Intento {defense.numero_intento ?? EMPTY}</p></div>
          <span className="self-start rounded-full border px-2 py-1 text-xs font-semibold">{defense.estado_display || defense.estado || EMPTY}</span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Fecha programada" value={formatDefenseDate(defense.fecha_programada)} />
          <Info label="Lugar" value={defense.lugar?.trim() || 'No registrado'} />
          <Info label="Modalidad" value={defense.modalidad_display || defense.modalidad_evento} />
          <Info label="Etapa" value={defense.etapa_nombre || defense.etapa_codigo} />
          <Info label="Resultado" value={defense.resultado_consolidado?.resultado_cualitativo || defense.resultado_consolidado?.nota_numerica || 'Pendiente'} />
          {defense.tipo_evento === 'DEFENSA_PERFIL' && <Info label="Hoja de observaciones" value={defense.hoja_observaciones ? 'Disponible' : 'No registrada'} />}
        </dl>
        <Button className="mt-4" variant="secondary" onClick={() => onSelect(defense)}>Ver defensa</Button>
      </li>)}</ul>
      <Pagination count={defenses.data.count} page={page} hasNext={Boolean(defenses.data.next)} hasPrevious={Boolean(defenses.data.previous)} onPage={onPage} />
    </>}
  </Card>
}

function DefenseDetail({ defense, quorum, nextAction, onRetryQuorum, onClose, onDefenseCompleted, canManage, canEvaluate, canManageDocuments, isProjectGrade, isThesisGrade, onParticipantsChanged, onUploadProfileObservations, onManageActors, onAction }) {
  const [attendanceReviewRequest, setAttendanceReviewRequest] = useState(0)
  useEffect(() => {
    if (defense?.id != null) setAttendanceReviewRequest(0)
  }, [defense?.id])
  if (!defense || typeof defense !== 'object') {
    return <Modal title="Detalle de defensa" onClose={onClose}>
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">No se pudo cargar la defensa</h3>
        <p className="mt-1 text-sm">Los datos no están disponibles. Cierra este diálogo y vuelve al expediente para intentarlo de nuevo.</p>
      </section>
    </Modal>
  }
  const projectDefenseTypes = ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA']
  const projectDefenseDataInvalid = isProjectGrade && (
    defense.id == null
    || !projectDefenseTypes.includes(defense.tipo_evento)
    || typeof defense.estado !== 'string'
    || !Array.isArray(defense.evaluaciones)
    || !defense.evaluaciones.every((item) => item && typeof item === 'object')
    || !Array.isArray(defense.participantes)
    || !defense.participantes.every((item) => item && typeof item === 'object')
    || (defense.resultado_consolidado != null && typeof defense.resultado_consolidado !== 'object')
    || (defense.composicion_formal != null && !Array.isArray(defense.composicion_formal))
  )
  if (projectDefenseDataInvalid) {
    return <Modal title="Detalle de defensa" onClose={onClose}>
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">No se pudo cargar el detalle completo</h3>
        <p className="mt-1 text-sm">La defensa llegó con datos incompletos o con un formato inesperado. Cierra este diálogo y vuelve al expediente para actualizarla.</p>
        <Button className="mt-3" variant="secondary" onClick={onClose}>Volver al expediente</Button>
      </section>
    </Modal>
  }
  const evaluations = defense.evaluaciones || []
  if (!Array.isArray(evaluations)) {
    return <Modal title="Detalle de defensa" onClose={onClose}>
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">No se pudieron cargar las evaluaciones</h3>
        <p className="mt-1 text-sm">La respuesta de la defensa tiene un formato inesperado. Cierra este diálogo y vuelve al expediente para actualizarla.</p>
      </section>
    </Modal>
  }
  const hasActiveReplacement = defense.reprogramaciones?.some((item) => item.activo !== false && item.estado !== 'CANCELADA')
  const canRescheduleCancelledDefense = supportsCancelledDefenseRescheduling(defense)
  const actions = { PROGRAMADA: ['iniciar', 'suspender', 'cancelar', 'reprogramar'], EN_CURSO: ['finalizar', 'suspender', 'cancelar'], SUSPENDIDA: ['reprogramar', 'cancelar'], CANCELADA: hasActiveReplacement || !canRescheduleCancelledDefense ? [] : ['reprogramar'] }[defense.estado] || []
  const actionLabels = {
    iniciar: 'Iniciar defensa',
    finalizar: 'Finalizar defensa',
    suspender: 'Suspender defensa',
    cancelar: 'Cancelar defensa',
    reprogramar: 'Reprogramar defensa',
    registrar_evaluacion: 'Registrar resultado de la defensa',
    consolidar_resultado: 'Consolidar resultado',
  }
  const contextualNextAction = (nextAction?.accion || nextAction?.codigo) === 'PROGRAMAR_EVENTO' ? null : nextAction
  const orientedAction = ORIENTATION_TO_DEFENSE_ACTION[contextualNextAction?.accion || contextualNextAction?.codigo]
  const hasEvaluation = evaluations.some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const hasProjectProfileConsensus = isProjectGrade && defense.tipo_evento === 'DEFENSA_PERFIL'
    && evaluations.some((item) => item.tipo_evaluacion === 'PERFIL' && item.modalidad_registro === 'CONSENSO' && !item.es_resultado_final_evento)
  const hasThesisIndividualEvaluation = isThesisGrade && evaluations.some((item) => item.modalidad_registro === 'INDIVIDUAL' && !item.es_resultado_final_evento)
  const hasResult = Boolean(defense.resultado_consolidado)
  const thesisCompositionValidation = isThesisGrade ? defense.composicion_formal_validacion : null
  const evaluationManager = canManage || canEvaluate
  const profileContext = defense.tipo_evento === 'DEFENSA_PERFIL'
  const directProjectFlow = (isProjectGrade && ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))
    || (isThesisGrade && !hasThesisIndividualEvaluation && ['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))
  const canRegisterEvaluation = evaluationManager && !hasEvaluation && ['EN_CURSO', 'FINALIZADA'].includes(defense.estado) && quorum.data?.valido === true
  const canConsolidateEvaluation = evaluationManager && hasEvaluation && !hasResult && defense.estado === 'FINALIZADA'
  const orientationCompatible = actions.includes(orientedAction)
    || (orientedAction === 'registrar_evaluacion' && canRegisterEvaluation)
    || (orientedAction === 'consolidar_resultado' && canConsolidateEvaluation)
  const compatibleNextAction = orientationCompatible ? contextualNextAction : null
  const evaluationActionAvailable = evaluationManager && (
    (orientedAction === 'registrar_evaluacion' && canRegisterEvaluation)
    || (orientedAction === 'consolidar_resultado' && canConsolidateEvaluation)
  )
  const profileQuickFlow = profileContext && evaluationManager && quorum.data?.valido === true && !hasResult
    && ((defense.estado === 'EN_CURSO' && (!hasEvaluation || hasProjectProfileConsensus)) || (defense.estado === 'FINALIZADA' && hasProjectProfileConsensus))
  const quickProfileEvaluationAction = profileQuickFlow ? 'registrar_evaluacion' : null
  const primaryAction = quickProfileEvaluationAction || (((canManage && actions.includes(orientedAction)) || evaluationActionAvailable) ? orientedAction : null)
  const secondaryActions = primaryAction ? actions.filter((action) => action !== primaryAction) : actions
  const hasSecondaryEvaluationAction = (canRegisterEvaluation && primaryAction !== 'registrar_evaluacion') || (canConsolidateEvaluation && primaryAction !== 'consolidar_resultado')
  const duplicateQuorumDetail = sameTechnicalCounts(quorum.data?.conteos, quorum.data?.detalle)
  const activeParticipants = (defense.participantes || []).filter((participant) => participant.activo !== false)
  const participantSummary = activeParticipants.length === 0
    ? 'Ninguno incorporado'
    : `${activeParticipants.length} incorporado${activeParticipants.length === 1 ? '' : 's'}`
  const quorumSummary = quorum.loading
    ? 'Consultando'
    : quorum.error
      ? 'No disponible'
      : quorum.data
        ? quorum.data.valido ? 'Válido' : 'No válido'
        : 'No consultado'
  const resultSummary = hasResult ? 'Consolidado' : 'Pendiente'
  const displayedPrimaryAction = directProjectFlow
    ? null
    : primaryAction || (canManage && actions.includes('iniciar') ? 'iniciar' : null)
  const displayedPrimaryTitle = displayedPrimaryAction === primaryAction
    ? (compatibleNextAction?.titulo || actionLabels[displayedPrimaryAction] || 'Registrar resultado de la defensa')
    : actionLabels[displayedPrimaryAction] || 'Registrar resultado de la defensa'
  const displayedPrimaryDescription = displayedPrimaryAction === primaryAction ? compatibleNextAction?.descripcion : null
  const secondaryOperationalActions = secondaryActions.filter((action) => action !== 'cancelar' && action !== displayedPrimaryAction && !(defense.estado === 'CANCELADA' && canRescheduleCancelledDefense && !directProjectFlow && action === 'reprogramar'))
  const destructiveActions = secondaryActions.filter((action) => action === 'cancelar')
  const showEvaluationSection = hasSecondaryEvaluationAction || (canManage && secondaryActions.length > 0 && (defense.estado !== 'PROGRAMADA' || hasEvaluation))
  return <Modal title="Detalle de defensa" onClose={onClose}>
    <div className="mt-4 min-w-0 space-y-6">
      <section aria-labelledby="defensa-evento-title">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 id="defensa-evento-title" className="text-2xl font-bold">{defense.tipo_display || defense.tipo_evento}</h3>
              <p className="mt-2 text-sm font-medium">{formatDefenseDate(defense.fecha_programada)}</p>
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{defense.lugar?.trim() || 'No registrado'} · {defense.modalidad_display || defense.modalidad_evento}</p>
            </div>
            <span className="self-start rounded-full border border-sky-300 bg-white px-3 py-1.5 text-sm font-bold text-sky-800 dark:border-sky-700 dark:bg-slate-900 dark:text-sky-200">{defense.estado_display || defense.estado}</span>
          </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Intento {defense.numero_intento ?? 'No registrado'} · Etapa {defense.etapa_nombre || defense.etapa_codigo || 'No registrada'}</p>
        {(defense.fecha_inicio_real || defense.fecha_fin_real || defense.fecha_cancelacion) && <dl className="mt-3 grid gap-3 border-t border-sky-200 pt-3 text-sm dark:border-sky-800 sm:grid-cols-2">
          {defense.fecha_inicio_real && <Info label="Inicio real" value={formatDefenseDate(defense.fecha_inicio_real)} />}
          {defense.fecha_fin_real && <Info label="Finalización real" value={formatDefenseDate(defense.fecha_fin_real)} />}
          {defense.fecha_cancelacion && <Info label="Cancelada el" value={formatDefenseDate(defense.fecha_cancelacion)} />}
        </dl>}
        </div>
        {defense.reprogramada_desde_detalle && <p role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">Nueva programación del evento cancelado #{defense.reprogramada_desde_detalle.id}. Fecha anterior: {formatDefenseDate(defense.reprogramada_desde_detalle.fecha_programada)}. Cancelada el: {formatDefenseDate(defense.reprogramada_desde_detalle.fecha_cancelacion)}.</p>}
        {defense.reprogramaciones?.filter((item) => item.activo !== false && item.estado !== 'CANCELADA').map((item) => <p key={item.id} role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">Nueva programación: evento #{item.id}, {formatDefenseDate(item.fecha_programada)}.</p>)}
        {defense.enlace_virtual && <a className="mt-4 inline-flex max-w-full break-all rounded-md border px-3 py-2 text-sm font-medium" href={defense.enlace_virtual} target="_blank" rel="noopener noreferrer">Abrir enlace virtual de la defensa</a>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="estado-operativo-defensa-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 id="estado-operativo-defensa-title" className="text-lg font-bold">Estado operativo</h3>{!profileContext && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{directProjectFlow ? `Resultado: ${resultSummary}` : `Participantes: ${participantSummary === 'Ninguno incorporado' ? '0' : participantSummary} · Quórum: ${quorumSummary} · Resultado: ${resultSummary}`}</p>}</div>
          {!displayedPrimaryAction && compatibleNextAction?.titulo && <p className="max-w-md text-sm"><span className="font-semibold">Siguiente acción:</span> {compatibleNextAction.titulo}{compatibleNextAction.descripcion ? ` — ${compatibleNextAction.descripcion}` : ''}</p>}
        </div>
        {directProjectFlow ? <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700"><h4 className="font-semibold">Tribunal y cargos formales</h4>
          {defense.composicion_formal?.length ? <ul className="mt-2 space-y-2">{defense.composicion_formal.map((actor) => <li key={actor.id} className="rounded-md border bg-white p-3 text-sm dark:bg-slate-950"><span className="font-semibold">{actor.usuario_nombre}</span><span> — {actor.rol_display || actor.tipo_participacion}{actor.orden_cargo ? ` ${actor.orden_cargo}` : ''}</span></li>)}</ul> : <p className="mt-2 text-sm text-amber-700">No hay asignaciones formales vigentes para mostrar.</p>}
          {isThesisGrade && thesisCompositionValidation?.cumple !== true && <section role="alert" className="mt-3 rounded-md border border-amber-400 bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            <p className="font-semibold">Composición formal inválida; corrige las asignaciones antes de registrar el resultado.</p>
            {!thesisCompositionValidation && <p className="mt-1">No se pudo validar la composición de esta defensa.</p>}
            {thesisCompositionValidation?.conflictos_identidad?.map((conflict, index) => <p key={`${conflict.usuario_nombre}-${index}`} className="mt-1">{conflict.usuario_nombre} ocupa cargos repetidos: {conflict.cargos.join(', ')}.</p>)}
            {thesisCompositionValidation?.requisitos?.filter((item) => !item.cumplido).map((item) => <p key={item.cargo} className="mt-1">{item.cargo}: {item.actual} de {item.minimo} asignaciones distintas.</p>)}
          </section>}
          {canManage && isProjectGrade && <Button className="mt-2" variant="secondary" onClick={onManageActors}>Gestionar tribunal y cargos</Button>}
        </div> : <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700"><DefenseParticipants
          defense={defense}
          canManage={canManage}
          onChanged={onParticipantsChanged}
          profileContext={profileContext}
          quorum={quorum.data}
          reviewAttendanceRequest={attendanceReviewRequest}
        /></div>}
        {!directProjectFlow && <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        {quorum.loading && <p role="status" className="mt-3 text-sm">Consultando quórum…</p>}
        {quorum.error && <SectionError message={quorum.error} label="Reintentar quórum" onRetry={onRetryQuorum} />}
        {!quorum.loading && !quorum.error && quorum.data && <details className="overflow-hidden rounded-lg border text-sm"><summary className="cursor-pointer p-3 font-semibold">Información técnica del quórum</summary><div className="space-y-3 border-t p-3"><TechnicalCounts title="Conteos" values={quorum.data.conteos} empty="Sin conteos registrados." /><TechnicalCounts title="Faltantes" values={quorum.data.faltantes} empty="Sin participantes faltantes." />{!duplicateQuorumDetail && <TechnicalCounts title="Detalles" values={quorum.data.detalle} empty="Sin detalle adicional." />}<p className="text-slate-500">El quórum mostrado es una verificación técnica del sistema y no acredita por sí mismo la conformación formal del tribunal ni la validez institucional del acto. Esta verificación técnica no certifica validez institucional.</p></div></details>}
        </div>}
      </section>

      {directProjectFlow && <ProjectGradeDirectResult defense={defense} canManage={evaluationManager} onChanged={onParticipantsChanged} onCompleted={onDefenseCompleted} onClose={onClose} thesisGrade={isThesisGrade} compositionValidation={thesisCompositionValidation} />}

      {canManage && directProjectFlow && actions.includes('reprogramar') && <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950"><h3 className="font-bold">Nueva programación</h3><p className="mt-1 text-sm">La fecha cancelada y su historial se conservarán. Se creará un evento nuevo para el mismo intento.</p><Button className="mt-3" onClick={() => onAction('reprogramar')}>Reprogramar defensa</Button></section>}
      {canManage && !directProjectFlow && defense.estado === 'CANCELADA' && canRescheduleCancelledDefense && actions.includes('reprogramar') && <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950"><h3 className="font-bold">Nueva programación</h3><p className="mt-1 text-sm">La fecha cancelada y su historial se conservarán. Se creará un evento nuevo para el mismo intento.</p><Button className="mt-3" onClick={() => onAction('reprogramar')}>Reprogramar defensa</Button></section>}

      {!directProjectFlow && displayedPrimaryAction && <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950" aria-labelledby="siguiente-accion-defensa-title"><h3 className="text-sm font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">Acción principal</h3>{![ 'iniciar', 'registrar_evaluacion'].includes(displayedPrimaryAction) && <p className="mt-2 font-semibold">{displayedPrimaryTitle}</p>}{displayedPrimaryDescription && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayedPrimaryDescription}</p>}{['registrar_evaluacion', 'consolidar_resultado'].includes(displayedPrimaryAction) ? <DefenseEvaluation defense={defense} quorum={quorum} canManage={evaluationManager} action={displayedPrimaryAction} actionLabel={displayedPrimaryTitle} onChanged={onParticipantsChanged} onCompleted={onDefenseCompleted} projectProfileFlow={profileQuickFlow} onReviewAttendance={() => { setAttendanceReviewRequest((value) => value + 1); const participantsHeading = document.getElementById('participantes-defensa-title'); if (typeof participantsHeading?.scrollIntoView === 'function') participantsHeading.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} /> : <Button className="mt-4" disabled={displayedPrimaryAction === 'finalizar' && (quorum.loading || quorum.error || quorum.data?.valido !== true)} onClick={() => onAction(displayedPrimaryAction)}>{displayedPrimaryTitle}</Button>}</section>}

      {!directProjectFlow && showEvaluationSection && !['registrar_evaluacion', 'consolidar_resultado'].includes(primaryAction) && <section aria-labelledby="evaluacion-defensa-title"><h3 id="evaluacion-defensa-title" className="text-lg font-bold">Evaluación</h3><DefenseEvaluation defense={defense} quorum={quorum} canManage={evaluationManager} buttonVariant="secondary" hiddenAction={primaryAction} onChanged={onParticipantsChanged} onCompleted={onDefenseCompleted} /></section>}

      {canManage && !directProjectFlow && secondaryOperationalActions.length > 0 && <section aria-labelledby="otras-acciones-defensa-title"><h3 id="otras-acciones-defensa-title" className="text-lg font-bold">Más acciones</h3><div className="mt-3 flex flex-wrap gap-2">{secondaryOperationalActions.map((action) => {
        const finalBlocked = action === 'finalizar' && (quorum.loading || quorum.error || quorum.data?.valido !== true)
        const variant = action === 'finalizar' && hasProjectProfileConsensus && !finalBlocked ? 'default' : 'secondary'
        return <Button key={action} variant={variant} disabled={finalBlocked} title={finalBlocked ? 'La finalización requiere quórum técnico válido confirmado por el backend.' : undefined} onClick={() => onAction(action)}>{actionLabels[action]}</Button>
      })}</div>{defense.estado === 'EN_CURSO' && quorum.data?.valido !== true && <p className="mt-3 text-sm text-slate-500">La finalización estará disponible cuando el backend confirme quórum técnico válido.</p>}</section>}

      {canManage && destructiveActions.length > 0 && <section aria-labelledby="acciones-destructivas-defensa-title"><h3 id="acciones-destructivas-defensa-title" className="text-lg font-bold">Acción destructiva</h3><div className="mt-3 flex flex-wrap gap-2">{destructiveActions.map((action) => <Button key={action} variant="outline" onClick={() => onAction(action)}>{actionLabels[action]}</Button>)}</div></section>}

      {hasResult && <section aria-labelledby="resultado-consolidado-title"><h3 id="resultado-consolidado-title" className="text-lg font-bold">Resultado</h3><div className="mt-3 rounded-lg border p-3"><EvaluationData evaluation={defense.resultado_consolidado} showTechnical={canManage || canEvaluate} /></div></section>}

      <section aria-labelledby="evaluaciones-defensa-title"><h3 id="evaluaciones-defensa-title" className="text-lg font-bold">Evaluaciones registradas</h3>
        {evaluations.length === 0 ? <p className="mt-3 text-sm text-slate-500">No se registraron evaluaciones.</p> : <ul className="mt-3 space-y-3">{evaluations.map((evaluation) => <li key={evaluation.id} className="rounded-lg border p-3"><EvaluationData evaluation={evaluation} /></li>)}</ul>}
      </section>

      {isProjectGrade && defense.tipo_evento === 'DEFENSA_PERFIL' && defense.estado === 'FINALIZADA' && <ProfileObservationsSection document={defense.hoja_observaciones} canManageDocuments={canManageDocuments} onUpload={() => onUploadProfileObservations(defense)} />}

      {false && <details className="overflow-hidden rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950"><summary className="cursor-pointer p-4 font-semibold">Información institucional</summary><p role="note" className="border-t border-amber-300 p-4 text-sm">{DEFENSE_WARNING}</p></details>}
    </div>
  </Modal>
}

function ProfileObservationsSection({ document, canManageDocuments, onUpload }) {
  const currentVersion = document?.versiones?.find((version) => version.es_version_actual && version.activo !== false)
  return <section aria-labelledby="hoja-observaciones-title"><h3 id="hoja-observaciones-title" className="text-lg font-bold">Hoja de observaciones</h3>
    {!document && <p className="mt-3 text-sm text-slate-500">No se registró una hoja de observaciones para esta defensa.</p>}
    {document && <div className="mt-3 rounded-lg border p-3"><dl className="grid gap-2 text-sm sm:grid-cols-2"><Info label="Tipo" value={document.tipo_documento_nombre || document.tipo_documento_codigo} /><Info label="Versión actual" value={currentVersion ? `Versión ${currentVersion.numero_version}` : 'No registrada'} /><Info label="Fecha de carga" value={formatDocumentDate(currentVersion?.fecha_subida || document.fecha_subida)} /></dl>{currentVersion && <div className="mt-3"><DownloadVersionButton version={currentVersion} /></div>}{canManageDocuments && <Button className="mt-3" variant="secondary" onClick={onUpload}>{currentVersion ? 'Cargar nueva versión' : 'Cargar hoja de observaciones'}</Button>}</div>}
    {!document && canManageDocuments && <Button className="mt-3" variant="secondary" onClick={onUpload}>Cargar hoja de observaciones</Button>}
  </section>
}

const DEFENSE_TYPES = [
  ['DEFENSA_TEMATICA', 'Defensa de temática', 'TEMATICA_TESIS'],
  ['DEFENSA_PERFIL', 'Defensa de perfil', ['PERFIL_PROYECTO', 'PERFIL_TESIS', 'PERFIL_TRABAJO_DIRIGIDO']],
  ['DEFENSA_PRIVADA', 'Defensa privada', 'DEFENSA_PRIVADA'],
  ['DEFENSA_PUBLICA', 'Defensa pública', 'DEFENSA_PUBLICA'],
]

function DefenseOperationDialog({ operation, stages, quorum, onSubmit, onClose }) {
  const [type, setType] = useState('')
  const [mode, setMode] = useState('PRESENCIAL')
  const activeParticipants = (operation.defense?.participantes || []).filter((participant) => participant.activo !== false)
  const pendingParticipants = activeParticipants.filter((participant) => participant.presente === null || participant.presente === undefined)
  const [selectedAttendance, setSelectedAttendance] = useState(() => new Set(pendingParticipants.map((participant) => String(participant.id))))
  const titles = { programar: operation.programmingContext?.title || 'Programar defensa', iniciar: 'Iniciar defensa', finalizar: 'Finalizar defensa', suspender: 'Suspender defensa', cancelar: 'Cancelar defensa', reprogramar: 'Reprogramar defensa' }
  const fieldMessage = (name) => {
    const value = operation.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  const expectedStage = DEFENSE_TYPES.find(([value]) => value === type)?.[2]
  const compatibleStages = stages.filter((stage) => (Array.isArray(expectedStage) ? expectedStage : [expectedStage]).includes(stage.codigo) && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado) && stage.activo !== false)
  const disabled = operation.submitting
  const error = (name) => fieldMessage(name) && <span id={`defense-${name}-error`} role="alert" className="mt-1 block text-sm text-red-600">{fieldMessage(name)}</span>
  const submit = (event) => {
    if (operation.action !== 'iniciar') return onSubmit(event)
    const decisions = pendingParticipants.map((participant) => ({
      participante: participant.id,
      presente: selectedAttendance.has(String(participant.id)),
    }))
    return onSubmit(event, decisions)
  }

  return <Modal title={titles[operation.action]} onClose={onClose}>
    <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
      {operation.action === 'programar' ? <>
        {operation.programmingContext ? <>
          <input type="hidden" name="tipo_evento" value={operation.programmingContext.tipoEvento} />
          <input type="hidden" name="seguimiento_etapa" value={operation.programmingContext.seguimientoEtapa} />
          <dl className="grid gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950 sm:grid-cols-2"><div><dt className="text-slate-500">Defensa a programar</dt><dd className="mt-1 font-semibold">{operation.programmingContext.typeLabel}</dd></div><div><dt className="text-slate-500">Etapa</dt><dd className="mt-1 font-semibold">{operation.programmingContext.stageLabel}</dd></div>{operation.programmingContext.anticipationLabel && <div><dt className="text-slate-500">Anticipación mínima informada</dt><dd className="mt-1 font-semibold">{operation.programmingContext.anticipationLabel}</dd></div>}</dl>
        </> : <>
          <p className="text-sm">La postulación se toma de este expediente. El intento será determinado por el backend.</p>
          <label className="text-sm">Tipo de defensa<select name="tipo_evento" value={type} onChange={(event) => setType(event.target.value)} required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un tipo</option>{DEFENSE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('tipo_evento')}</label>
          <label className="text-sm">Etapa compatible<select name="seguimiento_etapa" required disabled={disabled || !type} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una etapa</option>{compatibleStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.nombre} — intento {stage.numero_intento}</option>)}</select>{error('seguimiento_etapa')}</label>
          {type && compatibleStages.length === 0 && <p role="status" className="text-sm text-amber-700">No existe una etapa compatible en proceso u observada.</p>}
        </>}
        <label className="text-sm">Fecha y hora programada<input name="fecha_programada" type="datetime-local" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('fecha_programada')}</label>
        <label className="text-sm">Modalidad técnica<select name="modalidad_evento" value={mode} onChange={(event) => setMode(event.target.value)} disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="MIXTA">Mixta</option></select></label>
        {(mode === 'PRESENCIAL' || mode === 'MIXTA') && <label className="text-sm">Lugar<input name="lugar" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('lugar')}</label>}
        {(mode === 'VIRTUAL' || mode === 'MIXTA') && <label className="text-sm">Enlace virtual<input name="enlace_virtual" type="url" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('enlace_virtual')}</label>}
        <label className="text-sm">Observaciones (opcional)<textarea name="observaciones" disabled={disabled} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
        <details className="overflow-hidden rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Información institucional</summary>
          <aside role="note" className="border-t border-amber-300 p-3 text-sm">Virtual y mixta son modalidades técnicas y no acreditan autorización normativa.</aside>
        </details>
      </> : <>
        {operation.action === 'iniciar' ? <>
          <p className="text-sm">Confirma los participantes presentes antes de iniciar la defensa.</p>
          {activeParticipants.length === 0 ? <p className="rounded-lg border p-3 text-sm text-slate-600">No hay participantes activos incorporados a esta defensa.</p> : <fieldset disabled={disabled} className="space-y-2"><legend className="sr-only">Participantes y asistencia</legend>{activeParticipants.map((participant) => {
            const role = participant.rol_display || participant.rol_evento || 'Rol no registrado'
            const name = participant.usuario_nombre || 'Usuario no disponible'
            if (participant.presente === true || participant.presente === false) {
              return <div key={participant.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{name}</p><p className="text-slate-500">{role}</p><p className="mt-1 font-medium">Asistencia ya registrada · {participant.presente ? 'Presente' : 'Ausente'}</p></div>
            }
            const id = String(participant.id)
            return <label key={participant.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" aria-label={`${name} — ${role}`} checked={selectedAttendance.has(id)} disabled={disabled} onChange={() => setSelectedAttendance((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })} /><span><span className="block font-semibold">{name}</span><span className="block text-slate-500">{role}</span><span className="block text-slate-500">Pendiente de registrar</span></span></label>
          })}</fieldset>}
          {activeParticipants.some((participant) => participant.presente === null || participant.presente === undefined) && <p className="text-sm text-slate-500">Desmarca únicamente a quienes no se encuentren presentes.</p>}
        </> : <p className="text-sm">Confirma la acción sobre el evento técnico seleccionado.</p>}
        {operation.action === 'finalizar' && <p className="rounded-lg border p-3 text-sm">Quórum técnico confirmado por backend: <strong>{quorum.data?.valido ? 'válido' : 'no válido'}</strong>. Finalizar no registra resultado académico, acta firmada ni cierre universitario.</p>}
        {operation.action === 'reprogramar' && <label className="text-sm">Nueva fecha y hora<input name="nueva_fecha" type="datetime-local" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('nueva_fecha')}</label>}
        {['suspender', 'cancelar', 'reprogramar'].includes(operation.action) && <label className="text-sm">Motivo<textarea aria-label="Motivo" name="motivo" required disabled={disabled} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('motivo')}</label>}
      </>}
      {error('non_field_errors')}{error('detail')}
      {operation.error && <p role="alert" className="text-red-600">{operation.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={disabled}>{disabled ? 'Procesando…' : operation.action === 'programar' ? operation.programmingContext?.actionLabel || 'Programar defensa' : operation.action === 'iniciar' ? 'Iniciar defensa' : 'Confirmar'}</Button><Button type="button" variant="secondary" disabled={disabled} onClick={onClose}>Cancelar</Button></div>
    </form>
  </Modal>
}

function EvaluationData({ evaluation }) {
  const consensus = evaluation.modalidad_registro === 'CONSENSO' && !evaluation.evaluador_nombre
  const isRawGrade = evaluation.semantica_nota === 'BRUTA_100'
  const isLegacyGrade = evaluation.semantica_nota === 'LEGACY_PONDERADA'
  const gradeScale = isRawGrade ? '100' : isLegacyGrade ? evaluation.ponderacion : null
  const gradeLabel = isRawGrade ? 'Calificación bruta' : 'Nota'
  return <div className="space-y-3"><dl className="grid gap-2 text-sm sm:grid-cols-2"><Info label="Tipo" value={evaluation.tipo_display || evaluation.tipo_evaluacion} /><Info label="Resultado académico" value={evaluation.resultado_cualitativo || 'No registrado'} /><Info label={gradeLabel} value={evaluation.nota_numerica == null ? 'No registrada' : `${evaluation.nota_numerica}${gradeScale ? ` / ${gradeScale}` : ''}`} />{consensus && <Info label="Evaluación" value="Consenso del tribunal" />}{isLegacyGrade && <Info label="Escala" value="Registro con escala anterior" />}</dl><details className="overflow-hidden rounded-lg border"><summary className="cursor-pointer p-3 text-sm font-semibold">Detalles de la evaluación</summary><dl className="grid gap-2 border-t p-3 text-sm sm:grid-cols-2">{!consensus && <Info label="Evaluador" value={evaluation.evaluador_nombre || 'No registrado'} />}<Info label="Modalidad de registro" value={evaluation.modalidad_registro_display || evaluation.modalidad_registro} /><Info label="Semántica de nota" value={evaluation.semantica_nota || 'No registrada'} /><Info label="Ponderación" value={evaluation.ponderacion ?? 'No registrada'} /><Info label="Aporte" value={evaluation.aporte_ponderado ?? 'No registrado'} /></dl></details></div>
}

function TechnicalCounts({ title, values }) {
  const entries = Object.entries(values || {}).filter(([role, count]) => {
    const normalizedRole = String(role).trim()
    return normalizedRole && normalizedRole !== '-' && count !== null && count !== undefined && count !== '' && count !== '-'
  })
  if (entries.length === 0) return null
  return <div><h4 className="font-semibold">{title}</h4><ul className="mt-1 flex flex-wrap gap-2">{entries.map(([role, count]) => <li key={role} className="rounded border px-2 py-1">{formatTechnicalRole(role)}: {count}</li>)}</ul></div>
}

function sameTechnicalCounts(left, right) {
  const normalize = (value) => Object.entries(value || {})
    .map(([role, count]) => [String(role).trim().toUpperCase(), normalizeTechnicalCount(count)])
    .sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
}

function normalizeTechnicalCount(value) {
  if (value === null || value === undefined || value === '') return value
  const numeric = Number(value)
  return Number.isNaN(numeric) ? String(value).trim() : numeric
}

function formatTechnicalRole(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function formatDefenseDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function DocumentsCard({ documents, page, onPage, onRetry, onSelect, canUpload, onUpload }) {
  const rows = documents.data?.results || []
  return (
    <Card className="overflow-hidden" aria-labelledby="documentos-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="documentos-title" className="text-xl font-bold">Documentos</h2>{canUpload && <Button onClick={onUpload}>Cargar documento</Button>}</div>
      <p className="mt-1 text-sm text-slate-500">Consulta y gestiona los documentos vinculados a tu proceso académico.</p>
      {documents.loading && <p role="status" className="mt-4 text-sm">Cargando documentos…</p>}
      {documents.error && <SectionError message={documents.error} label="Reintentar documentos" onRetry={onRetry} />}
      {!documents.loading && !documents.error && rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No se registraron documentos.</p>}
      {!documents.loading && !documents.error && rows.length > 0 && <><ul className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">{rows.map((document) => (
        <li key={document.id} className="min-w-0 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><h3 className="break-words font-semibold">{document.estado_codigo === 'APR' ? '✓ ' : '• '}{document.tipo_documento_nombre || 'Tipo no registrado'}</h3><p className="mt-1 text-sm text-slate-500">Estado: {document.estado_nombre || 'No registrado'}{document.requiere_correccion ? ' · Requiere corrección' : ''}</p></div>
            <Button variant="secondary" onClick={() => onSelect(document)}>Ver detalle</Button>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Fecha de carga" value={formatDocumentDate(document.fecha_subida)} />
            <Info label="Fecha de revisión" value={document.fecha_revision ? formatDocumentDate(document.fecha_revision) : 'Pendiente'} />
            <Info label="Corrección" value={document.requiere_correccion ? 'Requerida' : 'No requerida'} />
            <Info label="Versiones" value={document.versiones?.length ?? 0} />
          </dl>
        </li>
      ))}</ul><Pagination count={documents.data.count} page={page} hasNext={Boolean(documents.data.next)} hasPrevious={Boolean(documents.data.previous)} onPage={onPage} /></>}
    </Card>
  )
}

function ReviewDialog({ review, onSubmit, onClose }) {
  const titles = { aprobar: 'Aprobar documento', rechazar: 'Rechazar documento', observar: 'Registrar observación', corregir: 'Marcar observación corregida' }
  const fieldName = review.action === 'rechazar' ? 'motivo' : 'comentario'
  const fieldValue = review.fields?.[fieldName]
  const fieldError = Array.isArray(fieldValue) ? fieldValue.join(' ') : fieldValue
  return <Modal title={titles[review.action]} onClose={onClose}>
    <form className="mt-4 grid gap-4" onSubmit={onSubmit} noValidate>
      {review.action === 'aprobar' && <p className="text-sm">Confirma la aprobación técnica del documento seleccionado.</p>}
      {review.action === 'corregir' && <p className="text-sm">Confirma que la observación seleccionada fue corregida.</p>}
      {(review.action === 'aprobar' || review.action === 'observar') && <label className="text-sm">Comentario {review.action === 'aprobar' && '(opcional)'}<textarea name="comentario" required={review.action === 'observar'} disabled={review.submitting} aria-describedby={fieldError ? 'review-field-error' : undefined} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>}
      {review.action === 'rechazar' && <label className="text-sm">Motivo<textarea name="motivo" required disabled={review.submitting} aria-describedby={fieldError ? 'review-field-error' : undefined} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>}
      {fieldError && <p id="review-field-error" role="alert" className="text-red-600">{fieldError}</p>}
      {review.error && <p role="alert" className="text-red-600">{review.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={review.submitting}>{review.submitting ? 'Procesando…' : 'Confirmar'}</Button><Button type="button" variant="secondary" disabled={review.submitting} onClick={onClose}>Cancelar</Button></div>
    </form>
  </Modal>
}

function SectionError({ message, label, onRetry }) {
  return <div role="alert" className="mt-3 rounded-lg border border-red-200 p-3 text-sm"><p>{message}</p><Button className="mt-3" variant="secondary" onClick={onRetry}>{label}</Button></div>
}

function formatDocumentDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function HistoryCard({ history, page, onPage, onRetry }) {
  const rows = history.data?.results || []
  return (
    <Card className="overflow-hidden" aria-labelledby="historial-title">
      <h2 id="historial-title" className="text-xl font-bold">Historial</h2>
      <p className="mt-1 text-sm text-slate-500">Historial de tu proceso.</p>
      {history.loading && <p role="status" className="mt-4 text-sm">Cargando historial…</p>}
      {history.error && <div role="alert" className="mt-4"><p>{history.error}</p><button className="mt-3 rounded-md border px-3 py-2 font-medium" onClick={onRetry}>Reintentar historial</button></div>}
      {!history.loading && !history.error && rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No se registraron cambios de estado.</p>}
      {!history.loading && !history.error && rows.length > 0 && (
        <>
          <ol className="mt-5 space-y-4">
            {rows.map((item) => <HistoryItem key={item.id} item={item} />)}
          </ol>
          <Pagination
            count={history.data.count}
            page={page}
            hasNext={Boolean(history.data.next)}
            hasPrevious={Boolean(history.data.previous)}
            onPage={onPage}
          />
        </>
      )}
    </Card>
  )
}

function HistoryItem({ item }) {
  return (
    <li className="min-w-0 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className="font-semibold break-words">{item.estado_anterior_nombre || 'Estado inicial'} → {item.estado_nuevo_nombre || 'No registrado'}</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Fecha" value={formatHistoryDate(item.fecha_cambio)} />
        <Info label="Registrado por" value={item.actor_nombre || 'Sistema'} />
      </dl>
      <p className="mt-3 break-words text-sm">{item.comentario?.trim() || 'Sin comentario'}</p>
    </li>
  )
}

function formatHistoryDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function PartialState({ message, onRetry }) {
  return <div role="status" className="mt-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><p>{message}</p><button className="mt-3 rounded-md border px-3 py-2 font-medium" onClick={onRetry}>Reintentar</button></div>
}

function Info({ label, value }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || EMPTY}</dd></div>
}

function BackLink() {
  return (
    <Link className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:hover:bg-slate-800" to="/postulantes">
      Volver a postulaciones
    </Link>
  )
}
