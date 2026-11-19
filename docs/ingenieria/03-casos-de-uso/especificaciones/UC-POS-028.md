# UC-POS-028 — Administrar estados técnicos de postulación

## Identidad y estado

- Identificador: UC-POS-028.
- Objetivo: Estado técnico registrado o actualizado.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar estados técnicos de postulación mediante `POST /api/v1/postulaciones/estados/; PUT/PATCH /api/v1/postulaciones/estados/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar alta o edición de estado técnico.
2. Aplicar IsAuthenticated e IsStaffOrReadOnly.
3. Validar serializer del catálogo.
4. Persistir el estado sin ejecutar una transición de expediente.

## Flujos alternativos

DELETE se rechaza explícitamente; mantener un catálogo no concluye postulaciones. GET es lectura autenticada.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/estados/; PUT/PATCH /api/v1/postulaciones/estados/{id}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `MethodNotAllowed('DELETE', detail='Los estados técnicos deben desactivarse, no eliminarse.')` — [EstadoPostulacionViewSet](../../../../apps/postulantes/views.py); línea 90; colaborador agrupado; verificar variante.
- `serializers.ValidationError('El código es obligatorio.')` — [EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py); línea 40; colaborador agrupado; verificar variante.
- `serializers.ValidationError('El nombre es obligatorio.')` — [EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py); línea 46; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Estado técnico registrado o actualizado. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-128: La escritura del catálogo exige administración; destroy rechaza DELETE y propone desactivar.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EstadoPostulacionViewSet](../../../../apps/postulantes/views.py); colaboración: [EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).
- Entidades: ENT-POS-001 (EstadoPostulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_security_contract.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-028.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-028-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-028-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-028-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-028-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-028-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-028-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-028-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
