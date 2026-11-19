# Trazabilidad de entidades y vistas — fase 3

Cada entidad propia tiene una vista principal de clases y una ER. Las referencias abreviadas en otros diagramas representan la misma entidad; no se cuentan nuevamente. No se implica cobertura de pruebas ni esquema instalado.

| Entidad ID | Clase | Vista de clases | Vista ER |
| --- | --- | --- | --- |
| ENT-USR-001 | Role | [DIA-USR-001](../diagramas/fichas/DIA-USR-001-usuarios-clases.md) | [DIA-USR-101](../diagramas/fichas/DIA-USR-101-usuarios-er.md) |
| ENT-USR-002 | CustomUser | [DIA-USR-001](../diagramas/fichas/DIA-USR-001-usuarios-clases.md) | [DIA-USR-101](../diagramas/fichas/DIA-USR-101-usuarios-er.md) |
| ENT-USR-003 | AuditLog | [DIA-USR-001](../diagramas/fichas/DIA-USR-001-usuarios-clases.md) | [DIA-USR-101](../diagramas/fichas/DIA-USR-101-usuarios-er.md) |
| ENT-USR-004 | StudentLoginThrottle | [DIA-USR-001](../diagramas/fichas/DIA-USR-001-usuarios-clases.md) | [DIA-USR-101](../diagramas/fichas/DIA-USR-101-usuarios-er.md) |
| ENT-ACA-001 | Periodo | [DIA-ACA-001](../diagramas/fichas/DIA-ACA-001-academico-clases.md) | [DIA-ACA-101](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| ENT-ACA-002 | Modalidad | [DIA-ACA-001](../diagramas/fichas/DIA-ACA-001-academico-clases.md) | [DIA-ACA-101](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| ENT-ACA-003 | DocumentoOficialModalidad | [DIA-ACA-001](../diagramas/fichas/DIA-ACA-001-academico-clases.md) | [DIA-ACA-101](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| ENT-ACA-004 | EtapaModalidad | [DIA-ACA-001](../diagramas/fichas/DIA-ACA-001-academico-clases.md) | [DIA-ACA-101](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| ENT-ACA-005 | Requisito | [DIA-ACA-001](../diagramas/fichas/DIA-ACA-001-academico-clases.md) | [DIA-ACA-101](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| ENT-ACA-006 | ModalidadRequisito | [DIA-ACA-001](../diagramas/fichas/DIA-ACA-001-academico-clases.md) | [DIA-ACA-101](../diagramas/fichas/DIA-ACA-101-academico-er.md) |
| ENT-POS-001 | EstadoPostulacion | [DIA-POS-001](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md) | [DIA-POS-101](../diagramas/fichas/DIA-POS-101-postulaciones-er.md) |
| ENT-POS-002 | HistorialEstado | [DIA-POS-001](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md) | [DIA-POS-101](../diagramas/fichas/DIA-POS-101-postulaciones-er.md) |
| ENT-POS-003 | Observacion | [DIA-POS-001](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md) | [DIA-POS-101](../diagramas/fichas/DIA-POS-101-postulaciones-er.md) |
| ENT-POS-004 | Postulacion | [DIA-POS-001](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md) | [DIA-POS-101](../diagramas/fichas/DIA-POS-101-postulaciones-er.md) |
| ENT-POS-005 | SeguimientoEtapa | [DIA-POS-002](../diagramas/fichas/DIA-POS-002-etapas-clases.md) | [DIA-POS-102](../diagramas/fichas/DIA-POS-102-etapas-er.md) |
| ENT-POS-006 | AsignacionPostulacion | [DIA-POS-003](../diagramas/fichas/DIA-POS-003-asignaciones-decisiones-clases.md) | [DIA-POS-103](../diagramas/fichas/DIA-POS-103-asignaciones-decisiones-er.md) |
| ENT-POS-007 | DecisionAcademicaEtapa | [DIA-POS-003](../diagramas/fichas/DIA-POS-003-asignaciones-decisiones-clases.md) | [DIA-POS-103](../diagramas/fichas/DIA-POS-103-asignaciones-decisiones-er.md) |
| ENT-POS-008 | ParticipacionDecisionAcademica | [DIA-POS-003](../diagramas/fichas/DIA-POS-003-asignaciones-decisiones-clases.md) | [DIA-POS-103](../diagramas/fichas/DIA-POS-103-asignaciones-decisiones-er.md) |
| ENT-POS-009 | PublicacionMemorandumDesignacion | [DIA-POS-003](../diagramas/fichas/DIA-POS-003-asignaciones-decisiones-clases.md) | [DIA-POS-103](../diagramas/fichas/DIA-POS-103-asignaciones-decisiones-er.md) |
| ENT-POS-010 | CondicionPostulacion | [DIA-POS-004](../diagramas/fichas/DIA-POS-004-condiciones-entregas-clases.md) | [DIA-POS-104](../diagramas/fichas/DIA-POS-104-condiciones-entregas-er.md) |
| ENT-POS-011 | EntregaFisica | [DIA-POS-004](../diagramas/fichas/DIA-POS-004-condiciones-entregas-clases.md) | [DIA-POS-104](../diagramas/fichas/DIA-POS-104-condiciones-entregas-er.md) |
| ENT-POS-012 | EventoDefensa | [DIA-POS-005](../diagramas/fichas/DIA-POS-005-defensas-evaluaciones-clases.md) | [DIA-POS-105](../diagramas/fichas/DIA-POS-105-defensas-evaluaciones-er.md) |
| ENT-POS-013 | ParticipanteEvento | [DIA-POS-005](../diagramas/fichas/DIA-POS-005-defensas-evaluaciones-clases.md) | [DIA-POS-105](../diagramas/fichas/DIA-POS-105-defensas-evaluaciones-er.md) |
| ENT-POS-014 | EvaluacionDefensa | [DIA-POS-005](../diagramas/fichas/DIA-POS-005-defensas-evaluaciones-clases.md) | [DIA-POS-105](../diagramas/fichas/DIA-POS-105-defensas-evaluaciones-er.md) |
| ENT-POS-015 | DictamenRevisionDocumento | [DIA-POS-006](../diagramas/fichas/DIA-POS-006-dictamenes-clases.md) | [DIA-POS-106](../diagramas/fichas/DIA-POS-106-dictamenes-er.md) |
| ENT-POS-016 | InformeRevisionTribunalPrevia | [DIA-POS-006](../diagramas/fichas/DIA-POS-006-dictamenes-clases.md) | [DIA-POS-106](../diagramas/fichas/DIA-POS-106-dictamenes-er.md) |
| ENT-DOC-001 | EstadoDocumento | [DIA-DOC-001](../diagramas/fichas/DIA-DOC-001-documentos-versiones-clases.md) | [DIA-DOC-101](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md) |
| ENT-DOC-002 | TipoDocumento | [DIA-DOC-001](../diagramas/fichas/DIA-DOC-001-documentos-versiones-clases.md) | [DIA-DOC-101](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md) |
| ENT-DOC-003 | DocumentoPostulacion | [DIA-DOC-001](../diagramas/fichas/DIA-DOC-001-documentos-versiones-clases.md) | [DIA-DOC-101](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md) |
| ENT-DOC-004 | VersionDocumento | [DIA-DOC-001](../diagramas/fichas/DIA-DOC-001-documentos-versiones-clases.md) | [DIA-DOC-101](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md) |
| ENT-DOC-005 | ObservacionDocumento | [DIA-DOC-002](../diagramas/fichas/DIA-DOC-002-observaciones-correcciones-clases.md) | [DIA-DOC-102](../diagramas/fichas/DIA-DOC-102-observaciones-correcciones-er.md) |
| ENT-DOC-006 | ConfirmacionCorreccionDocumento | [DIA-DOC-002](../diagramas/fichas/DIA-DOC-002-observaciones-correcciones-clases.md) | [DIA-DOC-102](../diagramas/fichas/DIA-DOC-102-observaciones-correcciones-er.md) |
| ENT-MOD-001 | ExamenArea | [DIA-EG-001](../diagramas/fichas/DIA-EG-001-examen-clases.md) | [DIA-EG-101](../diagramas/fichas/DIA-EG-101-examen-er.md) |
| ENT-MOD-002 | ExamenEvaluacion | [DIA-EG-001](../diagramas/fichas/DIA-EG-001-examen-clases.md) | [DIA-EG-101](../diagramas/fichas/DIA-EG-101-examen-er.md) |
| ENT-MOD-003 | ExcelenciaExpediente | [DIA-EA-001](../diagramas/fichas/DIA-EA-001-excelencia-clases.md) | [DIA-EA-101](../diagramas/fichas/DIA-EA-101-excelencia-er.md) |
| ENT-MOD-004 | DiplomadoModulo | [DIA-DIP-001](../diagramas/fichas/DIA-DIP-001-diplomado-clases.md) | [DIA-DIP-101](../diagramas/fichas/DIA-DIP-101-diplomado-er.md) |
| ENT-MOD-005 | DiplomadoDefensa | [DIA-DIP-001](../diagramas/fichas/DIA-DIP-001-diplomado-clases.md) | [DIA-DIP-101](../diagramas/fichas/DIA-DIP-101-diplomado-er.md) |
| ENT-MOD-006 | TrabajoDirigidoExpediente | [DIA-TD-001](../diagramas/fichas/DIA-TD-001-trabajo-dirigido-clases.md) | [DIA-TD-101](../diagramas/fichas/DIA-TD-101-trabajo-dirigido-er.md) |
| ENT-MOD-007 | InformeSeguimientoTrabajoDirigido | [DIA-TD-001](../diagramas/fichas/DIA-TD-001-trabajo-dirigido-clases.md) | [DIA-TD-101](../diagramas/fichas/DIA-TD-101-trabajo-dirigido-er.md) |
| ENT-NOT-001 | Notificacion | [DIA-NOT-001](../diagramas/fichas/DIA-NOT-001-notificaciones-clases.md) | [DIA-NOT-101](../diagramas/fichas/DIA-NOT-101-notificaciones-er.md) |

Complementos: [autenticación heredada](../diagramas/fichas/DIA-USR-021-herencia-autenticacion.md) e [intermedia M2M](../diagramas/fichas/DIA-POS-120-intermedia-memorandum.md). Las reglas funcionales y pruebas permanecen en la [matriz inicial](../10-trazabilidad-y-validacion/matriz.md).
