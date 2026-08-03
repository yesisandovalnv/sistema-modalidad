import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, DataState, Modal } from '../../components/crud/CrudShell'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/reports/ReportComponents'
import { postulacionesService } from '../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from './postulacionFormatters'

const EMPTY = 'No registrado'
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
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [history, setHistory] = useState({ data: null, loading: true, error: '' })
  const [historyRevision, setHistoryRevision] = useState(0)
  const [historyView, setHistoryView] = useState({ id: null, page: 1 })
  const historyPage = String(historyView.id) === String(id) ? historyView.page : 1
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

  useEffect(() => {
    setSelectedDocument(null)
    setSelectedVersion(null)
  }, [id])

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
    setDocuments({ data: null, loading: true, error: '' })
    postulacionesService.obtenerDocumentos(id, documentsPage, controller.signal)
      .then((documentData) => setDocuments({ data: documentData, loading: false, error: '' }))
      .catch((requestError) => {
        if (!requestError.canceled) setDocuments({ data: null, loading: false, error: requestError.message })
      })
    return () => controller.abort()
  }, [id, documentsPage, documentsRevision])

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

      <DocumentsCard
        documents={documents}
        page={documentsPage}
        onPage={(page) => setDocumentsView({ id, page })}
        onRetry={() => setDocumentsRevision((value) => value + 1)}
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
        />
      )}
    </section>
  )
}

function DocumentsCard({ documents, page, onPage, onRetry, onSelect }) {
  const rows = documents.data?.results || []
  return (
    <Card className="overflow-hidden" aria-labelledby="documentos-title">
      <h2 id="documentos-title" className="text-xl font-bold">Documentos</h2>
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

function DocumentDetail({ document, versions, versionsPage, onVersionsPage, onVersionsRetry, selectedVersion, observations, observationsPage, onSelectVersion, onObservationsPage, onObservationsRetry, onClose }) {
  const rows = versions.data?.results || []
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
        {selectedVersion && <ObservationsPanel version={selectedVersion} observations={observations} page={observationsPage} onPage={onObservationsPage} onRetry={onObservationsRetry} />}
      </div>
    </Modal>
  )
}

function ObservationsPanel({ version, observations, page, onPage, onRetry }) {
  const rows = observations.data?.results || []
  return <section aria-labelledby="observaciones-title"><h3 id="observaciones-title" className="text-lg font-bold">Observaciones de la versión {version.numero_version}</h3>
    {observations.loading && <p role="status" className="mt-3">Cargando observaciones…</p>}
    {observations.error && <SectionError message={observations.error} label="Reintentar observaciones" onRetry={onRetry} />}
    {!observations.loading && !observations.error && rows.length === 0 && <p className="mt-3 text-sm text-slate-500">Sin observaciones registradas.</p>}
    {!observations.loading && !observations.error && rows.length > 0 && <><ul className="mt-3 space-y-3">{rows.map((observation) => <li key={observation.id} className="min-w-0 rounded-lg border p-3 text-sm"><p className="break-words">{observation.comentario || 'Sin comentario'}</p><dl className="mt-3 grid gap-2 sm:grid-cols-2"><Info label="Autor" value={observation.usuario_nombre || 'No registrado'} /><Info label="Fecha" value={formatDocumentDate(observation.fecha_observacion)} /><Info label="Estado" value={observation.corregida ? 'Corregida' : 'Pendiente'} /><Info label="Fecha de corrección" value={formatDocumentDate(observation.fecha_correccion)} /></dl></li>)}</ul><Pagination count={observations.data.count} page={page} hasNext={Boolean(observations.data.next)} hasPrevious={Boolean(observations.data.previous)} onPage={onPage} /></>}
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
