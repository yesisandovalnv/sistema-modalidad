# UC-POS-011 — Registrar una postulación histórica

## Identidad y estado

- Identificador: UC-POS-011.
- Objetivo: Registro histórico guardado.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar una postulación histórica mediante `POST /api/v1/postulaciones/historicas/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar datos históricos.
2. Aplicar IsStaff y validar payload.
3. Crear mediante servicio histórico.
4. Devolver postulación histórica.

## Flujos alternativos

Adjuntar evidencia histórica usa una acción separada; no acredita un recorrido E2E.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/historicas/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError({'modalidad': ['La modalidad seleccionada todavía no tiene soporte académico completo configurado.']})` — [PostulacionViewSet.historicas](../../../../apps/postulantes/views.py); línea 247; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.historicas](../../../../apps/postulantes/views.py); línea 259; método citado.
- `ValueError('Se requieren datos para crear la postulación histórica.')` — [PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py); línea 132; método citado.
- `ValidationError('Solo un usuario administrativo puede crear postulaciones históricas.')` — [PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py); línea 143; método citado.
- `ValidationError('Faltan datos obligatorios para crear la postulación histórica.')` — [PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py); línea 145; método citado.
- `ValidationError('No existe el estado final CONCLUIDA.')` — [PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py); línea 151; método citado.
- `ValidationError('El estudiante ya tiene una postulación vigente.')` — [PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py); línea 166; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Registro histórico guardado. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-111: El registro histórico usa serializer y servicio propios, sin equipararse a seguimiento ejecutado.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.historicas](../../../../apps/postulantes/views.py); colaboración: [PostulacionService.crear_postulacion_historica](../../../../apps/postulantes/services.py).
- Entidades: ENT-POS-004, ENT-ACA-002, ENT-USR-002 (Postulacion, Modalidad, CustomUser). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_us007.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-011.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-011-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-011-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-011-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-011-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
