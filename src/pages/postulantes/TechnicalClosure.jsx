import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const LEGAL_WARNING = 'El cierre registrado en el sistema corresponde al cierre técnico/documental del expediente y no sustituye el acta oficial, firmas, legalización, titulación ni procesamiento universitario posterior.'

const ACTIONS = {
  revision: { title: 'Aprobar revisión final', confirm: '¿Confirmas la aprobación técnica de la revisión final?', method: 'aprobarRevisionFinal', field: 'observaciones' },
  cierre: { title: 'Aprobar cierre documental', confirm: '¿Confirmas la aprobación del cierre técnico/documental?', method: 'aprobarCierreDocumental', field: 'observaciones' },
  concluir: { title: 'Concluir técnicamente', confirm: '¿Confirmas la conclusión técnica de la postulación?', method: 'concluirPostulacion', field: 'observaciones' },
  reabrir: { title: 'Reabrir cierre', confirm: '¿Confirmas la reapertura del cierre técnico?', method: 'reabrirCierre', field: 'motivo' },
}

function List({ title, items, empty }) {
  return <section><h3 className="font-semibold">{title}</h3>{items?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((item) => <li key={String(item)} className="break-words">{String(item)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{empty}</p>}</section>
}

function FieldErrors({ fields }) {
  const entries = Object.entries(fields || {}).filter(([, messages]) => messages)
  if (!entries.length) return null
  return <ul className="mt-2 list-disc pl-5 text-sm text-red-600">{entries.flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).map((message) => <li key={`${field}-${message}`}>{field}: {String(message)}</li>))}</ul>
}

export default function TechnicalClosure({ postulacion, initialClosure, resultado, stages = [], canManage, refreshToken = 0, onChanged }) {
  const [state, setState] = useState({ data: initialClosure?.data || null, loading: false, error: initialClosure?.error || '' })
  const [action, setAction] = useState(null)
  const controller = useRef(null)
  const mounted = useRef(false)

  const load = async () => {
    controller.current?.abort(); controller.current = new AbortController()
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await postulacionesService.obtenerCierre(postulacion, controller.current.signal)
      setState({ data, loading: false, error: '' })
    } catch (error) {
      if (!error.canceled) setState((current) => ({ ...current, loading: false, error: error.message }))
    }
  }

  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    setState({ data: initialClosure?.data || null, loading: false, error: initialClosure?.error || '' })
  }, [initialClosure])
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    load()
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault(); if (!action || action.submitting) return
    const config = ACTIONS[action.kind]
    const value = event.currentTarget.elements[config.field].value.trim()
    if (action.kind === 'reabrir' && !value) {
      setAction((current) => ({ ...current, fields: { motivo: ['El motivo es obligatorio.'] } })); return
    }
    if (!window.confirm(config.confirm)) return
    controller.current?.abort(); controller.current = new AbortController()
    setAction((current) => ({ ...current, submitting: true, error: '', fields: {} }))
    try {
      const data = await postulacionesService[config.method](postulacion, value, controller.current.signal)
      setState({ data, loading: false, error: '' }); setAction(null); onChanged?.()
    } catch (error) {
      if (!error.canceled) setAction((current) => ({ ...current, submitting: false, error: error.message, fields: error.fields || {} }))
    }
  }

  const cierre = state.data
  const closureStage = stages.find((item) => item.codigo === 'CIERRE_DOCUMENTAL')
  const reviewStage = stages.find((item) => item.codigo === 'REVISION_FINAL_POST_PUBLICA')
  return <Card className="overflow-hidden" aria-labelledby="cierre-tecnico-title">
    <h2 id="cierre-tecnico-title" className="text-xl font-bold">Cierre técnico</h2>
    <p role="note" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{LEGAL_WARNING}</p>
    {state.loading && <p role="status" className="mt-4 text-sm">Cargando cierre técnico…</p>}
    {state.error && <div className="mt-4"><p role="alert" className="text-sm text-red-600">{state.error}</p><Button className="mt-2" variant="secondary" onClick={load}>Reintentar</Button></div>}
    {!state.loading && !state.error && cierre && <>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-slate-500">Estado general</dt><dd className="font-semibold">{cierre.estado_general || 'No registrado'}</dd></div>
        <div><dt className="text-slate-500">Etapa actual</dt><dd className="font-semibold">{cierre.etapa_actual || 'Sin etapa pendiente'}</dd></div>
        <div><dt className="text-slate-500">Revisión final</dt><dd className="font-semibold">{cierre.revision_final_aprobada ? 'Aprobada' : 'Pendiente'}</dd></div>
        <div><dt className="text-slate-500">Cierre documental</dt><dd className="font-semibold">{cierre.cierre_documental_aprobado ? 'Aprobado' : 'Pendiente'}</dd></div>
        <div><dt className="text-slate-500">Nota final</dt><dd className="font-semibold">{resultado?.data?.nota_final ?? 'Pendiente'}</dd></div>
        <div><dt className="text-slate-500">Clasificación</dt><dd className="font-semibold">{resultado?.data?.clasificacion || 'Pendiente'}</dd></div>
        <div><dt className="text-slate-500">Responsable revisión</dt><dd className="font-semibold">{reviewStage?.cerrada_por_nombre || 'No registrado'}</dd></div>
        <div><dt className="text-slate-500">Responsable cierre</dt><dd className="font-semibold">{closureStage?.cerrada_por_nombre || 'No registrado'}</dd></div>
      </dl>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <List title="Condiciones pendientes" items={cierre.condiciones_faltantes} empty="Todas las condiciones técnicas están cumplidas." />
        <List title="Entregas pendientes" items={cierre.entregas_faltantes} empty="Todas las entregas técnicas están completas." />
        <List title="Documentos pendientes" items={cierre.documentos_faltantes} empty="No hay documentos técnicos faltantes." />
      </div>
      {cierre.advertencias_normativas?.length > 0 && <div className="mt-5"><List title="Advertencias normativas" items={cierre.advertencias_normativas} /></div>}
      {canManage && <div className="mt-6 flex flex-wrap gap-2">
        {cierre.puede_aprobar_revision_final && !cierre.revision_final_aprobada && <Button onClick={() => setAction({ kind: 'revision', submitting: false, fields: {}, error: '' })}>Aprobar revisión final</Button>}
        {cierre.puede_aprobar_cierre && !cierre.cierre_documental_aprobado && <Button onClick={() => setAction({ kind: 'cierre', submitting: false, fields: {}, error: '' })}>Aprobar cierre documental</Button>}
        {cierre.puede_concluir && !cierre.concluida && <Button onClick={() => setAction({ kind: 'concluir', submitting: false, fields: {}, error: '' })}>Concluir técnicamente</Button>}
        {cierre.cierre_documental_aprobado && <Button variant="secondary" onClick={() => setAction({ kind: 'reabrir', submitting: false, fields: {}, error: '' })}>Reabrir cierre</Button>}
      </div>}
    </>}
    {action && <form className="mt-5 rounded-lg border p-4" onSubmit={submit}>
      <h3 className="font-semibold">{ACTIONS[action.kind].title}</h3>
      <label className="mt-3 block text-sm">{action.kind === 'reabrir' ? 'Motivo' : 'Observaciones'}<textarea name={ACTIONS[action.kind].field} className="mt-1 w-full rounded-md border p-2" /></label>
      {action.error && <p role="alert" className="mt-2 text-sm text-red-600">{action.error}</p>}
      <FieldErrors fields={action.fields} />
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={action.submitting}>{action.submitting ? 'Procesando…' : 'Confirmar'}</Button><Button type="button" variant="secondary" disabled={action.submitting} onClick={() => setAction(null)}>Cancelar</Button></div>
    </form>}
  </Card>
}
