import { useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const kind = { DEFENSA_TEMATICA: 'tematica', DEFENSA_PERFIL: 'perfil', DEFENSA_PRIVADA: 'privada', DEFENSA_PUBLICA: 'publica' }
const evaluationTypeByEvent = { tematica: 'TEMATICA', perfil: 'PERFIL', privada: 'PRIVADA', publica: 'PUBLICA' }
const firstFieldError = (value) => Array.isArray(value) ? value[0] : value
const formatEvaluationLabel = (tipo) => ({ TEMATICA: 'Temática', PERFIL: 'Perfil', PRIVADA: 'Privada', PUBLICA: 'Pública' }[tipo] || tipo)
const formatRegistroLabel = (modalidad) => ({ CONSENSO: 'Consenso del tribunal', INDIVIDUAL: 'Individual' }[modalidad] || modalidad)

export default function DefenseEvaluation({ defense, quorum, canManage, onChanged }) {
  const [form, setForm] = useState(null)
  const controller = useRef(null)
  const type = kind[defense.tipo_evento]
  const tesis = defense.postulacion_modalidad_codigo === 'TESIS_GRADO'
  const tesisPrivada = tesis && type === 'privada'
  const tesisPublica = tesis && type === 'publica'
  const projectProfile = defense.postulacion_modalidad_codigo === 'PROYECTO_GRADO' && type === 'perfil'
  const correspondingEvaluationType = evaluationTypeByEvent[type]
  const existingEvaluation = correspondingEvaluationType
    ? (defense.evaluaciones || []).find((item) => item.tipo_evaluacion === correspondingEvaluationType && item.modalidad_registro === 'CONSENSO' && !item.es_resultado_final_evento)
    : null
  const profileEvaluation = projectProfile ? existingEvaluation : null
  const individual = form?.mode === 'INDIVIDUAL'
  const tribunals = (defense.participantes || []).filter((item) => item.rol_evento === 'TRIBUNAL' && item.activo !== false)
  const evaluated = new Set((defense.evaluaciones || []).filter((item) => item.modalidad_registro === 'INDIVIDUAL').map((item) => String(item.evaluador)))
  const hasEvaluation = (defense.evaluaciones || []).some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const hasResult = Boolean(defense.resultado_consolidado)
  const writable = canManage && ['EN_CURSO', 'FINALIZADA'].includes(defense.estado) && quorum.data?.valido === true

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
    try { await postulacionesService.consolidarEvaluacionDefensa(defense.id, controller.current.signal); setForm(null); await onChanged(controller.current.signal) }
    catch (error) { if (!error.canceled) setForm({ action: 'consolidar', submitting: false, error: error.message, fields: error.fields || {} }) }
  }

  if (!canManage) return null
  return <section className="mt-5 border-t pt-5" aria-label="Gestión de evaluación">
    {!writable && !hasEvaluation && <p className="text-sm text-slate-500">La evaluación requiere una defensa en curso o finalizada y quórum válido.</p>}
    {(existingEvaluation || profileEvaluation) && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950"><p className="font-semibold">Evaluación consensuada registrada</p><p className="mt-1">Tipo: {formatEvaluationLabel((existingEvaluation || profileEvaluation).tipo_evaluacion)}</p><p className="mt-1">Resultado académico: {(existingEvaluation || profileEvaluation).resultado_cualitativo === 'SUFICIENTE' ? 'Suficiente' : 'Insuficiente'}</p>{(existingEvaluation || profileEvaluation).nota_numerica !== null && (existingEvaluation || profileEvaluation).nota_numerica !== undefined && <p className="mt-1">Nota: {String((existingEvaluation || profileEvaluation).nota_numerica)}</p>}<p className="mt-1">Evaluación: {formatRegistroLabel((existingEvaluation || profileEvaluation).modalidad_registro)}</p></div>}
    {!existingEvaluation && !profileEvaluation && writable && !form && <Button onClick={() => setForm({ action: 'evaluar', mode: 'CONSENSO', submitting: false, error: '', fields: {} })}>Registrar evaluación consensuada</Button>}
    {form?.action === 'evaluar' && <form className="mt-4 space-y-4" onSubmit={submit} noValidate={tesisPrivada && !individual}>
      {projectProfile && <aside className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">
        <p className="font-semibold">Evaluación consensuada del Tribunal</p>
        <p className="mt-1">Registra una única decisión conjunta de los tribunales presentes. La cuenta administrativa quedará registrada como responsable de la carga.</p>
      </aside>}
      {tesis && ['privada', 'publica'].includes(type) && <label className="block text-sm font-medium">Modo<select value={form.mode} onChange={(e) => setForm((v) => ({ ...v, mode: e.target.value }))}><option value="CONSENSO">Por consenso</option><option value="INDIVIDUAL">Individual</option></select></label>}{type !== 'publica' && <label className="block text-sm font-medium">Resultado<select name="resultado" className="mt-1 w-full rounded-md border p-2" required><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select></label>}
      {tesis && ['privada', 'publica'].includes(type) && individual && <><label>Tribunal evaluador<select name="evaluador" required>{tribunals.filter((p) => !evaluated.has(String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.usuario_nombre || `Tribunal ${p.id}`}</option>)}</select></label><label>Nota individual<input name="nota" type="number" min={tesisPublica ? '1' : undefined} max={tesisPublica ? '100' : undefined} step="0.01" required /></label><p>{evaluated.size}/3 evaluaciones registradas</p></>}
      {tesisPrivada && !individual && <label className="block text-sm font-medium">Nota privada<input name="nota" type="number" min="0" max="30" step="0.01" required aria-describedby="nota-privada-error" className="mt-1 w-full rounded-md border p-2" />{form.fields?.nota_numerica && <span id="nota-privada-error" role="alert" className="mt-1 block text-sm text-red-600">{firstFieldError(form.fields.nota_numerica)}</span>}</label>}
      {type === 'privada' && !tesis && <label className="block text-sm font-medium">Nota privada (0–30)<input name="nota_privada" type="number" min="0" max="30" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>}
      {type === 'publica' && (!tesisPublica || !individual) && (tesisPublica ? <label className="block text-sm font-medium">Nota pública (1–100)<input name="nota" type="number" min="1" max="100" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label> : <label className="block text-sm font-medium">Nota pública (0–70)<input name="nota_publica" type="number" min="0" max="70" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>)}
      <label className="block text-sm font-medium">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded-md border p-2" /></label>
      {form.error && <p role="alert" className="text-sm text-red-600">{form.error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={form.submitting}>{form.submitting ? 'Procesando…' : 'Registrar'}</Button><Button type="button" variant="secondary" disabled={form.submitting} onClick={() => setForm(null)}>Cancelar</Button></div>
    </form>}
    {hasEvaluation && !hasResult && defense.estado === 'FINALIZADA' && <div className="mt-4"><Button disabled={form?.submitting} onClick={consolidate}>{form?.submitting ? 'Procesando…' : 'Consolidar resultado del evento'}</Button></div>}
    {form?.action === 'consolidar' && form.error && <p role="alert" className="mt-2 text-sm text-red-600">{form.error}</p>}
  </section>
}
