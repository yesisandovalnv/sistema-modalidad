import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'

const TYPE = { REVISION_TUTOR: ['TUTOR', 'INFORME_TUTOR_TESIS', 'Dictamen del Tutor'], REVISION_TRIBUNAL: ['TRIBUNAL', 'INFORME_TRIB_TESIS', 'Dictamen del Tribunal'] }

export default function DocumentReviewDictamens({ stage, documents, assignments, canManage, onChanged }) {
  const config = TYPE[stage?.codigo]
  const [state, setState] = useState({ loading: Boolean(config), data: [], error: '', form: false, submitting: false })
  const controller = useRef(null)
  useEffect(() => {
    if (!config) return undefined
    controller.current?.abort(); const request = new AbortController(); controller.current = request
    setState((current) => ({ ...current, loading: true, error: '' }))
    postulacionesService.obtenerDictamenesRevision(stage.id, request.signal).then((data) => {
      if (!request.signal.aborted) setState((current) => ({ ...current, loading: false, data: Array.isArray(data) ? data : data.results || [] }))
    }).catch((error) => { if (!error.canceled && !request.signal.aborted) setState((current) => ({ ...current, loading: false, error: error.message })) })
    return () => request.abort()
  }, [stage?.id, config])
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
    try { await postulacionesService.registrarDictamenRevision(stage.id, payload, controller.current.signal); setState((current) => ({ ...current, submitting: false, form: false })); await onChanged() }
    catch (error) { if (!error.canceled) setState((current) => ({ ...current, submitting: false, error: error.message })) }
  }
  return <Card aria-label={title}><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{title}</h2><p className="text-sm text-slate-500">Versión exacta, evidencia e historial del dictamen.</p></div>{canManage && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado) && <Button disabled={state.submitting} onClick={() => setState((current) => ({ ...current, form: !current.form, error: '' }))}>Registrar dictamen</Button>}</div>
    {state.loading && <p className="mt-3 text-sm">Cargando dictámenes…</p>}{state.error && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
    {!state.loading && state.data.map((item) => <article key={item.id} className="mt-3 rounded border p-3 text-sm"><strong>{item.resultado}</strong> · {item.tipo_revision} · Documento Final versión {item.version_documento_revisada} <span className="ml-2 text-slate-500">{item.activo ? 'Activo' : 'Histórico'}</span><p className="mt-1 text-slate-500">Evidencia: {item.evidencia_version_nombre || `versión ${item.evidencia_version}`}</p><p>{item.observaciones || 'Sin observaciones'}</p></article>)}
    {state.form && <form className="mt-4 grid gap-3" onSubmit={submit}><p className="text-sm">Documento Final: {finalVersion ? `versión ${finalVersion.numero_version}` : 'sin versión vigente'}</p>{type === 'TUTOR' && <label className="text-sm">Tutor<select name="asignacion_emisora" required className="mt-1 w-full rounded border p-2"><option value="">Seleccione</option>{tutors.map((actor) => <option key={actor.id} value={actor.id}>{actor.usuario_nombre || actor.usuario_detalle?.nombre || `Tutor ${actor.id}`}</option>)}</select></label>}<label className="text-sm">Resultado<select name="resultado" required className="mt-1 w-full rounded border p-2"><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select></label><label className="text-sm">Evidencia<select name="evidencia_version" required className="mt-1 w-full rounded border p-2"><option value="">Seleccione</option>{evidence.map((item) => <option key={item.id} value={item.id}>{item.nombre_original || `Versión ${item.numero_version}`}</option>)}</select></label><label className="text-sm">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded border p-2" /></label><Button type="submit" disabled={state.submitting || !finalVersion || evidence.length === 0 || (type === 'TUTOR' && tutors.length === 0)}>{state.submitting ? 'Registrando…' : 'Registrar'}</Button></form>}
  </Card>
}
