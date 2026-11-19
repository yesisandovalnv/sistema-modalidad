# UC-POS-026 — Recepcionar entrega física

## Identidad y estado

- Identificador: UC-POS-026.
- Objetivo: Recepción o cantidad actualizada.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Recepcionar entrega física mediante `POST /api/v1/gestion-complementaria/entregas-fisicas/; POST /api/v1/gestion-complementaria/entregas-fisicas/{id}/registrar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Postulación editable y entrega admitida por política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar tipo o cantidades recibidas.
2. Exigir administración y validar payload.
3. Aplicar servicio de entregas.
4. Devolver estado de recepción.

## Flujos alternativos

registrar-multiples recibe un lote; actualizar-cantidad reutiliza registrar.

## Excepciones

Ámbito: `POST /api/v1/gestion-complementaria/entregas-fisicas/; POST /api/v1/gestion-complementaria/entregas-fisicas/{id}/registrar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('La cantidad recibida debe ser mayor que cero.')` — [EntregaFisicaService](../../../../apps/postulantes/complementarios.py); línea 86; colaborador agrupado; verificar variante.
- `ValidationError('Selecciona al menos una entrega para registrar.')` — [EntregaFisicaService](../../../../apps/postulantes/complementarios.py); línea 103; colaborador agrupado; verificar variante.
- `ValidationError('La selección contiene entregas duplicadas.')` — [EntregaFisicaService](../../../../apps/postulantes/complementarios.py); línea 107; colaborador agrupado; verificar variante.
- `ValidationError('Una o más entregas no pertenecen a la postulación o ya no están disponibles.')` — [EntregaFisicaService](../../../../apps/postulantes/complementarios.py); línea 118; colaborador agrupado; verificar variante.
- `ValidationError('Solo se pueden registrar entregas pendientes.')` — [EntregaFisicaService](../../../../apps/postulantes/complementarios.py); línea 122; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Recepción o cantidad actualizada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-126: La recepción registra cantidades y responsable; no certifica una cantidad normativa universal.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EntregaFisicaViewSet](../../../../apps/postulantes/complementarios_api.py); colaboración: [EntregaFisicaService](../../../../apps/postulantes/complementarios.py).
- Entidades: ENT-POS-011, ENT-POS-004 (EntregaFisica, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_complementarios.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-026.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-026-P01 | PRINCIPAL | COBERTURA PARCIAL |
| ESC-POS-026-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-026-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-026-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-026-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-026-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-026-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-026-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-026-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-POS-026-V02 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-POS-026-V03 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
