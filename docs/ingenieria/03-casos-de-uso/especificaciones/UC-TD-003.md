# UC-TD-003 — Concluir Trabajo Dirigido

## Identidad y estado

- Identificador: UC-TD-003.
- Objetivo: Trabajo Dirigido concluido cuando sus gates lo permiten.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Concluir Trabajo Dirigido mediante `POST /api/v1/postulaciones/{id}/trabajo-dirigido/concluir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Requisitos y acta de Trabajo Dirigido válidos según política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar conclusión con administración.
2. Resolver postulación de Trabajo Dirigido.
3. Iniciar/aprobar cierre documental si corresponde.
4. Invocar WorkflowService.concluir_postulacion.
5. Devolver la etapa de cierre.

## Flujos alternativos

No es la misma secuencia que la conclusión de Examen o el cierre técnico de Proyecto.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/trabajo-dirigido/concluir/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede operar Trabajo Dirigido.')` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 32; método citado.
- `ValidationError('La operación de Trabajo Dirigido no existe.')` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 44; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 46; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Trabajo Dirigido concluido cuando sus gates lo permiten. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-TD-103: El servicio opera CIERRE_DOCUMENTAL y después invoca conclusión común con validación propia.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); colaboración: [TrabajoDirigidoService.concluir](../../../../apps/modalidades/trabajo_dirigido_service.py).
- Entidades: ENT-POS-004, ENT-POS-005 (Postulacion, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_trabajo_dirigido.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-TD-003.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-TD-003-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-TD-003-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-TD-003-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-003-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-003-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
