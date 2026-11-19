# UC-POS-025 — Registrar observación de postulación

## Identidad y estado

- Identificador: UC-POS-025.
- Objetivo: Comentario asociado al expediente.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar observación de postulación mediante `POST /api/v1/postulaciones/observaciones/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar contexto y comentario.
2. Aplicar IsStaffOrReadOnly y serializer.
3. Registrar por la vista y servicio.
4. Devolver observación creada.

## Flujos alternativos

Las demás operaciones CRUD del ViewSet mantienen permisos y serializer; no son aprobaciones académicas.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/observaciones/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError(str(exc))` — [ObservacionViewSet.create](../../../../apps/postulantes/views.py); línea 757; método citado.
- `ValueError('Se requieren datos para agregar una observación.')` — [PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py); línea 334; método citado.
- `ValidationError('La postulación es obligatoria.')` — [PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py); línea 342; método citado.
- `ValidationError('El usuario que registra la observación es obligatorio.')` — [PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py); línea 344; método citado.
- `ValidationError('El comentario es obligatorio.')` — [PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py); línea 346; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Comentario asociado al expediente. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-125: Observación de postulación y observación sobre versión documental son registros distintos.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ObservacionViewSet.create](../../../../apps/postulantes/views.py); colaboración: [PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).
- Entidades: ENT-POS-003, ENT-POS-004, ENT-USR-002 (Observacion, Postulacion, CustomUser). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-025.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-025-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-025-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
