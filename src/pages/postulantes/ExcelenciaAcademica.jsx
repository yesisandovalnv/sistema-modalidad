import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'

const CRITERIA_LABELS = {
  RENDIMIENTO_ACADEMICO: 'Rendimiento académico',
  RECONOCIMIENTO_CALIDAD: 'Reconocimiento a la calidad',
}

export default function ExcelenciaAcademica({ postulacion, excelencia, etapaCodigo, canManage, onChanged }) {
  const [criterio, setCriterio] = useState('')
  const [resultado, setResultado] = useState('FAVORABLE')
  const [promedio, setPromedio] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [concluding, setConcluding] = useState(false)
  const [error, setError] = useState('')
  if (!excelencia) return null

  const selectedCriterion = excelencia.criterio || criterio
  const criterionName = CRITERIA_LABELS[selectedCriterion] || selectedCriterion || 'Pendiente'
  const submitCriterion = async (event) => {
    event.preventDefault()
    if (!criterio || submitting) return
    setSubmitting(true); setError('')
    try {
      await postulacionesService.configurarExcelenciaAcademica(postulacion, criterio)
      setCriterio('')
      await onChanged()
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  const submitEvaluation = async (event) => {
    event.preventDefault()
    if (submitting || !selectedCriterion) return
    setSubmitting(true); setError('')
    try {
      await postulacionesService.registrarEvaluacionExcelencia(postulacion, {
        resultado,
        promedio_general: selectedCriterion === 'RENDIMIENTO_ACADEMICO' ? promedio : undefined,
        observaciones,
      })
      await onChanged()
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  const conclude = async () => {
    if (concluding) return
    setConcluding(true); setError('')
    try { await postulacionesService.concluirExcelenciaAcademica(postulacion); await onChanged() }
    catch (requestError) { setError(requestError.message) }
    finally { setConcluding(false) }
  }
  return <Card id="excelencia" className="overflow-hidden border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
    <h2 className="text-xl font-bold">Excelencia Académica</h2>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">El expediente se valida con documentación oficial y evaluación cualitativa del tribunal.</p>
    {!excelencia.criterio && canManage && <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 dark:bg-slate-900" onSubmit={submitCriterion}>
      <h3 className="font-semibold">Seleccionar criterio normativo</h3>
      <label className="text-sm">Criterio<select required value={criterio} onChange={(event) => setCriterio(event.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Seleccione un criterio</option>{(excelencia.criterios || []).map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}</select></label>
      <Button disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar criterio'}</Button>
    </form>}
    <dl className="mt-4 grid gap-3 sm:grid-cols-3"><div><dt className="text-xs uppercase text-slate-500">Criterio</dt><dd className="font-semibold">{criterionName}</dd></div><div><dt className="text-xs uppercase text-slate-500">Resultado</dt><dd className="font-semibold">{excelencia.resultado?.estado || 'Pendiente'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Promedio general</dt><dd className="font-semibold">{excelencia.resultado?.promedio_general || 'No aplica o pendiente'}</dd></div></dl>
    <div className="mt-4 grid gap-2">{(excelencia.documentos_requeridos || []).map((document) => <p key={document} className="text-sm">Documento requerido: {document.replaceAll('_', ' ')}</p>)}</div>
    {canManage && etapaCodigo === 'EVALUACION_TRIBUNAL' && excelencia.criterio && <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 dark:bg-slate-900" onSubmit={submitEvaluation}>
      <h3 className="font-semibold">Registrar evaluación del tribunal</h3>
      <label className="text-sm">Resultado<select value={resultado} onChange={(event) => setResultado(event.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="FAVORABLE">Favorable</option><option value="DESFAVORABLE">Desfavorable</option></select></label>
      {excelencia.criterio === 'RENDIMIENTO_ACADEMICO' && <label className="text-sm">Promedio general (mínimo normativo 80)<input required type="number" min="0" max="100" step="0.01" value={promedio} onChange={(event) => setPromedio(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>}
      <label className="text-sm">Observaciones<textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <Button disabled={submitting}>{submitting ? 'Registrando…' : 'Registrar evaluación'}</Button>
    </form>}
    {canManage && etapaCodigo === 'CONCLUSION_ACADEMICA' && excelencia.resultado?.estado === 'FAVORABLE' && <Button className="mt-4" onClick={conclude} disabled={concluding}>{concluding ? 'Concluyendo…' : 'Concluir académicamente'}</Button>}
    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
  </Card>
}