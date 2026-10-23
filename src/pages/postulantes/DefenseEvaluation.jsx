import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/crud/CrudShell'
import { postulacionesService } from '../../services/postulacionesService'

const kind = { DEFENSA_TEMATICA: 'tematica', DEFENSA_PERFIL: 'perfil', DEFENSA_PRIVADA: 'privada', DEFENSA_PUBLICA: 'publica' }
const evaluationTypeByEvent = { tematica: 'TEMATICA', perfil: 'PERFIL', privada: 'PRIVADA', publica: 'PUBLICA' }
const firstFieldError = (value) => Array.isArray(value) ? value[0] : value
const formatEvaluationLabel = (tipo) => ({ TEMATICA: 'Temática', PERFIL: 'Perfil', PRIVADA: 'Privada', PUBLICA: 'Pública' }[tipo] || tipo)
const formatRegistroLabel = (modalidad) => ({ CONSENSO: 'Consenso del tribunal', INDIVIDUAL: 'Individual' }[modalidad] || modalidad)

function weightedNotePreview(value, percentage) {
  const match = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(String(value || '').trim())
  if (!match || BigInt(match[1]) > 100n) return ''
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0')
  const weightedCents = (cents * BigInt(percentage) + 50n) / 100n
  return `${weightedCents / 100n},${String(weightedCents % 100n).padStart(2, '0')}`
}

const resultSourceEvaluation = (defense, flowType = 'perfil') => {
  const evaluationType = evaluationTypeByEvent[flowType]
  return (defense.evaluaciones || []).find((item) => (
    item.tipo_evaluacion === evaluationType && item.modalidad_registro === 'CONSENSO' && !item.es_resultado_final_evento
  ))
}

const resultFlowState = (defense, flowType = 'perfil') => ({
  evaluation: Boolean(resultSourceEvaluation(defense, flowType)),
  finalized: defense.estado === 'FINALIZADA',
  consolidated: Boolean(defense.resultado_consolidado),
})

function ProjectProfileResultFlow({ defense, onChanged, onCompleted, onReviewAttendance }) {
  const [dialog, setDialog] = useState(null)
  const controller = useRef(null)
  const flowType = defense.tipo_evento === 'DEFENSA_PRIVADA' ? 'privada' : 'perfil'
  const canonicalDefense = dialog?.canonical || defense
  const pendingAttendance = (canonicalDefense.participantes || []).filter((participant) => participant.activo !== false && participant.presente == null)
  const current = resultFlowState(canonicalDefense, flowType)
  const initialAction = !current.evaluation ? 'Registrar resultado de la defensa' : !current.finalized ? 'Continuar con la finalización' : 'Consolidar resultado'
  const requiresPrivateNote = flowType === 'privada' && defense.postulacion_modalidad_codigo === 'TESIS_GRADO'

  const syncCanonical = async (signal) => {
    const canonical = await postulacionesService.obtenerDefensa(defense.id, signal)
    return canonical
  }

  const updateSteps = (canonical, extra = {}) => {
    const state = resultFlowState(canonical, flowType)
    setDialog((value) => ({ ...value, ...extra, canonical, steps: {
      evaluation: state.evaluation ? 'SUCCESS' : value?.steps?.evaluation || 'PENDING',
      finalized: state.finalized ? 'SUCCESS' : value?.steps?.finalized || 'PENDING',
      consolidated: state.consolidated ? 'SUCCESS' : value?.steps?.consolidated || 'PENDING',
    } }))
    return state
  }

  const reconcile = async (signal) => {
    const canonical = await syncCanonical(signal)
    updateSteps(canonical)
    return canonical
  }

  const run = async (event) => {
    event?.preventDefault()
    if (dialog?.submitting || pendingAttendance.length > 0) return
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    const elements = event?.currentTarget?.elements
    const selectedResult = elements?.resultado?.value || dialog?.result
    const observations = elements?.observaciones?.value?.trim() ?? dialog?.observations ?? ''
    const privateNote = elements?.nota?.value ?? elements?.nota_privada?.value ?? dialog?.note ?? ''
    const payload = { observaciones: observations, modalidad_registro: 'CONSENSO', resultado: selectedResult }
    if (flowType === 'privada') {
      const noteValue = String(privateNote ?? '').trim()
      if (!noteValue) {
        setDialog((value) => ({ ...value, error: 'La nota privada es obligatoria.', submitting: false }))
        return
      }
      const numericNote = Number(noteValue)
      if (!Number.isFinite(numericNote) || numericNote < 0 || numericNote > 30) {
        setDialog((value) => ({ ...value, error: 'La nota privada debe estar entre 0 y 30.', submitting: false }))
        return
      }
      if (requiresPrivateNote) payload.nota = noteValue
      else payload.nota_privada = noteValue
    }
    setDialog((value) => ({ ...value, result: selectedResult, observations, note: privateNote, submitting: true, error: '' }))
    try {
      let canonical = await reconcile(request.signal)
      let state = resultFlowState(canonical, flowType)
      if (!state.evaluation) {
        setDialog((value) => ({ ...value, steps: { ...value.steps, evaluation: 'PROCESSING' } }))
        try {
          await postulacionesService.registrarEvaluacionDefensa(defense.id, flowType, payload, request.signal)
        } catch (error) {
          if (error.canceled) return
          canonical = await reconcile(request.signal)
          if (!resultFlowState(canonical, flowType).evaluation) throw error
        }
        canonical = await reconcile(request.signal)
        state = resultFlowState(canonical, flowType)
      }
      if (!state.finalized) {
        setDialog((value) => ({ ...value, steps: { ...value.steps, finalized: 'PROCESSING' } }))
        try {
          await postulacionesService.finalizarDefensa(defense.id, request.signal)
        } catch (error) {
          if (error.canceled) return
          canonical = await reconcile(request.signal)
          if (!resultFlowState(canonical, flowType).finalized) throw error
        }
        canonical = await reconcile(request.signal)
        state = resultFlowState(canonical, flowType)
      }
      if (!state.consolidated) {
        setDialog((value) => ({ ...value, steps: { ...value.steps, consolidated: 'PROCESSING' } }))
        try {
          await postulacionesService.consolidarEvaluacionDefensa(defense.id, request.signal)
        } catch (error) {
          if (error.canceled) return
          canonical = await reconcile(request.signal)
          if (!resultFlowState(canonical, flowType).consolidated) throw error
        }
        canonical = await reconcile(request.signal)
      }
      const finalEvaluation = canonical.resultado_consolidado || resultSourceEvaluation(canonical, flowType)
      updateSteps(canonical, { submitting: false, complete: true, result: finalEvaluation?.resultado_cualitativo || selectedResult })
      await onChanged(request.signal, canonical)
      onCompleted?.(canonical)
    } catch (error) {
      if (error.canceled || request.signal.aborted) return
      try {
        await reconcile(request.signal)
        setDialog((value) => ({ ...value, submitting: false, error: error.message || 'No se pudo completar la operación. Revise el estado y continúe desde el paso pendiente.' }))
      } catch (refreshError) {
        if (!refreshError.canceled) setDialog((value) => ({ ...value, submitting: false, error: 'No se pudo confirmar el estado real. Compruebe el estado antes de continuar.' }))
      }
    }
  }

  const open = () => setDialog({ submitting: false, complete: current.consolidated, error: '', result: resultSourceEvaluation(defense, flowType)?.resultado_cualitativo || 'SUFICIENTE', observations: resultSourceEvaluation(defense, flowType)?.observaciones || '', note: resultSourceEvaluation(defense, flowType)?.nota_numerica ?? '', steps: {
    evaluation: current.evaluation ? 'SUCCESS' : 'PENDING', finalized: current.finalized ? 'SUCCESS' : 'PENDING', consolidated: current.consolidated ? 'SUCCESS' : 'PENDING',
  } })
  const close = () => { controller.current?.abort(); controller.current = null; setDialog(null) }

  return <>
    <Button onClick={open}>{initialAction}</Button>
    {dialog && <Modal title="Registrar resultado de la defensa" onClose={close}><form className="mt-4 space-y-4" onSubmit={run}>
      {pendingAttendance.length > 0 && <aside role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"><p className="font-semibold">Hay participantes con asistencia pendiente.</p><p className="mt-1">Revise la asistencia antes de finalizar la defensa.</p><Button className="mt-3" type="button" variant="secondary" onClick={() => { close(); onReviewAttendance?.(); }}>Revisar asistencias</Button></aside>}
      {!current.evaluation && !dialog.complete && <fieldset disabled={dialog.submitting || pendingAttendance.length > 0}><legend className="text-sm font-semibold">Resultado *</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="radio" name="resultado" value="SUFICIENTE" defaultChecked={dialog.result !== 'INSUFICIENTE'} /> Suficiente</label><label className="mt-2 flex items-center gap-2 text-sm"><input type="radio" name="resultado" value="INSUFICIENTE" defaultChecked={dialog.result === 'INSUFICIENTE'} /> Insuficiente</label>{flowType === 'privada' && <label className="mt-4 block text-sm font-medium">Nota privada <input name={requiresPrivateNote ? 'nota' : 'nota_privada'} type="number" min="0" max="30" step="0.01" defaultValue={dialog.note} className="mt-1 w-full rounded-md border p-2 dark:bg-slate-950" /></label>}{<label className="mt-4 block text-sm font-medium">Observaciones <span className="font-normal text-slate-500">(opcional)</span><textarea name="observaciones" defaultValue={dialog.observations} className="mt-1 min-h-24 w-full rounded-md border p-2 dark:bg-slate-950" /></label>}</fieldset>}
      {(dialog.submitting || current.evaluation || dialog.complete || dialog.error) && <ol className="space-y-2 rounded-lg border p-3 text-sm" aria-label="Progreso del registro">{[['evaluation', 'Resultado registrado', 'Registrando evaluación…'], ['finalized', 'Defensa finalizada', 'Finalizando defensa…'], ['consolidated', 'Resultado consolidado', 'Consolidando resultado…']].map(([key, success, processing]) => <li key={key} className={dialog.steps[key] === 'SUCCESS' ? 'font-semibold text-emerald-700 dark:text-emerald-300' : ''}>{dialog.steps[key] === 'SUCCESS' ? `✓ ${success}` : dialog.steps[key] === 'PROCESSING' ? processing : `Pendiente: ${success.toLowerCase()}`}</li>)}</ol>}
      {dialog.complete && <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950"><p className="font-semibold">Proceso completado</p><p className="mt-1 text-sm">Resultado: <strong>{dialog.result}</strong></p></div>}
      {dialog.error && <p role="alert" className="text-sm text-red-600">{dialog.error}</p>}
      <div className="flex flex-wrap gap-2">{!dialog.complete && pendingAttendance.length === 0 && <Button type="submit" disabled={dialog.submitting}>{dialog.submitting ? 'Procesando…' : current.evaluation ? initialAction : 'Registrar resultado y finalizar'}</Button>}{dialog.error && !dialog.submitting && <Button type="button" variant="secondary" onClick={() => run()}>Comprobar estado y continuar</Button>}<Button type="button" variant="secondary" disabled={dialog.submitting} onClick={close}>{dialog.complete ? 'Cerrar' : 'Cancelar'}</Button></div>
    </form></Modal>}
  </>
}

export default function DefenseEvaluation({ defense, quorum, canManage, onChanged, onCompleted, projectProfileFlow = false, onReviewAttendance }) {
  const [form, setForm] = useState(null)
  const [recovery, setRecovery] = useState(null)
  const [projectPrivateNote, setProjectPrivateNote] = useState('')
  const [projectPublicNote, setProjectPublicNote] = useState('')
  const [canonicalDefenseState, setCanonicalDefenseState] = useState(() => ({ defenseId: defense.id, value: defense }))
  const controller = useRef(null)
  const mounted = useRef(false)
  const currentDefense = useRef(defense)
  const callbacks = useRef({ onChanged, onCompleted })
  const operationSequence = useRef(0)
  const activeOperation = useRef(null)
  const canonicalDefense = String(canonicalDefenseState.defenseId) === String(defense.id)
    ? canonicalDefenseState.value
    : defense
  const updateCanonicalDefense = (value, defenseId = defense.id) => setCanonicalDefenseState({ defenseId, value })
  currentDefense.current = defense
  callbacks.current = { onChanged, onCompleted }
  const beginOperation = () => {
    const operation = { defenseId: defense.id, token: ++operationSequence.current }
    activeOperation.current = operation
    return operation
  }
  const operationIsCurrent = (operation) => mounted.current
    && String(currentDefense.current.id) === String(operation.defenseId)
    && activeOperation.current?.token === operation.token
    && String(activeOperation.current.defenseId) === String(operation.defenseId)
  const invalidateOperation = useCallback(() => {
    operationSequence.current += 1
    activeOperation.current = null
    controller.current?.abort()
    controller.current = null
  }, [])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      invalidateOperation()
    }
  }, [invalidateOperation])
  useEffect(() => {
    if (activeOperation.current && String(activeOperation.current.defenseId) !== String(defense.id)) {
      invalidateOperation()
      setForm(null)
      setRecovery(null)
    }
    setCanonicalDefenseState({ defenseId: defense.id, value: defense })
  }, [defense, invalidateOperation])
  const type = kind[defense.tipo_evento]
  const tesis = defense.postulacion_modalidad_codigo === 'TESIS_GRADO'
  const proyectoGrado = defense.postulacion_modalidad_codigo === 'PROYECTO_GRADO'
  const trabajoDirigido = defense.postulacion_modalidad_codigo === 'TRABAJO_DIRIGIDO'
  const tesisPrivada = tesis && type === 'privada'
  const tesisPublica = tesis && type === 'publica'
  const thesisModeEvaluation = tesisPrivada || tesisPublica
  const projectProfile = type === 'perfil' && (defense.postulacion_modalidad_codigo === 'PROYECTO_GRADO' || projectProfileFlow)
  const correspondingEvaluationType = evaluationTypeByEvent[type]
  const eventEvaluations = correspondingEvaluationType
    ? (canonicalDefense.evaluaciones || []).filter((item) => item.tipo_evaluacion === correspondingEvaluationType && !item.es_resultado_final_evento)
    : []
  const existingEvaluation = eventEvaluations.find((item) => item.modalidad_registro === 'CONSENSO') || null
  const individualEvaluations = eventEvaluations.filter((item) => item.modalidad_registro === 'INDIVIDUAL')
  const registeredMode = !thesisModeEvaluation ? null : existingEvaluation ? 'CONSENSO' : individualEvaluations.length ? 'INDIVIDUAL' : null
  const profileEvaluation = projectProfile ? existingEvaluation : null
  const individual = thesisModeEvaluation && (form?.mode === 'INDIVIDUAL' || registeredMode === 'INDIVIDUAL')
  const tribunals = (canonicalDefense.participantes || []).filter((item) => item.rol_evento === 'TRIBUNAL' && item.activo !== false)
  const evaluated = new Set(individualEvaluations.map((item) => String(item.evaluador)))
  const hasEvaluation = thesisModeEvaluation
    ? eventEvaluations.length > 0
    : (canonicalDefense.evaluaciones || []).some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const hasResult = Boolean(canonicalDefense.resultado_consolidado)
  const writable = canManage && ['EN_CURSO', 'FINALIZADA'].includes(canonicalDefense.estado) && quorum.data?.valido === true
  const canRegister = thesisModeEvaluation
    ? writable && !hasResult && !existingEvaluation && individualEvaluations.length < 3
    : writable && !existingEvaluation && !profileEvaluation
  const canConsolidate = canManage && hasEvaluation && !hasResult && canonicalDefense.estado === 'FINALIZADA'
    && (!thesisModeEvaluation || registeredMode !== 'INDIVIDUAL' || individualEvaluations.length === 3)

  if (projectProfileFlow && writable && !hasResult && projectProfile) return <ProjectProfileResultFlow defense={defense} onChanged={onChanged} onCompleted={onCompleted} onReviewAttendance={onReviewAttendance} />

  const reconcileEvaluation = async ({ operation, error, confirmed = false }) => {
    if (!operationIsCurrent(operation)) return
    const pending = { ...operation, confirmed: operation.confirmed || confirmed }
    setRecovery(pending)
    setForm((current) => ({
      ...(current || {}),
      action: 'evaluar',
      mode: pending.mode,
      submitting: true,
      uncertain: false,
      error: '',
      fields: current?.fields || {},
    }))
    controller.current?.abort()
    controller.current = new AbortController()
    try {
      const canonical = await postulacionesService.obtenerDefensa(defense.id, controller.current.signal)
      if (!operationIsCurrent(operation)) return
      if (!canonical || !Array.isArray(canonical.evaluaciones)) throw new Error('La consulta no devolvió una defensa válida.')
      updateCanonicalDefense(canonical, operation.defenseId)
      const savedEvaluations = canonical.evaluaciones.filter((item) => (
        item.tipo_evaluacion === correspondingEvaluationType && !item.es_resultado_final_evento
      ))
      const operationConfirmed = pending.confirmed
        || savedEvaluations.length > pending.baselineCount
        || Boolean(canonical.resultado_consolidado)
      if (!operationConfirmed) {
        activeOperation.current = null
        setRecovery(null)
        setForm((current) => ({
          ...(current || {}),
          action: 'evaluar',
          mode: pending.mode,
          submitting: false,
          uncertain: false,
          error: error?.message || '',
          fields: error?.fields || {},
        }))
        return
      }

      setRecovery({ ...pending, confirmed: true })
      try {
        await callbacks.current.onChanged(controller.current.signal, canonical)
        if (!operationIsCurrent(operation)) return
        activeOperation.current = null
        setRecovery(null)
        setForm(null)
      } catch (refreshError) {
        if (!operationIsCurrent(operation)) return
        if (refreshError.canceled) return
        setForm((current) => ({
          ...(current || {}),
          action: 'evaluar',
          mode: pending.mode,
          submitting: false,
          uncertain: true,
          error: 'El registro fue confirmado, pero no se pudo actualizar el expediente. Compruebe el estado antes de continuar.',
          fields: {},
        }))
      }
    } catch (queryError) {
      if (!operationIsCurrent(operation)) return
      if (queryError.canceled) return
      setForm((current) => ({
        ...(current || {}),
        action: 'evaluar',
        mode: pending.mode,
        submitting: false,
        uncertain: true,
        error: pending.confirmed
          ? 'El registro fue aceptado, pero no se pudo consultar su estado. Compruebe el estado antes de continuar.'
          : 'No se pudo confirmar el estado real. Compruebe el estado antes de continuar.',
        fields: {},
      }))
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (form?.submitting || recovery) return
    const elements = event.currentTarget.elements
    if (!canRegister || (registeredMode && registeredMode !== form?.mode)) return
    const payload = { observaciones: elements.observaciones.value.trim(), modalidad_registro: individual ? 'INDIVIDUAL' : 'CONSENSO' }
    if (type !== 'publica') payload.resultado = elements.resultado.value
    if (type === 'privada' && !tesis) payload.nota_privada = elements.nota_privada.value
    if (thesisModeEvaluation) {
      const nota = elements.nota.value
      const numericNote = Number(nota)
      const minimum = tesisPublica ? 1 : 0
      const maximum = tesisPublica ? 100 : 30
      const label = tesisPublica ? 'pública' : 'privada'
      let message = ''
      if (nota === '') message = `La nota ${label} es obligatoria.`
      else if (!Number.isFinite(numericNote)) message = `La nota ${label} debe ser un número.`
      else if (numericNote < minimum || numericNote > maximum) message = `La nota ${label} debe estar entre ${minimum} y ${maximum}.`
      if (message) {
        setForm((current) => ({ ...current, fields: { ...current.fields, nota_numerica: [message] }, error: '' }))
        return
      }
      payload.nota = nota
    }
    if (type === 'privada' && tesis && individual) { payload.evaluador = elements.evaluador.value; payload.nota = elements.nota.value }
    if (type === 'publica') {
      if (tesisPublica) {
        payload.nota = elements.nota.value
        if (individual) payload.evaluador = elements.evaluador.value
      } else payload.nota_publica = elements.nota_publica.value
    }
    if (!thesisModeEvaluation) {
      const operation = beginOperation()
      controller.current?.abort(); controller.current = new AbortController()
      setForm((current) => ({ ...current, submitting: true, error: '', fields: {} }))
      try {
        await postulacionesService.registrarEvaluacionDefensa(defense.id, type, payload, controller.current.signal)
        if (!operationIsCurrent(operation)) return
        await callbacks.current.onChanged(controller.current.signal)
        if (!operationIsCurrent(operation)) return
        activeOperation.current = null
        setForm(null)
      } catch (error) {
        if (!operationIsCurrent(operation)) return
        if (error.canceled) return
        if (error.fields) {
          activeOperation.current = null
          setForm((current) => ({ ...current, submitting: false, error: error.message, fields: error.fields }))
          return
        }
        try {
          const canonical = await postulacionesService.obtenerDefensa(defense.id, controller.current.signal)
          if (!operationIsCurrent(operation)) return
          if (!canonical || !Array.isArray(canonical.evaluaciones)) throw new Error('La consulta no devolvió una defensa válida.')
          updateCanonicalDefense(canonical, operation.defenseId)
          const savedEvaluations = canonical.evaluaciones.filter((item) => (
            item.tipo_evaluacion === correspondingEvaluationType && !item.es_resultado_final_evento
          ))
          if (savedEvaluations.length > eventEvaluations.length || canonical.resultado_consolidado) {
            setForm(null)
            await callbacks.current.onChanged(controller.current.signal, canonical)
            if (!operationIsCurrent(operation)) return
            activeOperation.current = null
            return
          }
          activeOperation.current = null
          setForm((current) => ({ ...current, canonical, submitting: false, error: error.message, fields: error.fields || {} }))
        } catch (refreshError) {
          if (!operationIsCurrent(operation)) return
          if (refreshError.canceled) return
          setForm((current) => ({
            ...current,
            submitting: false,
            uncertain: true,
            error: 'No se pudo confirmar el estado real. Compruebe el estado antes de continuar.',
          }))
        }
      }
      return
    }
    const operation = { ...beginOperation(), action: 'evaluar', mode: form.mode, baselineCount: eventEvaluations.length, confirmed: false }
    setRecovery(operation)
    controller.current?.abort(); controller.current = new AbortController()
    setForm((current) => ({ ...current, submitting: true, error: '', fields: {} }))
    try {
      await postulacionesService.registrarEvaluacionDefensa(defense.id, type, payload, controller.current.signal)
    } catch (error) {
      if (!operationIsCurrent(operation)) return
      if (error.canceled) return
      if (error.fields) {
        activeOperation.current = null
        setRecovery(null)
        setForm((current) => ({ ...current, submitting: false, error: error.message, fields: error.fields }))
        return
      }
      await reconcileEvaluation({ operation, error })
      return
    }
    if (!operationIsCurrent(operation)) return
    setRecovery({ ...operation, confirmed: true })
    try {
      await callbacks.current.onChanged(controller.current.signal)
      if (!operationIsCurrent(operation)) return
      activeOperation.current = null
      setRecovery(null)
      setForm(null)
    } catch (error) {
      if (!operationIsCurrent(operation)) return
      if (error.canceled) return
      await reconcileEvaluation({ operation, error, confirmed: true })
    }
  }

  const checkCanonicalState = async () => {
    if (form?.submitting) return
    if (recovery?.action === 'evaluar') {
      await reconcileEvaluation({ operation: recovery, confirmed: recovery.confirmed })
      return
    }
    const operation = form?.operation || beginOperation()
    controller.current?.abort()
    controller.current = new AbortController()
    setForm((current) => ({ ...current, submitting: true, error: '' }))
    try {
      const canonical = await postulacionesService.obtenerDefensa(defense.id, controller.current.signal)
      if (!operationIsCurrent(operation)) return
      if (!canonical || !Array.isArray(canonical.evaluaciones)) throw new Error('La consulta no devolvió una defensa válida.')
      updateCanonicalDefense(canonical, operation.defenseId)
      const savedEvaluations = (canonical.evaluaciones || []).filter((item) => (
        item.tipo_evaluacion === correspondingEvaluationType && !item.es_resultado_final_evento
      ))
      const operationConfirmed = form?.action === 'consolidar'
        ? Boolean(canonical.resultado_consolidado)
        : savedEvaluations.length > eventEvaluations.length || Boolean(canonical.resultado_consolidado)
      if (operationConfirmed) {
        await callbacks.current.onChanged(controller.current.signal, canonical)
        if (!operationIsCurrent(operation)) return
        if (form?.action === 'consolidar') callbacks.current.onCompleted?.(canonical)
        activeOperation.current = null
        setRecovery(null)
        setForm(null)
      } else {
        activeOperation.current = null
        setForm((current) => ({ ...current, canonical, submitting: false, uncertain: false, error: '' }))
      }
    } catch (error) {
      if (operationIsCurrent(operation) && !error.canceled) setForm((current) => ({
          ...current,
          operation,
          submitting: false,
          uncertain: true,
          error: 'No se pudo confirmar el estado real. Compruebe el estado antes de continuar.',
        }))
    }
  }

  const consolidate = async () => {
    if (form?.submitting) return
    const operation = { ...beginOperation(), action: 'consolidar' }
    controller.current?.abort(); controller.current = new AbortController(); setForm({ ...operation, action: 'consolidar', submitting: true, error: '', fields: {} })
    try {
      await postulacionesService.consolidarEvaluacionDefensa(defense.id, controller.current.signal)
      if (!operationIsCurrent(operation)) return
      await callbacks.current.onChanged(controller.current.signal)
      if (!operationIsCurrent(operation)) return
      callbacks.current.onCompleted?.()
      activeOperation.current = null
      setForm(null)
    }
    catch (error) {
      if (!operationIsCurrent(operation)) return
      if (error.canceled) return
      try {
        const canonical = await postulacionesService.obtenerDefensa(defense.id, controller.current.signal)
        if (!operationIsCurrent(operation)) return
        if (!canonical || !Array.isArray(canonical.evaluaciones)) throw new Error('La consulta no devolvió una defensa válida.')
        updateCanonicalDefense(canonical, operation.defenseId)
        if (canonical.resultado_consolidado) {
          await callbacks.current.onChanged(controller.current.signal, canonical)
          if (!operationIsCurrent(operation)) return
          callbacks.current.onCompleted?.(canonical)
          activeOperation.current = null
          setForm(null)
          return
        }
        activeOperation.current = null
        setForm({ ...operation, action: 'consolidar', submitting: false, error: error.message, fields: error.fields || {} })
      } catch (refreshError) {
        if (operationIsCurrent(operation) && !refreshError.canceled) setForm({
          ...operation,
          action: 'consolidar', submitting: false, uncertain: true,
          error: 'No se pudo confirmar el estado real. Compruebe el estado antes de continuar.',
        })
      }
    }
  }

  if (!canManage) return null
  return <section className="mt-5 border-t pt-5" aria-label="Gestión de evaluación">
    {!writable && !hasEvaluation && !hasResult && <p className="text-sm text-slate-500">La evaluación requiere una defensa en curso o finalizada y quórum válido.</p>}
    {(existingEvaluation || profileEvaluation) && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950"><p className="font-semibold">Evaluación consensuada registrada</p><p className="mt-1">Tipo: {formatEvaluationLabel((existingEvaluation || profileEvaluation).tipo_evaluacion)}</p><p className="mt-1">Resultado académico: {(existingEvaluation || profileEvaluation).resultado_cualitativo === 'SUFICIENTE' ? 'Suficiente' : 'Insuficiente'}</p>{(existingEvaluation || profileEvaluation).nota_numerica !== null && (existingEvaluation || profileEvaluation).nota_numerica !== undefined && <p className="mt-1">Nota: {String((existingEvaluation || profileEvaluation).nota_numerica)}</p>}<p className="mt-1">Evaluación: {formatRegistroLabel((existingEvaluation || profileEvaluation).modalidad_registro)}</p></div>}
    {thesisModeEvaluation && registeredMode === 'INDIVIDUAL' && <div className="rounded-lg border p-3 text-sm" aria-label="Evaluaciones individuales registradas">
      <p className="font-semibold">{individualEvaluations.length}/3 evaluaciones individuales registradas</p>
      <ul className="mt-2 space-y-1">{individualEvaluations.map((evaluation) => <li key={evaluation.id}>{evaluation.evaluador_nombre || `Evaluador ${evaluation.evaluador}`} — Nota: {String(evaluation.nota_numerica ?? 'No registrada')}</li>)}</ul>
      <p className="mt-2">Evaluadores pendientes: {tribunals.filter((participant) => !evaluated.has(String(participant.id))).map((participant) => participant.usuario_nombre || `Tribunal ${participant.id}`).join(', ') || 'Ninguno'}</p>
    </div>}
    {thesisModeEvaluation && hasResult && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950">
      <p className="font-semibold">Resultado consolidado</p>
      {canonicalDefense.resultado_consolidado.resultado_cualitativo && <p className="mt-1">Resultado académico: {canonicalDefense.resultado_consolidado.resultado_cualitativo === 'SUFICIENTE' ? 'Suficiente' : 'Insuficiente'}</p>}
      {canonicalDefense.resultado_consolidado.nota_numerica !== null && canonicalDefense.resultado_consolidado.nota_numerica !== undefined && <p className="mt-1">Nota consolidada: {String(canonicalDefense.resultado_consolidado.nota_numerica)}</p>}
    </div>}
    {canRegister && !form && !recovery && <Button onClick={() => {
      setProjectPrivateNote('')
      setProjectPublicNote('')
      setForm({ action: 'evaluar', mode: registeredMode || 'CONSENSO', submitting: false, error: '', fields: {} })
    }}>{registeredMode === 'INDIVIDUAL' ? 'Registrar siguiente evaluación individual' : thesisModeEvaluation ? 'Registrar evaluación' : 'Registrar evaluación consensuada'}</Button>}
    {recovery?.action === 'evaluar' && <div className="mt-4">
      {form?.error && <p role="alert" className="text-sm text-red-600">{form.error}</p>}
      <Button type="button" variant="secondary" disabled={form?.submitting} onClick={checkCanonicalState}>Comprobar estado antes de reintentar</Button>
    </div>}
    {form?.action === 'evaluar' && <form className="mt-4 space-y-4" onSubmit={submit} noValidate={tesisPrivada && !individual}>
      {projectProfile && <aside className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">
        <p className="font-semibold">Evaluación consensuada del Tribunal</p>
        <p className="mt-1">Registra una única decisión conjunta de los tribunales presentes. La cuenta administrativa quedará registrada como responsable de la carga.</p>
      </aside>}
      {tesis && ['privada', 'publica'].includes(type) && <label className="block text-sm font-medium">Modo<select value={form.mode} disabled={Boolean(registeredMode)} onChange={(e) => setForm((v) => ({ ...v, mode: e.target.value }))}>{!registeredMode && <><option value="CONSENSO">Por consenso</option><option value="INDIVIDUAL">Individual</option></>}{registeredMode && <option value={registeredMode}>{registeredMode === 'CONSENSO' ? 'Por consenso' : 'Individual'}</option>}</select></label>}{type !== 'publica' && <label className="block text-sm font-medium">Resultado<select name="resultado" className="mt-1 w-full rounded-md border p-2" required><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select></label>}
      {tesis && ['privada', 'publica'].includes(type) && individual && <><label>Tribunal evaluador<select name="evaluador" required>{tribunals.filter((p) => !evaluated.has(String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.usuario_nombre || `Tribunal ${p.id}`}</option>)}</select></label><label>Nota individual ({tesisPublica ? '1–100' : '0–30'})<input name="nota" type="number" min={tesisPublica ? '1' : '0'} max={tesisPublica ? '100' : '30'} step="0.01" required aria-describedby="nota-individual-error" /></label>{form.fields?.nota_numerica && <span id="nota-individual-error" role="alert" className="block text-sm text-red-600">{firstFieldError(form.fields.nota_numerica)}</span>}<p>{evaluated.size}/3 evaluaciones registradas</p></>}
      {tesisPrivada && !individual && <label className="block text-sm font-medium">Nota privada (0–30)<input name="nota" type="number" min="0" max="30" step="0.01" required aria-describedby="nota-privada-error" className="mt-1 w-full rounded-md border p-2" />{form.fields?.nota_numerica && <span id="nota-privada-error" role="alert" className="mt-1 block text-sm text-red-600">{firstFieldError(form.fields.nota_numerica)}</span>}</label>}
      {type === 'privada' && !tesis && (proyectoGrado || trabajoDirigido ? <div>
        <label className="block text-sm font-medium">Nota de Defensa Privada (0–100)<input name="nota_privada" type="number" min="0" max="100" step="0.01" required onChange={(event) => setProjectPrivateNote(event.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
        <p className="mt-2 text-sm text-slate-600">Ponderación en la nota final: 30%</p>
        <p className="text-sm font-medium" aria-live="polite">Aporte ponderado: {weightedNotePreview(projectPrivateNote, 30) || '—'} / 30</p>
      </div> : <label className="block text-sm font-medium">Nota privada (0–30)<input name="nota_privada" type="number" min="0" max="30" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>)}
      {type === 'publica' && (!tesisPublica || !individual) && (tesisPublica
        ? <label className="block text-sm font-medium">Nota pública (1–100)<input name="nota" type="number" min="1" max="100" step="0.01" required aria-describedby="nota-publica-error" className="mt-1 w-full rounded-md border p-2" />{form.fields?.nota_numerica && <span id="nota-publica-error" role="alert" className="mt-1 block text-sm text-red-600">{firstFieldError(form.fields.nota_numerica)}</span>}</label>
        : trabajoDirigido ? <div>
          <label className="block text-sm font-medium">Nota de Defensa Pública (1–100)<input name="nota_publica" type="number" min="1" max="100" step="0.01" required onChange={(event) => setProjectPublicNote(event.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
          <p className="mt-2 text-sm text-slate-600">Ponderación en la nota final: 70%</p>
          <p className="text-sm font-medium" aria-live="polite">Aporte ponderado: {weightedNotePreview(projectPublicNote, 70) || '—'} / 70</p>
        </div>
          : proyectoGrado ? <div>
          <label className="block text-sm font-medium">Nota de Defensa Pública (0–100)<input name="nota_publica" type="number" min="0" max="100" step="0.01" required onChange={(event) => setProjectPublicNote(event.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
          <p className="mt-2 text-sm text-slate-600">Ponderación en la nota final: 70%</p>
          <p className="text-sm font-medium" aria-live="polite">Aporte ponderado: {weightedNotePreview(projectPublicNote, 70) || '—'} / 70</p>
        </div>
          : <label className="block text-sm font-medium">Nota pública (0–70)<input name="nota_publica" type="number" min="0" max="70" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>)}
      <label className="block text-sm font-medium">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded-md border p-2" /></label>
      {form.error && recovery?.action !== 'evaluar' && <p role="alert" className="text-sm text-red-600">{form.error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={form.submitting || form.uncertain}>{form.submitting ? 'Procesando…' : 'Registrar'}</Button><Button type="button" variant="secondary" disabled={form.submitting} onClick={() => setForm(null)}>Cancelar</Button></div>
    </form>}
    {canConsolidate && <div className="mt-4"><Button disabled={form?.submitting || form?.uncertain} onClick={consolidate}>{form?.action === 'consolidar' && form?.submitting ? 'Procesando…' : 'Consolidar resultado del evento'}</Button></div>}
    {form?.action === 'consolidar' && form.error && <p role="alert" className="mt-2 text-sm text-red-600">{form.error}</p>}
    {form?.action === 'consolidar' && form.uncertain && <Button type="button" variant="secondary" disabled={form.submitting} onClick={checkCanonicalState}>Comprobar estado antes de continuar</Button>}
  </section>
}
