import { Link } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { humanizeRequirementCode } from '../../../services/postulacionesService'
import { formatPeriodoLabel, formatStudentLabel } from '../postulacionFormatters'
import { STATUS_TONE } from '../../../lib/statusTone'
import { MemorandumStatusCard } from './DecisionesAcademicas'
import { Info, RequirementIcon, StageMarker, StatusBadge } from './compartidos'
import { EMPTY, assignmentTypeLabel, formatAcademicClassification, formatCode } from './reglas'

const CLOSURE_TRACKING_DOCUMENT_CODES = ['ACTA_DEFENSA']

function closureDocumentCode(item) {
  return typeof item === 'string' ? item : item?.codigo || item?.code
}

function getClosureTrackingRequirements(cierre, currentStage) {
  if (currentStage?.codigo !== 'CIERRE_DOCUMENTAL') return []
  const required = Array.isArray(cierre?.documentos_requeridos)
    ? cierre.documentos_requeridos
    : [...(cierre?.documentos_aprobados || []), ...(cierre?.documentos_faltantes || [])]
  const approved = new Set((cierre?.documentos_aprobados || []).map(closureDocumentCode))
  const missing = new Set((cierre?.documentos_faltantes || []).map(closureDocumentCode))
  return required
    .map((item) => {
      const codigo = closureDocumentCode(item)
      if (!CLOSURE_TRACKING_DOCUMENT_CODES.includes(codigo)) return null
      const cumplido = approved.has(codigo) ? true : missing.has(codigo) ? false : undefined
      return {
        tipo: 'DOCUMENTO',
        codigo,
        nombre: typeof item === 'object' && item?.nombre ? item.nombre : humanizeRequirementCode(codigo),
        cumplido,
        estado_display: cumplido === true ? 'Aprobado' : cumplido === false ? 'Pendiente' : 'Estado no disponible',
      }
    })
    .filter(Boolean)
}

export function StudentProcessView({ detalle, flujo, cierre, cierreSoportado, progress, canViewDocuments = false, canUploadDocuments = false, orientationOverride, onLoadDefenseRecord, memorandumContract, memorandums, onRetryMemorandums }) {
  const student = detalle.estudiante_detalle
  const period = detalle.periodo_detalle
  const currentStage = flujo.etapa_actual
  const orientation = orientationOverride || flujo.orientacion_etapa_actual
  const requirements = orientation?.requisitos || []
  const stageRequirements = requirements.filter((item) => item.bloquea_siguiente_accion !== false)
  const documentaryChecklist = requirements.filter((item) => item.bloquea_siguiente_accion === false)
  const stages = flujo.etapas || []
  const completed = flujo.etapas_completadas
  const total = flujo.etapas_totales
  const nextAction = orientation?.siguiente_accion
  const institutionManagementPending = nextAction?.codigo === 'GESTIONAR_INSTITUCION'
  const isDocumentAction = nextAction?.destino === '#documentos'
  const requiresDocumentUpload = /^(COMPLETAR|CARGAR|CORREGIR|ACTUALIZAR)_/.test(nextAction?.codigo || '')
  const canNavigateToDocuments = isDocumentAction
    && canViewDocuments
    && (!requiresDocumentUpload || canUploadDocuments)

  return <section className="mx-auto max-w-4xl space-y-5" aria-labelledby="student-process-title">
    <Card className="overflow-hidden border-slate-300 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mi proceso</p>
      <h1 id="student-process-title" className="mt-2 break-words text-3xl font-bold tracking-tight">{detalle.modalidad_detalle?.nombre || flujo.modalidad?.nombre || 'Proceso académico'}</h1>
      <p className="mt-1 text-base font-medium">{student ? formatStudentLabel(student) : EMPTY}</p>
      <p className="mt-1 text-sm text-slate-500">{period ? formatPeriodoLabel(period) : EMPTY}</p>
      <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-800">
        <Info label="Estado general" value={detalle.estado_actual_detalle?.nombre || detalle.estado_actual_detalle?.codigo} />
        <Info label="Etapa actual" value={currentStage?.nombre || 'Sin etapa actual'} />
      </dl>
      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold">Progreso académico</span><span>{progress === null ? EMPTY : `${progress}%`}</span></div>
        {progress !== null && <progress className="mt-2 h-3 w-full" max="100" value={progress} aria-label="Progreso académico">{progress}%</progress>}
        {Number.isInteger(completed) && Number.isInteger(total) && <p className="mt-2 text-sm text-slate-500">{completed} de {total} etapas completadas</p>}
      </div>
    </Card>

    <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">Etapa actual</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold">{currentStage?.nombre || 'Sin etapa actual'}</h2>
        {currentStage?.estado && <StatusBadge value={currentStage.estado_display || formatStatus(currentStage.estado)} positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(currentStage.estado)} tone={STATUS_TONE[currentStage.estado]} />}
      </div>
      <section className="mt-5 border-t border-sky-200 pt-5 dark:border-sky-800" aria-labelledby="student-orientation-title">
        <h3 id="student-orientation-title" className="text-lg font-bold">Qué debes hacer ahora</h3>
        <p className="mt-2 text-sm">{orientation?.mensaje || 'No hay una orientación pendiente para esta etapa.'}</p>
        {detalle.modalidad_detalle?.codigo === 'TRABAJO_DIRIGIDO' && orientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA' && <>
          {detalle.estado_actual_detalle?.codigo !== 'CONCLUIDA' && <p className="mt-2 text-sm">La formalización corresponde al personal administrativo autorizado.</p>}
          {orientation.resultado_final?.nota_final != null && <p className="mt-2 font-semibold">Nota final: {String(orientation.resultado_final.nota_final).replace('.', ',')}/100 — {formatAcademicClassification(orientation.resultado_final.clasificacion)}</p>}
        </>}
        {institutionManagementPending && <p className="mt-2 text-sm">Solicita al personal responsable que registre la institución y el supervisor.</p>}
        {nextAction && !institutionManagementPending && <div className="mt-4 rounded-lg border border-sky-200 bg-white/70 p-4 dark:border-sky-800 dark:bg-slate-900/60">
          <p className="font-semibold">{nextAction.titulo}</p>
          {nextAction.descripcion && <p className="mt-1 text-sm">{nextAction.descripcion}</p>}
          {nextAction.estado && <p className="mt-2 text-sm font-medium">{nextAction.estado_display || formatStatus(nextAction.estado)}</p>}
          {canUploadDocuments && nextAction.codigo === 'CARGAR_ACTA_DEFENSA' && detalle.modalidad_detalle?.codigo === 'TESIS_GRADO'
            ? <Button type="button" className="mt-3" onClick={onLoadDefenseRecord}>Cargar Acta de Defensa</Button>
            : canNavigateToDocuments && <Link className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" to="/documentos">{nextAction.accion_label || 'Ir a documentos'}</Link>}
        </div>}
        {stageRequirements.length > 0 && <div className="mt-5"><h4 className="font-semibold">Requisitos relevantes</h4><ul className="mt-3 space-y-2">{stageRequirements.map((requirement) => <li key={`${requirement.tipo}-${requirement.codigo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 text-sm dark:border-sky-800 dark:bg-slate-900/60"><span className="font-medium">{requirement.nombre}</span><span>{requirement.estado_display || formatStatus(requirement.estado)}</span></li>)}</ul></div>}
        {documentaryChecklist.length > 0 && <div className="mt-5"><h4 className="font-semibold">Checklist documental</h4><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Estos documentos se muestran para seguimiento y no bloquean la siguiente acción académica.</p>{canViewDocuments && canUploadDocuments && <Link className="mt-2 inline-block text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" to="/documentos">Gestionar documentos</Link>}<ul className="mt-3 space-y-2">{documentaryChecklist.map((requirement) => <li key={`${requirement.tipo}-${requirement.codigo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white/70 px-4 py-3 text-sm dark:border-sky-800 dark:bg-slate-900/60"><span className="font-medium">{requirement.nombre}</span><span>{requirement.estado_display || formatStatus(requirement.estado)}</span></li>)}</ul></div>}
      </section>
    </Card>

    <Card className="overflow-hidden" aria-labelledby="student-stages-title">
      <h2 id="student-stages-title" className="text-xl font-bold">Etapas del proceso</h2>
      {stages.length === 0 ? <p className="mt-3 text-sm text-slate-500">El flujo académico todavía no fue inicializado.</p> : <ol className="mt-5">{stages.map((stage) => {
        const isCurrent = stage.id === currentStage?.id
        return <li key={stage.id} aria-current={isCurrent ? 'step' : undefined} className="relative flex gap-4 pb-5 last:pb-0">
          <span aria-hidden="true" className="absolute bottom-0 left-[0.7rem] top-6 w-px bg-slate-200 last:hidden dark:bg-slate-700" />
          <StageMarker state={stage.estado} />
          <div className={`min-w-0 flex-1 rounded-lg border px-4 py-3 text-sm ${isCurrent ? 'border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{stage.nombre}</strong><StatusBadge value={stage.estado_display || formatStatus(stage.estado)} compact positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(stage.estado)} /></div>
            {isCurrent && <p className="mt-1 font-medium text-sky-700 dark:text-sky-300">Etapa actual</p>}
          </div>
        </li>
      })}</ol>}
    </Card>

    {detalle.modalidad_detalle?.codigo === 'PROYECTO_GRADO' && memorandumContract && <MemorandumStatusCard memorandums={memorandums} onRetry={onRetryMemorandums} />}
    <StudentClosureSummary cierre={cierre} supported={cierreSoportado} />
  </section>
}

function StudentClosureSummary({ cierre, supported }) {
  const data = cierre?.data
  let message = 'El estado del cierre técnico todavía no está disponible.'
  if (!supported) message = 'Esta modalidad no requiere un cierre técnico gestionado por el sistema.'
  else if (data?.concluida || data?.estado_general === 'CONCLUIDA') message = 'El proceso se encuentra concluido.'
  else if (data?.cierre_documental_aprobado) message = 'El cierre documental está aprobado; la conclusión técnica permanece pendiente.'
  else if (data) message = 'El cierre técnico permanece pendiente.'

  return <Card className="overflow-hidden" aria-labelledby="student-closure-title">
    <h2 id="student-closure-title" className="text-xl font-bold">Cierre técnico</h2>
    <p className="mt-3 text-sm">{message}</p>
    {supported && data?.estado_general && <p className="mt-2 text-sm text-slate-500">Estado general: {formatStatus(data.estado_general)}</p>}
    {supported && cierre?.error && <p className="mt-2 text-sm text-slate-500">{cierre.error}</p>}
  </Card>
}

function clarifyProjectFinalDocumentOrientation(orientation, isProjectGrade, currentStage) {
  if (!orientation || !isProjectGrade || currentStage?.codigo !== 'DOCUMENTO_FINAL') return orientation
  const clarify = (value) => typeof value === 'string'
    ? value.replaceAll('Documento Final', 'Documento Final del Proyecto de Grado')
    : value
  const action = orientation.siguiente_accion
    ? {
        ...orientation.siguiente_accion,
        titulo: clarify(orientation.siguiente_accion.titulo),
        descripcion: clarify(orientation.siguiente_accion.descripcion),
      }
    : null
  if (action?.codigo === 'COMPLETAR_DOCUMENTOS') {
    action.titulo = 'Completar documentos de Documento Final'
    action.descripcion = 'Presente o corrija los documentos obligatorios de Documento Final.'
  }
  return {
    ...orientation,
    mensaje: action?.codigo === 'COMPLETAR_DOCUMENTOS'
      ? 'Presente o corrija los documentos obligatorios de Documento Final.'
      : clarify(orientation.mensaje),
    siguiente_accion: action,
  }
}

export function OperationalSummary({ directedConclusion, onConcludeDirected, cierre, cierreSoportado, currentStage, orientation, stageApproval, pendingCurrentRequirements = 0, onApproveStage, canApproveStage = false, onGoToDocuments, onOpenDocumentUpload, documentActionPending = false, onProgramDefense, onOpenDefense, programmingContext, canProgramDefense = false, orientationAcademicDecision, onRegisterAcademicDecision, completedStages = 0, totalStages = 0, workflowProgress = null, pendingTechnicalClosure = false, examConclusionPending = false, academicExcellenceResult = null, resultado, concluded, defenses = [], isProjectGrade = false, isExamGrade = false, isAcademicExcellence = false, isThesisGrade = false, isThesisPublicStage = false, publicDefenseMissingRoles = [], canUpload = false, canManageApplications = false, canManageAssignments = false, canManageDefenses = false, canManageEvaluations = false, hideRequirements = false, additionalContent = null, onCompleteAuthorities, onManageActors, onManageMissingActors, canOpenProfileTutor = false, canOpenPrivateSecretary = false, onOpenDictamen, onRegisterTribunalReport }) {
  if (directedConclusion && (concluded || orientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA')) {
    const action = orientation?.siguiente_accion
    const canConclude = !concluded && action?.codigo === 'CONCLUIR_ACADEMICAMENTE' && action.estado === 'DISPONIBLE'
    const finalResult = orientation?.resultado_final || resultado?.data
    return <Card className="overflow-hidden border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950" aria-labelledby="directed-conclusion-title">
      <p className="text-xs font-bold uppercase tracking-[0.16em]">Orientación del expediente</p>
      <h2 id="directed-conclusion-title" className="mt-2 text-xl font-bold">{concluded ? 'Proceso académico concluido' : action?.titulo}</h2>
      <p className="mt-3 text-sm">{orientation?.mensaje || 'La conclusión académica está formalizada. Puedes consultar el resultado final de la postulación.'}</p>
      {finalResult?.nota_final != null && <p className="mt-3 font-semibold">Nota final: {String(finalResult.nota_final).replace('.', ',')}/100 — {formatAcademicClassification(finalResult.clasificacion)}</p>}
      {!concluded && !canManageApplications && <p className="mt-3 text-sm">La formalización corresponde al personal administrativo autorizado.</p>}
      {canConclude && directedConclusion.allowed && <Button className="mt-4" type="button" disabled={directedConclusion.submitting || directedConclusion.done} onClick={onConcludeDirected}>{directedConclusion.submitting ? 'Concluyendo…' : directedConclusion.done ? 'Actualizando expediente…' : 'Concluir académicamente'}</Button>}
      {!concluded && !canConclude && action?.destino && <a className="mt-4 mr-4 inline-block font-semibold text-sky-700 hover:underline dark:text-sky-300" href={action.destino}>{action.accion_label || 'Revisar bloqueo'}</a>}
      <a className="mt-4 ml-4 inline-block font-semibold text-sky-700 hover:underline dark:text-sky-300" href="#resultado-y-cierre">Consultar resultado</a>
      {directedConclusion.error && <p role="alert" className="mt-3 text-sm text-red-600">{directedConclusion.error}</p>}
    </Card>
  }
  if (isAcademicExcellence && academicExcellenceResult) {
    const favorable = academicExcellenceResult.estado === 'FAVORABLE'
    const showAverage = academicExcellenceResult.criterio === 'RENDIMIENTO_ACADEMICO'
      && academicExcellenceResult.promedioGeneral !== null
      && academicExcellenceResult.promedioGeneral !== undefined
      && academicExcellenceResult.promedioGeneral !== ''
    return <Card className="expediente-summary">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-200">Orientación del expediente</p>
      <h2 className="expediente-summary-title">Resultado académico final</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div><dt className="text-xs uppercase text-slate-500">Conclusión académica</dt><dd className="font-semibold">Aprobada</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Resultado académico</dt><dd className="font-semibold"><StatusBadge value={favorable ? 'Favorable' : 'Desfavorable'} positive={favorable} /></dd></div>
        {showAverage && <div><dt className="text-xs uppercase text-slate-500">Promedio académico</dt><dd className="font-semibold">{academicExcellenceResult.promedioGeneral}</dd></div>}
      </dl>
      <p className="mt-4 text-sm">La conclusión académica está registrada independientemente del estado administrativo general de la postulación.</p>
      <p className="mt-2 text-sm">{concluded ? 'La conclusión de la postulación está formalizada.' : 'Falta formalizar la conclusión de la postulación.'}</p>
    </Card>
  }
  if (concluded) return <Card className="expediente-summary expediente-summary--done">
    <h2 className="expediente-summary-title" data-tone="success"><CircleCheck className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden="true" />Expediente concluido</h2>
    <p className="text-[var(--text-secondary)]">{cierreSoportado ? 'Todas las etapas académicas y el cierre documental se encuentran completados.' : 'Todas las etapas académicas se encuentran completadas.'}</p>
    <div className="expediente-summary-score"><strong>Nota final: {isExamGrade && resultado?.data?.nota_final != null ? String(resultado.data.nota_final).replace('.', ',') : resultado?.data?.nota_final ?? 'No registrada'}{isExamGrade && resultado?.data?.nota_final != null ? '/100' : ''}</strong>{resultado?.data?.clasificacion && <StatusBadge value={formatAcademicClassification(resultado.data.clasificacion)} positive />}</div>
  </Card>
  if (examConclusionPending) return <Card className="expediente-summary">
    <p className="sr-only">Orientación del expediente</p>
    <h2 className="expediente-summary-title">Conclusión de la postulación pendiente</h2>
    <section className="expediente-tile" aria-labelledby="exam-conclusion-guidance-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="exam-conclusion-guidance-title" className="text-lg font-bold">Flujo académico completado</h3><p className="mt-1 text-sm text-slate-500">{completedStages} de {totalStages} etapas completadas · {workflowProgress}% de etapas</p></div>
        <StatusBadge value="Aprobada" positive />
      </div>
    </section>
    <div className="mt-4 flex flex-wrap items-center gap-3"><strong className="text-2xl">Calificación final: {String(resultado.data.nota_final).replace('.', ',')}/100</strong>{resultado.data.clasificacion && <StatusBadge value={formatAcademicClassification(resultado.data.clasificacion)} positive />}</div>
    <p className="mt-4 text-sm">El flujo académico terminó, pero la postulación continúa En proceso. Falta ejecutar la conclusión de la postulación con la operación administrativa existente.</p>
    <a className="expediente-link" href="#examen">Ir a concluir académicamente</a>
  </Card>
  if (pendingTechnicalClosure) return <Card className="expediente-summary">
    <h2 className="expediente-summary-title">Cierre técnico del expediente</h2>
    <section className="expediente-tile" aria-labelledby="technical-closure-guidance-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="technical-closure-guidance-title" className="text-lg font-bold">Flujo académico completado</h3><p className="mt-1 text-sm text-slate-500">{completedStages} de {totalStages} etapas completadas · {workflowProgress}% de etapas</p></div>
        <StatusBadge value="Flujo académico completado" positive />
      </div>
    </section>
    <p className="mt-4 text-sm">Todas las etapas del proceso académico fueron aprobadas. La postulación aún está en proceso y requiere completar el cierre técnico.</p>
    <a className="expediente-link" href="#condiciones-tecnicas">Gestionar cierre técnico</a>
  </Card>
  const stageMessage = currentStage?.estado === 'PENDIENTE'
    ? canManageApplications
      ? 'La etapa está lista para iniciarse.'
      : 'Esta etapa está pendiente de inicio por el personal responsable.'
    : ['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado)
      ? 'La etapa se encuentra en curso. Revisa la información y las acciones disponibles.'
      : 'No existe una etapa actual disponible.'
  const operationIsCurrent = ['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado)
    || orientation?.operacion === 'ORIENTAR_CONCLUSION_ACADEMICA'
    || (isAcademicExcellence && orientation?.operacion === 'CONFIGURAR_EXCELENCIA')
    || orientation?.siguiente_accion?.codigo === 'GESTIONAR_INSTITUCION'
    || currentStage?.estado == null
  const effectiveOrientation = operationIsCurrent
    ? clarifyProjectFinalDocumentOrientation(orientation, isProjectGrade, currentStage)
    : null
  const requirements = [...(effectiveOrientation?.requisitos || []), ...getClosureTrackingRequirements(cierre, currentStage)]
  const pendingClosureTrackingDocuments = requirements.filter((item) => item.tipo === 'DOCUMENTO' && CLOSURE_TRACKING_DOCUMENT_CODES.includes(item.codigo) && item.cumplido === false)
  const publicAuthoritiesCapability = effectiveOrientation?.siguiente_accion?.capacidades
  const supportsPublicAuthoritiesDialog = isProjectGrade
    || publicAuthoritiesCapability?.modal === 'PUBLIC_AUTHORITIES'
  const publicAuthorityRequirements = supportsPublicAuthoritiesDialog && currentStage?.codigo === 'DEFENSA_PUBLICA'
    ? requirements.filter((item) => ['PRESIDENTE', 'SECRETARIO'].includes(item.codigo))
    : []
  const publicAuthorityConflict = publicAuthorityRequirements.some((item) => item.conflicto_identidad === true)
    || (effectiveOrientation?.conflictos_identidad || []).length > 0
  const publicAuthorityAction = canManageAssignments
    && supportsPublicAuthoritiesDialog
    && currentStage?.codigo === 'DEFENSA_PUBLICA'
    && ['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado)
    && publicAuthorityRequirements.some((item) => item.cumplido === false)
    && (publicAuthoritiesCapability?.permite_identidad_reutilizada || !publicAuthorityConflict)
  const profileDefenseCandidates = isProjectGrade && currentStage?.codigo === 'PERFIL_PROYECTO'
    && currentStage?.activo !== false && currentStage?.id != null && currentStage?.numero_intento != null
    ? defenses.filter((defense) => defense.tipo_evento === 'DEFENSA_PERFIL'
      && String(defense.seguimiento_etapa) === String(currentStage.id)
      && Number(defense.numero_intento) === Number(currentStage.numero_intento)
      && defense.estado !== 'CANCELADA'
      && defense.activo !== false)
    : []
  const profileDefense = profileDefenseCandidates.length === 1 ? profileDefenseCandidates[0] : null
  const privateDefenseCandidates = isProjectGrade && currentStage?.codigo === 'DEFENSA_PRIVADA'
    && currentStage?.id != null && currentStage?.numero_intento != null
    ? defenses.filter((defense) => defense.tipo_evento === 'DEFENSA_PRIVADA'
      && String(defense.seguimiento_etapa) === String(currentStage.id)
      && Number(defense.numero_intento) === Number(currentStage.numero_intento)
      && defense.estado !== 'CANCELADA'
      && defense.activo !== false)
    : []
  const privateDefense = privateDefenseCandidates.length === 1 ? privateDefenseCandidates[0] : null
  const publicDefenseCandidates = isProjectGrade && currentStage?.codigo === 'DEFENSA_PUBLICA'
    && currentStage?.id != null && currentStage?.numero_intento != null
    ? defenses.filter((defense) => defense.tipo_evento === 'DEFENSA_PUBLICA'
      && String(defense.seguimiento_etapa) === String(currentStage.id)
      && Number(defense.numero_intento) === Number(currentStage.numero_intento)
      && defense.estado !== 'CANCELADA'
      && defense.activo !== false)
    : []
  const publicDefense = publicDefenseCandidates.length === 1 ? publicDefenseCandidates[0] : null
  const profileEvaluation = profileDefense?.evaluaciones?.some((item) => item.tipo_evaluacion !== 'RESULTADO_FINAL')
  const profileDefenseAction = profileDefense ? {
    codigo: 'CONSULTAR_DEFENSA_PERFIL',
    titulo: profileDefense.estado === 'PROGRAMADA'
      ? 'Continuar Defensa de Perfil programada'
      : profileDefense.estado === 'EN_CURSO'
        ? 'Gestionar y finalizar Defensa de Perfil'
        : profileDefense.estado === 'FINALIZADA' && !profileEvaluation
          ? 'Registrar evaluación de Perfil'
          : profileDefense.estado === 'FINALIZADA' && !profileDefense.resultado_consolidado
            ? 'Consolidar resultado de Perfil'
            : 'Ver Defensa de Perfil',
    descripcion: 'Abre la defensa vinculada a esta etapa para continuar con las acciones habilitadas por su estado.',
    estado: 'DISPONIBLE',
    estado_display: 'Disponible',
    destino: '#defensas',
    accion_label: 'Ir a la defensa',
    requiredCapability: ['PROGRAMADA', 'EN_CURSO'].includes(profileDefense.estado) ? 'DEFENSE_MANAGEMENT'
      : profileDefense.estado === 'FINALIZADA' && (!profileEvaluation || !profileDefense.resultado_consolidado) ? 'EVALUATION_MANAGEMENT'
        : null,
    waitingMessage: profileDefense.estado === 'EN_CURSO'
      ? 'La defensa está pendiente de finalización por el personal responsable.'
      : profileDefense.estado === 'FINALIZADA' && !profileEvaluation
        ? 'La evaluación está pendiente de registro por el personal responsable.'
        : profileDefense.estado === 'FINALIZADA' && !profileDefense.resultado_consolidado
          ? 'El resultado está pendiente de consolidación por el personal responsable.'
          : profileDefense.estado === 'PROGRAMADA'
            ? 'La defensa programada está pendiente de gestión por el personal responsable.'
            : 'No necesitas realizar ninguna acción por el momento.',
  } : null
  const orientationAction = effectiveOrientation?.siguiente_accion
  const studentMustWaitForApproval = !canManageApplications && orientationAction?.codigo === 'APROBAR_ETAPA'
  const closureDocumentAction = pendingClosureTrackingDocuments.length > 0
    ? {
        codigo: 'COMPLETAR_DOCUMENTOS',
        titulo: 'Cargar documentos',
        descripcion: 'Carga los documentos de seguimiento pendientes para continuar con el cierre documental.',
        estado: 'PENDIENTE',
        estado_display: 'Pendiente',
        destino: '#documentos',
        accion_label: 'Gestionar documentos',
      }
    : null
  const nextAction = profileDefenseAction || closureDocumentAction || (studentMustWaitForApproval ? null : orientationAction)
  const assignmentActionUnavailable = nextAction?.requiere_permiso === 'GESTIONAR_ASIGNACIONES' && !canManageAssignments
  const profileActionAvailable = profileDefenseAction?.requiredCapability === 'DEFENSE_MANAGEMENT'
    ? canManageDefenses
    : profileDefenseAction?.requiredCapability === 'EVALUATION_MANAGEMENT'
      ? canManageEvaluations
      : true
  const administrativeActionPending = Boolean(profileDefenseAction?.requiredCapability && !profileActionAvailable)
  const personalDocumentAction = !profileDefenseAction && nextAction?.destino === '#documentos' && canUpload
  const managesMissingPublicActors = publicDefenseMissingRoles.length > 0 && nextAction?.destino === '#actores'
  const thesisAuthoritiesAction = isThesisPublicStage && managesMissingPublicActors
    && nextAction?.accion_label === 'Completar autoridades'
  const nextActionTitle = isThesisPublicStage && publicDefenseMissingRoles.length === 0 && nextAction?.codigo === 'PROGRAMAR_EVENTO'
    ? 'Programar Defensa Pública'
    : nextAction?.titulo
  const visibleNextActionTitle = nextActionTitle
  const stageRequirements = requirements.filter((item) => item.bloquea_siguiente_accion !== false)
  const documentaryChecklist = requirements.filter((item) => item.bloquea_siguiente_accion === false)
  const completedRequirements = stageRequirements.filter((item) => item.cumplido).length
  const approvalMissingLabels = Array.isArray(stageApproval?.fields?.faltantes)
    ? stageApproval.fields.faltantes.map(humanizeRequirementCode).join(', ')
    : ''
  const orientationMessage = approvalMissingLabels
    ? `Falta completar: ${approvalMissingLabels}.`
    : publicAuthorityAction
      ? effectiveOrientation?.mensaje || 'Completa las autoridades requeridas para continuar con la Defensa Pública.'
    : studentMustWaitForApproval
    ? isProjectGrade && currentStage?.codigo === 'DOCUMENTO_FINAL'
      ? 'El Documento Final del Proyecto de Grado está aprobado. Espera la aprobación de la etapa por el personal responsable.'
      : currentStage?.codigo === 'DOCUMENTO_FINAL'
        ? 'El Documento Final está aprobado. Espera la aprobación de la etapa por el personal responsable.'
        : `La aprobación de ${currentStage?.nombre || 'esta etapa'} está pendiente del personal responsable.`
    : effectiveOrientation?.mensaje || stageMessage
  const visibleOrientationAction = approvalMissingLabels ? null : nextAction
  const isThesisProfileAction = isThesisGrade && currentStage?.codigo === 'PERFIL_TESIS'
    && visibleOrientationAction?.codigo === 'COMPLETAR_PERFIL'
  const profileDocumentRequirements = isThesisProfileAction
    ? stageRequirements.filter((item) => item.destino === '#documentos' && item.codigo)
    : []
  const pendingProfileDocumentCodes = profileDocumentRequirements
    .filter((item) => item.cumplido === false).map((item) => item.codigo)
  const canResolveProfileDocuments = isThesisProfileAction && canUpload && pendingProfileDocumentCodes.length > 0
  const onlyProfileTutorPending = isThesisProfileAction && profileDocumentRequirements.length > 0
    && profileDocumentRequirements.every((item) => item.cumplido === true)
    && stageRequirements.some((item) => item.codigo === 'TUTOR' && item.cumplido === false && item.destino === '#actores')
    && stageRequirements.filter((item) => item.cumplido === false).every((item) => item.codigo === 'TUTOR')
  const isDocumentUploadAction = ['COMPLETAR_DOCUMENTOS', 'CARGAR_HOJA_APROBACION'].includes(visibleOrientationAction?.codigo)
  const isThesisActaUpload = isThesisGrade && visibleOrientationAction?.codigo === 'CARGAR_ACTA_DEFENSA'
  const navigatesToDocumentUpload = visibleOrientationAction?.codigo === 'CARGAR_HOJA_APROBACION'
    || pendingClosureTrackingDocuments.length > 0
  const canNavigateToDocumentUpload = isDocumentUploadAction && canUpload
  const canOpenDocumentUpload = canNavigateToDocumentUpload
  const canOpenDefenseProgramming = nextAction?.codigo === 'PROGRAMAR_EVENTO'
    && canProgramDefense
    && Boolean(programmingContext)
  const canOpenAcademicDecision = nextAction?.codigo === 'REGISTRAR_DECISION'
    && Boolean(orientationAcademicDecision)
    && !isThesisGrade
  return <Card className="expediente-summary">
    <p className="sr-only">Orientación del expediente</p>
    <h2 className="expediente-summary-title">{administrativeActionPending ? 'Gestión administrativa pendiente' : 'Qué debes hacer ahora'}</h2>
    <div className="expediente-summary-main">
    <section className="expediente-tile" aria-labelledby="current-stage-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="current-stage-title" className="text-lg font-bold">{currentStage?.nombre || formatCode(cierre?.etapa_actual) || 'Sin etapa pendiente'}</h3><p className="mt-1 text-sm text-slate-500">{totalStages ? `${completedStages} de ${totalStages} etapas completadas` : 'Flujo académico sin etapas registradas'}</p></div>
        {currentStage?.estado && <StatusBadge value={currentStage.estado_display || formatStatus(currentStage.estado)} positive={['APROBADA', 'COMPLETADA', 'CERRADA'].includes(currentStage.estado)} tone={STATUS_TONE[currentStage.estado]} />}
      </div>
    </section>
    {isExamGrade && resultado?.data?.nota_final != null && <div className="mt-4 flex flex-wrap items-center gap-3"><strong className="text-2xl">Calificación final: {String(resultado.data.nota_final).replace('.', ',')}/100</strong>{resultado.data.clasificacion && <StatusBadge value={formatAcademicClassification(resultado.data.clasificacion)} positive />}</div>}
    {(approvalMissingLabels || administrativeActionPending || publicAuthorityAction || visibleOrientationAction) && <p className="mt-4 text-sm">{orientationMessage}</p>}
    {approvalMissingLabels ? <section className="expediente-next" aria-labelledby="missing-document-action-title">
      <h3 id="missing-document-action-title" className="text-lg font-bold">Siguiente acción</h3>
      <p className="mt-1 text-sm">Completa el documento pendiente para volver a intentar la aprobación.</p>
      <Button className="mt-3" onClick={onGoToDocuments}>Ir a documentos</Button>
      {stageApproval.error && <p role="alert" className="mt-2 text-sm text-red-600">{stageApproval.error}</p>}
    </section> : administrativeActionPending ? <section className="expediente-next" aria-labelledby="administrative-action-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 id="administrative-action-title" className="text-lg font-bold">En espera del personal responsable</h3><p className="mt-1 text-sm">{profileDefenseAction.waitingMessage}</p></div><StatusBadge value="Pendiente" compact /></div>
      <a className="expediente-link" href="#defensas">Ver defensa</a>
    </section> : publicAuthorityAction ? <section className="expediente-next" aria-labelledby="public-authority-action-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 id="public-authority-action-title" className="text-lg font-bold">Siguiente acción</h3><p className="mt-1 font-semibold">{effectiveOrientation?.siguiente_accion?.titulo || 'Completar autoridades'}</p><p className="mt-1 text-sm">{effectiveOrientation?.siguiente_accion?.descripcion || 'Completa las autoridades requeridas para continuar con la Defensa Pública.'}</p></div><StatusBadge value="Pendiente" compact /></div>
      <p className="mt-2 text-sm">Pendientes: {publicAuthorityRequirements.filter((item) => item.cumplido === false).map((item) => item.nombre).join(', ')}.</p>
      <Button className="mt-3" type="button" onClick={onCompleteAuthorities}>{effectiveOrientation?.siguiente_accion?.accion_label || 'Completar autoridades'}</Button>
    </section> : visibleOrientationAction ? <section className="expediente-next" aria-labelledby="next-action-title" data-personal-action={personalDocumentAction || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 id="next-action-title" className="text-lg font-bold">Siguiente acción</h3><p className="mt-1 font-semibold">{visibleNextActionTitle}</p><p className="mt-1 text-sm">{nextAction.descripcion}</p></div>
        {nextAction.estado && <StatusBadge value={nextAction.estado_display || nextAction.estado} positive={nextAction.estado === 'COMPLETADA'} compact />}
      </div>
      {managesMissingPublicActors && <div className="expediente-next-detail"><p className="font-semibold">Para programar la Defensa Pública faltan:</p><ul className="mt-2 list-disc pl-5">{publicDefenseMissingRoles.map((role) => <li key={role}>{assignmentTypeLabel(role)}</li>)}</ul></div>}
      {nextAction.codigo === 'APROBAR_ETAPA' ? canApproveStage ? <>
        <Button type="button" className="mt-3" disabled={stageApproval.submitting} onClick={onApproveStage}>{stageApproval.submitting ? 'Procesando…' : nextAction.accion_label || nextAction.titulo || `Aprobar ${currentStage?.nombre || formatCode(currentStage?.codigo) || 'etapa'}`}</Button>
        {pendingCurrentRequirements > 0 && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Hay {pendingCurrentRequirements} {pendingCurrentRequirements === 1 ? 'requisito pendiente' : 'requisitos pendientes'}. El backend realizará la validación definitiva al aprobar.</p>}
      </> : null
        : onlyProfileTutorPending && canManageAssignments ? <a className="expediente-link" href="#actores" onClick={canOpenProfileTutor ? (event) => { event.preventDefault(); event.stopPropagation(); onManageActors(event) } : undefined}>Ir a actores</a>
          : canResolveProfileDocuments ? <button type="button" disabled={documentActionPending} className="expediente-link" onClick={() => onOpenDocumentUpload(false, pendingProfileDocumentCodes)}>{nextAction.accion_label || 'Ir a documentos'}</button>
          : isThesisActaUpload ? canUpload && <Button type="button" disabled={documentActionPending} className="mt-3" onClick={() => onOpenDocumentUpload(false, 'ACTA_DEFENSA')}>Cargar Acta de Defensa</Button>
          : canOpenDocumentUpload ? <button type="button" className="expediente-link" onClick={() => onOpenDocumentUpload(navigatesToDocumentUpload)}>Gestionar documentos</button>
          : canNavigateToDocumentUpload ? <a className="expediente-link" href="#documentos" onClick={(event) => { event.preventDefault(); onGoToDocuments() }}>Gestionar documentos</a>
            : canOpenAcademicDecision ? <button type="button" className="expediente-link" onClick={() => onRegisterAcademicDecision(orientationAcademicDecision)}>{nextAction.accion_label || 'Ir a gestionar'}</button>
            : nextAction.codigo === 'REGISTRAR_INFORME_TRIBUNAL' && nextAction.estado === 'DISPONIBLE' && onRegisterTribunalReport
              ? <button type="button" className="expediente-link" onClick={onRegisterTribunalReport}>{nextAction.accion_label}</button>
            : thesisAuthoritiesAction && onManageMissingActors ? <button type="button" className="expediente-link" onClick={onManageMissingActors}>Completar autoridades</button>
            : canOpenDefenseProgramming ? <button type="button" className="expediente-link" onClick={onProgramDefense}>{nextAction.accion_label || 'Ir a gestionar'}</button>
          : profileDefenseAction && profileDefense && onOpenDefense
            ? <button type="button" className="expediente-link" onClick={(event) => { event.preventDefault(); onOpenDefense(profileDefense) }}>{nextAction.accion_label}</button>
            : isProjectGrade && currentStage?.codigo === 'DEFENSA_PRIVADA'
              && nextAction.destino === '#defensas' && nextAction.estado === 'DISPONIBLE'
              && privateDefense && onOpenDefense
              ? <button type="button" className="expediente-link" onClick={(event) => { event.preventDefault(); onOpenDefense(privateDefense) }}>{nextAction.accion_label || 'Ir a gestionar'}</button>
            : isProjectGrade && currentStage?.codigo === 'DEFENSA_PUBLICA'
              && nextAction.destino === '#defensas' && nextAction.estado === 'DISPONIBLE'
              && publicDefense && onOpenDefense
              ? <button type="button" className="expediente-link" onClick={(event) => { event.preventDefault(); onOpenDefense(publicDefense) }}>{nextAction.accion_label || 'Ir a gestionar'}</button>
            : nextAction.destino && !assignmentActionUnavailable && (!isDocumentUploadAction || canNavigateToDocumentUpload) && <a className="expediente-link" href={nextAction.destino} onClick={nextAction.codigo === 'REGISTRAR_DICTAMEN' && onOpenDictamen ? onOpenDictamen : (nextAction.codigo === 'GESTIONAR_ACTORES' || canOpenPrivateSecretary) ? (event) => { event.preventDefault(); if (canOpenPrivateSecretary) event.stopPropagation(); onManageActors(event) } : managesMissingPublicActors ? onManageMissingActors : undefined}>{nextAction.codigo === 'REGISTRAR_INFORME_TRIBUNAL' ? 'Consultar revisión del Tribunal' : nextAction.accion_label || 'Ir a gestionar'}</a>}
      {nextAction.codigo === 'APROBAR_ETAPA' && stageApproval.error && <p role="alert" className="mt-2 text-sm text-red-600">{stageApproval.error}</p>}
    </section> : <section className="expediente-next expediente-locked" aria-labelledby="next-action-locked-title">
      <h3 id="next-action-locked-title">Siguiente acción</h3>
      <p className="mt-1 text-sm">{orientationMessage}</p>
    </section>}
    </div>
    {!hideRequirements && (stageRequirements.length > 0 || documentaryChecklist.length > 0) && <div className="expediente-summary-side">
    {stageRequirements.length > 0 && <section className="expediente-summary-block" aria-labelledby="stage-requirements-title">
      <h3 id="stage-requirements-title" className="text-lg font-bold">Requisitos de esta etapa</h3>
      <ul className="mt-3 space-y-2">{stageRequirements.map((item) => (
        <li key={`${item.tipo}-${item.codigo}`} className="expediente-req">
            <span className="expediente-req-name"><RequirementIcon value={item.cumplido} />{item.nombre}</span>
            {item.actual !== undefined && item.minimo !== undefined ? <span className="expediente-req-figures"><span className="font-semibold">{item.actual} vigentes</span><span className="expediente-req-min">Mínimo requerido: {item.minimo}</span><span className={item.cumplido === true ? 'font-semibold text-emerald-700 dark:text-emerald-300' : item.cumplido === false ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-sky-700 dark:text-sky-300'}>{item.cumplido === true ? 'Requisito cumplido' : item.cumplido === false ? 'Pendiente' : item.estado_display}</span></span> : <span className={item.cumplido === true ? 'font-semibold text-emerald-700 dark:text-emerald-300' : item.cumplido === false ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-sky-700 dark:text-sky-300'}>{item.estado_display}</span>}
            {item.destino && item.destino !== nextAction?.destino && !(publicAuthorityAction && ['PRESIDENTE', 'SECRETARIO'].includes(item.codigo)) && <a className="expediente-req-link" href={item.destino} onClick={canOpenProfileTutor && item.codigo === 'TUTOR' && item.cumplido === false && item.destino === '#actores' ? (event) => { event.preventDefault(); event.stopPropagation(); onManageActors(event) } : undefined}>Ir a gestionar</a>}
        </li>
      ))}</ul>
      <p className="mt-3 text-sm font-semibold">{completedRequirements} de {stageRequirements.length} cumplidos</p>
    </section>}
    {documentaryChecklist.length > 0 && <section className="expediente-summary-block" aria-labelledby="documentary-checklist-title">
      <h3 id="documentary-checklist-title" className="text-lg font-bold">Checklist documental</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Seguimiento de documentos; estos pendientes no bloquean la siguiente acción académica.</p>
      <ul className="mt-3 space-y-2">{documentaryChecklist.map((item) => (
        <li key={`${item.tipo}-${item.codigo}`} className="expediente-req">
          <span className="expediente-req-name"><RequirementIcon value={item.cumplido === true} />{item.nombre}</span>
          <span className={item.cumplido === true ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-amber-700 dark:text-amber-300'}>{item.estado_display}</span>
          {canUpload && item.destino && <a className="expediente-req-link" href={item.destino}>Ir a documentos</a>}
        </li>
      ))}</ul>
      <p className="mt-3 text-sm font-semibold">{documentaryChecklist.filter((item) => item.cumplido).length} de {documentaryChecklist.length} documentos aprobados</p>
    </section>}
    </div>}
    {!hideRequirements && !additionalContent && stageRequirements.length === 0 && documentaryChecklist.length === 0 && <div className="expediente-summary-side">
      <section className="expediente-summary-block expediente-locked" aria-labelledby="stage-requirements-locked-title">
        <h3 id="stage-requirements-locked-title">Requisitos</h3>
        <p className="mt-1 text-sm">{['EN_PROCESO', 'OBSERVADA'].includes(currentStage?.estado) ? 'Esta etapa no tiene requisitos registrados.' : 'Se mostrarán cuando haya una etapa en curso.'}</p>
      </section>
    </div>}
    {additionalContent && <div className="expediente-summary-extra">{additionalContent}</div>}
  </Card>
}

export function InscriptionDocumentsSection({ requirements, completed, total, embedded = false, title = 'Requisitos de Inscripción', documentationTitle = 'Documentación de Inscripción', titleId = 'inscription-requirements-title', documentationTitleId = 'inscription-documents-title' }) {
  const Heading = embedded ? 'h3' : 'h2'
  const Subheading = embedded ? 'h4' : 'h3'
  return <Card className={embedded ? 'overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none' : 'overflow-hidden'} aria-labelledby={titleId}>
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <Heading id={titleId} className="text-xl font-bold">{title}</Heading>
      <p className="font-semibold text-slate-700 dark:text-slate-200">{completed} de {total} cumplidos</p>
    </div>
    <section className={embedded ? 'mt-3' : 'mt-6 border-t border-slate-200 pt-5 dark:border-slate-700'} aria-labelledby={documentationTitleId}>
      <Subheading id={documentationTitleId} className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">{documentationTitle}</Subheading>
      <ul className={embedded ? 'mt-3 space-y-2' : 'mt-4 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700'}>
        {requirements.map((item) => <li key={item.codigo} className={embedded
          ? 'expediente-req'
          : 'flex flex-wrap items-center justify-between gap-3 py-3'}>
          <span className="expediente-req-name"><RequirementIcon value={Boolean(item.cumplido)} />{item.nombre}</span>
          <span className={item.cumplido ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-amber-700 dark:text-amber-300'}>{item.estado_display}</span>
        </li>)}
      </ul>
    </section>
  </Card>
}

function formatStatus(value) {
  const text = formatCode(value).toLocaleLowerCase('es-BO')
  return text ? text.charAt(0).toLocaleUpperCase('es-BO') + text.slice(1) : EMPTY
}
