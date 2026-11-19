# Revisión preliminar y conciliación — fase 4

Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02. Fuente de verdad: directorio de trabajo, no solo HEAD. Se revisaron el índice maestro, los 52 registros de fase 3 con sus fuentes y fichas, los 23 candidatos originales, permisos, vistas, serializers, servicios y pruebas referenciadas. Las huellas previas están en [estado-fase-4.json](estado-fase-4.json).

## Resultado de coherencia

Se confirman 75 objetivos: los 23 candidatos preservados y 52 desgloses u omisiones incorporados. No son 75 endpoints diferentes: varios objetivos tienen variantes y Tesis especializa la conclusión común. Los 52 diagramas anteriores describen estructura y persistencia; los nuevos diagramas describen interacción. No se modifican fuentes, fichas, SVG ni estilo de fase 3.

La clasificación inicial necesitaba separar autenticación, rol, propiedad, asignación y cargo académico. Las diferencias COMMON/RELATED/DEFENSE_READ se explicitan en la matriz. El backend no concede escritura académica a todo docente o participante. No se confirmó actor de sistema externo.

## Revisión de las 52 vistas

Cada fila acredita revisión documental del registro, fuente y ficha; no revalida esquema físico instalado ni ejecución de la aplicación. La comprobación automática conserva las 158 huellas protegidas.

| Vista | Tipo | Resultado |
| --- | --- | --- |
| DIA-USR-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-USR-001-usuarios-clases.md) |
| DIA-USR-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-USR-101-usuarios-er.md) |
| DIA-ACA-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-ACA-001-academico-clases.md) |
| DIA-ACA-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| DIA-POS-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md) |
| DIA-POS-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-101-postulaciones-er.md) |
| DIA-POS-002 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-002-etapas-clases.md) |
| DIA-POS-102 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-102-etapas-er.md) |
| DIA-POS-003 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-003-asignaciones-decisiones-clases.md) |
| DIA-POS-103 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-103-asignaciones-decisiones-er.md) |
| DIA-POS-004 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-004-condiciones-entregas-clases.md) |
| DIA-POS-104 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-104-condiciones-entregas-er.md) |
| DIA-POS-005 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-005-defensas-evaluaciones-clases.md) |
| DIA-POS-105 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-105-defensas-evaluaciones-er.md) |
| DIA-POS-006 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-006-dictamenes-clases.md) |
| DIA-POS-106 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-106-dictamenes-er.md) |
| DIA-DOC-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DOC-001-documentos-versiones-clases.md) |
| DIA-DOC-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md) |
| DIA-DOC-002 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DOC-002-observaciones-correcciones-clases.md) |
| DIA-DOC-102 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DOC-102-observaciones-correcciones-er.md) |
| DIA-NOT-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-NOT-001-notificaciones-clases.md) |
| DIA-NOT-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-NOT-101-notificaciones-er.md) |
| DIA-EG-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EG-001-examen-clases.md) |
| DIA-EG-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EG-101-examen-er.md) |
| DIA-EA-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EA-001-excelencia-clases.md) |
| DIA-EA-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EA-101-excelencia-er.md) |
| DIA-DIP-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DIP-001-diplomado-clases.md) |
| DIA-DIP-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DIP-101-diplomado-er.md) |
| DIA-TD-001 | Clases | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-TD-001-trabajo-dirigido-clases.md) |
| DIA-TD-101 | ER lógico | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-TD-101-trabajo-dirigido-er.md) |
| DIA-SYS-002 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-SYS-002-modelo-base.md) |
| DIA-PG-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-PG-020-politicas-proyecto_grado.md) |
| DIA-TG-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-TG-020-politicas-tesis_grado.md) |
| DIA-TD-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-TD-020-politicas-trabajo_dirigido.md) |
| DIA-EG-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EG-020-politicas-examen_grado.md) |
| DIA-EA-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EA-020-politicas-excelencia_academica.md) |
| DIA-DIP-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DIP-020-politicas-diplomado.md) |
| DIA-MOD-001 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-MOD-001-contratos-politicas.md) |
| DIA-POS-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-020-servicios-expediente.md) |
| DIA-POS-021 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-021-servicios-defensa-cierre.md) |
| DIA-DOC-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DOC-020-servicios-documentales.md) |
| DIA-NOT-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-NOT-020-servicios-eventos-notificaciones.md) |
| DIA-USR-020 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-USR-020-autenticacion-autorizacion.md) |
| DIA-EG-021 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EG-021-servicio-examen.md) |
| DIA-EA-021 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-EA-021-servicio-excelencia.md) |
| DIA-DIP-021 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-DIP-021-servicio-diplomado.md) |
| DIA-TD-021 | Clases de diseño | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-TD-021-servicio-trabajo-dirigido.md) |
| DIA-SYS-006 | Componentes | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-SYS-006-componentes-general.md) |
| DIA-MOD-002 | Componentes | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-MOD-002-componentes-motor.md) |
| DIA-SYS-007 | Despliegue | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-SYS-007-despliegue-docker.md) |
| DIA-USR-021 | Clases / persistencia heredada | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-USR-021-herencia-autenticacion.md) |
| DIA-POS-120 | ER lógico derivado | Revisada; conservada sin edición; [ficha existente](../diagramas/fichas/DIA-POS-120-intermedia-memorandum.md) |

## Conciliación de los 23 candidatos

Los IDs originales se conservan aunque se precise el nombre. Los nuevos objetivos separan consulta, autenticación alternativa, escritura o cierre donde el permiso o resultado cambia.

| ID conservado | Precisión de alcance |
| --- | --- |
| UC-USR-001 | Iniciar sesión con usuario y contraseña; [especificación](../03-casos-de-uso/especificaciones/UC-USR-001.md) |
| UC-USR-002 | Administrar cuentas de usuario; [especificación](../03-casos-de-uso/especificaciones/UC-USR-002.md) |
| UC-ACA-001 | Actualizar una modalidad existente; [especificación](../03-casos-de-uso/especificaciones/UC-ACA-001.md) |
| UC-ACA-002 | Publicar o sustituir un documento oficial de modalidad; [especificación](../03-casos-de-uso/especificaciones/UC-ACA-002.md) |
| UC-POS-001 | Registrar una postulación con seguimiento; [especificación](../03-casos-de-uso/especificaciones/UC-POS-001.md) |
| UC-POS-002 | Consultar postulaciones y expediente; [especificación](../03-casos-de-uso/especificaciones/UC-POS-002.md) |
| UC-POS-003 | Ejecutar una transición de etapa; [especificación](../03-casos-de-uso/especificaciones/UC-POS-003.md) |
| UC-POS-004 | Asignar un actor académico; [especificación](../03-casos-de-uso/especificaciones/UC-POS-004.md) |
| UC-POS-005 | Registrar una decisión académica de etapa; [especificación](../03-casos-de-uso/especificaciones/UC-POS-005.md) |
| UC-PG-001 | Publicar memorando de designación de Proyecto; [especificación](../03-casos-de-uso/especificaciones/UC-PG-001.md) |
| UC-DOC-001 | Cargar un documento o una nueva versión; [especificación](../03-casos-de-uso/especificaciones/UC-DOC-001.md) |
| UC-DOC-002 | Revisar un documento presentado; [especificación](../03-casos-de-uso/especificaciones/UC-DOC-002.md) |
| UC-POS-006 | Administrar el ciclo de una defensa; [especificación](../03-casos-de-uso/especificaciones/UC-POS-006.md) |
| UC-POS-007 | Consolidar la evaluación de una defensa; [especificación](../03-casos-de-uso/especificaciones/UC-POS-007.md) |
| UC-PG-002 | Operar el cierre técnico de Proyecto; [especificación](../03-casos-de-uso/especificaciones/UC-PG-002.md) |
| UC-POS-008 | Concluir académicamente por el motor común; [especificación](../03-casos-de-uso/especificaciones/UC-POS-008.md) |
| UC-NOT-001 | Consultar notificaciones propias; [especificación](../03-casos-de-uso/especificaciones/UC-NOT-001.md) |
| UC-REP-001 | Consultar resultados académicos institucionales; [especificación](../03-casos-de-uso/especificaciones/UC-REP-001.md) |
| UC-TG-001 | Concluir Tesis con acta y defensa válidas; [especificación](../03-casos-de-uso/especificaciones/UC-TG-001.md) |
| UC-TD-001 | Configurar institución de Trabajo Dirigido; [especificación](../03-casos-de-uso/especificaciones/UC-TD-001.md) |
| UC-EG-001 | Registrar evaluación de un área de Examen; [especificación](../03-casos-de-uso/especificaciones/UC-EG-001.md) |
| UC-EA-001 | Registrar evaluación de Excelencia; [especificación](../03-casos-de-uso/especificaciones/UC-EA-001.md) |
| UC-DIP-001 | Registrar el resultado de un módulo de Diplomado; [especificación](../03-casos-de-uso/especificaciones/UC-DIP-001.md) |

Los agregados de autenticación se dividen en login, login estudiantil, refresh, logout y consulta de sesión. Periodos/requisitos se separan de modalidades, cuyo create/destroy está rechazado. Trabajo Dirigido separa institución, informe, consulta y conclusión; Examen, Excelencia y Diplomado conservan sus operaciones y políticas. Tesis es especialización de conclusión, no duplicación del endpoint. Históricos, intentos, dictámenes, observaciones, entregas, lectura documental y notificaciones mutables antes no tenían ficha propia.

## Contradicciones y pendientes

1. ADMINISTRACION e is_staff no equivalen a administración funcional. La interfaz puede diferir del conjunto aceptado por IsAuthenticated.
2. Marcar observación documental como corregida exige administración; no atribuir esa acción al propietario estudiante.
3. Los memorandos/versiones se filtran por publicación y vigencia; el vínculo al expediente no basta para ver todos los archivos.
4. PATCH de estado general y conclusión por workflow tienen validaciones distintas. No se corrige ni se declara equivalencia normativa.
5. ConfirmacionCorreccionDocumentoViewSet hereda PUT/PATCH/DELETE; no se extrapola la validación de create a esas rutas. Pendiente caracterización sin datos reales.
6. Examen y Diplomado pueden inicializar estructuras en overview; lectura lógica no significa ausencia de toda persistencia auxiliar.
7. Logout no verifica explícitamente propiedad del refresh en la vista; contrato pendiente de prueba aislada. No se afirma explotación ni se opera una sesión real.

No se documentan como flujos confirmados las consultas stub con NotImplementedError, baja sin ruta HTTP confirmada ni funcionalidades propuestas por backlog. PUT/PATCH normal de PostulacionViewSet existe mediante serializer; no se declara bloqueado. Las variantes no caracterizadas de esa edición quedan pendientes de desglose, además de las operaciones confirmadas de estado general.

## Límites de evidencia

Análisis estático y referencias a archivos de pruebas; no ejecución de pruebas del producto, PostgreSQL, migraciones o credenciales. No certifica cobertura por escenario, normativa académica vigente, datos instalados ni producción. Los diagramas funcionales describen autorización actual incluso cuando plantea una discrepancia que merezca revisión posterior.
