import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const rows = (data) => data?.results || data || []
const date = (value) => value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Pendiente'

export default function ClosureRequirements({ postulacion, canManage, onChanged }) {
  const [state, setState] = useState({ conditions: null, deliveries: null, loading: true, error: '' })
  const [action, setAction] = useState(null)
  const controller = useRef(null)
  const submitting = useRef(false)
  const load = async () => {
    controller.current?.abort(); controller.current = new AbortController(); setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [conditions, deliveries] = await Promise.all([postulacionesService.obtenerCondiciones(postulacion, controller.current.signal), postulacionesService.obtenerEntregas(postulacion, controller.current.signal)])
      setState({ conditions, deliveries, loading: false, error: '' })
    } catch (error) { if (!error.canceled) setState((current) => ({ ...current, loading: false, error: error.message })) }
  }
  useEffect(() => { load(); return () => controller.current?.abort() }, [postulacion]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault(); if (!action || submitting.current) return
    submitting.current = true
    const elements = event.currentTarget.elements; controller.current?.abort(); controller.current = new AbortController(); setAction((current) => ({ ...current, submitting: true, error: '' }))
    try {
      if (action.kind === 'condicion') await (action.operation === 'verificar' ? postulacionesService.verificarCondicion : postulacionesService.rechazarCondicion)(action.item.id, elements.observaciones.value.trim(), controller.current.signal)
      else await postulacionesService.registrarEntrega(action.item.id, Number(elements.cantidad_recibida.value), elements.observaciones.value.trim(), controller.current.signal)
      setAction(null); await load(); onChanged?.()
    } catch (error) { if (!error.canceled) setAction((current) => ({ ...current, submitting: false, error: error.message })) }
    finally { submitting.current = false }
  }

  const closeAction = () => { if (!submitting.current) setAction(null) }
  const actionForm = (current) => <form aria-label={`${current.operation === 'verificar' ? 'Verificar' : current.kind === 'condicion' ? 'Marcar no cumple' : 'Registrar entrega'}: ${current.item.nombre}`} className="mt-3 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950" onSubmit={submit}>
    <h3 className="font-semibold">{current.kind === 'condicion' ? `${current.operation === 'verificar' ? 'Verificar' : 'No cumple'}: ${current.item.nombre}` : `Registrar entrega: ${current.item.nombre}`}</h3>
    {current.kind === 'entrega' && <label className="mt-3 block text-sm">Cantidad recibida<input name="cantidad_recibida" type="number" min="1" required defaultValue={current.item.cantidad_recibida || 1} className="mt-1 w-full rounded-md border p-2" /></label>}
    <label className="mt-3 block text-sm">Observaciones (opcional)<textarea name="observaciones" defaultValue={current.item.observaciones || ''} className="mt-1 w-full rounded-md border p-2" /></label>
    {current.error && <p role="alert" className="mt-2 text-sm text-red-600">{current.error}</p>}
    <div className="mt-3 flex gap-2"><Button type="submit" disabled={current.submitting}>{current.submitting ? 'Procesando…' : 'Guardar'}</Button><Button type="button" variant="secondary" disabled={current.submitting} onClick={closeAction}>Cancelar</Button></div>
  </form>

  const conditions = rows(state.conditions)
  const deliveries = rows(state.deliveries)
  const completedConditions = conditions.filter((item) => item.estado === 'CUMPLE').length
  const completedDeliveries = deliveries.filter((item) => item.estado === 'COMPLETA').length
  const conditionsComplete = conditions.length > 0 && completedConditions === conditions.length
  const deliveriesComplete = deliveries.length > 0 && completedDeliveries === deliveries.length

  return <Card className="overflow-hidden" aria-labelledby="controles-cierre-title">
    <h2 id="controles-cierre-title" className="text-xl font-bold">Condiciones y entregas técnicas</h2>
    <p className="mt-1 text-sm text-slate-500">Estos registros preparan el cierre documental; no acreditan legalización, titulación ni cierre universitario.</p>
    {state.loading && <p role="status" className="mt-4 text-sm">Cargando condiciones y entregas…</p>}
    {state.error && <div className="mt-4"><p role="alert" className="text-sm text-red-600">{state.error}</p><Button className="mt-2" variant="secondary" onClick={load}>Reintentar</Button></div>}
    {!state.loading && !state.error && <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
      <details open={!conditionsComplete} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer list-none font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">{conditionsComplete ? '✓ ' : ''}Condiciones técnicas <span className="font-normal text-slate-500">{completedConditions}/{conditions.length} cumplidas · Ver detalle</span></summary>{conditions.length === 0 ? <p className="mt-2 text-sm">Sin condiciones configuradas.</p> : <ul className="mt-3 space-y-3">{conditions.map((item) => <li key={item.id} className="rounded-lg border p-3 text-sm"><strong>{item.nombre}</strong><p>Estado: {item.estado_display || item.estado}</p><p>Verificador: {item.verificado_por_nombre || 'Pendiente'}</p><p>Fecha: {date(item.fecha_verificacion)}</p>{item.observaciones && <p>Observaciones: {item.observaciones}</p>}{canManage && item.estado === 'PENDIENTE' && <div className="mt-2 flex gap-2"><Button onClick={() => setAction({ kind: 'condicion', operation: 'verificar', item, submitting: false, error: '' })}>Verificar</Button><Button variant="secondary" onClick={() => setAction({ kind: 'condicion', operation: 'rechazar', item, submitting: false, error: '' })}>No cumple</Button></div>}{action?.kind === 'condicion' && action.item.id === item.id && actionForm(action)}</li>)}</ul>}</details>
      <details open={!deliveriesComplete} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer list-none font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">{deliveriesComplete ? '✓ ' : ''}Entregas técnicas <span className="font-normal text-slate-500">{completedDeliveries}/{deliveries.length} completas · Ver detalle</span></summary>{deliveries.length === 0 ? <p className="mt-2 text-sm">Sin entregas configuradas.</p> : <ul className="mt-3 space-y-3">{deliveries.map((item) => <li key={item.id} className="rounded-lg border p-3 text-sm"><strong>{item.nombre}</strong><p>Estado: {item.estado_display || item.estado}</p><p>Cantidad técnica requerida: {item.cantidad ?? 'No definida'}</p><p>Cantidad recibida: {item.cantidad_recibida}</p><p>Receptor: {item.recibido_por_nombre || 'Pendiente'}</p><p>Fecha: {date(item.fecha_entrega)}</p>{item.codigo === 'EJEMPLARES_IMPRESOS' && <p className="mt-2 text-amber-700">La cantidad registrada no certifica una cantidad normativa oficial.</p>}{canManage && <Button className="mt-2" onClick={() => setAction({ kind: 'entrega', operation: 'registrar', item, submitting: false, error: '' })}>Registrar/actualizar entrega</Button>}{action?.kind === 'entrega' && action.item.id === item.id && actionForm(action)}</li>)}</ul>}</details>
    </div>}
  </Card>
}
