# Trabajo Dirigido

Estado: IMPLEMENTADO en código; pruebas NO EJECUTADAS y vigencia normativa no certificada.

- Ámbito: TD; código: TRABAJO_DIRIGIDO.
- Componente: CMP-TD-001.
- Política: [TrabajoDirigidoPolicy](../../../../apps/modalidades/trabajo_dirigido.py).
- Pruebas: [apps/modalidades/tests_trabajo_dirigido.py](../../../../apps/modalidades/tests_trabajo_dirigido.py).
- Consumidor frontend: [src/pages/postulantes/TrabajoDirigido.jsx](../../../../src/pages/postulantes/TrabajoDirigido.jsx).

## Etapas declaradas

| Orden | Código | Nombre |
| --- | --- | --- |
| 1 | INSCRIPCION | Inscripción |
| 2 | PERFIL_TRABAJO_DIRIGIDO | Perfil de Trabajo Dirigido |
| 3 | DESARROLLO_TRABAJO_DIRIGIDO | Desarrollo y seguimiento institucional |
| 4 | DOCUMENTO_FINAL | Documento Final |
| 5 | REVISION_TRIBUNAL_PREVIA | Revisión de Tribunal Previa |
| 6 | DEFENSA_PRIVADA | Defensa Privada |
| 7 | DEFENSA_PUBLICA | Defensa Pública |
| 8 | CIERRE_DOCUMENTAL | Cierre Documental |

## Particularidades y límites

Institución e informes propios. Importa clases de eventos, evaluación legacy y revisión previa de Proyecto: no implica igualdad normativa.

Orden extraído de STAGE_DATA. No representa todas las guardas, reintentos y automatismos. Contrastarlo con servicios y configuración persistida.

## Antecedente de planificación (fase 2)

Mantener reglas de TD en su paquete y referenciar conceptos comunes por ID. No copiar umbrales, quórum, actores o documentos desde otra modalidad. En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.

## Paquete dinámico de fase 5

[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.
