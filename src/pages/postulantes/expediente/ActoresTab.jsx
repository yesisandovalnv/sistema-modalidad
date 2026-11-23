import { useCallback, useEffect, useState } from 'react'
import { Modal } from '../../../components/crud/CrudShell'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Pagination } from '../../../components/reports/ReportComponents'
import { postulacionesService } from '../../../services/postulacionesService'
import { ViewToggle } from '../../../components/ui/ViewToggle'
import { readStoredView, storeView } from '../../../lib/viewPreference'
import { Select } from '../../../components/ui/Select'
import { getActiveTribunalComposition } from '../tribunalComposition'
import { MemorandumPublicationSection, MemorandumStatus } from './DecisionesAcademicas'
import { Info, SectionError, StatusBadge } from './compartidos'
import { ASSIGNMENT_TYPES, assignmentTypeLabel, formatStatus, initialsOf } from './reglas'

export function ActorsCard({ noStageLabel = 'Sin etapa asociada', active, historical, activePage, historicalPage, onActivePage, onHistoricalPage, onRetryActive, onRetryHistorical, canManage, management, memorandumContract, memorandums, onRetryMemorandums, onManage }) {
  const positions = management?.posiciones || []
  const occupiedCount = positions.filter((position) => position.estado_ocupacion === 'ASIGNADA').length
  const activeCount = active.data?.count || 0
  const [view, setView] = useState(() => readStoredView('sm_actores_vista'))
  const chooseView = (next) => { setView(next); storeView('sm_actores_vista', next) }
  return (
    <Card className="expediente-card overflow-hidden" aria-labelledby="actores-title">
      <h2 id="actores-title" className="text-xl font-bold">Gestión de actores</h2>
      <p className="mt-1 text-sm text-slate-500">{positions.length > 0
        ? `Puestos de la etapa actual: ${occupiedCount} de ${positions.length} ocupados`
        : `${activeCount} actores vigentes`}</p>
      <div className="expediente-card-action">
        <ViewToggle view={view} onChange={chooseView} />
        {canManage && <Button onClick={onManage}>Gestionar actores</Button>}
      </div>
      {memorandumContract && <section className="expediente-memo" aria-labelledby="memorandum-vigente-title">
        <h3 id="memorandum-vigente-title" className="font-semibold">{memorandumContract.titulo || 'Memorándum oficial de designación'}</h3>
        <MemorandumStatus memorandums={memorandums} onRetry={onRetryMemorandums} />
      </section>}
      <div className="mt-6 grid gap-6">
        <ActorGroup view={view} noStageLabel={noStageLabel} title="Participación actual" stateLabel="Vigente" actors={active} page={activePage} onPage={onActivePage} onRetry={onRetryActive} empty="No hay participaciones vigentes registradas." />
        <ActorGroup view={view} noStageLabel={noStageLabel} title="Participaciones anteriores" stateLabel="Anterior" actors={historical} page={historicalPage} onPage={onHistoricalPage} onRetry={onRetryHistorical} empty="No hay participaciones anteriores registradas." />
      </div>
    </Card>
  )
}

// Alcance del puesto en palabras: "Para esta etapa" / "Para toda la postulación". El orden solo se
// muestra si el nombre del puesto no lo dice ya ("Tribunal 1").
function positionScopeLabel(position) {
  const scope = { ETAPA: 'Para esta etapa', POSTULACION: 'Para toda la postulación' }[position.ambito] || formatStatus(position.ambito)
  const order = position.orden_cargo != null && !String(position.nombre || '').includes(String(position.orden_cargo)) ? ` · Orden ${position.orden_cargo}` : ''
  return `${scope}${order}`
}

export function ActorManagementDialog({ state, postulacion, management, selectionPresentation, stageName, memorandumContract, memorandumSeguimientoEtapa, memorandums, canPublishMemorandum, onMemorandumPublished, onRetryMemorandums, onSubmit, onFinalize, onClose }) {
  const positions = management?.posiciones || []
  const [candidateStatuses, setCandidateStatuses] = useState({})
  const [selections, setSelections] = useState({})
  const [candidateRevision, setCandidateRevision] = useState(0)
  const [finishPosition, setFinishPosition] = useState(null)
  const [finishObservations, setFinishObservations] = useState('')
  const [finishError, setFinishError] = useState('')
  const [memorandumSubmitting, setMemorandumSubmitting] = useState(false)
  const reportCandidateStatus = useCallback((positionKey, status) => {
    setCandidateStatuses((current) => {
      const previous = current[positionKey]
      if (previous?.loading === status.loading && previous?.error === status.error
        && previous?.invalidSelection === status.invalidSelection) return current
      return { ...current, [positionKey]: status }
    })
  }, [])

  const assignedSelections = Object.fromEntries(positions
    .filter((position) => position.estado_ocupacion === 'ASIGNADA')
    .map((position) => [position.clave, { candidateId: position.asignacion_actual_detalle?.usuario?.id }]))
  const draftConflicts = findIdentityDraftConflicts(positions, selections, selectionPresentation)
  const draftError = draftConflicts.length > 0
    ? `La misma persona está seleccionada en ${draftConflicts[0][0].position.nombre} y ${draftConflicts[0][1].position.nombre}. Cambia una selección antes de guardar.`
    : ''
  const jobs = (draftConflicts.length > 0 ? [] : positions).flatMap((position) => {
    const result = state.results?.[position.clave]
    const action = position.estado_ocupacion === 'ASIGNADA' ? 'REEMPLAZAR' : 'ASIGNAR'
    const selected = selections[position.clave]
    if (!selected?.candidateId || result?.state === 'SUCCESS' || position.habilitada === false
      || selected.eligible === false || selected.selectable === false || candidateStatuses[position.clave]?.invalidSelection
      || findConflictingDraft(position, selected.candidateId, positions.filter((other) => positionsShareTribunalContext(position, other) || isPreventiveActorConflict(position, other, selectionPresentation)), assignedSelections, selectionPresentation)
      || !position.acciones_permitidas?.includes(action)) return []
    const payload = {
      usuario: Number(selected.candidateId),
      tipo_participacion: position.tipo_participacion,
      observaciones: '',
    }
    if (position.orden_cargo !== null && position.orden_cargo !== undefined) {
      payload.orden_cargo = Number(position.orden_cargo)
    }
    if (position.ambito === 'ETAPA' && position.seguimiento_etapa != null) {
      payload.seguimiento_etapa = Number(position.seguimiento_etapa)
    }
    return [{ action, position, payload }]
  })
  const hasFailures = Object.values(state.results || {}).some((result) => result.state === 'ERROR')
  const candidatesBusy = jobs.some(({ position }) => candidateStatuses[position.clave]?.loading || candidateStatuses[position.clave]?.error)
  const hasPendingAssignments = Object.values(selections).some((selection) => Boolean(selection?.candidateId))
  const hasMemorandumSection = Boolean(memorandumContract)

  const saveAssignments = async (event) => {
    event.preventDefault()
    if (state.submitting || candidatesBusy || jobs.length === 0) return
    const outcomes = await onSubmit(jobs)
    setSelections((current) => {
      const next = { ...current }
      jobs.forEach((job) => {
        if (outcomes?.[job.position.clave] === 'SUCCESS') delete next[job.position.clave]
      })
      return next
    })
    if (Object.keys(outcomes || {}).length > 0) setCandidateRevision((current) => current + 1)
  }

  const finalize = async (position) => {
    if (state.submitting) return
    const outcomes = await onFinalize(position, finishObservations.trim())
    if (outcomes?.[position.clave] === 'SUCCESS') {
      setFinishPosition(null)
      setFinishObservations('')
      setFinishError('')
    } else {
      setFinishError(outcomes?.[position.clave]?.message || 'No se pudo finalizar la asignación.')
    }
  }

  const modalTitle = stageName ? `Gestionar actores — ${stageName}` : 'Gestionar actores'
  const close = state.submitting || memorandumSubmitting ? () => {} : onClose
  return <Modal title={modalTitle} onClose={close}>
    <form className="actor-manage-form mt-4 grid gap-4" onSubmit={saveAssignments} noValidate>
      {!stageName && management?.contexto?.codigo_etapa && <p className="text-sm text-slate-500">Etapa: {formatStatus(management.contexto.codigo_etapa)}</p>}
      {positions.length === 0 && <p role="status" className="text-sm text-slate-500">No hay posiciones de actores declaradas para este contexto.</p>}
      <div className="grid gap-3">
        {positions.map((position) => {
          const result = state.results?.[position.clave]
          const assigned = position.estado_ocupacion === 'ASIGNADA'
          const actions = position.acciones_permitidas || []
          const canAssign = !assigned && position.habilitada !== false && actions.includes('ASIGNAR')
          const canReplace = assigned && position.habilitada !== false && actions.includes('REEMPLAZAR')
          const showSelector = (canAssign || canReplace) && result?.state !== 'SUCCESS'
          const detail = position.asignacion_actual_detalle
          const currentPerson = detail?.usuario?.nombre || 'Persona asignada'
          const blocked = position.habilitada === false || Boolean(position.bloqueo)
          return <section key={position.clave} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="font-semibold">{position.nombre}{position.obligatoriedad ? ' *' : ''}</h3>
                <p className="mt-1 text-sm text-slate-500">{positionScopeLabel(position)}</p>
              </div>
              <StatusBadge value={formatStatus(blocked && !assigned ? 'BLOQUEADA' : position.estado_ocupacion)} positive={assigned} compact />
            </div>
            {assigned && <p className="mt-3 text-sm">Asignada a <strong>{currentPerson}</strong></p>}
            {position.bloqueo?.mensaje && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{position.bloqueo.mensaje}</p>}
            {showSelector && <EligibleActorCandidates
              postulacion={postulacion}
              position={position}
              positions={positions}
              drafts={selections}
              assignedSelections={assignedSelections}
              selectionPresentation={selectionPresentation}
              candidateRevision={candidateRevision}
              action={canReplace ? 'REEMPLAZAR' : 'ASIGNAR'}
              selected={selections[position.clave] || null}
              disabled={state.submitting}
              onSelect={(candidate) => {
                setSelections((current) => {
                  const next = { ...current }
                  if (candidate) {
                    next[position.clave] = {
                      candidateId: String(candidate.id),
                      label: candidate.nombre_completo || candidate.username,
                      eligible: candidate.elegible !== false,
                      selectable: candidate.preventiveSelectionAllowed !== false,
                      positionKey: position.clave,
                    }
                  } else {
                    delete next[position.clave]
                  }
                  return next
                })
              }}
              onStatusChange={reportCandidateStatus}
            />}
            {result?.state === 'SUCCESS' && <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Guardado</p>}
            {result?.state === 'ERROR' && <p role="alert" className="mt-2 text-sm text-red-600">{result.message}</p>}
            {assigned && actions.includes('FINALIZAR') && result?.state !== 'SUCCESS' && <div className="mt-3">
              {finishPosition === position.clave ? <div className="grid gap-3">
                <label className="text-sm">Motivo u observación<textarea value={finishObservations} onChange={(event) => setFinishObservations(event.target.value)} disabled={state.submitting} className="mt-1 min-h-20 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
                {finishError && <p role="alert" className="text-sm text-red-600">{finishError}</p>}
                <div className="flex gap-3"><Button type="button" disabled={state.submitting} onClick={() => finalize(position)}>Confirmar finalización</Button><Button type="button" variant="secondary" disabled={state.submitting} onClick={() => { setFinishPosition(null); setFinishError('') }}>Cancelar</Button></div>
              </div> : <Button type="button" variant="secondary" disabled={state.submitting} onClick={() => { setFinishPosition(position.clave); setFinishObservations(''); setFinishError('') }}>Finalizar asignación</Button>}
            </div>}
          </section>
        })}
      </div>
      {draftError && <p role="alert" className="text-sm text-red-600">{draftError}</p>}
      {hasMemorandumSection && <div className="flex flex-wrap gap-3">
        {jobs.length > 0 && <Button type="submit" disabled={state.submitting || candidatesBusy}>{state.submitting ? 'Guardando…' : hasFailures ? 'Reintentar pendientes' : 'Guardar asignaciones'}</Button>}
      </div>}
      {hasMemorandumSection && <MemorandumPublicationSection
        postulacion={postulacion}
        seguimientoEtapa={memorandumSeguimientoEtapa}
        contract={memorandumContract}
        memorandums={memorandums}
        canPublish={canPublishMemorandum}
        disabled={state.submitting || memorandumSubmitting}
        hasPendingAssignments={hasPendingAssignments}
        onPublished={onMemorandumPublished}
        onPublishingChange={setMemorandumSubmitting}
        onRetry={onRetryMemorandums}
      />}
      <div className="flex flex-wrap gap-3">
        {!hasMemorandumSection && jobs.length > 0 && <Button type="submit" disabled={state.submitting || candidatesBusy}>{state.submitting ? 'Guardando…' : hasFailures ? 'Reintentar pendientes' : 'Guardar asignaciones'}</Button>}
        <Button type="button" variant="secondary" disabled={state.submitting || memorandumSubmitting} onClick={close}>Cerrar</Button>
      </div>
    </form>
  </Modal>
}

function hasUniqueIdentityRestriction(position) {
  const restriction = position.restriccion_identidad
  return restriction?.unica_persona === true && typeof restriction.grupo === 'string' && restriction.grupo.trim() !== ''
}

function restrictionsShareIdentityGroup(first, second) {
  return hasUniqueIdentityRestriction(first)
    && hasUniqueIdentityRestriction(second)
    && first.restriccion_identidad.grupo === second.restriccion_identidad.grupo
}

function positionsShareTribunalContext(first, second) {
  return first.tipo_participacion === 'TRIBUNAL' && second.tipo_participacion === 'TRIBUNAL'
    && first.ambito === second.ambito
    && ((first.ambito === 'ETAPA' && first.seguimiento_etapa != null && second.seguimiento_etapa != null
      && String(first.seguimiento_etapa) === String(second.seguimiento_etapa))
      || (first.ambito === 'POSTULACION' && first.seguimiento_etapa === null && second.seguimiento_etapa === null))
}

function isPreventiveActorConflict(position, other, presentation) {
  if (presentation?.preventOccupiedDirectedSecretary && position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1'
    && position.tipo_participacion === 'DOCENTE_MODALIDAD' && position.ambito === 'ETAPA'
    && String(position.seguimiento_etapa) === String(presentation.seguimientoEtapa)) {
    return (other.clave === 'TUTOR_TRABAJO_DIRIGIDO_1' && other.tipo_participacion === 'TUTOR'
      && other.ambito === 'POSTULACION' && other.seguimiento_etapa === null)
      || (other.tipo_participacion === 'TRIBUNAL' && /^TRIBUNAL_PROPUESTA_TD_[123]$/.test(other.clave)
        && other.ambito === 'ETAPA' && presentation.profileSeguimiento != null
        && String(other.seguimiento_etapa) === String(presentation.profileSeguimiento))
  }
  return presentation?.preventTribunalForTutor === true
    && position.clave === 'TUTOR_TRABAJO_DIRIGIDO_1'
    && position.tipo_participacion === 'TUTOR' && position.ambito === 'POSTULACION'
    && position.seguimiento_etapa === null
    && other.tipo_participacion === 'TRIBUNAL' && other.ambito === 'ETAPA'
    && other.seguimiento_etapa != null
}

function positionsHaveIdentityConflict(first, second, selectionPresentation) {
  const blocksOccupation = (position, other) => {
    const rule = position.ocupacion_actor
    return rule?.aplica === true
      && (!rule.relevantes?.length || rule.relevantes.includes(other.tipo_participacion))
  }
  return selectionPresentation?.blockOtherPositions === true
    || positionsShareTribunalContext(first, second)
    || isPreventiveActorConflict(first, second, selectionPresentation)
    || restrictionsShareIdentityGroup(first, second)
    || blocksOccupation(first, second)
    || blocksOccupation(second, first)
}

function findSelectedDraft(position, candidateId, positions, drafts) {
  if (!candidateId) return null
  return positions.find((otherPosition) => (
    otherPosition.clave !== position.clave
    && String(drafts[otherPosition.clave]?.candidateId || '') === String(candidateId)
  )) || null
}

function findConflictingDraft(position, candidateId, positions, drafts, selectionPresentation) {
  if (!candidateId) return null
  if (((selectionPresentation?.preventTribunalForTutor && position.clave === 'TUTOR_TRABAJO_DIRIGIDO_1')
    || (selectionPresentation?.preventOccupiedDirectedSecretary && position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1'))
    && String(position.asignacion_actual_detalle?.usuario?.id) === String(candidateId)) return null
  return positions.find((otherPosition) => (
    otherPosition.clave !== position.clave
    && positionsHaveIdentityConflict(position, otherPosition, selectionPresentation)
    && String(drafts[otherPosition.clave]?.candidateId || '') === String(candidateId)
  )) || null
}

function findIdentityDraftConflicts(positions, drafts, selectionPresentation) {
  const conflicts = []
  positions.forEach((position, index) => {
    const draft = drafts[position.clave]
    if (!draft?.candidateId) return
    positions.slice(index + 1).forEach((otherPosition) => {
      if ((positionsHaveIdentityConflict(position, otherPosition, selectionPresentation)
        || positionsHaveIdentityConflict(otherPosition, position, selectionPresentation))
        && String(drafts[otherPosition.clave]?.candidateId || '') === String(draft.candidateId)) {
        conflicts.push([{ position, draft }, { position: otherPosition, draft: drafts[otherPosition.clave] }])
      }
    })
  })
  return conflicts
}

function privateSecretaryAvailability(candidate, postulacion, position, presentation, action) {
  const directed = presentation?.preventOccupiedDirectedSecretary === true
    && position.clave === 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1'
  if (!directed && (!presentation?.preventOccupiedPrivateSecretary || action !== 'ASIGNAR'
    || position.clave !== 'DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1')) return 'NOT_APPLICABLE'
  if (directed && String(position.asignacion_actual_detalle?.usuario?.id) === String(candidate.id)) return 'NOT_APPLICABLE'
  if (position.tipo_participacion !== 'DOCENTE_MODALIDAD' || !Array.isArray(candidate.asignaciones_vigentes_detalle)
    || (directed ? position.ambito !== 'ETAPA' || presentation.profileSeguimiento == null
      || String(position.seguimiento_etapa) !== String(presentation.seguimientoEtapa)
      : position.ambito !== 'POSTULACION' || position.seguimiento_etapa !== null)) return 'UNKNOWN'
  const details = candidate.asignaciones_vigentes_detalle
  const ids = new Set()
  let occupied = false
  for (const item of details) {
    if (!item || !Number.isInteger(item.id) || item.id <= 0 || !Number.isInteger(item.postulacion)
      || typeof item.activo !== 'boolean' || String(item.usuario) !== String(candidate.id)) return 'UNKNOWN'
    if (!item.activo || String(item.postulacion) !== String(postulacion)) continue
    if (ids.has(item.id) || typeof item.codigo_posicion !== 'string' || !item.codigo_posicion.trim()
      || typeof item.tipo_participacion !== 'string' || !item.tipo_participacion
      || !['POSTULACION', 'ETAPA'].includes(item.ambito)
      || (item.ambito === 'POSTULACION' ? item.seguimiento_etapa !== null : !Number.isInteger(item.seguimiento_etapa))) return 'UNKNOWN'
    ids.add(item.id)
    if (!directed || (item.tipo_participacion === 'TUTOR' && item.codigo_posicion === 'TUTOR_TRABAJO_DIRIGIDO_1'
      && item.ambito === 'POSTULACION' && item.seguimiento_etapa === null)
      || (item.tipo_participacion === 'TRIBUNAL' && /^TRIBUNAL_PROPUESTA_TD_[123]$/.test(item.codigo_posicion)
        && item.ambito === 'ETAPA' && String(item.seguimiento_etapa) === String(presentation.profileSeguimiento))) occupied = true
  }
  return occupied ? 'OCCUPIED' : candidate.elegible === true ? 'AVAILABLE' : 'UNKNOWN'
}

function EligibleActorCandidates({ postulacion, position, positions, drafts, assignedSelections, selectionPresentation, candidateRevision, action, selected, disabled, onSelect, onStatusChange }) {
  const [knownEligibility, setKnownEligibility] = useState({})
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [candidates, setCandidates] = useState({ data: null, loading: true, error: '' })
  // Búsqueda automática: consulta al dejar de escribir (300 ms), sin botón "Buscar".
  useEffect(() => {
    const text = query.trim()
    if (text === search) return undefined
    const timer = window.setTimeout(() => { setSearch(text); setPage(1) }, 300)
    return () => window.clearTimeout(timer)
  }, [query, search])
  const rows = (candidates.data?.results || []).map((candidate) => ({ ...candidate,
    preventiveSelectionAllowed: ['AVAILABLE', 'NOT_APPLICABLE'].includes(privateSecretaryAvailability(candidate, postulacion, position, selectionPresentation, action)),
  }))
  const unknownOccupation = rows.some((candidate) => privateSecretaryAvailability(candidate, postulacion, position, selectionPresentation, action) === 'UNKNOWN')
  const invalidSelection = selected?.eligible === false || selected?.selectable === false
    || knownEligibility[selected?.candidateId] === false
    || rows.some((candidate) => String(candidate.id) === String(selected?.candidateId) && candidate.elegible === false)
  const visibleRows = selected && !rows.some((candidate) => String(candidate.id) === String(selected.candidateId))
    ? [...rows, { id: selected.candidateId, nombre_completo: selected.label, elegible: selected.eligible }]
    : rows

  useEffect(() => {
    const controller = new AbortController()
    setCandidates((current) => ({ ...current, loading: true, error: '' }))
    postulacionesService.obtenerCandidatosElegibles(postulacion, {
      posicion: position.clave,
      accion: action,
      search,
      ordering: 'apellido_paterno',
      page,
      page_size: 20,
    }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setKnownEligibility((current) => {
            const next = { ...current }
            for (const candidate of data?.results || []) {
              const availability = privateSecretaryAvailability(candidate, postulacion, position, selectionPresentation, action)
              if (typeof candidate.elegible === 'boolean' || availability !== 'NOT_APPLICABLE') {
                next[candidate.id] = candidate.elegible !== false && ['AVAILABLE', 'NOT_APPLICABLE'].includes(availability)
              }
            }
            return next
          })
          setCandidates({ data, loading: false, error: '' })
        }
      })
      .catch((requestError) => {
        if (!requestError.canceled && !controller.signal.aborted) {
          setCandidates({ data: null, loading: false, error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [postulacion, position, selectionPresentation, action, search, page, revision, candidateRevision])

  useEffect(() => {
    onStatusChange(position.clave, { loading: candidates.loading, error: candidates.error, invalidSelection })
  }, [position.clave, candidates.loading, candidates.error, invalidSelection, onStatusChange])

  // La opción vacía sirve para quitar una elección: solo aparece cuando ya hay alguien elegido.
  const candidateOptions = [...(selected?.candidateId ? [{ value: '', label: 'Quitar selección' }] : []), ...visibleRows.map((candidate) => {
    const selectedDraft = findSelectedDraft(position, candidate.id, positions, drafts)
    const conflict = findConflictingDraft(position, candidate.id, positions, drafts, selectionPresentation)
    const assignedPosition = findConflictingDraft(position, candidate.id, positions.filter((other) => (
      selectionPresentation?.blockOtherPositions || positionsShareTribunalContext(position, other)
      || isPreventiveActorConflict(position, other, selectionPresentation)
    )), assignedSelections, selectionPresentation)
    const label = candidate.nombre_completo || candidate.username || candidate.label
    const role = candidate.rol_nombre || candidate.rol_codigo
    const identifier = candidate.codigo || candidate.username
    const backendAssignmentLabels = Array.isArray(candidate.asignaciones_vigentes) && candidate.asignaciones_vigentes.length > 0
      ? candidate.asignaciones_vigentes
      : []
    const activeAssignmentLabels = assignedPosition
      ? [...new Set([...backendAssignmentLabels, assignedPosition.nombre])]
      : backendAssignmentLabels
    const disabled = candidate.elegible === false || candidate.preventiveSelectionAllowed === false || knownEligibility[candidate.id] === false || Boolean(conflict) || Boolean(assignedPosition)
    return { value: String(candidate.id), label: `${label}${role ? ` — ${role}` : ''}${identifier ? ` · ${identifier}` : ''}${activeAssignmentLabels.length > 0 ? ` · Asignación vigente: ${activeAssignmentLabels.join(', ')}` : ''}${selectedDraft || assignedPosition ? ` — Seleccionado como ${(selectedDraft || assignedPosition).nombre}` : ''}`, disabled }
  })]
  const comboLabel = `${action === 'REEMPLAZAR' ? 'Seleccionar reemplazo para' : 'Seleccionar candidato para'} ${position.nombre}`
  return <div className="actor-picker">
    {/* Un solo campo: lo que se escribe busca en el servidor y la lista se despliega ya filtrada. */}
    {!candidates.error && <Select
      searchable
      label={comboLabel}
      value={selected?.candidateId || ''}
      selectedLabel={selected?.label || ''}
      options={candidateOptions}
      onChange={(value) => onSelect(visibleRows.find((candidate) => String(candidate.id) === String(value)) || null)}
      onSearch={setQuery}
      loading={candidates.loading}
      disabled={disabled || (!candidates.loading && visibleRows.length === 0 && !query.trim() && !search)}
      placeholder="Buscar por nombre o código"
      emptyText="No se encontraron candidatos elegibles."
    />}
    {candidates.loading && <p role="status">Cargando candidatos elegibles…</p>}
    {!candidates.loading && unknownOccupation && <p role="status">No se pudieron verificar las ocupaciones de algunos candidatos. Esas opciones no pueden guardarse; vuelve a consultar los candidatos.</p>}
    {candidates.error && <div><p role="alert" className="text-red-600">{candidates.error}</p><Button type="button" variant="secondary" disabled={disabled} onClick={() => setRevision((value) => value + 1)}>Reintentar candidatos</Button></div>}
    {!candidates.loading && !candidates.error && <>
      {visibleRows.length === 0 && <p role="status" className="text-sm text-slate-500">No se encontraron candidatos elegibles.</p>}
      {candidates.data && <Pagination count={candidates.data.count || 0} page={page} hasNext={Boolean(candidates.data.next)} hasPrevious={Boolean(candidates.data.previous)} onPage={setPage} />}
    </>}
  </div>
}

function ActorGroup({ title, stateLabel, actors, page, onPage, onRetry, empty, view = 'tarjetas', noStageLabel }) {
  const rows = actors.data?.results || []
  const slug = stateLabel === 'Vigente' ? 'vigentes' : 'historicas'
  return <section aria-labelledby={`actores-${slug}`} className="expediente-group min-w-0">
    <h3 id={`actores-${slug}`} className="expediente-group-title">{title}{!actors.loading && !actors.error && rows.length > 0 && <span className="expediente-count" aria-hidden="true">{actors.data?.count ?? rows.length}</span>}</h3>
    {actors.loading && <p role="status" className="px-4 pb-4 text-sm">Cargando {title.toLowerCase()}…</p>}
    {actors.error && <div className="px-4 pb-4"><SectionError message={actors.error} label={`Reintentar ${title.toLowerCase()}`} onRetry={onRetry} /></div>}
    {!actors.loading && !actors.error && rows.length === 0 && <p className="px-4 pb-4 text-sm text-slate-500">{empty}</p>}
    {!actors.loading && !actors.error && rows.length > 0 && <>
      <ul key={view} className={view === 'lista' ? 'expediente-actor-list' : 'expediente-actor-grid'}>{rows.map((actor) => <ActorItem key={actor.id} actor={actor} stateLabel={stateLabel} noStageLabel={noStageLabel} />)}</ul>
      <Pagination count={actors.data.count} page={page} hasNext={Boolean(actors.data.next)} hasPrevious={Boolean(actors.data.previous)} onPage={onPage} />
    </>}
  </section>
}

function ActorItem({ actor, stateLabel, noStageLabel = 'Sin etapa asociada' }) {
  const order = actor.orden_cargo === null || actor.orden_cargo === undefined ? null : actor.orden_cargo
  const name = actor.usuario_nombre || 'Usuario no disponible'
  return <li className="expediente-actor animate-row-in">
    <div className="expediente-actor-head">
      <span className="expediente-actor-avatar" aria-hidden="true">{initialsOf(actor.usuario_nombre)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--info-text)]">{actor.tipo_participacion_display || actor.tipo_participacion_nombre || 'Tipo no registrado'}{order !== null ? ` ${order}` : ''}</p>
        <h4 className="break-words font-semibold text-[var(--heading)]">{name}</h4>
      </div>
    </div>
    <dl className="expediente-actor-facts">
      <div><dt>Designado desde</dt><dd>{actor.etapa_nombre || noStageLabel}</dd></div>
      <div><dt>Estado</dt><dd><span className="expediente-status expediente-status--compact" data-tone={stateLabel === 'Vigente' ? 'success' : 'neutral'}>{stateLabel}</span></dd></div>
      <Info label="Fecha de inicio" value={formatActorDate(actor.fecha_inicio || actor.fecha_designacion)} />
      {stateLabel === 'Anterior' && <Info label="Fecha de finalización" value={formatActorDate(actor.fecha_fin || actor.fecha_finalizacion, 'No registrada')} />}
      <div className="col-span-full"><dt>Observaciones</dt><dd>{actor.observaciones?.trim() || 'Sin observaciones'}</dd></div>
    </dl>
  </li>
}

function getActiveAssignmentLabels(userId, activeActors) {
  return activeActors
    .filter((actor) => actor.activo !== false && String(actor.usuario) === String(userId))
    .map((actor) => {
      const label = assignmentTypeLabel(actor.tipo_participacion)
      return actor.tipo_participacion === 'TRIBUNAL' && actor.orden_cargo ? `${label} ${actor.orden_cargo}` : label
    })
}

export function PublicAuthoritiesDialog({ assignment, postulacion, stage, orientation, blockOccupiedCandidates = false, allowIdentityReuse = false, authoritiesAcrossStages = false, onSelectCandidate, onSubmit, onClose }) {
  useEffect(() => {
    const opener = document.activeElement
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidatePage, setCandidatePage] = useState(1)
  const [candidateRevision, setCandidateRevision] = useState(0)
  const [candidates, setCandidates] = useState({ data: null, loading: true, error: '' })
  const [existingAuthorityRevision, setExistingAuthorityRevision] = useState(0)
  const [existingAuthorities, setExistingAuthorities] = useState({ data: null, loading: true, error: '' })
  const selections = assignment.selections || {}
  const [validationError, setValidationError] = useState('')
  const roles = ['PRESIDENTE', 'SECRETARIO']
  const roleRequirements = new Map((orientation?.requisitos || [])
    .filter((item) => roles.includes(item.codigo))
    .map((item) => [item.codigo, item]))
  const roleRows = roles.filter((role) => roleRequirements.has(role))
  const candidateRows = candidates.data?.results || []
  const activeAssignmentRows = existingAuthorities.data || []
  const successfulCount = roles.filter((role) => assignment.results?.[role]?.state === 'SUCCESS').length
  const roleAssignments = (role) => (existingAuthorities.data || []).filter((actor) => (
    actor.activo !== false
    && actor.tipo_participacion === role
    && (authoritiesAcrossStages || !actor.seguimiento_etapa || String(actor.seguimiento_etapa) === String(stage?.id))
  ))
  const roleIsAssigned = (role) => roleRequirements.get(role)?.cumplido === true
    || roleAssignments(role).length > 0
    || assignment.results?.[role]?.state === 'SUCCESS'
  const pendingRoles = roleRows.filter((role) => (
    roleRequirements.get(role)?.cumplido === false
    && !roleAssignments(role).length
    && assignment.results?.[role]?.state !== 'SUCCESS'
  ))

  useEffect(() => {
    const controller = new AbortController()
    setCandidates({ data: null, loading: true, error: '' })
    postulacionesService.obtenerCandidatosAsignacion({
      search: candidateSearch,
      rol: '',
      ordering: 'apellido_paterno',
      page: candidatePage,
    }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCandidates({ data, loading: false, error: '' })
      })
      .catch((error) => {
        if (!error.canceled && !controller.signal.aborted) setCandidates({ data: null, loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [candidateSearch, candidatePage, candidateRevision])

  useEffect(() => {
    const controller = new AbortController()
    setExistingAuthorities({ data: null, loading: true, error: '' })
    const load = async () => {
      const rows = []
      let page = 1
      while (!controller.signal.aborted) {
        const response = await postulacionesService.obtenerActores(postulacion, true, page, controller.signal)
        rows.push(...(Array.isArray(response) ? response : response?.results || []))
        if (Array.isArray(response) || !response?.next) break
        page += 1
      }
      if (!controller.signal.aborted) setExistingAuthorities({ data: rows, loading: false, error: '' })
    }
    load().catch((error) => {
      if (!error.canceled && !controller.signal.aborted) setExistingAuthorities({ data: null, loading: false, error: error.message })
    })
    return () => controller.abort()
  }, [postulacion, stage?.id, existingAuthorityRevision])

  const submit = async (event) => {
    event.preventDefault()
    if (assignment.submitting || existingAuthorities.loading || existingAuthorities.error || candidates.loading || candidates.error) return
    if (stage?.codigo !== 'DEFENSA_PUBLICA' || !stage?.id) {
      setValidationError('No se pudo identificar la etapa actual de Defensa Pública.')
      return
    }
    const jobs = pendingRoles.map((role) => {
      const candidate = selections[role]
      if (!candidate) return null
      return {
        key: role,
        name: candidate.nombre_completo || candidate.username,
        payload: {
          usuario: Number(candidate.id),
          tipo_participacion: role,
          seguimiento_etapa: Number(stage.id),
        },
      }
    })
    if (jobs.some((job) => !job)) {
      setValidationError('Selecciona una persona para cada cargo pendiente.')
      return
    }
    const selectedIds = jobs.map((job) => String(job.payload.usuario))
    if (!allowIdentityReuse && new Set(selectedIds).size !== selectedIds.length) {
      setValidationError('Selecciona personas distintas para Presidente y Secretario.')
      return
    }
    setValidationError('')
    await onSubmit(jobs)
    setExistingAuthorities({ data: null, loading: true, error: '' })
    setExistingAuthorityRevision((value) => value + 1)
  }

  const retryCandidates = () => setCandidateRevision((value) => value + 1)

  return <Modal title="Completar autoridades" onClose={() => { if (!assignment.submitting) onClose() }}>
    <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
      <p className="text-sm text-slate-600 dark:text-slate-300">Asigna las autoridades que faltan para esta Defensa Pública.</p>
      {stage?.codigo !== 'DEFENSA_PUBLICA' && <p role="alert" className="text-sm text-red-600">La etapa actual no corresponde a Defensa Pública.</p>}
      {existingAuthorities.loading && <p role="status">Verificando autoridades asignadas…</p>}
      {existingAuthorities.error && <div><p role="alert" className="text-sm text-red-600">{existingAuthorities.error}</p><Button type="button" variant="secondary" onClick={() => setExistingAuthorityRevision((value) => value + 1)}>Reintentar asignaciones</Button></div>}
      <div><label className="text-sm">Buscar persona<input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label><Button type="button" variant="secondary" className="mt-2" disabled={assignment.submitting} onClick={() => { setCandidateSearch(candidateQuery.trim()); setCandidatePage(1) }}>Buscar</Button></div>
      {candidates.loading && <p role="status">Cargando candidatos…</p>}
      {candidates.error && <div><p role="alert" className="text-sm text-red-600">{candidates.error}</p><Button type="button" variant="secondary" onClick={retryCandidates}>Reintentar candidatos</Button></div>}
      {!existingAuthorities.loading && !existingAuthorities.error && !candidates.loading && !candidates.error && roleRows.map((role) => {
        const label = assignmentTypeLabel(role)
        const assigned = roleAssignments(role)
        const result = assignment.results?.[role]
        const completed = roleIsAssigned(role)
        const otherRole = role === 'PRESIDENTE' ? 'SECRETARIO' : 'PRESIDENTE'
        const otherAssignedIds = new Set(roleAssignments(otherRole).map((actor) => String(actor.usuario)))
        const otherSelection = selections[otherRole]?.id
        const selectedCandidate = selections[role]
        const selectedValue = selectedCandidate?.id ? String(selectedCandidate.id) : ''
        const visibleCandidates = selectedCandidate && !candidateRows.some((candidate) => String(candidate.id) === selectedValue)
          ? [selectedCandidate, ...candidateRows] : candidateRows
        return <section key={role} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <h3 className="font-semibold">{label}{!completed && <span aria-hidden="true"> *</span>}</h3>
          {completed ? <div className="mt-2"><p className="font-medium text-emerald-700 dark:text-emerald-300">✓ Asignado</p>{assigned.length > 0
            ? assigned.map((actor) => <p key={actor.id} className="mt-1 text-sm">{actor.usuario_nombre || actor.usuario_nombre_completo || 'Persona asignada'}</p>)
            : <p className="mt-1 text-sm">{result?.name || 'Asignación registrada'}</p>}</div>
            : <label className="mt-2 block text-sm">Seleccionar persona<select aria-label={`Seleccionar persona para ${label}`} value={selectedValue} onChange={(event) => { onSelectCandidate(role, visibleCandidates.find((candidate) => String(candidate.id) === event.target.value) || null); setValidationError('') }} disabled={assignment.submitting || visibleCandidates.length === 0} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una persona</option>{visibleCandidates.map((candidate) => {
              const id = String(candidate.id)
              const currentAssignments = getActiveAssignmentLabels(candidate.id, activeAssignmentRows)
              const hasIncompatibleAssignment = !allowIdentityReuse && activeAssignmentRows.some((actor) => (
                actor.activo !== false
                && String(actor.usuario) === id
                && ['TRIBUNAL', 'PRESIDENTE', 'SECRETARIO'].includes(actor.tipo_participacion)
              ))
              const conflictsWithOtherAuthority = !allowIdentityReuse
                && ((otherSelection && id === String(otherSelection)) || otherAssignedIds.has(id))
              const disabled = (blockOccupiedCandidates && currentAssignments.length > 0) || hasIncompatibleAssignment || conflictsWithOtherAuthority
              const assignmentDescription = currentAssignments.length > 0 ? ` · Asignación vigente: ${currentAssignments.join(', ')}` : ''
              return <option key={candidate.id} value={id} disabled={disabled}>{candidate.nombre_completo || candidate.username} — {candidate.rol_nombre || candidate.rol_codigo}{assignmentDescription}</option>
            })}</select></label>}
          {result?.state === 'PROCESSING' && <p role="status" className="mt-2 text-sm">Guardando…</p>}
          {result?.state === 'ERROR' && <p role="alert" className="mt-2 text-sm text-red-600">⚠ No se pudo asignar: {result.message}</p>}
        </section>
      })}
      {!candidates.loading && !candidates.error && candidateRows.length === 0 && <p role="status">No se encontraron candidatos.</p>}
      {!candidates.loading && !candidates.error && candidates.data && <Pagination count={candidates.data.count || 0} page={candidatePage} hasNext={Boolean(candidates.data.next)} hasPrevious={Boolean(candidates.data.previous)} onPage={setCandidatePage} />}
      {validationError && <p role="alert" className="text-sm text-red-600">{validationError}</p>}
      {assignment.error && <p role="alert" className="text-sm text-red-600">{assignment.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={assignment.submitting || existingAuthorities.loading || Boolean(existingAuthorities.error) || candidates.loading || Boolean(candidates.error) || pendingRoles.length === 0 || pendingRoles.some((role) => !selections[role])}>{assignment.submitting ? 'Guardando autoridades…' : successfulCount > 0 ? 'Reintentar pendientes' : 'Guardar autoridades'}</Button><Button type="button" variant="secondary" disabled={assignment.submitting} onClick={onClose}>Cancelar</Button></div>
    </form>
  </Modal>
}

export function AssignmentDialog(props) {
  const title = props.replacementPosition?.nombre
    ? `Reemplazar ${props.replacementPosition.nombre}`
    : props.fixedAssignment?.nombre ? `Asignar ${props.fixedAssignment.nombre}` : 'Asignar actor'
  return <Modal title={title} onClose={props.onClose}><ActorAssignmentForm {...props} /></Modal>
}

export function ActorAssignmentForm({ assignment, stages, activeActors, activeTribunals, onRetryActiveTribunals, isProjectGrade, allowedTypes, initialStageId, fixedAssignment = null, onSubmit, onClose, closeLabel = 'Cancelar' }) {
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidatePage, setCandidatePage] = useState(1)
  const [candidateRevision, setCandidateRevision] = useState(0)
  const [candidates, setCandidates] = useState({ data: null, loading: true, error: '' })
  const [type, setType] = useState(fixedAssignment?.tipo_participacion || '')
  const [stageId, setStageId] = useState(fixedAssignment?.seguimiento_etapa ? String(fixedAssignment.seguimiento_etapa) : initialStageId ? String(initialStageId) : '')
  const [localFields, setLocalFields] = useState({})

  useEffect(() => {
    if (allowedTypes && type && !allowedTypes.includes(type)) setType('')
  }, [allowedTypes, type])

  useEffect(() => {
    const controller = new AbortController()
    setCandidates({ data: null, loading: true, error: '' })
    postulacionesService.obtenerCandidatosAsignacion({ search: candidateSearch, rol: '', ordering: 'apellido_paterno', page: candidatePage }, controller.signal)
      .then((data) => setCandidates({ data, loading: false, error: '' }))
      .catch((error) => {
        if (!error.canceled) setCandidates({ data: null, loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [candidateSearch, candidatePage, candidateRevision])

  const selectedStage = stages.find((stage) => String(stage.id) === String(stageId))
  const usesPersistentTribunalComposition = isProjectGrade && selectedStage?.codigo === 'REVISION_TRIBUNAL_PREVIA'
  const contextActors = activeActors.filter((actor) => String(actor.seguimiento_etapa || '') === String(stageId))
  const tribunals = (usesPersistentTribunalComposition ? activeTribunals.data || [] : contextActors)
    .filter((actor) => actor.activo !== false && actor.tipo_participacion === 'TRIBUNAL')
  const tribunalComposition = getActiveTribunalComposition(tribunals)
  const occupiedOrders = new Set(tribunalComposition.occupiedOrders)
  const tribunalByOrder = new Map(tribunals.map((actor) => [Number(actor.orden_cargo), actor]))
  const tribunalCompositionPending = usesPersistentTribunalComposition && (activeTribunals.loading || Boolean(activeTribunals.error) || !activeTribunals.data)
  const tribunalComplete = isProjectGrade && tribunalComposition.complete
  const availableTypes = allowedTypes ? ASSIGNMENT_TYPES.filter(([value]) => allowedTypes.includes(value)) : ASSIGNMENT_TYPES
  const unavailableCandidateIds = new Set(fixedAssignment && type
    ? (activeTribunals.data || []).map((actor) => String(actor.usuario))
    : type ? activeActors.filter((actor) => actor.tipo_participacion === type).map((actor) => String(actor.usuario)) : [])
  const fieldMessage = (name) => {
    const value = localFields[name] || assignment.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  const error = (name) => fieldMessage(name) && <span role="alert" className="mt-1 block text-sm text-red-600">{fieldMessage(name)}</span>

  const submit = (event) => {
    event.preventDefault()
    if (assignment.submitting) return
    const elements = event.currentTarget.elements
    const fields = {}
    const candidate = elements.usuario.value
    const order = fixedAssignment?.orden_cargo || elements.orden_cargo?.value || ''
    if (!candidate) fields.usuario = ['Selecciona un candidato.']
    if (!type) fields.tipo_participacion = ['Selecciona un tipo de participación.']
    if (type === 'TRIBUNAL' && !order) fields.orden_cargo = ['Selecciona el orden de tribunal requerido.']
    if (!fixedAssignment && type === 'TRIBUNAL' && tribunalComplete) fields.orden_cargo = ['Ya existen tres tribunales designados en este contexto.']
    if (!fixedAssignment && order && occupiedOrders.has(Number(order))) fields.orden_cargo = ['Ese orden de tribunal ya está ocupado en este contexto.']
    setLocalFields(fields)
    if (Object.keys(fields).length) return
    const payload = {
      usuario: Number(candidate),
      tipo_participacion: type,
      observaciones: fixedAssignment ? (fixedAssignment.observaciones || '') : elements.observaciones.value.trim(),
    }
    if (type === 'TRIBUNAL') payload.orden_cargo = Number(order)
    if (stageId) payload.seguimiento_etapa = Number(stageId)
    onSubmit(payload)
  }

  const rows = candidates.data?.results || []
  const activeStages = stages.filter((stage) => stage.activo !== false)
  return <form className="grid gap-4" onSubmit={submit} noValidate>
      {allowedTypes && <aside role="note" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:bg-sky-950"><p className="font-semibold">Para programar la Defensa Pública faltan:</p><ul className="mt-2 list-disc pl-5">{availableTypes.map(([value, label]) => <li key={value}>{label}</li>)}</ul><p className="mt-2">Cada rol se registra como una asignación independiente y explícita.</p></aside>}
      <div>
        <label className="text-sm">Buscar candidato<input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>
        <Button type="button" variant="secondary" className="mt-2" disabled={assignment.submitting} onClick={() => { setCandidateSearch(candidateQuery.trim()); setCandidatePage(1) }}>Buscar</Button>
      </div>
      {candidates.loading && <p role="status">Cargando candidatos…</p>}
      {candidates.error && <div><p role="alert" className="text-red-600">{candidates.error}</p><Button type="button" variant="secondary" className="mt-2" onClick={() => setCandidateRevision((value) => value + 1)}>Reintentar candidatos</Button></div>}
      {!candidates.loading && !candidates.error && <>
        <label className="text-sm">Candidato<select name="usuario" required disabled={assignment.submitting || rows.length === 0} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione una persona</option>{rows.map((candidate) => { const activeAssignments = getActiveAssignmentLabels(candidate.id, activeActors); return <option key={candidate.id} value={candidate.id} disabled={unavailableCandidateIds.has(String(candidate.id))}>{candidate.nombre_completo || candidate.username} — {candidate.rol_nombre || candidate.rol_codigo} — {candidate.codigo || candidate.username}{activeAssignments.length > 0 ? ` · Asignación vigente: ${activeAssignments.join(', ')}` : ''}</option> })}</select>{error('usuario')}</label>
        {rows.length === 0 && <p role="status" className="text-sm text-slate-500">No se encontraron candidatos.</p>}
        <Pagination count={candidates.data?.count || 0} page={candidatePage} hasNext={Boolean(candidates.data?.next)} hasPrevious={Boolean(candidates.data?.previous)} onPage={setCandidatePage} />
      </>}
      {!fixedAssignment && <label className="text-sm">Tipo de participación<select name="tipo_participacion" value={type} onChange={(event) => { setType(event.target.value); setLocalFields({}) }} required disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un tipo</option>{availableTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('tipo_participacion')}</label>}
      {!fixedAssignment && <label className="text-sm">Etapa asociada (opcional)<select name="seguimiento_etapa" value={stageId} onChange={(event) => { setStageId(event.target.value); setLocalFields({}) }} disabled={assignment.submitting} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Sin etapa asociada</option>{activeStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.nombre || stage.codigo} — intento {stage.numero_intento ?? 1} — {stage.estado_display || stage.estado}</option>)}</select>{error('seguimiento_etapa')}</label>}
      {!fixedAssignment && type === 'TRIBUNAL' && <>
        {usesPersistentTribunalComposition && activeTribunals.loading && <p role="status" className="text-sm text-slate-500">Verificando composición del tribunal…</p>}
        {usesPersistentTribunalComposition && activeTribunals.error && <div><p role="alert" className="text-sm text-red-600">{activeTribunals.error}</p><Button type="button" variant="secondary" className="mt-2" onClick={onRetryActiveTribunals}>Reintentar composición</Button></div>}
        {isProjectGrade && !tribunalCompositionPending && <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:bg-sky-950">{usesPersistentTribunalComposition ? 'Tribunales vigentes' : 'Tribunales designados'}: <strong>{tribunalComposition.occupiedOrders.length} de 3</strong>. La designación completa requiere Tribunal 1, Tribunal 2 y Tribunal 3; esto no representa quórum.</p>}
        <label className="text-sm">Orden del tribunal<select name="orden_cargo" required disabled={assignment.submitting || tribunalComplete || tribunalCompositionPending} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="">Seleccione un orden</option>{[1, 2, 3].map((order) => {
          const assignedTribunal = tribunalByOrder.get(order)
          const assignedName = assignedTribunal?.usuario_nombre || assignedTribunal?.usuario_nombre_completo
          const status = assignedTribunal
            ? usesPersistentTribunalComposition ? ` — ocupado por ${assignedName || 'usuario asignado'}` : ' — ocupado'
            : usesPersistentTribunalComposition ? ' — disponible' : ''
          return <option key={order} value={order} disabled={occupiedOrders.has(order)}>Tribunal {order}{status}</option>
        })}</select>{error('orden_cargo')}</label>
        {tribunalComplete && <p role="alert" className="text-sm text-amber-700">Ya están designados los tres tribunales para el contexto seleccionado.</p>}
      </>}
      {!fixedAssignment && <label className="text-sm">Observaciones (opcional)<textarea name="observaciones" disabled={assignment.submitting} className="mt-1 min-h-24 w-full rounded-lg border p-2 dark:bg-slate-950" /></label>}
      {error('non_field_errors')}{error('detail')}
      {assignment.error && <p role="alert" className="text-red-600">{assignment.error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={assignment.submitting || candidates.loading || Boolean(candidates.error) || (!fixedAssignment && type === 'TRIBUNAL' && (tribunalComplete || tribunalCompositionPending))}>{assignment.submitting ? 'Procesando…' : 'Confirmar asignación'}</Button><Button type="button" variant="secondary" disabled={assignment.submitting} onClick={onClose}>{closeLabel}</Button></div>
    </form>
}

function formatActorDate(value, fallback = 'No registrada') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString('es-BO')
}
