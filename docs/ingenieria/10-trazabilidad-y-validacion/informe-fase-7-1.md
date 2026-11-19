# Cierre documental de AUD-06-009 — fase 7.1

Versión: HEAD `689eeb56ac6ff26b6e6487b3fd7100b9c484ea19`, rama `desarrollo`, directorio de trabajo del 2026-11-02. [Control previo y huellas](../00-alcance-y-evidencia/estado-fase-7-1.json). Los cambios locales preexistentes se conservan. Alcance exclusivo: documentación de excepciones, escenarios y aserciones; no se modifica ni ejecuta el producto.

## Resultado

Se revisaron las **75 especificaciones**: flujo principal, enunciados alternativos y excepciones declaradas. Se individualizaron **511 entradas** de revisión, con identificadores estables por UC. Los límites contextuales y los rechazos de colaboradores agrupados se identifican como no verificables cuando no permiten atribuir un recorrido concreto; no se presentan como escenarios ejecutados ni como nuevas funcionalidades.

| Clasificación | Cantidad | Interpretación |
| --- | --- | --- |
| VERIFICADO DOCUMENTALMENTE | 28 | Prueba identificada y aserción pertinente al comportamiento acotado; sin ejecución. |
| COBERTURA PARCIAL | 5 | La aserción demuestra solo un efecto del flujo principal; el límite está explicado. |
| SIN PRUEBA IDENTIFICADA | 381 | Escenario identificable sin aserción atribuida en esta revisión. No demuestra inexistencia de pruebas. |
| NO VERIFICABLE | 97 | Correspondencia insuficiente: contexto, cláusula no operacionalizable o excepción de clase agrupada. |
| Total | 511 | Unidades documentales de revisión; no cantidad de pruebas independientes. |

La [matriz maestra](matriz-escenarios-fase-7-1.md) enlaza 75 matrices modulares, una por UC. Cada entrada relaciona **UC → escenario → RN → endpoint/servicio → método de prueba → aserción**, o registra explícitamente que esa relación no está demostrada. Los identificadores UC, RN, entidades y diagramas existentes se conservan.

## Evidencia y método

El [registro estructurado](escenarios-fase-7-1.json) incluye clasificación, justificación, ubicación de prueba y aserción, expresión exacta, fragmento completo del método y huella del archivo. La selección de vínculos positivos está en [curacion_fase71.py](../03-casos-de-uso/curacion_fase71.py); cada vínculo explica el estímulo, la procedencia del valor observado y el alcance de la aserción.

Los vínculos admitidos remiten a **71 aserciones distintas en 30 métodos de prueba**. Reutilizar una aserción en un flujo principal parcial y en un refinamiento acotado no la convierte en dos pruebas independientes.

Se inventariaron **96 fuentes de prueba** incluidas en las rutas Git del directorio de trabajo. El [inventario de aserciones](inventario-aserciones-fase-7-1.json) recoge métodos/aserciones Python y registra por separado fuentes JavaScript sin concederles cobertura por su nombre. La revisión de candidaturas usa ese inventario y los métodos previamente identificados; las asociaciones admitidas requieren contraste semántico explícito. No se afirma una búsqueda semántica exhaustiva de todos los recorridos indirectos o E2E.

Se descartaron asociaciones que parecían relacionadas por llamada o archivo:

- En Examen, la aserción de composición evaluable sucede **antes** de registrar la evaluación; no prueba su resultado.
- En Trabajo Dirigido, una excepción de aprobación de etapa no demuestra rechazo de registrar un informe.
- En asignaciones, comprobar que una designación posterior está activa no comprueba los efectos de finalizar la anterior.
- En Diplomado, rechazar un Decimal fuera de rango al guardar el modelo no demuestra el rechazo de conversión de texto a Decimal del servicio.

Los refinamientos de modalidad conservan su contexto. Las ponderaciones y semánticas de la fixture de Proyecto no se universalizan; rendimiento de Excelencia se diferencia de calidad; guardar un módulo de Diplomado no se confunde con aprobar su seguimiento. Los identificadores RN en las filas conservan la regla contextual del objetivo, mientras la guarda específica se cita en implementación; no se inventan reglas académicas ni permisos nuevos.

P01 conserva el flujo principal completo y sus límites. A individualiza los enunciados alternativos documentados; E identifica cada punto de rechazo declarado, sin atribuir alcance universal a un raise de clase agrupada; V precisa estímulos y resultados ya respaldados por implementación y pruebas. Una prueba de servicio no se presenta como prueba de autenticación ni del endpoint. Las antiguas referencias por afinidad de fase 7 se conservan como antecedentes; la clasificación por escenario de fase 7.1 prevalece para este hallazgo.

## Verificaciones

Los [resultados reproducibles](resultado-fase-7-1.json) registran los retornos de verificadores exclusivamente documentales. El verificador específico reconstruye el registro desde sus fuentes, contrasta por AST las aserciones completas dentro de los métodos citados, comprueba líneas, fragmentos y huellas, compara las 75 especificaciones y controla identificadores, enlaces e integridad. La curación semántica complementa ese control sintáctico: un AST existente por sí solo no demuestra correspondencia funcional.

Se preservan las fotografías, manifiestos e informes históricos. Las desviaciones autorizadas se encadenan mediante el [manifiesto 7.1](cambios-fase-7-1.json), sin sustituir huellas originales ni aceptar modificaciones exteriores. No se añadieron ni modificaron diagramas, modelos, políticas, configuraciones ni pruebas del producto. Los verificadores de diagramas reutilizan sus huellas y validaciones existentes; no se renderizaron diagramas en esta subfase.

Para regenerar únicamente esta documentación: `python -B docs/ingenieria/03-casos-de-uso/escenarios_fase71.py` y la función `specifications()` del constructor de fase 4 después de `validate_data()`. El control `corregir_fase7.py --check` comprueba que ese constructor no elimine las clasificaciones. No ejecutar constructores globales de fases anteriores para actualizar esta entrega.

## Estado final y límites

**AUD-06-009: CORREGIDO Y VERIFICADO, exclusivamente en su alcance documental.** Se revisaron las 75 especificaciones, se individualizaron entradas relevantes, se respaldaron las relaciones positivas con aserciones concretas y se registraron las ausencias e incertidumbres. El criterio de cierre no exige implementar pruebas para todos los escenarios. Este cierre no convierte las ausencias en cobertura ni acredita resultados de ejecución.

Persisten vacíos de cobertura identificada y correspondencias no verificables. Su resolución futura puede requerir análisis manual adicional de pruebas indirectas, fixtures, E2E y validaciones delegadas; no implica autorización para crear pruebas ni modificar reglas. Tampoco se certifican PostgreSQL instalado, normativa vigente ni comportamiento de ejecución. Para presentación universitaria, el material es utilizable como trazabilidad documental de la versión analizada, acompañado de esta matriz de vacíos; no debe presentarse como informe de pruebas aprobadas ni cobertura funcional integral.

La fase 7.1 termina con esta entrega. No autoriza funcionalidades, diagramas ni fases posteriores.
