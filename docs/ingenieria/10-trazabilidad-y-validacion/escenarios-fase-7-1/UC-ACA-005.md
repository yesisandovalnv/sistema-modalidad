# UC-ACA-005 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-005.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-105 — Un código sin política informa no soporte; no adopta reglas de Proyecto por respaldo.

Endpoint/operación del objetivo: `GET /api/v1/academico/modalidades/; GET /api/v1/academico/modalidades/{id}/capacidades/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-005-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar catálogo o capacidades → Autenticar y resolver modalidad → Contrastar registro y etapas persistidas → Devolver capacidades y advertencias.
- Comportamiento documentado: Capacidades consultadas, sin transición.
- Regla: RN-ACA-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:ModalidadViewSet.capacidades](../../../../apps/academico/views.py); [apps/modalidades/policies.py:ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-005-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: El alias /api/v1/modalidades/{id}/capacidades/ no es un objetivo nuevo.
- Regla: RN-ACA-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/academico/views.py:ModalidadViewSet.capacidades](../../../../apps/academico/views.py); [apps/modalidades/policies.py:ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-005-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/modalidades/policies.py:ModalidadPolicyRegistry L401.
- Comportamiento documentado: Rechazo declarado: ValueError(f'Ya existe una política incompatible para {codigo}.')
- Regla: RN-ACA-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/modalidades/policies.py:ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).
- Contexto sintáctico de guardas: `current is not None and current.__class__ is not instance.__class__ [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-005-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/modalidades/policies.py:ModalidadPolicyRegistry L403.
- Comportamiento documentado: Rechazo declarado: ValueError('El código de registro no coincide con el de la política.')
- Regla: RN-ACA-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/modalidades/policies.py:ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).
- Contexto sintáctico de guardas: `instance.get_codigo_modalidad() != codigo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-005-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/modalidades/policies.py:ModalidadPolicyRegistry L412.
- Comportamiento documentado: Rechazo declarado: ValueError('Se esperaba un código, Modalidad o Postulacion.')
- Regla: RN-ACA-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/modalidades/policies.py:ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).
- Contexto sintáctico de guardas: `not codigo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-005-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/modalidades/policies.py:ModalidadPolicyRegistry L418.
- Comportamiento documentado: Rechazo declarado: ModalidadNoSoportadaError(codigo)
- Regla: RN-ACA-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/modalidades/policies.py:ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).
- Contexto sintáctico de guardas: `codigo not in cls._policies [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
