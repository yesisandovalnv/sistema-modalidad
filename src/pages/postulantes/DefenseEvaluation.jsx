import { useRef, useState } from 'react'
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
  const [projectPrivateNote, setProjectPrivateNote] = useState('')
  const [projectPublicNote, setProjectPublicNote] = useState('')
  const controller = useRef(null)
  const type = kind[defense.tipo_evento]
  const tesis = defense.postulacion_modalidad_codigo === 'TESIS_GRADO'
  const proyectoGrado = defense.postulacion_modalidad_codigo === 'PROYECTO_GRADO'
  const tesisPrivada = tesis && type === 'privada'
  const tesisPublica = tesis && type === 'publica'
  const projectProfile = type === 'perfil' && (defense.postulacion_modalidad_codigo === 'PROYECTO_GRADO' || projectProfileFlow)
  const correspondingEvaluationType = evaluationTypeByEvent[type]
  const existingEvaluation = correspondingEvaluationType
    ? (defense.evaluaciones || []).find((item) => item.tipo_evaluacion === correspondingEvaluationType && item.modalidad_registro === 'CONSENSO' && !item.es_resultado_final_evento)
    : null
  const profileEvaluation = projectProfile ? existingEvaluation : null
  const privateQuickFlow = defense.tipo_evento === 'DEFENSA_PRIVADA' && defense.postulacion_modalidad_codigo === 'TESIS_GRADO'
  const individual = form?.mode === 'INDIVIDUAL'
  const tribunals = (defense.participantes || []).filter((item) => item.rol_evento === 'TRIBUNAL' && item.activo !== false)
  const evaluated = new Set((defense.evaluaciones || []).filter((item) => item.modalidad_registro === 'INDIVIDUAL').map((item) => String(item.evaluador)))
  const hasEvaluation = (defense.evaluaciones || []).some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const hasResult = Boolean(defense.resultado_consolidado)
  const writable = canManage && ['EN_CURSO', 'FINALIZADA'].includes(defense.estado) && quorum.data?.valido === true

  if (projectProfileFlow && writable && !hasResult && (projectProfile || privateQuickFlow)) return <ProjectProfileResultFlow defense={defense} onChanged={onChanged} onCompleted={onCompleted} onReviewAttendance={onReviewAttendance} />

  const submit = async (event) => {
    event.preventDefault()
    if (form?.submitting) return
    const elements = event.currentTarget.elements
    const payload = { observaciones: elements.observaciones.value.trim(), modalidad_registro: individual ? 'INDIVIDUAL' : 'CONSENSO' }
    if (type !== 'publica') payload.resultado = elements.resultado.value
    if (type === 'privada' && !tesis) payload.nota_privada = elements.nota_privada.value
    if (tesisPrivada && !individual) {
      const nota = elements.nota.value
      const numericNote = Number(nota)
      let message = ''
      if (nota === '') message = 'La nota privada es obligatoria.'
      else if (!Number.isFinite(numericNote)) message = 'La nota privada debe ser un número.'
      else if (numericNote < 0 || numericNote > 30) message = 'La nota privada debe estar entre 0 y 30.'
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
    controller.current?.abort(); controller.current = new AbortController()
    setForm((current) => ({ ...current, submitting: true, error: '', fields: {} }))
    try {
      await postulacionesService.registrarEvaluacionDefensa(defense.id, type, payload, controller.current.signal)
      setForm(null); await onChanged(controller.current.signal)
    } catch (error) {
      if (!error.canceled) setForm((current) => ({ ...current, submitting: false, error: error.message, fields: error.fields || {} }))
    }
  }

  const consolidate = async () => {
    if (form?.submitting) return
    controller.current?.abort(); controller.current = new AbortController(); setForm({ action: 'consolidar', submitting: true, error: '', fields: {} })
    try { await postulacionesService.consolidarEvaluacionDefensa(defense.id, controller.current.signal); setForm(null); await onChanged(controller.current.signal); onCompleted?.() }
    catch (error) { if (!error.canceled) setForm({ action: 'consolidar', submitting: false, error: error.message, fields: error.fields || {} }) }
  }

  if (!canManage) return null
  return <section className="mt-5 border-t pt-5" aria-label="Gestión de evaluación">
    {!writable && !hasEvaluation && <p className="text-sm text-slate-500">La evaluación requiere una defensa en curso o finalizada y quórum válido.</p>}
    {(existingEvaluation || profileEvaluation) && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950"><p className="font-semibold">Evaluación consensuada registrada</p><p className="mt-1">Tipo: {formatEvaluationLabel((existingEvaluation || profileEvaluation).tipo_evaluacion)}</p><p className="mt-1">Resultado académico: {(existingEvaluation || profileEvaluation).resultado_cualitativo === 'SUFICIENTE' ? 'Suficiente' : 'Insuficiente'}</p>{(existingEvaluation || profileEvaluation).nota_numerica !== null && (existingEvaluation || profileEvaluation).nota_numerica !== undefined && <p className="mt-1">Nota: {String((existingEvaluation || profileEvaluation).nota_numerica)}</p>}<p className="mt-1">Evaluación: {formatRegistroLabel((existingEvaluation || profileEvaluation).modalidad_registro)}</p></div>}
    {!existingEvaluation && !profileEvaluation && writable && !form && <Button onClick={() => { setProjectPrivateNote(''); setProjectPublicNote(''); setForm({ action: 'evaluar', mode: 'CONSENSO', submitting: false, error: '', fields: {} }) }}>Registrar evaluación consensuada</Button>}
    {form?.action === 'evaluar' && <form className="mt-4 space-y-4" onSubmit={submit} noValidate={tesisPrivada && !individual}>
      {projectProfile && <aside className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">
        <p className="font-semibold">Evaluación consensuada del Tribunal</p>
        <p className="mt-1">Registra una única decisión conjunta de los tribunales presentes. La cuenta administrativa quedará registrada como responsable de la carga.</p>
      </aside>}
      {tesis && ['privada', 'publica'].includes(type) && <label className="block text-sm font-medium">Modo<select value={form.mode} onChange={(e) => setForm((v) => ({ ...v, mode: e.target.value }))}><option value="CONSENSO">Por consenso</option><option value="INDIVIDUAL">Individual</option></select></label>}{type !== 'publica' && <label className="block text-sm font-medium">Resultado<select name="resultado" className="mt-1 w-full rounded-md border p-2" required><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select></label>}
      {tesis && ['privada', 'publica'].includes(type) && individual && <><label>Tribunal evaluador<select name="evaluador" required>{tribunals.filter((p) => !evaluated.has(String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.usuario_nombre || `Tribunal ${p.id}`}</option>)}</select></label><label>Nota individual<input name="nota" type="number" min={tesisPublica ? '1' : undefined} max={tesisPublica ? '100' : undefined} step="0.01" required /></label><p>{evaluated.size}/3 evaluaciones registradas</p></>}
      {tesisPrivada && !individual && <label className="block text-sm font-medium">Nota privada<input name="nota" type="number" min="0" max="30" step="0.01" required aria-describedby="nota-privada-error" className="mt-1 w-full rounded-md border p-2" />{form.fields?.nota_numerica && <span id="nota-privada-error" role="alert" className="mt-1 block text-sm text-red-600">{firstFieldError(form.fields.nota_numerica)}</span>}</label>}
      {type === 'privada' && !tesis && (proyectoGrado ? <div>
        <label className="block text-sm font-medium">Nota de Defensa Privada (0–100)<input name="nota_privada" type="number" min="0" max="100" step="0.01" required onChange={(event) => setProjectPrivateNote(event.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
        <p className="mt-2 text-sm text-slate-600">Ponderación en la nota final: 30%</p>
        <p className="text-sm font-medium" aria-live="polite">Aporte ponderado: {weightedNotePreview(projectPrivateNote, 30) || '—'} / 30</p>
      </div> : <label className="block text-sm font-medium">Nota privada (0–30)<input name="nota_privada" type="number" min="0" max="30" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>)}
      {type === 'publica' && (!tesisPublica || !individual) && (tesisPublica
        ? <label className="block text-sm font-medium">Nota pública (1–100)<input name="nota" type="number" min="1" max="100" step="0.01" required /></label>
        : proyectoGrado ? <div>
          <label className="block text-sm font-medium">Nota de Defensa Pública (0–100)<input name="nota_publica" type="number" min="0" max="100" step="0.01" required onChange={(event) => setProjectPublicNote(event.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
          <p className="mt-2 text-sm text-slate-600">Ponderación en la nota final: 70%</p>
          <p className="text-sm font-medium" aria-live="polite">Aporte ponderado: {weightedNotePreview(projectPublicNote, 70) || '—'} / 70</p>
        </div>
          : <label className="block text-sm font-medium">Nota pública (0–70)<input name="nota_publica" type="number" min="0" max="70" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>)}
      <label className="block text-sm font-medium">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded-md border p-2" /></label>
      {form.error && <p role="alert" className="text-sm text-red-600">{form.error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={form.submitting}>{form.submitting ? 'Procesando…' : 'Registrar'}</Button><Button type="button" variant="secondary" disabled={form.submitting} onClick={() => setForm(null)}>Cancelar</Button></div>
    </form>}
    {hasEvaluation && !hasResult && defense.estado === 'FINALIZADA' && <div className="mt-4"><Button disabled={form?.submitting} onClick={consolidate}>{form?.submitting ? 'Procesando…' : 'Consolidar resultado del evento'}</Button></div>}
    {form?.action === 'consolidar' && form.error && <p role="alert" className="mt-2 text-sm text-red-600">{form.error}</p>}
  </section>
}
