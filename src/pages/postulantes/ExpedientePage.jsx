import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Flag, Info as InfoIcon } from 'lucide-react'
import { PageHeader, DataState } from '../../components/crud/CrudShell'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { humanizeRequirementCode, postulacionesService } from '../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { AuthContext } from '../../context/AuthContext'
import ClosureRequirements from './ClosureRequirements'
import TechnicalClosure from './TechnicalClosure'
import DocumentReviewDictamens from './DocumentReviewDictamens'
import CorrectionConfirmations from './CorrectionConfirmations'
import AcademicConclusion from './AcademicConclusion'
import { STATUS_TONE } from '../../lib/statusTone'
import ExamenGradoAreas from './ExamenGradoAreas'
import ExcelenciaAcademica from './ExcelenciaAcademica'
import Diplomado from './Diplomado'
import TrabajoDirigido from './TrabajoDirigido'
import UploadDialog from '../../components/documentos/UploadDialog'
import DocumentDetailDialog from '../../components/documentos/DocumentDetailDialog'
import { ActorManagementDialog, ActorsCard, AssignmentDialog, PublicAuthoritiesDialog } from './expediente/ActoresTab'
import { AcademicDecisionDialog, AcademicDecisionsCard } from './expediente/DecisionesAcademicas'
import { DefenseOperationDialog, DefensesCard, ProtectedDefenseDetail } from './expediente/DefensasTab'
import { DocumentsCard, ReviewDialog } from './expediente/DocumentosTab'
import { ExpedienteNav } from './expediente/ExpedienteNav'
import { HistoryCard } from './expediente/HistorialTab'
import { InscriptionDocumentsSection, OperationalSummary, StudentProcessView } from './expediente/ResumenTab'
import { TribunalReportDialog, TribunalReviewActions, TribunalReviewReports } from './expediente/RevisionTribunal'
import { BackLink, Info, PartialState, Score, StageMarker, StatusBadge } from './expediente/compartidos'
import { DEFENSE_TYPES, EMPTY, formatAcademicClassification, formatCode, formatStatus, initialsOf, supportsCancelledDefenseRescheduling } from './expediente/reglas'
import { MODALITY_COLOR } from '../../lib/modalityColor'

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

// Tesis con evaluaciones individuales sigue el flujo operativo (con quórum), no el resultado directo.
function hasIndividualThesisEvaluation(defense) {
  return (defense.evaluaciones || []).some((item) => item.modalidad_registro === 'INDIVIDUAL' && !item.es_resultado_final_evento)
}

// En un registro histórico solo hay documentos e historial; el resto se muestra bloqueado.
const HISTORICAL_LOCKED_TABS = new Set(['resumen', 'defensas', 'actores', 'etapas', 'resultado-cierre'])

function expedienteTabFromHash(hash) {
  if (!hash || hash === '#') return 'resumen'
  const id = decodeURIComponent(hash.slice(1))
  return EXPEDIENTE_HASH_TABS[id] || 'resumen'
}

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
  const isProjectFinalDocumentStage = isProjectGrade && currentStage?.codigo === 'DOCUMENTO_FINAL'
  const projectFinalDocumentRequirements = isProjectFinalDocumentStage
    ? [
        { codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final del Proyecto de Grado' },
        { codigo: 'INFORME_FINAL_TUTOR', nombre: 'Informe Final del Tutor', opcional: true },
      ].map(({ codigo, nombre, opcional = false }) => {
        const document = documentRows.find((row) => row.activo !== false && row.tipo_documento_codigo === codigo)
        const currentVersion = document?.versiones?.some((version) => version.es_version_actual && version.activo !== false)
        const approved = Boolean(document && document.estado_codigo === 'APR' && !document.requiere_correccion && currentVersion)
        const status = !document
          ? (opcional ? 'Súbelo ahora: el cierre lo pide' : 'No presentado')
          : document.requiere_correccion || ['OBS', 'REC'].includes(document.estado_codigo)
            ? 'Requiere corrección'
            : document.estado_codigo !== 'APR'
              ? 'Pendiente de revisión administrativa'
              : !currentVersion
                ? 'Sin versión vigente'
                : 'Aprobado'
        return { tipo: 'DOCUMENTO', codigo, nombre, cumplido: approved, opcional, estado_display: status }
      })
    : []
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
  // En Resumen, "Siguiente acción" ya tiene el botón para aprobar la etapa: la cabecera no lo repite
  // (salvo que la aprobación haya fallado por faltantes, cuando el Resumen muestra esos faltantes).
  const approveInSummary = canApproveStage && activeTab === 'resumen' && !isHistorical
    && !(Array.isArray(stageApproval.fields?.faltantes) && stageApproval.fields.faltantes.length > 0)
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
  // Cabecera: junto a la etapa actual va el estado de la etapa; el de la postulación, en los datos.
  const showStageStatusInHero = !isHistorical && Boolean(currentStage?.estado)
  // Documentos que pide la etapa actual cuando su siguiente paso es completar documentos.
  const stageDocumentRequirements = !isHistorical && actionOrientation?.siguiente_accion?.codigo === 'COMPLETAR_DOCUMENTOS'
    ? (actionOrientation.requisitos || [])
      .filter((item) => ['OPERATIVO', 'DOCUMENTO'].includes(item.tipo) && item.bloquea_siguiente_accion !== false)
      .map((item) => {
        const code = String(item.codigo || '').split(':').pop()
        const uploaded = documentRows.some((document) => document.activo !== false && document.tipo_documento_codigo === code)
        return { key: `${item.tipo}-${item.codigo}`, nombre: item.nombre || humanizeRequirementCode(item.codigo), state: item.cumplido ? 'done' : uploaded ? 'review' : 'missing' }
      })
    : []
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

  // Paso para empezar: preparar las etapas (expediente nuevo) o iniciar la etapa pendiente. En la
  // pestaña Resumen se muestra en "Siguiente acción"; en las demás, en la cabecera (nunca en ambos).
  const plannedStageCount = (data.capacidades?.etapas || []).length
  const modalityName = detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre
  const currentStageName = currentStage ? currentStage.nombre || formatCode(currentStage.codigo) : ''
  const startStep = isHistorical ? null : canInitializeFlow ? {
    key: 'init',
    title: isProjectGrade ? 'Iniciar el proceso' : 'Preparar el expediente',
    label: flowInitialization.submitting
      ? (isProjectGrade ? 'Iniciando proceso...' : 'Preparando…')
      : (isProjectGrade ? 'Iniciar proceso de Proyecto de Grado' : 'Preparar etapas'),
    heroDescription: isProjectGrade
      ? 'Registra la Inscripción y deja Perfil de Proyecto listo como siguiente etapa.'
      : `Se crean ${plannedStageCount ? `las ${plannedStageCount} etapas` : 'las etapas'}${modalityName ? ` de ${modalityName}` : ''}; ninguna se inicia ni se aprueba todavía.`,
    disabled: flowInitialization.submitting,
    onClick: initializeFlow,
    error: flowInitialization.error,
  } : canStartCurrentStage ? {
    key: 'start',
    title: `Iniciar ${currentStageName}`,
    label: stageInitialization.submitting ? 'Iniciando…' : `Iniciar ${currentStageName}`,
    heroDescription: null,
    disabled: stageInitialization.submitting,
    onClick: startCurrentStage,
    error: stageInitialization.error,
  } : null
  if (startStep) startStep.description = startStep.key === 'init' ? startStep.heroDescription : 'La etapa está lista para iniciarse.'
  const startStepInSummary = Boolean(startStep) && activeTab === 'resumen'

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
      || (isThesisGrade && !hasIndividualThesisEvaluation(defense) && ['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))) {
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
  // Revisión de Tribunal Previa (Proyecto de Grado): el paso que toca va en "Siguiente acción" del
  // Resumen con su botón (antes quedaban sueltos debajo de la tarjeta). El servidor no manda
  // orientación para esta etapa, así que se arma con el estado de la revisión.
  const reviewStep = !isHistorical && isCurrentProjectTribunalReview && tribunalReviewStage && !currentOrientation?.siguiente_accion ? (() => {
    const { canRegister, canUpdate, currentReport, updateRequired } = tribunalReviewState
    if (updateRequired && canUpdate) {
      return { key: 'review-update', title: 'Actualizar informe del tribunal', description: currentOrientation?.mensaje || 'El informe registrado debe actualizarse.', label: 'Actualizar informe del tribunal', onClick: () => openTribunalReportUpdate(currentReport) }
    }
    if (currentEvidenceVersions.length === 0 && canUpload) {
      return {
        key: 'review-evidence', title: 'Cargar el Informe de Evaluación del Tribunal', description: 'Es el documento del tribunal que respalda la revisión del Documento Final.', label: 'Cargar Informe de Evaluación', onClick: openTribunalEvidenceUpload,
        secondary: canRegister ? { label: 'Registrar informe del tribunal', onClick: onRegisterTribunalReport } : null,
      }
    }
    if (canRegister) {
      return { key: 'review-register', title: 'Registrar informe del tribunal', description: 'Registra el resultado de la revisión del tribunal sobre el Documento Final.', label: 'Registrar informe del tribunal', onClick: onRegisterTribunalReport }
    }
    return null
  })() : null
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
      {effectiveResult.data?.clasificacion && <p className="expediente-classification"><span className="expediente-status" data-tone={['POSTERGADO', 'REPROBADO'].includes(effectiveResult.data.clasificacion) ? 'warning' : 'success'}>{formatStatus(formatAcademicClassification(effectiveResult.data.clasificacion))}</span></p>}
      {effectiveResult.data?.limitacion_normativa && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{effectiveResult.data.limitacion_normativa}</p>}
    </Card>
    <AcademicConclusion postulacion={detalle.id} modalidadCodigo={detalle.modalidad_detalle?.codigo} resultado={resultado} defensaPublicaAprobada={latestPublicStage?.estado === 'APROBADA'} actaValida={thesisConclusionOrientation?.actaValida} concluida={isConcluded} canManage={canManageClosure} onChanged={() => { setRevision((value) => value + 1); setHistoryRevision((value) => value + 1) }} />
  </>
  const closureSection = cierreSoportado && <details id="condiciones-tecnicas" open={closureDetailsOpen} className="expediente-closure scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
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
  // En el Cierre Documental (última etapa) ya no hay etapas posteriores que consultar.
  const isLastStage = currentStage?.codigo === 'CIERRE_DOCUMENTAL'
  const futureSections = isProjectGrade && !isLastStage && (!stageUi.review || !stageUi.academicResult || !stageUi.closure || !stageUi.corrections)
    && <details className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <summary className="expediente-more-summary cursor-pointer list-none px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
        <span className="min-w-0">
          <span className="block text-lg font-bold">Información de etapas posteriores</span>
          <span className="mt-1 block text-sm text-slate-500">Consulta la revisión, resultados y cierre cuando esas etapas sean relevantes.</span>
        </span>
        <span className="expediente-more-toggle">Ver información futura</span>
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
  const historicalTab = ['documentos', 'historial'].includes(activeTab) ? activeTab : 'documentos'
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
    <section className="expediente-root mx-auto max-w-6xl" onClick={handleSectionClick}>
      <div className="expediente-layout">
      {contextualNotice}

      <div className="expediente-head">
      <Card className="expediente-hero animate-enter" style={{ '--stagger': 0 }}>
        <div className="expediente-hero-top">
          <BackLink />
          <span className="expediente-avatar" aria-hidden="true">{initialsOf(student?.nombre_completo)}</span>
          <div className="min-w-0 flex-1">
            <h1 className="expediente-hero-name">{student ? formatStudentLabel(student) : EMPTY}</h1>
            <div className="expediente-hero-meta">
              <p className="expediente-chip">
                <span className="expediente-chip-dot" aria-hidden="true" style={{ background: `var(${MODALITY_COLOR[detalle.modalidad_detalle?.codigo || flujo.modalidad?.codigo] || '--primary'})` }} />
                {detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre || 'Postulación'}
              </p>
              <p>{period ? formatPeriodoLabel(period) : EMPTY}</p>
              {isHistorical && <p className="expediente-chip expediente-chip--info">Registro histórico</p>}
              {showStageStatusInHero && <p className="expediente-hero-state">Postulación <StatusBadge compact value={detalle.estado_actual_detalle?.nombre || detalle.estado_actual_detalle?.codigo} positive={isConcluded} tone={STATUS_TONE[detalle.estado_actual_detalle?.codigo]} /></p>}
            </div>
          </div>
          {!isHistorical && <div className="expediente-hero-stage">
            <span className="expediente-hero-stage-icon" aria-hidden="true"><Flag className="h-[18px] w-[18px]" strokeWidth={1.9} /></span>
            <dl className="min-w-0 flex-1">
              <Info label="Etapa actual" value={currentStage?.nombre || ((flujo.etapas || []).length ? 'Sin etapa pendiente' : 'Etapas por preparar')} />
            </dl>
            {canApproveStage && !approveInSummary && (
              <Button type="button" className="shrink-0" disabled={stageApproval.submitting} onClick={approveCurrentStage}>
                {stageApproval.submitting ? 'Procesando…' : 'Aprobar etapa'}
              </Button>
            )}
          </div>}
          <div className="expediente-hero-aside">
            {showStageStatusInHero
              ? <StatusBadge value={currentStage.estado_display || formatStatus(currentStage.estado)} positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(currentStage.estado)} tone={STATUS_TONE[currentStage.estado]} />
              : <StatusBadge value={detalle.estado_actual_detalle?.nombre || detalle.estado_actual_detalle?.codigo} positive={isConcluded} tone={STATUS_TONE[detalle.estado_actual_detalle?.codigo]} />}
          </div>
        </div>
        {isHistorical ? (
          <p className="expediente-note">
            <InfoIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            Este expediente corresponde a un registro histórico y no representa un flujo operativo activo.
          </p>
        ) : (
          <>
            <h2 className="sr-only">Estado actual de tu proceso académico</h2>
            <div className="expediente-hero-actions">
            {startStep && !startStepInSummary && (
              <div className="mt-5">
                <Button disabled={startStep.disabled} onClick={startStep.onClick}>{startStep.label}</Button>
                {startStep.heroDescription && <p className="mt-2 text-sm text-slate-500">{startStep.heroDescription}</p>}
                {startStep.error && <p role="alert" className="mt-2 text-sm text-red-600">{startStep.error}</p>}
              </div>
            )}
            {startStep?.key !== 'init' && flowInitialization.error && <p role="alert" className="mt-3 text-sm text-red-600">{flowInitialization.error}</p>}
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
      {!isHistorical && (
        <div className="metric-featured expediente-progress-tile animate-enter" style={{ '--stagger': 1 }}>
          <p className="text-sm font-semibold">Avance de tu proceso</p>
          <p className="expediente-progress-value">{safeProgress === null ? EMPTY : `${safeProgress}%`}</p>
          {safeProgress !== null && (
            <progress className="expediente-progress" max="100" value={safeProgress} aria-label="Avance de tu proceso">
              {safeProgress}%
            </progress>
          )}
        </div>
      )}
      </div>

      <aside className="expediente-side">
      <ExpedienteNav activeTab={isHistorical ? historicalTab : activeTab} hasModalityTab={hasModalityTab} hasOutcomeTab={hasOutcomeTab || isHistorical} lockedTabs={isHistorical ? HISTORICAL_LOCKED_TABS : null} onActivate={(sectionId) => navigateToSection(sectionId)} />
      </aside>
      <div className="expediente-main">
      <div id="panel-resumen" role="tabpanel" aria-labelledby="expediente-tab-resumen" data-expediente-panel="resumen" hidden={!isHistorical && activeTab !== 'resumen'}>
        {!isHistorical && <div id="resumen" className="scroll-mt-24">
          <OperationalSummary
            startStep={startStepInSummary ? startStep : reviewStep}
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
            </> : isProjectFinalDocumentStage && !documents.loading && !documents.error ? <InscriptionDocumentsSection
              embedded
              requirements={projectFinalDocumentRequirements}
              completed={projectFinalDocumentRequirements.filter((item) => !item.opcional && item.cumplido).length}
              total={projectFinalDocumentRequirements.filter((item) => !item.opcional).length}
              title="Requisitos de Documento Final"
              documentationTitle="Documentos de la etapa"
              titleId="documento-final-requirements-title"
              documentationTitleId="documento-final-documents-title"
            /> : null}
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
        {!isHistorical && isCurrentProjectTribunalReview && !reviewStep && reviewActions}
      </div>

      <div id="panel-documentos" role="tabpanel" aria-labelledby="expediente-tab-documentos" data-expediente-panel="documentos" hidden={(isHistorical ? historicalTab : activeTab) !== 'documentos'}>
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
          stageDocuments={stageDocumentRequirements.length ? { stageName: currentStage?.nombre || 'esta etapa', items: stageDocumentRequirements } : projectFinalDocumentRequirements.length ? { stageName: currentStage?.nombre || 'esta etapa', items: projectFinalDocumentRequirements.map((item) => ({ key: item.codigo, nombre: item.nombre, state: item.cumplido ? 'done' : item.opcional && item.estado_display === 'Súbelo ahora: el cierre lo pide' ? 'optional' : item.estado_display === 'No presentado' ? 'missing' : 'review' })) } : null}
        /></div>
        {!isHistorical && (flujo.etapas || []).filter((stage) => ['REVISION_TUTOR', 'REVISION_TRIBUNAL'].includes(stage.codigo) && stage.estado !== 'PENDIENTE').map((stage) => <DocumentReviewDictamens key={stage.id} stage={stage} documents={documents} assignments={activeActors} canManage={canManageTribunalReports} contextualPostulacion={detalle.id} onRegisterContextualOpen={supportsContextualDictamen && String(stage.id) === String(currentStage.id) ? registerDictamenOpener : undefined} onChanged={async () => { setDocumentsRevision((value) => value + 1); setRevision((value) => value + 1) }} />)}
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
        {!isHistorical && <Card id="etapas" className="expediente-card scroll-mt-24 overflow-hidden" aria-labelledby="etapas-flujo-title">
          <h2 id="etapas-flujo-title" className="text-xl font-bold">Etapas del flujo académico</h2>
          {(flujo.etapas || []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Todavía no se prepararon las etapas de este expediente.</p>
          ) : (
            <ol className="expediente-stages">
              {flujo.etapas.map((stage, index) => (
                <li key={stage.id} className="expediente-stage animate-row-in" data-state={stage.estado} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                  <StageMarker state={stage.estado} />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{stage.nombre || stage.codigo}</strong>
                      <StatusBadge value={stage.estado_display || formatStatus(stage.estado)} compact positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(stage.estado)} tone={STATUS_TONE[stage.estado]} />
                    </div>
                    {Number(stage.numero_intento) > 1 && <p className="mt-1 text-slate-500">Intento {stage.numero_intento}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>}
      </div>

      <div id="panel-historial" role="tabpanel" aria-labelledby="expediente-tab-historial" data-expediente-panel="historial" hidden={(isHistorical ? historicalTab : activeTab) !== 'historial'}>
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
        {!isHistorical && stageUi.closure && closureSection}
        {!isHistorical && futureSections}
      </div>}

      </div>
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

function formatClosureSummary(cierre) {
  if (!cierre) return 'Estado de cierre técnico no disponible.'
  const conditions = cierre.condiciones_faltantes?.length || 0
  const deliveries = cierre.entregas_faltantes?.length || 0
  const documents = cierre.documentos_faltantes?.length || 0
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
  return `${count(conditions, 'condición pendiente', 'condiciones pendientes')} · ${count(deliveries, 'entrega pendiente', 'entregas pendientes')} · ${count(documents, 'documento pendiente', 'documentos pendientes')}`
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

const PUBLIC_DEFENSE_AUTHORITY_ROLES = ['PRESIDENTE', 'SECRETARIO']

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
