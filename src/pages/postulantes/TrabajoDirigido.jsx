import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { postulacionesService } from '../../services/postulacionesService'

const EMPTY_INSTITUTION = {
  tipo_ejecucion: 'EXTERNO', institucion_nombre: '', institucion_tipo: 'PUBLICA',
  constituida_legalmente: false, actividad_permanente: false, proporciona_recursos: false,
  supervisor_nombre: '', supervisor_profesion: '', convenio_vigente: false,
  fecha_firma_convenio: '', observaciones: '',
}
const EMPTY_REPORT = { periodo: '', descripcion_desempeno: '', evaluacion_cualitativa: '', aporte_laboral: '', sugerencias_recomendaciones: '' }

export default function TrabajoDirigido({ postulacion, trabajo, etapaCodigo, canManage, onChanged }) {
  const [institution, setInstitution] = useState(() => ({ ...EMPTY_INSTITUTION, ...(trabajo?.institucion || {}) }))
  const [report, setReport] = useState(EMPTY_REPORT)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  if (!trabajo) return null

  const update = (setter) => (event) => {
    const { name, type, checked, value } = event.target
    setter((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }
  const operate = async (operation) => {
    if (submitting) return
    setSubmitting(true); setError('')
    try { await operation(); await onChanged() } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }

  return <Card id="trabajo-dirigido" className="overflow-hidden border-cyan-300 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950">
    <h2 className="text-xl font-bold">Trabajo Dirigido</h2>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Práctica académico-laboral con institución, supervisión, perfil, documento final y defensas privada y pública.</p>

    {trabajo.institucion && <dl className="mt-4 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 dark:bg-slate-900">
      <Info label="Institución" value={trabajo.institucion.institucion_nombre} />
      <Info label="Tipo" value={`${trabajo.institucion.institucion_tipo} · ${trabajo.institucion.tipo_ejecucion}`} />
      <Info label="Supervisor institucional" value={trabajo.institucion.supervisor_nombre} />
      <Info label="Convenio" value={trabajo.institucion.convenio_requerido ? (trabajo.institucion.convenio_vigente ? 'Vigente' : 'Pendiente') : 'No requerido'} />
    </dl>}

    {canManage && ['INSCRIPCION', 'PERFIL_TRABAJO_DIRIGIDO', 'DESARROLLO_TRABAJO_DIRIGIDO'].includes(etapaCodigo) && <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 dark:bg-slate-900" onSubmit={(event) => { event.preventDefault(); operate(() => postulacionesService.configurarInstitucionTrabajoDirigido(postulacion, institution)) }}>
      <h3 className="font-semibold md:col-span-2">Institución y supervisor</h3>
      <Field label="Institución"><input required name="institucion_nombre" value={institution.institucion_nombre} onChange={update(setInstitution)} className="mt-1 w-full rounded-lg border p-2" /></Field>
      <Field label="Supervisor institucional"><input required name="supervisor_nombre" value={institution.supervisor_nombre} onChange={update(setInstitution)} className="mt-1 w-full rounded-lg border p-2" /></Field>
      <Field label="Ejecución"><select name="tipo_ejecucion" value={institution.tipo_ejecucion} onChange={update(setInstitution)} className="mt-1 w-full rounded-lg border p-2"><option value="INTERNO">Interno</option><option value="EXTERNO">Externo</option></select></Field>
      <Field label="Tipo de institución"><select name="institucion_tipo" value={institution.institucion_tipo} onChange={update(setInstitution)} className="mt-1 w-full rounded-lg border p-2"><option value="PUBLICA">Pública</option><option value="PRIVADA">Privada</option></select></Field>
      <Check name="constituida_legalmente" checked={institution.constituida_legalmente} onChange={update(setInstitution)}>Legalmente constituida</Check>
      <Check name="actividad_permanente" checked={institution.actividad_permanente} onChange={update(setInstitution)}>Actividad activa y permanente</Check>
      <Check name="proporciona_recursos" checked={institution.proporciona_recursos} onChange={update(setInstitution)}>Proporciona medios y recursos</Check>
      <Check name="convenio_vigente" checked={institution.convenio_vigente} onChange={update(setInstitution)}>Convenio vigente</Check>
      {institution.convenio_vigente && <Field label="Fecha de firma"><input required type="date" name="fecha_firma_convenio" value={institution.fecha_firma_convenio || ''} onChange={update(setInstitution)} className="mt-1 w-full rounded-lg border p-2" /></Field>}
      <div className="md:col-span-2"><Button disabled={submitting}>Guardar institución</Button></div>
    </form>}

    <section className="mt-4 rounded-lg border bg-white p-4 dark:bg-slate-900"><h3 className="font-semibold">Informes periódicos de seguimiento</h3>
      {trabajo.informes?.length ? <ul className="mt-3 space-y-2">{trabajo.informes.map((item) => <li key={item.id} className="rounded border p-3"><strong>{item.periodo}</strong><p className="text-sm text-slate-600">{item.descripcion_desempeno}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No existen informes registrados.</p>}
      {canManage && etapaCodigo === 'DESARROLLO_TRABAJO_DIRIGIDO' && <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); operate(async () => { await postulacionesService.registrarInformeTrabajoDirigido(postulacion, report); setReport(EMPTY_REPORT) }) }}>
        <Field label="Periodo"><input required name="periodo" value={report.periodo} onChange={update(setReport)} className="mt-1 w-full rounded-lg border p-2" /></Field>
        {['descripcion_desempeno', 'evaluacion_cualitativa', 'aporte_laboral', 'sugerencias_recomendaciones'].map((name) => <Field key={name} label={name.replaceAll('_', ' ')}><textarea required={name !== 'sugerencias_recomendaciones'} name={name} value={report[name]} onChange={update(setReport)} className="mt-1 w-full rounded-lg border p-2" /></Field>)}
        <Button disabled={submitting}>Registrar informe</Button>
      </form>}
    </section>
    {canManage && etapaCodigo === 'CIERRE_DOCUMENTAL' && <Button className="mt-4" onClick={() => operate(() => postulacionesService.concluirTrabajoDirigido(postulacion))} disabled={submitting}>Concluir académicamente</Button>}
    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
  </Card>
}

function Info({ label, value }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-medium">{value || 'No registrado'}</dd></div> }
function Field({ label, children }) { return <label className="text-sm capitalize">{label}{children}</label> }
function Check({ children, ...props }) { return <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...props} />{children}</label> }
