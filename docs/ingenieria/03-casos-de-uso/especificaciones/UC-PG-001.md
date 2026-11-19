# UC-PG-001 — Publicar memorando de designación de Proyecto

## Identidad y estado

- Identificador: UC-PG-001.
- Objetivo: Publicación vinculada a versión y asignaciones; lectura sujeta a vigencia.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Publicar memorando de designación de Proyecto mediante `POST /api/v1/postulaciones/{id}/memorandums-designacion/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Solo contextos habilitados por la política de Proyecto. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar seguimiento y archivo del memorando.
2. Resolver postulación y exigir administración.
3. Validar el contexto de publicación y composición en el servicio.
4. Crear versión documental y publicación relacionada.
5. Devolver la publicación serializada.

## Flujos alternativos

GET de la misma acción permite consulta relacionada; administración ve historial y el resto solo publicaciones vigentes. No genera firmas ni un acto institucional externo.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/memorandums-designacion/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede publicar memorándums.')` — [PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); línea 322; método citado.
- `_assignment_validation_error(exc)` — [PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); línea 334; método citado.
- `ValidationError('Solo un usuario administrativo activo puede publicar el memorándum.')` — [MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py); línea 58; método citado.
- `ValidationError('El memorándum de designación solo aplica a Proyecto de Grado.')` — [MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py); línea 61; método citado.
- `ValidationError({'seguimiento_etapa': ['Debe corresponder al Perfil de Proyecto de la postulación.']})` — [MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py); línea 64; método citado.
- `ValidationError({'archivo': ['El tipo documental del memorándum no está configurado.']})` — [MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py); línea 68; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Publicación vinculada a versión y asignaciones; lectura sujeta a vigencia. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-PG-101: La publicación congela evidencia y composición; su vigencia se calcula respecto de la composición actual.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); colaboración: [MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).
- Entidades: ENT-POS-009, ENT-DOC-004, ENT-POS-006 (PublicacionMemorandumDesignacion, VersionDocumento, AsignacionPostulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_memorandums.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [MemorandumDesignacionTests.test_rechaza_composicion_incompleta_y_usuario_no_administrativo](../../../../apps/postulantes/tests_memorandums.py) (L142); llamada a `MemorandumDesignacionService.publicar`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [MemorandumDesignacionTests.test_rechaza_tribunales_duplicados_y_archivo_no_pdf](../../../../apps/postulantes/tests_memorandums.py) (L189); llamada a `MemorandumDesignacionService.publicar`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-PG-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-PG-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-PG-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-001-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
