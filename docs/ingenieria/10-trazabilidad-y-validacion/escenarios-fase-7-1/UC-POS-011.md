# UC-POS-011 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-011.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-111 — El registro histórico usa serializer y servicio propios, sin equipararse a seguimiento ejecutado.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/historicas/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-011-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar datos históricos → Aplicar IsStaff y validar payload → Crear mediante servicio histórico → Devolver postulación histórica.
- Comportamiento documentado: Registro histórico guardado.
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.historicas](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Adjuntar evidencia histórica usa una acción separada
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.historicas](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no acredita un recorrido E2E.
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.historicas](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.historicas L247.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'modalidad': ['La modalidad seleccionada todavía no tiene soporte académico completo configurado.']})
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.historicas](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not ModalidadPolicyRegistry.has_policy(modalidad) or not configuracion.valida [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.historicas L259.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.historicas](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion_historica L132.
- Comportamiento documentado: Rechazo declarado: ValueError('Se requieren datos para crear la postulación histórica.')
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not args [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion_historica L143.
- Comportamiento documentado: Rechazo declarado: ValidationError('Solo un usuario administrativo puede crear postulaciones históricas.')
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not is_staff_user(usuario) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion_historica L145.
- Comportamiento documentado: Rechazo declarado: ValidationError('Faltan datos obligatorios para crear la postulación histórica.')
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not estudiante or not modalidad or (not periodo) or (not codigo) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion_historica L151.
- Comportamiento documentado: Rechazo declarado: ValidationError('No existe el estado final CONCLUIDA.')
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not estado_final [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-011-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.crear_postulacion_historica L166.
- Comportamiento documentado: Rechazo declarado: ValidationError('El estudiante ya tiene una postulación vigente.')
- Regla: RN-POS-111; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
