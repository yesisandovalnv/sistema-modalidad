import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'

export default function Diplomado({ postulacion, diplomado, etapaCodigo, canManage, onChanged }) {
  const [nota, setNota] = useState('')
  const [modulo, setModulo] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  if (!diplomado) return null
  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true); setError('')
    try { await postulacionesService.registrarNotaDiplomado(postulacion, { modulo, nota }); setNota(''); await onChanged() }
    catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
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
    {canManage && (etapaCodigo?.startsWith('MODULO_') || etapaCodigo === 'TALLER_INVESTIGACION') ? <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 dark:bg-slate-900" onSubmit={submit}><h3 className="font-semibold">Registrar resultado de módulo</h3><label className="text-sm">Módulo<select value={modulo} onChange={(event) => setModulo(event.target.value)} className="mt-1 w-full rounded-lg border p-2">{diplomado.modulos.map((item) => <option key={item.orden} value={item.orden}>{item.orden}. {item.nombre}</option>)}</select></label><label className="text-sm">Nota<input required type="number" min="0" max="100" step="0.01" value={nota} onChange={(event) => setNota(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><Button disabled={submitting}>Registrar nota</Button></form> : null}
    {canManage && etapaCodigo === 'CONCLUSION_ACADEMICA' && <Button className="mt-4" onClick={conclude} disabled={submitting}>Concluir académicamente</Button>}
    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
  </Card>
}
