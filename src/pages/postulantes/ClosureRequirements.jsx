import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { CircleCheck } from 'lucide-react'
import { postulacionesService } from '../../services/postulacionesService'

const rows = (data) => data?.results || data || []
const date = (value) => value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Pendiente'

export default function ClosureRequirements({
  postulacion,
  canManage,
  onChanged,
  showConditions = true,
  requiredDeliveries = null,
  deliveryCodes = null,
  title = 'Condiciones y entregas técnicas',
  description = 'Estos registros preparan el cierre documental; no acreditan legalización, titulación ni cierre universitario.',
  titleId = 'controles-cierre-title',
  createLabel = 'Preparar recepción',
  embedded = false,
  collapseDetailsByDefault = false,
}) {
  const [state, setState] = useState({ conditions: null, deliveries: null, loading: true, error: '' })
  const [action, setAction] = useState(null)
  const [deliveryCreation, setDeliveryCreation] = useState({ codigo: '', submitting: false, error: '' })
  const [selectedConditionIds, setSelectedConditionIds] = useState([])
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState([])
  const [deliveryBatch, setDeliveryBatch] = useState(null)
  const [conditionBatchSubmission, setConditionBatchSubmission] = useState({ submitting: false, error: '' })
  const [deliveryBatchSubmission, setDeliveryBatchSubmission] = useState({ submitting: false, error: '' })
  const controller = useRef(null)
  const selectPendingRef = useRef(null)
  const selectPendingDeliveryRef = useRef(null)
  const submitting = useRef(false)
  const load = async () => {
    controller.current?.abort(); controller.current = new AbortController(); setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const conditionsRequest = showConditions
        ? postulacionesService.obtenerCondiciones(postulacion, controller.current.signal)
        : Promise.resolve({ results: [] })
      const [conditions, deliveries] = await Promise.all([conditionsRequest, postulacionesService.obtenerEntregas(postulacion, controller.current.signal)])
      setState({ conditions, deliveries, loading: false, error: '' })
    } catch (error) { if (!error.canceled) setState((current) => ({ ...current, loading: false, error: error.message })) }
  }
  useEffect(() => { load(); return () => controller.current?.abort() }, [postulacion]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const eligibleIds = new Set(rows(state.conditions)
      .filter((item) => canManage && item.activo !== false && item.estado === 'PENDIENTE')
      .map((item) => String(item.id)))
    setSelectedConditionIds((current) => {
      const next = current.filter((id) => eligibleIds.has(String(id)))
      return next.length === current.length ? current : next
    })
  }, [state.conditions, canManage])

  useEffect(() => {
    const eligibleIds = new Set(rows(state.deliveries)
      .filter((item) => canManage && item.id != null && item.activo !== false && item.estado === 'PENDIENTE')
      .map((item) => String(item.id)))
    setSelectedDeliveryIds((current) => {
      const next = current.filter((id) => eligibleIds.has(String(id)))
      return next.length === current.length ? current : next
    })
  }, [state.deliveries, canManage])

  const conditions = rows(state.conditions)
  const eligibleConditions = canManage
    ? conditions.filter((item) => item.activo !== false && item.estado === 'PENDIENTE')
    : []
  const eligibleConditionIds = new Set(eligibleConditions.map((item) => String(item.id)))
  const selectedEligibleIds = selectedConditionIds.filter((id) => eligibleConditionIds.has(String(id)))
  const allPendingSelected = eligibleConditions.length > 0 && selectedEligibleIds.length === eligibleConditions.length

  useEffect(() => {
    if (selectPendingRef.current) {
      selectPendingRef.current.indeterminate = selectedEligibleIds.length > 0
        && selectedEligibleIds.length < eligibleConditions.length
    }
  }, [selectedEligibleIds.length, eligibleConditions.length])

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

  const verifySelectedConditions = async () => {
    if (submitting.current || !canManage || selectedEligibleIds.length === 0) return
    submitting.current = true
    setConditionBatchSubmission({ submitting: true, error: '' })
    controller.current?.abort(); controller.current = new AbortController()
    try {
      await postulacionesService.verificarCondiciones(
        postulacion,
        selectedEligibleIds,
        '',
        controller.current.signal,
      )
      await load()
      setSelectedConditionIds([])
      setConditionBatchSubmission({ submitting: false, error: '' })
      onChanged?.()
    } catch (error) {
      if (!error.canceled) setConditionBatchSubmission({ submitting: false, error: error.message })
    } finally { submitting.current = false }
  }

  const openBatchDeliveryForm = () => {
    if (submitting.current || !canManage || selectedEligibleDeliveryIds.length === 0) return
    setDeliveryBatch({ ids: selectedEligibleDeliveryIds, submitting: false, error: '', fieldErrors: {} })
  }

  const submitBatchDeliveries = async (event) => {
    event.preventDefault()
    if (!deliveryBatch || submitting.current) return

    const form = event.currentTarget
    const payload = []
    const fieldErrors = {}
    let batchError = ''
    deliveryBatch.ids.forEach((id) => {
      const item = deliveries.find((entry) => String(entry.id) === String(id))
      const qtyField = form.elements.namedItem(`cantidad_${id}`)
      const rawAmount = qtyField?.value?.trim() || ''
      const amount = Number(rawAmount)
      if (!item) {
        batchError = 'Una entrega seleccionada ya no está disponible. Actualiza el cierre e inténtalo de nuevo.'
        return
      }
      if (!rawAmount || !Number.isInteger(amount) || amount < 1) {
        fieldErrors[String(id)] = `Ingresa la cantidad recibida para ${item.nombre}. Debe ser un entero mayor que cero.`
        return
      }
      const obsField = form.elements.namedItem(`observaciones_${id}`)
      payload.push({
        id: Number(id),
        cantidad_recibida: amount,
        observaciones: obsField?.value?.trim() || '',
      })
    })

    if (Object.keys(fieldErrors).length > 0 || batchError) {
      setDeliveryBatch((current) => ({ ...current, submitting: false, error: batchError, fieldErrors }))
      setDeliveryBatchSubmission({ submitting: false, error: '' })
      return
    }

    submitting.current = true
    setDeliveryBatchSubmission({ submitting: true, error: '' })
    setDeliveryBatch((current) => ({ ...current, submitting: true, error: '', fieldErrors: {} }))
    controller.current?.abort(); controller.current = new AbortController()

    try {
      await postulacionesService.registrarEntregas(postulacion, payload, controller.current.signal)
      await load()
      setSelectedDeliveryIds([])
      setDeliveryBatch(null)
      setDeliveryBatchSubmission({ submitting: false, error: '' })
      onChanged?.()
    } catch (error) {
      if (!error.canceled) {
        setDeliveryBatch((current) => ({ ...current, submitting: false, error: error.message }))
        setDeliveryBatchSubmission({ submitting: false, error: error.message })
      }
    } finally {
      submitting.current = false
    }
  }

  const closeAction = () => { if (!submitting.current) setAction(null) }
  const createDelivery = async (requirement) => {
    if (submitting.current || !canManage) return
    submitting.current = true
    controller.current?.abort(); controller.current = new AbortController()
    setDeliveryCreation({ codigo: requirement.codigo, submitting: true, error: '' })
    try {
      const created = await postulacionesService.crearEntregaFisica(postulacion, requirement.codigo, requirement.nombre, requirement.cantidad === null ? null : 1, controller.current.signal)
      setDeliveryCreation({ codigo: '', submitting: false, error: '' })
      await load()
      setAction({ kind: 'entrega', operation: 'registrar', item: created, submitting: false, error: '' })
    } catch (error) {
      if (!error.canceled) setDeliveryCreation({ codigo: requirement.codigo, submitting: false, error: error.message })
    } finally { submitting.current = false }
  }
  const actionForm = (current) => <form aria-label={`${current.operation === 'verificar' ? 'Verificar' : current.kind === 'condicion' ? 'Marcar no cumple' : 'Registrar entrega'}: ${current.item.nombre}`} className="mt-3 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950" onSubmit={submit}>
    <h3 className="font-semibold">{current.kind === 'condicion' ? `${current.operation === 'verificar' ? 'Verificar' : 'No cumple'}: ${current.item.nombre}` : `Registrar entrega: ${current.item.nombre}`}</h3>
    {current.kind === 'entrega' && <label className="mt-3 block text-sm">Cantidad recibida<input name="cantidad_recibida" type="number" min="1" required defaultValue={current.item.cantidad_recibida || 1} className="mt-1 w-full rounded-md border p-2" /></label>}
    <label className="mt-3 block text-sm">Observaciones (opcional)<textarea name="observaciones" defaultValue={current.item.observaciones || ''} className="mt-1 w-full rounded-md border p-2" /></label>
    {current.error && <p role="alert" className="mt-2 text-sm text-red-600">{current.error}</p>}
    <div className="mt-3 flex gap-2"><Button type="submit" disabled={current.submitting}>{current.submitting ? 'Procesando…' : 'Guardar'}</Button><Button type="button" variant="secondary" disabled={current.submitting} onClick={closeAction}>Cancelar</Button></div>
  </form>

  const allDeliveries = rows(state.deliveries)
  const deliveries = Array.isArray(requiredDeliveries)
    ? requiredDeliveries.map((requirement) => allDeliveries.find((item) => item.codigo === requirement.codigo) || {
        ...requirement,
        id: null,
        estado: 'PENDIENTE',
        estado_display: 'Pendiente de recepción',
        cantidad: requirement.cantidad === null ? null : 1,
        cantidad_recibida: 0,
      })
    : Array.isArray(deliveryCodes)
      ? allDeliveries.filter((item) => deliveryCodes.includes(item.codigo))
      : allDeliveries
  const completedConditions = conditions.filter((item) => item.estado === 'CUMPLE').length
  const completedDeliveries = deliveries.filter((item) => item.estado === 'COMPLETA').length
  const conditionsComplete = conditions.length > 0 && completedConditions === conditions.length
  const deliveriesComplete = deliveries.length > 0 && completedDeliveries === deliveries.length
  const deliveryHeading = showConditions ? 'Entregas técnicas' : 'Entregas físicas'
  const eligibleDeliveries = canManage
    ? deliveries.filter((item) => item.id != null && item.activo !== false && item.estado === 'PENDIENTE')
    : []
  const eligibleDeliveryIds = new Set(eligibleDeliveries.map((item) => String(item.id)))
  const selectedEligibleDeliveryIds = selectedDeliveryIds.filter((id) => eligibleDeliveryIds.has(String(id)))
  const allPendingDeliveriesSelected = eligibleDeliveries.length > 0 && selectedEligibleDeliveryIds.length === eligibleDeliveries.length

  useEffect(() => {
    if (selectPendingDeliveryRef.current) {
      selectPendingDeliveryRef.current.indeterminate = selectedEligibleDeliveryIds.length > 0 && selectedEligibleDeliveryIds.length < eligibleDeliveries.length
    }
  }, [selectedEligibleDeliveryIds.length, eligibleDeliveries.length])

  const Heading = embedded ? 'h3' : 'h2'
  return <Card className={`closure-req ${embedded ? 'overflow-hidden rounded-none border-0 border-t border-sky-200 bg-transparent p-0 pt-5 shadow-none dark:border-sky-800' : 'overflow-hidden'}`} aria-labelledby={titleId}>
    <Heading id={titleId} className="text-xl font-bold">{title}</Heading>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    {state.loading && <p role="status" className="mt-4 text-sm">Cargando condiciones y entregas…</p>}
    {state.error && <div className="mt-4"><p role="alert" className="text-sm text-red-600">{state.error}</p><Button className="mt-2" variant="secondary" onClick={load}>Reintentar</Button></div>}
    {!state.loading && !state.error && <div className={`mt-5 grid items-start gap-4 ${showConditions ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
      {showConditions && <details open={!collapseDetailsByDefault && !conditionsComplete} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <summary className="cursor-pointer list-none font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">{conditionsComplete && <CircleCheck className="closure-req-done" aria-hidden="true" />}Condiciones técnicas <span className="font-normal text-slate-500">{completedConditions}/{conditions.length} cumplidas · Ver detalle</span></summary>
        {canManage && <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              ref={selectPendingRef}
              type="checkbox"
              aria-label="Seleccionar pendientes"
              checked={allPendingSelected}
              disabled={eligibleConditions.length === 0 || conditionBatchSubmission.submitting || Boolean(action)}
              onChange={(event) => setSelectedConditionIds(event.currentTarget.checked ? eligibleConditions.map((item) => item.id) : [])}
            />
            Seleccionar pendientes
          </label>
          {selectedEligibleIds.length > 0 && <Button type="button" disabled={conditionBatchSubmission.submitting || Boolean(action)} onClick={verifySelectedConditions}>
            {conditionBatchSubmission.submitting ? 'Verificando seleccionadas…' : `Verificar seleccionadas (${selectedEligibleIds.length})`}
          </Button>}
          {conditionBatchSubmission.error && <p role="alert" className="w-full text-sm text-red-600">{conditionBatchSubmission.error}</p>}
        </div>}
        {conditions.length === 0 ? <p className="mt-2 text-sm">Sin condiciones configuradas.</p> : <ul className="mt-3 space-y-3">{conditions.map((item) => {
          const selectable = canManage && item.activo !== false && item.estado === 'PENDIENTE'
          const selected = selectedEligibleIds.some((id) => String(id) === String(item.id))
          return <li key={item.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-2">
              {selectable && <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${item.nombre}`}
                  checked={selected}
                  disabled={conditionBatchSubmission.submitting || Boolean(action)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked
                    setSelectedConditionIds((current) => checked
                      ? current.some((id) => String(id) === String(item.id)) ? current : [...current, item.id]
                      : current.filter((id) => String(id) !== String(item.id)))
                  }}
                />
              </label>}
              <strong>{item.nombre}</strong>
            </div>
            <p>Estado: {item.estado_display || item.estado}</p><p>Verificador: {item.verificado_por_nombre || 'Pendiente'}</p><p>Fecha: {date(item.fecha_verificacion)}</p>{item.observaciones && <p>Observaciones: {item.observaciones}</p>}
            {canManage && item.activo !== false && item.estado === 'PENDIENTE' && <div className="mt-2 flex gap-2"><Button type="button" disabled={conditionBatchSubmission.submitting} onClick={() => setAction({ kind: 'condicion', operation: 'verificar', item, submitting: false, error: '' })}>Verificar</Button><Button type="button" variant="secondary" disabled={conditionBatchSubmission.submitting} onClick={() => setAction({ kind: 'condicion', operation: 'rechazar', item, submitting: false, error: '' })}>No cumple</Button></div>}
            {action?.kind === 'condicion' && action.item.id === item.id && actionForm(action)}
          </li>
        })}</ul>}
      </details>}
      <details open={!collapseDetailsByDefault && !deliveriesComplete} className={`rounded-lg border border-slate-200 p-4 dark:border-slate-700 ${embedded ? 'bg-white/70 dark:bg-slate-900/60' : ''}`}>
        <summary className="cursor-pointer list-none font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">{deliveriesComplete && <CircleCheck className="closure-req-done" aria-hidden="true" />}{deliveryHeading} <span className="font-normal text-slate-500">{completedDeliveries}/{deliveries.length} completas · Ver detalle</span></summary>
        {canManage && <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              ref={selectPendingDeliveryRef}
              type="checkbox"
              aria-label="Seleccionar pendientes (entregas)"
              checked={allPendingDeliveriesSelected}
              disabled={eligibleDeliveries.length === 0 || deliveryBatchSubmission.submitting || Boolean(action)}
              onChange={(event) => setSelectedDeliveryIds(event.currentTarget.checked ? eligibleDeliveries.map((item) => item.id) : [])}
            />
            Seleccionar pendientes
          </label>
          {selectedEligibleDeliveryIds.length > 0 && <Button type="button" disabled={deliveryBatchSubmission.submitting || Boolean(action)} onClick={openBatchDeliveryForm}>
            {deliveryBatchSubmission.submitting ? 'Registrando seleccionadas…' : `Registrar seleccionadas (${selectedEligibleDeliveryIds.length})`}
          </Button>}
        </div>}
        {deliveryBatch && <form aria-label={`Registrar entregas seleccionadas (${deliveryBatch.ids.length})`} className="mt-3 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950" noValidate onSubmit={submitBatchDeliveries}>
          {deliveryBatch.ids.map((id) => {
            const item = deliveries.find((entry) => String(entry.id) === String(id))
            if (!item) return null
            const quantityError = deliveryBatch.fieldErrors?.[String(id)]
            return <div key={id} className="mb-3 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <h4 className="font-semibold">{item.nombre}</h4>
              <label className="mt-3 block text-sm">Cantidad recibida: {item.nombre}<input aria-label={`Cantidad recibida: ${item.nombre}`} name={`cantidad_${id}`} type="number" min="1" required aria-invalid={Boolean(quantityError)} aria-describedby={quantityError ? `cantidad-error-${id}` : undefined} defaultValue={item.cantidad_recibida > 0 ? item.cantidad_recibida : ''} onChange={() => setDeliveryBatch((current) => {
                if (!current?.fieldErrors?.[String(id)]) return current
                const fieldErrors = { ...current.fieldErrors }
                delete fieldErrors[String(id)]
                return { ...current, fieldErrors }
              })} className="mt-1 w-full rounded-md border p-2" /></label>
              {quantityError && <p id={`cantidad-error-${id}`} role="alert" className="mt-1 text-sm text-red-600">{quantityError}</p>}
              <label className="mt-3 block text-sm">Observaciones: {item.nombre} (opcional)<textarea aria-label={`Observaciones: ${item.nombre} (opcional)`} name={`observaciones_${id}`} defaultValue={item.observaciones || ''} className="mt-1 w-full rounded-md border p-2" /></label>
            </div>
          })}
          {deliveryBatch.error && <p role="alert" className="mt-2 text-sm text-red-600">{deliveryBatch.error}</p>}
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={deliveryBatch.submitting}>{deliveryBatch.submitting ? 'Procesando…' : 'Guardar lotes'}</Button>
            <Button type="button" variant="secondary" disabled={deliveryBatch.submitting} onClick={() => setDeliveryBatch(null)}>Cancelar</Button>
          </div>
        </form>}
        {deliveries.length === 0 ? <p className="mt-2 text-sm">Sin entregas configuradas.</p> : <ul className="mt-3 space-y-3">{deliveries.map((item) => {
          const selectable = canManage && item.id != null && item.activo !== false && item.estado === 'PENDIENTE'
          const selected = selectedEligibleDeliveryIds.some((id) => String(id) === String(item.id))
          return <li key={item.codigo} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex-1"><strong>{item.nombre}</strong></span>
              {selectable && <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${item.nombre}`}
                  checked={selected}
                  disabled={deliveryBatchSubmission.submitting || Boolean(action)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked
                    setSelectedDeliveryIds((current) => checked
                      ? current.some((id) => String(id) === String(item.id)) ? current : [...current, item.id]
                      : current.filter((id) => String(id) !== String(item.id)))
                  }}
                />
              </label>}
            </div>
            <p>Estado: {item.estado_display || item.estado}</p><p>Cantidad técnica requerida: {item.cantidad ?? 'No definida'}</p><p>Cantidad recibida: {item.cantidad_recibida || 0}</p><p>Receptor: {item.recibido_por_nombre || 'Pendiente'}</p><p>Fecha: {date(item.fecha_entrega)}</p>{item.codigo === 'EJEMPLARES_IMPRESOS' && <p className="mt-2 text-amber-700">La cantidad registrada no certifica una cantidad normativa oficial.</p>}{canManage && !item.id && <><Button className="mt-2" disabled={deliveryCreation.submitting} onClick={() => createDelivery(item)}>{deliveryCreation.submitting && deliveryCreation.codigo === item.codigo ? 'Preparando…' : createLabel}</Button>{deliveryCreation.codigo === item.codigo && deliveryCreation.error && <p role="alert" className="mt-2 text-sm text-red-600">{deliveryCreation.error}</p>}</>}{canManage && item.id && <Button className="mt-2" onClick={() => setAction({ kind: 'entrega', operation: 'registrar', item, submitting: false, error: '' })}>Registrar/actualizar entrega</Button>}{action?.kind === 'entrega' && action.item.id === item.id && actionForm(action)}</li>
        })}</ul>}</details>
    </div>}
  </Card>
}
