import { useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

export default function AcademicConclusion({ postulacion, modalidadCodigo, resultado, canManage, onChanged }) {
  const [state, setState] = useState({ submitting: false, error: '', done: false })
  if (modalidadCodigo !== 'TESIS_GRADO') return null
  const eligible = resultado?.data?.nota_final != null && resultado.data?.clasificacion !== 'POSTERGADO'
  const submit = async () => {
    if (state.submitting || !eligible) return
    setState({ submitting: true, error: '', done: false })
    try { await postulacionesService.concluirAcademicamente(postulacion); setState({ submitting: false, error: '', done: true }); onChanged?.() }
    catch (error) { setState({ submitting: false, error: error.message, done: false }) }
  }
  return <Card aria-labelledby="conclusion-academica-title"><h2 id="conclusion-academica-title" className="text-xl font-bold">Conclusión académica</h2><p className="mt-1 text-sm text-slate-500">Requiere Defensa Pública aprobada, resultado final aprobatorio y ACTA_DEFENSA vigente vinculada. La verificación definitiva corresponde al backend.</p>{state.done && <p role="status" className="mt-3 text-emerald-700">Postulación concluida académicamente.</p>}{state.error && <p role="alert" className="mt-3 text-red-600">{state.error}</p>}{canManage && <Button className="mt-4" disabled={!eligible || state.submitting} onClick={submit}>{state.submitting ? 'Concluyendo…' : 'Concluir académicamente'}</Button>}{!eligible && <p className="mt-3 text-sm text-amber-700">La nota final aprobatoria aún no está disponible.</p>}</Card>
}
