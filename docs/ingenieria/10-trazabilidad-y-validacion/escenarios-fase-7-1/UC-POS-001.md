# UC-POS-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-101 — La modalidad debe tener política y configuración válida; la unicidad de postulación vigente se conserva.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar estudiante, modalidad y periodo mediante el serializer → Validar soporte académico y configuración de la modalidad → Crear la postulación mediante el servicio dentro de transaction.atomic → Inicializar Proyecto/Tesis por sus orquestadores o Examen/Trabajo Dirigido/Diplomado por la rama declarada → Serializar la postulación creada.
- Comportamiento documentado: Postulación creada; solo los automatismos de su modalidad han sido ejecutados.
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Excelencia no utiliza esa autoapertura genérica en create
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: requiere su configuración específica.
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los registros históricos tienen otra acción.
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.create L182.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'modalidad': ['La modalidad seleccionada todavía no tiene soporte académico completo configurado.']})
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not ModalidadPolicyRegistry.has_policy(modalidad) or not configuracion.valida [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.create L233.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.create L227.
- Comportamiento documentado: Rechazo declarado: DjangoValidationError('La primera etapa activa debe corresponder a la Inscripción oficial de la modalidad.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.create](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `postulacion.modalidad.codigo == 'PROYECTO_GRADO' and postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO [else]; postulacion.modalidad.codigo == 'TESIS_GRADO' and postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO [else]; postulacion.modalidad.codigo in {'EXAMEN_GRADO', 'TRABAJO_DIRIGIDO', 'GRADUACION_VIA_DIPLOMADO'} and postulacion.tipo_registro == Postulacion.TipoRegistroChoices.SEGUIMIENTO [then]; etapa_inicial is None or etapa_inicial.codigo != 'INSCRIPCION' or (not seguimientos) or (seguimientos[0].etapa.codigo != etapa_inicial.codigo) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion L65.
- Comportamiento documentado: Rechazo declarado: ValueError('Se requieren datos para crear la postulación.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not args [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion L76.
- Comportamiento documentado: Rechazo declarado: ValidationError('El usuario responsable de la creación es obligatorio.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not isinstance(usuario, CustomUser) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion L78.
- Comportamiento documentado: Rechazo declarado: ValidationError('Faltan datos obligatorios para crear la postulación.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not estudiante or not modalidad or (not periodo) or (not codigo) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion L84.
- Comportamiento documentado: Rechazo declarado: ValidationError('No existe el estado inicial REGISTRADA.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not estado_inicial [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion L88.
- Comportamiento documentado: Rechazo declarado: ValidationError('El estudiante ya tiene una postulación vigente.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `postulacion_existente [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-001-E009

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion L103.
- Comportamiento documentado: Rechazo declarado: ValidationError('El estudiante ya tiene una postulación vigente.')
- Regla: RN-POS-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
