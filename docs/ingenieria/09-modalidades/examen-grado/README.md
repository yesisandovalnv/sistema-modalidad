# Examen de Grado

Estado: IMPLEMENTADO en código; pruebas NO EJECUTADAS y vigencia normativa no certificada.

- Ámbito: EG; código: EXAMEN_GRADO.
- Componente: CMP-EG-001.
- Política: [ExamenGradoPolicy](../../../../apps/modalidades/examen_grado.py).
- Pruebas: [apps/modalidades/tests_examen_grado.py](../../../../apps/modalidades/tests_examen_grado.py).
- Consumidor frontend: [src/pages/postulantes/ExamenGradoAreas.jsx](../../../../src/pages/postulantes/ExamenGradoAreas.jsx).

## Etapas declaradas

| Orden | Código | Nombre |
| --- | --- | --- |
| 1 | INSCRIPCION | Inscripción |
| 2 | PREPARACION_EXAMEN | Preparación y habilitación |
| 3 | AREA_1 | Área 1: Ciencias Básicas y Matemáticas |
| 4 | AREA_2 | Área 2: Ciencias Sociales y Humanísticas |
| 5 | AREA_3 | Área 3: Ciencias de la Ingeniería |
| 6 | AREA_4 | Área 4: Ingeniería Aplicada |
| 7 | DOCUMENTACION_FINAL | Documentación final |
| 8 | CONCLUSION_ACADEMICA | Conclusión académica |

## Particularidades y límites

Cuatro áreas con pesos declarados 15/15/30/40. No explicar sus evaluaciones mediante defensas de Proyecto.

Orden extraído de STAGE_DATA. No representa todas las guardas, reintentos y automatismos. Contrastarlo con servicios y configuración persistida.

## Antecedente de planificación (fase 2)

Mantener reglas de EG en su paquete y referenciar conceptos comunes por ID. No copiar umbrales, quórum, actores o documentos desde otra modalidad. En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.

## Paquete dinámico de fase 5

[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.
