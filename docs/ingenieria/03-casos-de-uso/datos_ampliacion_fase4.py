"""Desglose adicional de objetivos. Datos documentales, sin importar el producto."""
from datos_fase4 import case

case("UC-POS-028", "Administrar estados técnicos de postulación", "postulaciones", "ADMIN",
     "POST /api/v1/postulaciones/estados/; PUT/PATCH /api/v1/postulaciones/estados/{id}/", "apps/postulantes/views.py:EstadoPostulacionViewSet", "apps/postulantes/serializers.py:EstadoPostulacionSerializer", "EstadoPostulacion",
     "La escritura del catálogo exige administración; destroy rechaza DELETE y propone desactivar.",
     "Enviar alta o edición de estado técnico ~ Aplicar IsAuthenticated e IsStaffOrReadOnly ~ Validar serializer del catálogo ~ Persistir el estado sin ejecutar una transición de expediente",
     "DELETE se rechaza explícitamente; mantener un catálogo no concluye postulaciones. GET es lectura autenticada.", "Estado técnico registrado o actualizado.", "apps/postulantes/tests_security_contract.py")
case("UC-DOC-007", "Consultar catálogos documentales y estados técnicos", "documentos", "AUTH",
     "GET /api/v1/documentos/estados-documento/; GET /api/v1/documentos/tipos-documento/; GET /api/v1/postulaciones/estados/", "apps/documentos/views.py:TipoDocumentoViewSet", "apps/postulantes/views.py:EstadoPostulacionViewSet", "EstadoDocumento TipoDocumento EstadoPostulacion",
     "Los catálogos requieren autenticación; lectura no concede escritura ni acceso a archivos del expediente.",
     "Solicitar catálogo o detalle ~ Aplicar autenticación y permiso de lectura ~ Filtrar y ordenar por contrato de la vista ~ Devolver los valores técnicos disponibles",
     "Un tipo documental de catálogo no prueba que sea aplicable a toda modalidad o etapa.", "Catálogo consultado.", "apps/postulantes/tests_security_contract.py")
case("UC-DOC-008", "Administrar tipos y estados documentales", "documentos", "ADMIN",
     "POST /api/v1/documentos/tipos-documento/; PUT/PATCH/DELETE /api/v1/documentos/tipos-documento/{id}/; POST /api/v1/documentos/estados-documento/; PUT/PATCH /api/v1/documentos/estados-documento/{id}/", "apps/documentos/views.py:EstadoDocumentoViewSet", "apps/documentos/views.py:TipoDocumentoViewSet", "EstadoDocumento TipoDocumento",
     "La escritura exige administración; DELETE de estados documentales está prohibido expresamente, a diferencia del tipo documental.",
     "Seleccionar catálogo y variante permitida ~ Aplicar IsAuthenticated e IsStaffOrReadOnly ~ Validar serializer del recurso ~ Persistir por ModelViewSet cuando el método está permitido",
     "Eliminar un estado devuelve MethodNotAllowed; las relaciones de un tipo pueden restringir su eliminación. No modifica por sí mismo la política académica.", "Catálogo documental mantenido conforme al método admitido.", "apps/documentos/test_api.py")

case("UC-ACA-007", "Consultar periodos y requisitos", "academico", "AUTH",
     "GET /api/v1/academico/periodos/; GET /api/v1/academico/requisitos/; GET /api/v1/academico/modalidad-requisitos/", "apps/academico/views.py:PeriodoViewSet", "core/permissions.py:IsStaffOrReadOnly", "Periodo Requisito ModalidadRequisito",
     "La lectura de estos catálogos requiere autenticación; no concede permiso de escritura.",
     "Solicitar catálogo ~ Aplicar IsAuthenticated e IsStaffOrReadOnly para lectura ~ Filtrar y ordenar por el contrato del recurso ~ Devolver lista o detalle visible",
     "Los filtros y campos dependen del catálogo; administración de cada recurso está separada.", "Catálogos consultados sin mutación.", "apps/postulantes/tests_security_contract.py")

case("UC-USR-003", "Renovar tokens JWT", "usuarios", "PUBLIC",
     "POST /api/v1/auth/refresh/", "apps/usuarios/views.py:CustomTokenRefreshView.post", "core/settings/base.py:SIMPLE_JWT", "CustomUser",
     "Un refresh válido permite renovar según rotación y blacklist de SimpleJWT.",
     "Enviar refresh ~ Delegar en TokenRefreshView ~ Validar el token y aplicar configuración ~ Devolver tokens renovados",
     "No necesita un access vigente; refresh expirado o revocado se rechaza.", "Tokens renovados sin crear cuenta.", "apps/usuarios/tests_contract.py")
case("UC-USR-004", "Cerrar sesión", "usuarios", "AUTH_ACTIVE",
     "POST /api/v1/auth/logout/", "apps/usuarios/views.py:LogoutView.post", "apps/usuarios/serializers.py:LogoutSerializer", "CustomUser",
     "La operación revoca el refresh recibido, no todos los access ya emitidos.",
     "Enviar refresh con sesión aceptada ~ Aplicar IsAuthenticated e IsActiveUser ~ Añadir el refresh a blacklist ~ Devolver mensaje de cierre",
     "Una excepción de procesamiento del token devuelve 400. No se observa aquí contraste explícito de propietario del refresh con request.user.", "Refresh recibido revocado si fue válido.", "apps/usuarios/tests_contract.py")
case("UC-USR-005", "Consultar perfil y capacidades propias", "usuarios", "AUTH_ACTIVE",
     "GET /api/v1/auth/me/", "apps/usuarios/views.py:MeView.get", "apps/usuarios/services.py:UserCapabilitiesService.resolve", "CustomUser Role",
     "Las capacidades del perfil orientan la interfaz; no sustituyen autorización backend.",
     "Solicitar perfil ~ Comprobar autenticación y actividad ~ Serializar request.user y resolver capacidades ~ Devolver perfil",
     "Campos heredados de compatibilidad no implican permiso de edición.", "Perfil consultado sin modificar cuenta.", "apps/usuarios/tests_contract.py")
case("UC-USR-006", "Administrar roles", "usuarios", "ADMIN_ACTIVE",
     "GET/POST /api/v1/usuarios/roles/; GET/PUT/PATCH/DELETE /api/v1/usuarios/roles/{id}/", "apps/usuarios/views.py:RoleAdminViewSet", "apps/usuarios/serializers.py:RoleAdminSerializer", "Role CustomUser",
     "CanManageUsers protege el catálogo y ProtectedError impide eliminar roles referenciados.",
     "Solicitar operación de rol ~ Comprobar permiso administrativo y actividad ~ Validar RoleAdminSerializer ~ Consultar o persistir mediante ViewSet",
     "Si el rol está en uso, perform_destroy convierte ProtectedError en validación; se propone inactivarlo.", "Catálogo gestionado sin cambiar políticas académicas.", "apps/usuarios/tests_admin_api.py")
case("UC-USR-007", "Consultar estudiantes para postulación", "asignaciones", "ADMIN_ACTIVE",
     "GET /api/v1/usuarios/estudiantes/", "apps/usuarios/views.py:StudentOptionViewSet.get_queryset", "apps/usuarios/views.py:CanManageApplications.has_permission", "CustomUser Postulacion",
     "El catálogo limita a estudiantes activos; con periodo y modalidad excluye quienes tienen postulación vigente.",
     "Solicitar opciones con filtros ~ Aplicar CanManageApplications y actividad ~ Filtrar estudiantes y ocupación condicional ~ Devolver opciones paginadas",
     "El alias bajo auth/estudiantes representa el mismo objetivo, no un caso duplicado.", "Opciones consultadas sin crear postulación.", "apps/usuarios/tests_students_api.py")
case("UC-USR-008", "Consultar candidatos a asignación", "asignaciones", "ADMIN",
     "GET /api/v1/usuarios/candidatos-asignacion/; GET /api/v1/postulaciones/{id}/candidatos-asignacion/", "apps/usuarios/views.py:AssignmentCandidateViewSet.get_queryset", "apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion", "CustomUser AsignacionPostulacion",
     "El catálogo excluye estudiantes y la consulta contextual aplica ocupación; inclusión no certifica elegibilidad institucional.",
     "Solicitar catálogo o consulta contextual ~ Exigir autoridad y permisos de la vista elegida ~ Aplicar filtros de cuentas y contexto ~ Devolver candidatos con disponibilidad cuando corresponde",
     "El contexto de participación/etapa puede imponer restricciones adicionales; no autoriza una asignación por sí solo.", "Candidatos consultados sin crear vínculos.", "apps/usuarios/tests_assignment_candidates_api.py")
case("UC-USR-009", "Iniciar sesión estudiantil con R.U. y C.I.", "usuarios", "PUBLIC",
     "POST /api/v1/auth/student-login/", "apps/usuarios/views.py:StudentTokenObtainPairView.post", "apps/usuarios/student_auth.py:authenticate_student", "CustomUser StudentLoginThrottle",
     "Requiere cuenta estudiantil existente, activa y no staff/superusuario; controla intentos por cuenta y origen.",
     "Enviar ru y ci ~ Normalizar identificadores y comprobar contadores ~ Resolver cuenta inequívoca y comparar C.I. ~ Emitir JWT o contabilizar rechazo",
     "Bloqueo y credenciales inválidas reciben mensaje genérico; nunca autoinscribe una cuenta.", "Tokens emitidos y last_login actualizado, o rechazo registrado.", "apps/usuarios/tests_student_login.py")
case("UC-ACA-003", "Administrar periodos", "academico", "ADMIN",
     "POST /api/v1/academico/periodos/; PUT/PATCH/DELETE /api/v1/academico/periodos/{id}/", "apps/academico/views.py:PeriodoViewSet", "apps/academico/serializers.py:PeriodoSerializer.validate", "Periodo",
     "La escritura exige administración; PeriodoSerializer compara fechas cuando ambas se reciben, y el modelo declara unicidad de gestión/semestre.",
     "Enviar operación y datos ~ Aplicar IsStaffOrReadOnly ~ Validar el serializer, sin presumir llamada automática a model.clean ~ Persistir y devolver recurso",
     "GET permite lectura autenticada. Las referencias pueden impedir eliminación.", "Periodo gestionado conforme al modelo.", "apps/academico/tests.py")
case("UC-ACA-004", "Administrar requisitos y relaciones de modalidad", "academico", "ADMIN",
     "POST /api/v1/academico/requisitos/; POST /api/v1/academico/modalidad-requisitos/; PUT/PATCH/DELETE de sus detalles", "apps/academico/views.py:ModalidadRequisitoViewSet", "apps/academico/serializers.py:ModalidadRequisitoSerializer.validate", "Requisito ModalidadRequisito Modalidad",
     "La relación modalidad/requisito es única y tiene orden válido; no es un gate universal.",
     "Enviar requisito o relación ~ Exigir administración ~ Validar referencias y orden ~ Ejecutar operación de catálogo",
     "La lectura es autenticada. Actualizar un catálogo no demuestra que todos los gates de políticas se redefinan.", "Requisito o relación persistido.", "apps/academico/tests.py")
case("UC-ACA-005", "Consultar modalidades y capacidades", "academico", "AUTH",
     "GET /api/v1/academico/modalidades/; GET /api/v1/academico/modalidades/{id}/capacidades/", "apps/academico/views.py:ModalidadViewSet.capacidades", "apps/modalidades/policies.py:ModalidadPolicyRegistry", "Modalidad EtapaModalidad",
     "Un código sin política informa no soporte; no adopta reglas de Proyecto por respaldo.",
     "Solicitar catálogo o capacidades ~ Autenticar y resolver modalidad ~ Contrastar registro y etapas persistidas ~ Devolver capacidades y advertencias",
     "El alias /api/v1/modalidades/{id}/capacidades/ no es un objetivo nuevo.", "Capacidades consultadas, sin transición.", "apps/modalidades/tests_policies.py")
case("UC-ACA-006", "Consultar o descargar documentos oficiales", "academico", "AUTH",
     "GET /api/v1/academico/modalidades/{id}/documentos-oficiales/; GET /api/v1/academico/modalidades/{id}/documentos-oficiales/{documento_id}/descargar/", "apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial", "apps/academico/views.py:ModalidadViewSet._documento_oficial", "DocumentoOficialModalidad Modalidad",
     "La descarga comprueba pertenencia a modalidad y existencia del archivo.",
     "Solicitar metadatos o descarga ~ Autenticar y resolver documento del catálogo ~ Comprobar archivo para descarga ~ Devolver listado o FileResponse",
     "La lista vacía es válida; detalle/archivo ausente produce 404 en descarga.", "Documento consultado sin publicarlo ni sustituirlo.", "apps/academico/tests_documento_oficial_modalidad.py")
case("UC-POS-009", "Consultar seguimiento de etapas", "seguimiento", "RELATED",
     "GET /api/v1/seguimientos-etapa/; GET /api/v1/seguimientos-etapa/{id}/", "apps/postulantes/views.py:SeguimientoEtapaViewSet.get_queryset", "apps/postulantes/serializers.py:SeguimientoEtapaSerializer", "SeguimientoEtapa Postulacion",
     "El queryset admite propiedad/asignación sin exigir allí rol DOCENTE; las acciones proyectadas se reservan a administración.",
     "Solicitar seguimiento con filtros ~ Autenticar y acotar queryset ~ Serializar etapas visibles ~ Devolver acciones permitidas según autoridad",
     "Asignación histórica permite lectura en este filtro; no concede transición.", "Etapas consultadas sin mutarlas.", "apps/postulantes/tests_workflow.py")
case("UC-POS-010", "Consultar historial y observaciones", "postulaciones", "RELATED",
     "GET /api/v1/postulaciones/historial/; GET /api/v1/postulaciones/observaciones/", "apps/postulantes/views.py:HistorialEstadoViewSet.get_queryset", "apps/postulantes/views.py:ObservacionViewSet.get_queryset", "HistorialEstado Observacion Postulacion",
     "Ambos querysets acotan por propiedad o asignación; el historial no admite CRUD de escritura.",
     "Solicitar historial u observaciones ~ Autenticar y filtrar recursos relacionados ~ Aplicar búsqueda y orden admitidos ~ Devolver registros visibles",
     "Una lista vacía no revela datos ajenos. Registrar observaciones es otro objetivo administrativo.", "Trazabilidad consultada.", "apps/postulantes/tests_security_contract.py")
case("UC-POS-011", "Registrar una postulación histórica", "postulaciones", "ADMIN",
     "POST /api/v1/postulaciones/historicas/", "apps/postulantes/views.py:PostulacionViewSet.historicas", "apps/postulantes/services.py:PostulacionService.crear_postulacion_historica", "Postulacion Modalidad CustomUser",
     "El registro histórico usa serializer y servicio propios, sin equipararse a seguimiento ejecutado.",
     "Enviar datos históricos ~ Aplicar IsStaff y validar payload ~ Crear mediante servicio histórico ~ Devolver postulación histórica",
     "Adjuntar evidencia histórica usa una acción separada; no acredita un recorrido E2E.", "Registro histórico guardado.", "apps/postulantes/tests_us007.py")
case("UC-POS-012", "Inicializar el flujo", "seguimiento", "ADMIN",
     "POST /api/v1/postulaciones/{id}/flujo/inicializar/", "apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo", "apps/postulantes/workflow.py:WorkflowService.inicializar_flujo", "SeguimientoEtapa Postulacion EtapaModalidad",
     "Esta acción usa el orquestador de Proyecto o el motor genérico; no es idéntica a todas las ramas de create.",
     "Solicitar inicialización ~ Exigir administración y resolver postulación ~ Invocar orquestador o WorkflowService según código ~ Devolver seguimientos ordenados",
     "Configuración sin etapas o postulación no operativa rechaza la inicialización.", "Seguimientos inicializados o conservados por el motor.", "apps/postulantes/tests_workflow.py", "Etapas activas y política aplicable.")
case("UC-POS-013", "Crear un nuevo intento de etapa", "seguimiento", "ADMIN",
     "POST /api/v1/postulaciones/{id}/etapas/{etapa_id}/nuevo-intento/", "apps/postulantes/views.py:PostulacionViewSet.nuevo_intento", "apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento", "SeguimientoEtapa EtapaModalidad Postulacion",
     "La elegibilidad de repetición e intentos corresponde a la política de la modalidad.",
     "Seleccionar etapa activa ~ Exigir administración y resolver contexto ~ Validar repetición y límites ~ Crear y devolver nuevo seguimiento",
     "Etapa inexistente o límite alcanzado rechaza; no hay máximo universal.", "Intento nuevo registrado si es admisible.", "apps/postulantes/tests_workflow.py", "Estado previo y repetición elegibles según política.")
case("UC-POS-014", "Registrar dictamen documental", "seguimiento", "ADMIN",
     "POST /api/v1/seguimientos-etapa/{id}/dictamenes-revision/", "apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision", "apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar", "DictamenRevisionDocumento VersionDocumento AsignacionPostulacion SeguimientoEtapa",
     "Dictamen se atribuye a emisor y versión; el cargo tutor/tribunal no concede escritura API.",
     "Enviar tipo, resultado y versiones ~ Exigir administración y validar payload ~ Aplicar validación de servicio y política ~ Devolver dictamen registrado",
     "GET de la misma acción consulta por alcance del seguimiento.", "Dictamen vinculado a versión y emisor guardado.", "apps/postulantes/tests_dictamen_revision.py", "Etapa, asignación y evidencia válidas.")
case("UC-POS-015", "Registrar evidencia de revisión previa", "seguimiento", "ADMIN",
     "POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/; POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/{informe_id}/actualizar-evidencia/", "apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal", "apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService", "InformeRevisionTribunalPrevia VersionDocumento SeguimientoEtapa",
     "El informe y la sustitución de evidencia validan revisión y contexto habilitados.",
     "Enviar informe o evidencia nueva ~ Exigir administración y resolver seguimiento ~ Ejecutar registrar_informe o actualizar_evidencia ~ Devolver informe serializado",
     "GET permite consultar informes relacionados; actualizar evidencia no crea otra etapa.", "Informe/evidencia registrados.", "apps/postulantes/tests_revision_tribunal.py", "Revisión previa soportada y referencias válidas.")
case("UC-POS-016", "Consultar asignaciones e historial de cargos", "asignaciones", "RELATED",
     "GET /api/v1/asignaciones/; GET /api/v1/asignaciones/{id}/", "apps/postulantes/views.py:AsignacionPostulacionViewSet.get_queryset", "apps/postulantes/views.py:AsignacionPostulacionViewSet", "AsignacionPostulacion Postulacion",
     "La consulta canónica usa all_objects y mantiene vínculos históricos en el alcance.",
     "Solicitar asignaciones con postulación y filtros ~ Aplicar autenticación y alcance relacionado ~ Serializar asignaciones activas e históricas ~ Devolver resultado paginado",
     "Los alias contextuales de postulación conservan su helper específico; no se unifican sus permisos por analogía.", "Asignaciones consultadas sin cambiar vigencia.", "apps/postulantes/tests_assignments.py")
case("UC-POS-017", "Finalizar o reemplazar asignación", "asignaciones", "ADMIN",
     "POST /api/v1/asignaciones/{id}/finalizar|reemplazar/", "apps/postulantes/views.py:AsignacionPostulacionViewSet.finalizar", "apps/postulantes/asignaciones.py:AsignacionService.finalizar_asignacion", "AsignacionPostulacion Postulacion",
     "Finalización y reemplazo validan contexto y conservan historial de asignaciones.",
     "Enviar acción y payload ~ Exigir administración ~ Aplicar serializer y servicio de asignación ~ Devolver asignación según acción",
     "Reemplazar vuelve a validar al usuario nuevo y no borra el historial.", "Asignación finalizada o reemplazada.", "apps/postulantes/tests_assignments.py", "Postulación operable y restricciones de eventos/política.")
case("UC-POS-018", "Consultar defensas y quórum", "defensas", "DEFENSE_READ",
     "GET /api/v1/eventos-defensa/; GET /api/v1/eventos-defensa/{id}/quorum/", "apps/postulantes/defensas_api.py:EventoDefensaViewSet.get_queryset", "apps/postulantes/defensas.py:EventoDefensaService.validar_quorum", "EventoDefensa ParticipanteEvento EvaluacionDefensa",
     "La vista de eventos admite propiedad, asignación o participación; el alias contextual usa alcance común.",
     "Solicitar eventos o quórum ~ Aplicar alcance de eventos ~ Cargar participantes y evidencias ~ Devolver datos o conteos/faltantes",
     "Quórum técnico no certifica composición institucional; lista vacía y 404 conservan aislamiento.", "Evento consultado sin iniciar defensa.", "apps/postulantes/tests_defensas_consulta.py")
case("UC-POS-019", "Administrar participantes de defensa", "defensas", "ADMIN",
     "POST /api/v1/eventos-defensa/{id}/participantes/agregar/; POST /api/v1/eventos-defensa/{id}/participantes/{participante_id}/remover/", "apps/postulantes/defensas_api.py:EventoDefensaViewSet.agregar", "apps/postulantes/defensas.py:EventoDefensaService.agregar_participante", "ParticipanteEvento AsignacionPostulacion EventoDefensa",
     "Alta, retiro y reactivación validan estado y política; el retiro es lógico.",
     "Enviar asignación/rol o participante a retirar ~ Exigir administración y resolver evento ~ Validar pertenencia y estado ~ Registrar alta, reactivación o retiro",
     "Reactivar reutiliza el registro histórico; estados terminales rechazan cambios.", "Participantes actualizados sin borrar historial.", "apps/postulantes/tests_defensas.py", "Estado y asignación admitidos por la política.")
case("UC-POS-020", "Registrar asistencia de defensa", "defensas", "ADMIN",
     "POST /api/v1/eventos-defensa/{id}/asistencia/", "apps/postulantes/defensas_api.py:EventoDefensaViewSet.asistencia", "apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia", "ParticipanteEvento EventoDefensa",
     "El participante pertenece al evento; asistencia se registra en EN_CURSO.",
     "Enviar participante y presencia ~ Exigir administración y validar payload ~ Comprobar pertenencia al evento ~ Registrar y devolver asistencia",
     "El inicio de evento recibe asistencias iniciales mediante otro payload del ciclo.", "Asistencia y responsable registrados.", "apps/postulantes/tests_defensas.py", "Evento EN_CURSO y participante válido.")
case("UC-POS-021", "Registrar evaluación de defensa", "defensas", "ADMIN",
     "POST /api/v1/eventos-defensa/{id}/evaluaciones/{tipo}/", "apps/postulantes/defensas_api.py:EventoDefensaViewSet.evaluar", "apps/postulantes/defensas.py:EvaluacionDefensaService._registrar", "EvaluacionDefensa EventoDefensa ParticipanteEvento",
     "Administración registra por API; evaluador atribuido, escala, consenso y semántica dependen de modalidad/tipo.",
     "Enviar resultado o nota y datos de evaluación ~ Exigir administración y validar EvaluarPayload ~ Seleccionar registro temática/perfil/privada/pública ~ Aplicar servicio y política y devolver evaluación",
     "Campos nota_privada/nota_publica y semantica_nota conservan su contrato; no hay escala universal.", "Evaluación guardada; consolidación separada.", "apps/postulantes/tests_defensas.py", "Estado, quórum y modalidad de registro válidos.")
case("UC-POS-022", "Consultar o recalcular resultado final", "defensas", "COMMON",
     "GET /api/v1/postulaciones/{id}/resultado-final/; POST /api/v1/postulaciones/{id}/resultado-final/calcular/", "apps/postulantes/defensas_api.py:ResultadoFinalView", "apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final", "Postulacion EvaluacionDefensa",
     "GET usa alcance común; POST exige administración y audita el cálculo.",
     "Solicitar resultado ~ Resolver alcance y exigir administración si es POST ~ Calcular con política y auditar según método ~ Devolver resultado",
     "Estudiante/Docente solo participan en la variante GET; calcular no concluye.", "Resultado derivado devuelto; auditoría en POST.", "apps/postulantes/tests_defensas.py")
case("UC-POS-023", "Verificar condiciones complementarias", "complementarios", "ADMIN",
     "POST /api/v1/gestion-complementaria/condiciones/; POST /api/v1/gestion-complementaria/condiciones/{id}/verificar|rechazar/", "apps/postulantes/complementarios_api.py:CondicionViewSet", "apps/postulantes/complementarios.py:CondicionService", "CondicionPostulacion Postulacion",
     "Verificar o rechazar condiciones requiere administración y postulación operable.",
     "Enviar condición o selección ~ Exigir administración y validar payload ~ Aplicar CondicionService ~ Devolver condición o lote",
     "verificar-multiples usa payload propio; condición administrativa no equivale a archivo.", "Condición registrada o verificada.", "apps/postulantes/tests_complementarios.py", "Postulación editable y condición admitida.")
case("UC-POS-024", "Cambiar estado general administrativamente", "postulaciones", "ADMIN",
     "PATCH /api/v1/postulaciones/{id}/", "apps/postulantes/views.py:PostulacionViewSet.partial_update", "apps/postulantes/services.py:PostulacionService.cambiar_estado", "Postulacion EstadoPostulacion HistorialEstado AuditLog",
     "PATCH con estado_actual llama cambiar_estado; no es el mismo recorrido que concluir_academicamente.",
     "Enviar estado_actual y comentario ~ Exigir administración y resolver postulación ~ Resolver estado y rechazar cambio idéntico ~ Guardar estado, historial y auditoría",
     "Sin estado_actual usa actualización ordinaria; no se atribuyen gates de WorkflowService a esta rama.", "Estado general cambiado si el servicio lo acepta.", "apps/postulantes/tests.py", "Estado existente y diferente; no se infieren gates adicionales ausentes.")
case("UC-POS-025", "Registrar observación de postulación", "postulaciones", "ADMIN",
     "POST /api/v1/postulaciones/observaciones/", "apps/postulantes/views.py:ObservacionViewSet.create", "apps/postulantes/services.py:PostulacionService.agregar_observacion", "Observacion Postulacion CustomUser",
     "Observación de postulación y observación sobre versión documental son registros distintos.",
     "Enviar contexto y comentario ~ Aplicar IsStaffOrReadOnly y serializer ~ Registrar por la vista y servicio ~ Devolver observación creada",
     "Las demás operaciones CRUD del ViewSet mantienen permisos y serializer; no son aprobaciones académicas.", "Comentario asociado al expediente.", "apps/postulantes/tests.py")
case("UC-POS-026", "Recepcionar entrega física", "complementarios", "ADMIN",
     "POST /api/v1/gestion-complementaria/entregas-fisicas/; POST /api/v1/gestion-complementaria/entregas-fisicas/{id}/registrar/", "apps/postulantes/complementarios_api.py:EntregaFisicaViewSet", "apps/postulantes/complementarios.py:EntregaFisicaService", "EntregaFisica Postulacion",
     "La recepción registra cantidades y responsable; no certifica una cantidad normativa universal.",
     "Enviar tipo o cantidades recibidas ~ Exigir administración y validar payload ~ Aplicar servicio de entregas ~ Devolver estado de recepción",
     "registrar-multiples recibe un lote; actualizar-cantidad reutiliza registrar.", "Recepción o cantidad actualizada.", "apps/postulantes/tests_complementarios.py", "Postulación editable y entrega admitida por política.")
case("UC-POS-027", "Consultar condiciones y entregas", "complementarios", "RELATED",
     "GET /api/v1/gestion-complementaria/condiciones/; GET /api/v1/gestion-complementaria/entregas-fisicas/", "apps/postulantes/complementarios_api.py:RelatedViewSet.get_queryset", "apps/postulantes/complementarios_api.py:CondicionViewSet", "CondicionPostulacion EntregaFisica Postulacion",
     "La lectura admite propiedad/asignación; http_method_names excluye PUT, PATCH y DELETE.",
     "Solicitar controles con filtros ~ Autenticar y acotar queryset ~ Filtrar estado o pendientes/completadas ~ Devolver recursos visibles",
     "Un listado vacío no crea ni verifica controles.", "Gestión complementaria consultada.", "apps/postulantes/tests_complementarios.py")

case("UC-DOC-003", "Consultar documentos y descargar versiones", "documentos", "RELATED",
     "GET /api/v1/documentos/documentos/; GET /api/v1/documentos/documentos/{id}/versiones/; GET /api/v1/documentos/versiones/{id}/descargar/", "apps/documentos/views.py:VersionDocumentoViewSet.descargar", "apps/documentos/views.py:DocumentoPostulacionViewSet.get_queryset", "DocumentoPostulacion VersionDocumento ObservacionDocumento",
     "El alcance documental admite propiedad/asignación; memorandos restringen visibilidad a publicaciones vigentes para no administradores.",
     "Solicitar documentos, versiones o descarga ~ Aplicar queryset y filtros de publicación ~ Resolver versión y comprobar archivo si se descarga ~ Devolver metadatos o archivo con nombre saneado",
     "Archivo ausente devuelve 404. No se ofrecen todas las versiones de un memorando a un lector relacionado.", "Documentación consultada o descargada sin cambiar revisión.", "apps/documentos/test_api.py")
case("UC-DOC-004", "Marcar observación documental como corregida", "documentos", "ADMIN",
     "POST /api/v1/documentos/observaciones/{id}/marcar-corregida/", "apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida", "apps/documentos/services.py:DocumentoService.marcar_observacion_corregida", "ObservacionDocumento VersionDocumento DocumentoPostulacion AuditLog",
     "La vista y el servicio exigen administración; ser propietario no autoriza esta escritura.",
     "Seleccionar observación ~ Aplicar permiso administrativo y resolver objeto ~ Bloquear y marcar corrección con fecha ~ Recalcular pendientes de la versión actual y auditar",
     "Una observación ya corregida rechaza la operación; corregir una versión histórica no inventa pendientes en la versión actual.", "Corrección marcada y requiere_correccion recalculado.", "apps/documentos/test_api.py")
case("UC-DOC-005", "Registrar confirmación técnica entre versiones", "documentos", "ADMIN",
     "POST /api/v1/documentos/confirmaciones-correccion/", "apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create", "apps/documentos/services.py:ConfirmacionCorreccionDocumentoService.registrar", "ConfirmacionCorreccionDocumento VersionDocumento AsignacionPostulacion",
     "La confirmación exige coherencia de versiones, postulación, evento y asignación, más validación de política.",
     "Enviar versiones, contexto y asignación confirmante ~ Exigir administración y validar serializer ~ Construir confirmación con confirmado_por=request.user ~ Ejecutar full_clean, validación de política y auditoría",
     "PUT/PATCH/DELETE están heredados del ModelViewSet y no pasan por este método create; se registran como superficie pendiente de caracterización, no se ejecutan.", "Confirmación técnica y auditoría guardadas.", "apps/documentos/test_api.py", "Versiones del mismo documento, corregida posterior y contexto válido según política.")
case("UC-DOC-006", "Adjuntar evidencia a un registro histórico", "documentos", "ADMIN",
     "GET /api/v1/postulaciones/{id}/documentos-historicos/tipos/; POST /api/v1/postulaciones/{id}/documentos-historicos/subir/", "apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico", "apps/documentos/services.py:DocumentoService.subir_documento_historico", "Postulacion DocumentoPostulacion VersionDocumento",
     "La carga histórica tiene contrato específico y no debe simular el workflow ordinario.",
     "Consultar tipos históricos admitidos ~ Enviar evidencia con administración ~ Validar tipo y registro histórico ~ Guardar evidencia con el servicio histórico y devolver versión",
     "Una postulación ordinaria no se convierte en histórica para evitar requisitos de carga.", "Evidencia asociada al registro histórico.", "apps/postulantes/tests_us007.py", "Registro HISTORICO y tipo de evidencia admitido.")
case("UC-NOT-002", "Actualizar lectura de notificaciones propias", "notificaciones", "AUTH",
     "POST /api/v1/notificaciones/{id}/marcar-leida|marcar-no-leida/; POST /api/v1/notificaciones/marcar-todas-leidas/", "apps/notificaciones/views.py:NotificacionViewSet.marcar_leida", "apps/notificaciones/services.py:NotificationService.marcar_leida", "Notificacion AuditLog",
     "Solo el destinatario modifica lectura; los cambios masivos se limitan a sus notificaciones.",
     "Elegir leída, no leída o todas leídas ~ Autenticar y resolver notificación propia si corresponde ~ Aplicar servicio y fecha de lectura ~ Devolver notificación o cantidad actualizada",
     "Marcar leída nuevamente conserva idempotencia; no hay borrado habilitado.", "Lectura actualizada conforme al destinatario.", "apps/notificaciones/tests_api.py")
case("UC-REP-002", "Consultar dashboard institucional", "reportes", "REPORT",
     "GET /api/v1/reportes/dashboard/", "apps/reportes/views.py:DashboardView.get", "apps/reportes/services.py:DashboardService.obtener_dashboard", "Postulacion Modalidad",
     "CanViewInstitutionalReports permite administración o DOCENTE y el servicio aplica alcance de datos.",
     "Enviar filtros del dashboard ~ Exigir permiso institucional ~ Obtener indicadores sobre queryset permitido ~ Devolver agregados",
     "Un conjunto sin datos conserva la respuesta del servicio, sin ampliar alcance por rol.", "Indicadores consultados sin modificar expedientes.", "apps/reportes/tests_dashboard.py")
case("UC-REP-003", "Consultar reporte de postulaciones", "reportes", "REPORT",
     "GET /api/v1/reportes/postulaciones/", "apps/reportes/views.py:PostulacionesReportView.get", "apps/reportes/services.py:ReportePostulacionesService", "Postulacion Modalidad Periodo",
     "Los filtros se validan y el docente conserva el alcance de asignaciones.",
     "Solicitar reporte y filtros ~ Comprobar permiso institucional ~ Construir queryset acotado y proyección ~ Devolver reporte paginado",
     "Consultar no habilita exportar; el estudiante no recibe este permiso por ser propietario.", "Reporte consultado con su alcance.", "apps/reportes/tests.py")
case("UC-REP-004", "Exportar un reporte institucional", "reportes", "ADMIN",
     "GET /api/v1/reportes/postulaciones/exportar/; GET /api/v1/reportes/resultados/exportar/", "apps/reportes/views.py:ExportView.get", "apps/reportes/permissions.py:CanExportReports.has_permission", "Postulacion EvaluacionDefensa",
     "Exportar requiere administración; filtros, formatos y límites dependen del recurso de reporte elegido.",
     "Enviar filtros y formato de exportación ~ Comprobar CanExportReports ~ Construir filas del reporte correspondiente ~ Generar y devolver archivo según formato admitido",
     "Resultados usa AcademicResultsExportView; no se presume que ambos reportes soporten idénticos formatos o límites.", "Archivo generado sin alterar evaluaciones.", "apps/reportes/tests_resultados_export.py")
case("UC-TD-002", "Registrar informe institucional de Trabajo Dirigido", "trabajo", "ADMIN",
     "POST /api/v1/postulaciones/{id}/trabajo-dirigido/informes/", "apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post", "apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.registrar_informe", "InformeSeguimientoTrabajoDirigido TrabajoDirigidoExpediente",
     "El informe pertenece al expediente institucional y registra al usuario que lo incorpora.",
     "Enviar periodo y contenido del informe ~ Exigir administración y resolver Trabajo Dirigido ~ Validar expediente y datos mediante el servicio ~ Devolver id y periodo",
     "El supervisor puede estar descrito en el expediente, pero eso no crea una cuenta ni permiso de carga para él.", "Informe institucional guardado.", "apps/modalidades/tests_trabajo_dirigido.py", "TRABAJO_DIRIGIDO y expediente institucional válido.")
case("UC-TD-003", "Concluir Trabajo Dirigido", "trabajo", "ADMIN",
     "POST /api/v1/postulaciones/{id}/trabajo-dirigido/concluir/", "apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post", "apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.concluir", "Postulacion SeguimientoEtapa",
     "El servicio opera CIERRE_DOCUMENTAL y después invoca conclusión común con validación propia.",
     "Solicitar conclusión con administración ~ Resolver postulación de Trabajo Dirigido ~ Iniciar/aprobar cierre documental si corresponde ~ Invocar WorkflowService.concluir_postulacion ~ Devolver la etapa de cierre",
     "No es la misma secuencia que la conclusión de Examen o el cierre técnico de Proyecto.", "Trabajo Dirigido concluido cuando sus gates lo permiten.", "apps/modalidades/tests_trabajo_dirigido.py", "Requisitos y acta de Trabajo Dirigido válidos según política.")
case("UC-TD-004", "Consultar expediente específico de Trabajo Dirigido", "trabajo", "COMMON",
     "GET /api/v1/postulaciones/{id}/trabajo-dirigido/", "apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.get", "apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.overview", "TrabajoDirigidoExpediente InformeSeguimientoTrabajoDirigido",
     "La consulta pasa por get_postulacion_in_scope y la validación de modalidad del servicio.",
     "Solicitar vista específica ~ Aplicar alcance común y vínculo ~ Resolver datos institucionales e informes ~ Devolver overview del servicio",
     "Postulación fuera de alcance o modalidad incorrecta no se presenta como un expediente válido.", "Información específica consultada.", "apps/modalidades/tests_trabajo_dirigido.py")
case("UC-EG-002", "Concluir Examen de Grado", "examen", "ADMIN",
     "POST /api/v1/postulaciones/{id}/examen/concluir/", "apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post", "apps/modalidades/examen_grado_service.py:ExamenGradoService.concluir", "Postulacion SeguimientoEtapa ExamenArea",
     "El servicio valida política, aprueba CONCLUSION_ACADEMICA y formaliza el estado general.",
     "Solicitar conclusión ~ Exigir administración y resolver Examen ~ Validar condiciones e iniciar/aprobar etapa final si procede ~ Actualizar estado general CONCLUIDA y devolver etapa",
     "POST del overview sin area también toma la rama de conclusión; es un alias operativo, no otro caso.", "Examen concluido si cumple sus gates.", "apps/modalidades/tests_examen_grado.py", "Áreas y documentos exigidos por Examen válidos.")
case("UC-EG-003", "Consultar evaluación por áreas de Examen", "examen", "COMMON",
     "GET /api/v1/postulaciones/{id}/examen/", "apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get", "apps/modalidades/examen_grado_service.py:ExamenGradoService.overview", "ExamenArea ExamenEvaluacion",
     "El overview usa la política y composición propias de Examen, bajo alcance común.",
     "Solicitar overview de Examen ~ Resolver alcance y modalidad ~ Obtener áreas, evaluaciones y composición del servicio ~ Devolver vista específica",
     "No permite registrar evaluaciones al usuario lector. Los efectos auxiliares de ensure_areas se describen en el código; no se afirma que todo GET sea físicamente inmutable.", "Vista de áreas devuelta.", "apps/modalidades/tests_examen_grado.py")
case("UC-EA-002", "Configurar criterio de Excelencia", "excelencia", "ADMIN",
     "POST /api/v1/postulaciones/{id}/excelencia/configurar/", "apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post", "apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio", "ExcelenciaExpediente SeguimientoEtapa",
     "El criterio queda sujeto a invariantes del modelo y al inicio del flujo específico.",
     "Enviar criterio ~ Exigir administración y resolver Excelencia ~ Configurar expediente mediante el servicio ~ Devolver criterio registrado",
     "Un criterio no se puede cambiar libremente después del registro/inicio; no se inventa conexión a kardex.", "Criterio configurado según el servicio.", "apps/modalidades/tests_excelencia_academica.py", "Criterio admitido e invariantes de expediente/flujo.")
case("UC-EA-003", "Concluir Excelencia Académica", "excelencia", "ADMIN",
     "POST /api/v1/postulaciones/{id}/excelencia/concluir/", "apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post", "apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.concluir", "Postulacion ExcelenciaExpediente SeguimientoEtapa",
     "Conclusión valida política propia, etapa final y estado general; no reutiliza defensa numérica de Proyecto.",
     "Solicitar conclusión ~ Exigir administración y resolver expediente ~ Validar evaluación y acta mediante política ~ Iniciar/aprobar conclusión y actualizar CONCLUIDA",
     "Una evaluación favorable sola no sustituye el acta y demás requisitos.", "Excelencia concluida si cumple su validación.", "apps/modalidades/tests_excelencia_academica.py", "Evaluación favorable y acta válida según política.")
case("UC-EA-004", "Consultar expediente de Excelencia", "excelencia", "COMMON",
     "GET /api/v1/postulaciones/{id}/excelencia/", "apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.get", "apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.overview", "ExcelenciaExpediente Postulacion",
     "La consulta usa alcance común y conserva disponibilidad del criterio sin inventar una nota.",
     "Solicitar vista de Excelencia ~ Comprobar rol/vínculo y modalidad ~ Obtener criterio, evaluación y requisitos ~ Devolver overview",
     "Un expediente todavía no configurado no se describe como evaluado.", "Información de Excelencia consultada.", "apps/modalidades/tests_excelencia_academica.py")
case("UC-DIP-002", "Concluir graduación vía Diplomado", "diplomado", "ADMIN",
     "POST /api/v1/postulaciones/{id}/diplomado/concluir/", "apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post", "apps/modalidades/diplomado_service.py:DiplomadoService.conclude", "Postulacion DiplomadoModulo SeguimientoEtapa",
     "La conclusión aplica política propia y etapa CONCLUSION_ACADEMICA antes de formalizar estado general.",
     "Solicitar conclusión ~ Exigir administración y resolver Diplomado ~ Validar gates e iniciar/aprobar etapa final si procede ~ Actualizar CONCLUIDA y devolver etapa",
     "Aprobar módulos no sustituye defensa, documentación y demás condiciones de la política.", "Diplomado concluido si sus gates son válidos.", "apps/modalidades/tests_diplomado.py", "Requisitos de módulos, defensa y documentación propios.")
case("UC-DIP-003", "Consultar módulos y resultado de Diplomado", "diplomado", "COMMON",
     "GET /api/v1/postulaciones/{id}/diplomado/", "apps/modalidades/diplomado_api.py:DiplomadoOverviewView.get", "apps/modalidades/diplomado_service.py:DiplomadoService.overview", "DiplomadoModulo DiplomadoDefensa",
     "El overview pertenece a Diplomado y se limita por alcance común.",
     "Solicitar vista específica ~ Resolver permisos y modalidad ~ Obtener módulos y datos derivados mediante el servicio ~ Devolver overview",
     "La inicialización auxiliar de módulos del servicio no equivale a aprobación académica ni autoriza al lector a cargar notas.", "Vista de Diplomado devuelta.", "apps/modalidades/tests_diplomado.py")
