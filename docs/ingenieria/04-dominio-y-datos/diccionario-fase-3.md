# Diccionario lógico derivado del código — fase 3

Estado: IMPLEMENTADO en modelos; no esquema físico instalado. Fuente completa: [extracción AST](modelo-logico-fase-3.json).

Todos los modelos propios heredan BaseModel (created_at, updated_at, activo) y una PK id BigAutoField implícita según DEFAULT_AUTO_FIELD. No se mezclan blank (validación de formularios) y null (persistencia). ManyToMany no es una columna FK del propietario. Restricciones condicionales no se convierten en unicidad global.

CustomUser hereda AbstractUser: atributos y M2M del framework se señalan aparte. Las tablas de Django y SimpleJWT no son parte del inventario propio de 40 entidades. Su esquema físico, nombres efectivos e instalación no se certifican.

## Periodo

[Fuente](../../../apps/academico/models.py), clase Periodo, línea 8.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| nombre | CharField | False | True | — | {'max_length': '50', 'unique': 'True', 'verbose_name': "'Nombre'"} |
| fecha_inicio | DateField | False | False | — | {'verbose_name': "'Fecha de inicio'"} |
| fecha_fin | DateField | False | False | — | {'verbose_name': "'Fecha de fin'"} |
| gestion | PositiveSmallIntegerField | False | False | — | {'verbose_name': "'Gestión'"} |
| semestre | CharField | False | False | — | {'max_length': '2', 'choices': 'Semestre.choices', 'verbose_name': "'Semestre'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['gestion', 'semestre'], name='unique_periodo_gestion_semestre')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## Modalidad

[Fuente](../../../apps/academico/models.py), clase Modalidad, línea 68.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '40', 'unique': 'True', 'verbose_name': "'Código'"} |
| nombre | CharField | False | True | — | {'max_length': '150', 'unique': 'True', 'verbose_name': "'Nombre'"} |
| descripcion | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Descripción'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## DocumentoOficialModalidad

[Fuente](../../../apps/academico/models.py), clase DocumentoOficialModalidad, línea 107.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| modalidad | ForeignKey | False | False | Modalidad | {'on_delete': 'models.PROTECT', 'related_name': "'documentos_oficiales'", 'verbose_name': "'Modalidad'"} |
| archivo | FileField | False | False | — | {'upload_to': 'documento_oficial_modalidad_upload_to', 'verbose_name': "'Archivo PDF'"} |
| nombre | CharField | False | False | — | {'max_length': '200', 'verbose_name': "'Nombre del documento'"} |
| actualizado_por | ForeignKey | False | False | usuarios.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'documentos_oficiales_modalidad_actualizados'", 'verbose_name': "'Última actualización por'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## EtapaModalidad

[Fuente](../../../apps/academico/models.py), clase EtapaModalidad, línea 143.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| modalidad | ForeignKey | False | False | Modalidad | {'on_delete': 'models.PROTECT', 'related_name': "'etapas'", 'verbose_name': "'Modalidad'"} |
| codigo | CharField | False | False | — | {'max_length': '50', 'verbose_name': "'Código'"} |
| nombre | CharField | False | False | — | {'max_length': '150', 'verbose_name': "'Nombre'"} |
| orden | PositiveIntegerField | False | False | — | {'verbose_name': "'Orden'"} |
| obligatoria | BooleanField | False | False | — | {'default': 'True', 'verbose_name': "'Obligatoria'"} |
| permite_repeticion | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Permite repetición'"} |
| origen_normativo | TextField | False | False | — | {'verbose_name': "'Origen normativo'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['modalidad', 'codigo'], name='unique_modalidad_etapa_codigo')
- models.UniqueConstraint(fields=['modalidad', 'orden'], name='unique_modalidad_etapa_orden')
- models.CheckConstraint(condition=models.Q(orden__gte=1), name='check_etapa_modalidad_orden_gte_1')

Índices declarados:

- models.Index(fields=['modalidad', 'activo'], name='idx_etapa_modalidad_activo')
- models.Index(fields=['modalidad', 'orden'], name='idx_etapa_modalidad_orden')

## Requisito

[Fuente](../../../apps/academico/models.py), clase Requisito, línea 233.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '50', 'unique': 'True', 'verbose_name': "'Código'"} |
| nombre | CharField | False | False | — | {'max_length': '200', 'verbose_name': "'Nombre'"} |
| descripcion | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Descripción'"} |
| obligatorio | BooleanField | False | False | — | {'default': 'True', 'verbose_name': "'Obligatorio'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## ModalidadRequisito

[Fuente](../../../apps/academico/models.py), clase ModalidadRequisito, línea 271.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| modalidad | ForeignKey | False | False | Modalidad | {'on_delete': 'models.CASCADE', 'related_name': "'requisitos'", 'verbose_name': "'Modalidad'"} |
| requisito | ForeignKey | False | False | Requisito | {'on_delete': 'models.CASCADE', 'related_name': "'modalidades'", 'verbose_name': "'Requisito'"} |
| orden | PositiveIntegerField | False | False | — | {'verbose_name': "'Orden'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['modalidad', 'requisito'], name='unique_modalidad_requisito')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## EstadoDocumento

[Fuente](../../../apps/documentos/models.py), clase EstadoDocumento, línea 10.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '30', 'unique': 'True', 'verbose_name': "'Código'"} |
| nombre | CharField | False | True | — | {'max_length': '100', 'unique': 'True', 'verbose_name': "'Nombre'"} |
| descripcion | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Descripción'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## TipoDocumento

[Fuente](../../../apps/documentos/models.py), clase TipoDocumento, línea 49.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '50', 'unique': 'True', 'verbose_name': "'Código'"} |
| nombre | CharField | False | True | — | {'max_length': '100', 'unique': 'True', 'verbose_name': "'Nombre'"} |
| descripcion | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Descripción'"} |
| obligatorio | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Obligatorio'"} |
| permite_multiple_version | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Permite múltiples versiones'"} |
| tamano_maximo_mb | PositiveIntegerField | False | False | — | {'default': '10', 'verbose_name': "'Tamaño máximo (MB)'"} |
| extensiones_permitidas | CharField | False | False | — | {'max_length': '200', 'default': "'pdf,doc,docx'", 'verbose_name': "'Extensiones permitidas'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## DocumentoPostulacion

[Fuente](../../../apps/documentos/models.py), clase DocumentoPostulacion, línea 106.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | apps.postulantes.models.Postulacion | {'on_delete': 'models.CASCADE', 'related_name': "'documentos'", 'verbose_name': "'Postulación'"} |
| evento_defensa | ForeignKey | True | False | postulantes.EventoDefensa | {'on_delete': 'models.SET_NULL', 'related_name': "'documentos_vinculados'", 'null': 'True', 'blank': 'True', 'verbose_name': "'Evento de defensa relacionado'"} |
| tipo_documento | ForeignKey | False | False | TipoDocumento | {'on_delete': 'models.PROTECT', 'related_name': "'documentos'", 'verbose_name': "'Tipo de documento'"} |
| estado | ForeignKey | False | False | EstadoDocumento | {'on_delete': 'models.PROTECT', 'related_name': "'documentos'", 'verbose_name': "'Estado'"} |
| fecha_subida | DateTimeField | False | False | — | {'auto_now_add': 'True', 'verbose_name': "'Fecha de subida'"} |
| fecha_revision | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Fecha de revisión'"} |
| observacion_general | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Observación general'"} |
| requiere_correccion | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Requiere corrección'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'tipo_documento'], name='unique_postulacion_tipo_documento')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## VersionDocumento

[Fuente](../../../apps/documentos/models.py), clase VersionDocumento, línea 181.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| documento | ForeignKey | False | False | DocumentoPostulacion | {'on_delete': 'models.CASCADE', 'related_name': "'versiones'", 'verbose_name': "'Documento'"} |
| subido_por | ForeignKey | False | False | usuarios.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'versiones_documentos'", 'verbose_name': "'Subido por'"} |
| numero_version | PositiveIntegerField | False | False | — | {'verbose_name': "'Número de versión'"} |
| archivo | FileField | False | False | — | {'upload_to': "'documentos/versiones/'", 'verbose_name': "'Archivo'"} |
| nombre_original | CharField | False | False | — | {'max_length': '255', 'verbose_name': "'Nombre original'"} |
| tamano_bytes | BigIntegerField | False | False | — | {'verbose_name': "'Tamaño en bytes'"} |
| hash_sha256 | CharField | False | False | — | {'max_length': '64', 'verbose_name': "'Hash SHA-256'"} |
| fecha_subida | DateTimeField | False | False | — | {'auto_now_add': 'True', 'verbose_name': "'Fecha de subida'"} |
| es_version_actual | BooleanField | False | False | — | {'default': 'True', 'verbose_name': "'Es versión actual'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['documento', 'numero_version'], name='unique_documento_numero_version')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## ObservacionDocumento

[Fuente](../../../apps/documentos/models.py), clase ObservacionDocumento, línea 245.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| version_documento | ForeignKey | False | False | VersionDocumento | {'on_delete': 'models.CASCADE', 'related_name': "'observaciones'", 'verbose_name': "'Versión de documento'"} |
| usuario | ForeignKey | False | False | usuarios.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'observaciones_documentos'", 'verbose_name': "'Usuario'"} |
| comentario | TextField | False | False | — | {'verbose_name': "'Comentario'"} |
| leida_por_estudiante | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Leída por estudiante'"} |
| corregida | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Corregida'"} |
| fecha_observacion | DateTimeField | False | False | — | {'auto_now_add': 'True', 'verbose_name': "'Fecha de observación'"} |
| fecha_correccion | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Fecha de corrección'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## ConfirmacionCorreccionDocumento

[Fuente](../../../apps/documentos/models.py), clase ConfirmacionCorreccionDocumento, línea 295.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | apps.postulantes.models.Postulacion | {'on_delete': 'models.CASCADE', 'related_name': "'confirmaciones_correccion'"} |
| evento_origen | ForeignKey | True | False | postulantes.EventoDefensa | {'on_delete': 'models.SET_NULL', 'null': 'True', 'blank': 'True', 'related_name': "'confirmaciones_correccion'"} |
| version_observada | ForeignKey | False | False | VersionDocumento | {'on_delete': 'models.PROTECT', 'related_name': "'confirmaciones_observacion'"} |
| version_corregida | ForeignKey | False | False | VersionDocumento | {'on_delete': 'models.PROTECT', 'related_name': "'confirmaciones_correccion'"} |
| confirmado_por | ForeignKey | False | False | usuarios.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'confirmaciones_correccion_realizadas'"} |
| asignacion_confirmante | ForeignKey | True | False | postulantes.AsignacionPostulacion | {'on_delete': 'models.PROTECT', 'null': 'True', 'blank': 'True', 'related_name': "'confirmaciones_correccion_emitidas'"} |
| fecha_confirmacion | DateTimeField | False | False | — | {'auto_now_add': 'True'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['version_observada', 'version_corregida'], condition=models.Q(activo=True), name='confirmacion_correccion_versiones_activa_unica')

Índices declarados:

- models.Index(fields=['postulacion', 'activo'])
- models.Index(fields=['evento_origen', 'activo'])

## ExamenArea

[Fuente](../../../apps/modalidades/models.py), clase ExamenArea, línea 8.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | postulantes.Postulacion | {'related_name': "'examen_areas'", 'on_delete': 'models.CASCADE'} |
| codigo | CharField | False | False | — | {'max_length': '30'} |
| nombre | CharField | False | False | — | {'max_length': '150'} |
| orden | PositiveSmallIntegerField | False | False | — | {} |
| ponderacion | DecimalField | False | False | — | {'max_digits': '5', 'decimal_places': '2'} |
| estado | CharField | False | False | — | {'max_length': '20', 'choices': 'Estado.choices', 'default': 'Estado.PENDIENTE'} |
| intento_actual | PositiveSmallIntegerField | False | False | — | {'default': '1'} |
| reintento_hasta | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'codigo'], name='unique_examen_area_postulacion_codigo')
- models.UniqueConstraint(fields=['postulacion', 'orden'], name='unique_examen_area_postulacion_orden')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## ExamenEvaluacion

[Fuente](../../../apps/modalidades/models.py), clase ExamenEvaluacion, línea 50.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| area | ForeignKey | False | False | ExamenArea | {'related_name': "'evaluaciones'", 'on_delete': 'models.CASCADE'} |
| intento | PositiveSmallIntegerField | False | False | — | {} |
| nota | DecimalField | False | False | — | {'max_digits': '5', 'decimal_places': '2'} |
| resultado | CharField | False | False | — | {'max_length': '20', 'choices': 'Resultado.choices'} |
| modalidad_registro | CharField | False | False | — | {'max_length': '15', 'choices': 'ModalidadRegistro.choices', 'default': 'ModalidadRegistro.INDIVIDUAL'} |
| evaluador | ForeignKey | True | False | usuarios.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'evaluaciones_examen'", 'on_delete': 'models.PROTECT'} |
| fecha_evaluacion | DateTimeField | False | False | — | {'auto_now_add': 'True'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['area', 'intento', 'evaluador'], name='unique_examen_evaluacion_area_intento_evaluador')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## ExcelenciaExpediente

[Fuente](../../../apps/modalidades/models.py), clase ExcelenciaExpediente, línea 90.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | OneToOneField | False | True | postulantes.Postulacion | {'related_name': "'excelencia_expediente'", 'on_delete': 'models.CASCADE'} |
| criterio | CharField | False | False | — | {'max_length': '30', 'choices': 'Criterio.choices'} |
| resultado | CharField | False | False | — | {'max_length': '20', 'choices': 'Resultado.choices', 'default': 'Resultado.PENDIENTE'} |
| promedio_general | DecimalField | True | False | — | {'max_digits': '5', 'decimal_places': '2', 'null': 'True', 'blank': 'True'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |
| evaluado_por | ForeignKey | True | False | usuarios.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'evaluaciones_excelencia'", 'on_delete': 'models.PROTECT'} |
| fecha_evaluacion | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## DiplomadoModulo

[Fuente](../../../apps/modalidades/models.py), clase DiplomadoModulo, línea 135.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | postulantes.Postulacion | {'related_name': "'diplomado_modulos'", 'on_delete': 'models.CASCADE'} |
| orden | PositiveSmallIntegerField | False | False | — | {} |
| nombre | CharField | False | False | — | {'max_length': '180'} |
| horas | PositiveSmallIntegerField | True | False | — | {'null': 'True', 'blank': 'True'} |
| estado | CharField | False | False | — | {'max_length': '20', 'choices': 'Estado.choices', 'default': 'Estado.PENDIENTE'} |
| nota | DecimalField | True | False | — | {'max_digits': '5', 'decimal_places': '2', 'null': 'True', 'blank': 'True'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'orden'], name='unique_diplomado_modulo_orden')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## DiplomadoDefensa

[Fuente](../../../apps/modalidades/models.py), clase DiplomadoDefensa, línea 176.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | postulantes.Postulacion | {'related_name': "'diplomado_defensas'", 'on_delete': 'models.CASCADE'} |
| numero_intento | PositiveSmallIntegerField | False | False | — | {'default': '1'} |
| nota_consenso | DecimalField | True | False | — | {'max_digits': '5', 'decimal_places': '2', 'null': 'True', 'blank': 'True'} |
| resultado | CharField | False | False | — | {'max_length': '20', 'choices': 'Resultado.choices', 'default': 'Resultado.PENDIENTE'} |
| reintento_hasta | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'numero_intento'], name='unique_diplomado_defensa_intento')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## TrabajoDirigidoExpediente

[Fuente](../../../apps/modalidades/models.py), clase TrabajoDirigidoExpediente, línea 208.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | OneToOneField | False | True | postulantes.Postulacion | {'related_name': "'trabajo_dirigido_expediente'", 'on_delete': 'models.CASCADE'} |
| tipo_ejecucion | CharField | False | False | — | {'max_length': '10', 'choices': 'TipoEjecucion.choices'} |
| institucion_nombre | CharField | False | False | — | {'max_length': '250'} |
| institucion_tipo | CharField | False | False | — | {'max_length': '10', 'choices': 'TipoInstitucion.choices'} |
| constituida_legalmente | BooleanField | False | False | — | {'default': 'False'} |
| actividad_permanente | BooleanField | False | False | — | {'default': 'False'} |
| proporciona_recursos | BooleanField | False | False | — | {'default': 'False'} |
| supervisor_nombre | CharField | False | False | — | {'max_length': '200'} |
| supervisor_profesion | CharField | False | False | — | {'max_length': '150', 'blank': 'True'} |
| convenio_vigente | BooleanField | False | False | — | {'default': 'False'} |
| fecha_firma_convenio | DateField | True | False | — | {'null': 'True', 'blank': 'True'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## InformeSeguimientoTrabajoDirigido

[Fuente](../../../apps/modalidades/models.py), clase InformeSeguimientoTrabajoDirigido, línea 252.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| expediente | ForeignKey | False | False | TrabajoDirigidoExpediente | {'related_name': "'informes_seguimiento'", 'on_delete': 'models.CASCADE'} |
| periodo | CharField | False | False | — | {'max_length': '80'} |
| descripcion_desempeno | TextField | False | False | — | {} |
| evaluacion_cualitativa | TextField | False | False | — | {} |
| aporte_laboral | TextField | False | False | — | {} |
| sugerencias_recomendaciones | TextField | False | False | — | {'blank': 'True'} |
| registrado_por | ForeignKey | False | False | usuarios.CustomUser | {'related_name': "'informes_trabajo_dirigido_registrados'", 'on_delete': 'models.PROTECT'} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## Notificacion

[Fuente](../../../apps/notificaciones/models.py), clase Notificacion, línea 8.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| destinatario | ForeignKey | False | False | usuarios.CustomUser | {'on_delete': 'models.CASCADE', 'related_name': "'notificaciones'"} |
| tipo | CharField | False | False | — | {'max_length': '60'} |
| titulo | CharField | False | False | — | {'max_length': '180'} |
| mensaje | TextField | False | False | — | {} |
| nivel | CharField | False | False | — | {'max_length': '10', 'choices': 'Nivel.choices', 'default': 'Nivel.INFO'} |
| leida | BooleanField | False | False | — | {'default': 'False'} |
| fecha_lectura | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| actor | ForeignKey | True | False | usuarios.CustomUser | {'on_delete': 'models.SET_NULL', 'null': 'True', 'blank': 'True', 'related_name': "'notificaciones_generadas'"} |
| postulacion | ForeignKey | True | False | postulantes.Postulacion | {'on_delete': 'models.CASCADE', 'null': 'True', 'blank': 'True', 'related_name': "'notificaciones'"} |
| aggregate_type | CharField | False | False | — | {'max_length': '80'} |
| aggregate_id | CharField | False | False | — | {'max_length': '80'} |
| event_id | UUIDField | False | False | — | {} |
| deduplication_key | CharField | False | False | — | {'max_length': '255'} |
| metadata | JSONField | False | False | — | {'default': 'dict', 'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['destinatario', 'deduplication_key'], name='unique_notif_dest_dedup')

Índices declarados:

- models.Index(fields=['destinatario', 'leida', '-created_at'], name='notif_dest_read_created')
- models.Index(fields=['postulacion'], name='notif_postulacion_idx')
- models.Index(fields=['event_id'], name='notif_event_idx')

## EstadoPostulacion

[Fuente](../../../apps/postulantes/models.py), clase EstadoPostulacion, línea 12.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '30', 'unique': 'True', 'verbose_name': "'Código'"} |
| nombre | CharField | False | True | — | {'max_length': '100', 'unique': 'True', 'verbose_name': "'Nombre'"} |
| descripcion | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Descripción'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## HistorialEstado

[Fuente](../../../apps/postulantes/models.py), clase HistorialEstado, línea 51.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'on_delete': 'models.CASCADE', 'related_name': "'historial_estados'", 'verbose_name': "'Postulación'"} |
| estado_anterior | ForeignKey | True | False | EstadoPostulacion | {'on_delete': 'models.PROTECT', 'related_name': "'historial_estado_anterior'", 'verbose_name': "'Estado anterior'", 'blank': 'True', 'null': 'True'} |
| estado_nuevo | ForeignKey | False | False | EstadoPostulacion | {'on_delete': 'models.PROTECT', 'related_name': "'historial_estado_nuevo'", 'verbose_name': "'Estado nuevo'"} |
| usuario | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'historial_estados'", 'verbose_name': "'Usuario'"} |
| fecha_cambio | DateTimeField | False | False | — | {'auto_now_add': 'True', 'verbose_name': "'Fecha de cambio'"} |
| comentario | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Comentario'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## Observacion

[Fuente](../../../apps/postulantes/models.py), clase Observacion, línea 111.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'on_delete': 'models.CASCADE', 'related_name': "'observaciones'", 'verbose_name': "'Postulación'"} |
| usuario | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'observaciones'", 'verbose_name': "'Usuario'"} |
| comentario | TextField | False | False | — | {'verbose_name': "'Comentario'"} |
| leida_estudiante | BooleanField | False | False | — | {'default': 'False', 'verbose_name': "'Leída por el estudiante'"} |
| fecha_observacion | DateTimeField | False | False | — | {'auto_now_add': 'True', 'verbose_name': "'Fecha de observación'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## Postulacion

[Fuente](../../../apps/postulantes/models.py), clase Postulacion, línea 159.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '30', 'unique': 'True', 'verbose_name': "'Código'"} |
| estudiante | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'postulaciones'", 'verbose_name': "'Estudiante'"} |
| modalidad | ForeignKey | False | False | apps.academico.models.Modalidad | {'on_delete': 'models.PROTECT', 'related_name': "'postulaciones'", 'verbose_name': "'Modalidad'"} |
| periodo | ForeignKey | False | False | apps.academico.models.Periodo | {'on_delete': 'models.PROTECT', 'related_name': "'postulaciones'", 'verbose_name': "'Período'"} |
| fecha_postulacion | DateTimeField | False | False | — | {'auto_now_add': 'True', 'verbose_name': "'Fecha de postulación'"} |
| observaciones_generales | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Observaciones generales'"} |
| estado_actual | ForeignKey | True | False | EstadoPostulacion | {'on_delete': 'models.PROTECT', 'related_name': "'postulaciones'", 'verbose_name': "'Estado actual'", 'null': 'True', 'blank': 'True'} |
| vigencia | CharField | False | False | — | {'max_length': '20', 'choices': 'VigenciaChoices.choices', 'default': 'VigenciaChoices.VIGENTE', 'verbose_name': "'Vigencia de la inscripción'"} |
| tipo_registro | CharField | False | False | — | {'max_length': '20', 'choices': 'TipoRegistroChoices.choices', 'default': 'TipoRegistroChoices.SEGUIMIENTO', 'verbose_name': "'Tipo de registro'"} |
| regimen_workflow | CharField | True | False | — | {'max_length': '20', 'choices': 'RegimenWorkflowChoices.choices', 'blank': 'True', 'null': 'True', 'verbose_name': "'Régimen del workflow'"} |
| fecha_baja | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True', 'verbose_name': "'Fecha de baja'"} |
| motivo_baja | TextField | True | False | — | {'null': 'True', 'blank': 'True', 'verbose_name': "'Motivo de baja'"} |
| baja_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'postulaciones_dadas_de_baja'", 'null': 'True', 'blank': 'True', 'verbose_name': "'Responsable de la baja'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['estudiante'], condition=models.Q(vigencia='VIGENTE'), name='unique_postulacion_vigente_por_estudiante')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## SeguimientoEtapa

[Fuente](../../../apps/postulantes/models.py), clase SeguimientoEtapa, línea 297.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'on_delete': 'models.CASCADE', 'related_name': "'seguimientos_etapa'", 'verbose_name': "'Postulación'"} |
| etapa | ForeignKey | False | False | apps.academico.models.EtapaModalidad | {'on_delete': 'models.PROTECT', 'related_name': "'seguimientos'", 'verbose_name': "'Etapa'"} |
| estado | CharField | False | False | — | {'max_length': '20', 'choices': 'EstadoChoices.choices', 'default': 'EstadoChoices.PENDIENTE', 'verbose_name': "'Estado'", 'help_text': "'Estado técnico del sistema; no corresponde a nombres oficiales del reglamento.'"} |
| numero_intento | PositiveIntegerField | False | False | — | {'default': '1', 'verbose_name': "'Número de intento'"} |
| fecha_inicio | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Fecha de inicio'"} |
| fecha_fin | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Fecha de fin'"} |
| abierta_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.SET_NULL', 'blank': 'True', 'null': 'True', 'related_name': "'seguimientos_etapa_abiertos'", 'verbose_name': "'Abierta por'"} |
| cerrada_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.SET_NULL', 'blank': 'True', 'null': 'True', 'related_name': "'seguimientos_etapa_cerrados'", 'verbose_name': "'Cerrada por'"} |
| observaciones | TextField | False | False | — | {'blank': 'True', 'verbose_name': "'Observaciones'"} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'etapa', 'numero_intento'], name='unique_postulacion_etapa_intento')
- models.CheckConstraint(condition=models.Q(numero_intento__gte=1), name='check_seguimiento_numero_intento_gte_1')
- models.CheckConstraint(condition=models.Q(fecha_inicio__isnull=True) | models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=models.F('fecha_inicio')), name='check_seguimiento_fechas_validas')

Índices declarados:

- models.Index(fields=['postulacion', 'estado'], name='idx_seg_post_estado')
- models.Index(fields=['postulacion', 'etapa'], name='idx_seg_post_etapa')
- models.Index(fields=['etapa', 'estado'], name='idx_seg_etapa_estado')

## AsignacionPostulacion

[Fuente](../../../apps/postulantes/models.py), clase AsignacionPostulacion, línea 421.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'on_delete': 'models.CASCADE', 'related_name': "'asignaciones'", 'verbose_name': "'Postulación'"} |
| usuario | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'asignaciones_postulacion'", 'verbose_name': "'Usuario asignado'"} |
| tipo_participacion | CharField | False | False | — | {'max_length': '40', 'choices': 'TipoParticipacionChoices.choices', 'verbose_name': "'Tipo de participación'", 'help_text': "'Código técnico del sistema fundamentado en los actores del reglamento y el diagrama oficial.'"} |
| orden_cargo | PositiveIntegerField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Orden del cargo'"} |
| fecha_designacion | DateTimeField | False | False | — | {'default': 'timezone.now', 'verbose_name': "'Fecha de designación'"} |
| fecha_finalizacion | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Fecha de finalización'"} |
| designado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.SET_NULL', 'blank': 'True', 'null': 'True', 'related_name': "'asignaciones_realizadas'", 'verbose_name': "'Designado por'"} |
| seguimiento_etapa | ForeignKey | True | False | SeguimientoEtapa | {'on_delete': 'models.SET_NULL', 'blank': 'True', 'null': 'True', 'related_name': "'asignaciones_actor'", 'verbose_name': "'Seguimiento de etapa'"} |
| observaciones | TextField | False | False | — | {'blank': 'True', 'verbose_name': "'Observaciones'"} |

Restricciones declaradas:

- models.CheckConstraint(condition=models.Q(orden_cargo__isnull=True) | models.Q(orden_cargo__gte=1), name='check_asignacion_orden_cargo_gte_1')
- models.CheckConstraint(condition=models.Q(fecha_finalizacion__isnull=True) | models.Q(fecha_finalizacion__gte=models.F('fecha_designacion')), name='check_asignacion_fechas_validas')
- models.UniqueConstraint(fields=['postulacion', 'usuario', 'tipo_participacion', 'orden_cargo'], condition=models.Q(activo=True, orden_cargo__isnull=False), name='unique_asignacion_activa_con_orden')
- models.UniqueConstraint(fields=['postulacion', 'usuario', 'tipo_participacion'], condition=models.Q(activo=True, orden_cargo__isnull=True), name='unique_asignacion_activa_sin_orden')

Índices declarados:

- models.Index(fields=['postulacion', 'tipo_participacion', 'activo'], name='idx_asig_post_tipo_act')
- models.Index(fields=['usuario', 'activo'], name='idx_asig_usuario_act')
- models.Index(fields=['postulacion', 'activo'], name='idx_asig_post_act')
- models.Index(fields=['tipo_participacion', 'activo'], name='idx_asig_tipo_act')

## DecisionAcademicaEtapa

[Fuente](../../../apps/postulantes/models.py), clase DecisionAcademicaEtapa, línea 562.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| seguimiento_etapa | ForeignKey | False | False | SeguimientoEtapa | {'on_delete': 'models.PROTECT', 'related_name': "'decisiones_academicas'"} |
| codigo | CharField | False | False | — | {'max_length': '80'} |
| resultado | CharField | False | False | — | {'max_length': '80'} |
| fecha_decision | DateTimeField | False | False | — | {'default': 'timezone.now'} |
| registrado_por | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'on_delete': 'models.PROTECT', 'related_name': "'decisiones_academicas_registradas'"} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['seguimiento_etapa', 'codigo'], condition=models.Q(activo=True), name='unique_decision_academica_activa')

Índices declarados:

- models.Index(fields=['seguimiento_etapa', 'activo'], name='idx_decision_seg_activo')

## ParticipacionDecisionAcademica

[Fuente](../../../apps/postulantes/models.py), clase ParticipacionDecisionAcademica, línea 614.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| decision | ForeignKey | False | False | DecisionAcademicaEtapa | {'on_delete': 'models.CASCADE', 'related_name': "'participaciones'"} |
| asignacion | ForeignKey | False | False | AsignacionPostulacion | {'on_delete': 'models.PROTECT', 'related_name': "'participaciones_decision_academica'"} |
| rol | CharField | False | False | — | {'max_length': '60'} |
| orden | PositiveIntegerField | True | False | — | {'null': 'True', 'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['decision', 'asignacion'], name='unique_asignacion_participacion_decision')
- models.CheckConstraint(condition=models.Q(orden__isnull=True) | models.Q(orden__gte=1), name='check_decision_participante_orden_gte_1')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## PublicacionMemorandumDesignacion

[Fuente](../../../apps/postulantes/models.py), clase PublicacionMemorandumDesignacion, línea 666.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'related_name': "'publicaciones_memorandum_designacion'", 'on_delete': 'models.PROTECT'} |
| seguimiento_etapa | ForeignKey | False | False | SeguimientoEtapa | {'related_name': "'publicaciones_memorandum_designacion'", 'on_delete': 'models.PROTECT'} |
| version_documento | OneToOneField | False | True | documentos.VersionDocumento | {'related_name': "'publicacion_designacion'", 'on_delete': 'models.PROTECT'} |
| asignaciones | ManyToManyField | False | False | AsignacionPostulacion | {'related_name': "'publicaciones_memorandum_designacion'"} |
| publicado_por | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'related_name': "'memorandums_designacion_publicados'", 'on_delete': 'models.PROTECT'} |
| fecha_publicacion | DateTimeField | False | False | — | {'default': 'timezone.now'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion'], condition=models.Q(activo=True), name='unique_memorandum_designacion_activo')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## CondicionPostulacion

[Fuente](../../../apps/postulantes/models.py), clase CondicionPostulacion, línea 699.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'related_name': "'condiciones'", 'on_delete': 'models.CASCADE'} |
| codigo | CharField | False | False | — | {'max_length': '40', 'choices': 'Tipo.choices'} |
| nombre | CharField | False | False | — | {'max_length': '150'} |
| tipo | CharField | False | False | — | {'max_length': '40', 'choices': 'Tipo.choices'} |
| estado | CharField | False | False | — | {'max_length': '15', 'choices': 'Estado.choices', 'default': 'Estado.PENDIENTE'} |
| fecha_verificacion | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| verificado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'condiciones_verificadas'", 'on_delete': 'models.PROTECT'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'codigo'], name='condicion_codigo_postulacion_unico')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## EntregaFisica

[Fuente](../../../apps/postulantes/models.py), clase EntregaFisica, línea 741.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'related_name': "'entregas_fisicas'", 'on_delete': 'models.CASCADE'} |
| codigo | CharField | False | False | — | {'max_length': '40', 'choices': 'Tipo.choices'} |
| nombre | CharField | False | False | — | {'max_length': '150'} |
| cantidad | PositiveIntegerField | True | False | — | {'null': 'True', 'blank': 'True'} |
| cantidad_recibida | PositiveIntegerField | False | False | — | {'default': '0'} |
| estado | CharField | False | False | — | {'max_length': '15', 'choices': 'Estado.choices', 'default': 'Estado.PENDIENTE'} |
| fecha_entrega | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| recibido_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'entregas_fisicas_recibidas'", 'on_delete': 'models.PROTECT'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['postulacion', 'codigo'], name='entrega_codigo_postulacion_unico')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## EventoDefensa

[Fuente](../../../apps/postulantes/models.py), clase EventoDefensa, línea 781.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| postulacion | ForeignKey | False | False | Postulacion | {'related_name': "'eventos_defensa'", 'on_delete': 'models.CASCADE'} |
| seguimiento_etapa | ForeignKey | False | False | SeguimientoEtapa | {'related_name': "'eventos_defensa'", 'on_delete': 'models.PROTECT'} |
| tipo_evento | CharField | False | False | — | {'max_length': '30', 'choices': 'Tipo.choices'} |
| numero_intento | PositiveIntegerField | False | False | — | {'default': '1'} |
| estado | CharField | False | False | — | {'max_length': '20', 'choices': 'Estado.choices', 'default': 'Estado.PROGRAMADA'} |
| fecha_programada | DateTimeField | False | False | — | {} |
| fecha_inicio_real | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| fecha_fin_real | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| lugar | CharField | False | False | — | {'max_length': '250', 'blank': 'True'} |
| modalidad_evento | CharField | False | False | — | {'max_length': '15', 'choices': 'ModalidadEvento.choices', 'default': 'ModalidadEvento.PRESENCIAL'} |
| enlace_virtual | URLField | False | False | — | {'blank': 'True'} |
| programado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'related_name': "'eventos_programados'", 'on_delete': 'models.SET_NULL'} |
| iniciado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'eventos_iniciados'", 'on_delete': 'models.SET_NULL'} |
| cerrado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'eventos_cerrados'", 'on_delete': 'models.SET_NULL'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.CheckConstraint(condition=models.Q(numero_intento__gte=1), name='evento_intento_gte_1')
- models.UniqueConstraint(fields=['postulacion', 'tipo_evento', 'numero_intento'], condition=models.Q(activo=True), name='evento_defensa_activo_unico')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## ParticipanteEvento

[Fuente](../../../apps/postulantes/models.py), clase ParticipanteEvento, línea 838.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| evento | ForeignKey | False | False | EventoDefensa | {'related_name': "'participantes'", 'on_delete': 'models.CASCADE'} |
| asignacion | ForeignKey | False | False | AsignacionPostulacion | {'related_name': "'participaciones_evento'", 'on_delete': 'models.PROTECT'} |
| rol_evento | CharField | False | False | — | {'max_length': '30', 'choices': 'Rol.choices'} |
| convocado | BooleanField | False | False | — | {'default': 'True'} |
| presente | BooleanField | True | False | — | {'null': 'True', 'blank': 'True'} |
| fecha_registro_asistencia | DateTimeField | True | False | — | {'null': 'True', 'blank': 'True'} |
| registrado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'asistencias_registradas'", 'on_delete': 'models.SET_NULL'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['evento', 'asignacion'], name='participante_evento_asignacion_unica')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## EvaluacionDefensa

[Fuente](../../../apps/postulantes/models.py), clase EvaluacionDefensa, línea 861.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| evento | ForeignKey | False | False | EventoDefensa | {'related_name': "'evaluaciones'", 'on_delete': 'models.CASCADE'} |
| evaluador | ForeignKey | True | False | ParticipanteEvento | {'null': 'True', 'blank': 'True', 'related_name': "'evaluaciones'", 'on_delete': 'models.PROTECT'} |
| tipo_evaluacion | CharField | False | False | — | {'max_length': '20', 'choices': 'Tipo.choices'} |
| modalidad_registro | CharField | False | False | — | {'max_length': '15', 'choices': 'ModalidadRegistro.choices'} |
| resultado_cualitativo | CharField | False | False | — | {'max_length': '45', 'choices': 'Resultado.choices', 'blank': 'True'} |
| nota_numerica | DecimalField | True | False | — | {'max_digits': '5', 'decimal_places': '2', 'null': 'True', 'blank': 'True'} |
| ponderacion | DecimalField | True | False | — | {'max_digits': '5', 'decimal_places': '2', 'null': 'True', 'blank': 'True'} |
| aporte_ponderado | DecimalField | True | False | — | {'max_digits': '6', 'decimal_places': '2', 'null': 'True', 'blank': 'True'} |
| semantica_nota | CharField | False | False | — | {'max_length': '24', 'choices': 'SemanticaNota.choices', 'default': 'SemanticaNota.MODALIDAD_ESPECIFICA'} |
| es_resultado_final_evento | BooleanField | False | False | — | {'default': 'False'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |
| registrado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'evaluaciones_registradas'", 'on_delete': 'models.SET_NULL'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['evento', 'evaluador', 'tipo_evaluacion'], condition=models.Q(evaluador__isnull=False), name='evaluacion_individual_unica')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## DictamenRevisionDocumento

[Fuente](../../../apps/postulantes/models.py), clase DictamenRevisionDocumento, línea 892.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| seguimiento_etapa | ForeignKey | False | False | SeguimientoEtapa | {'related_name': "'dictamenes_revision'", 'on_delete': 'models.PROTECT'} |
| version_documento_revisada | ForeignKey | False | False | documentos.VersionDocumento | {'related_name': "'dictamenes_recibidos'", 'on_delete': 'models.PROTECT'} |
| tipo_revision | CharField | False | False | — | {'max_length': '20', 'choices': 'TipoRevision.choices'} |
| resultado | CharField | False | False | — | {'max_length': '20', 'choices': 'Resultado.choices'} |
| evidencia_version | ForeignKey | False | False | documentos.VersionDocumento | {'related_name': "'evidencias_dictamen_revision'", 'on_delete': 'models.PROTECT'} |
| asignacion_emisora | ForeignKey | True | False | AsignacionPostulacion | {'null': 'True', 'blank': 'True', 'related_name': "'dictamenes_emitidos'", 'on_delete': 'models.PROTECT'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |
| registrado_por | ForeignKey | True | False | apps.usuarios.models.CustomUser | {'null': 'True', 'blank': 'True', 'related_name': "'dictamenes_revision_registrados'", 'on_delete': 'models.SET_NULL'} |
| fecha_registro | DateTimeField | False | False | — | {'auto_now_add': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['seguimiento_etapa', 'version_documento_revisada', 'tipo_revision'], condition=models.Q(activo=True), name='unique_dictamen_revision_activo_version_tipo')

Índices declarados:

- models.Index(fields=['seguimiento_etapa', 'tipo_revision', 'activo'])

## InformeRevisionTribunalPrevia

[Fuente](../../../apps/postulantes/models.py), clase InformeRevisionTribunalPrevia, línea 959.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| seguimiento_etapa | ForeignKey | False | False | SeguimientoEtapa | {'related_name': "'informes_revision_tribunal'", 'on_delete': 'models.PROTECT'} |
| version_documento_revisada | ForeignKey | False | False | documentos.VersionDocumento | {'related_name': "'informes_revision_tribunal'", 'on_delete': 'models.PROTECT'} |
| resultado | CharField | False | False | — | {'max_length': '20', 'choices': 'Resultado.choices'} |
| observaciones | TextField | False | False | — | {'blank': 'True'} |
| evidencia_version | ForeignKey | False | False | documentos.VersionDocumento | {'related_name': "'evidencias_revision_tribunal'", 'on_delete': 'models.PROTECT'} |
| fecha_registro | DateTimeField | False | False | — | {'auto_now_add': 'True'} |
| registrado_por | ForeignKey | False | False | apps.usuarios.models.CustomUser | {'related_name': "'informes_revision_tribunal_registrados'", 'on_delete': 'models.PROTECT'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['seguimiento_etapa', 'version_documento_revisada'], condition=models.Q(activo=True), name='unique_informe_revision_activo_version')

Índices declarados:

Sin índices explícitos adicionales en Meta.

## Role

[Fuente](../../../apps/usuarios/models.py), clase Role, línea 8.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| codigo | CharField | False | True | — | {'max_length': '20', 'unique': 'True', 'verbose_name': "'Código'"} |
| nombre | CharField | False | False | — | {'max_length': '100', 'verbose_name': "'Nombre'"} |
| descripcion | TextField | True | False | — | {'blank': 'True', 'null': 'True', 'verbose_name': "'Descripción'"} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## CustomUser

[Fuente](../../../apps/usuarios/models.py), clase CustomUser, línea 42.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| role | ForeignKey | True | False | Role | {'on_delete': 'models.PROTECT', 'related_name': "'usuarios'", 'verbose_name': "'Rol'", 'blank': 'True', 'null': 'True'} |
| nombres | CharField | False | False | — | {'max_length': '150', 'verbose_name': "'Nombres'", 'blank': 'True'} |
| apellido_paterno | CharField | False | False | — | {'max_length': '100', 'verbose_name': "'Apellido paterno'", 'blank': 'True'} |
| apellido_materno | CharField | False | False | — | {'max_length': '100', 'verbose_name': "'Apellido materno'", 'blank': 'True'} |
| ci | CharField | True | True | — | {'max_length': '20', 'unique': 'True', 'verbose_name': "'Cédula de identidad'", 'blank': 'True', 'null': 'True', 'default': 'None'} |
| expedido | CharField | False | False | — | {'max_length': '50', 'verbose_name': "'Expedido en'", 'blank': 'True'} |
| fecha_nacimiento | DateField | True | False | — | {'verbose_name': "'Fecha de nacimiento'", 'blank': 'True', 'null': 'True'} |
| telefono | CharField | False | False | — | {'max_length': '20', 'verbose_name': "'Teléfono'", 'blank': 'True'} |
| correo_personal | EmailField | False | False | — | {'verbose_name': "'Correo personal'", 'blank': 'True'} |
| correo_institucional | EmailField | False | False | — | {'verbose_name': "'Correo institucional'", 'blank': 'True'} |
| fotografia | FileField | True | False | — | {'upload_to': "'fotos_usuarios/'", 'verbose_name': "'Fotografía'", 'blank': 'True', 'null': 'True'} |
| ru | CharField | True | True | — | {'max_length': '20', 'unique': 'True', 'verbose_name': "'R.U.'", 'blank': 'True', 'null': 'True', 'default': 'None'} |
| username | CharField | False | True | — | {'max_length': '150', 'unique': 'True', 'verbose_name': "'Nombre de usuario'"} |
| email | EmailField | False | False | — | {'verbose_name': "'Correo electrónico'", 'blank': 'True'} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## AuditLog

[Fuente](../../../apps/usuarios/models.py), clase AuditLog, línea 145.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| usuario | ForeignKey | False | False | CustomUser | {'on_delete': 'models.CASCADE', 'related_name': "'audit_logs'", 'verbose_name': "'Usuario'"} |
| accion | CharField | False | False | — | {'max_length': '100', 'verbose_name': "'Acción'"} |
| modulo | CharField | False | False | — | {'max_length': '100', 'verbose_name': "'Módulo'"} |
| descripcion | TextField | False | False | — | {'verbose_name': "'Descripción'"} |
| ip_address | GenericIPAddressField | True | False | — | {'verbose_name': "'Dirección IP'", 'blank': 'True', 'null': 'True'} |
| metodo_http | CharField | False | False | — | {'max_length': '10', 'verbose_name': "'Método HTTP'", 'blank': 'True'} |
| url | CharField | False | False | — | {'max_length': '300', 'verbose_name': "'URL'", 'blank': 'True'} |

Restricciones declaradas:

Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean.

Índices declarados:

Sin índices explícitos adicionales en Meta.

## StudentLoginThrottle

[Fuente](../../../apps/usuarios/models.py), clase StudentLoginThrottle, línea 194.

| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |
| --- | --- | --- | --- | --- | --- |
| scope | CharField | False | False | — | {'max_length': '10', 'choices': 'Scope.choices'} |
| key_digest | CharField | False | False | — | {'max_length': '64'} |
| failed_attempts | PositiveSmallIntegerField | False | False | — | {'default': '0'} |
| window_started_at | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True'} |
| blocked_until | DateTimeField | True | False | — | {'blank': 'True', 'null': 'True'} |

Restricciones declaradas:

- models.UniqueConstraint(fields=['scope', 'key_digest'], name='unique_student_login_throttle_key')

Índices declarados:

- models.Index(fields=['scope', 'blocked_until'], name='idx_student_login_block')
