import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../components/crud/CrudShell'
import { Button } from '../../components/ui/button'
import { postulacionesService } from '../../services/postulacionesService'

const SUPPORTED_ROLES = new Set(['TUTOR', 'TRIBUNAL', 'DOCENTE_MODALIDAD', 'PRESIDENTE', 'SECRETARIO'])
const PRIVATE_THESIS_ROLES = new Set(['TRIBUNAL', 'DOCENTE_MODALIDAD'])
const MUTABLE_STATES = new Set(['PROGRAMADA', 'EN_CURSO', 'SUSPENDIDA'])
// Presentación normativa exclusiva de Proyecto de Grado / Defensa de Perfil.
// No participa en el cálculo de quórum ni en la habilitación de acciones.
const PROFILE_DEFENSE_TRIBUNAL_UI = { totalMembers: 3 }

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

export default function DefenseParticipants({ defense, canManage, onChanged, profileContext = false, quorum = null, reviewAttendanceRequest = 0 }) {
  const participants = useMemo(() => defense.participantes || [], [defense.participantes])
  const [dialog, setDialog] = useState(null)
  const [catalog, setCatalog] = useState({ rows: [], loading: false, error: '' })
  const [search, setSearch] = useState('')
  const [selectedAssignments, setSelectedAssignments] = useState(new Set())
  const [attendanceIssues, setAttendanceIssues] = useState({})
  const [retryingAttendance, setRetryingAttendance] = useState(null)
  const [selectedAttendance, setSelectedAttendance] = useState(new Set())
  const controller = useRef(null)

  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    controller.current?.abort()
    controller.current = null
    setDialog(null)
    setCatalog({ rows: [], loading: false, error: '' })
    setSearch('')
    setSelectedAssignments(new Set())
    setAttendanceIssues({})
    setRetryingAttendance(null)
    setSelectedAttendance(new Set())
  }, [defense.id])

  const close = () => {
    if (dialog?.submitting) return
    controller.current?.abort()
    controller.current = null
    setDialog(null)
  }

  const loadCandidates = async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setDialog({ action: 'add', submitting: false, fields: {}, error: '' })
    setSelectedAssignments(new Set())
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

  useEffect(() => {
    if (!profileContext || !canManage || !MUTABLE_STATES.has(defense.estado)) return undefined
    let active = true
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setCatalog({ rows: [], loading: true, error: '' })
    postulacionesService.obtenerAsignacionesCandidatas(defense.postulacion, request.signal)
      .then((data) => {
        if (!active || request.signal.aborted) return
        const activeIds = new Set(participants.filter((item) => item.activo !== false).map((item) => String(item.asignacion)))
        const rows = (data.results || data || []).filter((item) => (
          item.activo !== false
          && item.tipo_participacion === 'TRIBUNAL'
          && !activeIds.has(String(item.id))
        ))
        setCatalog({ rows, loading: false, error: '' })
      })
      .catch((error) => {
        if (active && !error.canceled && !request.signal.aborted) setCatalog({ rows: [], loading: false, error: error.message })
      })
    return () => {
      active = false
      request.abort()
    }
  }, [profileContext, canManage, defense.id, defense.estado, defense.postulacion, participants])

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
    event?.preventDefault()
    const markPresent = canAttend
    if (dialog?.submitting) return
    const assignments = catalog.rows.filter((item) => selectedAssignments.has(String(item.id)))
    if (!assignments.length) {
      setDialog((current) => ({ ...current, fields: { asignacion: ['Selecciona al menos una asignación activa.'] } }))
      return
    }
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setDialog((current) => ({ ...current, submitting: true, fields: {}, error: '', progress: { completed: 0, total: assignments.length }, results: [] }))
    const results = []
    const process = async () => {
      for (const assignment of assignments) {
        if (request.signal.aborted) return
        try {
          const participant = await postulacionesService.agregarParticipanteDefensa(defense.id, assignment.id, assignment.tipo_participacion, request.signal)
          if (markPresent) {
            try {
              await postulacionesService.registrarAsistenciaDefensa(defense.id, participant.id, true, '', request.signal)
              results.push({ id: String(assignment.id), participantId: participant.id, name: assignment.usuario_nombre || 'Usuario no disponible', status: 'success', message: 'Agregado como presente' })
            } catch (error) {
              if (request.signal.aborted || error.canceled) return
              results.push({ id: String(assignment.id), participantId: participant.id, name: assignment.usuario_nombre || 'Usuario no disponible', status: 'partial', message: error.message || 'No se pudo registrar la presencia' })
            }
          } else {
            results.push({ id: String(assignment.id), participantId: participant.id, name: assignment.usuario_nombre || 'Usuario no disponible', status: 'success', message: 'Agregado' })
          }
        } catch (error) {
          if (request.signal.aborted || error.canceled) return
          results.push({ id: String(assignment.id), name: assignment.usuario_nombre || 'Usuario no disponible', status: 'error', message: error.message || fieldMessage(error.fields, 'non_field_errors') || 'No se pudo agregar' })
        }
        setDialog((current) => ({ ...current, progress: { completed: results.length, total: assignments.length }, results: [...results] }))
      }
      if (request.signal.aborted) return
      await onChanged(request.signal)
      const failed = results.filter((result) => result.status === 'error')
      const partial = results.filter((result) => result.status === 'partial' && result.participantId)
      if (partial.length) {
        setAttendanceIssues((current) => ({ ...current, ...Object.fromEntries(partial.map((result) => [String(result.participantId), result.message])) }))
      }
      if (!failed.length && !partial.length) {
        close()
        return
      }
      if (!failed.length) {
        controller.current = null
        setDialog(null)
        return
      }
      setSelectedAssignments(new Set(failed.map((result) => result.id)))
      setDialog((current) => ({ ...current, submitting: false, progress: null, results: [...results], error: 'Algunas incorporaciones no pudieron completarse.' }))
    }
    process().catch((error) => {
      if (!request.signal.aborted) setDialog((current) => ({ ...current, submitting: false, progress: null, results: [...results], error: error.message || 'No se pudo completar la incorporación.' }))
    })
  }

  const submitAttendance = (event) => {
    event.preventDefault()
    const value = event.currentTarget.elements.presente.value
    const observations = event.currentTarget.elements.observaciones.value.trim()
    mutate((signal) => postulacionesService.registrarAsistenciaDefensa(defense.id, dialog.participant.id, value === 'true', observations, signal))
  }

  const pendingAttendance = participants.filter((participant) => participant.activo !== false
    && (participant.presente === null || participant.presente === undefined))

  useEffect(() => {
    if (!reviewAttendanceRequest || !pendingAttendance.length || dialog?.action === 'multiple-attendance') return
    openMultipleAttendance()
  }, [reviewAttendanceRequest, pendingAttendance.length, dialog?.action])

  const openMultipleAttendance = () => {
    setSelectedAttendance(new Set(pendingAttendance.map((participant) => String(participant.id))))
    setDialog({ action: 'multiple-attendance', participants: pendingAttendance, submitting: false, fields: {}, error: '', results: [] })
  }

  const toggleAttendanceParticipant = (participantId) => {
    if (dialog?.submitting) return
    setSelectedAttendance((current) => {
      const next = new Set(current)
      const id = String(participantId)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitMultipleAttendance = (event) => {
    event.preventDefault()
    if (dialog?.submitting) return
    const previousResults = dialog?.results || []
    const failedIds = new Set(previousResults.filter((result) => result.status === 'error').map((result) => result.id))
    const retryOnly = failedIds.size > 0
    const selected = (dialog?.participants || []).filter((participant) => (
      retryOnly ? failedIds.has(String(participant.id)) : selectedAttendance.has(String(participant.id))
    ))
    if (!selected.length) {
      setDialog((current) => ({ ...current, fields: { participante: ['Selecciona al menos una persona pendiente.'] } }))
      return
    }
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setDialog((current) => ({ ...current, submitting: true, fields: {}, error: '' }))
    const results = previousResults.filter((result) => result.status === 'success')
    const process = async () => {
      for (const participant of selected) {
        if (request.signal.aborted) return
        try {
          await postulacionesService.registrarAsistenciaDefensa(defense.id, participant.id, true, '', request.signal)
          results.push({ id: String(participant.id), status: 'success', message: 'Presente' })
        } catch (error) {
          if (request.signal.aborted || error.canceled) return
          results.push({ id: String(participant.id), status: 'error', message: error.message || 'No se pudo registrar la presencia.' })
        }
        setDialog((current) => ({ ...current, results: [...results] }))
      }
      if (request.signal.aborted) return
      await onChanged(request.signal)
      const failed = results.filter((result) => result.status === 'error')
      if (!failed.length) {
        controller.current = null
        setDialog(null)
        return
      }
      setSelectedAttendance(new Set(failed.map((result) => result.id)))
      controller.current = null
      setDialog((current) => ({ ...current, submitting: false, results: [...results], error: 'Algunas asistencias no pudieron registrarse.' }))
    }
    process().catch((error) => {
      if (!request.signal.aborted) setDialog((current) => ({ ...current, submitting: false, results: [...results], error: error.message || 'Las asistencias se registraron, pero no se pudo refrescar el estado de la defensa.' }))
    })
  }

  const canMutate = canManage && MUTABLE_STATES.has(defense.estado)
  const canAttend = canManage && defense.estado === 'EN_CURSO'
  const incorporatedTribunals = participants.filter((item) => item.activo !== false && item.rol_evento === 'TRIBUNAL').length
  const presentTribunals = Number(quorum?.conteos?.TRIBUNAL ?? 0)
  const missingTribunals = Number(quorum?.faltantes?.TRIBUNAL ?? 0)
  const minimumTribunalsForQuorum = quorum
    ? presentTribunals + missingTribunals
    : null
  const tribunalComplete = incorporatedTribunals >= PROFILE_DEFENSE_TRIBUNAL_UI.totalMembers
  const quorumValid = quorum?.valido === true
  const eligibleTribunals = profileContext ? catalog.rows.filter((item) => item.tipo_participacion === 'TRIBUNAL') : []
  const selectedCount = selectedAssignments.size
  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selectedAssignments.has(String(item.id)))
  const toggleAssignment = (assignment) => {
    if (dialog?.submitting) return
    const id = String(assignment.id)
    setSelectedAssignments((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleVisibleAssignments = () => {
    if (dialog?.submitting) return
    setSelectedAssignments((current) => {
      const next = new Set(current)
      if (allVisibleSelected) filtered.forEach((item) => next.delete(String(item.id)))
      else filtered.forEach((item) => next.add(String(item.id)))
      return next
    })
  }
  const resultById = new Map((dialog?.results || []).map((result) => [result.id, result]))
  const selectedAttendanceCount = selectedAttendance.size
  const multipleAttendanceHasErrors = (dialog?.results || []).some((result) => result.status === 'error')

  const addDirectly = (assignment) => {
    if (!canAttend) {
      setDialog({ action: 'direct-add', assignment, submitting: false, fields: {}, error: '' })
      mutate((signal) => postulacionesService.agregarParticipanteDefensa(defense.id, assignment.id, assignment.tipo_participacion, signal))
      return
    }
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setDialog({ action: 'direct-present', assignment, submitting: true, fields: {}, error: '' })
    const process = async () => {
      let participant
      try {
        participant = await postulacionesService.agregarParticipanteDefensa(defense.id, assignment.id, assignment.tipo_participacion, request.signal)
        await postulacionesService.registrarAsistenciaDefensa(defense.id, participant.id, true, '', request.signal)
      } catch (error) {
        if (request.signal.aborted || error.canceled) return
        if (!participant) {
          setDialog({ action: 'direct-present', assignment, submitting: false, fields: error.fields || {}, error: error.message || 'No se pudo incorporar al participante.' })
          return
        }
        await onChanged(request.signal)
        setAttendanceIssues((current) => ({ ...current, [String(participant.id)]: error.message || 'No se pudo registrar la presencia' }))
        controller.current = null
        setDialog(null)
        return
      }
      if (!request.signal.aborted) {
        await onChanged(request.signal)
        controller.current = null
        setDialog(null)
      }
    }
    process().catch((error) => {
      if (!request.signal.aborted) setDialog({ action: 'direct-present', assignment, submitting: false, fields: error.fields || {}, error: error.message || 'No se pudo completar la incorporación.' })
    })
  }

  const retryAttendance = async (participant) => {
    if (retryingAttendance) return
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setRetryingAttendance(participant.id)
    try {
      await postulacionesService.registrarAsistenciaDefensa(defense.id, participant.id, true, '', request.signal)
      if (!request.signal.aborted) {
        setAttendanceIssues((current) => {
          const next = { ...current }
          delete next[String(participant.id)]
          return next
        })
        await onChanged(request.signal)
      }
    } catch (error) {
      if (!error.canceled && !request.signal.aborted) setAttendanceIssues((current) => ({ ...current, [String(participant.id)]: error.message || 'No se pudo registrar la presencia' }))
    } finally {
      setRetryingAttendance(null)
    }
  }

  return <section aria-labelledby="participantes-defensa-title">
    {profileContext && <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" aria-label="Resumen operativo de la defensa">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div><dt className="font-medium text-slate-500">Tribunal</dt><dd className="mt-1 font-semibold">{tribunalComplete && <span className="mr-1 text-emerald-700 dark:text-emerald-300">✓</span>}{incorporatedTribunals} de {PROFILE_DEFENSE_TRIBUNAL_UI.totalMembers} incorporados</dd></div>
        <div><dt className="font-medium text-slate-500">Asistencia</dt><dd className="mt-1 font-semibold">{quorumValid && <span className="mr-1 text-emerald-700 dark:text-emerald-300">✓</span>}{presentTribunals} {presentTribunals === 1 ? 'presente' : 'presentes'}</dd></div>
        {quorum && <div><dt className="font-medium text-slate-500">Quórum</dt><dd className={quorumValid ? 'mt-1 font-semibold text-emerald-700 dark:text-emerald-300' : 'mt-1 font-semibold'}>{quorumValid ? '✓ Válido' : 'Pendiente'}</dd><dd className="mt-1 text-slate-600 dark:text-slate-300">Mínimo requerido: {minimumTribunalsForQuorum}</dd></div>}
      </dl>
      {!quorumValid && missingTribunals > 0 && <p className="mt-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">{missingTribunals === 1 ? 'Falta 1 presencia' : `Faltan ${missingTribunals} presencias`} para alcanzar el quórum.</p>}
      {!quorumValid && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Se requiere quórum válido para registrar evaluaciones y finalizar la defensa.</p>}
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="participantes-defensa-title" className="text-lg font-bold">{profileContext ? 'Participantes de la defensa' : 'Participantes'}</h3>
      <div className="flex flex-wrap gap-2">{canAttend && pendingAttendance.length > 0 && <Button onClick={openMultipleAttendance}>Registrar asistencia múltiple</Button>}{canMutate && <Button variant="secondary" onClick={loadCandidates}>Agregar participante</Button>}</div>
    </div>
    {false && <aside role="note" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950">La incorporación como participante no sustituye memorando, designación ni convocatoria institucional formal.</aside>}
    {profileContext && canMutate && <section className="mt-4" aria-labelledby="tribunales-pendientes-title">
      <h4 id="tribunales-pendientes-title" className="font-semibold">Pendientes de incorporar</h4>
      {catalog.loading && <p role="status" className="mt-2 text-sm">Consultando actores elegibles…</p>}
      {!catalog.loading && catalog.error && <p role="alert" className="mt-2 text-sm text-red-600">{catalog.error}</p>}
      {dialog?.action === 'direct-present' && dialog.error && <p role="alert" className="mt-2 text-sm text-red-600">{dialog.error}</p>}
      {!catalog.loading && !catalog.error && eligibleTribunals.length === 0 && <p className="mt-2 text-sm text-slate-500">No hay tribunales activos pendientes de incorporación.</p>}
      {!catalog.loading && !catalog.error && eligibleTribunals.length > 0 && <ul className="mt-2 space-y-2">{eligibleTribunals.map((assignment) => <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 text-sm dark:bg-slate-950">
        <div><p className="font-semibold">{assignment.usuario_nombre || 'Usuario no disponible'}</p><p className="text-slate-500">Tribunal asignado · No incorporado</p></div>
        <Button disabled={dialog?.submitting} onClick={() => addDirectly(assignment)}>{dialog?.submitting && String(dialog.assignment?.id) === String(assignment.id) ? 'Agregando…' : 'Agregar a la defensa'}</Button>
      </li>)}</ul>}
    </section>}
    {participants.length === 0 ? <p className="mt-3 text-sm text-slate-500">No se registraron participantes.</p> : <ul className="mt-3 divide-y">{participants.map((participant) => {
      const roleLabel = participant.rol_display || participant.rol_evento || 'Rol no registrado'
      const attendance = participant.presente === null || participant.presente === undefined ? 'Asistencia pendiente' : attendanceLabel(participant.presente)
      const observation = participant.observaciones?.trim()
      const attendanceDate = participant.fecha_asistencia || participant.fecha_registro_asistencia
      const statusLine = profileContext
        ? `${roleLabel} · Incorporado · ${attendance}`
        : `${roleLabel} · ${(participant.convocatoria ?? participant.convocado) ? 'Convocado' : 'No convocado'} · ${attendance}`
      return <li key={participant.id} className="min-w-0 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words font-semibold">{participant.usuario_nombre || 'Usuario no disponible'}</h4>{participant.activo !== false && <p className="mt-1 text-slate-500">{statusLine}</p>}{participant.activo === false && <p className="mt-1 font-semibold text-amber-700"><span>{roleLabel} · Retirado</span>{participant.presente !== null && participant.presente !== undefined && <> · <span>{attendanceLabel(participant.presente)}</span></>}</p>}</div>{participant.activo !== false && (canMutate || canAttend) && <div className="flex flex-wrap gap-2">
        {canAttend && <Button variant="secondary" onClick={() => setDialog({ action: 'attendance', participant, submitting: false, fields: {}, error: '' })}>{participant.presente === null || participant.presente === undefined ? 'Registrar asistencia' : 'Corregir asistencia'}</Button>}
        {canMutate && <Button variant="outline" onClick={() => setDialog({ action: 'remove', participant, submitting: false, fields: {}, error: '' })}>Retirar participante</Button>}
      </div>}</div>
      {attendanceIssues[String(participant.id)] && <div role="alert" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950"><p className="font-semibold">Participante incorporado, pero no se pudo registrar su presencia.</p><p className="mt-1">{attendanceIssues[String(participant.id)]}</p><Button className="mt-2" variant="secondary" disabled={retryingAttendance === participant.id} onClick={() => retryAttendance(participant)}>{retryingAttendance === participant.id ? 'Reintentando…' : 'Reintentar presencia'}</Button></div>}
      {(attendanceDate || observation) && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        {attendanceDate && <span>Asistencia: {dateLabel(attendanceDate)}</span>}
        {observation && <span><span className="sr-only">{observation}</span>Observaciones: {observation}</span>}
      </div>}
    </li>})}</ul>}

    {dialog?.action === 'add' && <Modal title="Agregar participante" onClose={close}><form className="mt-4 space-y-4" onSubmit={submitAdd}>
      <label className="block text-sm">Buscar por nombre o rol<input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
      {catalog.loading && <p role="status">Cargando asignaciones activas…</p>}
      {catalog.error && <div role="alert"><p>{catalog.error}</p><Button type="button" className="mt-2" onClick={loadCandidates}>Reintentar</Button></div>}
      {!catalog.loading && !catalog.error && <fieldset disabled={dialog.submitting} className="space-y-1"><legend className="block text-sm font-medium">Candidatos para incorporar</legend>{filtered.length > 1 && <label className="flex items-center gap-2 border-b py-2 text-sm"><input type="checkbox" aria-label="Seleccionar todos los resultados visibles" checked={allVisibleSelected} onChange={toggleVisibleAssignments} />Seleccionar todos los resultados visibles</label>}{filtered.length === 0 && <p className="text-sm text-slate-500">No hay asignaciones activas disponibles.</p>}{filtered.map((item) => { const result = resultById.get(String(item.id)); const roleLabel = item.tipo_participacion_display || item.tipo_participacion_nombre || item.tipo_participacion; const roleDetail = item.orden_cargo ? `${roleLabel} · Orden ${item.orden_cargo}` : roleLabel; return <label key={item.id} className="flex items-start gap-3 border-b py-2 text-sm"><input type="checkbox" aria-label={`${item.usuario_nombre || 'Usuario no disponible'} — ${roleLabel}`} checked={selectedAssignments.has(String(item.id))} onChange={() => toggleAssignment(item)} /> <span className="min-w-0"><span className="block break-words font-semibold">{item.usuario_nombre || 'Usuario no disponible'}</span><span className="block text-slate-500">{roleDetail}</span>{result && <span className={result.status === 'success' ? 'block text-emerald-700' : 'block text-red-700'}>{result.status === 'success' ? '✓ ' : '✕ '}{result.message}</span>}</span></label> })}</fieldset>}
      {selectedCount > 0 && <p className="text-sm font-semibold">{selectedCount} {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}</p>}
      {dialog.progress && <p role="status" className="text-sm">Agregando {Math.min(dialog.progress.completed + 1, dialog.progress.total)} de {dialog.progress.total}…</p>}
      {fieldMessage(dialog.fields, 'asignacion') && <p role="alert" className="text-sm text-red-600">{fieldMessage(dialog.fields, 'asignacion')}</p>}
      <FieldErrors fields={dialog.fields} except={['asignacion']} />
      {dialog.error && <p role="alert" className="text-sm text-red-600">{dialog.error}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={dialog.submitting || catalog.loading || selectedCount === 0}>{dialog.submitting ? 'Procesando…' : selectedCount === 0 ? 'Agregar participante' : `Agregar ${selectedCount} ${selectedCount === 1 ? 'participante' : 'participantes'}`}</Button><Button type="button" variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div>
    </form></Modal>}

    {dialog?.action === 'remove' && <Modal title="Retirar participante" onClose={close}><div className="mt-4 space-y-4"><p>Confirma el retiro técnico de {dialog.participant.usuario_nombre || 'la persona seleccionada'}. El registro histórico se conservará.</p><FieldErrors fields={dialog.fields} />{dialog.error && <p role="alert" className="text-red-600">{dialog.error}</p>}<div className="flex gap-2"><Button disabled={dialog.submitting} onClick={() => mutate((signal) => postulacionesService.retirarParticipanteDefensa(defense.id, dialog.participant.id, signal))}>{dialog.submitting ? 'Procesando…' : 'Confirmar retiro'}</Button><Button variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div></div></Modal>}

    {dialog?.action === 'attendance' && <Modal title={dialog.participant.presente === null || dialog.participant.presente === undefined ? 'Registrar asistencia' : 'Corregir asistencia'} onClose={close}><form className="mt-4 space-y-4" onSubmit={submitAttendance}>
      <label className="block text-sm">Asistencia<select name="presente" defaultValue={dialog.participant.presente === false ? 'false' : 'true'} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="true">Presente</option><option value="false">Ausente</option></select></label>
      <label className="block text-sm">Observaciones<textarea name="observaciones" defaultValue={dialog.participant.observaciones || ''} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
      <FieldErrors fields={dialog.fields} />
      {dialog.error && <p role="alert" className="text-sm text-red-600">{dialog.error}</p>}
      <div className="flex gap-2"><Button disabled={dialog.submitting}>{dialog.submitting ? 'Procesando…' : 'Guardar asistencia'}</Button><Button type="button" variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div>
    </form></Modal>}

    {dialog?.action === 'multiple-attendance' && <Modal title="Registrar asistencia múltiple" onClose={close}><form className="mt-4 space-y-4" onSubmit={submitMultipleAttendance}>
      <div><p className="font-semibold">{defense.tipo_display || defense.tipo_evento}</p><p className="mt-1 text-sm text-slate-500">Confirma únicamente a quienes están presentes. Las personas desmarcadas conservarán su asistencia pendiente.</p></div>
      <fieldset disabled={dialog.submitting} className="space-y-2"><legend className="sr-only">Participantes con asistencia pendiente</legend>{dialog.participants.map((participant) => { const id = String(participant.id); const result = resultById.get(id); const roleLabel = participant.rol_display || participant.rol_evento || 'Rol no registrado'; return <label key={participant.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" aria-label={`${participant.usuario_nombre || 'Usuario no disponible'} — ${roleLabel}`} checked={selectedAttendance.has(id)} disabled={result?.status === 'success' || dialog.submitting} onChange={() => toggleAttendanceParticipant(participant.id)} /><span className="min-w-0"><span className="block break-words font-semibold">{participant.usuario_nombre || 'Usuario no disponible'}</span><span className="block text-slate-500">{roleLabel}</span>{result && <span className={result.status === 'success' ? 'mt-1 block font-semibold text-emerald-700' : 'mt-1 block font-semibold text-red-700'}>{result.status === 'success' ? 'Presente' : `Error · ${result.message}`}</span>}{!result && !selectedAttendance.has(id) && <span className="mt-1 block text-slate-500">Asistencia pendiente</span>}</span></label> })}</fieldset>
      <p className="text-sm font-semibold">{selectedAttendanceCount} {selectedAttendanceCount === 1 ? 'seleccionado' : 'seleccionados'}</p>
      {fieldMessage(dialog.fields, 'participante') && <p role="alert" className="text-sm text-red-600">{fieldMessage(dialog.fields, 'participante')}</p>}
      {dialog.error && <p role="alert" className="text-sm text-red-600">{dialog.error}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={dialog.submitting || selectedAttendanceCount === 0}>{dialog.submitting ? 'Registrando asistentes…' : multipleAttendanceHasErrors ? 'Reintentar fallidos' : 'Confirmar asistentes'}</Button><Button type="button" variant="secondary" disabled={dialog.submitting} onClick={close}>Cancelar</Button></div>
    </form></Modal>}
  </section>
}
