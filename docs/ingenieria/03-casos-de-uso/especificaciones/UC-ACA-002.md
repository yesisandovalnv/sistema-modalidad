# UC-ACA-002 — Publicar o sustituir un documento oficial de modalidad

## Identidad y estado

- Identificador: UC-ACA-002.
- Objetivo: Documento oficial publicado o actualizado con auditoría.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Publicar o sustituir un documento oficial de modalidad mediante `POST /api/v1/academico/modalidades/{id}/documentos-oficiales/; PATCH/PUT /api/v1/academico/modalidades/{id}/documentos-oficiales/{documento_id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar archivo y nombre en el contexto de modalidad.
2. Validar payload y pertenencia si se sustituye un documento.
3. Guardar archivo y actualizado_por dentro de una transacción.
4. Auditar y programar eliminación del archivo sustituido después del commit.

## Flujos alternativos

Actualizar solo el nombre conserva el archivo; documento ajeno al contexto no se acepta.

## Excepciones

Ámbito: `POST /api/v1/academico/modalidades/{id}/documentos-oficiales/; PATCH/PUT /api/v1/academico/modalidades/{id}/documentos-oficiales/{documento_id}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `serializers.ValidationError('El documento oficial debe ser un archivo PDF.')` — [DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py); línea 66; colaborador agrupado; verificar variante.
- `serializers.ValidationError('El documento oficial no puede estar vacío.')` — [DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py); línea 68; colaborador agrupado; verificar variante.
- `serializers.ValidationError('El documento oficial no puede superar 10 MB.')` — [DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py); línea 70; colaborador agrupado; verificar variante.
- `serializers.ValidationError('El contenido del archivo no corresponde a un PDF válido.')` — [DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py); línea 74; colaborador agrupado; verificar variante.
- `serializers.ValidationError('El nombre del documento es obligatorio.')` — [DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py); línea 80; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Documento oficial publicado o actualizado con auditoría. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-ACA-102: La evidencia oficial se vincula a la modalidad y la actualización queda auditada; no es una firma digital.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ModalidadViewSet._guardar_documento_oficial](../../../../apps/academico/views.py); colaboración: [DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).
- Entidades: ENT-ACA-003, ENT-ACA-002, ENT-USR-003 (DocumentoOficialModalidad, Modalidad, AuditLog). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/academico/tests_documento_oficial_modalidad.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-ACA-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-ACA-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-002-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-ACA-002-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-002-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-002-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-002-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-ACA-002-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
