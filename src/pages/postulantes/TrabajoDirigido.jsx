import { cloneElement, useEffect, useId, useRef, useState } from 'react'
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
const REPORT_LABELS = {
  descripcion_desempeno: 'Descripción del desempeño',
  evaluacion_cualitativa: 'Evaluación cualitativa',
  aporte_laboral: 'Aporte laboral',
  sugerencias_recomendaciones: 'Sugerencias y recomendaciones',
}

const asInstitution = (value) => ({ ...EMPTY_INSTITUTION, ...(value || {}) })
const firstMessage = (value) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean) || ''
  return ''
}

function validateInstitution(institution) {
  const errors = {}
  if (!institution.institucion_nombre.trim()) errors.institucion_nombre = 'Registre el nombre de la institución.'
  if (!institution.supervisor_nombre.trim()) errors.supervisor_nombre = 'Registre el nombre del supervisor institucional.'
  if (!institution.constituida_legalmente) errors.constituida_legalmente = 'Confirme que la institución está legalmente constituida.'
  if (!institution.actividad_permanente) errors.actividad_permanente = 'Confirme que la institución desarrolla actividad activa y permanente.'
  if (institution.tipo_ejecucion === 'EXTERNO' && !institution.convenio_vigente) errors.convenio_vigente = 'La ejecución externa requiere un convenio vigente.'
  if (institution.convenio_vigente && !institution.fecha_firma_convenio) errors.fecha_firma_convenio = 'Registre la fecha de firma del convenio vigente.'
  return errors
}

function backendFieldErrors(requestError) {
  const fields = requestError?.fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {}
  return Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, firstMessage(value)]).filter(([, value]) => value))
}

export default function TrabajoDirigido({ postulacion, trabajo, etapaCodigo, canManage, onChanged, reportSuccess: controlledReportSuccess, onReportSuccess }) {
  const [institution, setInstitution] = useState(() => asInstitution(trabajo?.institucion))
  const [report, setReport] = useState(EMPTY_REPORT)
  const [institutionSubmitting, setInstitutionSubmitting] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [conclusionSubmitting, setConclusionSubmitting] = useState(false)
  const [institutionFeedback, setInstitutionFeedback] = useState({ error: '', success: '', fields: {} })
  const [reportError, setReportError] = useState('')
  const [localReportSuccess, setLocalReportSuccess] = useState('')
  const [conclusionError, setConclusionError] = useState('')
  const reportSubmittingRef = useRef(false)
  const reportSuccess = controlledReportSuccess ?? localReportSuccess
  const setReportSuccess = onReportSuccess ?? setLocalReportSuccess

  useEffect(() => {
    if (trabajo?.institucion) setInstitution(asInstitution(trabajo.institucion))
  }, [trabajo?.institucion])

  if (!trabajo) return null

  const updateInstitution = (event) => {
    const { name, type, checked, value } = event.target
    setInstitution((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setInstitutionFeedback((current) => ({ ...current, error: '', success: '', fields: { ...current.fields, [name]: '' } }))
  }
  const updateReport = (event) => {
    const { name, value } = event.target
    setReport((current) => ({ ...current, [name]: value }))
    setReportError('')
    setReportSuccess('')
  }

  const saveInstitution = async (event) => {
    event.preventDefault()
    if (institutionSubmitting) return
    const fields = validateInstitution(institution)
    if (Object.keys(fields).length) {
      setInstitutionFeedback({ error: 'Revisa los campos señalados antes de guardar.', success: '', fields })
      return
    }
    setInstitutionSubmitting(true)
    setInstitutionFeedback({ error: '', success: '', fields: {} })
    try {
      await postulacionesService.configurarInstitucionTrabajoDirigido(postulacion, institution)
      await onChanged()
      setInstitutionFeedback({ error: '', success: 'Institución y supervisor guardados correctamente.', fields: {} })
    } catch (requestError) {
      setInstitutionFeedback({
        error: requestError.message || 'No se pudo guardar la institución. Revisa los datos e intenta nuevamente.',
        success: '',
        fields: backendFieldErrors(requestError),
      })
    } finally {
      setInstitutionSubmitting(false)
    }
  }

  const saveReport = async (event) => {
    event.preventDefault()
    if (reportSubmittingRef.current) return
    reportSubmittingRef.current = true
    setReportSubmitting(true)
    setReportError('')
    setReportSuccess('')
    try {
      await postulacionesService.registrarInformeTrabajoDirigido(postulacion, report)
      setReport(EMPTY_REPORT)
      setReportSuccess('Informe periódico registrado correctamente.')
      await onChanged()
    } catch (requestError) {
      setReportError(requestError.message || 'No se pudo registrar el informe periódico.')
    } finally {
      reportSubmittingRef.current = false
      setReportSubmitting(false)
    }
  }

  const conclude = async () => {
    if (conclusionSubmitting) return
    setConclusionSubmitting(true)
    setConclusionError('')
    try {
      await postulacionesService.concluirTrabajoDirigido(postulacion)
      await onChanged()
    } catch (requestError) {
      setConclusionError(requestError.message || 'No se pudo concluir académicamente el Trabajo Dirigido.')
    } finally {
      setConclusionSubmitting(false)
    }
  }

  return <Card id="trabajo-dirigido" className="overflow-hidden border-cyan-300 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950">
    <h2 className="text-xl font-bold">Trabajo Dirigido</h2>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Práctica académico-laboral con institución, supervisión, perfil, documento final y defensas privada y pública.</p>

    {trabajo.institucion && <dl className="mt-4 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 dark:bg-slate-900">
      <Info label="Institución" value={trabajo.institucion.institucion_nombre} />
      <Info label="Tipo" value={`${trabajo.institucion.institucion_tipo} · ${trabajo.institucion.tipo_ejecucion}`} />
      <Info label="Supervisor institucional" value={trabajo.institucion.supervisor_nombre} />
      <Info label="Convenio declarado" value={trabajo.institucion.convenio_requerido ? (trabajo.institucion.convenio_vigente ? 'Vigente' : 'Pendiente') : 'No requerido'} />
      {trabajo.institucion.convenio_requerido && <p className="text-xs text-slate-500 sm:col-span-2">La vigencia declarada no sustituye la presentación y aprobación del documento de convenio.</p>}
    </dl>}

    {canManage && ['INSCRIPCION', 'PERFIL_TRABAJO_DIRIGIDO', 'DESARROLLO_TRABAJO_DIRIGIDO'].includes(etapaCodigo) && <form className="mt-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 dark:bg-slate-900" onSubmit={saveInstitution} noValidate>
      <div className="md:col-span-2"><h3 className="font-semibold">Institución y supervisor</h3><p className="mt-1 text-sm text-slate-500">Los campos marcados con * son obligatorios. El registro solo se confirma después de recibir la respuesta del servidor.</p></div>
      <Field label="Institución" required error={institutionFeedback.fields.institucion_nombre}><input name="institucion_nombre" value={institution.institucion_nombre} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2" /></Field>
      <Field label="Supervisor institucional" required error={institutionFeedback.fields.supervisor_nombre}><input name="supervisor_nombre" value={institution.supervisor_nombre} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2" /></Field>
      <Field label="Ejecución" required><select name="tipo_ejecucion" value={institution.tipo_ejecucion} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2"><option value="INTERNO">Interna</option><option value="EXTERNO">Externa</option></select></Field>
      <Field label="Tipo de institución" required><select name="institucion_tipo" value={institution.institucion_tipo} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2"><option value="PUBLICA">Pública</option><option value="PRIVADA">Privada</option></select></Field>
      <div className="space-y-3 md:col-span-2" aria-label="Condiciones institucionales">
        <Check name="constituida_legalmente" checked={institution.constituida_legalmente} onChange={updateInstitution} required error={institutionFeedback.fields.constituida_legalmente}>Legalmente constituida</Check>
        <Check name="actividad_permanente" checked={institution.actividad_permanente} onChange={updateInstitution} required error={institutionFeedback.fields.actividad_permanente}>Actividad activa y permanente</Check>
        <p className="text-sm text-slate-500">Estas dos condiciones deben confirmarse para poder iniciar Desarrollo y seguimiento institucional.</p>
        <Check name="proporciona_recursos" checked={institution.proporciona_recursos} onChange={updateInstitution}>Proporciona medios y recursos</Check>
        <p className="text-sm text-slate-500">Este dato describe el apoyo institucional; actualmente no bloquea el inicio de Desarrollo.</p>
      </div>
      <div className="rounded-lg border p-3 md:col-span-2">
        <Check name="convenio_vigente" checked={institution.convenio_vigente} onChange={updateInstitution} required={institution.tipo_ejecucion === 'EXTERNO'} error={institutionFeedback.fields.convenio_vigente}>Convenio vigente</Check>
        <p className="mt-2 text-sm text-slate-500">Es obligatorio para ejecución externa. En ejecución interna solo complete estos datos si existe un convenio vigente.</p>
        {institution.convenio_vigente && <div className="mt-3 max-w-sm"><Field label="Fecha de firma" required error={institutionFeedback.fields.fecha_firma_convenio}><input type="date" name="fecha_firma_convenio" value={institution.fecha_firma_convenio || ''} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2" /></Field></div>}
      </div>
      <Field label="Profesión del supervisor"><input name="supervisor_profesion" value={institution.supervisor_profesion} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2" /></Field>
      <Field label="Observaciones"><textarea name="observaciones" value={institution.observaciones} onChange={updateInstitution} className="mt-1 w-full rounded-lg border p-2" /></Field>
      <div className="md:col-span-2"><Button type="submit" disabled={institutionSubmitting}>{institutionSubmitting ? 'Guardando institución…' : 'Guardar institución'}</Button>{institutionFeedback.error && <p role="alert" className="mt-3 text-sm text-red-600">{institutionFeedback.error}</p>}{institutionFeedback.success && <p role="status" className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">{institutionFeedback.success}</p>}</div>
    </form>}

    <section className="mt-4 rounded-lg border bg-white p-4 dark:bg-slate-900"><h3 className="font-semibold">Informes periódicos de seguimiento</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Registrar aquí el seguimiento estructurado y cargar el documento “Informe periódico de supervisión” son requisitos independientes. El documento se gestiona en la pestaña Documentos.</p>
      {trabajo.informes?.length ? <ul className="mt-3 space-y-2">{trabajo.informes.map((item) => <li key={item.id} className="rounded border p-3"><strong>{item.periodo}</strong><p className="text-sm text-slate-600">{item.descripcion_desempeno}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No existen informes registrados.</p>}
      {canManage && etapaCodigo === 'DESARROLLO_TRABAJO_DIRIGIDO' && !trabajo.institucion && <p className="mt-3 text-sm text-slate-500">El registro de informes se habilitará cuando el expediente confirme los datos institucionales guardados.</p>}
      {canManage && etapaCodigo === 'DESARROLLO_TRABAJO_DIRIGIDO' && trabajo.institucion && <form className="mt-4 grid gap-3" onSubmit={saveReport}>
        <Field label="Periodo" required><input required name="periodo" value={report.periodo} onChange={updateReport} className="mt-1 w-full rounded-lg border p-2" /></Field>
        {Object.entries(REPORT_LABELS).map(([name, label]) => <Field key={name} label={label} required={name !== 'sugerencias_recomendaciones'}><textarea required={name !== 'sugerencias_recomendaciones'} name={name} value={report[name]} onChange={updateReport} className="mt-1 w-full rounded-lg border p-2" /></Field>)}
        <div><Button type="submit" disabled={reportSubmitting}>{reportSubmitting ? 'Registrando informe…' : 'Registrar informe'}</Button></div>
        {reportError && <p role="alert" className="text-sm text-red-600">{reportError}</p>}
        {reportSuccess && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{reportSuccess}</p>}
      </form>}
    </section>
    {canManage && etapaCodigo === 'CIERRE_DOCUMENTAL' && <div className="mt-4"><Button onClick={conclude} disabled={conclusionSubmitting} type="button">{conclusionSubmitting ? 'Concluyendo…' : 'Concluir académicamente'}</Button>{conclusionError && <p role="alert" className="mt-3 text-sm text-red-600">{conclusionError}</p>}</div>}
  </Card>
}

function Info({ label, value }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-medium">{value || 'No registrado'}</dd></div> }
function Field({ label, required = false, error = '', children }) {
  const errorId = useId()
  const control = cloneElement(children, { 'aria-label': label, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error ? errorId : undefined })
  return <label className="text-sm"><span>{label}{required && <span aria-hidden="true"> *</span>}</span>{control}{error && <span id={errorId} className="mt-1 block text-red-600">{error}</span>}</label>
}
function Check({ children, required = false, error = '', ...props }) {
  const errorId = useId()
  return <div><label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={typeof children === 'string' ? children : undefined} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? errorId : undefined} {...props} /><span>{children}{required && <span aria-hidden="true"> *</span>}</span></label>{error && <p id={errorId} className="mt-1 text-sm text-red-600">{error}</p>}</div>
}
