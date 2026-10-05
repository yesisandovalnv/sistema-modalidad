import { useEffect, useState } from 'react'
import { Modal } from '../crud/CrudShell'
import { Button } from '../ui/button'
import { Pagination } from '../reports/ReportComponents'
import { postulacionesService } from '../../services/postulacionesService'

const EMPTY = 'No registrado'

export default function DocumentDetailDialog({ document, onClose, canUpload = false, onUpload, canReview = false, onReview, refreshKey = 0 }) {
  const [versions, setVersions] = useState({ data: null, loading: false, error: '' })
  const [versionsPage, setVersionsPage] = useState(1)
  const [versionsRevision, setVersionsRevision] = useState(0)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [observations, setObservations] = useState({ data: null, loading: false, error: '' })
  const [observationsPage, setObservationsPage] = useState(1)
  const [observationsRevision, setObservationsRevision] = useState(0)

  useEffect(() => {
    if (!document?.id) return undefined
    const controller = new AbortController()
    setVersions((current) => ({ data: current.data, loading: true, error: '' }))
    postulacionesService.obtenerVersiones(document.id, versionsPage, controller.signal)
      .then((data) => setVersions({ data, loading: false, error: '' }))
      .catch((error) => {
        if (!error.canceled && !controller.signal.aborted) setVersions({ data: null, loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [document?.id, versionsPage, versionsRevision, refreshKey])

  useEffect(() => {
    if (!selectedVersion?.id) return undefined
    const controller = new AbortController()
    setObservations({ data: null, loading: true, error: '' })
    postulacionesService.obtenerObservaciones(selectedVersion.id, observationsPage, controller.signal)
      .then((data) => setObservations({ data, loading: false, error: '' }))
      .catch((error) => {
        if (!error.canceled && !controller.signal.aborted) setObservations({ data: null, loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [selectedVersion?.id, observationsPage, observationsRevision, refreshKey])

  const rows = versions.data?.results || []
  const canTransition = canReview && document.estado_codigo === 'ENV'

  return (
    <Modal title="Detalle del documento" onClose={onClose}>
      <div className="mt-4 min-w-0 space-y-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Tipo documental" value={document.tipo_documento_nombre} />
          <Info label="Estado" value={document.estado_nombre} />
          <Info label="Fecha de carga" value={formatDocumentDate(document.fecha_subida)} />
          <Info label="Fecha de revisión" value={document.fecha_revision ? formatDocumentDate(document.fecha_revision) : 'Pendiente'} />
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
          {versions.loading && !versions.data && <div role="status" aria-label="Cargando versiones" className="mt-3 animate-pulse rounded-lg border p-3">
            <p className="text-sm text-slate-500">Cargando versiones…</p>
            <div className="mt-3 space-y-3" aria-hidden="true"><div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" /><div className="grid gap-2 sm:grid-cols-2"><div className="h-4 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 rounded bg-slate-200 dark:bg-slate-700" /></div><div className="h-9 w-40 rounded bg-slate-200 dark:bg-slate-700" /></div>
          </div>}
          {versions.error && <SectionError message={versions.error} label="Reintentar versiones" onRetry={() => setVersionsRevision((value) => value + 1)} />}
          {versions.data && !versions.error && rows.length === 0 && <p className="mt-3 text-sm text-slate-500">No se registraron versiones.</p>}
          {versions.data && !versions.error && rows.length > 0 && <><ol className="mt-3 space-y-3">{rows.map((version) => (
            <li key={version.id} className="min-w-0 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Versión {version.numero_version}</h4>{version.es_version_actual && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Versión actual</span>}</div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><Info label="Fecha" value={formatDocumentDate(version.fecha_subida)} /><Info label="Autor" value={version.subido_por_nombre || 'No registrado'} /><Info label="Archivo" value={version.nombre_original || 'No registrado'} /><Info label="Tamaño" value={formatBytes(version.tamano_bytes)} /></dl>
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { setSelectedVersion(version); setObservationsPage(1) }}>Ver observaciones</Button><ViewVersionButton version={version} /><DownloadVersionButton version={version} /></div>
            </li>
          ))}</ol><Pagination count={versions.data.count} page={versionsPage} hasNext={Boolean(versions.data.next)} hasPrevious={Boolean(versions.data.previous)} onPage={(page) => { setVersionsPage(page); setSelectedVersion(null) }} /></>}
        </section>
        {selectedVersion && <ObservationsPanel version={selectedVersion} observations={observations} page={observationsPage} onPage={setObservationsPage} onRetry={() => setObservationsRevision((value) => value + 1)} canReview={canReview} onCorrect={(observation) => onReview('corregir', observation)} />}
      </div>
    </Modal>
  )
}

export function DownloadVersionButton({ version, label = 'Descargar' }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const download = async () => {
    if (downloading) return
    setDownloading(true); setError('')
    try {
      const { blob, filename } = await postulacionesService.descargarVersion(version.id, version.nombre_original)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
    } catch (downloadError) {
      if (!downloadError.canceled) setError(downloadError.message)
    } finally { setDownloading(false) }
  }
  return <div><Button variant="outline" disabled={downloading} onClick={download}>{downloading ? 'Descargando…' : label}</Button>{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div>
}

function ViewVersionButton({ version }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const view = async () => {
    if (loading) return
    setError('')
    const previewWindow = window.open('about:blank', '_blank')
    if (!previewWindow) { setError('El navegador bloqueó la nueva pestaña. Permite ventanas emergentes e inténtalo nuevamente.'); return }
    previewWindow.opener = null
    setLoading(true)
    let objectUrl = ''
    try {
      const { blob } = await postulacionesService.descargarVersion(version.id, version.nombre_original)
      if (previewWindow.closed) return
      objectUrl = URL.createObjectURL(blob)
      previewWindow.location.replace(objectUrl)
      let cleanupTimer
      cleanupTimer = window.setInterval(() => {
        if (previewWindow.closed) { window.clearInterval(cleanupTimer); URL.revokeObjectURL(objectUrl) }
      }, 1000)
    } catch (viewError) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (!previewWindow.closed) previewWindow.close()
      if (!viewError.canceled) setError(viewError.message || 'No se pudo abrir el archivo.')
    } finally { setLoading(false) }
  }
  return <div><Button variant="secondary" disabled={loading} onClick={view}>{loading ? 'Abriendo…' : 'Ver'}</Button>{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div>
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

function Info({ label, value }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || EMPTY}</dd></div>
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
