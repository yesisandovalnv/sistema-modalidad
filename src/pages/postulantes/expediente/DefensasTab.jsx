import { useEffect, useState } from 'react'
import { CalendarCheck2, CalendarClock, Info as InfoIcon } from 'lucide-react'
import { Modal } from '../../../components/crud/CrudShell'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Pagination } from '../../../components/reports/ReportComponents'
import DefenseParticipants from '../DefenseParticipants'
import DefenseEvaluation from '../DefenseEvaluation'
import ProjectGradeDirectResult from '../ProjectGradeDirectResult'
import DefenseDetailErrorBoundary from '../DefenseDetailErrorBoundary'
import { DownloadVersionButton } from '../../../components/documentos/DocumentDetailDialog'
import { Info, SectionError } from './compartidos'
import { DEFENSE_TYPES, EMPTY, formatDocumentDate, supportsCancelledDefenseRescheduling } from './reglas'

const ORIENTATION_TO_DEFENSE_ACTION = {
  INICIAR_DEFENSA: 'iniciar',
  FINALIZAR_DEFENSA: 'finalizar',
  REGISTRAR_EVALUACION: 'registrar_evaluacion',
  CONSOLIDAR_RESULTADO: 'consolidar_resultado',
}

export function ProtectedDefenseDetail(props) {
  const { defense, isProjectGrade, isThesisGrade, onClose } = props
  const detail = <DefenseDetail {...props} />
  if ((isProjectGrade || isThesisGrade) && ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense?.tipo_evento)) {
    return <DefenseDetailErrorBoundary resetKey={defense.id} onClose={onClose}>{detail}</DefenseDetailErrorBoundary>
  }
  return detail
}

export function DefensesCard({ defenses, page, onPage, onRetry, onSelect, canManage, canProgram = true, programmingContext, onProgram }) {
  const rows = defenses.data?.results || []
  return <Card className="expediente-card expediente-defenses overflow-hidden" aria-labelledby="defensas-title">
    <h2 id="defensas-title" className="text-xl font-bold">Defensas</h2>
    {canManage && canProgram && <Button className="expediente-card-action" onClick={onProgram}>{programmingContext?.actionLabel || 'Programar defensa'}</Button>}
    <p className="mt-1 text-sm text-slate-500">Defensas registradas en tu proceso académico.</p>
    {defenses.loading && <p role="status" className="mt-4 text-sm">Cargando defensas…</p>}
    {defenses.error && <SectionError message={defenses.error} label="Reintentar defensas" onRetry={onRetry} />}
    {!defenses.loading && !defenses.error && rows.length === 0 && <div className="expediente-empty">
      <span className="expediente-empty-icon" aria-hidden="true"><CalendarClock className="h-5 w-5" strokeWidth={1.9} /></span>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--heading)]">No se registraron defensas.</p>
        <p className="text-sm text-[var(--text-secondary)]">Aparecerán aquí cuando se programe la primera.</p>
      </div>
    </div>}
    {!defenses.loading && !defenses.error && rows.length > 0 && <>
      <ul className="expediente-defense-list">{rows.map((defense, index) => <li key={defense.id} className="expediente-defense animate-row-in" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
        <span className="expediente-doc-icon" data-tone={['FINALIZADA', 'REALIZADA'].includes(defense.estado) ? 'success' : 'info'} aria-hidden="true">{['FINALIZADA', 'REALIZADA'].includes(defense.estado) ? <CalendarCheck2 className="h-5 w-5" strokeWidth={1.9} /> : <CalendarClock className="h-5 w-5" strokeWidth={1.9} />}</span>
        <div className="expediente-defense-head">
          <div className="min-w-0"><h3 className="break-words font-semibold">{defense.tipo_display || defense.tipo_evento || EMPTY}</h3><p className="mt-1 text-sm">Intento {defense.numero_intento ?? EMPTY}</p></div>
          <span className="expediente-status expediente-status--compact" data-tone={['FINALIZADA', 'REALIZADA'].includes(defense.estado) ? 'success' : 'neutral'}>{defense.estado_display || defense.estado || EMPTY}</span>
        </div>
        <dl className="expediente-defense-facts">
          <Info label="Fecha programada" value={formatDefenseDate(defense.fecha_programada)} />
          <Info label="Lugar" value={defense.lugar?.trim() || 'No registrado'} />
          <Info label="Modalidad" value={defense.modalidad_display || defense.modalidad_evento} />
          <Info label="Etapa" value={defense.etapa_nombre || defense.etapa_codigo} />
          <Info label="Resultado" value={defense.resultado_consolidado?.resultado_cualitativo || defense.resultado_consolidado?.nota_numerica || 'Pendiente'} />
          {defense.tipo_evento === 'DEFENSA_PERFIL' && <Info label="Hoja de observaciones" value={defense.hoja_observaciones ? 'Disponible' : 'No registrada'} />}
        </dl>
        <Button className="expediente-defense-open" variant="secondary" onClick={() => onSelect(defense)}>Ver defensa</Button>
      </li>)}</ul>
      <Pagination count={defenses.data.count} page={page} hasNext={Boolean(defenses.data.next)} hasPrevious={Boolean(defenses.data.previous)} onPage={onPage} />
    </>}
  </Card>
}

function DefenseDetail({ defense, quorum, nextAction, onRetryQuorum, onClose, onDefenseCompleted, canManage, canEvaluate, canManageDocuments, isProjectGrade, isThesisGrade, onParticipantsChanged, onUploadProfileObservations, onManageActors, onAction }) {
  const [attendanceReviewRequest, setAttendanceReviewRequest] = useState(0)
  useEffect(() => {
    if (defense?.id != null) setAttendanceReviewRequest(0)
  }, [defense?.id])
  if (!defense || typeof defense !== 'object') {
    return <Modal title="Detalle de defensa" onClose={onClose}>
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">No se pudo cargar la defensa</h3>
        <p className="mt-1 text-sm">Los datos no están disponibles. Cierra este diálogo y vuelve al expediente para intentarlo de nuevo.</p>
      </section>
    </Modal>
  }
  const projectDefenseTypes = ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA']
  const projectDefenseDataInvalid = isProjectGrade && (
    defense.id == null
    || !projectDefenseTypes.includes(defense.tipo_evento)
    || typeof defense.estado !== 'string'
    || !Array.isArray(defense.evaluaciones)
    || !defense.evaluaciones.every((item) => item && typeof item === 'object')
    || !Array.isArray(defense.participantes)
    || !defense.participantes.every((item) => item && typeof item === 'object')
    || (defense.resultado_consolidado != null && typeof defense.resultado_consolidado !== 'object')
    || (defense.composicion_formal != null && !Array.isArray(defense.composicion_formal))
  )
  if (projectDefenseDataInvalid) {
    return <Modal title="Detalle de defensa" onClose={onClose}>
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">No se pudo cargar el detalle completo</h3>
        <p className="mt-1 text-sm">La defensa llegó con datos incompletos o con un formato inesperado. Cierra este diálogo y vuelve al expediente para actualizarla.</p>
        <Button className="mt-3" variant="secondary" onClick={onClose}>Volver al expediente</Button>
      </section>
    </Modal>
  }
  const evaluations = defense.evaluaciones || []
  // Con resultado consolidado, el resultado final ya se muestra en "Resultado": aquí solo las evaluaciones.
  const listedEvaluations = defense.resultado_consolidado
    ? evaluations.filter((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
    : evaluations
  if (!Array.isArray(evaluations)) {
    return <Modal title="Detalle de defensa" onClose={onClose}>
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">No se pudieron cargar las evaluaciones</h3>
        <p className="mt-1 text-sm">La respuesta de la defensa tiene un formato inesperado. Cierra este diálogo y vuelve al expediente para actualizarla.</p>
      </section>
    </Modal>
  }
  const hasActiveReplacement = defense.reprogramaciones?.some((item) => item.activo !== false && item.estado !== 'CANCELADA')
  const canRescheduleCancelledDefense = supportsCancelledDefenseRescheduling(defense)
  const actions = { PROGRAMADA: ['iniciar', 'suspender', 'cancelar', 'reprogramar'], EN_CURSO: ['finalizar', 'suspender', 'cancelar'], SUSPENDIDA: ['reprogramar', 'cancelar'], CANCELADA: hasActiveReplacement || !canRescheduleCancelledDefense ? [] : ['reprogramar'] }[defense.estado] || []
  const actionLabels = {
    iniciar: 'Iniciar defensa',
    finalizar: 'Finalizar defensa',
    suspender: 'Suspender defensa',
    cancelar: 'Cancelar defensa',
    reprogramar: 'Reprogramar defensa',
    registrar_evaluacion: 'Registrar resultado de la defensa',
    consolidar_resultado: 'Consolidar resultado',
  }
  const contextualNextAction = (nextAction?.accion || nextAction?.codigo) === 'PROGRAMAR_EVENTO' ? null : nextAction
  const orientedAction = ORIENTATION_TO_DEFENSE_ACTION[contextualNextAction?.accion || contextualNextAction?.codigo]
  const hasEvaluation = evaluations.some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const hasProjectProfileConsensus = isProjectGrade && defense.tipo_evento === 'DEFENSA_PERFIL'
    && evaluations.some((item) => item.tipo_evaluacion === 'PERFIL' && item.modalidad_registro === 'CONSENSO' && !item.es_resultado_final_evento)
  const hasThesisIndividualEvaluation = isThesisGrade && evaluations.some((item) => item.modalidad_registro === 'INDIVIDUAL' && !item.es_resultado_final_evento)
  const hasResult = Boolean(defense.resultado_consolidado)
  const thesisCompositionValidation = isThesisGrade ? defense.composicion_formal_validacion : null
  const evaluationManager = canManage || canEvaluate
  const profileContext = defense.tipo_evento === 'DEFENSA_PERFIL'
  const directProjectFlow = (isProjectGrade && ['DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))
    || (isThesisGrade && !hasThesisIndividualEvaluation && ['DEFENSA_TEMATICA', 'DEFENSA_PERFIL', 'DEFENSA_PRIVADA', 'DEFENSA_PUBLICA'].includes(defense.tipo_evento))
  // Tesis con evaluaciones individuales: cada tribunal registra la suya, hasta tres.
  const thesisIndividualPending = hasThesisIndividualEvaluation && !hasResult
    && evaluations.filter((item) => item.modalidad_registro === 'INDIVIDUAL' && !item.es_resultado_final_evento).length < 3
  const canRegisterEvaluation = evaluationManager && (!hasEvaluation || thesisIndividualPending) && ['EN_CURSO', 'FINALIZADA'].includes(defense.estado) && quorum.data?.valido === true
  const canConsolidateEvaluation = evaluationManager && hasEvaluation && !hasResult && defense.estado === 'FINALIZADA'
  const orientationCompatible = actions.includes(orientedAction)
    || (orientedAction === 'registrar_evaluacion' && canRegisterEvaluation)
    || (orientedAction === 'consolidar_resultado' && canConsolidateEvaluation)
  const compatibleNextAction = orientationCompatible ? contextualNextAction : null
  const evaluationActionAvailable = evaluationManager && (
    (orientedAction === 'registrar_evaluacion' && canRegisterEvaluation)
    || (orientedAction === 'consolidar_resultado' && canConsolidateEvaluation)
  )
  const profileQuickFlow = profileContext && evaluationManager && quorum.data?.valido === true && !hasResult
    && ((defense.estado === 'EN_CURSO' && (!hasEvaluation || hasProjectProfileConsensus)) || (defense.estado === 'FINALIZADA' && hasProjectProfileConsensus))
  const quickProfileEvaluationAction = profileQuickFlow ? 'registrar_evaluacion' : null
  const primaryAction = quickProfileEvaluationAction || (((canManage && actions.includes(orientedAction)) || evaluationActionAvailable) ? orientedAction : null)
  const secondaryActions = primaryAction ? actions.filter((action) => action !== primaryAction) : actions
  const hasSecondaryEvaluationAction = (canRegisterEvaluation && primaryAction !== 'registrar_evaluacion') || (canConsolidateEvaluation && primaryAction !== 'consolidar_resultado')
  const duplicateQuorumDetail = sameTechnicalCounts(quorum.data?.conteos, quorum.data?.detalle)
  const activeParticipants = (defense.participantes || []).filter((participant) => participant.activo !== false)
  const participantSummary = activeParticipants.length === 0
    ? 'Ninguno incorporado'
    : `${activeParticipants.length} incorporado${activeParticipants.length === 1 ? '' : 's'}`
  const quorumSummary = quorum.loading
    ? 'Consultando'
    : quorum.error
      ? 'No disponible'
      : quorum.data
        ? quorum.data.valido ? 'Válido' : 'No válido'
        : 'No consultado'
  const resultSummary = hasResult ? 'Consolidado' : 'Pendiente'
  const displayedPrimaryAction = directProjectFlow
    ? null
    : primaryAction || (canManage && actions.includes('iniciar') ? 'iniciar' : null)
  const displayedPrimaryTitle = displayedPrimaryAction === primaryAction
    ? (compatibleNextAction?.titulo || actionLabels[displayedPrimaryAction] || 'Registrar resultado de la defensa')
    : actionLabels[displayedPrimaryAction] || 'Registrar resultado de la defensa'
  const displayedPrimaryDescription = displayedPrimaryAction === primaryAction ? compatibleNextAction?.descripcion : null
  const secondaryOperationalActions = secondaryActions.filter((action) => action !== 'cancelar' && action !== displayedPrimaryAction && !(defense.estado === 'CANCELADA' && canRescheduleCancelledDefense && !directProjectFlow && action === 'reprogramar'))
  const destructiveActions = secondaryActions.filter((action) => action === 'cancelar')
  const showEvaluationSection = hasSecondaryEvaluationAction || (canManage && secondaryActions.length > 0 && (defense.estado !== 'PROGRAMADA' || hasEvaluation))
  // En la defensa de perfil el título "Estado operativo" queda sin contenido: se oculta a la vista
  // (sigue para lectores de pantalla, que lo usan como nombre de la sección).
  const operationalTitleEmpty = profileContext && !(!displayedPrimaryAction && compatibleNextAction?.titulo)
  return <Modal title="Detalle de defensa" onClose={onClose} size="xl">
    <div className="defense-detail mt-4 min-w-0 space-y-6">
      <section aria-labelledby="defensa-evento-title">
        <div className="defense-event">
          <div className="defense-event-head">
            <h3 id="defensa-evento-title" className="text-2xl font-bold">{defense.tipo_display || defense.tipo_evento}</h3>
            <span className="defense-event-status" data-tone={['FINALIZADA', 'REALIZADA'].includes(defense.estado) ? 'success' : ['CANCELADA', 'SUSPENDIDA'].includes(defense.estado) ? 'warning' : 'info'}>{defense.estado_display || defense.estado}</span>
          </div>
          <div className="defense-event-meta">
            <p className="font-medium">{formatDefenseDate(defense.fecha_programada)}</p>
            <p className="break-words">{defense.lugar?.trim() || 'No registrado'} · {defense.modalidad_display || defense.modalidad_evento}</p>
            <p>Intento {defense.numero_intento ?? 'No registrado'} · Etapa {defense.etapa_nombre || defense.etapa_codigo || 'No registrada'}</p>
          </div>
        {(defense.fecha_inicio_real || defense.fecha_fin_real || defense.fecha_cancelacion) && <dl className="defense-event-times">
          {defense.fecha_inicio_real && <Info label="Inicio real" value={formatDefenseDate(defense.fecha_inicio_real)} />}
          {defense.fecha_fin_real && <Info label="Finalización real" value={formatDefenseDate(defense.fecha_fin_real)} />}
          {defense.fecha_cancelacion && <Info label="Cancelada el" value={formatDefenseDate(defense.fecha_cancelacion)} />}
        </dl>}
        </div>
        {defense.reprogramada_desde_detalle && <p role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">Nueva programación del evento cancelado #{defense.reprogramada_desde_detalle.id}. Fecha anterior: {formatDefenseDate(defense.reprogramada_desde_detalle.fecha_programada)}. Cancelada el: {formatDefenseDate(defense.reprogramada_desde_detalle.fecha_cancelacion)}.</p>}
        {defense.reprogramaciones?.filter((item) => item.activo !== false && item.estado !== 'CANCELADA').map((item) => <p key={item.id} role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">Nueva programación: evento #{item.id}, {formatDefenseDate(item.fecha_programada)}.</p>)}
        {defense.enlace_virtual && <a className="mt-4 inline-flex max-w-full break-all rounded-md border px-3 py-2 text-sm font-medium" href={defense.enlace_virtual} target="_blank" rel="noopener noreferrer">Abrir enlace virtual de la defensa</a>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="estado-operativo-defensa-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 id="estado-operativo-defensa-title" className={operationalTitleEmpty ? 'sr-only' : 'text-lg font-bold'}>Estado operativo</h3>{!profileContext && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{directProjectFlow ? `Resultado: ${resultSummary}` : `Participantes: ${participantSummary === 'Ninguno incorporado' ? '0' : participantSummary} · Quórum: ${quorumSummary} · Resultado: ${resultSummary}`}</p>}</div>
          {!displayedPrimaryAction && compatibleNextAction?.titulo && <p className="max-w-md text-sm"><span className="font-semibold">Siguiente acción:</span> {compatibleNextAction.titulo}{compatibleNextAction.descripcion ? ` — ${compatibleNextAction.descripcion}` : ''}</p>}
        </div>
        {directProjectFlow ? <div className={operationalTitleEmpty ? undefined : 'mt-4 border-t border-slate-200 pt-4 dark:border-slate-700'}><h4 className="font-semibold">Tribunal y cargos formales</h4>
          {defense.composicion_formal?.length ? <ul className="mt-2 space-y-2">{defense.composicion_formal.map((actor) => <li key={actor.id} className="rounded-md border bg-white p-3 text-sm dark:bg-slate-950"><span className="font-semibold">{actor.usuario_nombre}</span><span> — {actor.rol_display || actor.tipo_participacion}{actor.orden_cargo ? ` ${actor.orden_cargo}` : ''}</span></li>)}</ul> : <p className="mt-2 text-sm text-amber-700">No hay asignaciones formales vigentes para mostrar.</p>}
          {isThesisGrade && thesisCompositionValidation?.cumple !== true && <section role="alert" className="mt-3 rounded-md border border-amber-400 bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            <p className="font-semibold">Composición formal inválida; corrige las asignaciones antes de registrar el resultado.</p>
            {!thesisCompositionValidation && <p className="mt-1">No se pudo validar la composición de esta defensa.</p>}
            {thesisCompositionValidation?.conflictos_identidad?.map((conflict, index) => <p key={`${conflict.usuario_nombre}-${index}`} className="mt-1">{conflict.usuario_nombre} ocupa cargos repetidos: {conflict.cargos.join(', ')}.</p>)}
            {thesisCompositionValidation?.requisitos?.filter((item) => !item.cumplido).map((item) => <p key={item.cargo} className="mt-1">{item.cargo}: {item.actual} de {item.minimo} asignaciones distintas.</p>)}
          </section>}
          {canManage && isProjectGrade && <Button className="mt-2" variant="secondary" onClick={onManageActors}>Gestionar tribunal y cargos</Button>}
        </div> : <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700"><DefenseParticipants
          defense={defense}
          canManage={canManage}
          onChanged={onParticipantsChanged}
          profileContext={profileContext}
          quorum={quorum.data}
          reviewAttendanceRequest={attendanceReviewRequest}
        /></div>}
        {!directProjectFlow && <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        {quorum.loading && <p role="status" className="mt-3 text-sm">Consultando quórum…</p>}
        {quorum.error && <SectionError message={quorum.error} label="Reintentar quórum" onRetry={onRetryQuorum} />}
        {!quorum.loading && !quorum.error && quorum.data && <details className="overflow-hidden rounded-lg border text-sm"><summary className="cursor-pointer p-3 font-semibold">Información técnica del quórum</summary><div className="space-y-3 border-t p-3"><TechnicalCounts title="Conteos" values={quorum.data.conteos} empty="Sin conteos registrados." /><TechnicalCounts title="Faltantes" values={quorum.data.faltantes} empty="Sin participantes faltantes." />{!duplicateQuorumDetail && <TechnicalCounts title="Detalles" values={quorum.data.detalle} empty="Sin detalle adicional." />}<p className="text-slate-500">El quórum mostrado es una verificación técnica del sistema y no acredita por sí mismo la conformación formal del tribunal ni la validez institucional del acto. Esta verificación técnica no certifica validez institucional.</p></div></details>}
        </div>}
      </section>

      {directProjectFlow && <ProjectGradeDirectResult defense={defense} canManage={evaluationManager} onChanged={onParticipantsChanged} onCompleted={onDefenseCompleted} onClose={onClose} thesisGrade={isThesisGrade} compositionValidation={thesisCompositionValidation} />}

      {canManage && directProjectFlow && (actions.includes('reprogramar') || destructiveActions.length > 0) && <section className="defense-more" aria-labelledby="otras-acciones-defensa-title">
        <h3 id="otras-acciones-defensa-title" className="font-bold">{defense.estado === 'CANCELADA' ? 'Nueva programación' : 'Otras acciones'}</h3>
        {actions.includes('reprogramar') && <p className="mt-1 text-sm text-[var(--text-secondary)]">{defense.estado === 'CANCELADA'
          ? 'La fecha cancelada y su historial se conservarán. Se creará un evento nuevo para el mismo intento.'
          : 'Reprogramar cambia la fecha de esta defensa; el cambio queda registrado en el historial.'}</p>}
        <div className="defense-more-actions">
          {destructiveActions.map((action) => <Button key={action} variant="outline" onClick={() => onAction(action)}>{actionLabels[action]}</Button>)}
          {actions.includes('reprogramar') && <Button onClick={() => onAction('reprogramar')}>Reprogramar defensa</Button>}
        </div>
      </section>}
      {canManage && !directProjectFlow && defense.estado === 'CANCELADA' && canRescheduleCancelledDefense && actions.includes('reprogramar') && <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950"><h3 className="font-bold">Nueva programación</h3><p className="mt-1 text-sm">La fecha cancelada y su historial se conservarán. Se creará un evento nuevo para el mismo intento.</p><Button className="mt-3" onClick={() => onAction('reprogramar')}>Reprogramar defensa</Button></section>}

      {!directProjectFlow && displayedPrimaryAction && <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950" aria-labelledby="siguiente-accion-defensa-title"><h3 className="text-sm font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">Acción principal</h3>{![ 'iniciar', 'registrar_evaluacion'].includes(displayedPrimaryAction) && <p className="mt-2 font-semibold">{displayedPrimaryTitle}</p>}{displayedPrimaryDescription && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayedPrimaryDescription}</p>}{['registrar_evaluacion', 'consolidar_resultado'].includes(displayedPrimaryAction) ? <DefenseEvaluation defense={defense} quorum={quorum} canManage={evaluationManager} action={displayedPrimaryAction} actionLabel={displayedPrimaryTitle} onChanged={onParticipantsChanged} onCompleted={onDefenseCompleted} projectProfileFlow={profileQuickFlow} onReviewAttendance={() => { setAttendanceReviewRequest((value) => value + 1); const participantsHeading = document.getElementById('participantes-defensa-title'); if (typeof participantsHeading?.scrollIntoView === 'function') participantsHeading.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} /> : <Button className="mt-4" disabled={displayedPrimaryAction === 'finalizar' && (quorum.loading || quorum.error || quorum.data?.valido !== true)} onClick={() => onAction(displayedPrimaryAction)}>{displayedPrimaryTitle}</Button>}</section>}

      {!directProjectFlow && showEvaluationSection && !['registrar_evaluacion', 'consolidar_resultado'].includes(primaryAction) && <section aria-labelledby="evaluacion-defensa-title"><h3 id="evaluacion-defensa-title" className="text-lg font-bold">Evaluación</h3><DefenseEvaluation defense={defense} quorum={quorum} canManage={evaluationManager} buttonVariant="secondary" hiddenAction={primaryAction} onChanged={onParticipantsChanged} onCompleted={onDefenseCompleted} /></section>}

      {canManage && !directProjectFlow && secondaryOperationalActions.length > 0 && <section aria-labelledby="otras-acciones-defensa-title"><h3 id="otras-acciones-defensa-title" className="text-lg font-bold">Más acciones</h3><div className="mt-3 flex flex-wrap gap-2">{secondaryOperationalActions.map((action) => {
        const finalBlocked = action === 'finalizar' && (quorum.loading || quorum.error || quorum.data?.valido !== true)
        const variant = action === 'finalizar' && hasProjectProfileConsensus && !finalBlocked ? 'default' : 'secondary'
        return <Button key={action} variant={variant} disabled={finalBlocked} title={finalBlocked ? 'La finalización requiere quórum técnico válido confirmado por el backend.' : undefined} onClick={() => onAction(action)}>{actionLabels[action]}</Button>
      })}</div>{defense.estado === 'EN_CURSO' && quorum.data?.valido !== true && <p className="mt-3 text-sm text-slate-500">La finalización estará disponible cuando el backend confirme quórum técnico válido.</p>}</section>}

      {canManage && !directProjectFlow && destructiveActions.length > 0 && <section aria-labelledby="acciones-destructivas-defensa-title"><h3 id="acciones-destructivas-defensa-title" className="text-lg font-bold">Acción destructiva</h3><div className="mt-3 flex flex-wrap gap-2">{destructiveActions.map((action) => <Button key={action} variant="outline" onClick={() => onAction(action)}>{actionLabels[action]}</Button>)}</div></section>}

      {hasResult && <section aria-labelledby="resultado-consolidado-title"><h3 id="resultado-consolidado-title" className="text-lg font-bold">Resultado</h3><div className="mt-3 rounded-lg border p-3"><EvaluationData evaluation={defense.resultado_consolidado} showTechnical={canManage || canEvaluate} /></div></section>}

      <section aria-labelledby="evaluaciones-defensa-title"><h3 id="evaluaciones-defensa-title" className="text-lg font-bold">Evaluaciones registradas</h3>
        {listedEvaluations.length === 0 ? <p className="mt-3 text-sm text-slate-500">No se registraron evaluaciones.</p> : <ul className="mt-3 space-y-3">{listedEvaluations.map((evaluation) => <li key={evaluation.id} className="rounded-lg border p-3"><EvaluationData evaluation={evaluation} /></li>)}</ul>}
      </section>

      {isProjectGrade && defense.tipo_evento === 'DEFENSA_PERFIL' && defense.estado === 'FINALIZADA' && <ProfileObservationsSection document={defense.hoja_observaciones} canManageDocuments={canManageDocuments} onUpload={() => onUploadProfileObservations(defense)} />}

    </div>
  </Modal>
}

function ProfileObservationsSection({ document, canManageDocuments, onUpload }) {
  const currentVersion = document?.versiones?.find((version) => version.es_version_actual && version.activo !== false)
  return <section aria-labelledby="hoja-observaciones-title"><h3 id="hoja-observaciones-title" className="text-lg font-bold">Hoja de observaciones</h3>
    {!document && <p className="mt-3 text-sm text-slate-500">No se registró una hoja de observaciones para esta defensa.</p>}
    {document && <div className="defense-sheet"><dl className="grid gap-2 text-sm sm:grid-cols-2"><Info label="Tipo" value={document.tipo_documento_nombre || document.tipo_documento_codigo} /><Info label="Versión actual" value={currentVersion ? `Versión ${currentVersion.numero_version}` : 'No registrada'} /><Info label="Fecha de carga" value={formatDocumentDate(currentVersion?.fecha_subida || document.fecha_subida)} /></dl><div className="defense-sheet-actions">{canManageDocuments && <Button variant="secondary" onClick={onUpload}>{currentVersion ? 'Cargar nueva versión' : 'Cargar hoja de observaciones'}</Button>}{currentVersion && <DownloadVersionButton version={currentVersion} />}</div></div>}
    {!document && canManageDocuments && <Button className="mt-3" variant="secondary" onClick={onUpload}>Cargar hoja de observaciones</Button>}
  </section>
}

export function DefenseOperationDialog({ operation, stages, quorum, onSubmit, onClose }) {
  const [type, setType] = useState('')
  const [mode, setMode] = useState('PRESENCIAL')
  const activeParticipants = (operation.defense?.participantes || []).filter((participant) => participant.activo !== false)
  const pendingParticipants = activeParticipants.filter((participant) => participant.presente === null || participant.presente === undefined)
  const [selectedAttendance, setSelectedAttendance] = useState(() => new Set(pendingParticipants.map((participant) => String(participant.id))))
  const titles = { programar: operation.programmingContext?.title || 'Programar defensa', iniciar: 'Iniciar defensa', finalizar: 'Finalizar defensa', suspender: 'Suspender defensa', cancelar: 'Cancelar defensa', reprogramar: 'Reprogramar defensa' }
  const fieldMessage = (name) => {
    const value = operation.fields?.[name]
    return Array.isArray(value) ? value.join(' ') : value
  }
  const expectedStage = DEFENSE_TYPES.find(([value]) => value === type)?.[2]
  const compatibleStages = stages.filter((stage) => (Array.isArray(expectedStage) ? expectedStage : [expectedStage]).includes(stage.codigo) && ['EN_PROCESO', 'OBSERVADA'].includes(stage.estado) && stage.activo !== false)
  const disabled = operation.submitting
  const error = (name) => fieldMessage(name) && <span id={`defense-${name}-error`} role="alert" className="mt-1 block text-sm text-red-600">{fieldMessage(name)}</span>
  const submit = (event) => {
    if (operation.action !== 'iniciar') return onSubmit(event)
    const decisions = pendingParticipants.map((participant) => ({
      participante: participant.id,
      presente: selectedAttendance.has(String(participant.id)),
    }))
    return onSubmit(event, decisions)
  }

  return <Modal title={titles[operation.action]} onClose={onClose}>
    <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
      {operation.action === 'programar' ? <>
        {operation.programmingContext ? <>
          <input type="hidden" name="tipo_evento" value={operation.programmingContext.tipoEvento} />
          <input type="hidden" name="seguimiento_etapa" value={operation.programmingContext.seguimientoEtapa} />
          <dl className="defense-op-context"><div><dt className="text-slate-500">Defensa a programar</dt><dd className="mt-1 font-semibold">{operation.programmingContext.typeLabel}</dd></div><div><dt className="text-slate-500">Etapa</dt><dd className="mt-1 font-semibold">{operation.programmingContext.stageLabel}</dd></div>{operation.programmingContext.anticipationLabel && <div><dt className="text-slate-500">Anticipación mínima informada</dt><dd className="mt-1 font-semibold">{operation.programmingContext.anticipationLabel}</dd></div>}</dl>
        </> : <>
          <p className="text-sm">La postulación se toma de este expediente. El intento será determinado por el backend.</p>
          <label className="form-label">Tipo de defensa<select name="tipo_evento" value={type} onChange={(event) => setType(event.target.value)} required disabled={disabled} className="form-control"><option value="">Seleccione un tipo</option>{DEFENSE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('tipo_evento')}</label>
          <label className="form-label">Etapa compatible<select name="seguimiento_etapa" required disabled={disabled || !type} className="form-control"><option value="">Seleccione una etapa</option>{compatibleStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.nombre} — intento {stage.numero_intento}</option>)}</select>{error('seguimiento_etapa')}</label>
          {type && compatibleStages.length === 0 && <p role="status" className="text-sm text-amber-700">No existe una etapa compatible en proceso u observada.</p>}
        </>}
        <label className="form-label">Fecha y hora programada<input name="fecha_programada" type="datetime-local" required disabled={disabled} className="form-control" />{error('fecha_programada')}</label>
        <label className="form-label">Modalidad técnica<select name="modalidad_evento" value={mode} onChange={(event) => setMode(event.target.value)} disabled={disabled} className="form-control"><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="MIXTA">Mixta</option></select></label>
        {(mode === 'PRESENCIAL' || mode === 'MIXTA') && <label className="form-label">Lugar<input name="lugar" required disabled={disabled} className="form-control" />{error('lugar')}</label>}
        {(mode === 'VIRTUAL' || mode === 'MIXTA') && <label className="form-label">Enlace virtual<input name="enlace_virtual" type="url" required disabled={disabled} className="form-control" />{error('enlace_virtual')}</label>}
        <label className="form-label">Observaciones (opcional)<textarea name="observaciones" disabled={disabled} className="form-control form-control--area" /></label>
        <p role="note" className="defense-op-note"><InfoIcon className="h-4 w-4 shrink-0" aria-hidden="true" />Virtual y mixta son modalidades técnicas y no acreditan autorización normativa.</p>
      </> : <>
        {operation.action === 'iniciar' ? <>
          <p className="text-sm">Confirma los participantes presentes antes de iniciar la defensa.</p>
          {activeParticipants.length === 0 ? <p className="rounded-lg border p-3 text-sm text-slate-600">No hay participantes activos incorporados a esta defensa.</p> : <fieldset disabled={disabled} className="space-y-2"><legend className="sr-only">Participantes y asistencia</legend>{activeParticipants.map((participant) => {
            const role = participant.rol_display || participant.rol_evento || 'Rol no registrado'
            const name = participant.usuario_nombre || 'Usuario no disponible'
            if (participant.presente === true || participant.presente === false) {
              return <div key={participant.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{name}</p><p className="text-slate-500">{role}</p><p className="mt-1 font-medium">Asistencia ya registrada · {participant.presente ? 'Presente' : 'Ausente'}</p></div>
            }
            const id = String(participant.id)
            return <label key={participant.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" aria-label={`${name} — ${role}`} checked={selectedAttendance.has(id)} disabled={disabled} onChange={() => setSelectedAttendance((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })} /><span><span className="block font-semibold">{name}</span><span className="block text-slate-500">{role}</span><span className="block text-slate-500">Pendiente de registrar</span></span></label>
          })}</fieldset>}
          {activeParticipants.some((participant) => participant.presente === null || participant.presente === undefined) && <p className="text-sm text-slate-500">Desmarca únicamente a quienes no se encuentren presentes.</p>}
        </> : <p className="text-sm">Confirma la acción sobre el evento técnico seleccionado.</p>}
        {operation.action === 'finalizar' && <p className="rounded-lg border p-3 text-sm">Quórum técnico confirmado por backend: <strong>{quorum.data?.valido ? 'válido' : 'no válido'}</strong>. Finalizar no registra resultado académico, acta firmada ni cierre universitario.</p>}
        {operation.action === 'reprogramar' && <label className="form-label">Nueva fecha y hora<input name="nueva_fecha" type="datetime-local" required disabled={disabled} className="form-control" />{error('nueva_fecha')}</label>}
        {['suspender', 'cancelar', 'reprogramar'].includes(operation.action) && <label className="form-label">Motivo<textarea aria-label="Motivo" name="motivo" required disabled={disabled} className="form-control form-control--area" />{error('motivo')}</label>}
      </>}
      {error('non_field_errors')}{error('detail')}
      {operation.error && <p role="alert" className="text-red-600">{operation.error}</p>}
      <div className="form-footer"><Button type="button" variant="secondary" disabled={disabled} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={disabled}>{disabled ? 'Procesando…' : operation.action === 'programar' ? operation.programmingContext?.actionLabel || 'Programar defensa' : operation.action === 'iniciar' ? 'Iniciar defensa' : 'Confirmar'}</Button></div>
    </form>
  </Modal>
}

function EvaluationData({ evaluation }) {
  const consensus = evaluation.modalidad_registro === 'CONSENSO' && !evaluation.evaluador_nombre
  const isRawGrade = evaluation.semantica_nota === 'BRUTA_100'
  const isLegacyGrade = evaluation.semantica_nota === 'LEGACY_PONDERADA'
  const gradeScale = isRawGrade ? '100' : isLegacyGrade ? evaluation.ponderacion : null
  const gradeLabel = isRawGrade ? 'Calificación bruta' : 'Nota'
  return <div className="space-y-3"><dl className="grid gap-2 text-sm sm:grid-cols-2"><Info label="Tipo" value={evaluation.tipo_display || evaluation.tipo_evaluacion} /><Info label="Resultado académico" value={evaluation.resultado_cualitativo || 'No registrado'} /><Info label={gradeLabel} value={evaluation.nota_numerica == null ? 'No registrada' : `${evaluation.nota_numerica}${gradeScale ? ` / ${gradeScale}` : ''}`} />{consensus && <Info label="Evaluación" value="Consenso del tribunal" />}{isLegacyGrade && <Info label="Escala" value="Registro con escala anterior" />}</dl><details className="overflow-hidden rounded-lg border"><summary className="cursor-pointer p-3 text-sm font-semibold">Detalles de la evaluación</summary><dl className="grid gap-2 border-t p-3 text-sm sm:grid-cols-2">{!consensus && <Info label="Evaluador" value={evaluation.evaluador_nombre || 'No registrado'} />}<Info label="Modalidad de registro" value={evaluation.modalidad_registro_display || evaluation.modalidad_registro} /><Info label="Semántica de nota" value={evaluation.semantica_nota || 'No registrada'} /><Info label="Ponderación" value={evaluation.ponderacion ?? 'No registrada'} /><Info label="Aporte" value={evaluation.aporte_ponderado ?? 'No registrado'} /></dl></details></div>
}

function TechnicalCounts({ title, values }) {
  const entries = Object.entries(values || {}).filter(([role, count]) => {
    const normalizedRole = String(role).trim()
    return normalizedRole && normalizedRole !== '-' && count !== null && count !== undefined && count !== '' && count !== '-'
  })
  if (entries.length === 0) return null
  return <div><h4 className="font-semibold">{title}</h4><ul className="mt-1 flex flex-wrap gap-2">{entries.map(([role, count]) => <li key={role} className="rounded border px-2 py-1">{formatTechnicalRole(role)}: {count}</li>)}</ul></div>
}

function sameTechnicalCounts(left, right) {
  const normalize = (value) => Object.entries(value || {})
    .map(([role, count]) => [String(role).trim().toUpperCase(), normalizeTechnicalCount(count)])
    .sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
}

function normalizeTechnicalCount(value) {
  if (value === null || value === undefined || value === '') return value
  const numeric = Number(value)
  return Number.isNaN(numeric) ? String(value).trim() : numeric
}

function formatTechnicalRole(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function formatDefenseDate(value) {
  if (!value) return 'No registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No registrada' : date.toLocaleString('es-BO')
}
