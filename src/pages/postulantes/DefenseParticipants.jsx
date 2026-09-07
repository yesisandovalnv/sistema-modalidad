import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../components/crud/CrudShell'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const SUPPORTED_ROLES = new Set(['TUTOR', 'TRIBUNAL', 'DOCENTE_MODALIDAD', 'PRESIDENTE', 'SECRETARIO'])
const PRIVATE_THESIS_ROLES = new Set(['TRIBUNAL', 'DOCENTE_MODALIDAD'])
const MUTABLE_STATES = new Set(['PROGRAMADA', 'EN_CURSO', 'SUSPENDIDA'])

function dateLabel(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}

function attendanceLabel(value) {
  if (value === true) return 'Presente'
  if (value === false) return 'Ausente'
  return 'No registrada'
}

function fieldMessage(fields, name) {
  const value = fields?.[name]
  return Array.isArray(value) ? value.join(' ') : value || ''
}

function FieldErrors({ fields, except = [] }) {
  const rows = Object.entries(fields || {}).filter(([name, value]) => !except.includes(name) && value)
  if (!rows.length) return null
  return <div role="alert" className="space-y-1 text-sm text-red-600">{rows.map(([name, value]) => <p key={name}>{Array.isArray(value) ? value.join(' ') : String(value)}</p>)}</div>
}

export default function DefenseParticipants({ defense, canManage, onChanged }) {
  const participants = defense.participantes || []
  const [dialog, setDialog] = useState(null)
  const [catalog, setCatalog] = useState({ rows: [], loading: false, error: '' })
  const [search, setSearch] = useState('')
  const controller = useRef(null)

  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    controller.current?.abort()
    controller.current = null
    setDialog(null)
    setCatalog({ rows: [], loading: false, error: '' })
    setSearch('')
  }, [defense.id])

  const close = () => {
    controller.current?.abort()
    controller.current = null
    setDialog(null)
  }

  const loadCandidates = async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setDialog({ action: 'add', submitting: false, fields: {}, error: '' })
    setCatalog({ rows: [], loading: true, error: '' })
    try {
      const data = await postulacionesService.obtenerAsignacionesCandidatas(defense.postulacion, request.signal)
      const activeIds = new Set(participants.filter((item) => item.activo !== false).map((item) => String(item.asignacion)))
      const allowedRoles = defense.postulacion_modalidad_codigo === 'TESIS_GRADO' && defense.tipo_evento === 'DEFENSA_PRIVADA'
        ? PRIVATE_THESIS_ROLES
        : SUPPORTED_ROLES
      const rows = (data.results || data || []).filter((item) => item.activo !== false && allowedRoles.has(item.tipo_participacion) && !activeIds.has(String(item.id)))
      if (!request.signal.aborted) setCatalog({ rows, loading: false, error: '' })
    } catch (error) {
      if (!error.canceled && !request.signal.aborted) setCatalog({ rows: [], loading: false, error: error.message })
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return catalog.rows
    return catalog.rows.filter((item) => `${item.usuario_nombre || ''} ${item.tipo_participacion_display || item.tipo_participacion_nombre || item.tipo_participacion}`.toLocaleLowerCase('es').includes(term))
  }, [catalog.rows, search])

  const mutate = async (callback) => {
    if (dialog?.submitting) return
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setDialog((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    try {
      await callback(request.signal)
      if (!request.signal.aborted) {
        await onChanged(request.signal)
        close()
      }
    } catch (error) {
      if (!error.canceled && !request.signal.aborted) setDialog((current) => ({ ...current, submitting: false, fields: error.fields || {}, error: error.message }))
    }
  }

  const submitAdd = (event) => {
    event.preventDefault()
    const assignment = catalog.rows.find((item) => String(item.id) === event.currentTarget.elements.asignacion.value)
    if (!assignment) {
      setDialog((current) => ({ ...current, fields: { asignacion: ['Selecciona una asignación activa.'] } }))
      return
    }
    mutate((signal) => postulacionesService.agregarParticipanteDefensa(defense.id, assignment.id, assignment.tipo_participacion, signal))
  }

  const submitAttendance = (event) => {
    event.preventDefault()
    const value = event.currentTarget.elements.presente.value
    const observations = event.currentTarget.elements.observaciones.value.trim()
    mutate((signal) => postulacionesService.registrarAsistenciaDefensa(defense.id, dialog.participant.id, value === 'true', observations, signal))
  }

  const canMutate = canManage && MUTABLE_STATES.has(defense.estado)
  const canAttend = canManage && defense.estado === 'EN_CURSO'

  return <section aria-labelledby="participantes-defensa-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="participantes-defensa-title" className="text-lg font-bold">Participantes</h3>
      {canMutate && <Button variant="secondary" onClick={loadCandidates}>Agregar participante</Button>}
    </div>
    <aside role="note" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950">La incorporación como participante no sustituye memorando, designación ni convocatoria institucional formal.</aside>
    {participants.length === 0 ? <p className="mt-3 text-sm text-slate-500">No se registraron participantes.</p> : <ul className="mt-3 space-y-3">{participants.map((participant) => <li key={participant.id} className="min-w-0 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="break-words font-semibold">{participant.usuario_nombre || 'Usuario no disponible'}</h4><span className="rounded-full border px-2 py-1 text-xs">{participant.activo === false ? 'Retirado' : 'Activo'}</span></div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><dt className="text-slate-500">Rol</dt><dd>{participant.rol_display || participant.rol_evento}</dd></div>
        <div><dt className="text-slate-500">Asignación origen</dt><dd>{participant.rol_display || participant.rol_evento}</dd></div>
        <div><dt className="text-slate-500">Convocatoria técnica</dt><dd>{(participant.convocatoria ?? participant.convocado) ? 'Convocado' : 'No convocado'}</dd></div>
        <div><dt className="text-slate-500">Asistencia</dt><dd>{attendanceLabel(participant.presente)}</dd></div>
        <div><dt className="text-slate-500">Fecha de asistencia</dt><dd>{dateLabel(participant.fecha_asistencia || participant.fecha_registro_asistencia)}</dd></div>
      </dl>
      <p className="mt-3 break-words"><span className="text-slate-500">Observaciones: </span>{participant.observaciones?.trim() || 'Sin observaciones'}</p>
      {participant.activo !== false && (canMutate || canAttend) && <div className="mt-3 flex flex-wrap gap-2">
        {canAttend && <Button variant="secondary" onClick={() => setDialog({ action: 'attendance', participant, submitting: false, fields: {}, error: '' })}>{participant.presente === null || participant.presente === undefined ? 'Registrar asistencia' : 'Corregir asistencia'}</Button>}
        {canMutate && <Button variant="outline" onClick={() => setDialog({ action: 'remove', participant, submitting: false, fields: {}, error: '' })}>Retirar participante</Button>}
      </div>}
    </li>)}</ul>}

    {dialog?.action === 'add' && <Modal title="Agregar participante" onClose={close}><form className="mt-4 space-y-4" onSubmit={submitAdd}>
      <label className="block text-sm">Buscar por nombre o rol<input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
      {catalog.loading && <p role="status">Cargando asignaciones activas…</p>}
      {catalog.error && <div role="alert"><p>{catalog.error}</p><Button type="button" className="mt-2" onClick={loadCandidates}>Reintentar</Button></div>}
      {!catalog.loading && !catalog.error && <label className="block text-sm">Asignación activa<select name="asignacion" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" defaultValue=""><option value="">Seleccione una persona</option>{filtered.map((item) => <option key={item.id} value={item.id}>{item.usuario_nombre || 'Usuario no disponible'} — {item.tipo_participacion_display || item.tipo_participacion_nombre || item.tipo_participacion}</option>)}</select></label>}
      {fieldMessage(dialog.fields, 'asignacion') && <p role="alert" className="text-sm text-red-600">{fieldMessage(dialog.fields, 'asignacion')}</p>}
      <FieldErrors fields={dialog.fields} except={['asignacion']} />
      {dialog.error && <p role="alert" className="text-sm text-red-600">{dialog.error}</p>}
      <div className="flex gap-2"><Button disabled={dialog.submitting || catalog.loading}>{dialog.submitting ? 'Procesando…' : 'Agregar participante'}</Button><Button type="button" variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div>
    </form></Modal>}

    {dialog?.action === 'remove' && <Modal title="Retirar participante" onClose={close}><div className="mt-4 space-y-4"><p>Confirma el retiro técnico de {dialog.participant.usuario_nombre || 'la persona seleccionada'}. El registro histórico se conservará.</p><FieldErrors fields={dialog.fields} />{dialog.error && <p role="alert" className="text-red-600">{dialog.error}</p>}<div className="flex gap-2"><Button disabled={dialog.submitting} onClick={() => mutate((signal) => postulacionesService.retirarParticipanteDefensa(defense.id, dialog.participant.id, signal))}>{dialog.submitting ? 'Procesando…' : 'Confirmar retiro'}</Button><Button variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div></div></Modal>}

    {dialog?.action === 'attendance' && <Modal title={dialog.participant.presente === null || dialog.participant.presente === undefined ? 'Registrar asistencia' : 'Corregir asistencia'} onClose={close}><form className="mt-4 space-y-4" onSubmit={submitAttendance}>
      <label className="block text-sm">Asistencia<select name="presente" defaultValue={dialog.participant.presente === false ? 'false' : 'true'} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="true">Presente</option><option value="false">Ausente</option></select></label>
      <label className="block text-sm">Observaciones<textarea name="observaciones" defaultValue={dialog.participant.observaciones || ''} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
      <FieldErrors fields={dialog.fields} />
      {dialog.error && <p role="alert" className="text-sm text-red-600">{dialog.error}</p>}
      <div className="flex gap-2"><Button disabled={dialog.submitting}>{dialog.submitting ? 'Procesando…' : 'Guardar asistencia'}</Button><Button type="button" variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div>
    </form></Modal>}
  </section>
}
