# UC-POS-023 — Verificar condiciones complementarias

## Identidad y estado

- Identificador: UC-POS-023.
- Objetivo: Condición registrada o verificada.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Verificar condiciones complementarias mediante `POST /api/v1/gestion-complementaria/condiciones/; POST /api/v1/gestion-complementaria/condiciones/{id}/verificar&#124;rechazar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Postulación editable y condición admitida. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar condición o selección.
2. Exigir administración y validar payload.
3. Aplicar CondicionService.
4. Devolver condición o lote.

## Flujos alternativos

verificar-multiples usa payload propio; condición administrativa no equivale a archivo.

## Excepciones

Ámbito: `POST /api/v1/gestion-complementaria/condiciones/; POST /api/v1/gestion-complementaria/condiciones/{id}/verificar&#124;rechazar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('La condición ya fue verificada.')` — [CondicionService](../../../../apps/postulantes/complementarios.py); línea 31; colaborador agrupado; verificar variante.
- `ValidationError('Selecciona al menos una condición para verificar.')` — [CondicionService](../../../../apps/postulantes/complementarios.py); línea 40; colaborador agrupado; verificar variante.
- `ValidationError('La selección contiene condiciones duplicadas.')` — [CondicionService](../../../../apps/postulantes/complementarios.py); línea 42; colaborador agrupado; verificar variante.
- `ValidationError('Una o más condiciones no pertenecen a la postulación o ya no están disponibles.')` — [CondicionService](../../../../apps/postulantes/complementarios.py); línea 52; colaborador agrupado; verificar variante.
- `ValidationError('Solo se pueden verificar condiciones pendientes.')` — [CondicionService](../../../../apps/postulantes/complementarios.py); línea 54; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Condición registrada o verificada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-123: Verificar o rechazar condiciones requiere administración y postulación operable.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [CondicionViewSet](../../../../apps/postulantes/complementarios_api.py); colaboración: [CondicionService](../../../../apps/postulantes/complementarios.py).
- Entidades: ENT-POS-010, ENT-POS-004 (CondicionPostulacion, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_complementarios.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-023.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-023-P01 | PRINCIPAL | COBERTURA PARCIAL |
| ESC-POS-023-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-023-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-023-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-023-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-023-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-023-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-023-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-023-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-POS-023-V02 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-POS-023-V03 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-POS-023-V04 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
