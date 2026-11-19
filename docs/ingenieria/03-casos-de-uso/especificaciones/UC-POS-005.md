# UC-POS-005 — Registrar una decisión académica de etapa

## Identidad y estado

- Identificador: UC-POS-005.
- Objetivo: Decisión y participaciones persistidas conforme al servicio.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar una decisión académica de etapa mediante `POST /api/v1/seguimientos-etapa/{id}/registrar-decision/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Código, resultado, régimen y composición permitidos para esa etapa. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar código, resultado y participantes de la decisión.
2. Exigir administración y validar el serializer.
3. Resolver definición y validar participantes mediante el servicio.
4. Registrar o reemplazar la decisión con trazabilidad.
5. Devolver 201 para alta o 200 para reemplazo.

## Flujos alternativos

reemplaza_decision activa el recorrido de reemplazo validado. Los miembros académicos quedan registrados, sin acceso directo implícito al endpoint.

## Excepciones

Ámbito: `POST /api/v1/seguimientos-etapa/{id}/registrar-decision/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede registrar decisiones académicas.')` — [SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py); línea 949; método citado.
- `_assignment_validation_error(exc)` — [SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py); línea 961; método citado.
- `ValidationError('Se requiere un usuario administrativo activo para registrar decisiones académicas.')` — [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py); línea 123; método citado.
- `ValidationError({'resultado': ['El resultado no está permitido por la policy.']})` — [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py); línea 137; método citado.
- `ValidationError({'codigo': ['Ya existe una decisión activa para este código en el seguimiento.']})` — [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py); línea 145; método citado.
- `ValidationError({'seguimiento_etapa': ['El seguimiento no está activo.']})` — [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py); línea 130; método citado.
- `ValidationError({'reemplaza_decision': ['Solo se puede reemplazar la decisión activa correspondiente a este código y seguimiento.']})` — [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py); línea 148; método citado.
- `ValidationError({'codigo': ['No se pudo crear la decisión activa; verifica si ya existe otra versión activa.']})` — [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py); línea 169; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Decisión y participaciones persistidas conforme al servicio. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-105: La política debe declarar la decisión; participantes y composición se validan antes del registro.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py); colaboración: [DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Entidades: ENT-POS-007, ENT-POS-008, ENT-POS-005 (DecisionAcademicaEtapa, ParticipacionDecisionAcademica, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_decisiones_academicas.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [DecisionAcademicaEtapaServiceTests.test_no_reemplaza_decision_de_otro_seguimiento](../../../../apps/postulantes/tests_decisiones_academicas.py) (L231); llamada a `DecisionAcademicaEtapaService.registrar`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DecisionAcademicaEtapaApiTests.test_endpoint_rechaza_decision_anterior_de_otro_seguimiento](../../../../apps/postulantes/tests_decisiones_academicas.py) (L378); llamada a `DecisionAcademicaEtapaService.registrar`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-005.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-005-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-005-E008 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
