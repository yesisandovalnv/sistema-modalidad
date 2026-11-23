import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Modal } from '../../components/crud/CrudShell'
import { postulacionesService } from '../../services/postulacionesService'

const TYPE = { REVISION_TUTOR: ['TUTOR', 'INFORME_TUTOR_TESIS', 'Dictamen del Tutor'], REVISION_TRIBUNAL: ['TRIBUNAL', 'INFORME_TRIB_TESIS', 'Dictamen del Tribunal'] }

export default function DocumentReviewDictamens({ stage, documents, assignments, canManage, onChanged, contextualPostulacion, onRegisterContextualOpen }) {
  const config = TYPE[stage?.codigo]
  const [state, setState] = useState({ loading: Boolean(config), data: [], error: '', form: false, submitting: false })
  const controller = useRef(null)
  const formOpener = useRef(null)
  const contextualOpen = useRef(null)
  const contextualForm = useRef(false)
  useEffect(() => {
    if (!config) return undefined
    controller.current?.abort(); const request = new AbortController(); controller.current = request
    setState((current) => ({ ...current, loading: true, error: '' }))
    postulacionesService.obtenerDictamenesRevision(stage.id, request.signal).then((data) => {
      if (!request.signal.aborted) setState((current) => ({ ...current, loading: false, data: Array.isArray(data) ? data : data.results || [] }))
    }).catch((error) => { if (!error.canceled && !request.signal.aborted) setState((current) => ({ ...current, loading: false, error: error.message })) })
    return () => request.abort()
  }, [stage?.id, config])
  useEffect(() => {
    if (!onRegisterContextualOpen) return undefined
    onRegisterContextualOpen((event) => contextualOpen.current?.(event) === true)
    return () => onRegisterContextualOpen(null)
  }, [onRegisterContextualOpen, stage?.id])
  if (!config) return null
  const [type, evidenceCode, title] = config
  const rows = documents?.data?.results || []
  const finalDocument = rows.find((item) => item.tipo_documento_codigo === 'DOCUMENTO_FINAL' || item.tipo_documento_nombre === 'Documento Final')
  const finalVersion = finalDocument?.versiones?.find((item) => item.es_version_actual && item.activo !== false)
  const evidence = rows.find((item) => item.tipo_documento_codigo === evidenceCode)?.versiones?.filter((item) => item.es_version_actual && item.activo !== false) || []
  const tutors = (assignments?.data?.results || []).filter((item) => item.tipo_participacion === 'TUTOR' && item.activo !== false)
  const submit = async (event) => {
    event.preventDefault(); if (state.submitting) return
    const form = event.currentTarget.elements
    const payload = { tipo_revision: type, version_documento_revisada: finalVersion?.id, evidencia_version: Number(form.evidencia_version.value), resultado: form.resultado.value, observaciones: form.observaciones.value.trim() }
    if (type === 'TUTOR') payload.asignacion_emisora = Number(form.asignacion_emisora.value)
    controller.current?.abort(); controller.current = new AbortController(); setState((current) => ({ ...current, submitting: true, error: '' }))
    try { await postulacionesService.registrarDictamenRevision(stage.id, payload, controller.current.signal); await onChanged(); setState((current) => ({ ...current, submitting: false })); closeForm({ force: true }) }
    catch (error) { if (!error.canceled) setState((current) => ({ ...current, submitting: false, error: error.message })) }
  }
  const openForm = (event) => {
    if (state.form || state.submitting) return
    formOpener.current = event.currentTarget
    setState((current) => ({ ...current, form: true, error: '' }))
  }
  contextualOpen.current = (event) => {
    const complete = (resource) => resource?.data && !resource.loading && !resource.error
      && (resource.data.count == null || resource.data.count === resource.data.results?.length)
    const owned = (item) => item.activo === true && String(item.postulacion) === String(contextualPostulacion)
    const finals = rows.filter((item) => item.tipo_documento_codigo === 'DOCUMENTO_FINAL')
    const reports = rows.filter((item) => item.tipo_documento_codigo === evidenceCode)
    const tribunals = (assignments?.data?.results || []).filter((item) => item.tipo_participacion === 'TRIBUNAL' && item.activo !== false)
    const validActors = type === 'TUTOR'
      ? tutors.length === 1 && owned(tutors[0]) && Boolean(tutors[0].id)
      : tribunals.length === 3 && tribunals.every((item) => owned(item) && item.id && item.usuario
        && ['TEMATICA_TESIS', 'PERFIL_TESIS'].includes(item.etapa_codigo) && item.seguimiento_etapa != null)
        && new Set(tribunals.map((item) => String(item.id))).size === 3
        && new Set(tribunals.map((item) => String(item.usuario))).size === 3
        && tribunals.map((item) => Number(item.orden_cargo)).sort().join(',') === '1,2,3'
    const currentVersions = (document) => (document?.versiones || []).filter((version) => version.activo === true && version.es_version_actual === true && version.id)
    const evidenceReady = reports.length === 1 && owned(reports[0])
      && currentVersions(reports[0]).length === 1 && evidence.length === 1
    const canOpenWithoutEvidence = type === 'TRIBUNAL' && stage.codigo === 'REVISION_TRIBUNAL'
      && reports.length === 0 && evidence.length === 0
    if (!contextualPostulacion || !stage.id || stage.activo === false
      || !['EN_PROCESO', 'OBSERVADA'].includes(stage.estado) || !canManage
      || state.loading || state.error || !complete(documents) || !complete(assignments)
      || finals.length !== 1 || !owned(finals[0]) || (!evidenceReady && !canOpenWithoutEvidence)
      || currentVersions(finals[0]).length !== 1
      || String(finalVersion?.id) !== String(currentVersions(finals[0])[0]?.id)
      || !validActors
      || state.data.some((item) => !item.id || typeof item.activo !== 'boolean' || !item.tipo_revision || !item.version_documento_revisada)
      || state.data.some((item) => item.activo !== false && item.tipo_revision === type
        && String(item.version_documento_revisada) === String(finalVersion?.id))) return false
    if (state.form || state.submitting) return true
    contextualForm.current = true
    openForm(event)
    return true
  }
  const renderModal = (modal) => contextualForm.current ? createPortal(modal, document.body) : modal
  const closeForm = ({ force = false } = {}) => {
    if (state.submitting && !force) return
    const opener = formOpener.current
    formOpener.current = null
    contextualForm.current = false
    setState((current) => ({ ...current, form: false, error: '' }))
    requestAnimationFrame(() => {
      if (opener?.isConnected && !opener.closest('[hidden]') && !opener.disabled && typeof opener.focus === 'function') opener.focus()
    })
  }
  return <Card id={stage.codigo === 'REVISION_TUTOR' ? 'dictamen-tutor' : 'dictamen-tribunal'} className="scroll-mt-24" aria-label={title}><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{title}</h2><p className="text-sm text-slate-500">Versión exacta, evidencia e historial del dictamen.</p></div>{canManage && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado) && <Button disabled={state.submitting} onClick={openForm}>Registrar dictamen</Button>}</div>
    {state.loading && <p className="mt-3 text-sm">Cargando dictámenes…</p>}{state.error && !state.form && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
    {!state.loading && state.data.map((item) => <article key={item.id} className="mt-3 rounded border p-3 text-sm"><strong>{item.resultado}</strong> · {item.tipo_revision} · Documento Final versión {item.version_documento_revisada} <span className="ml-2 text-slate-500">{item.activo ? 'Activo' : 'Histórico'}</span><p className="mt-1 text-slate-500">Evidencia: {item.evidencia_version_nombre || `versión ${item.evidencia_version}`}</p><p>{item.observaciones || 'Sin observaciones'}</p></article>)}
    {state.form && renderModal(<Modal title={title} onClose={closeForm}><form className="mt-4 grid gap-3" onSubmit={submit}><p className="text-sm">Documento Final: {finalVersion ? `versión ${finalVersion.numero_version}` : 'sin versión vigente'}</p>{type === 'TUTOR' && <label className="text-sm">Tutor<select name="asignacion_emisora" required autoFocus className="mt-1 w-full rounded border p-2"><option value="">Seleccione</option>{tutors.map((actor) => <option key={actor.id} value={actor.id}>{actor.usuario_nombre || actor.usuario_detalle?.nombre || `Tutor ${actor.id}`}</option>)}</select></label>}<label className="text-sm">Resultado<select name="resultado" required autoFocus={type !== 'TUTOR'} className="mt-1 w-full rounded border p-2"><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select></label><label className="text-sm">Evidencia<select name="evidencia_version" required className="mt-1 w-full rounded border p-2"><option value="">Seleccione</option>{evidence.map((item) => <option key={item.id} value={item.id}>{item.nombre_original || `versión ${item.numero_version}`}</option>)}</select></label><label className="text-sm">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded border p-2" /></label>{state.error && <p role="alert" className="text-red-600">{state.error}</p>}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={state.submitting || !finalVersion || evidence.length === 0 || (type === 'TUTOR' && tutors.length === 0)}>{state.submitting ? 'Registrando…' : 'Registrar'}</Button><Button type="button" variant="secondary" disabled={state.submitting} onClick={closeForm}>Cancelar</Button></div></form></Modal>)}
  </Card>
}
