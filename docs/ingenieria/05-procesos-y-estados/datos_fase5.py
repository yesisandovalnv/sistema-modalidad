"""Modelos dinámicos curados. No importa el producto ni interpreta choices como workflow."""
import json
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
CASES=json.loads((BASE/'03-casos-de-uso/registro-fase-4.json').read_text(encoding='utf-8'))
BY_ID={c['id']:c for c in CASES}
PROCESSES=[]
VIEWS=[]


def process(key,title,ids,critical,variant='Compartido; las políticas conservan el alcance académico de cada modalidad.'):
    selected=[BY_ID['UC-'+i] for i in ids.split()]
    PROCESSES.append(dict(id=key,title=title,cases=[c['id'] for c in selected],critical=critical,variant=variant))


def view(id,title,kind,process,body,refs='',limitations='Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.',transitions=None):
    VIEWS.append(dict(id=id,title=title,type=kind,process=process,body=body.strip(),refs=refs.split(),limitations=limitations,transitions=transitions or []))


def activity(id,title,process,steps,checks,refs='',limitations=''):
    body=['|Operador API|','start',':Solicitar la operación indicada;','|Backend|']
    for i,step in enumerate(steps):
        body.append(':'+step+';')
        if i in checks:
            body += ['if ('+checks[i]+') then (sí)','else (no)',':Rechazar la solicitud;','stop','endif']
    body += [':Devolver el resultado de la operación;','stop']
    view(id,title,'Actividades',process,'\n'.join(body),refs,limitations or 'Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.')


process('PROC-SYS-001','Autenticación y sesión','USR-001 USR-003 USR-004 USR-005 USR-009','Credenciales, throttling, renovación y revocación.')
process('PROC-USR-001','Administración de cuentas y roles','USR-002 USR-006','Autoridad administrativa y protección de superusuario.')
process('PROC-ACA-001','Catálogos y documentación oficial','ACA-001 ACA-002 ACA-003 ACA-004 ACA-005 ACA-006 ACA-007 POS-028 DOC-007 DOC-008','Separar lecturas autenticadas y escritura administrativa; métodos prohibidos.')
process('PROC-POS-001','Registro, consulta y estado general','POS-001 POS-002 POS-010 POS-011 POS-024 POS-025','Unicidad vigente, alta histórica, PATCH distinto de conclusión.')
process('PROC-POS-002','Inicialización, inscripción y seguimiento','POS-003 POS-005 POS-008 POS-009 POS-012 POS-013 POS-014 POS-015','Guarda de etapa, decisiones, rechazo, reintento y conclusión.')
process('PROC-POS-003','Asignaciones y elegibilidad contextual','USR-007 USR-008 POS-004 POS-016 POS-017','Ocupación, incompatibilidad, reemplazo y preservación histórica.')
process('PROC-DOC-001','Carga, versiones y evidencia histórica','DOC-001 DOC-006','Archivo fuera de rollback SQL, contexto y autoaprobaciones específicas.')
process('PROC-DOC-002','Lectura y descarga documental','DOC-003','Alcance por vínculo y publicación vigente de memorandos.')
process('PROC-DOC-003','Revisión documental','DOC-002','ENV/APR/REC y observaciones no equivalentes a un estado OBS.')
process('PROC-DOC-004','Corrección y confirmación técnica','DOC-004 DOC-005','Administración; observación, versión y confirmación son dimensiones separadas.')
process('PROC-POS-004','Ciclo de defensa, participantes y asistencia','POS-006 POS-018 POS-019 POS-020','Fecha, quórum, asistencia y mutaciones administrativas.')
process('PROC-POS-005','Evaluación y consolidación','POS-007 POS-021 POS-022','Escala, individual/consenso, consolidado único y efectos sobre etapa.')
process('PROC-POS-006','Condiciones y entrega física','POS-023 POS-026 POS-027','Verificación única, recepción absoluta de cantidades y lotes atómicos.')
process('PROC-NOT-001','Notificación interna y lectura','NOT-001 NOT-002','on_commit robusto, destinatarios y deduplicación; lectura propia.')
process('PROC-REP-001','Reportes y exportación','REP-001 REP-002 REP-003 REP-004','Administración/docente acotado; exportación administrativa.')
for scope,group,title,ids in [
 ('PG','proyecto','Proyecto de Grado','PG-001 PG-002'),
 ('TG','tesis','Tesis de Grado','TG-001'),
 ('TD','trabajo','Trabajo Dirigido','TD-001 TD-002 TD-003 TD-004'),
 ('EG','examen','Examen de Grado','EG-001 EG-002 EG-003'),
 ('EA','excelencia','Excelencia Académica','EA-001 EA-002 EA-003 EA-004'),
 ('DIP','diplomado','Vía Diplomado','DIP-001 DIP-002 DIP-003')]:
    process('PROC-'+scope+'-001',title,ids,'Reglas y conclusión propias, sin extrapolar la política de Proyecto.',title+'; usa infraestructura común con política específica.')

activity('DIA-USR-060','Acceso, sesión y renovación','PROC-SYS-001',[
 'Seleccionar login por contraseña, R.U./C.I., refresh, logout o perfil',
 'Validar el payload y la guarda de la variante\nLogin estudiantil: cuenta existente, activa, sin staff/superusuario y control de intentos',
 'Procesar authenticate, emisión/renovación JWT o blacklist según la ruta\nPerfil: serializar usuario y capacidades',
],{1:'Credenciales/token y permisos de la variante válidos'},
 'apps/usuarios/views.py:CustomTokenObtainPairView.post apps/usuarios/student_auth.py:authenticate_student src/services/api.js')
activity('DIA-USR-061','Mantenimiento de usuarios y roles','PROC-USR-001',[
 'Aplicar IsAuthenticated, IsActiveUser y CanManageUsers',
 'Elegir la operación admitida por los mixins\nUsuario: sin DELETE; rol: destroy con captura ProtectedError',
 'Validar serializer y permiso sobre la cuenta superusuario',
 'Consultar o persistir la cuenta/rol mediante la vista',
],{0:'Operador autorizado',2:'Datos y objeto autorizados'},'apps/usuarios/views.py:UserAdminViewSet apps/usuarios/views.py:RoleAdminViewSet')
activity('DIA-ACA-060','Catálogos y archivo oficial de modalidad','PROC-ACA-001',[
 'Autenticar y seleccionar lectura o escritura de catálogo',
 'Aplicar permiso administrativo solo en escritura\nModalidad: create/destroy rechazados; estados técnicos: DELETE rechazado',
 'Validar serializer de la variante\nArchivo oficial: PDF, firma, tamaño, nombre y pertenencia a modalidad',
 'Ejecutar variante de catálogo\nArchivo oficial: atomic, auditoría y eliminación del sustituido por on_commit',
],{1:'Método y autoridad admitidos',2:'Datos válidos'},'apps/academico/views.py:ModalidadViewSet._guardar_documento_oficial apps/academico/serializers.py:DocumentoOficialModalidadSerializer')
view('DIA-SYS-003','Alta operativa frente a registro histórico','Actividades','PROC-POS-001',r'''
|Administración|
start
:Enviar datos de postulación;
|Backend|
:Validar serializer, política y configuración de modalidad;
if (Datos/configuración válidos) then (sí)
else (no)
 :Rechazar sin crear expediente;
 stop
endif
if (Ruta historicas) then (histórica)
 :Servicio histórico atómico\nCrear CONCLUIDA / CERRADA / HISTORICO\nHistorial y auditoría;
 :No crear seguimiento operativo;
else (ordinaria)
 :Abrir atomic en la vista\nServicio: bloquear estudiante y exigir ausencia de vigente;
 if (Estado REGISTRADA y unicidad válidos) then (sí)
 else (no)
  :Error y rollback;
  stop
 endif
 :Crear REGISTRADA, historial y auditoría;
 if (Proyecto o Tesis) then (sí)
  :Orquestador propio inicializa flujo\ny arranca INSCRIPCION si la configuración es oficial;
 elseif (Examen, Trabajo Dirigido o Diplomado) then (sí)
  :Inicializar flujo\nExigir INSCRIPCION como primera etapa e iniciarla;
 else (otra rama, incluida Excelencia)
  :Sin autoarranque en create\nInicialización por operación específica;
 endif
 :Commit de la vista;
endif
:Serializar respuesta 201;
stop
''','apps/postulantes/views.py:PostulacionViewSet.create apps/postulantes/views.py:PostulacionViewSet.historicas apps/postulantes/services.py:PostulacionService.crear_postulacion')
activity('DIA-POS-060','Consulta y gestión del estado general','PROC-POS-001',[
 'Aplicar alcance del recurso\nPostulación: COMMON; historial/observaciones: vínculo de su queryset',
 'Elegir consulta, observación administrativa o PATCH con estado_actual',
 'Para PATCH: resolver EstadoPostulacion y exigir que sea diferente\nNo invocar aquí validar_conclusion_academica',
 'Servicio cambiar_estado: atomic, guardar estado, historial y auditoría\nConsulta: serializar; observación: servicio específico',
],{0:'Recurso visible y operación autorizada',2:'Variante de escritura válida'},'apps/postulantes/views.py:PostulacionViewSet.partial_update apps/postulantes/services.py:PostulacionService.cambiar_estado',
 'La edición PUT/PATCH ordinaria delega al serializer; esta vista no afirma equivalencia con las guardas del workflow. Las variantes heredadas permanecen por caracterizar.')
activity('DIA-POS-061','Inscripción, requisitos y aprobación de etapa','PROC-POS-002',[
 'Administración solicita iniciar, observar, aprobar, rechazar u omitir\nInicialización crea intentos pendientes según etapas activas',
 'Validar serializer; bloquear seguimiento dentro de atomic\nRechazar registros HISTORICO para el workflow operativo',
 'Ejecutar validador propio de la acción\nInicio: pendiente, sin otra en proceso, previas obligatorias aprobadas y policy\nAprobación: EN_PROCESO/OBSERVADA y policy',
 'Aplicar estado, fechas y responsable\nAprobar/rechazar: publicar evento para después del commit\nProyecto: autoabrir siguiente solo en flujo oficial',
],{1:'Usuario, seguimiento y tipo de registro válidos',2:'Guarda de estado y política satisfecha'},'apps/postulantes/workflow.py:WorkflowService.iniciar_etapa apps/postulantes/workflow.py:WorkflowService.aprobar_etapa apps/postulantes/workflow.py:WorkflowService._validar_etapas_anteriores_aprobadas')
activity('DIA-POS-062','Rechazo y nuevo intento de etapa','PROC-POS-002',[
 'Rechazar etapa EN_PROCESO u OBSERVADA con administración\nGuardar RECHAZADA y cierre del intento',
 'Solicitar nuevo intento sobre la misma postulación y etapa',
 'Bloquear postulación, etapa e intentos\nExigir misma modalidad, permite_repeticion y último RECHAZADA\nDelegar elegibilidad temporal/académica a policy',
 'Crear un objeto SeguimientoEtapa nuevo PENDIENTE\nnumero_intento = anterior + 1; conservar rechazado',
],{2:'Elegibilidad válida y número nuevo sin duplicado'},'apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento')
activity('DIA-POS-063','Decisiones, dictámenes e informes de revisión','PROC-POS-002',[
 'Seleccionar decisión, dictamen o informe/evidencia de revisión',
 'Exigir administración para registrar\nLas consultas usan el queryset de seguimiento',
 'Validar payload y definición/contexto de política\nDecisión: participantes y régimen; informe: evidencia y etapa',
 'Ejecutar servicio específico y devolver registro\nDecisión nueva: 201; reemplazo: 200',
],{1:'Acceso autorizado',2:'Definición, participantes y evidencia válidos'},'apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision')
activity('DIA-POS-064','Asignación y reemplazo académico','PROC-POS-003',[
 'Administración consulta candidatos o solicita asignación\nEl catálogo no certifica elegibilidad',
 'Validar payload y bloquear postulación, usuarios y contexto en atomic',
 'Verificar duplicados activos, modalidad, ocupación, incompatibilidades y actor',
 'Crear asignación, auditar y programar evento postcommit\nReemplazar: finalizar anterior y asignar nuevo dentro de atomic\nFinalizar: impedir participación en evento activo',
],{1:'Operador y contexto válidos',2:'Reglas específicas satisfechas'},'apps/postulantes/asignaciones.py:AsignacionService.asignar_actor apps/postulantes/asignaciones.py:AsignacionService.reemplazar_actor')
activity('DIA-DOC-060','Carga, versionado y autoaprobación específica','PROC-DOC-001',[
 'Validar postulación editable, tipo activo, archivo y usuario\nCarga ordinaria: solo propietario o administración',
 'Atomic: bloquear postulación y documento existente\nResolver policy, capacidad, contexto ordinario o vínculo a evento',
 'Crear documento ENV si no existe\nBloquear versiones, calcular hash/tamaño, incrementar número\nDesmarcar versiones anteriores y guardar archivo en storage',
 'Guardar nueva versión actual, ENV, requiere_correccion=False\nAuditar y registrar callback de notificación',
 'Autoaprobar solo si condición específica de carga inicial y administración\nSi hay excepción, intentar eliminar únicamente archivo recién creado',
],{0:'Validaciones previas satisfechas',1:'Carga permitida por política/contexto'},'apps/documentos/services.py:DocumentoService.subir_documento apps/documentos/services.py:DocumentoService.crear_nueva_version',
 'El storage no participa en rollback SQL. La carga histórica usa un contrato específico; no equivale a haber ejecutado el flujo ordinario. Autoaprobar no es regla universal.')
activity('DIA-DOC-061','Descarga con alcance y publicación vigente','PROC-DOC-002',[
 'Autenticar y filtrar documentos/versiones por queryset',
 'Aplicar vínculo al expediente y filtro adicional de memorandos publicados/vigentes',
 'Para descarga, comprobar archivo y normalizar nombre\nPara consulta, serializar metadatos/versiones visibles',
],{1:'Recurso visible',2:'Archivo disponible si es descarga'},'apps/documentos/views.py:VersionDocumentoViewSet.descargar apps/documentos/views.py:DocumentoPostulacionViewSet.get_queryset')
activity('DIA-DOC-062','Aprobar, rechazar u observar un documento','PROC-DOC-003',[
 'Administración selecciona revisión y valida comentario/motivo según acción',
 'Atomic: bloquear documento y validar postulación editable y versión actual',
 'Aprobar/rechazar exige ENV\nAprobar además sin observaciones pendientes\nObservar fuera de ENV solo si policy permite postaprobación',
 'Aprobar: APR y corrección=False\nRechazar: REC y corrección=True\nObservar: crear observación y corrección=True sin cambiar estado',
 'Auditar y programar notificación postcommit',
],{1:'Documento y versión válidos',2:'Guarda de revisión satisfecha'},'apps/documentos/services.py:DocumentoService.aprobar_documento apps/documentos/services.py:DocumentoService.registrar_observacion')
activity('DIA-DOC-063','Corrección administrativa y confirmación técnica','PROC-DOC-004',[
 'Seleccionar marcar-corregida o crear confirmación entre versiones',
 'Exigir administración\nMarcar: observación activa y todavía no corregida\nConfirmar: serializer del contexto',
 'Atomic: marcar fecha de corrección y recalcular pendientes de versión ACTUAL\nO construir confirmación con confirmado_por=request.user',
 'Confirmación: full_clean y validar_confirmacion_correccion de policy\nAuditar la operación y devolver registro',
],{1:'Autoridad y datos válidos'},'apps/documentos/services.py:DocumentoService.marcar_observacion_corregida apps/documentos/services.py:ConfirmacionCorreccionDocumentoService.registrar',
 'Dos variantes independientes, no pasos obligatorios de una misma solicitud. No se extrapolan las validaciones de create a PUT/PATCH/DELETE heredados de la confirmación.')
activity('DIA-POS-065','Programar e iniciar una defensa','PROC-POS-004',[
 'Administración envía programación o inicio\nLa lectura admite alcance específico de defensas',
 'Programar: atomic, etapa EN_PROCESO/OBSERVADA y previas aprobadas\nValidar policy, asignaciones, fecha y ausencia de evento activo duplicado',
 'Inicio con asistencia: comprobar decisiones exactas de participantes pendientes\nExigir PROGRAMADA, fecha alcanzada y validar_inicio de policy',
 'Guardar EN_CURSO; registrar asistencias dentro de la misma transacción\nFinalizar requiere EN_CURSO, policy y quórum válido',
],{1:'Programación válida para esta modalidad',2:'Inicio y asistencia válidos'},'apps/postulantes/defensas.py:EventoDefensaService.programar_evento apps/postulantes/defensas.py:EventoDefensaService.iniciar_evento_con_asistencia',
 'Las solicitudes de programación, inicio y finalización son variantes independientes; el diagrama resume sus guardas, no una transacción que abarque toda la vida de la defensa.')
activity('DIA-POS-066','Evaluación, consolidación y resultado','PROC-POS-005',[
 'Administración registra evaluación\nExigir EN_CURSO/FINALIZADA, quórum y tipo soportado',
 'Validar individual/consenso, evaluador, escala y ausencia de mezcla\nGuardar evaluación mediante policy en atomic',
 'Solicitud separada de consolidación: bloquear evento\nExigir FINALIZADA, sin RESULTADO_FINAL y selección válida de policy',
 'Construir consolidado, guardar, auditar y publicar callback\nCalcular resultado; policy determina aprobación o rechazo de etapa',
 'Si rechazo y primer intento: intentar nuevo seguimiento\nReintentoNoElegible solo se conserva si la policy lo permite',
],{1:'Solicitud de registro válida',2:'Consolidación admitida'},'apps/postulantes/defensas.py:EvaluacionDefensaService._registrar apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento',
 'La consulta/recálculo de resultado no formaliza conclusión. EvaluacionDefensa no tiene campo de ciclo de estados; resultado y consolidación no son estados universales de evaluación.')
activity('DIA-POS-067','Condiciones y recepción física','PROC-POS-006',[
 'Consultar por vínculo o solicitar mutación administrativa',
 'Bloquear registros en atomic y validar postulación editable\nLotes: IDs únicos, pertenencia, activos y pendientes',
 'Condición pendiente: CUMPLE o NO_CUMPLE\nEntrega: cantidad recibida positiva, no acumulación automática',
 'Entrega COMPLETA si cantidad institucional nula o recepción alcanza cantidad\nEn otro caso PARCIAL; guardar responsable y auditoría',
],{1:'Datos y estado válidos'},'apps/postulantes/complementarios.py:CondicionService._resolver apps/postulantes/complementarios.py:EntregaFisicaService.registrar_entrega')
VIEWS[-1]['body']=r'''
|Operador API|
start
:Solicitar consulta o resolución/recepción;
|Backend|
:Exigir IsAuthenticated;
if (Método GET) then (consulta)
 :RelatedViewSet.get_queryset\nAdministración: todos\nOtros: propietario o asignado, distinct;
 :Aplicar filtros de consulta\ny devolver registros visibles;
 stop
else (POST)
 :Exigir is_staff_user en la vista\ny validar payload de la operación;
 if (Autoridad y payload válidos) then (sí)
 else (no)
  :Rechazar antes de invocar el servicio;
  stop
 endif
endif
if (Operación seleccionada) then (resolver condición)
 :En atomic bloquear condición\ny validar postulación editable;
 if (Condición PENDIENTE) then (sí)
  :verificar -> CUMPLE / rechazar -> NO_CUMPLE\nGuardar verificador, fecha, observaciones y auditoría;
 else (no)
  :ValidationError / rollback;
  stop
 endif
else (recepción física)
 :En atomic bloquear entrega\ny validar postulación editable;
 if (Cantidad recibida mayor que cero) then (sí)
  :Reemplazar cantidad_recibida (no acumular)\nCOMPLETA si cantidad es None o recibido >= cantidad\nEn otro caso PARCIAL;
  :Guardar receptor, fecha, observaciones y auditoría;
 else (no)
  :ValidationError / rollback;
  stop
 endif
endif
note right
 Postulación editable: activa y estado distinto de CONCLUIDA/RECHAZADA.
 Lotes: validar selección no vacía y sin duplicados,
 bloquear postulación y filas activas de esa postulación;
 exigir todas PENDIENTE antes de resolver/recibir en atomic.
 Recepción individual no exige PENDIENTE: permite actualizar cantidades.
 Creación de registros es otra variante, no paso de esta resolución.
end note
:Devolver resultado de la mutación;
stop
'''.strip()
VIEWS[-1]['refs'] += ['apps/postulantes/complementarios_api.py:RelatedViewSet',
 'apps/postulantes/complementarios_api.py:CondicionViewSet',
 'apps/postulantes/complementarios_api.py:EntregaFisicaViewSet',
 'apps/postulantes/complementarios.py:CondicionService.verificar_multiples',
 'apps/postulantes/complementarios.py:EntregaFisicaService.registrar_multiples']
activity('DIA-NOT-060','Publicación interna y notificaciones propias','PROC-NOT-001',[
 'Servicio del dominio construye evento y registra on_commit robust=True',
 'Tras commit exitoso, invocar handlers locales\nRollback: no ejecutar callbacks',
 'Resolver destinatarios activos y plantilla\nCrear por destinatario y clave de deduplicación mediante get_or_create',
 'Usuario autenticado consulta solo sus notificaciones\nMarcar leída/no leída o todas leídas con control de propietario',
],{},'apps/notificaciones/events.py:DomainEventPublisher.publish_after_commit apps/notificaciones/services.py:NotificationService.procesar_evento',
 'Publicación y lectura son procesos relacionados, no una única solicitud. Callback síncrono posterior al commit, sin broker ni garantía de entrega/reintento persistente demostrados.')
activity('DIA-REP-060','Consulta y exportación de reportes','PROC-REP-001',[
 'Autenticar; para consulta exigir administración o DOCENTE',
 'Aplicar alcance global administrativo o expedientes asignados al docente',
 'Si es exportación exigir administración\nValidar filtros/formato de la ruta concreta',
 'Construir reporte con servicio del recurso y devolver JSON o archivo permitido',
],{0:'Actor admitido por la vista',2:'Formato y autoridad de exportación válidos'},'apps/reportes/views.py:ResultadosAcademicosReportView.get apps/reportes/views.py:ExportView.get')

# Las variantes de estas familias no son pasos secuenciales de una petición.
next(v for v in VIEWS if v['id']=='DIA-POS-065')['body']=r'''
|Operador API|
start
:Seleccionar consulta o acción de defensa;
|Backend|
if (Consulta) then (sí)
 :Aplicar queryset de defensas\nAdministración, propietario, asignado o participante;
 :Devolver eventos/quórum visibles;
 stop
endif
:Exigir administración y validar payload;
if (Programar) then (sí)
 :Atomic: bloquear seguimiento\nExigir EN_PROCESO/OBSERVADA y previas aprobadas;
 :Policy valida fecha, tipo, asignaciones\ny ausencia de activo duplicado por tipo/intento;
 if (Programación válida) then (sí)
  :Crear PROGRAMADA, auditar y registrar callback;
 else (no)
  :Error y rollback;
  stop
 endif
elseif (Iniciar) then (sí)
 :Atomic: bloquear evento y participantes\nComprobar decisiones exactas de pendientes;
 :Exigir PROGRAMADA, fecha alcanzada y policy de inicio;
 if (Inicio válido) then (sí)
  :Guardar EN_CURSO y registrar asistencias;
 else (no)
  :Error y rollback;
  stop
 endif
elseif (Gestionar participantes) then (sí)
 :Aplicar agregar/remover y sus guardas\nNo FINALIZADA/CANCELADA; validar asignación y duplicados;
else (Otra acción del ciclo)
 :Aplicar finalizar, suspender, cancelar o reprogramar\ncon la guarda específica de estado, motivo, fecha y quórum;
endif
:Devolver evento/participante o error de la variante;
stop
'''
next(v for v in VIEWS if v['id']=='DIA-POS-066')['body']=r'''
start
:Seleccionar evaluación, consolidación o resultado;
if (Consultar/calcular resultado final) then (sí)
 :GET con alcance COMMON\nPOST de recálculo exige administración;
 :Policy calcula resultado\nPOST audita; GET no audita;
 :Devolver resultado sin concluir postulación;
 stop
endif
:Exigir administración y validar payload;
if (Registrar evaluación) then (sí)
 :Atomic: bloquear evento\nEN_CURSO/FINALIZADA, tipo soportado y quórum;
 :Policy valida individual/consenso, evaluador y escala\nNo mezclar semánticas ni modos incompatibles;
 if (Registro válido) then (sí)
  :Guardar evaluación y auditoría;
 else (no)
  :Error y rollback;
  stop
 endif
else (Consolidar)
 :Atomic: evento FINALIZADA sin RESULTADO_FINAL\nPolicy selecciona entradas y construye consolidado;
 if (Consolidación válida) then (sí)
  :Guardar consolidado, auditar y registrar callback;
  :Calcular resultado y consultar decisión de policy;
  if (Policy indica aprobar) then (sí)
   :WorkflowService.aprobar_etapa;
  endif
  if (Policy indica rechazar) then (sí)
   :Rechazar seguimiento;
   if (Primer intento) then (sí)
    :Intentar nuevo seguimiento\nReintentoNoElegible se conserva solo si policy lo permite;
   endif
  endif
 else (no)
  :Error y rollback;
  stop
 endif
endif
:Devolver resultado o error de la operación;
stop
'''
next(v for v in VIEWS if v['id']=='DIA-DOC-063')['body']=r'''
|Administración|
start
:Seleccionar corrección o confirmación técnica;
|Backend|
:Exigir autoridad administrativa y validar payload;
if (Marcar observación corregida) then (sí)
 :Atomic: bloquear observación\nExigir activa y no corregida;
 :Guardar corregida=True y fecha;
 :Consultar pendientes de la versión ACTUAL\ny recalcular requiere_correccion del documento;
else (Crear confirmación técnica)
 :Atomic: construir confirmación con versiones,\nevento, asignación y confirmado_por=request.user;
 :Ejecutar full_clean y validación específica de policy;
 if (Contexto y versiones coherentes) then (sí)
  :Guardar confirmación;
 else (no)
  :Error y rollback;
  stop
 endif
endif
:Auditar y devolver registro o error;
stop
'''
next(v for v in VIEWS if v['id']=='DIA-NOT-060')['body']=r'''
start
if (Evento de dominio) then (sí)
 :build_event y registrar on_commit robust=True;
 if (Commit exterior exitoso) then (sí)
  :Invocar handlers locales síncronamente;
  :Resolver destinatarios activos y plantilla;
  :get_or_create por destinatario y deduplication_key\nen transacciones de notificación;
 else (rollback)
  :No ejecutar callbacks;
 endif
else (Operación de usuario)
 :Autenticar y limitar queryset a destinatario propio;
 if (Modificar lectura) then (sí)
  :Control de propietario\nMarcar leída/no leída o todas propias;
 else (consulta)
  :Listar, obtener detalle o contar no leídas propias;
 endif
endif
:Terminar la operación seleccionada;
stop
'''
