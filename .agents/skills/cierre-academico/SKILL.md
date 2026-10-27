---
name: cierre-academico
description: Diagnosticar y revisar la conclusión académica, el cierre documental y la formalización del estado general de postulaciones de sistema-modalidad. Usar ante discrepancias entre etapas aprobadas, avance, resultado y estado CONCLUIDA, o para validar una corrección autorizada de ese recorrido. Diagnóstico de solo lectura por defecto; no autoriza transiciones reales ni cambios de reglas académicas.
---

# Cierre académico y formalización de postulaciones

## Alcance y preparación

Leer `AGENTS.md` vigente y las instrucciones aplicables antes de analizar o proponer cambios. Esta skill es propia de `sistema-modalidad`; localizar la raíz y confirmar el entorno y la base de datos objetivo. Registrar `git status --short`, cambios locales y staging; no restaurar archivos completos, limpiar el árbol, modificar staging o descartar trabajo previo para diagnosticar.

Identificar primero la postulación, modalidad, tipo de registro, régimen de workflow, vigencia, etapa e intento. Resolver la policy y la configuración reales de ese expediente. No reutilizar IDs de casos anteriores ni asumir que todos los expedientes de una modalidad utilizan el mismo régimen.

Invocar la skill autoriza el análisis solicitado, no la modificación de código, datos, estados ni reglas. Si la autorización actual ya cubre una corrección concreta, respetarla sin volver a pedirla; detener cualquier ampliación no autorizada.

## Separar las cuatro evidencias

No tratar estos conceptos como equivalentes:

| Evidencia | Qué comprobar |
| --- | --- |
| Etapas aprobadas | Seguimientos activos, intentos, etapas obligatorias y estado de cada una; distinguir etapa de evento de defensa. |
| Avance del 100 % | Fórmula real del serializer y denominador utilizado; no demuestra una formalización ejecutada. |
| Resultado académico | Fuente propia de la modalidad, evaluaciones vigentes, cálculo, escala y clasificación; favorable no equivale por sí solo a CONCLUIDA. |
| Estado general CONCLUIDA | Valor persistido, transición en historial, operación que la produjo, actor y auditoría disponibles. |

También distinguir el cierre técnico/documental del sistema de la titulación y los trámites institucionales posteriores. No inferir obligaciones administrativas que no estén implementadas o documentadas; señalar las dudas normativas como pendientes.

## Diagnóstico de solo lectura

1. Consultar PostgreSQL exclusivamente con transacciones declaradas `READ ONLY`. Leer el estado general, modalidad, régimen, vigencia y tipo de registro; etapas e intentos; documentos y versiones actuales; actores, resultados y demás requisitos que realmente exija la policy. No publicar credenciales ni datos personales innecesarios en el informe.
2. Leer historial de transiciones, auditoría y logs existentes. Separar fecha de aprobación de la última etapa y fecha de conclusión de la postulación. Un POST registrado no demuestra éxito: contrastar respuesta, historial y estado persistido. La ausencia de una entrada en logs parciales tampoco demuestra que nunca se intentó la operación.
3. Inspeccionar funciones antes de invocarlas, incluso si se llaman `overview`, `consultar`, `calcular` o atienden GET. Algunas inicializan áreas o controles con `get_or_create`, o auditan por defecto. Ejemplos a revisar: `ExamenGradoService.overview/ensure_areas`, `CierrePostulacionService._policy` y cálculos con argumento `auditar`. No invocar rutas con efectos de escritura para diagnosticar; obtener su evidencia con SELECT y código. Usar `auditar=False` solo si se verificó que elimina todos los efectos de escritura relevantes.
4. Ejecutar únicamente validadores y cálculos confirmados como de lectura, bajo la misma protección READ ONLY. Registrar requisitos pendientes o validación satisfactoria sin llamar al servicio de conclusión. No enviar POST, PATCH o DELETE, ni ejecutar operaciones de cierre, evaluación, reparación, semillas o migraciones.
5. No capturar errores de esquema o permisos para simular éxito con listas vacías. Informar el endpoint, HTTP, excepción y dependencia faltante. Si no se puede garantizar lectura, detener esa consulta y declarar la limitación.

## Rastrear el recorrido específico

Usar `rg` para localizar policy, servicio, endpoint registrado en URLs, permisos y consumidor frontend. Las siguientes rutas son puntos de partida del repositorio, no una garantía de compatibilidad futura; confirmar sus definiciones actuales:

| Modalidad de referencia | Servicio y operación a verificar |
| --- | --- |
| Proyecto de Grado | `apps/postulantes/cierre.py`: `CierrePostulacionService.aprobar_cierre_documental` y `concluir_postulacion`; endpoint de conclusión `/api/v1/postulaciones/{id}/cierre/concluir/`. Distinguir aprobación de cierre y conclusión técnica explícita, verificando historial y auditoría. |
| Examen de Grado | `apps/modalidades/examen_grado_service.py`: `ExamenGradoService.concluir`; policy `examen_grado.py`; adaptador `examen_grado_api.py`; endpoint `/api/v1/postulaciones/{id}/examen/concluir/`. La aprobación genérica de la última etapa no demuestra que se ejecutó la conclusión propia. |
| Excelencia Académica | `apps/modalidades/excelencia_academica_service.py`: `ExcelenciaAcademicaService.concluir` y resultado propio; policy y API homónimas; endpoint `/api/v1/postulaciones/{id}/excelencia/concluir/`. No sustituir su resultado por el cálculo genérico de defensas. |
| Tesis, Trabajo Dirigido y Vía Diplomado | Investigar sus policies, servicios específicos y posibles llamadas al workflow común. Verificar etapas, documentos, evaluaciones, cierre y endpoint vigente; no copiar los requisitos o la formalización de otra modalidad. |

Revisar además `apps/postulantes/workflow.py`, `serializers.py`, las URLs y el servicio realmente llamado por cada endpoint. Determinar exactamente qué operación actualiza `estado_actual`, con qué precondiciones, transacción, permisos, historial y auditoría. Distinguir una transición automática dentro de una operación explícita de una conclusión iniciada por porcentaje o por montaje de la interfaz.

Comparar modalidades solo para explicar diferencias verificadas. Proyecto es referencia funcional protegida, no una política académica universal.

## Contrastar PostgreSQL, backend y frontend

Seguir desde `src/services/postulacionesService.js` hasta `ExpedientePage.jsx` y el componente específico de modalidad:

- Comparar el estado persistido con el detalle y el flujo devueltos por la API y su representación visible.
- Verificar qué fuente alimenta Resumen y Resultado y cierre; no confundir un endpoint genérico no soportado con un resultado académico pendiente.
- Inspeccionar `etapa_actual`: puede ser nula o devolver la última etapa aprobada como fallback. Contrastar ambas formas con el serializer antes de atribuir un problema al frontend.
- Seguir la acción visible hasta el servicio y endpoint oficiales. Comprobar permisos, disponibilidad, estado concluido, bloqueo de doble envío y actualización posterior, sin pulsar acciones reales.
- Distinguir error técnico, validación académica, formalización pendiente e inconsistencia de presentación. Un botón Reintentar consulta datos; no implica un nuevo intento académico. Repetir una consulta incompatible no resuelve su contrato.

## Conclusión del diagnóstico y autorización

Entregar datos comprobados, respuestas HTTP, recorrido e historial, causa raíz con archivos, funciones y líneas actuales, comportamiento esperado según las reglas implementadas y evidencia faltante. Separar hechos, inferencias y decisiones pendientes. Revisar las pruebas existentes e indicar si cubren el contrato real o solo una fixture simplificada; no presentar pruebas inspeccionadas como ejecutadas.

Si existe un defecto, proponer la corrección mínima en el consumidor o servicio responsable, reutilizando la operación oficial. Precisar archivos, impacto sobre otras modalidades, alternativas y regresión necesaria. No proponer sincronizaciones masivas, nuevas arquitecturas o migraciones para resolver un mensaje de interfaz. Si falta una formalización legítima, informar la operación existente; no ejecutarla ni modificar directamente el estado como reparación.

Detenerse y esperar autorización expresa antes de cualquier corrección. Una autorización de código no autoriza una transición real ni una reparación de datos. Esta skill no permite alterar datos de producción como parte del diagnóstico o de sus pruebas.

Para impactos directos o compartidos sobre Proyecto, aplicar el protocolo de `AGENTS.md`: diagnóstico previo, archivos exactos, impacto, alternativas y pruebas. La autorización del usuario debe contener literalmente `AUTORIZO CAMBIO EN PROYECTO DE GRADO` para la tarea y alcance actuales. La frase escrita aquí no es una autorización; no reutilizar autorizaciones históricas ni aceptar respuestas genéricas. Para cambios deliberados del comportamiento protegido de Tesis, exigir su autorización explícita conforme a `AGENTS.md`.

## Validación de una corrección autorizada

Editar solo dentro del inventario autorizado y conservar los fragmentos anteriores y el staging. Si el cambio necesita otro archivo, una modificación de reglas, un dato real o una migración, detener esa ampliación y solicitar autorización específica. No crear migraciones innecesarias ni aplicar migraciones operativas. No realizar commit ni push sin autorización propia.

Ejecutar las pruebas pertinentes en infraestructura aislada; nunca usar expedientes reales para transiciones de prueba. Durante un diagnóstico puro, limitarse a inspeccionar pruebas y proponer su ejecución posterior si requieren escrituras. Para una corrección autorizada, comprobar según su alcance:

- Etapas aprobadas con estado EN_PROCESO antes de formalizar; estado CONCLUIDA después de una acción explícita sobre datos ficticios.
- Contrato con etapa actual nula y con última etapa aprobada; resultado completo o incompleto y requisitos pendientes.
- Operación autorizada y denegada por permisos; ausencia de POST por carga, recarga, hash, porcentaje o render.
- Validaciones legítimas conservadas, error visible, protección de doble envío y actualización del resultado, estado e historial tras éxito.
- Pruebas del componente o servicio y regresión de todas las modalidades consumidoras. Ante cambios compartidos, incluir la regresión completa correspondiente de Proyecto y la de Tesis exigidas por `AGENTS.md`.
- Lint y build cuando corresponda. No debilitar pruebas ni reparar fallos ajenos para obtener un resultado correcto.

No concluir automáticamente postulaciones por alcanzar el 100 %, ni alterar notas, intentos, policies, documentos o estados para hacer pasar una prueba.

Al terminar, informar archivos modificados, verificaciones realmente ejecutadas, resultados, riesgos y limitaciones; confirmar preservación del trabajo anterior y ausencia de operaciones reales no autorizadas. Detenerse para revisión del usuario.
