"""Secuencias selectivas; los mensajes resumidos no afirman SQL literal."""
from datos_fase5 import view

view('DIA-USR-070','Login por contraseña y emisión JWT','Secuencia','PROC-SYS-001',r'''
actor Usuario as U
participant "LoginPage / AuthProvider" as FE
participant "authService / apiClient (Axios)" as HTTP
participant CustomTokenObtainPairView as API
participant LoginSerializer as SER
participant "Django authenticate / CustomUser" as AUTH
database "PostgreSQL\nconfigurado, no consultado" as DB
U -> FE : Enviar credenciales
FE -> HTTP : authService.login(credentials)
HTTP -> API : POST /api/v1/auth/login/
API -> SER : is_valid(raise_exception=True)
SER -> AUTH : authenticate(username, password)
AUTH -> DB : Consultar usuario mediante backend/ORM
alt Credenciales inválidas o usuario inactivo
 SER --> API : ValidationError
 API --> HTTP : Respuesta de error DRF
 HTTP --> FE : Rechazo de promesa
else Credenciales aceptadas
 SER --> API : validated_data.user
 API -> AUTH : last_login = now(); save()
 AUTH -> DB : Persistir last_login
 API -> API : RefreshToken.for_user(user)
 API --> HTTP : 200 refresh + access
 HTTP --> FE : Respuesta de login
end
note over API,DB
No atomic explícito en este método.
R.U./C.I. usa StudentLoginSerializer/authenticate_student,
con throttling propio; no se representa como authenticate.
end note
''','src/pages/auth/LoginPage.jsx src/context/AuthProvider.jsx src/services/authService.js src/services/api.js apps/usuarios/views.py:CustomTokenObtainPairView.post apps/usuarios/serializers.py:LoginSerializer.validate')
view('DIA-USR-071','Refresh compartido y reintento HTTP','Secuencia','PROC-SYS-001',r'''
participant "Componente React" as FE
participant "apiClient / interceptors" as HTTP
participant "refreshClient" as R
participant "API del recurso" as API
participant CustomTokenRefreshView as JWT
FE -> HTTP : Solicitud de recurso protegido
HTTP -> API : Petición con Bearer access
API --> HTTP : 401
alt No es auth endpoint y no tiene _retry
 HTTP -> HTTP : _retry = true
 alt No existe refreshPromise
  HTTP -> R : refreshAccessToken()
  R -> JWT : POST refresh desde localStorage
  JWT -> JWT : TokenRefreshView.post heredado
  alt Refresh aceptado y respuesta con access
   JWT --> R : Tokens según SIMPLE_JWT
   R -> R : Guardar access y refresh si se recibe
   R --> HTTP : access
  else Falla de renovación
   JWT --> R : Error
   R --> HTTP : Rechazo
  end
 else Renovación concurrente en curso
  HTTP -> HTTP : Esperar la misma refreshPromise
 end
 alt Renovación satisfactoria
  HTTP -> API : Repetir solicitud original una vez
  API --> HTTP : Respuesta o error
  HTTP --> FE : Resultado de la solicitud
 else Renovación fallida
  HTTP -> HTTP : expireSession(): retirar tokens\ny emitir auth-session-expired
  HTTP --> FE : Rechazo
 end
else Auth endpoint o solicitud ya reintentada
 HTTP -> HTTP : No renovar; si _retry y 401, expireSession()
 HTTP --> FE : Rechazo
end
''','src/services/api.js apps/usuarios/views.py:CustomTokenRefreshView.post core/settings/base.py:SIMPLE_JWT',
 'El frontend consume una promesa compartida; no es un broker. El detalle interno de SimpleJWT se delega a la dependencia/configuración, sin inventar consultas o commits del paquete.')
view('DIA-SYS-004','Creación operativa y arranque por modalidad','Secuencia','PROC-POS-001',r'''
actor Administración as U
participant "PostulantesPage / crudService" as FE
participant apiClient as HTTP
participant PostulacionViewSet as API
participant "Permisos + PostulacionSerializer" as SER
participant "ModalidadConfigurationValidator\nModalidadPolicyRegistry" as CFG
participant PostulacionService as S
participant "Orquestador propio / WorkflowService" as W
database "Modelos ORM → PostgreSQL" as DB
U -> FE : Registrar postulación
FE -> HTTP : create(payload)
HTTP -> API : POST /api/v1/postulaciones/
API -> SER : IsAuthenticated / IsStaffOrReadOnly\ny serializer.is_valid()
API -> CFG : has_policy y validate_modalidad
alt Sin autorización o configuración válida
 API --> HTTP : Error de permiso/validación
else Petición válida
 group transaction.atomic de la vista (incluye servicios anidados)
  API -> S : crear_postulacion(datos con usuario)
  S -> DB : Bloquear estudiante; comprobar vigente\ny obtener REGISTRADA
  S -> DB : Crear postulación + historial + auditoría
  alt PROYECTO_GRADO o TESIS_GRADO
   API -> W : inicializar_proceso (orquestador de la modalidad)
   W -> DB : Inicializar seguimientos; comprobar flujo oficial
   W -> W : Iniciar INSCRIPCION solo cuando corresponde
  else EXAMEN_GRADO / TRABAJO_DIRIGIDO / DIPLOMADO
   API -> W : inicializar_flujo; validar primera INSCRIPCION
   API -> W : iniciar_etapa(primer seguimiento)
  else Excelencia u otra rama sin autoarranque aquí
   note over API,W : create no inicializa automáticamente esta rama.
  end
 end
 note over API,DB
Error dentro de atomic revierte la creación y arranque.
Callbacks registrados por servicios esperan commit exterior.
end note
 API --> HTTP : 201 postulación serializada
 HTTP --> FE : Recurso creado
end
''','src/pages/postulantes/PostulantesPage.jsx src/services/crudService.js src/services/api.js apps/postulantes/views.py:PostulacionViewSet.create apps/postulantes/services.py:PostulacionService.crear_postulacion apps/postulantes/proyecto_grado_workflow.py:ProyectoGradoWorkflowOrchestrator.inicializar_proceso apps/postulantes/tesis_grado_workflow.py:TesisGradoWorkflowOrchestrator.inicializar_proceso')
view('DIA-DOC-070','Carga documental, storage y rollback','Secuencia','PROC-DOC-001',r'''
actor "Propietario o administración" as U
participant "ExpedientePage / postulacionesService" as FE
participant apiClient as HTTP
participant DocumentoPostulacionViewSet as API
participant SubirDocumentoSerializer as SER
participant DocumentoService as S
participant "Policy de modalidad / evento" as P
database "Modelos ORM → PostgreSQL" as DB
collections "Storage de archivos" as FS
participant "publish_domain_event" as EV
U -> FE : Adjuntar archivo
FE -> HTTP : cargar documento (FormData)
HTTP -> API : POST documentos/documentos/subir/
API -> SER : Validar payload y referencias
API -> S : subir_documento(...)
S -> S : Validar editable, archivo y actor
alt Propietario/administración no autorizado o datos inválidos
 S --> API : PermissionDenied / ValidationError / NotFound
 API --> HTTP : Error DRF
else Validaciones previas aceptadas
 group atomic subir_documento + atomic crear_nueva_version anidado
  S -> DB : select_for_update postulación y documento
  S -> P : Capacidad, aplicabilidad y vínculo de evento
  S -> DB : Crear documento si falta; bloquear versiones\nnumero=max+1; anteriores no actuales; estado ENV
  S -> FS : version.archivo.save(..., save=False)
  S -> DB : version.save(); auditoría
  S -> EV : Registrar evento para on_commit
  opt Autoaprobación inicial específica permitida
   S -> S : aprobar_documento(documento, usuario)
  end
 end
 alt Excepción capturada al crear nueva versión
  S -> FS : storage.delete(nombre recién creado), si existe
  S --> API : Propagar excepción / rollback SQL
 else Commit exitoso
  note over S,EV : El callback de notificación se ejecuta tras commit exterior.\nVer secuencia de publicación interna.
  S --> API : VersionDocumento
  API --> HTTP : Versión serializada
  HTTP --> FE : Resultado de carga
 end
end
''','src/pages/postulantes/ExpedientePage.jsx src/services/postulacionesService.js src/services/api.js apps/documentos/views.py:DocumentoPostulacionViewSet.subir apps/documentos/services.py:DocumentoService.subir_documento apps/documentos/services.py:DocumentoService.crear_nueva_version',
 'El borrado compensatorio está en el catch de crear_nueva_version. No garantiza compensación por un rollback exterior posterior al retorno de ese método, ni atomicidad entre filesystem y PostgreSQL.')
view('DIA-POS-070','Aprobación transaccional de etapa','Secuencia','PROC-POS-002',r'''
actor Administración as U
participant "ExpedientePage / postulacionesService" as FE
participant apiClient as HTTP
participant SeguimientoEtapaViewSet as API
participant "IsWorkflowAdminOrReadOnlyOwner\nAprobarSeguimientoEtapaSerializer" as V
participant WorkflowService as W
participant "Policy de modalidad" as P
database "SeguimientoEtapa / Postulacion\nORM → PostgreSQL" as DB
participant "publish_domain_event" as EV
U -> FE : Aprobar etapa
FE -> HTTP : aprobarEtapa(id)
HTTP -> API : POST seguimientos-etapa/{id}/aprobar/
API -> V : Permiso administrativo; serializer.is_valid()
API -> W : aprobar_etapa(seguimiento, usuario, ...)
group atomic
 W -> DB : select_for_update seguimiento
 W -> W : Exigir EN_PROCESO u OBSERVADA; no cerrado
 W -> P : validar_aprobacion_etapa(seguimiento)
 alt Guarda no satisfecha
  P --> W : ValidationError
  W --> API : Propagar error / rollback
 else Guarda satisfecha
  W -> DB : Guardar APROBADA, fecha_fin, cerrada_por
  W -> EV : ETAPA_APROBADA → on_commit
  opt Condición específica de etapa final y cierre policy
   W -> W : _actualizar_estado_general según condición del código
  end
  opt PROYECTO_GRADO
   W -> W : ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente()
   note right of W : Solo configuración oficial;\nno aprobación académica automática de la siguiente.
  end
 end
end
API --> HTTP : Seguimiento actualizado o error DRF
HTTP --> FE : Resultado
''','src/pages/postulantes/ExpedientePage.jsx src/services/postulacionesService.js apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar apps/postulantes/workflow.py:WorkflowService.aprobar_etapa')
view('DIA-POS-071','Reemplazo de asignación académica','Secuencia','PROC-POS-003',r'''
actor Administración as U
participant "ExpedientePage / postulacionesService / apiClient" as FE
participant AsignacionPostulacionViewSet as API
participant "Permiso administrativo / ReemplazarActorSerializer" as V
participant AsignacionService as S
participant "Policy / reglas de ocupación y actor" as P
database "AsignacionPostulacion / usuarios\nORM → PostgreSQL" as DB
participant "publish_domain_event" as EV
U -> FE : Reemplazar persona
FE -> API : POST asignaciones/{id}/reemplazar/
API -> V : Validar acceso y payload
API -> S : reemplazar_actor(...)
group atomic exterior de reemplazar_actor
 S -> DB : Bloquear asignación activa
 S -> S : Exigir nuevo usuario distinto
 S -> S : finalizar_asignacion(anterior)\nValidar antes que no participe en evento activo
 S -> DB : Guardar activo=False y fecha_finalizacion
 S -> EV : Registrar ASIGNACION_FINALIZADA para commit
 S -> S : asignar_actor(nuevo, mismo cargo/contexto)
 S -> P : Duplicados, modalidad, ocupación, incompatibilidad
 alt Regla de la nueva asignación impide cambio
  S --> API : ValidationError; rollback del conjunto
 else Cambio válido
  S -> DB : Crear asignación nueva activa y auditoría
  S -> EV : ACTOR_ASIGNADO y ACTOR_REEMPLAZADO para commit
  S --> API : Nueva asignación
 end
end
note over DB,EV : Callbacks anidados esperan commit exterior;\nno se elimina el registro anterior.
API --> FE : Resultado serializado o error
''','src/pages/postulantes/ExpedientePage.jsx src/services/postulacionesService.js apps/postulantes/views.py:AsignacionPostulacionViewSet.reemplazar apps/postulantes/asignaciones.py:AsignacionService.reemplazar_actor')
view('DIA-POS-072','Inicio de defensa con asistencia pendiente','Secuencia','PROC-POS-004',r'''
actor Administración as U
participant "ExpedientePage / postulacionesService / apiClient" as FE
participant EventoDefensaViewSet as API
participant "Guarda _admin / payload de inicio" as V
participant EventoDefensaService as S
participant "evento_policy" as P
database "EventoDefensa / ParticipanteEvento\nORM → PostgreSQL" as DB
U -> FE : Confirmar asistencia e iniciar
FE -> API : POST eventos-defensa/{id}/iniciar/
API -> V : Exigir administración y validar asistencias
API -> S : iniciar_evento_con_asistencia(...)
group atomic exterior
 S -> DB : Bloquear evento y participantes activos
 S -> S : IDs exactos de pendientes; bool y sin duplicados
 S -> S : iniciar_evento(): PROGRAMADA y fecha alcanzada
 S -> P : validar_inicio(evento)
 alt Error de payload, estado, fecha o policy
  S --> API : ValidationError / rollback
 else Condiciones válidas
  S -> DB : Guardar EN_CURSO + fecha/usuario de inicio
  loop Cada participante pendiente confirmado
   S -> S : registrar_asistencia(participante, presente, usuario)
   S -> DB : Actualizar asistencia y auditoría
  end
  S --> API : Evento actualizado
 end
end
API --> FE : Respuesta o error DRF
note over S,P : La fecha/participantes/quórum dependen de la modalidad.\nValidar inicio y registrar asistencia conservan el orden del código.
''','src/pages/postulantes/ExpedientePage.jsx src/services/postulacionesService.js apps/postulantes/defensas_api.py:EventoDefensaViewSet.iniciar apps/postulantes/defensas.py:EventoDefensaService.iniciar_evento_con_asistencia')
view('DIA-POS-073','Consolidación y efectos académicos','Secuencia','PROC-POS-005',r'''
actor Administración as U
participant "ExpedientePage / postulacionesService / apiClient" as FE
participant EventoDefensaViewSet as API
participant EvaluacionDefensaService as S
participant "evaluacion_policy" as P
participant WorkflowService as W
database "EvaluacionDefensa / seguimiento\nORM → PostgreSQL" as DB
participant "publish_domain_event" as EV
U -> FE : Consolidar
FE -> API : POST eventos-defensa/{id}/evaluaciones/consolidar/
API -> API : Exigir administración
API -> S : consolidar_evaluacion_evento(evento, usuario)
group atomic
 S -> DB : Bloquear evento; FINALIZADA y sin RESULTADO_FINAL
 S -> P : obtener_evaluacion_para_consolidar()
 S -> P : construir_consolidado()
 S -> DB : Guardar consolidado y auditoría
 S -> EV : Registrar EVALUACION_CONSOLIDADA para commit
 S -> P : calcular_resultado_final y decidir aprobación/rechazo
 opt Policy devuelve aprobación
  S -> W : aprobar_etapa()
 end
 opt Policy devuelve rechazo
  S -> W : rechazar_etapa()
  opt Primer intento
   S -> W : crear_nuevo_intento()
   alt ReintentoNoElegibleError
    S -> P : conservar_rechazo_sin_reintento(evento, error)
    alt No conservar
     S --> API : Propagar excepción; rollback
    else Conservar permitido
     S -> S : Adjuntar _reintento no creado / motivo
    end
   end
  end
 end
end
API --> FE : Evaluación serializada o error
note over P,DB : Escala y composición son específicas; no se introduce\nuna fórmula numérica universal ni un estado nuevo de evaluación.
''','src/pages/postulantes/ExpedientePage.jsx src/services/postulacionesService.js apps/postulantes/defensas_api.py:EventoDefensaViewSet.consolidar apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento')
view('DIA-POS-074','Conclusión común validada por modalidad','Secuencia','PROC-POS-002',r'''
actor Administración as U
participant "ExpedientePage / postulacionesService / apiClient" as FE
participant PostulacionViewSet as API
participant WorkflowService as W
participant "Policy de modalidad" as P
database "Postulacion / EstadoPostulacion / Historial\nORM → PostgreSQL" as DB
participant "publish_domain_event" as EV
U -> FE : Concluir académicamente
FE -> API : POST postulaciones/{id}/concluir-academicamente/
API -> API : Exigir administración\nLeer request.data.get("observaciones", "")
API -> W : concluir_postulacion(...)
group atomic
 W -> DB : Bloquear solo postulación (of=self)\nConsultar modalidad y estado nullable
 alt Ya CONCLUIDA
  W --> API : Retornar sin volver a validar policy
 else No concluida
  W -> P : validar_conclusion_academica(post)
  alt Requisitos faltantes
   P --> W : ValidationError
   W --> API : Error / rollback
  else Validación aceptada
   W -> DB : Obtener CONCLUIDA (strict=True)\nGuardar estado e HistorialEstado
   W -> EV : POSTULACION_ESTADO_CAMBIADO para on_commit
   W --> API : Postulación
  end
 end
end
API --> FE : Resultado o error DRF
note over W,P : Tesis exige su ACTA_DEFENSA; otras políticas tienen\nguardas distintas. No se cambia vigencia en este método.\nLos cierres específicos tienen secuencias propias, no son alias universales.
''','src/pages/postulantes/ExpedientePage.jsx src/services/postulacionesService.js apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente apps/postulantes/workflow.py:WorkflowService.concluir_postulacion')
view('DIA-NOT-070','Callbacks después del commit y deduplicación','Secuencia','PROC-NOT-001',r'''
participant "Servicio del dominio" as S
participant "publish_domain_event / build_event" as EV
participant DomainEventPublisher as PUB
participant "Django transaction" as TX
participant NotificationService as N
participant "NotificationRecipientResolver\nNotificationTemplateRegistry" as R
database "Notificacion / usuarios / asignaciones\nORM → PostgreSQL" as DB
S -> EV : Construir evento con aggregate y clave
EV -> PUB : publish_after_commit(event)
PUB -> TX : on_commit(lambda publish(event), robust=True)
TX --> PUB : Callback registrado (o ejecución inmediata sin atomic)
alt Rollback de la transacción exterior
 note over TX,DB : Callback descartado; no crea notificaciones.
else Commit exterior exitoso
 TX -> PUB : Ejecutar callback local síncrono
 PUB -> PUB : publish(); registrar handler si no hay handlers
 PUB -> N : procesar_evento(event)
 N -> R : Resolver destinatarios activos y plantilla
 R -> DB : Consultar vínculos y usuarios
 R --> N : Usuarios y mensaje
 loop Cada destinatario sin duplicado en lote
  N -> N : crear_notificacion() con atomic propio
  N -> DB : get_or_create(destinatario, deduplication_key)
  DB --> N : Creada o existente
 end
 note over TX,N : robust=True registra fallos del callback; el commit de negocio\nya ocurrió. No se demuestra outbox persistente ni reintento automático.
end
''','apps/notificaciones/events.py:DomainEventPublisher.publish_after_commit apps/notificaciones/events.py:DomainEventPublisher.publish apps/notificaciones/services.py:NotificationService.procesar_evento apps/notificaciones/services.py:NotificationService.crear_notificacion')
