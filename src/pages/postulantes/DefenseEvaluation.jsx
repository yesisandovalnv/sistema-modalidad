import { useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const kind = { DEFENSA_PERFIL: 'perfil', DEFENSA_PRIVADA: 'privada', DEFENSA_PUBLICA: 'publica' }

export default function DefenseEvaluation({ defense, quorum, canManage, onChanged }) {
  const [form, setForm] = useState(null)
  const controller = useRef(null)
  const type = kind[defense.tipo_evento]
  const hasEvaluation = (defense.evaluaciones || []).some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const hasResult = Boolean(defense.resultado_consolidado)
  const writable = canManage && ['EN_CURSO', 'FINALIZADA'].includes(defense.estado) && quorum.data?.valido === true

  const submit = async (event) => {
    event.preventDefault()
    if (form?.submitting) return
    const elements = event.currentTarget.elements
    const payload = { observaciones: elements.observaciones.value.trim() }
    if (type !== 'publica') payload.resultado = elements.resultado.value
    if (type === 'privada') payload.nota_privada = elements.nota_privada.value
    if (type === 'publica') payload.nota_publica = elements.nota_publica.value
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
    {!writable && !hasEvaluation && <p className="text-sm text-slate-500">La evaluación requiere evento en curso o finalizado y quórum técnico válido.</p>}
    {writable && !hasEvaluation && !form && <Button onClick={() => setForm({ action: 'evaluar', submitting: false, error: '', fields: {} })}>Registrar evaluación consensuada</Button>}
    {form?.action === 'evaluar' && <form className="mt-4 space-y-4" onSubmit={submit}>
      {type !== 'publica' && <label className="block text-sm font-medium">Resultado<select name="resultado" className="mt-1 w-full rounded-md border p-2" required><option value="SUFICIENTE">Suficiente</option><option value="INSUFICIENTE">Insuficiente</option></select></label>}
      {type === 'privada' && <label className="block text-sm font-medium">Nota privada (0–30)<input name="nota_privada" type="number" min="0" max="30" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>}
      {type === 'publica' && <label className="block text-sm font-medium">Nota pública (0–70)<input name="nota_publica" type="number" min="0" max="70" step="0.01" required className="mt-1 w-full rounded-md border p-2" /></label>}
      <label className="block text-sm font-medium">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded-md border p-2" /></label>
      {form.error && <p role="alert" className="text-sm text-red-600">{form.error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={form.submitting}>{form.submitting ? 'Procesando…' : 'Registrar'}</Button><Button type="button" variant="secondary" disabled={form.submitting} onClick={() => setForm(null)}>Cancelar</Button></div>
    </form>}
    {hasEvaluation && !hasResult && defense.estado === 'FINALIZADA' && <div className="mt-4"><Button disabled={form?.submitting} onClick={consolidate}>{form?.submitting ? 'Procesando…' : 'Consolidar resultado del evento'}</Button></div>}
    {form?.action === 'consolidar' && form.error && <p role="alert" className="mt-2 text-sm text-red-600">{form.error}</p>}
  </section>
}
