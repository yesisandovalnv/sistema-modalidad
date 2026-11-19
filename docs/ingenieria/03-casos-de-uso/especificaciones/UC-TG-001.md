# UC-TG-001 — Concluir Tesis con acta y defensa válidas

## Identidad y estado

- Identificador: UC-TG-001.
- Objetivo: Tesis concluida solo cuando cumple su validación específica.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Concluir Tesis con acta y defensa válidas mediante `POST /api/v1/postulaciones/{id}/concluir-academicamente/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

**Especialización:** concreta UC-POS-008 para TESIS_GRADO; comparte endpoint y no constituye una segunda operación HTTP.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Modalidad TESIS_GRADO y gates propios; no representa un endpoint adicional. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar conclusión para una postulación TESIS_GRADO.
2. Resolver la postulación con autoridad administrativa.
3. Validar los requisitos de conclusión de TesisGradoPolicy.
4. Ejecutar la transición común a CONCLUIDA.
5. Devolver la postulación.

## Flujos alternativos

La idempotencia del motor común se conserva; un acta ajena o no válida no acredita el gate.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/concluir-academicamente/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede concluir académicamente una postulación.')` — [PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); línea 479; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); línea 485; método citado.
- `ValidationError('La conclusión académica requiere Defensa Pública aprobada.')` — [TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py); línea 818; método citado.
- `ValidationError('La conclusión académica requiere nota final aprobatoria consolidada.')` — [TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py); línea 821; método citado.
- `ValidationError('La conclusión académica requiere ACTA_DEFENSA vigente, aprobada y vinculada a la Defensa Pública.')` — [TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py); línea 834; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Tesis concluida solo cuando cumple su validación específica. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-TG-101: Especialización de UC-POS-008: Tesis valida su defensa pública y ACTA_DEFENSA vinculada, sin heredar el cierre técnico de Proyecto.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); colaboración: [TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).
- Entidades: ENT-POS-004, ENT-POS-012, ENT-POS-014, ENT-DOC-003 (Postulacion, EventoDefensa, EvaluacionDefensa, DocumentoPostulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_tesis_e2e.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-TG-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-TG-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-TG-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-TG-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-TG-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TG-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TG-001-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TG-001-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TG-001-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
