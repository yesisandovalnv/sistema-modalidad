# Catálogo de entidades persistentes

Estado: IMPLEMENTADO en código; no acredita tablas instaladas. Identidad por clase cualificada, líneas auxiliares.

| ID | Clase | Fuente | Línea |
| --- | --- | --- | --- |
| ENT-USR-001 | Role | [apps/usuarios/models.py](../../../apps/usuarios/models.py) | 8 |
| ENT-USR-002 | CustomUser | [apps/usuarios/models.py](../../../apps/usuarios/models.py) | 42 |
| ENT-USR-003 | AuditLog | [apps/usuarios/models.py](../../../apps/usuarios/models.py) | 145 |
| ENT-USR-004 | StudentLoginThrottle | [apps/usuarios/models.py](../../../apps/usuarios/models.py) | 194 |
| ENT-ACA-001 | Periodo | [apps/academico/models.py](../../../apps/academico/models.py) | 8 |
| ENT-ACA-002 | Modalidad | [apps/academico/models.py](../../../apps/academico/models.py) | 68 |
| ENT-ACA-003 | DocumentoOficialModalidad | [apps/academico/models.py](../../../apps/academico/models.py) | 107 |
| ENT-ACA-004 | EtapaModalidad | [apps/academico/models.py](../../../apps/academico/models.py) | 143 |
| ENT-ACA-005 | Requisito | [apps/academico/models.py](../../../apps/academico/models.py) | 233 |
| ENT-ACA-006 | ModalidadRequisito | [apps/academico/models.py](../../../apps/academico/models.py) | 271 |
| ENT-POS-001 | EstadoPostulacion | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 12 |
| ENT-POS-002 | HistorialEstado | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 51 |
| ENT-POS-003 | Observacion | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 111 |
| ENT-POS-004 | Postulacion | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 159 |
| ENT-POS-005 | SeguimientoEtapa | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 297 |
| ENT-POS-006 | AsignacionPostulacion | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 421 |
| ENT-POS-007 | DecisionAcademicaEtapa | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 562 |
| ENT-POS-008 | ParticipacionDecisionAcademica | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 614 |
| ENT-POS-009 | PublicacionMemorandumDesignacion | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 666 |
| ENT-POS-010 | CondicionPostulacion | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 699 |
| ENT-POS-011 | EntregaFisica | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 741 |
| ENT-POS-012 | EventoDefensa | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 781 |
| ENT-POS-013 | ParticipanteEvento | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 838 |
| ENT-POS-014 | EvaluacionDefensa | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 861 |
| ENT-POS-015 | DictamenRevisionDocumento | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 892 |
| ENT-POS-016 | InformeRevisionTribunalPrevia | [apps/postulantes/models.py](../../../apps/postulantes/models.py) | 959 |
| ENT-DOC-001 | EstadoDocumento | [apps/documentos/models.py](../../../apps/documentos/models.py) | 10 |
| ENT-DOC-002 | TipoDocumento | [apps/documentos/models.py](../../../apps/documentos/models.py) | 49 |
| ENT-DOC-003 | DocumentoPostulacion | [apps/documentos/models.py](../../../apps/documentos/models.py) | 106 |
| ENT-DOC-004 | VersionDocumento | [apps/documentos/models.py](../../../apps/documentos/models.py) | 181 |
| ENT-DOC-005 | ObservacionDocumento | [apps/documentos/models.py](../../../apps/documentos/models.py) | 245 |
| ENT-DOC-006 | ConfirmacionCorreccionDocumento | [apps/documentos/models.py](../../../apps/documentos/models.py) | 295 |
| ENT-MOD-001 | ExamenArea | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 8 |
| ENT-MOD-002 | ExamenEvaluacion | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 50 |
| ENT-MOD-003 | ExcelenciaExpediente | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 90 |
| ENT-MOD-004 | DiplomadoModulo | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 135 |
| ENT-MOD-005 | DiplomadoDefensa | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 176 |
| ENT-MOD-006 | TrabajoDirigidoExpediente | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 208 |
| ENT-MOD-007 | InformeSeguimientoTrabajoDirigido | [apps/modalidades/models.py](../../../apps/modalidades/models.py) | 252 |
| ENT-NOT-001 | Notificacion | [apps/notificaciones/models.py](../../../apps/notificaciones/models.py) | 8 |

## Límites

Django, permisos, blacklist JWT y tablas intermedias implícitas se documentarán aparte al autorizar el ER. BaseModel es abstracto: aporta created_at, updated_at y activo, no una tabla propia.

Contrastar nulabilidad, unicidad, índices, relaciones intermedias, restricciones y migraciones. CASCADE no demuestra composición UML. Servicios y DTO no se registran como entidades persistentes.
