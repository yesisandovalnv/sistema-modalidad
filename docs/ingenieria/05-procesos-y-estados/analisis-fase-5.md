# Análisis previo de procesos — fase 5.1

Realizado antes de generar fuentes nuevas. Fuente: código actual, 75 fichas de fase 4 y registros estructurales previos. HEAD 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19, rama desarrollo; [snapshot previo](../00-alcance-y-evidencia/estado-fase-5.json). No se ejecuta el producto.

## Inventario y selección

21 familias de procesos: 15 compartidas y seis específicas. Un proceso agrupa variantes del mismo objetivo operativo; una asociación a una vista resumida no equivale a cobertura exhaustiva de todos los payloads. Se seleccionan actividades para responsabilidades/decisiones, secuencias para interacciones críticas y estados únicamente para dimensiones persistidas con mutaciones comprobadas. Los catálogos de roles, modalidades, requisitos y reportes no necesitan máquinas de estados inventadas.

| Proceso | Nombre | Casos relacionados | Operación crítica | Variante |
| --- | --- | --- | --- | --- |
| PROC-SYS-001 | Autenticación y sesión | UC-USR-001, UC-USR-003, UC-USR-004, UC-USR-005, UC-USR-009 | Credenciales, throttling, renovación y revocación. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-USR-001 | Administración de cuentas y roles | UC-USR-002, UC-USR-006 | Autoridad administrativa y protección de superusuario. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-ACA-001 | Catálogos y documentación oficial | UC-ACA-001, UC-ACA-002, UC-ACA-003, UC-ACA-004, UC-ACA-005, UC-ACA-006, UC-ACA-007, UC-POS-028, UC-DOC-007, UC-DOC-008 | Separar lecturas autenticadas y escritura administrativa; métodos prohibidos. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-POS-001 | Registro, consulta y estado general | UC-POS-001, UC-POS-002, UC-POS-010, UC-POS-011, UC-POS-024, UC-POS-025 | Unicidad vigente, alta histórica, PATCH distinto de conclusión. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-POS-002 | Inicialización, inscripción y seguimiento | UC-POS-003, UC-POS-005, UC-POS-008, UC-POS-009, UC-POS-012, UC-POS-013, UC-POS-014, UC-POS-015 | Guarda de etapa, decisiones, rechazo, reintento y conclusión. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-POS-003 | Asignaciones y elegibilidad contextual | UC-USR-007, UC-USR-008, UC-POS-004, UC-POS-016, UC-POS-017 | Ocupación, incompatibilidad, reemplazo y preservación histórica. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-DOC-001 | Carga, versiones y evidencia histórica | UC-DOC-001, UC-DOC-006 | Archivo fuera de rollback SQL, contexto y autoaprobaciones específicas. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-DOC-002 | Lectura y descarga documental | UC-DOC-003 | Alcance por vínculo y publicación vigente de memorandos. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-DOC-003 | Revisión documental | UC-DOC-002 | ENV/APR/REC y observaciones no equivalentes a un estado OBS. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-DOC-004 | Corrección y confirmación técnica | UC-DOC-004, UC-DOC-005 | Administración; observación, versión y confirmación son dimensiones separadas. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-POS-004 | Ciclo de defensa, participantes y asistencia | UC-POS-006, UC-POS-018, UC-POS-019, UC-POS-020 | Fecha, quórum, asistencia y mutaciones administrativas. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-POS-005 | Evaluación y consolidación | UC-POS-007, UC-POS-021, UC-POS-022 | Escala, individual/consenso, consolidado único y efectos sobre etapa. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-POS-006 | Condiciones y entrega física | UC-POS-023, UC-POS-026, UC-POS-027 | Verificación única, recepción absoluta de cantidades y lotes atómicos. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-NOT-001 | Notificación interna y lectura | UC-NOT-001, UC-NOT-002 | on_commit robusto, destinatarios y deduplicación; lectura propia. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-REP-001 | Reportes y exportación | UC-REP-001, UC-REP-002, UC-REP-003, UC-REP-004 | Administración/docente acotado; exportación administrativa. | Compartido; las políticas conservan el alcance académico de cada modalidad. |
| PROC-PG-001 | Proyecto de Grado | UC-PG-001, UC-PG-002 | Reglas y conclusión propias, sin extrapolar la política de Proyecto. | Proyecto de Grado; usa infraestructura común con política específica. |
| PROC-TG-001 | Tesis de Grado | UC-TG-001 | Reglas y conclusión propias, sin extrapolar la política de Proyecto. | Tesis de Grado; usa infraestructura común con política específica. |
| PROC-TD-001 | Trabajo Dirigido | UC-TD-001, UC-TD-002, UC-TD-003, UC-TD-004 | Reglas y conclusión propias, sin extrapolar la política de Proyecto. | Trabajo Dirigido; usa infraestructura común con política específica. |
| PROC-EG-001 | Examen de Grado | UC-EG-001, UC-EG-002, UC-EG-003 | Reglas y conclusión propias, sin extrapolar la política de Proyecto. | Examen de Grado; usa infraestructura común con política específica. |
| PROC-EA-001 | Excelencia Académica | UC-EA-001, UC-EA-002, UC-EA-003, UC-EA-004 | Reglas y conclusión propias, sin extrapolar la política de Proyecto. | Excelencia Académica; usa infraestructura común con política específica. |
| PROC-DIP-001 | Vía Diplomado | UC-DIP-001, UC-DIP-002, UC-DIP-003 | Reglas y conclusión propias, sin extrapolar la política de Proyecto. | Vía Diplomado; usa infraestructura común con política específica. |

## Decisiones de modelado

- Postulacion.estado_actual referencia un catálogo abierto: no se inventa una lista cerrada ni se equipara PATCH con conclusión por política. La vigencia tiene otro campo y un servicio de baja sin ruta pública confirmada.
- SeguimientoEtapa sí tiene estados técnicos con guardas. Nuevo intento crea otro objeto; no convierte el rechazado en pendiente. Reapertura de cierre de Proyecto es una transición específica del servicio de cierre.
- Documento tiene códigos ENV/APR/REC operados por servicio. Observar modifica requiere_correccion y crea una observación; no genera un estado OBS. VersionDocumento usa es_version_actual, no un estado de aprobación propio.
- EventoDefensa tiene ciclo explícito; nota, clasificación y RESULTADO_FINAL de EvaluacionDefensa no constituyen por sí solos una máquina de estados. Se documenta consolidación en actividades/secuencia, sin inventar estados de evaluación.
- ExamenArea, DiplomadoModulo, observación, asignación, condición, entrega y notificación tienen mutaciones persistidas que permiten vistas independientes. Un choice declarado sin escritor confirmado se registra como valor no conectado.
- El publisher usa transaction.on_commit(robust=True): callback local posterior al commit exterior; sin broker ni worker demostrado. El storage de archivos no revierte automáticamente con SQL.
- El orden nominal de etapas de las seis políticas se extrae por AST de STAGE_DATA; no acredita filas instaladas en PostgreSQL ni avance automático universal. Proyecto tiene autoapertura condicionada por configuración oficial; Tesis solo arranque propio.

## Herencia e históricos

Proyecto conserva PG_LEGACY y PG_HITOS_V1 y escalas LEGACY_PONDERADA/BRUTA_100. Tesis admite BRUTA_100 y MODALIDAD_ESPECIFICA bajo política propia; no se normalizan las notas. Trabajo Dirigido reutiliza infraestructura y políticas base con reglas propias; Examen evalúa áreas, Excelencia criterio/resultado y Diplomado módulos/defensa. HISTORICO se registra CONCLUIDA/CERRADA sin probar recorrido operativo. PUT/PATCH/DELETE heredados de confirmación y edición ordinaria de postulación siguen siendo superficies pendientes de caracterización; no se les atribuyen los flujos especiales de create/workflow.

## Matriz de cobertura

La [matriz dinámica](../10-trazabilidad-y-validacion/matriz-fase-5.md) se completa al generar las fuentes. Debe contener los 75 UC, sus RN existentes, endpoints/servicios, entidades, archivos de pruebas y vistas. No se renumeran UC ni se modifican diagramas previos.
