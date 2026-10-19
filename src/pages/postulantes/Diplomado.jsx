import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'

export default function Diplomado({ postulacion, diplomado, etapaCodigo, canManage, onChanged }) {
  const [nota, setNota] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updating, setUpdating] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const moduleOrder = etapaCodigo === 'TALLER_INVESTIGACION'
    ? 5
    : /^MODULO_[1-4]$/.test(etapaCodigo || '')
      ? Number(etapaCodigo.slice(-1))
      : null
  useEffect(() => {
    setNota(''); setError(''); setSuccess(''); setUpdating(false); setLastSaved(null)
  }, [moduleOrder])
  if (!diplomado) return null
  const currentModule = (diplomado.modulos || []).find((item) => item.orden === moduleOrder)
  const savedForCurrentModule = lastSaved?.orden === moduleOrder ? lastSaved : null
  const currentNote = savedForCurrentModule?.nota ?? currentModule?.nota ?? null
  const currentStatus = savedForCurrentModule?.estado ?? currentModule?.estado
  const hasCurrentResult = currentNote !== null && currentNote !== undefined && currentNote !== ''
  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (hasCurrentResult && !window.confirm(`La actualización reemplazará la nota anterior (${currentNote}). ¿Deseas continuar?`)) return
    setSubmitting(true); setError(''); setSuccess('')
    try {
      const result = await postulacionesService.registrarNotaDiplomado(postulacion, { modulo: String(moduleOrder), nota })
      setLastSaved({ orden: moduleOrder, nota: String(result?.nota ?? nota), estado: result?.estado || currentStatus })
      setNota(''); setUpdating(false); setSuccess('Resultado guardado correctamente.')
      await onChanged()
    }
    catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  const openUpdate = () => {
    setNota(String(currentNote)); setError(''); setSuccess(''); setUpdating(true)
  }
  const cancelUpdate = () => {
    setNota(''); setError(''); setUpdating(false)
  }
  const conclude = async () => {
    setSubmitting(true); setError('')
    try { await postulacionesService.concluirDiplomado(postulacion); await onChanged() }
    catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  return <Card id="diplomado" className="overflow-hidden border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950">
    <h2 className="text-xl font-bold">Graduación Vía Diplomado</h2>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Seguimiento de cinco módulos, Taller de Investigación, Monografía y defensa pública.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{(diplomado.modulos || []).map((item) => <article key={item.orden} className="rounded-lg border bg-white p-4 dark:bg-slate-900"><h3 className="font-semibold">{item.orden}. {item.nombre}</h3><p className="text-sm text-slate-500">Estado: {item.estado} · Nota: {item.nota || 'Pendiente'}</p></article>)}</div>
    {currentModule && hasCurrentResult && <section className="mt-4 rounded-lg border bg-white p-4 dark:bg-slate-900" aria-labelledby="diplomado-current-result">
      <h3 id="diplomado-current-result" className="font-semibold">Resultado de {currentModule.nombre}</h3>
      <p className="mt-2 text-sm"><strong>Nota:</strong> {currentNote}</p>
      <p className="mt-1 text-sm"><strong>Estado académico:</strong> {currentStatus}</p>
      {canManage && !updating && <Button type="button" className="mt-3" variant="secondary" onClick={openUpdate}>Actualizar nota</Button>}
    </section>}
    {canManage && currentModule && (!hasCurrentResult || updating) ? <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 dark:bg-slate-900" onSubmit={submit}><h3 className="font-semibold">{updating ? `Actualizar resultado de ${currentModule.nombre}` : 'Registrar resultado de módulo'}</h3><div className="text-sm"><span className="font-medium">Módulo actual</span><p className="mt-1">{currentModule.orden}. {currentModule.nombre}</p></div>{updating && <p className="text-sm text-amber-700 dark:text-amber-300">Al guardar, la nueva calificación reemplazará la nota anterior.</p>}<label className="text-sm">Nota<input required type="number" min="0" max="100" step="0.01" value={nota} onChange={(event) => setNota(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><div className="flex flex-wrap gap-3"><Button disabled={submitting}>{submitting ? 'Guardando…' : updating ? 'Actualizar nota' : 'Registrar nota'}</Button>{updating && <Button type="button" variant="secondary" disabled={submitting} onClick={cancelUpdate}>Cancelar</Button>}</div></form> : null}
    {success && <p role="status" className="mt-3 text-emerald-700 dark:text-emerald-300">{success}</p>}
    {canManage && etapaCodigo === 'CONCLUSION_ACADEMICA' && <Button className="mt-4" onClick={conclude} disabled={submitting}>Concluir académicamente</Button>}
    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
  </Card>
}
