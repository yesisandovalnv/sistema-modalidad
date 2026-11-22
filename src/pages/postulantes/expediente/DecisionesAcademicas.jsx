import { useRef, useState } from 'react'
import { Modal } from '../../../components/crud/CrudShell'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { postulacionesService } from '../../../services/postulacionesService'
import { DownloadVersionButton } from '../../../components/documentos/DocumentDetailDialog'
import { StatusBadge } from './compartidos'
import { formatCode, formatDocumentDate } from './reglas'

export function AcademicDecisionsCard({ management, onAction, onMemorandumAction }) {
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

export function AcademicDecisionDialog({ state, isProjectProfileAuthorization = false, onSubmit, onClose }) {
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

export function MemorandumStatus({ memorandums, onRetry }) {
  const publications = memorandums?.data || []
  const current = publications.find((item) => item.vigente)
  if (memorandums?.loading) return <p role="status" className="mt-2 text-sm">Consultando memorándum…</p>
  if (memorandums?.error) return <div className="mt-2"><p role="alert" className="text-sm text-red-600">{memorandums.error}</p>{onRetry && <Button type="button" variant="secondary" className="mt-2" onClick={onRetry}>Reintentar consulta</Button>}</div>
  if (current) return <div className="mt-2 text-sm"><p>Documento publicado y vigente desde {formatDocumentDate(current.fecha_publicacion)}.</p><DownloadVersionButton version={current.version} /></div>
  if (publications.length > 0) return <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-300">Existe una publicación, pero el documento no está vigente.</p>
  return <p role="status" className="mt-2 text-sm text-slate-500">Pendiente de memorándum.</p>
}

export function MemorandumStatusCard({ memorandums, onRetry }) {
  return <Card className="overflow-hidden" aria-labelledby="student-memorandum-title">
    <h2 id="student-memorandum-title" className="text-xl font-bold">Memorándum de designación de tribunales</h2>
    <MemorandumStatus memorandums={memorandums} onRetry={onRetry} />
  </Card>
}

export function MemorandumPublicationSection({ postulacion, seguimientoEtapa, contract, memorandums, canPublish, disabled, hasPendingAssignments, onPublished, onPublishingChange, onRetry }) {
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
