# Explicaciones académicas de las figuras propuestas

Numeración provisional para revisión. Cada título académico describe una figura existente; no crea un diagrama ni modifica su semántica. La evidencia es estática y corresponde al directorio de trabajo indicado en el informe. Las fichas originales contienen el detalle técnico y, para estados, los contratos de guardas y acciones.

<a id="figura-01"></a>

## Figura 01. Actores y objetivos principales del sistema

- Identificador conservado: **DIA-SYS-001**. Tipo: Casos de uso.
- Módulo: Sistema. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Delimita el sistema y diferencia actores de cargos académicos antes de explicar tecnología.

**Elementos y relaciones principales.** Siete actores funcionales y ocho objetivos representativos; asociaciones de interacción y generalizaciones hacia usuario autenticado.

**Proceso o funcionalidad representada.** UC-USR-001, UC-POS-002, UC-POS-003, UC-DOC-001, UC-POS-006, UC-NOT-001, UC-REP-001, UC-ACA-005.

**Interpretación técnica y relación con la implementación.** La autorización concreta se obtiene del backend y de la matriz de permisos. La vista es un resumen de los 75 objetivos, no su catálogo completo; un cargo de tutor o tribunal no concede acceso por sí mismo.

**Evidencia del código.** [apps/academico/views.py](../../../apps/academico/views.py); [ModalidadViewSet.capacidades (L142)](../../../apps/academico/views.py); [apps/documentos/services.py](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [apps/documentos/views.py](../../../apps/documentos/views.py); [DocumentoPostulacionViewSet.subir (L125)](../../../apps/documentos/views.py); [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [ModalidadPolicyRegistry (L392)](../../../apps/modalidades/policies.py); [apps/notificaciones/services.py](../../../apps/notificaciones/services.py); [NotificationService.listar_usuario (L77)](../../../apps/notificaciones/services.py); [apps/notificaciones/views.py](../../../apps/notificaciones/views.py); [NotificacionViewSet.get_queryset (L15)](../../../apps/notificaciones/views.py); [apps/postulantes/defensas.py](../../../apps/postulantes/defensas.py); [EventoDefensaService.programar_evento (L25)](../../../apps/postulantes/defensas.py); [apps/postulantes/defensas_api.py](../../../apps/postulantes/defensas_api.py); [PostulacionEventosView.post (L322)](../../../apps/postulantes/defensas_api.py); [apps/postulantes/permissions.py](../../../apps/postulantes/permissions.py); [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [apps/postulantes/views.py](../../../apps/postulantes/views.py); [PostulacionViewSet.get_queryset (L116)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.aprobar (L1001)](../../../apps/postulantes/views.py); [apps/postulantes/workflow.py](../../../apps/postulantes/workflow.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py); [apps/reportes/resultados.py](../../../apps/reportes/resultados.py); [ResultadoAcademicoReportService (L95)](../../../apps/reportes/resultados.py); [apps/reportes/views.py](../../../apps/reportes/views.py); [ResultadosAcademicosReportView.get (L57)](../../../apps/reportes/views.py); [apps/usuarios/serializers.py](../../../apps/usuarios/serializers.py); [LoginSerializer.validate (L49)](../../../apps/usuarios/serializers.py); [apps/usuarios/views.py](../../../apps/usuarios/views.py); [CustomTokenObtainPairView.post (L28)](../../../apps/usuarios/views.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-4/DIA-SYS-001.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-SYS-001.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-SYS-001.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

<a id="figura-02"></a>

## Figura 02. Casos de uso del seguimiento académico

- Identificador conservado: **DIA-POS-041**. Tipo: Casos de uso.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Expone la responsabilidad operativa central y separa consulta, transición, decisión y nuevo intento.

**Elementos y relaciones principales.** Administración opera transiciones, inicialización, decisiones, dictámenes e informes; propietario y vinculado consultan seguimiento.

**Proceso o funcionalidad representada.** UC-POS-003, UC-POS-005, UC-POS-009, UC-POS-012, UC-POS-013, UC-POS-014, UC-POS-015.

**Interpretación técnica y relación con la implementación.** Una asociación con un UC no habilita todas sus variantes HTTP. La lectura contextual de dictámenes e informes se desarrolla en la ampliación de permisos de fase 7, no se deduce de las asociaciones administrativas de escritura.

**Evidencia del código.** [apps/postulantes/decisiones_academicas.py](../../../apps/postulantes/decisiones_academicas.py); [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [apps/postulantes/dictamenes_revision.py](../../../apps/postulantes/dictamenes_revision.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [apps/postulantes/revision_tribunal.py](../../../apps/postulantes/revision_tribunal.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py); [apps/postulantes/serializers.py](../../../apps/postulantes/serializers.py); [SeguimientoEtapaSerializer (L282)](../../../apps/postulantes/serializers.py); [apps/postulantes/views.py](../../../apps/postulantes/views.py); [PostulacionViewSet.inicializar_flujo (L490)](../../../apps/postulantes/views.py); [PostulacionViewSet.nuevo_intento (L517)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.aprobar (L1001)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.dictamenes_revision (L825)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.get_queryset (L800)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.informes_revision_tribunal (L854)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.registrar_decision (L946)](../../../apps/postulantes/views.py); [apps/postulantes/workflow.py](../../../apps/postulantes/workflow.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py); [WorkflowService.crear_nuevo_intento (L213)](../../../apps/postulantes/workflow.py); [WorkflowService.inicializar_flujo (L22)](../../../apps/postulantes/workflow.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-041.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-041.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-041.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

<a id="figura-03"></a>

## Figura 03. Casos de uso de la gestión de evidencias documentales

- Identificador conservado: **DIA-DOC-040**. Tipo: Casos de uso.
- Módulo: Gestión documental. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Permite explicar carga, versiones, revisión y corrección sin mezclar sus responsabilidades.

**Elementos y relaciones principales.** Propietario, vinculado, autenticado y administración se relacionan con carga, consulta, revisión, catálogos, corrección y evidencia histórica.

**Proceso o funcionalidad representada.** UC-DOC-001, UC-DOC-002, UC-DOC-007, UC-DOC-008, UC-DOC-003, UC-DOC-004, UC-DOC-005, UC-DOC-006.

**Interpretación técnica y relación con la implementación.** Cargar no equivale a aprobar; confirmar corrección no equivale a cambiar el estado académico. Las mutaciones heredadas pendientes de caracterización no se presentan como flujos validados.

**Evidencia del código.** [apps/documentos/services.py](../../../apps/documentos/services.py); [ConfirmacionCorreccionDocumentoService.registrar (L913)](../../../apps/documentos/services.py); [DocumentoService.aprobar_documento (L492)](../../../apps/documentos/services.py); [DocumentoService.marcar_observacion_corregida (L700)](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [DocumentoService.subir_documento_historico (L331)](../../../apps/documentos/services.py); [apps/documentos/views.py](../../../apps/documentos/views.py); [ConfirmacionCorreccionDocumentoViewSet.create (L384)](../../../apps/documentos/views.py); [DocumentoPostulacionViewSet.aprobar (L182)](../../../apps/documentos/views.py); [DocumentoPostulacionViewSet.get_queryset (L82)](../../../apps/documentos/views.py); [DocumentoPostulacionViewSet.subir (L125)](../../../apps/documentos/views.py); [EstadoDocumentoViewSet (L34)](../../../apps/documentos/views.py); [ObservacionDocumentoViewSet.marcar_corregida (L357)](../../../apps/documentos/views.py); [TipoDocumentoViewSet (L48)](../../../apps/documentos/views.py); [VersionDocumentoViewSet.descargar (L305)](../../../apps/documentos/views.py); [apps/postulantes/views.py](../../../apps/postulantes/views.py); [EstadoPostulacionViewSet (L79)](../../../apps/postulantes/views.py); [PostulacionViewSet.subir_documento_historico (L451)](../../../apps/postulantes/views.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-4/DIA-DOC-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-DOC-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-DOC-040.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

<a id="figura-04"></a>

## Figura 04. Casos de uso de defensas y evaluación

- Identificador conservado: **DIA-POS-043**. Tipo: Casos de uso.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Explica quién consulta y quién registra los actos académicos; evita confundir evaluador registrado con operador.

**Elementos y relaciones principales.** Administración gestiona eventos, participantes, asistencia y evaluaciones; actores relacionados consultan defensas; estudiante/docente acceden a GET del resultado según alcance.

**Proceso o funcionalidad representada.** UC-POS-006, UC-POS-007, UC-POS-018, UC-POS-019, UC-POS-020, UC-POS-021, UC-POS-022.

**Interpretación técnica y relación con la implementación.** La nota del dibujo distingue GET de POST para recálculo. No establece una escala común para las seis modalidades ni autorización directa de todos los participantes.

**Evidencia del código.** [apps/postulantes/defensas.py](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService._registrar (L202)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.calcular_resultado_final (L263)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.consolidar_evaluacion_evento (L227)](../../../apps/postulantes/defensas.py); [EventoDefensaService.agregar_participante (L58)](../../../apps/postulantes/defensas.py); [EventoDefensaService.programar_evento (L25)](../../../apps/postulantes/defensas.py); [EventoDefensaService.registrar_asistencia (L142)](../../../apps/postulantes/defensas.py); [EventoDefensaService.validar_quorum (L153)](../../../apps/postulantes/defensas.py); [apps/postulantes/defensas_api.py](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.agregar (L260)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.asistencia (L271)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.consolidar (L296)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.evaluar (L285)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.get_queryset (L214)](../../../apps/postulantes/defensas_api.py); [PostulacionEventosView.post (L322)](../../../apps/postulantes/defensas_api.py); [ResultadoFinalView (L329)](../../../apps/postulantes/defensas_api.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-043.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-043.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-043.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

<a id="figura-05"></a>

## Figura 05. Arquitectura de componentes del sistema

- Identificador conservado: **DIA-SYS-006**. Tipo: Componentes.
- Módulo: Sistema. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Relaciona React, backend, políticas, persistencia, archivos y notificaciones en una sola vista arquitectónica.

**Elementos y relaciones principales.** La SPA se comunica por HTTP/JSON, multipart y Bearer con APIViews/ViewSets. Los servicios usan políticas y ORM; documentos acceden a archivos y el ORM a PostgreSQL.

**Proceso o funcionalidad representada.** SPA, seguridad, dominio, políticas, ORM y archivos.

**Interpretación técnica y relación con la implementación.** Los componentes representan responsabilidades, no microservicios desplegados. El evento posterior al commit es interno; el dibujo no acredita broker, correo externo ni cola distribuida.

**Evidencia del código.** [apps/documentos/services.py](../../../apps/documentos/services.py); [apps/notificaciones/events.py](../../../apps/notificaciones/events.py); [apps/postulantes/workflow.py](../../../apps/postulantes/workflow.py); [apps/reportes/services.py](../../../apps/reportes/services.py); [core/settings/base.py](../../../core/settings/base.py); [core/urls.py](../../../core/urls.py); [src/services/api.js](../../../src/services/api.js)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-SYS-006-componentes-general.puml) · [SVG](../diagramas/renderizados/DIA-SYS-006-componentes-general.svg) · [Ficha técnica](../diagramas/fichas/DIA-SYS-006-componentes-general.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Vista general selectiva: las dependencias no son una secuencia ni servicios desplegables separados. No hay broker externo demostrado. FileField representa rutas/archivos, no BLOB PostgreSQL.

<a id="figura-06"></a>

## Figura 06. Motor común y especialización por modalidad

- Identificador conservado: **DIA-MOD-002**. Tipo: Componentes.
- Módulo: Motor de modalidades. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Justifica reutilización técnica sin generalizar reglas académicas.

**Elementos y relaciones principales.** WorkflowService, DocumentoService y servicios de defensa consultan ModalidadPolicyRegistry; el registro enlaza las seis modalidades. Trabajo Dirigido importa clases concretas de Proyecto.

**Proceso o funcionalidad representada.** Motor común y seis políticas.

**Interpretación técnica y relación con la implementación.** La dependencia TD→PG es de código y no identidad normativa. El registro explícito en ModalidadesConfig.ready permite localizar la especialización; la semejanza de componentes no demuestra equivalencia de gates.

**Evidencia del código.** [apps/documentos/services.py](../../../apps/documentos/services.py); [apps/modalidades/apps.py](../../../apps/modalidades/apps.py); [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [apps/modalidades/trabajo_dirigido.py](../../../apps/modalidades/trabajo_dirigido.py); [apps/postulantes/defensas.py](../../../apps/postulantes/defensas.py); [apps/postulantes/workflow.py](../../../apps/postulantes/workflow.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-MOD-002-componentes-motor.puml) · [SVG](../diagramas/renderizados/DIA-MOD-002-componentes-motor.svg) · [Ficha técnica](../diagramas/fichas/DIA-MOD-002-componentes-motor.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Las flechas de registro no implican invocación simultánea de modalidades. No existe política académica de respaldo para códigos sin registro.

<a id="figura-07"></a>

## Figura 07. Despliegue local declarado mediante Docker Compose

- Identificador conservado: **DIA-SYS-007**. Tipo: Despliegue.
- Módulo: Sistema. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Separa arquitectura lógica de infraestructura comprobable y delimita desarrollo frente a producción.

**Elementos y relaciones principales.** Contenedores frontend, backend y PostgreSQL, red default implícita, bind mounts del repositorio/media/backups y volúmenes de datos/node_modules.

**Proceso o funcionalidad representada.** Tres servicios, red implícita, puertos y montajes.

**Interpretación técnica y relación con la implementación.** Los puertos 15174→5173, 19001→8000 y 5540→5432 son valores por defecto declarados, no observación de procesos ni valores efectivos de .env. No se ejecutó el entrypoint ni se acredita una topología de producción.

**Evidencia del código.** [Dockerfile.backend](../../../Dockerfile.backend); [Dockerfile.frontend](../../../Dockerfile.frontend); [core/settings/production.py](../../../core/settings/production.py); [docker-compose.yml](../../../docker-compose.yml); [docker/backend/entrypoint.sh](../../../docker/backend/entrypoint.sh); [src/config/env.js](../../../src/config/env.js)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-SYS-007-despliegue-docker.puml) · [SVG](../diagramas/renderizados/DIA-SYS-007-despliegue-docker.svg) · [Ficha técnica](../diagramas/fichas/DIA-SYS-007-despliegue-docker.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Infraestructura declarada de desarrollo, no contenedores observados. No se ejecutó Docker ni se leyó .env. Producción no representada como desplegada; no se afirma proxy, TLS terminado o nube.

<a id="figura-08"></a>

## Figura 08. Modelo de dominio del expediente y su historial

- Identificador conservado: **DIA-POS-001**. Tipo: Clases.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Presenta el agregado conceptual de postulación y separa estado, historial y observación.

**Elementos y relaciones principales.** Postulacion se relaciona con estudiante, modalidad y periodo obligatorios; estado_actual es opcional. HistorialEstado y Observacion referencian la postulación y al usuario.

**Proceso o funcionalidad representada.** EstadoPostulacion, Postulacion, HistorialEstado, Observacion.

**Interpretación técnica y relación con la implementación.** Las multiplicidades describen estructura ORM. Estado general, vigencia y tipo de registro son dimensiones distintas; no se infiere composición UML ni un workflow completo de estas asociaciones.

**Evidencia del código.** [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-POS-001-postulaciones-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-001-postulaciones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False.

<a id="figura-09"></a>

## Figura 09. Modelo de dominio del seguimiento por etapa e intento

- Identificador conservado: **DIA-POS-002**. Tipo: Clases.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Explica por qué cada ejecución de una etapa necesita un registro de seguimiento propio.

**Elementos y relaciones principales.** SeguimientoEtapa referencia una Postulacion y una EtapaModalidad; abierta_por y cerrada_por admiten ausencia. Estado, numero_intento y fechas documentan ejecución.

**Proceso o funcionalidad representada.** SeguimientoEtapa.

**Interpretación técnica y relación con la implementación.** La definición de etapa y su seguimiento no son la misma entidad. Las operaciones clean/save mostradas no sustituyen los servicios que autorizan transiciones; no se interpreta un nuevo intento como reinicio de la misma fila.

**Evidencia del código.** [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-POS-002-etapas-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-002-etapas-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-002-etapas-clases.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False.

<a id="figura-10"></a>

## Figura 10. Modelo entidad–relación lógico de documentos y versiones

- Identificador conservado: **DIA-DOC-101**. Tipo: ER lógico.
- Módulo: Gestión documental. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Introduce persistencia de evidencias sin repetir como ER el modelo de clases del expediente.

**Elementos y relaciones principales.** DocumentoPostulacion referencia postulación, tipo y estado, y opcionalmente evento. VersionDocumento pertenece a un documento y registra autor, número y archivo; las notas incluyen restricciones de unicidad.

**Proceso o funcionalidad representada.** EstadoDocumento, TipoDocumento, DocumentoPostulacion, VersionDocumento.

**Interpretación técnica y relación con la implementación.** Es un modelo ER complementario, no un tipo de diagrama UML. La unicidad documento/número de versión y las FK derivan del código; no se certifican nombres físicos de tablas ni el esquema instalado.

**Evidencia del código.** [apps/documentos/models.py](../../../apps/documentos/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-DOC-101-documentos-versiones-er.puml) · [SVG](../diagramas/renderizados/DIA-DOC-101-documentos-versiones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False.

<a id="figura-11"></a>

## Figura 11. Modelo entidad–relación lógico de defensas, participantes y evaluaciones

- Identificador conservado: **DIA-POS-105**. Tipo: ER lógico.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Explica integridad entre evento, participación y resultado, donde las restricciones son relevantes para auditoría.

**Elementos y relaciones principales.** EventoDefensa referencia postulación y seguimiento. ParticipanteEvento vincula evento/asignación; EvaluacionDefensa referencia evento y opcionalmente participante evaluador.

**Proceso o funcionalidad representada.** EventoDefensa, ParticipanteEvento, EvaluacionDefensa.

**Interpretación técnica y relación con la implementación.** Las restricciones UQ condicionales no son unicidades globales. El actor que registra y el participante evaluador son referencias distintas; un valor nulo de evaluador puede corresponder a otro modo de registro según policy.

**Evidencia del código.** [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/DIA-POS-105-defensas-evaluaciones-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-105-defensas-evaluaciones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-105-defensas-evaluaciones-er.md). Versión documental: 689eeb56ac6f / desarrollo / directorio de trabajo.

**Limitación original que se conserva.** Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False.

<a id="figura-12"></a>

## Figura 12. Registro operativo y registro histórico de postulaciones

- Identificador conservado: **DIA-SYS-003**. Tipo: Actividades.
- Módulo: Sistema. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Evita que el tribunal interprete un registro histórico como ejecución académica completa.

**Elementos y relaciones principales.** La decisión de ruta separa alta histórica CONCLUIDA/CERRADA/HISTORICO sin seguimiento operativo y alta ordinaria con unicidad vigente y arranque condicionado por modalidad.

**Proceso o funcionalidad representada.** Registro, consulta y estado general; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** El arranque de Proyecto/Tesis usa orquestadores propios; Examen, Trabajo Dirigido y Diplomado tienen su rama; Excelencia no recibe ese autoarranque genérico. La vista describe solicitudes de alta, no una migración de datos.

**Evidencia del código.** [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [PostulacionService.agregar_observacion (L326)](../../../apps/postulantes/services.py); [PostulacionService.cambiar_estado (L240)](../../../apps/postulantes/services.py); [PostulacionService.crear_postulacion (L57)](../../../apps/postulantes/services.py); [PostulacionService.crear_postulacion_historica (L129)](../../../apps/postulantes/services.py); [HistorialEstadoViewSet.get_queryset (L703)](../../../apps/postulantes/views.py); [ObservacionViewSet.create (L744)](../../../apps/postulantes/views.py); [ObservacionViewSet.get_queryset (L731)](../../../apps/postulantes/views.py); [PostulacionViewSet.create (L174)](../../../apps/postulantes/views.py); [PostulacionViewSet.get_queryset (L116)](../../../apps/postulantes/views.py); [PostulacionViewSet.historicas (L240)](../../../apps/postulantes/views.py); [PostulacionViewSet.partial_update (L263)](../../../apps/postulantes/views.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-SYS-003.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-SYS-003.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-SYS-003.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.

<a id="figura-13"></a>

## Figura 13. Validaciones y ejecución de operaciones sobre etapas

- Identificador conservado: **DIA-POS-061**. Tipo: Actividades.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Explica el orden de autoridad, bloqueo, estado y política antes de mutar seguimiento.

**Elementos y relaciones principales.** La actividad aplica serializer, atomic y bloqueo; valida tipo de registro y guardas de la operación; actualiza estado, fechas y responsable y registra efectos posteriores al commit.

**Proceso o funcionalidad representada.** Inicialización, inscripción y seguimiento; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** Es un resumen de variantes independientes, no obligación de iniciar, observar, aprobar y rechazar en una petición. Autoabrir la siguiente etapa de Proyecto requiere flujo oficial; no se universaliza a las demás modalidades.

**Evidencia del código.** [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py); [SeguimientoEtapaSerializer (L282)](../../../apps/postulantes/serializers.py); [PostulacionViewSet.concluir_academicamente (L477)](../../../apps/postulantes/views.py); [PostulacionViewSet.inicializar_flujo (L490)](../../../apps/postulantes/views.py); [PostulacionViewSet.nuevo_intento (L517)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.aprobar (L1001)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.dictamenes_revision (L825)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.get_queryset (L800)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.informes_revision_tribunal (L854)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.registrar_decision (L946)](../../../apps/postulantes/views.py); [WorkflowService._validar_etapas_anteriores_aprobadas (L342)](../../../apps/postulantes/workflow.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py); [WorkflowService.concluir_postulacion (L367)](../../../apps/postulantes/workflow.py); [WorkflowService.crear_nuevo_intento (L213)](../../../apps/postulantes/workflow.py); [WorkflowService.inicializar_flujo (L22)](../../../apps/postulantes/workflow.py); [WorkflowService.iniciar_etapa (L58)](../../../apps/postulantes/workflow.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-061.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-061.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-061.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.

<a id="figura-14"></a>

## Figura 14. Interacción para carga y versionado de documentos

- Identificador conservado: **DIA-DOC-070**. Tipo: Secuencia.
- Módulo: Gestión documental. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Expone una frontera de consistencia importante: transacción SQL frente a almacenamiento de archivos.

**Elementos y relaciones principales.** La solicitud atraviesa interfaz, cliente HTTP, vista, serializer, servicio y policy; ORM y storage reciben operaciones distintas y se programa el evento posterior al commit.

**Proceso o funcionalidad representada.** Carga, versiones y evidencia histórica; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** La eliminación compensatoria se dibuja solo para la excepción capturada al crear nueva versión. No se afirma que el filesystem participe del rollback SQL ni que cualquier fallo exterior quede compensado automáticamente.

**Evidencia del código.** [DocumentoService.crear_nueva_version (L375)](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [DocumentoService.subir_documento_historico (L331)](../../../apps/documentos/services.py); [DocumentoPostulacionViewSet.subir (L125)](../../../apps/documentos/views.py); [PostulacionViewSet.subir_documento_historico (L451)](../../../apps/postulantes/views.py); [src/pages/postulantes/ExpedientePage.jsx](../../../src/pages/postulantes/ExpedientePage.jsx); [src/services/api.js](../../../src/services/api.js); [src/services/postulacionesService.js](../../../src/services/postulacionesService.js)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-DOC-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-070.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** El borrado compensatorio está en el catch de crear_nueva_version. No garantiza compensación por un rollback exterior posterior al retorno de ese método, ni atomicidad entre filesystem y PostgreSQL.

<a id="figura-15"></a>

## Figura 15. Interacción para consolidación de evaluación y efectos académicos

- Identificador conservado: **DIA-POS-073**. Tipo: Secuencia.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Relaciona consolidación, policy y workflow, incluyendo reintento y rollback.

**Elementos y relaciones principales.** Administración invoca consolidación; el servicio bloquea un evento FINALIZADA sin resultado final, construye el consolidado mediante policy y puede aprobar/rechazar seguimiento y solicitar reintento.

**Proceso o funcionalidad representada.** Evaluación y consolidación; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** Las ramas dependen de la policy. Conservar rechazo sin reintento solo ocurre si esta lo permite; no se introduce fórmula 30/70 universal ni un lifecycle ficticio de EvaluacionDefensa.

**Evidencia del código.** [EvaluacionDefensaService._registrar (L202)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.calcular_resultado_final (L263)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.consolidar_evaluacion_evento (L227)](../../../apps/postulantes/defensas.py); [EventoDefensaViewSet.consolidar (L296)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.evaluar (L285)](../../../apps/postulantes/defensas_api.py); [ResultadoFinalView (L329)](../../../apps/postulantes/defensas_api.py); [src/pages/postulantes/ExpedientePage.jsx](../../../src/pages/postulantes/ExpedientePage.jsx); [src/services/postulacionesService.js](../../../src/services/postulacionesService.js)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-073.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-073.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-073.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.

<a id="figura-16"></a>

## Figura 16. Interacción de conclusión académica mediante el motor común

- Identificador conservado: **DIA-POS-074**. Tipo: Secuencia.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Separa concluir de actualizar administrativamente un estado o de aprobar una sola etapa.

**Elementos y relaciones principales.** Vista administrativa, WorkflowService, policy, ORM e historial colaboran dentro de atomic. Ya CONCLUIDA retorna; las demás postulaciones se validan antes de actualizar y publicar para on_commit.

**Proceso o funcionalidad representada.** Inicialización, inscripción y seguimiento; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** Se lee observaciones sin atribuir un validador explícito no implementado. El método no cambia vigencia; los servicios específicos de cierre no se consideran aliases universales de esta secuencia.

**Evidencia del código.** [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py); [SeguimientoEtapaSerializer (L282)](../../../apps/postulantes/serializers.py); [PostulacionViewSet.concluir_academicamente (L477)](../../../apps/postulantes/views.py); [PostulacionViewSet.inicializar_flujo (L490)](../../../apps/postulantes/views.py); [PostulacionViewSet.nuevo_intento (L517)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.aprobar (L1001)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.dictamenes_revision (L825)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.get_queryset (L800)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.informes_revision_tribunal (L854)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.registrar_decision (L946)](../../../apps/postulantes/views.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py); [WorkflowService.concluir_postulacion (L367)](../../../apps/postulantes/workflow.py); [WorkflowService.crear_nuevo_intento (L213)](../../../apps/postulantes/workflow.py); [WorkflowService.inicializar_flujo (L22)](../../../apps/postulantes/workflow.py); [src/pages/postulantes/ExpedientePage.jsx](../../../src/pages/postulantes/ExpedientePage.jsx); [src/services/postulacionesService.js](../../../src/services/postulacionesService.js)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-074.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-074.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-074.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.

<a id="figura-17"></a>

## Figura 17. Estados técnicos del seguimiento académico

- Identificador conservado: **DIA-POS-081**. Tipo: Estados.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Permite diferenciar intento pendiente, operación en curso, observación y resultados de etapa.

**Elementos y relaciones principales.** PENDIENTE, EN_PROCESO, OBSERVADA, APROBADA, RECHAZADA y OMITIDA se conectan por operaciones verificadas. T11 permite reabrir cierre solo en Proyecto.

**Proceso o funcionalidad representada.** Inicialización, inscripción y seguimiento; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** Gxx y Axx son alias documentales; sus guardas/acciones completas están en la ficha. Omitir requiere las condiciones de la operación y no se interpreta como aprobar. Un nuevo intento es otra instancia, no una flecha inventada de vuelta a pendiente.

Ejemplos de contratos que deben leerse con la figura:

| Contrato | Origen → destino | Guarda implementada | Acción documentada |
| --- | --- | --- | --- |
| T01 | [*] → PENDIENTE | Etapas activas y seguimiento no existente | get_or_create intento 1 |
| T02 | PENDIENTE → EN_PROCESO | Sin otra EN_PROCESO; previas obligatorias aprobadas; policy de inicio | Guardar fecha_inicio y abierta_por |

Los restantes contratos no se suprimen: se consultan en la ficha enlazada. Estos ejemplos no sustituyen la tabla completa al preparar el anexo universitario.

**Evidencia del código.** [CierrePostulacionService.reabrir_cierre (L163)](../../../apps/postulantes/cierre.py); [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py); [SeguimientoEtapaSerializer (L282)](../../../apps/postulantes/serializers.py); [PostulacionViewSet.concluir_academicamente (L477)](../../../apps/postulantes/views.py); [PostulacionViewSet.inicializar_flujo (L490)](../../../apps/postulantes/views.py); [PostulacionViewSet.nuevo_intento (L517)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.aprobar (L1001)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.dictamenes_revision (L825)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.get_queryset (L800)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.informes_revision_tribunal (L854)](../../../apps/postulantes/views.py); [SeguimientoEtapaViewSet.registrar_decision (L946)](../../../apps/postulantes/views.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py); [WorkflowService.concluir_postulacion (L367)](../../../apps/postulantes/workflow.py); [WorkflowService.crear_nuevo_intento (L213)](../../../apps/postulantes/workflow.py); [WorkflowService.inicializar_flujo (L22)](../../../apps/postulantes/workflow.py); [WorkflowService.iniciar_etapa (L58)](../../../apps/postulantes/workflow.py); [WorkflowService.observar_etapa (L87)](../../../apps/postulantes/workflow.py); [WorkflowService.omitir_etapa (L187)](../../../apps/postulantes/workflow.py); [WorkflowService.rechazar_etapa (L159)](../../../apps/postulantes/workflow.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-081.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-081.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-081.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Un único objeto SeguimientoEtapa. Nuevo intento crea otro PENDIENTE y deja el anterior RECHAZADA; no se dibuja como vuelta del mismo objeto. La excepción de reapertura pertenece al cierre de Proyecto, no al motor genérico de todas las etapas.

<a id="figura-18"></a>

## Figura 18. Estados de revisión y observaciones del documento

- Identificador conservado: **DIA-DOC-080**. Tipo: Estados.
- Módulo: Gestión documental. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Separa revisión documental, nueva versión y necesidad de corrección.

**Elementos y relaciones principales.** ENV, APR y REC representan el estado de revisión. Nueva versión puede devolver a ENV; aprobar/rechazar parten de ENV. Las observaciones se muestran como transiciones internas.

**Proceso o funcionalidad representada.** Revisión documental; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** Observar no crea un cuarto estado OBS del ciclo mostrado. Las condiciones de observar documentos APR/REC dependen de policy. El indicador de actualidad de la versión es otra dimensión y se consulta en su anexo específico.

Ejemplos de contratos que deben leerse con la figura:

| Contrato | Origen → destino | Guarda implementada | Acción documentada |
| --- | --- | --- | --- |
| T01 | [*] → ENV | Tipo, actor, contexto y archivo válidos | Crear documento en ENV |
| T02 | ENV → ENV | Documento activo y postulación habilitada; carga/contexto válidos | Desmarcar previas; crear actual y reset de revisión/corrección |

Los restantes contratos no se suprimen: se consultan en la ficha enlazada. Estos ejemplos no sustituyen la tabla completa al preparar el anexo universitario.

**Evidencia del código.** [DocumentoService.aprobar_documento (L492)](../../../apps/documentos/services.py); [DocumentoService.crear_nueva_version (L375)](../../../apps/documentos/services.py); [DocumentoService.rechazar_documento (L562)](../../../apps/documentos/services.py); [DocumentoService.registrar_observacion (L632)](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [DocumentoPostulacionViewSet.aprobar (L182)](../../../apps/documentos/views.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-DOC-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-080.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Códigos operados por servicio, no catálogo físico consultado. No existe aquí transición a OBS. Las operaciones que conservan el código se muestran como transiciones internas, sin acciones entry/exit definidas. Observar en APR/REC es condicional: no prueba que una política concreta admita ambos. Autoaprobación inicial pasa por aprobar_documento. requiere_correccion es otro indicador.

<a id="figura-19"></a>

## Figura 19. Estados del evento de defensa

- Identificador conservado: **DIA-POS-082**. Tipo: Estados.
- Módulo: Expedientes y seguimiento. Ámbito: Transversal; aplicación según permisos y policy.

**Objetivo.** Permite explicar programación, ejecución, suspensión, cancelación y reprogramación sin equipararlas al estado de etapa.

**Elementos y relaciones principales.** PROGRAMADA→EN_CURSO→FINALIZADA es una ruta; existen suspensión/cancelación y reprogramación desde PROGRAMADA o SUSPENDIDA según guardas.

**Proceso o funcionalidad representada.** Ciclo de defensa, participantes y asistencia; Compartido; las políticas conservan el alcance académico de cada modalidad..

**Interpretación técnica y relación con la implementación.** Las flechas no sustituyen fecha, quórum y policy. No se dibuja reapertura genérica desde FINALIZADA/CANCELADA; aprobar una evaluación y finalizar un evento son acciones distintas.

Ejemplos de contratos que deben leerse con la figura:

| Contrato | Origen → destino | Guarda implementada | Acción documentada |
| --- | --- | --- | --- |
| T01 | [*] → PROGRAMADA | Etapa habilitada; previas aprobadas; policy; sin duplicado activo | Crear evento con default PROGRAMADA |
| T02 | PROGRAMADA → EN_CURSO | Postulación activa; fecha alcanzada y policy de inicio | Guardar inicio real y usuario |

Los restantes contratos no se suprimen: se consultan en la ficha enlazada. Estos ejemplos no sustituyen la tabla completa al preparar el anexo universitario.

**Evidencia del código.** [EventoDefensaService._cerrar (L173)](../../../apps/postulantes/defensas.py); [EventoDefensaService.agregar_participante (L58)](../../../apps/postulantes/defensas.py); [EventoDefensaService.finalizar_evento (L162)](../../../apps/postulantes/defensas.py); [EventoDefensaService.iniciar_evento (L103)](../../../apps/postulantes/defensas.py); [EventoDefensaService.programar_evento (L25)](../../../apps/postulantes/defensas.py); [EventoDefensaService.registrar_asistencia (L142)](../../../apps/postulantes/defensas.py); [EventoDefensaService.reprogramar_evento (L187)](../../../apps/postulantes/defensas.py); [EventoDefensaService.validar_quorum (L153)](../../../apps/postulantes/defensas.py); [EventoDefensaViewSet.agregar (L260)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.asistencia (L271)](../../../apps/postulantes/defensas_api.py); [EventoDefensaViewSet.get_queryset (L214)](../../../apps/postulantes/defensas_api.py); [PostulacionEventosView.post (L322)](../../../apps/postulantes/defensas_api.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-082.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-082.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-082.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** No se añade reapertura de FINALIZADA/CANCELADA. Asistencia y evaluación son dimensiones separadas: registrar evaluación admite EN_CURSO/FINALIZADA, consolidar requiere FINALIZADA. No se inventa estado EVALUADA del evento.

<a id="figura-20"></a>

## Figura 20. Proyecto de Grado: cierre documental, conclusión y reapertura

- Identificador conservado: **DIA-PG-070**. Tipo: Secuencia.
- Módulo: Proyecto de Grado. Ámbito: Proyecto de Grado.

**Objetivo.** Justifica la particularidad de Proyecto frente a la conclusión común y conserva la corrección de idempotencia.

**Elementos y relaciones principales.** Las variantes aprobar cierre, concluir y reabrir colaboran con CierrePostulacionService y policy. Concluir distingue retorno ya concluido, rechazo por gates y actualización válida.

**Proceso o funcionalidad representada.** Proyecto de Grado; Proyecto de Grado; usa infraestructura común con política específica..

**Interpretación técnica y relación con la implementación.** Los recorridos anticipados no reciben auditoría ni evento de conclusión del servicio. El motivo de reapertura y el estado de cierre se validan antes de cambiarlo; esta secuencia no se traslada a Tesis por analogía.

**Evidencia del código.** [CierrePostulacionService (L103)](../../../apps/postulantes/cierre.py); [CierrePostulacionService.aprobar_cierre_documental (L143)](../../../apps/postulantes/cierre.py); [CierrePostulacionService.reabrir_cierre (L163)](../../../apps/postulantes/cierre.py); [CierreAccionView.post (L40)](../../../apps/postulantes/cierre_api.py); [MemorandumDesignacionService.publicar (L56)](../../../apps/postulantes/memorandums.py); [PostulacionViewSet.memorandums_designacion (L304)](../../../apps/postulantes/views.py); [src/services/postulacionesService.js](../../../src/services/postulacionesService.js)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-PG-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-PG-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-PG-070.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Secuencia de variantes independientes, no acciones sucesivas de una sola petición. El callback postcommit se detalla en la vista de notificaciones. Exclusiva de la policy de cierre disponible; no extender a Tesis por analogía.

<a id="figura-21"></a>

## Figura 21. Tesis de Grado: recorrido nominal y conclusión específica

- Identificador conservado: **DIA-TG-060**. Tipo: Actividades.
- Módulo: Tesis de Grado. Ámbito: Tesis de Grado.

**Objetivo.** Explica temática, perfil, revisiones y cierre académico propios sin adoptar el cierre documental de Proyecto.

**Elementos y relaciones principales.** La nota enumera ocho etapas nominales; las solicitudes se coordinan con policy y backend común. La conclusión exige pública aprobada, consolidado aprobatorio y ACTA_DEFENSA actual APR, sin corrección, vinculada a pública finalizada.

**Proceso o funcionalidad representada.** Tesis de Grado; Tesis de Grado; usa infraestructura común con política específica..

**Interpretación técnica y relación con la implementación.** El bucle es coordinación humana entre solicitudes, no un método que ejecute todas las etapas ni una transacción única. Temática y perfil permanecen actos diferentes; no se aplica semántica legacy de Proyecto.

Orden nominal declarado: INSCRIPCION, TEMATICA_TESIS, PERFIL_TESIS, DOCUMENTO_FINAL, REVISION_TUTOR, REVISION_TRIBUNAL, DEFENSA_PRIVADA, DEFENSA_PUBLICA. No acredita filas configuradas en PostgreSQL.

**Evidencia del código.** [TesisGradoPolicy (L345)](../../../apps/modalidades/tesis_grado.py); [TesisGradoPolicy.validar_conclusion_academica (L809)](../../../apps/modalidades/tesis_grado.py); [TesisGradoWorkflowOrchestrator.inicializar_proceso (L53)](../../../apps/postulantes/tesis_grado_workflow.py); [PostulacionViewSet.concluir_academicamente (L477)](../../../apps/postulantes/views.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-TG-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-TG-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-TG-060.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Temática y perfil son actos distintos. Dictámenes Tutor/Tribunal se registran con administración y evidencias propias. Evaluación admite consenso o individual bajo su policy y escalas BRUTA_100/MODALIDAD_ESPECIFICA; no aplicar semántica legacy de Proyecto.

<a id="figura-22"></a>

## Figura 22. Trabajo Dirigido: recorrido institucional y conclusión

- Identificador conservado: **DIA-TD-060**. Tipo: Actividades.
- Módulo: Trabajo Dirigido. Ámbito: Trabajo Dirigido.

**Objetivo.** Permite relacionar ejecución institucional, informes y conclusión sin ocultar dependencias del motor común.

**Elementos y relaciones principales.** La nota separa perfil, desarrollo institucional, documento final, revisión previa, defensas y cierre. TrabajoDirigidoService prepara el cierre cuando corresponde e invoca conclusión común bajo sus guardas.

**Proceso o funcionalidad representada.** Trabajo Dirigido; Trabajo Dirigido; usa infraestructura común con política específica..

**Interpretación técnica y relación con la implementación.** La institución y el supervisor descrito no constituyen integración externa ni usuario API automático. La nota mínima 51 y ACTA_DEFENSA_TD del intento vigente pertenecen a este recorrido, no a las demás modalidades.

Orden nominal declarado: INSCRIPCION, PERFIL_TRABAJO_DIRIGIDO, DESARROLLO_TRABAJO_DIRIGIDO, DOCUMENTO_FINAL, REVISION_TRIBUNAL_PREVIA, DEFENSA_PRIVADA, DEFENSA_PUBLICA, CIERRE_DOCUMENTAL. No acredita filas configuradas en PostgreSQL.

**Evidencia del código.** [TrabajoDirigidoPolicy (L287)](../../../apps/modalidades/trabajo_dirigido.py); [TrabajoDirigidoOverviewView.get (L27)](../../../apps/modalidades/trabajo_dirigido_api.py); [TrabajoDirigidoOverviewView.post (L30)](../../../apps/modalidades/trabajo_dirigido_api.py); [TrabajoDirigidoService.concluir (L105)](../../../apps/modalidades/trabajo_dirigido_service.py); [TrabajoDirigidoService.configurar_institucion (L17)](../../../apps/modalidades/trabajo_dirigido_service.py); [TrabajoDirigidoService.overview (L59)](../../../apps/modalidades/trabajo_dirigido_service.py); [TrabajoDirigidoService.registrar_informe (L41)](../../../apps/modalidades/trabajo_dirigido_service.py); [WorkflowService.aprobar_etapa (L111)](../../../apps/postulantes/workflow.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-TD-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-TD-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-TD-060.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Institución interna/externa, convenio cuando corresponde y supervisor descrito no equivalen a actor API externo. Informes institucionales se registran por servicio propio. Importa políticas base de Proyecto pero no se generalizan sus reglas.

<a id="figura-23"></a>

## Figura 23. Examen de Grado: estados del área evaluada

- Identificador conservado: **DIA-EG-080**. Tipo: Estados.
- Módulo: Examen de Grado. Ámbito: Examen de Grado.

**Objetivo.** Contrasta la evaluación por áreas e intentos con las defensas de Proyecto/Tesis.

**Elementos y relaciones principales.** El área parte PENDIENTE; evaluación completa suficiente permite APROBADA. La primera insuficiente produce POSTERGADA y una segunda insuficiente, REPROBADA.

**Proceso o funcionalidad representada.** Examen de Grado; Examen de Grado; usa infraestructura común con política específica..

**Interpretación técnica y relación con la implementación.** La ficha concreta las guardas de evaluación, intentos y escala; el código exige mínimo 61 por área y trata el segundo intento con su plazo propio. Son estados del área, no del expediente completo ni una defensa 30/70.

Ejemplos de contratos que deben leerse con la figura:

| Contrato | Origen → destino | Guarda implementada | Acción documentada |
| --- | --- | --- | --- |
| T01 | [*] → PENDIENTE | Modalidad EXAMEN_GRADO; área ausente | Crear PENDIENTE |
| T02 | PENDIENTE → APROBADA | Etapa EN_PROCESO; composición válida; consenso o tres individuales; resultado >=61; plazo si intento 2 | Área APROBADA; limpiar plazo y aprobar seguimiento |

Los restantes contratos no se suprimen: se consultan en la ficha enlazada. Estos ejemplos no sustituyen la tabla completa al preparar el anexo universitario.

**Evidencia del código.** [ExamenGradoOverviewView.get (L27)](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoOverviewView.post (L33)](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoService.concluir (L139)](../../../apps/modalidades/examen_grado_service.py); [ExamenGradoService.ensure_areas (L22)](../../../apps/modalidades/examen_grado_service.py); [ExamenGradoService.overview (L34)](../../../apps/modalidades/examen_grado_service.py); [ExamenGradoService.registrar_evaluacion (L59)](../../../apps/modalidades/examen_grado_service.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-EG-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-EG-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-EG-080.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** EN_PROCESO existe como choice de ExamenArea pero no se encontró escritor productivo hacia él; no se conecta por analogía con SeguimientoEtapa. Las evaluaciones individuales incompletas conservan el estado del área y no constituyen otra fase persistida.

<a id="figura-24"></a>

## Figura 24. Excelencia Académica: resultado de la evaluación según criterio

- Identificador conservado: **DIA-EA-080**. Tipo: Estados.
- Módulo: Excelencia Académica. Ámbito: Excelencia Académica.

**Objetivo.** Representa una modalidad que no debe explicarse mediante una defensa numérica universal.

**Elementos y relaciones principales.** Configurar criterio crea el expediente PENDIENTE; registrar evaluación puede producir FAVORABLE o DESFAVORABLE y admite las reevaluaciones dibujadas.

**Proceso o funcionalidad representada.** Excelencia Académica; Excelencia Académica; usa infraestructura común con política específica..

**Interpretación técnica y relación con la implementación.** La evaluación por rendimiento documenta mínimo 80; calidad no admite nota numérica. DESFAVORABLE no implica rechazo automático de la etapa. FAVORABLE tampoco sustituye acta y demás gates de conclusión.

Ejemplos de contratos que deben leerse con la figura:

| Contrato | Origen → destino | Guarda implementada | Acción documentada |
| --- | --- | --- | --- |
| T01 | [*] → PENDIENTE | Modalidad y criterio válidos; expediente aún no existente; flujo no iniciado | Crear resultado PENDIENTE |
| T02 | PENDIENTE → FAVORABLE | Etapa EVALUACION_TRIBUNAL EN_PROCESO; tribunal y documentos; rendimiento >=80 o calidad sin nota | Guardar resultado; solo FAVORABLE aprueba la etapa |

Los restantes contratos no se suprimen: se consultan en la ficha enlazada. Estos ejemplos no sustituyen la tabla completa al preparar el anexo universitario.

**Evidencia del código.** [ExcelenciaAcademicaOverviewView.get (L27)](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaOverviewView.post (L33)](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaService.concluir (L106)](../../../apps/modalidades/excelencia_academica_service.py); [ExcelenciaAcademicaService.configurar_criterio (L21)](../../../apps/modalidades/excelencia_academica_service.py); [ExcelenciaAcademicaService.overview (L36)](../../../apps/modalidades/excelencia_academica_service.py); [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../apps/modalidades/excelencia_academica_service.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-EA-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-EA-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-EA-080.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** Resultado persistido propio de Excelencia, no estado genérico de EvaluacionDefensa. DESFAVORABLE no rechaza automáticamente el seguimiento en registrar_evaluacion; permanece operable mientras la etapa siga EN_PROCESO. La conclusión requiere además etapas previas y acta.

<a id="figura-25"></a>

## Figura 25. Vía Diplomado: estados del resultado de un módulo

- Identificador conservado: **DIA-DIP-080**. Tipo: Estados.
- Módulo: Graduación vía Diplomado. Ámbito: Graduación vía Diplomado.

**Objetivo.** Separa la calificación del módulo de la aprobación de SeguimientoEtapa, corregida en UC-DIP-001.

**Elementos y relaciones principales.** PENDIENTE, APROBADO y REPROBADO reciben transiciones de set_module_result; las revisiones de nota conservan o cambian el resultado conforme a sus guardas.

**Proceso o funcionalidad representada.** Vía Diplomado; Vía Diplomado; usa infraestructura común con política específica..

**Interpretación técnica y relación con la implementación.** La aprobación del módulo requiere nota mayor que 65 y contexto operable. Guardar el módulo no aprueba el seguimiento; el quinto módulo es Taller de Investigación. No se infiere reapertura libre de etapas cerradas.

Ejemplos de contratos que deben leerse con la figura:

| Contrato | Origen → destino | Guarda implementada | Acción documentada |
| --- | --- | --- | --- |
| T01 | [*] → PENDIENTE | Modalidad correcta y módulo ausente | Crear módulo PENDIENTE |
| T02 | PENDIENTE → APROBADO | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota > 65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método |

Los restantes contratos no se suprimen: se consultan en la ficha enlazada. Estos ejemplos no sustituyen la tabla completa al preparar el anexo universitario.

**Evidencia del código.** [DiplomadoOverviewView.get (L27)](../../../apps/modalidades/diplomado_api.py); [DiplomadoOverviewView.post (L30)](../../../apps/modalidades/diplomado_api.py); [DiplomadoService.conclude (L85)](../../../apps/modalidades/diplomado_service.py); [DiplomadoService.ensure_modules (L31)](../../../apps/modalidades/diplomado_service.py); [DiplomadoService.overview (L71)](../../../apps/modalidades/diplomado_service.py); [DiplomadoService.set_module_result (L40)](../../../apps/modalidades/diplomado_service.py)

**Fuentes y versión.** [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-DIP-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DIP-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DIP-080.md). Versión documental: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

**Limitación original que se conserva.** EN_PROCESO está declarado como choice sin escritor confirmado hacia el estado del módulo. El servicio permite volver a registrar resultado mientras su etapa sea operable; no se inventa una prohibición por el resultado anterior ni aprobación automática del seguimiento.

[Selección](seleccion-diagramas.md) · [Estructura](estructura-documento.md) · [Evaluación visual](evaluacion-visual.md).
