# Trazabilidad por escenario y aserción — fase 7.1

75 especificaciones revisadas. Las relaciones positivas son curadas por estímulo, guarda y aserción; no por nombre de archivo ni familia. No se ejecutó ninguna prueba. La ausencia de vínculo significa SIN PRUEBA IDENTIFICADA en esta revisión, no inexistencia demostrada de pruebas.

## Criterios

- VERIFICADO DOCUMENTALMENTE: aserción pertinente a todo el comportamiento acotado del escenario, sin ejecución.
- COBERTURA PARCIAL: la aserción comprueba solo una parte; el límite consta en la fila.
- SIN PRUEBA IDENTIFICADA: escenario identificable sin vínculo de aserción demostrado.
- NO VERIFICABLE: correspondencia de operación/variante insuficiente, enunciado contextual o validación agrupada.

P01 conserva el flujo principal completo; A individualiza los enunciados alternativos por límites de oración/cláusula; E individualiza cada raise declarado sin convertirlo en rechazo universal; V precisa un estímulo y resultado que ya existen en el objetivo o su implementación. Un mismo método puede comprobar varias situaciones: las unidades contadas son escenarios, no pruebas independientes. Los candidatos E de clases agrupadas no se presentan como recorridos implementados del UC sin contraste. RN conserva el identificador contextual del objetivo; no se inventan reglas de permiso ni reglas académicas.

## Resultados

- VERIFICADO DOCUMENTALMENTE: 28.
- COBERTURA PARCIAL: 5.
- SIN PRUEBA IDENTIFICADA: 381.
- NO VERIFICABLE: 97.

| Caso | Matriz y aserciones | Escenarios | Directos | Parciales | Sin prueba identificada | No verificables |
| --- | --- | --- | --- | --- | --- | --- |
| UC-USR-001 | [Iniciar sesión con usuario y contraseña](escenarios-fase-7-1/UC-USR-001.md) | 5 | 0 | 0 | 3 | 2 |
| UC-USR-002 | [Administrar cuentas de usuario](escenarios-fase-7-1/UC-USR-002.md) | 9 | 0 | 0 | 3 | 6 |
| UC-ACA-001 | [Actualizar una modalidad existente](escenarios-fase-7-1/UC-ACA-001.md) | 10 | 0 | 0 | 3 | 7 |
| UC-ACA-002 | [Publicar o sustituir un documento oficial de modalidad](escenarios-fase-7-1/UC-ACA-002.md) | 8 | 0 | 0 | 3 | 5 |
| UC-POS-001 | [Registrar una postulación con seguimiento](escenarios-fase-7-1/UC-POS-001.md) | 13 | 0 | 0 | 13 | 0 |
| UC-POS-002 | [Consultar postulaciones y expediente](escenarios-fase-7-1/UC-POS-002.md) | 4 | 0 | 0 | 4 | 0 |
| UC-POS-003 | [Ejecutar una transición de etapa](escenarios-fase-7-1/UC-POS-003.md) | 6 | 1 | 0 | 4 | 1 |
| UC-POS-004 | [Asignar un actor académico](escenarios-fase-7-1/UC-POS-004.md) | 6 | 1 | 0 | 4 | 1 |
| UC-POS-005 | [Registrar una decisión académica de etapa](escenarios-fase-7-1/UC-POS-005.md) | 11 | 0 | 0 | 11 | 0 |
| UC-PG-001 | [Publicar memorando de designación de Proyecto](escenarios-fase-7-1/UC-PG-001.md) | 10 | 0 | 0 | 9 | 1 |
| UC-DOC-001 | [Cargar un documento o una nueva versión](escenarios-fase-7-1/UC-DOC-001.md) | 18 | 0 | 0 | 17 | 1 |
| UC-DOC-002 | [Revisar un documento presentado](escenarios-fase-7-1/UC-DOC-002.md) | 6 | 0 | 0 | 6 | 0 |
| UC-POS-006 | [Administrar el ciclo de una defensa](escenarios-fase-7-1/UC-POS-006.md) | 12 | 1 | 0 | 10 | 1 |
| UC-POS-007 | [Consolidar la evaluación de una defensa](escenarios-fase-7-1/UC-POS-007.md) | 7 | 1 | 0 | 5 | 1 |
| UC-PG-002 | [Operar el cierre técnico de Proyecto](escenarios-fase-7-1/UC-PG-002.md) | 13 | 3 | 1 | 2 | 7 |
| UC-POS-008 | [Concluir académicamente por el motor común](escenarios-fase-7-1/UC-POS-008.md) | 5 | 0 | 0 | 5 | 0 |
| UC-NOT-001 | [Consultar notificaciones propias](escenarios-fase-7-1/UC-NOT-001.md) | 4 | 0 | 0 | 3 | 1 |
| UC-REP-001 | [Consultar resultados académicos institucionales](escenarios-fase-7-1/UC-REP-001.md) | 3 | 0 | 0 | 3 | 0 |
| UC-TG-001 | [Concluir Tesis con acta y defensa válidas](escenarios-fase-7-1/UC-TG-001.md) | 8 | 0 | 0 | 7 | 1 |
| UC-TD-001 | [Configurar institución de Trabajo Dirigido](escenarios-fase-7-1/UC-TD-001.md) | 6 | 0 | 0 | 6 | 0 |
| UC-EG-001 | [Registrar evaluación de un área de Examen](escenarios-fase-7-1/UC-EG-001.md) | 16 | 0 | 0 | 16 | 0 |
| UC-EA-001 | [Registrar evaluación de Excelencia](escenarios-fase-7-1/UC-EA-001.md) | 15 | 2 | 0 | 13 | 0 |
| UC-DIP-001 | [Registrar el resultado de un módulo de Diplomado](escenarios-fase-7-1/UC-DIP-001.md) | 14 | 4 | 1 | 8 | 1 |
| UC-POS-028 | [Administrar estados técnicos de postulación](escenarios-fase-7-1/UC-POS-028.md) | 7 | 0 | 0 | 4 | 3 |
| UC-DOC-007 | [Consultar catálogos documentales y estados técnicos](escenarios-fase-7-1/UC-DOC-007.md) | 3 | 0 | 0 | 2 | 1 |
| UC-DOC-008 | [Administrar tipos y estados documentales](escenarios-fase-7-1/UC-DOC-008.md) | 5 | 0 | 0 | 4 | 1 |
| UC-ACA-007 | [Consultar periodos y requisitos](escenarios-fase-7-1/UC-ACA-007.md) | 3 | 0 | 0 | 2 | 1 |
| UC-USR-003 | [Renovar tokens JWT](escenarios-fase-7-1/UC-USR-003.md) | 3 | 0 | 0 | 3 | 0 |
| UC-USR-004 | [Cerrar sesión](escenarios-fase-7-1/UC-USR-004.md) | 3 | 0 | 0 | 3 | 0 |
| UC-USR-005 | [Consultar perfil y capacidades propias](escenarios-fase-7-1/UC-USR-005.md) | 2 | 0 | 0 | 1 | 1 |
| UC-USR-006 | [Administrar roles](escenarios-fase-7-1/UC-USR-006.md) | 4 | 0 | 0 | 3 | 1 |
| UC-USR-007 | [Consultar estudiantes para postulación](escenarios-fase-7-1/UC-USR-007.md) | 2 | 0 | 0 | 2 | 0 |
| UC-USR-008 | [Consultar candidatos a asignación](escenarios-fase-7-1/UC-USR-008.md) | 10 | 0 | 0 | 10 | 0 |
| UC-USR-009 | [Iniciar sesión estudiantil con R.U. y C.I.](escenarios-fase-7-1/UC-USR-009.md) | 4 | 0 | 0 | 4 | 0 |
| UC-ACA-003 | [Administrar periodos](escenarios-fase-7-1/UC-ACA-003.md) | 4 | 0 | 0 | 4 | 0 |
| UC-ACA-004 | [Administrar requisitos y relaciones de modalidad](escenarios-fase-7-1/UC-ACA-004.md) | 4 | 0 | 0 | 4 | 0 |
| UC-ACA-005 | [Consultar modalidades y capacidades](escenarios-fase-7-1/UC-ACA-005.md) | 6 | 0 | 0 | 1 | 5 |
| UC-ACA-006 | [Consultar o descargar documentos oficiales](escenarios-fase-7-1/UC-ACA-006.md) | 6 | 0 | 0 | 6 | 0 |
| UC-POS-009 | [Consultar seguimiento de etapas](escenarios-fase-7-1/UC-POS-009.md) | 3 | 0 | 0 | 3 | 0 |
| UC-POS-010 | [Consultar historial y observaciones](escenarios-fase-7-1/UC-POS-010.md) | 3 | 0 | 0 | 2 | 1 |
| UC-POS-011 | [Registrar una postulación histórica](escenarios-fase-7-1/UC-POS-011.md) | 10 | 0 | 0 | 8 | 2 |
| UC-POS-012 | [Inicializar el flujo](escenarios-fase-7-1/UC-POS-012.md) | 6 | 1 | 0 | 5 | 0 |
| UC-POS-013 | [Crear un nuevo intento de etapa](escenarios-fase-7-1/UC-POS-013.md) | 12 | 0 | 0 | 11 | 1 |
| UC-POS-014 | [Registrar dictamen documental](escenarios-fase-7-1/UC-POS-014.md) | 6 | 0 | 0 | 6 | 0 |
| UC-POS-015 | [Registrar evidencia de revisión previa](escenarios-fase-7-1/UC-POS-015.md) | 19 | 0 | 0 | 4 | 15 |
| UC-POS-016 | [Consultar asignaciones e historial de cargos](escenarios-fase-7-1/UC-POS-016.md) | 5 | 0 | 0 | 3 | 2 |
| UC-POS-017 | [Finalizar o reemplazar asignación](escenarios-fase-7-1/UC-POS-017.md) | 3 | 0 | 0 | 3 | 0 |
| UC-POS-018 | [Consultar defensas y quórum](escenarios-fase-7-1/UC-POS-018.md) | 4 | 0 | 0 | 3 | 1 |
| UC-POS-019 | [Administrar participantes de defensa](escenarios-fase-7-1/UC-POS-019.md) | 12 | 1 | 0 | 11 | 0 |
| UC-POS-020 | [Registrar asistencia de defensa](escenarios-fase-7-1/UC-POS-020.md) | 5 | 1 | 0 | 4 | 0 |
| UC-POS-021 | [Registrar evaluación de defensa](escenarios-fase-7-1/UC-POS-021.md) | 9 | 0 | 0 | 8 | 1 |
| UC-POS-022 | [Consultar o recalcular resultado final](escenarios-fase-7-1/UC-POS-022.md) | 7 | 1 | 0 | 4 | 2 |
| UC-POS-023 | [Verificar condiciones complementarias](escenarios-fase-7-1/UC-POS-023.md) | 12 | 4 | 1 | 1 | 6 |
| UC-POS-024 | [Cambiar estado general administrativamente](escenarios-fase-7-1/UC-POS-024.md) | 10 | 0 | 0 | 10 | 0 |
| UC-POS-025 | [Registrar observación de postulación](escenarios-fase-7-1/UC-POS-025.md) | 8 | 0 | 0 | 8 | 0 |
| UC-POS-026 | [Recepcionar entrega física](escenarios-fase-7-1/UC-POS-026.md) | 11 | 3 | 1 | 2 | 5 |
| UC-POS-027 | [Consultar condiciones y entregas](escenarios-fase-7-1/UC-POS-027.md) | 3 | 1 | 1 | 0 | 1 |
| UC-DOC-003 | [Consultar documentos y descargar versiones](escenarios-fase-7-1/UC-DOC-003.md) | 5 | 0 | 0 | 5 | 0 |
| UC-DOC-004 | [Marcar observación documental como corregida](escenarios-fase-7-1/UC-DOC-004.md) | 9 | 0 | 0 | 9 | 0 |
| UC-DOC-005 | [Registrar confirmación técnica entre versiones](escenarios-fase-7-1/UC-DOC-005.md) | 4 | 0 | 0 | 3 | 1 |
| UC-DOC-006 | [Adjuntar evidencia a un registro histórico](escenarios-fase-7-1/UC-DOC-006.md) | 7 | 0 | 0 | 7 | 0 |
| UC-NOT-002 | [Actualizar lectura de notificaciones propias](escenarios-fase-7-1/UC-NOT-002.md) | 3 | 0 | 0 | 2 | 1 |
| UC-REP-002 | [Consultar dashboard institucional](escenarios-fase-7-1/UC-REP-002.md) | 2 | 0 | 0 | 2 | 0 |
| UC-REP-003 | [Consultar reporte de postulaciones](escenarios-fase-7-1/UC-REP-003.md) | 3 | 0 | 0 | 3 | 0 |
| UC-REP-004 | [Exportar un reporte institucional](escenarios-fase-7-1/UC-REP-004.md) | 5 | 0 | 0 | 4 | 1 |
| UC-TD-002 | [Registrar informe institucional de Trabajo Dirigido](escenarios-fase-7-1/UC-TD-002.md) | 6 | 0 | 0 | 5 | 1 |
| UC-TD-003 | [Concluir Trabajo Dirigido](escenarios-fase-7-1/UC-TD-003.md) | 5 | 0 | 0 | 4 | 1 |
| UC-TD-004 | [Consultar expediente específico de Trabajo Dirigido](escenarios-fase-7-1/UC-TD-004.md) | 3 | 1 | 0 | 2 | 0 |
| UC-EG-002 | [Concluir Examen de Grado](escenarios-fase-7-1/UC-EG-002.md) | 5 | 0 | 0 | 4 | 1 |
| UC-EG-003 | [Consultar evaluación por áreas de Examen](escenarios-fase-7-1/UC-EG-003.md) | 5 | 0 | 0 | 4 | 1 |
| UC-EA-002 | [Configurar criterio de Excelencia](escenarios-fase-7-1/UC-EA-002.md) | 9 | 0 | 0 | 8 | 1 |
| UC-EA-003 | [Concluir Excelencia Académica](escenarios-fase-7-1/UC-EA-003.md) | 6 | 1 | 0 | 4 | 1 |
| UC-EA-004 | [Consultar expediente de Excelencia](escenarios-fase-7-1/UC-EA-004.md) | 3 | 0 | 0 | 3 | 0 |
| UC-DIP-002 | [Concluir graduación vía Diplomado](escenarios-fase-7-1/UC-DIP-002.md) | 5 | 0 | 0 | 4 | 1 |
| UC-DIP-003 | [Consultar módulos y resultado de Diplomado](escenarios-fase-7-1/UC-DIP-003.md) | 3 | 1 | 0 | 1 | 1 |

## Candidatos descartados tras contraste

- UC-TD-002: [TrabajoDirigidoTest.test_gates_de_aprobacion_de_desarrollo_siguen_exigiendo_convenio_externo L1195](../../../apps/modalidades/tests_trabajo_dirigido.py) — La excepción asertada procede de validar_aprobacion_etapa, no de registrar_informe. La llamada de registro es preparación.
- UC-EG-001: [ExamenGradoContenidosTest.test_reemplazo_antes_de_calificar_mantiene_composicion_evaluable L325](../../../apps/modalidades/tests_examen_grado.py) — La aserción composition[evaluable] precede a registrar_evaluacion; no observa su resultado.
- UC-POS-017: [AsignacionServiceTest.test_permite_rol_historico_finalizado L330](../../../apps/postulantes/tests_assignments.py) — presidente.activo observa la asignación posterior, no el resultado ni los efectos de finalizar_asignacion.
- UC-DIP-001: [DiplomadoTest.test_nota_fuera_de_rango_es_rechazada L594](../../../apps/modalidades/tests_diplomado.py) — Decimal fuera de rango se valida en el modelo al guardar. No demuestra el raise de conversión de texto a Decimal de set_module_result; no se vincula a esa excepción.

[Registro estructurado de escenarios y fragmentos de prueba](escenarios-fase-7-1.json). [Inventario de fuentes de prueba y aserciones](inventario-aserciones-fase-7-1.json). Este inventario facilita revisión; ninguna coincidencia automática concede cobertura. Las fuentes JavaScript inventariadas no se interpretaron mediante AST Python ni se ejecutaron.
