# Excelencia Académica

Estado: IMPLEMENTADO en código; pruebas NO EJECUTADAS y vigencia normativa no certificada.

- Ámbito: EA; código: EXCELENCIA_ACADEMICA.
- Componente: CMP-EA-001.
- Política: [ExcelenciaAcademicaPolicy](../../../../apps/modalidades/excelencia_academica.py).
- Pruebas: [apps/modalidades/tests_excelencia_academica.py](../../../../apps/modalidades/tests_excelencia_academica.py).
- Consumidor frontend: [src/pages/postulantes/ExcelenciaAcademica.jsx](../../../../src/pages/postulantes/ExcelenciaAcademica.jsx).

## Etapas declaradas

| Orden | Código | Nombre |
| --- | --- | --- |
| 1 | INSCRIPCION | Inscripción |
| 2 | REVISION_REQUISITOS | Revisión de requisitos |
| 3 | EVALUACION_TRIBUNAL | Evaluación del tribunal |
| 4 | REGISTRO_ACTA | Registro del acta |
| 5 | CONCLUSION_ACADEMICA | Conclusión académica |

## Particularidades y límites

Criterio y evaluación propios. Distinguir rendimiento y calidad; no inventar defensa numérica ni integración con kardex.

Orden extraído de STAGE_DATA. No representa todas las guardas, reintentos y automatismos. Contrastarlo con servicios y configuración persistida.

## Antecedente de planificación (fase 2)

Mantener reglas de EA en su paquete y referenciar conceptos comunes por ID. No copiar umbrales, quórum, actores o documentos desde otra modalidad. En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.

## Paquete dinámico de fase 5

[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.
