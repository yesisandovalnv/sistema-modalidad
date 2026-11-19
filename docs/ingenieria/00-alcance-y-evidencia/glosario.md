# Glosario técnico y académico

Definiciones documentales vinculadas al código; no sustituyen normativa institucional.

| Término | Significado en este sistema | Símbolo de referencia |
| --- | --- | --- |
| Postulación | Registro central de estudiante, modalidad, periodo y estado | Postulacion |
| Expediente | Vista y conjunto relacionado; no tabla única | ExpedientePage |
| Modalidad | Catálogo y comportamiento asociado por código | Modalidad, ModalidadPolicyRegistry |
| Política / policy | Especialización de validaciones académicas | BaseModalidadPolicy |
| Etapa configurada | Definición persistente de modalidad | EtapaModalidad |
| Seguimiento | Ejecución de etapa con estado e intento | SeguimientoEtapa |
| Estado general | Catálogo referenciado por postulación | EstadoPostulacion |
| Vigencia | Dimensión distinta del estado académico | Postulacion.VigenciaChoices |
| Histórico | Tipo de registro distinto del proceso con seguimiento | Postulacion.TipoRegistroChoices |
| Régimen | Variante almacenada del workflow de Proyecto | Postulacion.RegimenWorkflowChoices |
| Rol de acceso | Clasificación del usuario; no cargo académico | Role, CustomUser |
| Autoridad administrativa | Superusuario o ADMINISTRADOR | is_staff_user |
| Capacidad | Indicador de interfaz o disponibilidad; no sustituye permiso | UserCapabilitiesService, ModalidadCapabilities |
| Asignación | Vínculo de usuario, postulación y participación | AsignacionPostulacion |
| Tutor / tribunal | Participaciones; no roles universales de sesión | AsignacionPostulacion.TipoParticipacionChoices |
| Composición | Actores requeridos para un contexto | Políticas de evento y asignación |
| Quórum técnico | Validación de participantes/asistencia; no certificación legal | EventoDefensaService.validar_quorum |
| Documento / versión | Registro documental y versiones de archivo | DocumentoPostulacion, VersionDocumento |
| Dictamen | Revisión vinculada a versión concreta | DictamenRevisionDocumento |
| Memorando publicado | Evidencia y composición relacionadas | PublicacionMemorandumDesignacion |
| Defensa | Evento técnico de postulación y etapa | EventoDefensa |
| Semántica de nota | Interpretación de nota, incluida legacy | EvaluacionDefensa.SemanticaNota |
| Conclusión académica | Transición validada por política a CONCLUIDA | WorkflowService.concluir_postulacion |
| Cierre documental/técnico | Comprobaciones y operaciones; no conclusión universal | CierrePostulacionService |
| Evento de dominio | Mensaje interno de tipo, agregado y payload | DomainEvent |
| Postcommit | Ejecución después del commit | DomainEventPublisher.publish_after_commit |
| Entidad | Modelo persistente propio | Catálogo de entidades |
| DTO | Estructura de transferencia, no necesariamente persistente | ResultadoAcademicoDTO |
| Baseline | Referencia identificada por Git y variante local | Referencia del repositorio |
| Guarda UML | Condición de transición respaldada por evidencia | Convención PROPUESTA |

Fuentes: [postulaciones](../../../apps/postulantes/models.py), [académico](../../../apps/academico/models.py), [políticas](../../../apps/modalidades/policies.py), [usuarios](../../../apps/usuarios/models.py), [documentos](../../../apps/documentos/models.py), [workflow](../../../apps/postulantes/workflow.py), [resultados](../../../apps/reportes/resultados.py), [eventos](../../../apps/notificaciones/events.py), [frontend](../../../src/pages/postulantes/ExpedientePage.jsx).
