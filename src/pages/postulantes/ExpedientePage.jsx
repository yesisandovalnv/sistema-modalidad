import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, DataState, Modal } from '../../components/crud/CrudShell'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/reports/ReportComponents'
import { postulacionesService } from '../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'
import { AuthContext } from '../../context/AuthContext'

const EMPTY = 'No registrado'
const DEFENSE_WARNING = 'Los datos de defensa, quórum y evaluación mostrados por el sistema son registros técnicos y no sustituyen convocatoria formal, acta firmada, legalización ni resultado académico institucional.'
const CONTRACT_WARNINGS = [
  'La aprobación y originalidad del tema no están certificadas automáticamente por el sistema.',
  'La defensa privada representa el 30 %, pero la normativa disponible no define una nota numérica reproducible para calcular ese aporte.',
  'La clasificación final institucional permanece pendiente.',
  'La cantidad oficial de ejemplares permanece pendiente de validación institucional.',
  'Los proyectos grupales no están soportados actualmente.',
  'Los plazos reglamentarios no se calculan automáticamente.',
  'El cierre técnico o documental no equivale a legalización o cierre universitario oficial.',
]

export default function ExpedientePage() {
  const { id } = useParams()
  const auth = useContext(AuthContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [history, setHistory] = useState({ data: null, loading: true, error: '' })
  const [historyRevision, setHistoryRevision] = useState(0)
  const [historyView, setHistoryView] = useState({ id: null, page: 1 })
  const historyPage = String(historyView.id) === String(id) ? historyView.page : 1
  const [activeActors, setActiveActors] = useState({ data: null, loading: true, error: '' })
  const [historicalActors, setHistoricalActors] = useState({ data: null, loading: true, error: '' })
  const [actorsView, setActorsView] = useState({ id: null, activePage: 1, historicalPage: 1 })
  const [activeActorsRevision, setActiveActorsRevision] = useState(0)
  const [historicalActorsRevision, setHistoricalActorsRevision] = useState(0)
  const activeActorsPage = String(actorsView.id) === String(id) ? actorsView.activePage : 1
  const historicalActorsPage = String(actorsView.id) === String(id) ? actorsView.historicalPage : 1
  const [documents, setDocuments] = useState({ data: null, loading: true, error: '' })
  const [documentsView, setDocumentsView] = useState({ id: null, page: 1 })
  const [documentsRevision, setDocumentsRevision] = useState(0)
  const documentsPage = String(documentsView.id) === String(id) ? documentsView.page : 1
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [versions, setVersions] = useState({ data: null, loading: false, error: '' })
  const [versionsPage, setVersionsPage] = useState(1)
  const [versionsRevision, setVersionsRevision] = useState(0)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [observations, setObservations] = useState({ data: null, loading: false, error: '' })
  const [observationsPage, setObservationsPage] = useState(1)
  const [observationsRevision, setObservationsRevision] = useState(0)
  const [documentTypes, setDocumentTypes] = useState({ data: [], loading: false, error: '' })
  const [upload, setUpload] = useState(null)
  const uploadController = useRef(null)
  const [review, setReview] = useState(null)
  const reviewController = useRef(null)
  const [defenses, setDefenses] = useState({ data: null, loading: true, error: '' })
  const [defensesView, setDefensesView] = useState({ id: null, page: 1 })
  const [defensesRevision, setDefensesRevision] = useState(0)
  const defensesPage = String(defensesView.id) === String(id) ? defensesView.page : 1
  const [selectedDefense, setSelectedDefense] = useState(null)
  const [quorum, setQuorum] = useState({ data: null, loading: false, error: '' })
  const quorumController = useRef(null)
  const [defenseOperation, setDefenseOperation] = useState(null)
  const defenseOperationController = useRef(null)

  useEffect(() => {
    uploadController.current?.abort()
    reviewController.current?.abort()
    setUpload(null)
    setReview(null)
    setSelectedDocument(null)
    setSelectedVersion(null)
    quorumController.current?.abort()
    quorumController.current = null
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation(null)
    setSelectedDefense(null)
    setQuorum({ data: null, loading: false, error: '' })
  }, [id])

  useEffect(() => () => {
    uploadController.current?.abort()
    reviewController.current?.abort()
    quorumController.current?.abort()
    defenseOperationController.current?.abort()
  }, [])

  useEffect(() => {
    reviewController.current?.abort()
    reviewController.current = null
    setReview(null)
  }, [selectedDocument?.id, selectedVersion?.id])

  const load = useCallback(async (signal) => {
    setData(null)
    setLoading(true)
    setError('')
    try {
      setData(await postulacionesService.obtenerExpediente(id, signal))
    } catch (requestError) {
      if (!requestError.canceled) setError(requestError.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, revision])

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
    if (!selectedDocument) return undefined
    const controller = new AbortController()
    setVersions({ data: null, loading: true, error: '' })
    postulacionesService.obtenerVersiones(selectedDocument.id, versionsPage, controller.signal)
      .then((versionData) => setVersions({ data: versionData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setVersions({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [selectedDocument, versionsPage, versionsRevision])

  useEffect(() => {
    if (!selectedVersion) return undefined
    const controller = new AbortController()
    setObservations({ data: null, loading: true, error: '' })
    postulacionesService.obtenerObservaciones(selectedVersion.id, observationsPage, controller.signal)
      .then((observationData) => setObservations({ data: observationData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setObservations({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [selectedVersion, observationsPage, observationsRevision])

  if (loading || error || !data) {
    return (
      <section className="mx-auto max-w-5xl space-y-5">
        <PageHeader title="Expediente de Proyecto de Grado" description="Resumen técnico de la postulación." />
        <DataState loading={loading} error={error} empty={!loading && !error && !data} onRetry={() => setRevision((value) => value + 1)} />
        <BackLink />
      </section>
    )
  }

  const { detalle, flujo, resultado, cierre } = data
  const student = detalle.estudiante_detalle
  const period = detalle.periodo_detalle
  const currentStage = flujo.etapa_actual
  const progress = flujo.porcentaje_avance === null || flujo.porcentaje_avance === undefined
    ? null
    : Number(flujo.porcentaje_avance)
  const safeProgress = progress !== null && Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : null
  const roleCode = (auth?.roleCode || auth?.user?.rol?.codigo || '').toUpperCase()
  const isOwner = String(auth?.user?.id) === String(detalle.estudiante_detalle?.id)
  const isStaff = ['ADM', 'ADMIN', 'ADMINISTRACION', 'ADMINISTRADOR'].includes(roleCode)
  const canUpload = auth?.hasPermission?.('puede_cargar_documentos') === true && (isOwner || isStaff)
  const canReview = auth?.hasPermission?.('puede_gestionar_documentos') === true
  const canManageDefenses = auth?.hasPermission?.('puede_gestionar_defensas') === true

  const openUpload = async (document = null) => {
    uploadController.current?.abort()
    const controller = new AbortController()
    uploadController.current = controller
    setUpload({ document, submitting: false, fields: {}, error: '', success: '' })
    if (document) return
    setDocumentTypes((current) => ({ ...current, loading: true, error: '' }))
    try {
      const catalog = await postulacionesService.obtenerTiposDocumento(controller.signal)
      const rows = (catalog.results || catalog || []).filter((type) => type.activo !== false)
      setDocumentTypes({ data: rows, loading: false, error: '' })
    } catch (requestError) {
      if (!requestError.canceled) setDocumentTypes({ data: [], loading: false, error: requestError.message })
    }
  }

  const closeUpload = () => {
    uploadController.current?.abort()
    uploadController.current = null
    setUpload(null)
  }

  const submitUpload = async (event) => {
    event.preventDefault()
    if (!upload || upload.submitting) return
    const form = event.currentTarget.elements
    const file = form.archivo?.files?.[0]
    const typeId = upload.document?.tipo_documento || form.tipo_documento_id?.value
    if (!file || typeof file.size !== 'number' || file.size === 0 || !file.name) {
      setUpload((current) => ({ ...current, fields: { archivo: ['Selecciona un archivo no vacío.'] }, error: '' }))
      return
    }
    const controller = new AbortController()
    uploadController.current?.abort()
    uploadController.current = controller
    setUpload((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      await postulacionesService.cargarDocumento({ postulacionId: detalle.id, tipoDocumentoId: typeId, archivo: file }, controller.signal)
      setUpload((current) => ({ ...current, submitting: false, success: current.document ? 'Nueva versión cargada' : 'Documento cargado' }))
      setDocumentsRevision((value) => value + 1)
      if (upload.document) setVersionsRevision((value) => value + 1)
    } catch (requestError) {
      if (!requestError.canceled) setUpload((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
    }
  }

  const openReview = (action, observation = null) => {
    reviewController.current?.abort()
    reviewController.current = new AbortController()
    setReview({ action, observation, submitting: false, fields: {}, error: '' })
  }

  const loadQuorum = (defense) => {
    quorumController.current?.abort()
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
    setSelectedDefense(defense)
    loadQuorum(defense)
  }

  const closeDefense = () => {
    quorumController.current?.abort()
    quorumController.current = null
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation(null)
    setSelectedDefense(null)
    setQuorum({ data: null, loading: false, error: '' })
  }

  const openDefenseOperation = (action, defense = null) => {
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation({ action, defense, submitting: false, fields: {}, error: '' })
  }

  const closeDefenseOperation = () => {
    defenseOperationController.current?.abort()
    defenseOperationController.current = null
    setDefenseOperation(null)
  }

  const submitDefenseOperation = async (event) => {
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
      if (action === 'iniciar') updated = await postulacionesService.iniciarDefensa(defenseOperation.defense.id, controller.signal)
      if (action === 'finalizar') updated = await postulacionesService.finalizarDefensa(defenseOperation.defense.id, controller.signal)
      if (action === 'suspender') updated = await postulacionesService.suspenderDefensa(defenseOperation.defense.id, motivo, controller.signal)
      if (action === 'cancelar') updated = await postulacionesService.cancelarDefensa(defenseOperation.defense.id, motivo, controller.signal)
      if (action === 'reprogramar') updated = await postulacionesService.reprogramarDefensa(defenseOperation.defense.id, nuevaFecha, motivo, controller.signal)
      defenseOperationController.current = null
      setDefenseOperation(null)
      if (updated && selectedDefense && String(updated.id) === String(selectedDefense.id)) {
        setSelectedDefense(updated)
        if (updated.estado === 'EN_CURSO') loadQuorum(updated)
      }
      setDefensesRevision((value) => value + 1)
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
      setDocumentsRevision((current) => current + 1)
      setVersionsRevision((current) => current + 1)
      if (selectedVersion) setObservationsRevision((current) => current + 1)
    } catch (requestError) {
      if (!requestError.canceled) setReview((current) => ({ ...current, submitting: false, fields: requestError.fields || {}, error: requestError.message }))
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Expediente de Proyecto de Grado"
        description={`Postulación ${detalle.codigo || EMPTY}`}
        action={<BackLink />}
      />

      <Card>
        <h2 className="text-xl font-bold">Resumen técnico</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Código" value={detalle.codigo} />
          <Info label="Estudiante" value={student ? formatStudentLabel(student) : EMPTY} />
          <Info label="Modalidad" value={detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre} />
          <Info label="Gestión y semestre" value={period ? formatPeriodoLabel(period) : EMPTY} />
          <Info label="Estado técnico general" value={detalle.estado_actual_detalle?.nombre} />
          <Info label="Macroetapa técnica actual" value={currentStage?.nombre} />
        </dl>

        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold">Avance del macroflujo</span>
            <span>{safeProgress === null ? EMPTY : `${safeProgress}%`}</span>
          </div>
          {safeProgress !== null && (
            <progress className="mt-2 h-3 w-full" max="100" value={safeProgress} aria-label="Avance del macroflujo">
              {safeProgress}%
            </progress>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="text-xl font-bold">Resultado académico técnico</h2>
        {resultado.error ? <PartialState message={resultado.error} onRetry={() => setRevision((value) => value + 1)} /> : (
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Nota pública" value={resultado.data?.nota_publica} />
            <Info label="Aporte público" value={resultado.data?.aporte_publica} />
            <Info label="Resultado cualitativo" value={resultado.data?.resultado} />
            <Info label="Nota final" value={resultado.data?.nota_final ?? 'Pendiente de definición institucional'} />
          </dl>
        )}
        {resultado.data?.limitacion_normativa && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{resultado.data.limitacion_normativa}</p>}
      </Card>

      <Card role="note" aria-labelledby="limites-normativos" className="overflow-hidden border-amber-300 bg-amber-50 dark:bg-amber-950">
        <h2 id="limites-normativos" className="text-xl font-bold">Límites normativos</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          {CONTRACT_WARNINGS.map((warning) => <li key={warning}>{warning}</li>)}
          {(cierre.data?.advertencias_normativas || []).map((warning) => <li key={`backend-${warning}`}>{warning}</li>)}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="text-xl font-bold">Estado técnico de cierre</h2>
        {cierre.error ? <PartialState message={cierre.error} onRetry={() => setRevision((value) => value + 1)} /> : <ClosureState cierre={cierre.data} />}
      </Card>

      <HistoryCard
        history={history}
        page={historyPage}
        onPage={(page) => setHistoryView({ id, page })}
        onRetry={() => setHistoryRevision((value) => value + 1)}
      />

      <ActorsCard
        active={activeActors}
        historical={historicalActors}
        activePage={activeActorsPage}
        historicalPage={historicalActorsPage}
        onActivePage={(page) => setActorsView((current) => ({ id, activePage: page, historicalPage: String(current.id) === String(id) ? current.historicalPage : 1 }))}
        onHistoricalPage={(page) => setActorsView((current) => ({ id, activePage: String(current.id) === String(id) ? current.activePage : 1, historicalPage: page }))}
        onRetryActive={() => setActiveActorsRevision((value) => value + 1)}
        onRetryHistorical={() => setHistoricalActorsRevision((value) => value + 1)}
      />

      <DefensesCard
        defenses={defenses}
        page={defensesPage}
        onPage={(page) => { closeDefense(); setDefensesView({ id, page }) }}
        onRetry={() => setDefensesRevision((value) => value + 1)}
        onSelect={openDefense}
        canManage={canManageDefenses}
        onProgram={() => openDefenseOperation('programar')}
      />

      <DocumentsCard
        documents={documents}
        page={documentsPage}
        onPage={(page) => setDocumentsView({ id, page })}
        onRetry={() => setDocumentsRevision((value) => value + 1)}
        canUpload={canUpload}
        onUpload={() => openUpload()}
        onSelect={(document) => {
          setSelectedDocument(document)
          setVersionsPage(1)
          setSelectedVersion(null)
          setObservations({ data: null, loading: false, error: '' })
        }}
      />

      {selectedDocument && (
        <DocumentDetail
          document={selectedDocument}
          versions={versions}
          versionsPage={versionsPage}
          onVersionsPage={(page) => { setVersionsPage(page); setSelectedVersion(null) }}
          onVersionsRetry={() => setVersionsRevision((value) => value + 1)}
          selectedVersion={selectedVersion}
          observations={observations}
          observationsPage={observationsPage}
          onSelectVersion={(version) => { setSelectedVersion(version); setObservationsPage(1) }}
          onObservationsPage={setObservationsPage}
          onObservationsRetry={() => setObservationsRevision((value) => value + 1)}
          onClose={() => { setSelectedDocument(null); setSelectedVersion(null) }}
          canUpload={canUpload}
          onUpload={() => openUpload(selectedDocument)}
          canReview={canReview}
          onReview={openReview}
        />
      )}
      {selectedDefense && <DefenseDetail defense={selectedDefense} quorum={quorum} onRetryQuorum={() => loadQuorum(selectedDefense)} onClose={closeDefense} canManage={canManageDefenses} onAction={(action) => openDefenseOperation(action, selectedDefense)} />}
      {defenseOperation && <DefenseOperationDialog operation={defenseOperation} stages={flujo.etapas || []} quorum={quorum} onSubmit={submitDefenseOperation} onClose={closeDefenseOperation} />}
      {upload && <UploadDialog upload={upload} types={documentTypes} onSubmit={submitUpload} onClose={closeUpload} />}
      {review && <ReviewDialog review={review} onSubmit={submitReview} onClose={closeReview} />}
    </section>
  )
}

function ActorsCard({ active, historical, activePage, historicalPage, onActivePage, onHistoricalPage, onRetryActive, onRetryHistorical }) {
  return (
    <Card className="overflow-hidden" aria-labelledby="actores-title">
      <h2 id="actores-title" className="text-xl font-bold">Actores de la postulaciÃ³n</h2>
      <p className="mt-1 text-sm text-slate-500">Participaciones tÃ©cnicas registradas para este expediente.</p>
      <aside aria-label="Advertencias sobre las asignaciones" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950">
        <p>La asignaciÃ³n registrada en el sistema no sustituye un memorando o acto formal de designaciÃ³n institucional.</p>
        <p className="mt-2">Una asignaciÃ³n histÃ³rica representa una participaciÃ³n finalizada y no una funciÃ³n vigente.</p>
      </aside>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ActorGroup title="Asignaciones vigentes" stateLabel="Activa" actors={active} page={activePage} onPage={onActivePage} onRetry={onRetryActive} empty="No hay asignaciones vigentes registradas." />
        <ActorGroup title="Asignaciones histÃ³ricas" stateLabel="HistÃ³rica" actors={historical} page={historicalPage} onPage={onHistoricalPage} onRetry={onRetryHistorical} empty="No hay asignaciones histÃ³ricas registradas." />
      </div>
    </Card>
  )
}

function ActorGroup({ title, stateLabel, actors, page, onPage, onRetry, empty }) {
  const rows = actors.data?.results || []
  const slug = stateLabel === 'Activa' ? 'vigentes' : 'historicas'
  return <section aria-labelledby={`actores-${slug}`} className="min-w-0 rounded-lg border border-slate-200 dark:border-slate-700">
    <h3 id={`actores-${slug}`} className="p-4 text-lg font-semibold">{title}</h3>
    {actors.loading && <p role="status" className="px-4 pb-4 text-sm">Cargando {title.toLowerCase()}â€¦</p>}
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
  return <li className="min-w-0 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0"><h4 className="break-words font-semibold">{actor.usuario_nombre || 'Usuario no disponible'}</h4><p className="mt-1 break-words">{actor.tipo_participacion_display || actor.tipo_participacion_nombre || 'Tipo no registrado'}</p></div>
      <span className="rounded-full border px-2 py-1 text-xs font-semibold">{stateLabel}</span>
    </div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      {order !== null && <Info label="Orden de cargo" value={String(order)} />}
      <Info label="Etapa" value={actor.etapa_nombre || 'Sin etapa asociada'} />
      <Info label="Fecha de inicio" value={formatActorDate(actor.fecha_inicio || actor.fecha_designacion)} />
      {stateLabel === 'HistÃ³rica' && <Info label="Fecha de finalizaciÃ³n" value={formatActorDate(actor.fecha_fin || actor.fecha_finalizacion, 'No registrada')} />}
    </dl>
    <div className="mt-4"><p className="text-sm text-slate-500">Observaciones</p><p className="mt-1 break-words font-medium">{actor.observaciones?.trim() || 'Sin observaciones'}</p></div>
  </li>
}

function formatActorDate(value, fallback = 'No registrada') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString('es-BO')
}

function DefensesCard({ defenses, page, onPage, onRetry, onSelect, canManage, onProgram }) {
  const rows = defenses.data?.results || []
  return <Card className="overflow-hidden" aria-labelledby="defensas-title">
    <h2 id="defensas-title" className="text-xl font-bold">Defensas</h2>
    {canManage && <Button className="mt-3" onClick={onProgram}>Programar defensa</Button>}
    <p className="mt-1 text-sm text-slate-500">Eventos técnicos registrados para esta postulación.</p>
    <aside role="note" aria-label="Alcance contractual de las defensas" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950">{DEFENSE_WARNING}</aside>
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
          <Info label="Etapa técnica" value={defense.etapa_nombre || defense.etapa_codigo} />
        </dl>
        <Button className="mt-4" variant="secondary" onClick={() => onSelect(defense)}>Consultar defensa</Button>
      </li>)}</ul>
      <Pagination count={defenses.data.count} page={page} hasNext={Boolean(defenses.data.next)} hasPrevious={Boolean(defenses.data.previous)} onPage={onPage} />
    </>}
  </Card>
}

function DefenseDetail({ defense, quorum, onRetryQuorum, onClose, canManage, onAction }) {
  const participants = defense.participantes || []
  const evaluations = defense.evaluaciones || []
  const actions = { PROGRAMADA: ['iniciar', 'suspender', 'cancelar', 'reprogramar'], EN_CURSO: ['finalizar', 'suspender', 'cancelar'], SUSPENDIDA: ['reprogramar', 'cancelar'] }[defense.estado] || []
  const actionLabels = { iniciar: 'Iniciar defensa', finalizar: 'Finalizar defensa', suspender: 'Suspender defensa', cancelar: 'Cancelar defensa', reprogramar: 'Reprogramar defensa' }
  return <Modal title="Detalle de defensa" onClose={onClose}>
    <div className="mt-4 min-w-0 space-y-6">
      <section aria-labelledby="defensa-evento-title">
        <h3 id="defensa-evento-title" className="text-lg font-bold">Evento técnico</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Tipo" value={defense.tipo_display || defense.tipo_evento} />
          <Info label="Intento" value={defense.numero_intento} />
          <Info label="Estado" value={defense.estado_display || defense.estado} />
          <Info label="Etapa técnica" value={defense.etapa_nombre || defense.etapa_codigo} />
          <Info label="Fecha programada" value={formatDefenseDate(defense.fecha_programada)} />
          <Info label="Inicio real" value={formatDefenseDate(defense.fecha_inicio_real)} />
          <Info label="Finalización real" value={formatDefenseDate(defense.fecha_fin_real)} />
          <Info label="Lugar" value={defense.lugar?.trim() || 'No registrado'} />
          <Info label="Modalidad" value={defense.modalidad_display || defense.modalidad_evento} />
        </dl>
        {defense.enlace_virtual && <a className="mt-4 inline-flex max-w-full break-all rounded-md border px-3 py-2 text-sm font-medium" href={defense.enlace_virtual} target="_blank" rel="noopener noreferrer">Abrir enlace virtual de la defensa</a>}
      </section>

      <section aria-labelledby="participantes-defensa-title"><h3 id="participantes-defensa-title" className="text-lg font-bold">Participantes</h3>
        {participants.length === 0 ? <p className="mt-3 text-sm text-slate-500">No se registraron participantes.</p> : <ul className="mt-3 space-y-3">{participants.map((participant) => <li key={participant.id} className="min-w-0 rounded-lg border p-3 text-sm">
          <h4 className="break-words font-semibold">{participant.usuario_nombre || 'Usuario no disponible'}</h4>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2"><Info label="Rol" value={participant.rol_display || participant.rol_evento} /><Info label="Convocatoria" value={(participant.convocatoria ?? participant.convocado) ? 'Convocado' : 'No convocado'} /><Info label="Asistencia" value={formatAttendance(participant.presente)} /><Info label="Fecha de asistencia" value={formatDefenseDate(participant.fecha_asistencia || participant.fecha_registro_asistencia)} /></dl>
          <p className="mt-3 break-words"><span className="text-slate-500">Observaciones: </span>{participant.observaciones?.trim() || 'Sin observaciones'}</p>
        </li>)}</ul>}
      </section>

      <section aria-labelledby="quorum-defensa-title"><h3 id="quorum-defensa-title" className="text-lg font-bold">Quórum técnico</h3>
        {quorum.loading && <p role="status" className="mt-3 text-sm">Consultando quórum técnico…</p>}
        {quorum.error && <SectionError message={quorum.error} label="Reintentar quórum técnico" onRetry={onRetryQuorum} />}
        {!quorum.loading && !quorum.error && quorum.data && <div className="mt-3 space-y-3 text-sm"><p className="font-semibold">{quorum.data.valido ? 'Quórum técnico válido' : 'Quórum técnico no válido'}</p><TechnicalCounts title="Conteos" values={quorum.data.conteos} empty="Sin conteos registrados." /><TechnicalCounts title="Faltantes" values={quorum.data.faltantes} empty="Sin participantes faltantes." /><TechnicalCounts title="Detalle técnico" values={quorum.data.detalle} empty="Sin detalle adicional." /></div>}
        <p className="mt-3 text-sm text-slate-500">Esta verificación técnica no certifica validez institucional.</p>
      </section>

      {canManage && actions.length > 0 && <section aria-labelledby="acciones-defensa-title"><h3 id="acciones-defensa-title" className="text-lg font-bold">Administración técnica</h3><div className="mt-3 flex flex-wrap gap-2">{actions.map((action) => {
        const finalBlocked = action === 'finalizar' && (quorum.loading || quorum.error || quorum.data?.valido !== true)
        return <Button key={action} variant={action === 'cancelar' ? 'outline' : 'secondary'} disabled={finalBlocked} title={finalBlocked ? 'La finalización requiere quórum técnico válido confirmado por el backend.' : undefined} onClick={() => onAction(action)}>{actionLabels[action]}</Button>
      })}</div>{defense.estado === 'EN_CURSO' && quorum.data?.valido !== true && <p className="mt-3 text-sm text-slate-500">La finalización estará disponible cuando el backend confirme quórum técnico válido.</p>}</section>}

      <section aria-labelledby="evaluaciones-defensa-title"><h3 id="evaluaciones-defensa-title" className="text-lg font-bold">Evaluaciones registradas</h3>
        {evaluations.length === 0 ? <p className="mt-3 text-sm text-slate-500">No se registraron evaluaciones.</p> : <ul className="mt-3 space-y-3">{evaluations.map((evaluation) => <li key={evaluation.id} className="rounded-lg border p-3"><EvaluationData evaluation={evaluation} /></li>)}</ul>}
      </section>

      <section aria-labelledby="resultado-consolidado-title"><h3 id="resultado-consolidado-title" className="text-lg font-bold">Resultado consolidado</h3>
        {defense.resultado_consolidado ? <div className="mt-3 rounded-lg border p-3"><EvaluationData evaluation={defense.resultado_consolidado} /></div> : <p className="mt-3 text-sm text-slate-500">Resultado consolidado todavía no disponible.</p>}
      </section>
      <aside role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950">{DEFENSE_WARNING}</aside>
    </div>
  </Modal>
}

const DEFENSE_TYPES = [
  ['DEFENSA_PERFIL', 'Defensa de perfil', 'PERFIL_PROYECTO'],
  ['DEFENSA_PRIVADA', 'Defensa privada', 'DEFENSA_PRIVADA'],
  ['DEFENSA_PUBLICA', 'Defensa pública', 'DEFENSA_PUBLICA'],
]

function DefenseOperationDialog({ operation, stages, quorum, onSubmit, onClose }) {
  const [type, setType] = useState('')
  const [mode, setMode] = useState('PRESENCIAL')
  const titles = { programar: 'Programar defensa', iniciar: 'Iniciar defensa', finalizar: 'Finalizar defensa', suspender: 'Suspender defensa', cancelar: 'Cancelar defensa', reprogramar: 'Reprogramar defensa' }
  const fieldMessage = (name) => {
    const value = operation.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  const expectedStage = DEFENSE_TYPES.find(([value]) => value === type)?.[2]
  const compatibleStages = stages.filter((stage) => stage.codigo === expectedStage && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado) && stage.activo !== false)
  const disabled = operation.submitting
  const error = (name) => fieldMessage(name) && <span id={`defense-${name}-error`} role="alert" className="mt-1 block text-sm text-red-600">{fieldMessage(name)}</span>

  return <Modal title={titles[operation.action]} onClose={onClose}>
    <form className="mt-4 grid gap-4" onSubmit={onSubmit} noValidate>
      {operation.action === 'programar' ? <>
        <p className="text-sm">La postulación se toma de este expediente. El intento será determinado por el backend.</p>
        <label className="text-sm">Tipo de defensa<select name="tipo_evento" value={type} onChange={(event) => setType(event.target.value)} required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un tipo</option>{DEFENSE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('tipo_evento')}</label>
        <label className="text-sm">Etapa compatible<select name="seguimiento_etapa" required disabled={disabled || !type} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una etapa</option>{compatibleStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.nombre} — intento {stage.numero_intento}</option>)}</select>{error('seguimiento_etapa')}</label>
        {type && compatibleStages.length === 0 && <p role="status" className="text-sm text-amber-700">No existe una etapa compatible en proceso u observada.</p>}
        <label className="text-sm">Fecha y hora programada<input name="fecha_programada" type="datetime-local" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('fecha_programada')}</label>
        <label className="text-sm">Modalidad técnica<select name="modalidad_evento" value={mode} onChange={(event) => setMode(event.target.value)} disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="MIXTA">Mixta</option></select></label>
        {(mode === 'PRESENCIAL' || mode === 'MIXTA') && <label className="text-sm">Lugar<input name="lugar" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('lugar')}</label>}
        {(mode === 'VIRTUAL' || mode === 'MIXTA') && <label className="text-sm">Enlace virtual<input name="enlace_virtual" type="url" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('enlace_virtual')}</label>}
        <label className="text-sm">Observaciones (opcional)<textarea name="observaciones" disabled={disabled} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
        <aside role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950">Virtual y mixta son modalidades técnicas y no acreditan autorización normativa. La regla de 48 horas de la defensa pública no acredita publicación de convocatoria.</aside>
      </> : <>
        <p className="text-sm">Confirma la acción sobre el evento técnico seleccionado.</p>
        {operation.action === 'finalizar' && <p className="rounded-lg border p-3 text-sm">Quórum técnico confirmado por backend: <strong>{quorum.data?.valido ? 'válido' : 'no válido'}</strong>. Finalizar no registra resultado académico, acta firmada ni cierre universitario.</p>}
        {operation.action === 'reprogramar' && <label className="text-sm">Nueva fecha y hora<input name="nueva_fecha" type="datetime-local" required disabled={disabled} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('nueva_fecha')}</label>}
        {['suspender', 'cancelar', 'reprogramar'].includes(operation.action) && <label className="text-sm">Motivo<textarea aria-label="Motivo" name="motivo" required disabled={disabled} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" />{error('motivo')}</label>}
      </>}
      {error('non_field_errors')}{error('detail')}
      {operation.error && <p role="alert" className="text-red-600">{operation.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={disabled}>{disabled ? 'Procesando…' : operation.action === 'programar' ? 'Programar defensa' : 'Confirmar'}</Button><Button type="button" variant="secondary" disabled={disabled} onClick={onClose}>Cancelar</Button></div>
    </form>
  </Modal>
}

function EvaluationData({ evaluation }) {
  return <dl className="grid gap-2 text-sm sm:grid-cols-2"><Info label="Tipo" value={evaluation.tipo_display || evaluation.tipo_evaluacion} /><Info label="Evaluador" value={evaluation.evaluador_nombre || 'No registrado'} /><Info label="Modalidad de registro" value={evaluation.modalidad_registro_display || evaluation.modalidad_registro} /><Info label="Resultado cualitativo" value={evaluation.resultado_cualitativo || 'No registrado'} /><Info label="Nota" value={evaluation.nota_numerica ?? 'No registrada'} /><Info label="Ponderación" value={evaluation.ponderacion ?? 'No registrada'} /><Info label="Aporte" value={evaluation.aporte_ponderado ?? 'No registrado'} /></dl>
}

function TechnicalCounts({ title, values, empty }) {
  const entries = Object.entries(values || {})
  return <div><h4 className="font-semibold">{title}</h4>{entries.length === 0 ? <p className="text-slate-500">{empty}</p> : <ul className="mt-1 flex flex-wrap gap-2">{entries.map(([role, count]) => <li key={role} className="rounded border px-2 py-1">{formatTechnicalRole(role)}: {count}</li>)}</ul>}</div>
}

function formatTechnicalRole(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function formatDefenseDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function formatAttendance(value) {
  if (value === true) return 'Presente'
  if (value === false) return 'Ausente'
  return 'No registrada'
}

function DocumentsCard({ documents, page, onPage, onRetry, onSelect, canUpload, onUpload }) {
  const rows = documents.data?.results || []
  return (
    <Card className="overflow-hidden" aria-labelledby="documentos-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="documentos-title" className="text-xl font-bold">Documentos</h2>{canUpload && <Button onClick={onUpload}>Cargar documento</Button>}</div>
      <p className="mt-1 text-sm text-slate-500">Evidencias técnicas registradas para esta postulación.</p>
      {documents.loading && <p role="status" className="mt-4 text-sm">Cargando documentos…</p>}
      {documents.error && <SectionError message={documents.error} label="Reintentar documentos" onRetry={onRetry} />}
      {!documents.loading && !documents.error && rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No se registraron documentos.</p>}
      {!documents.loading && !documents.error && rows.length > 0 && <><ul className="mt-5 space-y-4">{rows.map((document) => (
        <li key={document.id} className="min-w-0 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><h3 className="break-words font-semibold">{document.tipo_documento_nombre || 'Tipo no registrado'}</h3><p className="mt-1 text-sm">Estado técnico: {document.estado_nombre || 'No registrado'}</p></div>
            <Button variant="secondary" onClick={() => onSelect(document)}>Ver detalle</Button>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Subido" value={formatDocumentDate(document.fecha_subida)} />
            <Info label="Revisado" value={formatDocumentDate(document.fecha_revision)} />
            <Info label="Corrección" value={document.requiere_correccion ? 'Requerida' : 'No requerida'} />
            <Info label="Versiones" value={document.versiones?.length ?? 0} />
          </dl>
        </li>
      ))}</ul><Pagination count={documents.data.count} page={page} hasNext={Boolean(documents.data.next)} hasPrevious={Boolean(documents.data.previous)} onPage={onPage} /></>}
    </Card>
  )
}

function DocumentDetail({ document, versions, versionsPage, onVersionsPage, onVersionsRetry, selectedVersion, observations, observationsPage, onSelectVersion, onObservationsPage, onObservationsRetry, onClose, canUpload, onUpload, canReview, onReview }) {
  const rows = versions.data?.results || []
  const canTransition = canReview && document.estado_codigo === 'ENV'
  return (
    <Modal title="Detalle del documento" onClose={onClose}>
      <div className="mt-4 min-w-0 space-y-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Tipo documental" value={document.tipo_documento_nombre} />
          <Info label="Estado técnico" value={document.estado_nombre} />
          <Info label="Fecha de subida" value={formatDocumentDate(document.fecha_subida)} />
          <Info label="Fecha de revisión" value={formatDocumentDate(document.fecha_revision)} />
          <Info label="Requiere corrección" value={document.requiere_correccion ? 'Sí' : 'No'} />
        </dl>
        {canUpload && <Button onClick={onUpload}>Cargar nueva versión</Button>}
        {canTransition && <div className="flex flex-wrap gap-2">
          {!document.tiene_observaciones_pendientes && <Button onClick={() => onReview('aprobar')}>Aprobar documento</Button>}
          <Button variant="secondary" onClick={() => onReview('rechazar')}>Rechazar documento</Button>
          <Button variant="secondary" onClick={() => onReview('observar')}>Registrar observación</Button>
        </div>}
        {document.observacion_general && <p className="break-words rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950">{document.observacion_general}</p>}
        <section aria-labelledby="versiones-title"><h3 id="versiones-title" className="text-lg font-bold">Versiones</h3>
          {versions.loading && <p role="status" className="mt-3">Cargando versiones…</p>}
          {versions.error && <SectionError message={versions.error} label="Reintentar versiones" onRetry={onVersionsRetry} />}
          {!versions.loading && !versions.error && rows.length === 0 && <p className="mt-3 text-sm text-slate-500">No se registraron versiones.</p>}
          {!versions.loading && !versions.error && rows.length > 0 && <><ol className="mt-3 space-y-3">{rows.map((version) => (
            <li key={version.id} className="min-w-0 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Versión {version.numero_version}</h4>{version.es_version_actual && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Versión actual</span>}</div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><Info label="Fecha" value={formatDocumentDate(version.fecha_subida)} /><Info label="Autor" value={version.subido_por_nombre || 'No registrado'} /><Info label="Archivo" value={version.nombre_original || 'No registrado'} /><Info label="Tamaño" value={formatBytes(version.tamano_bytes)} /></dl>
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => onSelectVersion(version)}>Ver observaciones</Button>{version.archivo && <a aria-label={`Abrir archivo autorizado de la versión ${version.numero_version}`} className="rounded-md border px-3 py-2 text-sm font-medium" href={version.archivo} target="_blank" rel="noreferrer">Abrir archivo autorizado</a>}</div>
            </li>
          ))}</ol><Pagination count={versions.data.count} page={versionsPage} hasNext={Boolean(versions.data.next)} hasPrevious={Boolean(versions.data.previous)} onPage={onVersionsPage} /></>}
        </section>
        {selectedVersion && <ObservationsPanel version={selectedVersion} observations={observations} page={observationsPage} onPage={onObservationsPage} onRetry={onObservationsRetry} canReview={canReview} onCorrect={(observation) => onReview('corregir', observation)} />}
      </div>
    </Modal>
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

function UploadDialog({ upload, types, onSubmit, onClose }) {
  const fixedType = upload.document
  const fieldMessage = (name) => {
    const value = upload.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  return <Modal title={fixedType ? 'Cargar nueva versión' : 'Cargar documento'} onClose={onClose}>
    {upload.success ? <div className="mt-4"><p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{upload.success}</p><Button className="mt-4" onClick={onClose}>Cerrar</Button></div> : <form className="mt-4 grid gap-4" onSubmit={onSubmit} noValidate>
      {fixedType ? <div><p className="text-sm text-slate-500">Tipo documental</p><p className="break-words font-medium">{fixedType.tipo_documento_nombre}</p></div> : <label className="text-sm">Tipo documental
        <select name="tipo_documento_id" required disabled={types.loading || upload.submitting} aria-describedby={fieldMessage('tipo_documento_id') ? 'tipo-error' : undefined} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950">
          <option value="">Seleccione un tipo documental</option>{types.data.map((type) => <option key={type.id} value={type.id}>{type.nombre}</option>)}
        </select>{fieldMessage('tipo_documento_id') && <span id="tipo-error" className="mt-1 block text-red-600">{fieldMessage('tipo_documento_id')}</span>}
      </label>}
      {types.loading && <p role="status">Cargando tipos documentales…</p>}
      {types.error && <p role="alert" className="text-red-600">{types.error}</p>}
      {!fixedType && !types.loading && !types.error && types.data.length === 0 && <p role="status">No hay tipos documentales activos disponibles.</p>}
      <label className="text-sm">Archivo
        <input name="archivo" type="file" required disabled={upload.submitting} aria-describedby={fieldMessage('archivo') ? 'archivo-error' : undefined} className="mt-1 block w-full rounded-lg border p-2" />
        {fieldMessage('archivo') && <span id="archivo-error" className="mt-1 block text-red-600">{fieldMessage('archivo')}</span>}
      </label>
      {fieldMessage('non_field_errors') && <p role="alert" className="text-red-600">{fieldMessage('non_field_errors')}</p>}
      {upload.error && <p role="alert" className="text-red-600">{upload.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={upload.submitting || types.loading || Boolean(types.error) || (!fixedType && types.data.length === 0)}>{upload.submitting ? 'Enviando…' : fixedType ? 'Cargar nueva versión' : 'Cargar documento'}</Button><Button type="button" variant="secondary" disabled={upload.submitting} onClick={onClose}>Cancelar</Button></div>
    </form>}
  </Modal>
}

function ObservationsPanel({ version, observations, page, onPage, onRetry, canReview, onCorrect }) {
  const rows = observations.data?.results || []
  return <section aria-labelledby="observaciones-title"><h3 id="observaciones-title" className="text-lg font-bold">Observaciones de la versión {version.numero_version}</h3>
    {observations.loading && <p role="status" className="mt-3">Cargando observaciones…</p>}
    {observations.error && <SectionError message={observations.error} label="Reintentar observaciones" onRetry={onRetry} />}
    {!observations.loading && !observations.error && rows.length === 0 && <p className="mt-3 text-sm text-slate-500">Sin observaciones registradas.</p>}
    {!observations.loading && !observations.error && rows.length > 0 && <><ul className="mt-3 space-y-3">{rows.map((observation) => <li key={observation.id} className="min-w-0 rounded-lg border p-3 text-sm"><p className="break-words">{observation.comentario || 'Sin comentario'}</p><dl className="mt-3 grid gap-2 sm:grid-cols-2"><Info label="Autor" value={observation.usuario_nombre || 'No registrado'} /><Info label="Fecha" value={formatDocumentDate(observation.fecha_observacion)} /><Info label="Estado" value={observation.corregida ? 'Corregida' : 'Pendiente'} /><Info label="Fecha de corrección" value={formatDocumentDate(observation.fecha_correccion)} /></dl>{canReview && !observation.corregida && <Button className="mt-3" variant="secondary" onClick={() => onCorrect(observation)}>Marcar observación corregida</Button>}</li>)}</ul><Pagination count={observations.data.count} page={page} hasNext={Boolean(observations.data.next)} hasPrevious={Boolean(observations.data.previous)} onPage={onPage} /></>}
  </section>
}

function SectionError({ message, label, onRetry }) {
  return <div role="alert" className="mt-3 rounded-lg border border-red-200 p-3 text-sm"><p>{message}</p><Button className="mt-3" variant="secondary" onClick={onRetry}>{label}</Button></div>
}

function formatDocumentDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return 'No registrado'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function HistoryCard({ history, page, onPage, onRetry }) {
  const rows = history.data?.results || []
  return (
    <Card className="overflow-hidden" aria-labelledby="historial-title">
      <h2 id="historial-title" className="text-xl font-bold">Historial</h2>
      <p className="mt-1 text-sm text-slate-500">Trazabilidad técnica de cambios de estado.</p>
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
        <Info label="Actor" value={item.actor_nombre || 'Sistema'} />
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

function ClosureState({ cierre }) {
  const groups = [
    ['Condiciones faltantes', cierre?.condiciones_faltantes],
    ['Entregas faltantes', cierre?.entregas_faltantes],
    ['Documentos faltantes', cierre?.documentos_faltantes],
  ].filter(([, items]) => items?.length)
  return groups.length ? <div className="mt-4 space-y-4">{groups.map(([label, items]) => <section key={label}><h3 className="font-semibold">{label}</h3><ul className="mt-2 list-disc pl-5 text-sm">{items.map((item) => <li key={String(item)}>{String(item)}</li>)}</ul></section>)}</div> : <p className="mt-4 text-sm">No se informaron faltantes de cierre técnico.</p>
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
