# UC-PG-002 — Operar el cierre técnico de Proyecto

## Identidad y estado

- Identificador: UC-PG-002.
- Objetivo: Cierre actualizado según la acción; solo concluir formaliza su conclusión cuando procede.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Operar el cierre técnico de Proyecto mediante `POST /api/v1/postulaciones/{id}/cierre/aprobar-revision-final&#124;aprobar-cierre-documental&#124;concluir&#124;reabrir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Disponibilidad de política de cierre y gates de Proyecto; no aplicar a Tesis por analogía. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Seleccionar acción de cierre y enviar observaciones o motivo.
2. Exigir administración y resolver postulación.
3. Validar serializer y política de cierre.
4. Ejecutar la operación de CierrePostulacionService.
5. Refrescar la postulación y devolver estado de cierre.

## Flujos alternativos

GET /cierre/ solo consulta; los faltantes y advertencias conservan el significado que les da la política, sin convertir toda advertencia en bloqueo.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/cierre/aprobar-revision-final&#124;aprobar-cierre-documental&#124;concluir&#124;reabrir/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('La modalidad no tiene política de cierre configurada.')` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 108; colaborador agrupado; verificar variante.
- `ValidationError(f'No existe seguimiento para {code}.')` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 117; colaborador agrupado; verificar variante.
- `ValidationError({'faltantes': result['faltantes'], 'advertencias': result['advertencias']})` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 136; colaborador agrupado; verificar variante.
- `ValidationError({'faltantes': result['faltantes'], 'advertencias': result['advertencias']})` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 145; colaborador agrupado; verificar variante.
- `ValidationError('El cierre documental y todas las etapas obligatorias deben estar aprobados.')` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 155; colaborador agrupado; verificar variante.
- `ValidationError('El motivo de reapertura es obligatorio.')` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 164; colaborador agrupado; verificar variante.
- `ValidationError('El cierre documental no está aprobado.')` — [CierrePostulacionService](../../../../apps/postulantes/cierre.py); línea 166; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Cierre actualizado según la acción; solo concluir formaliza su conclusión cuando procede. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-PG-102: Aprobar revisión final, aprobar cierre documental y concluir son operaciones distintas; reabrir exige motivo.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [CierreAccionView.post](../../../../apps/postulantes/cierre_api.py); colaboración: [CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Entidades: ENT-POS-004, ENT-POS-005, ENT-POS-010, ENT-POS-011 (Postulacion, SeguimientoEtapa, CondicionPostulacion, EntregaFisica). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_cierre.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-PG-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-PG-002-P01 | PRINCIPAL | COBERTURA PARCIAL |
| ESC-PG-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-002-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-PG-002-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-E006 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-E007 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-PG-002-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-PG-002-V02 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-PG-002-V03 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
