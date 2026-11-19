# UC-ACA-003 — Administrar periodos

## Identidad y estado

- Identificador: UC-ACA-003.
- Objetivo: Periodo gestionado conforme al modelo.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar periodos mediante `POST /api/v1/academico/periodos/; PUT/PATCH/DELETE /api/v1/academico/periodos/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar operación y datos.
2. Aplicar IsStaffOrReadOnly.
3. Validar el serializer, sin presumir llamada automática a model.clean.
4. Persistir y devolver recurso.

## Flujos alternativos

GET permite lectura autenticada. Las referencias pueden impedir eliminación.

## Excepciones

Ámbito: `POST /api/v1/academico/periodos/; PUT/PATCH/DELETE /api/v1/academico/periodos/{id}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `serializers.ValidationError({'fecha_fin': 'La fecha de fin debe ser posterior a la fecha de inicio.'})` — [PeriodoSerializer.validate](../../../../apps/academico/serializers.py); línea 24; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Periodo gestionado conforme al modelo. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-ACA-103: La escritura exige administración; PeriodoSerializer compara fechas cuando ambas se reciben, y el modelo declara unicidad de gestión/semestre.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PeriodoViewSet](../../../../apps/academico/views.py); colaboración: [PeriodoSerializer.validate](../../../../apps/academico/serializers.py).
- Entidades: ENT-ACA-001 (Periodo). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/academico/tests.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-ACA-003.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-ACA-003-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-003-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-003-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-003-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
