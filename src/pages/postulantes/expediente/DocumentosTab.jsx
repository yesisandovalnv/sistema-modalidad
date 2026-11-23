import { FileCheck2, FileClock, FileWarning, FolderOpen } from 'lucide-react'
import { Modal } from '../../../components/crud/CrudShell'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Pagination } from '../../../components/reports/ReportComponents'
import { Info, RequirementIcon, SectionError } from './compartidos'
import { formatDocumentDate } from './reglas'

export function DocumentsCard({ documents, page, onPage, onRetry, onSelect, canUpload, onUpload, stageDocuments = null }) {
  const rows = documents.data?.results || []
  return (
    <Card className="expediente-card expediente-docs overflow-hidden" aria-labelledby="documentos-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="documentos-title" className="text-xl font-bold">Documentos</h2>{canUpload && <Button onClick={onUpload}>Cargar documento</Button>}</div>
      <p className="mt-1 text-sm text-slate-500">Consulta y gestiona los documentos vinculados a tu proceso académico.</p>
      {stageDocuments && <section className="expediente-stage-docs" aria-labelledby="stage-docs-title">
        <h3 id="stage-docs-title" className="expediente-stage-docs-title">Lo que pide {stageDocuments.stageName}</h3>
        <ul>{stageDocuments.items.map((item) => <li key={item.key} className="expediente-stage-doc">
          <RequirementIcon value={item.state === 'done' ? true : item.state === 'missing' ? false : null} />
          <span className="expediente-stage-doc-name">{item.nombre}</span>
          <span className="expediente-status expediente-status--compact" data-tone={item.state === 'done' ? 'success' : item.state === 'review' ? 'info' : item.state === 'optional' ? 'neutral' : 'warning'}>{item.state === 'done' ? 'Cumplido' : item.state === 'review' ? 'En revisión' : item.state === 'optional' ? 'Para el cierre' : 'Falta'}</span>
        </li>)}</ul>
      </section>}
      {documents.loading && <p role="status" className="mt-4 text-sm">Cargando documentos…</p>}
      {documents.error && <SectionError message={documents.error} label="Reintentar documentos" onRetry={onRetry} />}
      {!documents.loading && !documents.error && rows.length === 0 && <div className="expediente-empty">
        <span className="expediente-empty-icon" aria-hidden="true"><FolderOpen className="h-5 w-5" strokeWidth={1.9} /></span>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--heading)]">No se registraron documentos.</p>
          {canUpload && <p className="text-sm text-[var(--text-secondary)]">Usa «Cargar documento» para agregar el primero.</p>}
        </div>
      </div>}
      {!documents.loading && !documents.error && rows.length > 0 && <><ul className="expediente-doc-list">{rows.map((document, index) => {
        const tone = document.estado_codigo === 'APR' ? 'success' : document.requiere_correccion ? 'warning' : 'info'
        const Icon = tone === 'success' ? FileCheck2 : tone === 'warning' ? FileWarning : FileClock
        return <li key={document.id} className="expediente-doc animate-row-in" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
          <span className="expediente-doc-icon" data-tone={tone} aria-hidden="true"><Icon className="h-5 w-5" strokeWidth={1.9} /></span>
          <div className="expediente-doc-main">
            <div className="min-w-0"><h3 className="break-words font-semibold">{document.tipo_documento_nombre || 'Tipo no registrado'}</h3><div className="expediente-doc-tags"><span className="expediente-status expediente-status--compact" data-tone={tone}>{document.estado_nombre || 'No registrado'}</span>{document.requiere_correccion && <span className="expediente-status expediente-status--compact" data-tone="warning">Requiere corrección</span>}</div></div>
            <Button variant="secondary" className="expediente-doc-open" onClick={() => onSelect(document)}>Ver detalle</Button>
          </div>
          <dl className="expediente-doc-facts">
            <Info label="Fecha de carga" value={formatDocumentDate(document.fecha_subida)} />
            <Info label="Fecha de revisión" value={document.fecha_revision ? formatDocumentDate(document.fecha_revision) : 'Pendiente'} />
            <Info label="Corrección" value={document.requiere_correccion ? 'Requerida' : 'No requerida'} />
            <Info label="Versiones" value={document.versiones?.length ?? 0} />
          </dl>
        </li>
      })}</ul><Pagination count={documents.data.count} page={page} hasNext={Boolean(documents.data.next)} hasPrevious={Boolean(documents.data.previous)} onPage={onPage} /></>}
    </Card>
  )
}

export function ReviewDialog({ review, onSubmit, onClose }) {
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
