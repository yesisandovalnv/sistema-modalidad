# UC-ACA-001 — Actualizar una modalidad existente

## Identidad y estado

- Identificador: UC-ACA-001.
- Objetivo: Modalidad actualizada dentro del contrato del serializer.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Actualizar una modalidad existente mediante `PUT/PATCH /api/v1/academico/modalidades/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Identificar una modalidad existente.
2. Comprobar IsAuthenticated e IsStaffOrReadOnly.
3. Validar los campos permitidos por ModalidadSerializer.
4. Guardar y devolver la representación actualizada.

## Flujos alternativos

POST de creación y DELETE se rechazan expresamente; no son alternativas válidas de mantenimiento.

## Excepciones

Ámbito: `PUT/PATCH /api/v1/academico/modalidades/{id}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `MethodNotAllowed('POST', detail='Las modalidades oficiales no se crean desde esta API.')` — [ModalidadViewSet](../../../../apps/academico/views.py); línea 56; colaborador agrupado; verificar variante.
- `MethodNotAllowed('DELETE', detail='Las modalidades oficiales no se eliminan desde esta API.')` — [ModalidadViewSet](../../../../apps/academico/views.py); línea 59; colaborador agrupado; verificar variante.
- `Http404('El documento oficial no pertenece a esta modalidad.')` — [ModalidadViewSet](../../../../apps/academico/views.py); línea 120; colaborador agrupado; verificar variante.
- `Http404('El documento oficial no pertenece a esta modalidad.')` — [ModalidadViewSet](../../../../apps/academico/views.py); línea 130; colaborador agrupado; verificar variante.
- `Http404('El documento oficial no está disponible.')` — [ModalidadViewSet](../../../../apps/academico/views.py); línea 132; colaborador agrupado; verificar variante.
- `Http404('El documento oficial no está disponible.')` — [ModalidadViewSet](../../../../apps/academico/views.py); línea 136; colaborador agrupado; verificar variante.
- `serializers.ValidationError({field: 'Este campo no puede modificarse.'})` — [ModalidadSerializer](../../../../apps/academico/serializers.py); línea 44; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Modalidad actualizada dentro del contrato del serializer. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-ACA-101: La vista rechaza crear o eliminar modalidades oficiales; las actualizaciones están sujetas al serializer y permisos.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ModalidadViewSet](../../../../apps/academico/views.py); colaboración: [ModalidadSerializer](../../../../apps/academico/serializers.py).
- Entidades: ENT-ACA-002 (Modalidad). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_security_contract.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-ACA-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-ACA-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-001-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-001-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-001-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-001-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-001-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-001-E006 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-001-E007 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
