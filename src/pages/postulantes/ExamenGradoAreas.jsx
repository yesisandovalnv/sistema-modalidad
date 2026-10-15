import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'

export default function ExamenGradoAreas({ postulacion, examen, etapaCodigo, postulacionConcluida = false, canManage, onChanged }) {
  const [selected, setSelected] = useState(null)
  const [nota, setNota] = useState('')
  const [evaluador, setEvaluador] = useState('')
  const [modalidadRegistro, setModalidadRegistro] = useState('INDIVIDUAL')
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [concluding, setConcluding] = useState(false)
  if (!examen) return null
  const composition = examen.composicion || { completa: false, evaluable: false, faltantes: [], inconsistencias: [] }
  const canConclude = canManage
    && examen.resultado_final?.completo === true
    && !postulacionConcluida
    && (etapaCodigo === 'CONCLUSION_ACADEMICA' || etapaCodigo == null)
  const submit = async (event) => {
    event.preventDefault()
    if (!selected || submitting) return
    setSubmitting(true); setError('')
    try {
      await postulacionesService.registrarEvaluacionExamen(postulacion, selected.codigo, { nota, evaluador: modalidadRegistro === 'INDIVIDUAL' ? evaluador : undefined, modalidad_registro: modalidadRegistro, observaciones })
      setSelected(null); setNota(''); setEvaluador(''); setModalidadRegistro('INDIVIDUAL'); setObservaciones(''); await onChanged()
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  const conclude = async () => {
    if (concluding) return
    setConcluding(true); setError('')
    try { await postulacionesService.concluirExamenGrado(postulacion); await onChanged() }
    catch (requestError) { setError(requestError.message) }
    finally { setConcluding(false) }
  }
  return <Card id="examen" className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
    <h2 className="text-xl font-bold">Examen de Grado por Contenidos</h2>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Áreas secuenciales. Cada nota debe estar entre 0 y 100 y se aprueba con 61.</p>
    <section className="mt-4 rounded-lg border bg-white p-4 dark:bg-slate-900" aria-label="Composición del Examen">
      <h3 className="font-semibold">Composición del Examen</h3>
      <p className={`mt-1 text-sm ${composition.evaluable ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
        {composition.evaluable ? 'Completa y habilitada para evaluar.' : 'Incompleta o bloqueada para evaluar.'}
      </p>
      {composition.faltantes?.length > 0 && <p className="mt-2 text-sm">Pendientes: {composition.faltantes.map((item) => item.nombre).join(', ')}.</p>}
      {composition.inconsistencias?.map((message) => <p key={message} role="alert" className="mt-2 text-sm text-red-600">{message}</p>)}
      {!composition.evaluable && <a className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#actores">Gestionar actores</a>}
    </section>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {examen.areas.map((area) => <article key={area.codigo} className="rounded-lg border bg-white p-4 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{area.nombre}</h3><p className="text-sm text-slate-500">Ponderación: {area.ponderacion}% · Intento {area.intento_actual}</p></div><span className="text-sm font-semibold">Resultado del área: {area.estado}</span></div>
        {area.evaluaciones?.map((evaluation) => <p key={evaluation.id} className="mt-2 text-sm">Nota: {evaluation.nota}/100 · Resultado {evaluation.modalidad_registro === 'INDIVIDUAL' ? 'individual' : 'consensuado'}: {evaluation.resultado}</p>)}
        {canManage && composition.evaluable && ['PENDIENTE', 'EN_PROCESO', 'POSTERGADA'].includes(area.estado) && <Button className="mt-3" variant="secondary" onClick={() => setSelected(area)}>Registrar evaluación</Button>}
      </article>)}
    </div>
    <p className="mt-4 font-semibold">Resultado final: {examen.resultado_final?.nota_final ?? 'Pendiente'}</p>
    {canConclude && <Button className="mt-3" onClick={conclude} disabled={concluding}>{concluding ? 'Concluyendo…' : 'Concluir académicamente'}</Button>}
    {selected && <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 dark:bg-slate-900" onSubmit={submit}>
      <h3 className="font-semibold">Evaluar {selected.nombre}</h3>
      <label className="text-sm">Modo de evaluación<select value={modalidadRegistro} onChange={(event) => { setModalidadRegistro(event.target.value); setEvaluador('') }} className="mt-1 w-full rounded-lg border p-2"><option value="INDIVIDUAL">Individual</option><option value="CONSENSO">Consenso</option></select></label>
      {modalidadRegistro === 'INDIVIDUAL' && <label className="text-sm">Tribunal evaluador<select required value={evaluador} onChange={(event) => setEvaluador(event.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Seleccione un tribunal</option>{(examen.tribunales || []).map((tribunal) => <option key={tribunal.id} value={tribunal.id}>{tribunal.nombre}</option>)}</select></label>}
      <label className="text-sm">Nota (0–100)<input name="nota" type="number" min="0" max="100" step="0.01" required value={nota} onChange={(event) => setNota(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm">Observaciones<textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <div className="flex gap-2"><Button disabled={submitting}>{submitting ? 'Registrando…' : 'Registrar evaluación'}</Button><Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cancelar</Button></div>
    </form>}
  </Card>
}
