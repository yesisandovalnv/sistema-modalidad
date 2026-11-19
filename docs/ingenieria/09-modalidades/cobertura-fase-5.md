# Cobertura dinámica por modalidad

Infraestructura común y reglas académicas separadas. Las seis políticas operan sobre etapas persistidas cuya configuración instalada no se consulta. El recorrido nominal no obliga al backend a ejecutar todas las etapas en una sola llamada.

| Modalidad | Vistas propias | Particularidad y límite |
| --- | --- | --- |
| Proyecto de Grado | [DIA-PG-060](../diagramas/fichas/fase-5/DIA-PG-060.md); [DIA-PG-070](../diagramas/fichas/fase-5/DIA-PG-070.md) | PG_LEGACY y PG_HITOS_V1 se conservan. PROPUESTA_APROBADA es hito/decisión del régimen correspondiente, no nueva etapa. Memorandos congelan composición y evidencia; su vigencia se calcula. Evaluación admite BRUTA_100 y lectura LEGACY_PONDERADA; no volver a ponderar aportes históricos. |
| Tesis de Grado | [DIA-TG-060](../diagramas/fichas/fase-5/DIA-TG-060.md) | Temática y perfil son actos distintos. Dictámenes Tutor/Tribunal se registran con administración y evidencias propias. Evaluación admite consenso o individual bajo su policy y escalas BRUTA_100/MODALIDAD_ESPECIFICA; no aplicar semántica legacy de Proyecto. |
| Trabajo Dirigido | [DIA-TD-060](../diagramas/fichas/fase-5/DIA-TD-060.md) | Institución interna/externa, convenio cuando corresponde y supervisor descrito no equivalen a actor API externo. Informes institucionales se registran por servicio propio. Importa políticas base de Proyecto pero no se generalizan sus reglas. |
| Examen de Grado | [DIA-EG-080](../diagramas/fichas/fase-5/DIA-EG-080.md); [DIA-EG-060](../diagramas/fichas/fase-5/DIA-EG-060.md) | Cuatro áreas con pesos de AREA_DATA, consenso o tres notas individuales. Mínimo 61 por área. Primer insuficiente: POSTERGADA, intento 2 y plazo de 15 días; segundo insuficiente: REPROBADA. No son defensas 30/70 de Proyecto. |
| Excelencia Académica | [DIA-EA-080](../diagramas/fichas/fase-5/DIA-EA-080.md); [DIA-EA-060](../diagramas/fichas/fase-5/DIA-EA-060.md) | Criterio inmutable después de seleccionado. RENDIMIENTO_ACADEMICO requiere promedio documentado >=80; RECONOCIMIENTO_CALIDAD no admite nota numérica. FAVORABLE aprueba EVALUACION_TRIBUNAL; DESFAVORABLE no rechaza automáticamente esa etapa. |
| Vía Diplomado | [DIA-DIP-080](../diagramas/fichas/fase-5/DIA-DIP-080.md); [DIA-DIP-060](../diagramas/fichas/fase-5/DIA-DIP-060.md) | Cinco módulos; quinto Taller de Investigación. Nota >65 aprueba módulo; guardar módulo no aprueba automáticamente su seguimiento. Defensa y reintento se rigen por Diplomado. Overview puede inicializar módulos auxiliares. |

## Dependencias y variantes

Trabajo Dirigido importa comportamiento base de Proyecto en sus políticas de eventos/evaluación/revisión previa; la importación no demuestra equivalencia de reglas. Proyecto conserva regímenes PG_LEGACY/PG_HITOS_V1 y semánticas de notas históricas; Tesis mantiene sus propias entradas y consolidación. No se alteran esas dependencias ni se normalizan escalas en esta fase.

[Procesos comunes y cobertura de los 75 UC](../10-trazabilidad-y-validacion/matriz-fase-5.md). Las modalidades reutilizan los servicios comunes solo donde sus políticas los habilitan; no se considera que cada operación del motor aplique a todas por defecto.
