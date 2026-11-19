# UC-DIP-001 — Registrar el resultado de un módulo de Diplomado

## Identidad y estado

- Identificador: UC-DIP-001.
- Objetivo: Resultado del DiplomadoModulo guardado (nota, estado y datos de registro). set_module_result no aprueba ni actualiza SeguimientoEtapa; el seguimiento requiere su operación independiente.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar el resultado de un módulo de Diplomado mediante `POST /api/v1/postulaciones/{id}/diplomado/modulo/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

GRADUACION_VIA_DIPLOMADO y etapa/módulo habilitados. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar número de módulo, nota y observaciones.
2. Exigir administración y resolver Diplomado.
3. Aplicar validaciones y registrar el resultado mediante el servicio.
4. Devolver orden, estado y nota del módulo.

## Flujos alternativos

Una nota reprobatoria conserva el resultado correspondiente. La defensa pública no sustituye los cinco módulos.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/diplomado/modulo/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede operar Diplomado.')` — [DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); línea 32; método citado.
- `ValidationError('La operación de Diplomado no existe.')` — [DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); línea 41; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); línea 43; método citado.
- `ValidationError({'modulo': 'El Diplomado tiene como máximo cinco módulos.'})` — [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py); línea 47; método citado.
- `ValidationError({'modulo': 'No existe una etapa académica de módulo en curso.'})` — [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py); línea 53; método citado.
- `ValidationError({'modulo': 'La etapa actual no admite registrar resultados de módulo.'})` — [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py); línea 56; método citado.
- `ValidationError({'modulo': 'Solo puede registrar el resultado del módulo correspondiente a la etapa actual.'})` — [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py); línea 58; método citado.
- `ValidationError({'modulo': 'El módulo es obligatorio.'})` — [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py); línea 45; método citado.
- `ValidationError({'nota': 'La nota debe ser un número entre 0 y 100.'})` — [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py); línea 64; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Resultado del DiplomadoModulo guardado (nota, estado y datos de registro). set_module_result no aprueba ni actualiza SeguimientoEtapa; el seguimiento requiere su operación independiente. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DIP-101: El módulo y su etapa deben ser operables; el quinto módulo corresponde al Taller de Investigación.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); colaboración: [DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Entidades: ENT-MOD-004, ENT-POS-005 (DiplomadoModulo, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_diplomado.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [DiplomadoTest.test_crea_exactamente_cinco_modulos_y_no_permite_sexto](../../../../apps/modalidades/tests_diplomado.py) (L559); llamada a `DiplomadoService.set_module_result`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DiplomadoTest.test_nota_65_reprobar_y_bloquea_aprobacion](../../../../apps/modalidades/tests_diplomado.py) (L573); llamada a `DiplomadoService.set_module_result`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DiplomadoTest.test_notas_66_y_100_aprueban_modulo](../../../../apps/modalidades/tests_diplomado.py) (L581); llamada a `DiplomadoService.set_module_result`; no acredita escenario de excepción.
- [DiplomadoTest.test_nota_fuera_de_rango_es_rechazada](../../../../apps/modalidades/tests_diplomado.py) (L594); llamada a `DiplomadoService.set_module_result`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DiplomadoTest.test_no_permite_registrar_modulo_futuro](../../../../apps/modalidades/tests_diplomado.py) (L600); llamada a `DiplomadoService.set_module_result`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DiplomadoTest.test_no_permite_registrar_modulo_de_etapa_cerrada](../../../../apps/modalidades/tests_diplomado.py) (L606); llamada a `DiplomadoService.set_module_result`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DiplomadoTest.test_taller_corresponde_al_quinto_modulo](../../../../apps/modalidades/tests_diplomado.py) (L615); llamada a `DiplomadoService.set_module_result`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [DiplomadoTest.test_orientacion_modulo_pendiente_aprobado_y_reprobado](../../../../apps/modalidades/tests_diplomado.py) (L624); llamada a `DiplomadoService.set_module_result`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DIP-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DIP-001-P01 | PRINCIPAL | COBERTURA PARCIAL |
| ESC-DIP-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-DIP-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-E004 | EXCEPCIONAL DECLARADO | VERIFICADO DOCUMENTALMENTE |
| ESC-DIP-001-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-E007 | EXCEPCIONAL DECLARADO | VERIFICADO DOCUMENTALMENTE |
| ESC-DIP-001-E008 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-E009 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-001-V03 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
| ESC-DIP-001-V04 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
