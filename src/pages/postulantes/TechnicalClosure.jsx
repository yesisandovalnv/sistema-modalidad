import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { humanizeRequirementCode, postulacionesService } from '../../services/postulacionesService'
import { formatCodeLabel } from '../../lib/utils'

const LEGAL_WARNING = 'El cierre registrado en el sistema corresponde al cierre técnico/documental del expediente y no sustituye el acta oficial, firmas, legalización, titulación ni procesamiento universitario posterior.'

const ACTIONS = {
  revision: { title: 'Aprobar revisión final', confirm: '¿Confirmas la aprobación técnica de la revisión final?', method: 'aprobarRevisionFinal', field: 'observaciones' },
  cierre: { title: 'Aprobar cierre documental', confirm: '¿Confirmas la aprobación del cierre técnico/documental?', method: 'aprobarCierreDocumental', field: 'observaciones' },
  concluir: { title: 'Concluir técnicamente', confirm: '¿Confirmas la conclusión técnica de la postulación?', method: 'concluirPostulacion', field: 'observaciones' },
  reabrir: { title: 'Reabrir cierre', confirm: '¿Confirmas la reapertura del cierre técnico?', method: 'reabrirCierre', field: 'motivo' },
}

function List({ title, items = [], empty, requirements = false }) {
  return <section aria-label={title} className="min-w-0">
    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{title}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-sm tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length}</span></div>
    {items.length ? <ul className="mt-3 space-y-2 text-sm leading-relaxed">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 [overflow-wrap:anywhere]"><span aria-hidden="true" className="text-slate-400">•</span><span className="min-w-0">{requirements ? humanizeRequirementCode(item) : item}</span></li>)}</ul> : <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{empty}</p>}
  </section>
}

function ClosureStatus({ children }) {
  return <span className="inline-flex max-w-full rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700 [overflow-wrap:anywhere] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{children}</span>
}

function closureWarnings(cierre) {
  const groups = { CONDICION: cierre.condiciones_faltantes, ENTREGA: cierre.entregas_faltantes, DOCUMENTO: cierre.documentos_faltantes }
  return (cierre.advertencias_normativas || []).filter((warning) => {
    const match = /^(CONDICION|ENTREGA|DOCUMENTO):([^:\s]+)$/.exec(warning)
    return !match || !groups[match[1]]?.includes(match[2])
  }).map((warning) => {
    const match = /^(CONDICION|ENTREGA|DOCUMENTO):([^:\s]+)$/.exec(warning)
    if (match) return `${formatCodeLabel(match[1])} pendiente: ${humanizeRequirementCode(match[2])}`
    return warning
      .replace(/\b(CONDICION|ENTREGA|DOCUMENTO):/g, (_, type) => `${formatCodeLabel(type)}: `)
      .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, humanizeRequirementCode)
      .replaceAll('TipoDocumento', 'tipo de documento')
  })
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
      setState({ data, loading: false, error: '' }); setAction(null); onChanged?.(data)
    } catch (error) {
      if (!error.canceled) setAction((current) => ({ ...current, submitting: false, error: error.message, fields: error.fields || {} }))
    }
  }

  const cierre = state.data
  const closureStage = stages.find((item) => item.codigo === 'CIERRE_DOCUMENTAL')
  const reviewStage = stages.find((item) => item.codigo === 'REVISION_FINAL_POST_PUBLICA')
  const currentStage = stages.find((item) => item.codigo === cierre?.etapa_actual)
  const warnings = cierre ? closureWarnings(cierre) : []
  return <Card className="min-w-0" aria-labelledby="cierre-tecnico-title">
    <h2 id="cierre-tecnico-title" className="text-xl font-bold">Cierre técnico</h2>
    <p role="note" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{LEGAL_WARNING}</p>
    {state.loading && <p role="status" className="mt-4 text-sm">Cargando cierre técnico…</p>}
    {state.error && <div className="mt-4"><p role="alert" className="text-sm text-red-600">{state.error}</p><Button className="mt-2" variant="secondary" onClick={load}>Reintentar</Button></div>}
    {!state.loading && !state.error && cierre && <>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2 [&>div]:min-w-0 [&_dd]:mt-1.5 [&_dd]:[overflow-wrap:anywhere] dark:[&_dt]:text-slate-400">
        <div><dt className="text-slate-500">Estado general</dt><dd><ClosureStatus>{formatCodeLabel(cierre.estado_general) || 'No registrado'}</ClosureStatus></dd></div>
        <div><dt className="text-slate-500">Etapa actual</dt><dd className="font-semibold">{currentStage?.nombre || formatCodeLabel(cierre.etapa_actual) || 'Sin etapa pendiente'}</dd></div>
        <div><dt className="text-slate-500">Revisión final</dt><dd><ClosureStatus>{cierre.revision_final_aprobada ? 'Aprobada' : 'Pendiente'}</ClosureStatus></dd></div>
        <div><dt className="text-slate-500">Cierre documental</dt><dd><ClosureStatus>{cierre.cierre_documental_aprobado ? 'Aprobado' : 'Pendiente'}</ClosureStatus></dd></div>
        <div><dt className="text-slate-500">Nota final</dt><dd className="text-xl font-bold tabular-nums">{resultado?.data?.nota_final ?? 'Pendiente'}</dd></div>
        <div><dt className="text-slate-500">Clasificación</dt><dd className="font-semibold leading-relaxed">{formatCodeLabel(resultado?.data?.clasificacion) || 'Pendiente'}</dd></div>
        <div><dt className="text-slate-500">Responsable revisión</dt><dd className="font-medium">{reviewStage?.cerrada_por_nombre || 'No registrado'}</dd></div>
        <div><dt className="text-slate-500">Responsable cierre</dt><dd className="font-medium">{closureStage?.cerrada_por_nombre || 'No registrado'}</dd></div>
      </dl>
      <div className="mt-6 grid gap-5 border-t border-slate-200 pt-5 dark:border-slate-700 xl:grid-cols-2">
        <List title="Condiciones pendientes" items={cierre.condiciones_faltantes} requirements empty="Todas las condiciones técnicas están cumplidas." />
        <List title="Entregas pendientes" items={cierre.entregas_faltantes} requirements empty="Todas las entregas técnicas están completas." />
        <List title="Documentos pendientes" items={cierre.documentos_faltantes} requirements empty="No hay documentos técnicos faltantes." />
      </div>
      {warnings.length > 0 && <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"><List title="Advertencias normativas" items={warnings} /></div>}
      {canManage && <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
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
      <div className="mt-3 flex flex-wrap justify-end gap-3"><Button type="submit" disabled={action.submitting}>{action.submitting ? 'Procesando…' : 'Confirmar'}</Button><Button type="button" variant="secondary" disabled={action.submitting} onClick={() => setAction(null)}>Cancelar</Button></div>
    </form>}
  </Card>
}
