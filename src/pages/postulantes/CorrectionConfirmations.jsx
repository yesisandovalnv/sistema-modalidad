import { useCallback, useEffect, useRef, useState } from 'react'

import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const rows = (data) => data?.results || data || []

/** Shared documentary-corrections view. Academic authorization remains backend-owned. */
export default function CorrectionConfirmations({ postulacion, modalidadCodigo, defenses, assignments, canManage, onChanged }) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const controller = useRef(null)
  const privateDefense = rows(defenses.data).find((item) => item.tipo_evento === 'DEFENSA_PRIVADA' && item.estado === 'FINALIZADA' && item.activo !== false)
  const tribunals = rows(assignments.data).filter((item) => item.tipo_participacion === 'TRIBUNAL' && item.activo !== false)

  const load = useCallback(async () => {
    controller.current?.abort(); controller.current = new AbortController()
    setState((current) => ({ ...current, loading: true, error: '' }))
    try { setState({ data: await postulacionesService.obtenerConfirmacionesCorreccion(postulacion, controller.current.signal), loading: false, error: '' }) }
    catch (error) { if (!error.canceled) setState({ data: null, loading: false, error: error.message }) }
  }, [postulacion])
  useEffect(() => { load(); return () => controller.current?.abort() }, [load])
  if (modalidadCodigo !== 'TESIS_GRADO') return null

  const submit = async (event) => {
    event.preventDefault(); if (submitting) return
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    try {
      await postulacionesService.registrarConfirmacionCorreccion({
        postulacion: Number(postulacion), evento_origen: Number(form.get('evento_origen')),
        version_observada: Number(form.get('version_observada')), version_corregida: Number(form.get('version_corregida')),
        asignacion_confirmante: Number(form.get('asignacion_confirmante')), observaciones: form.get('observaciones') || '',
      })
      setOpen(false); await load(); onChanged?.()
    } catch (error) { setState((current) => ({ ...current, error: error.message })) } finally { setSubmitting(false) }
  }

  return <Card aria-labelledby="confirmaciones-correccion-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="confirmaciones-correccion-title" className="text-xl font-bold">Correcciones posteriores a Defensa Privada</h2><p className="mt-1 text-sm text-slate-500">La confirmación registra la trazabilidad documental; el backend valida al Tribunal y el gate hacia Pública.</p></div>{canManage && privateDefense && <Button onClick={() => setOpen((value) => !value)}>{open ? 'Cancelar' : 'Registrar confirmación'}</Button>}</div>
    {!privateDefense && <p className="mt-3 text-sm text-amber-700">Pública permanece bloqueada hasta una Defensa Privada finalizada con resultado suficiente.</p>}
    {state.loading && <p className="mt-3 text-sm">Cargando confirmaciones…</p>}
    {state.error && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
    {!state.loading && !state.error && <ul className="mt-4 space-y-3">{rows(state.data).map((item) => <li key={item.id} className="rounded border p-3 text-sm"><p className="font-semibold">Versión observada #{item.version_observada} → corregida #{item.version_corregida}</p><p>Tribunal que respalda: {item.asignacion_confirmante_nombre || 'No registrado'}</p><p>Registrado por: {item.confirmado_por_nombre || 'No registrado'}</p><p>{item.observaciones || 'Sin observaciones'}</p></li>)}{rows(state.data).length === 0 && <li className="text-sm text-slate-500">No hay confirmaciones registradas.</li>}</ul>}
    {open && <form className="mt-4 grid gap-3 rounded border p-4" onSubmit={submit}><input type="hidden" name="evento_origen" value={privateDefense?.id || ''} /><label className="text-sm">Versión observada (ID)<input name="version_observada" required type="number" min="1" className="mt-1 w-full rounded border p-2" /></label><label className="text-sm">Versión corregida (ID)<input name="version_corregida" required type="number" min="1" className="mt-1 w-full rounded border p-2" /></label><label className="text-sm">Tribunal que respalda<select name="asignacion_confirmante" required className="mt-1 w-full rounded border p-2"><option value="">Seleccione Tribunal</option>{tribunals.map((item) => <option key={item.id} value={item.id}>{item.usuario_nombre || item.usuario_username || `Asignación ${item.id}`}</option>)}</select></label><label className="text-sm">Observaciones<textarea name="observaciones" className="mt-1 w-full rounded border p-2" /></label><Button type="submit" disabled={submitting}>{submitting ? 'Registrando…' : 'Confirmar corrección'}</Button></form>}
  </Card>
}
