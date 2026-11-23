import { useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const noteTypes = new Set(['DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'])
const qualitativeTypes = new Set(['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA'])
const evaluationTypes = { DEFENSA_TEMATICA: 'TEMATICA', DEFENSA_PERFIL: 'PERFIL', DEFENSA_PRIVADA: 'PRIVADA', DEFENSA_PUBLICA: 'PUBLICA' }

export default function ProjectGradeDirectResult({ defense, canManage, onChanged, onCompleted, onClose, thesisGrade = false, compositionValidation }) {
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef(null)
  if (!defense || typeof defense !== 'object') {
    return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <h3 className="font-bold">No se pudo cargar la defensa</h3>
      <p className="mt-1 text-sm">Los datos de la defensa no están disponibles. Cierra este detalle y vuelve al expediente.</p>
      {thesisGrade && onClose && <Button className="mt-3" variant="secondary" onClick={onClose}>Volver al expediente</Button>}
    </section>
  }
  const eventType = defense.tipo_evento
  const expectedEvaluationType = evaluationTypes[eventType]
  const hasValidData = expectedEvaluationType
    && defense.id != null
    && typeof defense.estado === 'string'
    && Array.isArray(defense.evaluaciones)
    && defense.evaluaciones.every((item) => item && typeof item === 'object')
  const existingEvaluation = (hasValidData ? defense.evaluaciones : []).find((item) => (
    item.tipo_evaluacion === evaluationTypes[defense.tipo_evento]
      && item.modalidad_registro === 'CONSENSO'
      && !item.es_resultado_final_evento
  ))
  const isOpen = hasValidData && (defense.estado === 'PROGRAMADA' || defense.estado === 'EN_CURSO'
    || (defense.estado === 'FINALIZADA' && existingEvaluation && !defense.resultado_consolidado)
  )
  const needsNote = noteTypes.has(eventType)
  const needsResult = qualitativeTypes.has(eventType)
  const compositionValid = !thesisGrade || compositionValidation?.cumple === true
  // El servidor rechaza el resultado antes de la fecha y hora programadas: se avisa desde cuándo.
  const scheduledAt = defense.fecha_programada ? new Date(defense.fecha_programada) : null
  const notYetDue = Boolean(scheduledAt) && !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now()
  const scheduledLabel = notYetDue
    ? scheduledAt.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(/\.$/, '')
    : ''
  const weight = eventType === 'DEFENSA_PRIVADA' ? 30 : 70
  const numericConfig = defense.configuracion_numerica || {}
  const selectedSemantics = thesisGrade ? (numericConfig.semantica_nota || 'BRUTA_100') : 'BRUTA_100'
  const noteMinimum = thesisGrade
    ? (selectedSemantics === 'MODALIDAD_ESPECIFICA' ? (eventType === 'DEFENSA_PUBLICA' ? 1 : 0) : numericConfig.minimo ?? (eventType === 'DEFENSA_PUBLICA' ? 1 : 0))
    : 0
  const noteMaximum = thesisGrade && selectedSemantics === 'MODALIDAD_ESPECIFICA' && eventType === 'DEFENSA_PRIVADA'
    ? 30
    : thesisGrade ? (numericConfig.maximo ?? 100) : 100

  const submit = async (event) => {
    event.preventDefault()
    if (submitting || !compositionValid || notYetDue) return
    const elements = event.currentTarget.elements
    const payload = {
      resultado: needsResult ? elements.resultado?.value || existingEvaluation?.resultado_cualitativo || '' : '',
      observaciones: elements.observaciones?.value.trim() || existingEvaluation?.observaciones || '',
    }
    if (needsNote && elements.nota?.value) payload.nota = elements.nota.value
    if (thesisGrade && needsNote) payload.semantica_nota = elements.semantica_nota?.value || defense.configuracion_numerica?.semantica_nota || 'BRUTA_100'
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setSubmitting(true)
    setError('')
    try {
      const updated = thesisGrade
        ? await postulacionesService.registrarResultadoDirectoDefensa(defense.id, payload, request.signal, { includeFieldErrors: true })
        : await postulacionesService.registrarResultadoDirectoDefensa(defense.id, payload, request.signal)
      await onChanged(updated)
      onCompleted?.(updated)
      setFormOpen(false)
    } catch (requestError) {
      if (!requestError.canceled) setError(requestError.message || 'No se pudo registrar el resultado.')
    } finally {
      if (controller.current === request) {
        controller.current = null
        setSubmitting(false)
      }
    }
  }

  if (!hasValidData) {
    return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <h3 className="font-bold">No se pudo cargar el resultado de la defensa</h3>
      <p className="mt-1 text-sm">Faltan datos válidos de la defensa o sus evaluaciones. Cierra este detalle y vuelve al expediente para actualizar la información.</p>
      {onClose && <Button className="mt-3" variant="secondary" onClick={onClose}>Volver al expediente</Button>}
    </section>
  }
  if (!isOpen) return null
  return <section aria-labelledby="resultado-directo-proyecto-title" className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
    <h3 id="resultado-directo-proyecto-title" className="text-lg font-bold">Resultado de evaluación</h3>
    <p className="mt-1 text-sm">Registra el resultado del tribunal. Al guardar, el sistema finaliza y consolida la defensa en una sola operación.</p>
    {thesisGrade && !compositionValid && <div role="alert" className="mt-3 rounded-md border border-amber-400 bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-semibold">No se puede registrar el resultado porque la composición formal no es válida.</p>
      {!compositionValidation && <p className="mt-1">No fue posible verificar los cargos. Actualiza el detalle de la defensa.</p>}
      {compositionValidation?.conflictos_identidad?.map((conflict, index) => <p key={`${conflict.usuario_nombre}-${index}`} className="mt-1">{conflict.usuario_nombre}: {conflict.cargos.join(', ')}.</p>)}
      {compositionValidation?.requisitos?.filter((item) => !item.cumplido).map((item) => <p key={item.cargo} className="mt-1">{item.cargo}: {item.actual} de {item.minimo} asignaciones distintas.</p>)}
    </div>}
    {existingEvaluation && <p className="mt-3 rounded-md border p-3 text-sm">Ya existe una evaluación consensuada. Esta operación la finalizará y consolidará sin registrar otra.</p>}
    {!formOpen && canManage && <Button className="mt-3" disabled={!compositionValid || notYetDue} onClick={() => setFormOpen(true)}>{existingEvaluation ? 'Finalizar y consolidar resultado existente' : 'Registrar resultado y finalizar'}</Button>}
    {!formOpen && canManage && notYetDue && <p className="mt-2 text-sm">Podrás registrar el resultado desde el {scheduledLabel}.</p>}
    {!canManage && <p className="mt-3 text-sm">Se requiere permiso administrativo para registrar el resultado.</p>}
    {formOpen && compositionValid && <form className="mt-4 space-y-4" onSubmit={submit}>
      {!existingEvaluation && needsResult && <label className="form-label">Resultado
        <select name="resultado" defaultValue="SUFICIENTE" disabled={submitting} className="form-control">
          <option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option>
        </select>
      </label>}
      {!existingEvaluation && needsNote && <div>
        <label className="form-label mt-3">{thesisGrade && selectedSemantics === 'MODALIDAD_ESPECIFICA' ? `Nota (${noteMinimum}–${noteMaximum})` : thesisGrade ? `Nota bruta (${noteMinimum}–${noteMaximum})` : 'Nota bruta (0–100)'}
          <input name="nota" type="number" min={noteMinimum} max={noteMaximum} step="0.01" required disabled={submitting} className="form-control" />
        </label>
        <p className="mt-1 text-sm text-slate-600">Ponderación: {weight}%. El aporte se calcula automáticamente.</p>
      </div>}
      {!existingEvaluation && <label className="form-label">Observaciones (opcional)
        <textarea name="observaciones" disabled={submitting} className="form-control form-control--area" />
      </label>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="form-footer"><Button type="button" variant="secondary" disabled={submitting} onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Procesando…' : existingEvaluation ? 'Finalizar y consolidar' : 'Guardar resultado'}</Button></div>
    </form>}
  </section>
}
