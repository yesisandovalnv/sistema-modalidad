# Modelado dinámico — fase 5

21 familias de procesos; 49 vistas dinámicas (24 actividades, 11 secuencias y 14 estados). 75 UC vinculados a su proceso, reglas, implementación, entidades y pruebas existentes. Las vistas son selectivas y modulares.

- [Análisis previo e inventario](analisis-fase-5.md).
- [Registro de fuentes, fichas y SVG](../diagramas/registro-fase-5.md).
- [Matriz dinámica UC → proceso → RN → vistas → implementación → entidad → pruebas](../10-trazabilidad-y-validacion/matriz-fase-5.md).
- [Paquetes de las seis modalidades](../09-modalidades/cobertura-fase-5.md).
- [Versión y diferencias](../00-alcance-y-evidencia/referencia-fase-5.md).
- [Validación, discrepancias y recomendaciones](../10-trazabilidad-y-validacion/validacion-fase-5.md).

No se crea una máquina de estados genérica de EvaluacionDefensa: tiene tipos/resultados, no un campo de lifecycle con transiciones universales. Sí se representan resultados/estados persistidos de ExamenArea, ExcelenciaExpediente y DiplomadoModulo con sus escritores reales. VersionDocumento se limita a su indicador de actualidad.
