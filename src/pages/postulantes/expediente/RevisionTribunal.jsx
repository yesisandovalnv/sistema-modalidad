import { Modal } from '../../../components/crud/CrudShell'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { DownloadVersionButton } from '../../../components/documentos/DocumentDetailDialog'
import { getActiveTribunalComposition } from '../tribunalComposition'
import { ActorAssignmentForm } from './ActoresTab'
import { Info, SectionError } from './compartidos'
import { formatDocumentDate } from './reglas'

export function TribunalReviewActions({ reviewState, orientation, evidenceVersions, canUpload, onRegister, onUpdate, onUploadEvidence }) {
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

export function TribunalReviewReports({ reviewState, versions, evidenceVersions, showOperations = true, orientation, canUpload, onRetry, onRegister, onUpdate, onUploadEvidence }) {
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

export function TribunalReportDialog({ report, finalVersion, evidenceVersions, canUpload, canManageAssignments, tribunalReviewStage, activeActors, activeTribunals, onRetryActiveTribunals, onDraftChange, onAssignMissing, onBackToReport, onSubmitMissing, onUploadEvidence, onSubmit, onClose }) {
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
