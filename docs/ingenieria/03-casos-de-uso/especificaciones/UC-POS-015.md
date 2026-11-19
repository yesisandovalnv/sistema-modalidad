# UC-POS-015 — Registrar evidencia de revisión previa

## Identidad y estado

- Identificador: UC-POS-015.
- Objetivo: Informe/evidencia registrados.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar evidencia de revisión previa mediante `POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/; POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/{informe_id}/actualizar-evidencia/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Revisión previa soportada y referencias válidas. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar informe o evidencia nueva.
2. Exigir administración y resolver seguimiento.
3. Ejecutar registrar_informe o actualizar_evidencia.
4. Devolver informe serializado.

## Flujos alternativos

GET permite consultar informes relacionados; actualizar evidencia no crea otra etapa.

## Excepciones

Ámbito: `POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/; POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/{informe_id}/actualizar-evidencia/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede registrar el informe.')` — [SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py); línea 872; método citado.
- `_assignment_validation_error(exc)` — [SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py); línea 882; método citado.
- `ValidationError('La modalidad no tiene revisión previa de tribunal configurada.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 21; colaborador agrupado; verificar variante.
- `ValidationError('El seguimiento de revisión previa no está activo.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 29; colaborador agrupado; verificar variante.
- `ValidationError('La revisión previa debe estar EN_PROCESO u OBSERVADA.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 34; colaborador agrupado; verificar variante.
- `ValidationError('Se requiere un Documento Final activo, aprobado, sin correcciones y con versión actual activa.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 59; colaborador agrupado; verificar variante.
- `ValidationError({'version_documento_revisada': ['La versión revisada debe ser la versión actual activa del Documento Final.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 73; colaborador agrupado; verificar variante.
- `ValidationError({'evidencia_version': ['La evidencia debe ser una versión actual, activa y disponible del Informe de Evaluación del Tribunal.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 95; colaborador agrupado; verificar variante.
- `ValidationError('Se requiere un usuario administrativo activo para registrar el informe.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 110; colaborador agrupado; verificar variante.
- `ValidationError({'observaciones': ['Las observaciones son obligatorias para un resultado INSUFICIENTE.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 146; colaborador agrupado; verificar variante.
- `ValidationError({'resultado': ['El resultado debe ser SUFICIENTE o INSUFICIENTE.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 148; colaborador agrupado; verificar variante.
- `ValidationError({'non_field_errors': ['Ya existe un informe activo para esta etapa y versión del Documento Final.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 153; colaborador agrupado; verificar variante.
- `ValidationError('No existe un informe activo para la versión actual del Documento Final.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 259; colaborador agrupado; verificar variante.
- `ValidationError('El informe de la versión actual declara el trabajo INSUFICIENTE.')` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 262; colaborador agrupado; verificar variante.
- `ValidationError({'non_field_errors': ['Ya existe un informe activo para esta etapa y versión del Documento Final.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 166; colaborador agrupado; verificar variante.
- `ValidationError({'informe': ['No existe un informe activo para actualizar en esta etapa.']})` — [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py); línea 211; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Informe/evidencia registrados. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-115: El informe y la sustitución de evidencia validan revisión y contexto habilitados.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py); colaboración: [RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Entidades: ENT-POS-016, ENT-DOC-004, ENT-POS-005 (InformeRevisionTribunalPrevia, VersionDocumento, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_revision_tribunal.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-015.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-015-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-015-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-015-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-015-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-015-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-015-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E006 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E007 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E008 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E009 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E010 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E011 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E012 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E013 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E014 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E015 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-015-E016 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
