# UC-POS-021 — Registrar evaluación de defensa

## Identidad y estado

- Identificador: UC-POS-021.
- Objetivo: Evaluación guardada; consolidación separada.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar evaluación de defensa mediante `POST /api/v1/eventos-defensa/{id}/evaluaciones/{tipo}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Estado, quórum y modalidad de registro válidos. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar resultado o nota y datos de evaluación.
2. Exigir administración y validar EvaluarPayload.
3. Seleccionar registro temática/perfil/privada/pública.
4. Aplicar servicio y política y devolver evaluación.

## Flujos alternativos

Campos nota_privada/nota_publica y semantica_nota conservan su contrato; no hay escala universal.

## Excepciones

Ámbito: `POST /api/v1/eventos-defensa/{id}/evaluaciones/{tipo}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('La modalidad no soporta este tipo de evaluación.')` — [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py); línea 206; método citado.
- `ValidationError('El evento no puede evaluarse.')` — [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py); línea 207; método citado.
- `ValidationError('No se puede registrar la evaluación sin quórum técnico válido.')` — [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py); línea 208; método citado.
- `ValidationError('El evento ya tiene una evaluación registrada de este tipo.')` — [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py); línea 212; método citado.
- `ValidationError('La semántica de entrada no está habilitada para esta evaluación.')` — [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py); línea 215; método citado.
- `ValidationError('No se pueden mezclar escalas en las evaluaciones del mismo evento.')` — [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py); línea 217; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Evaluación guardada; consolidación separada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-121: Administración registra por API; evaluador atribuido, escala, consenso y semántica dependen de modalidad/tipo.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EventoDefensaViewSet.evaluar](../../../../apps/postulantes/defensas_api.py); colaboración: [EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Entidades: ENT-POS-014, ENT-POS-012, ENT-POS-013 (EvaluacionDefensa, EventoDefensa, ParticipanteEvento). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_defensas.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-021.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-021-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-021-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-021-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
