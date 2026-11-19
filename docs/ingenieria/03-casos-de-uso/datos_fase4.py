"""Catálogo funcional curado a partir de endpoints y servicios reales.

Datos documentales: no importa ni ejecuta el producto. Las operaciones compuestas
son variantes del mismo objetivo; Tesis conserva una especialización explícita.
"""

CASES = []


def case(id, name, group, profile, endpoint, handler, service, entities, rule, steps, alternate, post, test, condition="Sin guarda académica adicional en esta operación."):
    CASES.append(dict(id=id, name=name, group=group, profile=profile, endpoint=endpoint,
                      handler=handler, service=service, entities=entities.split(), rule=rule,
                      steps=steps.split(" ~ "), alternate=alternate, post=post, test=test,
                      condition=condition, status="IMPLEMENTADO; confirmación estática, pruebas no ejecutadas"))


# Se conservan los 23 identificadores candidatos originales.
case("UC-USR-001", "Iniciar sesión con usuario y contraseña", "usuarios", "PUBLIC",
     "POST /api/v1/auth/login/", "apps/usuarios/views.py:CustomTokenObtainPairView.post", "apps/usuarios/serializers.py:LoginSerializer.validate", "CustomUser",
     "El acceso por contraseña usa authenticate; no exige autoridad administrativa para emitir JWT.",
     "Enviar username y password ~ Validar credenciales mediante LoginSerializer ~ Actualizar last_login del usuario aceptado ~ Emitir refresh y access mediante RefreshToken.for_user",
     "El acceso estudiantil por R.U./C.I. es un caso separado; no es registro de cuentas.", "Tokens emitidos y last_login actualizado; no se crea un usuario.", "apps/usuarios/tests_contract.py")
case("UC-USR-002", "Administrar cuentas de usuario", "usuarios", "ADMIN_ACTIVE",
     "GET/POST /api/v1/usuarios/administracion/; GET/PUT/PATCH /api/v1/usuarios/administracion/{id}/", "apps/usuarios/views.py:UserAdminViewSet", "apps/usuarios/serializers.py:UserAdminSerializer", "CustomUser Role",
     "CanManageUsers y permiso por objeto protegen cuentas superusuario frente a operadores que no son superusuarios.",
     "Solicitar listado o enviar datos de cuenta ~ Aplicar IsActiveUser y CanManageUsers ~ Validar rol, contraseña y coherencia mediante UserAdminSerializer ~ Consultar, crear o actualizar la cuenta con los mixins declarados",
     "GET permite filtrar por rol y actividad. DELETE no forma parte de los mixins de usuarios.", "Cuenta consultada o persistida según el método; sin borrado de usuarios por esta vista.", "apps/usuarios/tests_admin_api.py")
case("UC-ACA-001", "Actualizar una modalidad existente", "academico", "ADMIN",
     "PUT/PATCH /api/v1/academico/modalidades/{id}/", "apps/academico/views.py:ModalidadViewSet", "apps/academico/serializers.py:ModalidadSerializer", "Modalidad",
     "La vista rechaza crear o eliminar modalidades oficiales; las actualizaciones están sujetas al serializer y permisos.",
     "Identificar una modalidad existente ~ Comprobar IsAuthenticated e IsStaffOrReadOnly ~ Validar los campos permitidos por ModalidadSerializer ~ Guardar y devolver la representación actualizada",
     "POST de creación y DELETE se rechazan expresamente; no son alternativas válidas de mantenimiento.", "Modalidad actualizada dentro del contrato del serializer.", "apps/postulantes/tests_security_contract.py")
case("UC-ACA-002", "Publicar o sustituir un documento oficial de modalidad", "academico", "ADMIN",
     "POST /api/v1/academico/modalidades/{id}/documentos-oficiales/; PATCH/PUT /api/v1/academico/modalidades/{id}/documentos-oficiales/{documento_id}/", "apps/academico/views.py:ModalidadViewSet._guardar_documento_oficial", "apps/academico/serializers.py:DocumentoOficialModalidadSerializer", "DocumentoOficialModalidad Modalidad AuditLog",
     "La evidencia oficial se vincula a la modalidad y la actualización queda auditada; no es una firma digital.",
     "Enviar archivo y nombre en el contexto de modalidad ~ Validar payload y pertenencia si se sustituye un documento ~ Guardar archivo y actualizado_por dentro de una transacción ~ Auditar y programar eliminación del archivo sustituido después del commit",
     "Actualizar solo el nombre conserva el archivo; documento ajeno al contexto no se acepta.", "Documento oficial publicado o actualizado con auditoría.", "apps/academico/tests_documento_oficial_modalidad.py")
case("UC-POS-001", "Registrar una postulación con seguimiento", "postulaciones", "ADMIN",
     "POST /api/v1/postulaciones/", "apps/postulantes/views.py:PostulacionViewSet.create", "apps/postulantes/services.py:PostulacionService.crear_postulacion", "Postulacion CustomUser Modalidad Periodo SeguimientoEtapa",
     "La modalidad debe tener política y configuración válida; la unicidad de postulación vigente se conserva.",
     "Enviar estudiante, modalidad y periodo mediante el serializer ~ Validar soporte académico y configuración de la modalidad ~ Crear la postulación mediante el servicio dentro de transaction.atomic ~ Inicializar Proyecto/Tesis por sus orquestadores o Examen/Trabajo Dirigido/Diplomado por la rama declarada ~ Serializar la postulación creada",
     "Excelencia no utiliza esa autoapertura genérica en create; requiere su configuración específica. Los registros históricos tienen otra acción.", "Postulación creada; solo los automatismos de su modalidad han sido ejecutados.", "apps/postulantes/tests_us007.py", "Estudiante y configuración válidos; no extrapolar la autoapertura a todas las modalidades.")
case("UC-POS-002", "Consultar postulaciones y expediente", "postulaciones", "COMMON",
     "GET /api/v1/postulaciones/; GET /api/v1/postulaciones/{id}/; GET /api/v1/postulaciones/{id}/flujo/", "apps/postulantes/views.py:PostulacionViewSet.get_queryset", "apps/postulantes/permissions.py:postulaciones_in_scope", "Postulacion SeguimientoEtapa",
     "El alcance común distingue administración, ESTUDIANTE propietario y DOCENTE asignado; otros roles obtienen conjunto vacío.",
     "Solicitar lista, detalle o flujo ~ Autenticar y aplicar postulaciones_in_scope ~ Resolver la postulación visible y cargar sus relaciones ~ Serializar el recurso o el flujo ordenado",
     "La lista puede estar vacía; un detalle fuera de alcance responde 404. La participación histórica del docente no se filtra por activo aquí.", "Información del expediente visible devuelta sin transición académica solicitada.", "apps/usuarios/tests_role_authority.py")
case("UC-POS-003", "Ejecutar una transición de etapa", "seguimiento", "ADMIN",
     "POST /api/v1/seguimientos-etapa/{id}/iniciar|observar|aprobar|rechazar|omitir/", "apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar", "apps/postulantes/workflow.py:WorkflowService.aprobar_etapa", "SeguimientoEtapa Postulacion HistorialEstado",
     "La transición depende del estado técnico y de los gates de la política, no de la visibilidad del botón.",
     "Elegir acción de etapa y enviar datos requeridos ~ Aplicar IsWorkflowAdminOrReadOnlyOwner ~ Resolver seguimiento y validar el serializer de la acción ~ Invocar el método correspondiente de WorkflowService y sus validaciones de política ~ Devolver seguimiento actualizado",
     "Iniciar no exige el mismo payload que observar o rechazar; cada acción conserva su validación. Los intentos nuevos son otro caso.", "Etapa actualizada y efectos del motor aplicados cuando la transición es válida.", "apps/postulantes/tests_workflow.py", "Etapas previas, requisitos y estado editable según política y acción.")
case("UC-POS-004", "Asignar un actor académico", "asignaciones", "ADMIN",
     "POST /api/v1/postulaciones/{id}/asignaciones/asignar/", "apps/postulantes/views.py:PostulacionViewSet.asignar", "apps/postulantes/asignaciones.py:AsignacionService.asignar_actor", "AsignacionPostulacion CustomUser Postulacion SeguimientoEtapa",
     "El servicio valida participación, contexto, posición e incompatibilidades específicas; ser candidato no acredita elegibilidad.",
     "Enviar usuario, tipo de participación y contexto ~ Exigir autoridad administrativa y validar AsignarActorSerializer ~ Resolver postulación y usuario ~ Aplicar AsignacionService y reglas de modalidad ~ Devolver asignación registrada",
     "Cambiar una asignación existente se documenta mediante finalizar/reemplazar; no se presume que todos los cargos sean admisibles en todas las modalidades.", "Asignación registrada con efectos de auditoría/notificación definidos por el servicio.", "apps/postulantes/tests_assignments.py", "Reglas de ocupación, etapa, actor y modalidad vigentes.")
case("UC-POS-005", "Registrar una decisión académica de etapa", "seguimiento", "ADMIN",
     "POST /api/v1/seguimientos-etapa/{id}/registrar-decision/", "apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision", "apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar", "DecisionAcademicaEtapa ParticipacionDecisionAcademica SeguimientoEtapa",
     "La política debe declarar la decisión; participantes y composición se validan antes del registro.",
     "Enviar código, resultado y participantes de la decisión ~ Exigir administración y validar el serializer ~ Resolver definición y validar participantes mediante el servicio ~ Registrar o reemplazar la decisión con trazabilidad ~ Devolver 201 para alta o 200 para reemplazo",
     "reemplaza_decision activa el recorrido de reemplazo validado. Los miembros académicos quedan registrados, sin acceso directo implícito al endpoint.", "Decisión y participaciones persistidas conforme al servicio.", "apps/postulantes/tests_decisiones_academicas.py", "Código, resultado, régimen y composición permitidos para esa etapa.")
case("UC-PG-001", "Publicar memorando de designación de Proyecto", "proyecto", "ADMIN",
     "POST /api/v1/postulaciones/{id}/memorandums-designacion/", "apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion", "apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar", "PublicacionMemorandumDesignacion VersionDocumento AsignacionPostulacion",
     "La publicación congela evidencia y composición; su vigencia se calcula respecto de la composición actual.",
     "Enviar seguimiento y archivo del memorando ~ Resolver postulación y exigir administración ~ Validar el contexto de publicación y composición en el servicio ~ Crear versión documental y publicación relacionada ~ Devolver la publicación serializada",
     "GET de la misma acción permite consulta relacionada; administración ve historial y el resto solo publicaciones vigentes. No genera firmas ni un acto institucional externo.", "Publicación vinculada a versión y asignaciones; lectura sujeta a vigencia.", "apps/postulantes/tests_memorandums.py", "Solo contextos habilitados por la política de Proyecto.")
case("UC-DOC-001", "Cargar un documento o una nueva versión", "documentos", "OWNER_ADMIN",
     "POST /api/v1/documentos/documentos/subir/", "apps/documentos/views.py:DocumentoPostulacionViewSet.subir", "apps/documentos/services.py:DocumentoService.subir_documento", "DocumentoPostulacion VersionDocumento TipoDocumento AuditLog",
     "Solo administración o propietario pueden cargar, sujetos a actores documentales, contexto y estado; una asignación no basta.",
     "Enviar postulación, tipo, archivo y evento cuando corresponda ~ Validar payload y resolver referencias ~ Comprobar actor, aplicabilidad, estado y archivo en DocumentoService ~ Crear documento o versión y actualizar la versión vigente transaccionalmente ~ Devolver VersionDocumentoSerializer",
     "Nueva versión y autoaprobaciones administrativas siguen condiciones del servicio; no toda carga queda aprobada. Histórico usa una acción separada.", "Versión registrada y estados documentales aplicados según contexto.", "apps/documentos/test_api.py", "Política y contexto documental, extensión, tamaño, firma PDF y permisos de carga.")
case("UC-DOC-002", "Revisar un documento presentado", "documentos", "ADMIN",
     "POST /api/v1/documentos/documentos/{id}/aprobar|rechazar|observar/", "apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar", "apps/documentos/services.py:DocumentoService.aprobar_documento", "DocumentoPostulacion VersionDocumento ObservacionDocumento",
     "Las operaciones de revisión verifican autoridad administrativa en el servicio; aprobación, rechazo y observación tienen controles distintos.",
     "Elegir la revisión y enviar comentario o motivo requerido ~ Resolver el documento visible y validar payload ~ Aplicar el método de revisión de DocumentoService ~ Validar versión, observaciones y estado permitidos ~ Devolver documento u observación generada",
     "Observar devuelve una observación; rechazar exige motivo. Una aprobación no salta automáticamente todas las etapas académicas.", "Estado o registro de observación actualizado y auditado por el servicio.", "apps/documentos/test_api.py", "Documento y postulación editables; versión vigente y observaciones según acción.")
case("UC-POS-006", "Administrar el ciclo de una defensa", "defensas", "ADMIN",
     "POST /api/v1/postulaciones/{id}/eventos-defensa/programar/; POST /api/v1/eventos-defensa/{id}/iniciar|finalizar|suspender|cancelar|reprogramar/", "apps/postulantes/defensas_api.py:PostulacionEventosView.post", "apps/postulantes/defensas.py:EventoDefensaService.programar_evento", "EventoDefensa SeguimientoEtapa Postulacion",
     "La programación y cada cambio de ciclo usan validaciones del evento y de la modalidad.",
     "Enviar etapa, tipo y programación o seleccionar una acción de evento existente ~ Exigir administración y validar el payload de la acción ~ Aplicar EventoDefensaService con sus gates ~ Registrar el evento o el nuevo estado y sus efectos ~ Devolver representación del evento",
     "Iniciar usa asistencias del payload; suspender/cancelar y reprogramar tienen motivo y precondiciones propios. Participantes y evaluación son casos separados.", "Evento creado o ciclo actualizado; no se presume evaluación ni conclusión.", "apps/postulantes/tests_defensas.py", "Asignaciones, fecha, etapa, estado y requisitos de la modalidad; la variante local de Proyecto no se generaliza.")
case("UC-POS-007", "Consolidar la evaluación de una defensa", "defensas", "ADMIN",
     "POST /api/v1/eventos-defensa/{id}/evaluaciones/consolidar/", "apps/postulantes/defensas_api.py:EventoDefensaViewSet.consolidar", "apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento", "EvaluacionDefensa EventoDefensa SeguimientoEtapa",
     "La consolidación se resuelve por política, conservando semánticas de nota y efectos de aprobación/rechazo/reintento.",
     "Seleccionar evento para consolidar ~ Exigir administración y resolver evento visible ~ Validar y consolidar evaluaciones mediante la política ~ Aplicar los efectos de workflow que correspondan ~ Devolver evaluación consolidada",
     "Un rechazo puede producir reintento o conservar el rechazo conforme a política. No todas las modalidades usan ponderación 30/70.", "Consolidado y efectos permitidos registrados; no conclusión automática universal.", "apps/postulantes/tests_defensas.py", "Estado del evento, evaluación y quórum exigidos por servicio/política.")
case("UC-PG-002", "Operar el cierre técnico de Proyecto", "proyecto", "ADMIN",
     "POST /api/v1/postulaciones/{id}/cierre/aprobar-revision-final|aprobar-cierre-documental|concluir|reabrir/", "apps/postulantes/cierre_api.py:CierreAccionView.post", "apps/postulantes/cierre.py:CierrePostulacionService", "Postulacion SeguimientoEtapa CondicionPostulacion EntregaFisica",
     "Aprobar revisión final, aprobar cierre documental y concluir son operaciones distintas; reabrir exige motivo.",
     "Seleccionar acción de cierre y enviar observaciones o motivo ~ Exigir administración y resolver postulación ~ Validar serializer y política de cierre ~ Ejecutar la operación de CierrePostulacionService ~ Refrescar la postulación y devolver estado de cierre",
     "GET /cierre/ solo consulta; los faltantes y advertencias conservan el significado que les da la política, sin convertir toda advertencia en bloqueo.", "Cierre actualizado según la acción; solo concluir formaliza su conclusión cuando procede.", "apps/postulantes/tests_cierre.py", "Disponibilidad de política de cierre y gates de Proyecto; no aplicar a Tesis por analogía.")
case("UC-POS-008", "Concluir académicamente por el motor común", "postulaciones", "ADMIN",
     "POST /api/v1/postulaciones/{id}/concluir-academicamente/", "apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente", "apps/postulantes/workflow.py:WorkflowService.concluir_postulacion", "Postulacion EstadoPostulacion HistorialEstado",
     "La política valida la conclusión antes de cambiar el estado general; una postulación ya concluida retorna de forma idempotente.",
     "Enviar solicitud de conclusión ~ Exigir administración y resolver postulación ~ Bloquear postulación y validar_conclusion_academica de su política ~ Actualizar estado general e historial cuando corresponde ~ Devolver postulación serializada",
     "Si ya está CONCLUIDA se conserva el estado sin duplicar la transición. Los endpoints de conclusión por modalidad se documentan con sus etapas propias.", "Estado general CONCLUIDA si la política lo autoriza; no elimina registros.", "apps/postulantes/tests_cierre.py", "Gates propios de la modalidad, sin cierre técnico universal.")
case("UC-NOT-001", "Consultar notificaciones propias", "notificaciones", "AUTH",
     "GET /api/v1/notificaciones/; GET /api/v1/notificaciones/{id}/; GET /api/v1/notificaciones/no-leidas/count/", "apps/notificaciones/views.py:NotificacionViewSet.get_queryset", "apps/notificaciones/services.py:NotificationService.listar_usuario", "Notificacion",
     "El destinatario determina el alcance de consulta, aunque la interfaz no muestre la capacidad al rol.",
     "Solicitar lista, detalle o contador ~ Autenticar al usuario ~ Filtrar notificaciones por destinatario y filtros admitidos ~ Devolver lista paginada, detalle o número de no leídas",
     "Detalle ajeno devuelve 404; la lista vacía es válida. No hay correo, push ni borrado por esta API.", "Notificaciones propias consultadas sin cambiar lectura.", "apps/notificaciones/tests_api.py")
case("UC-REP-001", "Consultar resultados académicos institucionales", "reportes", "REPORT",
     "GET /api/v1/reportes/resultados/", "apps/reportes/views.py:ResultadosAcademicosReportView.get", "apps/reportes/resultados.py:ResultadoAcademicoReportService", "Postulacion ExcelenciaExpediente EvaluacionDefensa ExamenEvaluacion DiplomadoModulo",
     "El permiso institucional es administración o DOCENTE; el alcance y la semántica se conservan por usuario y modalidad.",
     "Solicitar reporte con filtros ~ Comprobar CanViewInstitutionalReports ~ Validar filtros y construir queryset con alcance ~ Resolver resultados sin reinterpretar modalidades como una única nota ~ Devolver respuesta paginada",
     "Un resultado sin evidencia suficiente conserva su estado de disponibilidad. ESTUDIANTE no accede a este reporte aunque el servicio de scope contemple propiedad.", "Resultados derivados consultados; no modifica evaluaciones.", "apps/reportes/tests_resultados_api.py")
case("UC-TG-001", "Concluir Tesis con acta y defensa válidas", "tesis", "ADMIN",
     "POST /api/v1/postulaciones/{id}/concluir-academicamente/", "apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente", "apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica", "Postulacion EventoDefensa EvaluacionDefensa DocumentoPostulacion",
     "Especialización de UC-POS-008: Tesis valida su defensa pública y ACTA_DEFENSA vinculada, sin heredar el cierre técnico de Proyecto.",
     "Solicitar conclusión para una postulación TESIS_GRADO ~ Resolver la postulación con autoridad administrativa ~ Validar los requisitos de conclusión de TesisGradoPolicy ~ Ejecutar la transición común a CONCLUIDA ~ Devolver la postulación",
     "La idempotencia del motor común se conserva; un acta ajena o no válida no acredita el gate.", "Tesis concluida solo cuando cumple su validación específica.", "apps/modalidades/tests_tesis_e2e.py", "Modalidad TESIS_GRADO y gates propios; no representa un endpoint adicional.")
case("UC-TD-001", "Configurar institución de Trabajo Dirigido", "trabajo", "ADMIN",
     "POST /api/v1/postulaciones/{id}/trabajo-dirigido/institucion/", "apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post", "apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.configurar_institucion", "TrabajoDirigidoExpediente Postulacion",
     "La institución se guarda en el expediente específico y valida modalidad y condiciones de ejecución.",
     "Enviar datos institucionales ~ Exigir administración y resolver Trabajo Dirigido ~ Configurar y validar el expediente mediante el servicio ~ Devolver id y nombre institucional",
     "La ejecución externa exige convenio según el modelo; no se crea una integración con la institución.", "Expediente institucional guardado.", "apps/modalidades/tests_trabajo_dirigido.py", "TRABAJO_DIRIGIDO y validaciones de institución/convenio.")
case("UC-EG-001", "Registrar evaluación de un área de Examen", "examen", "ADMIN",
     "POST /api/v1/postulaciones/{id}/examen/areas/{area}/evaluar/", "apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post", "apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion", "ExamenArea ExamenEvaluacion SeguimientoEtapa",
     "El servicio valida área, intento, nota y modalidad de registro de Examen, sin convertir al evaluador atribuido en usuario autorizado.",
     "Enviar nota, observaciones y datos de evaluación del área ~ Exigir administración y resolver postulación ~ Registrar evaluación mediante ExamenGradoService ~ Devolver área, intento, nota y resultado",
     "Evaluación individual y consenso siguen los parámetros y gates del servicio. TypeError, ValueError y validaciones se convierten en error de entrada.", "Evaluación del área y efectos de etapa registrados.", "apps/modalidades/tests_examen_grado.py", "EXAMEN_GRADO, área/intento habilitados y escala propia.")
case("UC-EA-001", "Registrar evaluación de Excelencia", "excelencia", "ADMIN",
     "POST /api/v1/postulaciones/{id}/excelencia/evaluar/", "apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post", "apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion", "ExcelenciaExpediente Postulacion",
     "La evaluación usa el criterio previamente configurado y las reglas propias de Excelencia.",
     "Enviar resultado y promedio cuando corresponda ~ Exigir administración y resolver expediente ~ Validar criterio, composición y evidencias en el servicio ~ Registrar evaluación y devolver criterio, resultado y promedio",
     "Rendimiento y calidad no son el mismo cálculo; no se presupone defensa numérica común.", "Evaluación de Excelencia registrada según criterio.", "apps/modalidades/tests_excelencia_academica.py", "EXCELENCIA_ACADEMICA, criterio y requisitos de evaluación válidos.")
case("UC-DIP-001", "Registrar el resultado de un módulo de Diplomado", "diplomado", "ADMIN",
     "POST /api/v1/postulaciones/{id}/diplomado/modulo/", "apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post", "apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result", "DiplomadoModulo SeguimientoEtapa",
     "El módulo y su etapa deben ser operables; el quinto módulo corresponde al Taller de Investigación.",
     "Enviar número de módulo, nota y observaciones ~ Exigir administración y resolver Diplomado ~ Aplicar validaciones y registrar el resultado mediante el servicio ~ Devolver orden, estado y nota del módulo",
     "Una nota reprobatoria conserva el resultado correspondiente. La defensa pública no sustituye los cinco módulos.", "Resultado del DiplomadoModulo guardado (nota, estado y datos de registro). set_module_result no aprueba ni actualiza SeguimientoEtapa; el seguimiento requiere su operación independiente.", "apps/modalidades/tests_diplomado.py", "GRADUACION_VIA_DIPLOMADO y etapa/módulo habilitados.")
