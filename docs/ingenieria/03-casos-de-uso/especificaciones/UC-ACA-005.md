# UC-ACA-005 — Consultar modalidades y capacidades

## Identidad y estado

- Identificador: UC-ACA-005.
- Objetivo: Capacidades consultadas, sin transición.
- Actor principal: ACT-SYS-002 — Usuario autenticado. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar modalidades y capacidades mediante `GET /api/v1/academico/modalidades/; GET /api/v1/academico/modalidades/{id}/capacidades/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated; no se presume un IsActiveUser adicional. Catálogos autenticados o notificaciones propias; no concede acceso universal a expedientes.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar catálogo o capacidades.
2. Autenticar y resolver modalidad.
3. Contrastar registro y etapas persistidas.
4. Devolver capacidades y advertencias.

## Flujos alternativos

El alias /api/v1/modalidades/{id}/capacidades/ no es un objetivo nuevo.

## Excepciones

Ámbito: `GET /api/v1/academico/modalidades/; GET /api/v1/academico/modalidades/{id}/capacidades/`. La guarda de acceso es el perfil `AUTH` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValueError(f'Ya existe una política incompatible para {codigo}.')` — [ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py); línea 401; colaborador agrupado; verificar variante.
- `ValueError('El código de registro no coincide con el de la política.')` — [ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py); línea 403; colaborador agrupado; verificar variante.
- `ValueError('Se esperaba un código, Modalidad o Postulacion.')` — [ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py); línea 412; colaborador agrupado; verificar variante.
- `ModalidadNoSoportadaError(codigo)` — [ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py); línea 418; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Capacidades consultadas, sin transición. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-ACA-105: Un código sin política informa no soporte; no adopta reglas de Proyecto por respaldo.

Perfil documental `AUTH`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ModalidadViewSet.capacidades](../../../../apps/academico/views.py); colaboración: [ModalidadPolicyRegistry](../../../../apps/modalidades/policies.py).
- Entidades: ENT-ACA-002, ENT-ACA-004 (Modalidad, EtapaModalidad). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_policies.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-ACA-005.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-ACA-005-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-005-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-ACA-005-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-005-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-005-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-005-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
