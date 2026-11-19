# Proyecto de Grado

Estado: IMPLEMENTADO en código; pruebas NO EJECUTADAS y vigencia normativa no certificada.

- Ámbito: PG; código: PROYECTO_GRADO.
- Componente: CMP-PG-001.
- Política: [ProyectoGradoPolicy](../../../../apps/modalidades/proyecto_grado.py).
- Pruebas: [apps/postulantes/tests_cierre.py](../../../../apps/postulantes/tests_cierre.py).
- Consumidor frontend: [src/pages/postulantes/ExpedientePage.jsx](../../../../src/pages/postulantes/ExpedientePage.jsx).

## Etapas declaradas

| Orden | Código | Nombre |
| --- | --- | --- |
| 1 | INSCRIPCION | Inscripción |
| 2 | PERFIL_PROYECTO | Perfil de Proyecto |
| 3 | DOCUMENTO_FINAL | Documento Final |
| 4 | REVISION_TRIBUNAL_PREVIA | Revisión de Tribunal Previa |
| 5 | DEFENSA_PRIVADA | Defensa Privada |
| 6 | DEFENSA_PUBLICA | Defensa Pública |
| 7 | REVISION_FINAL_POST_PUBLICA | Revisión Final Post Pública |
| 8 | CIERRE_DOCUMENTAL | Cierre Documental |

## Particularidades y límites

Baseline protegido. Separar PG_LEGACY y PG_HITOS_V1. La antelación pública local difiere de HEAD; no homologarla como normativa.

Orden extraído de STAGE_DATA. No representa todas las guardas, reintentos y automatismos. Contrastarlo con servicios y configuración persistida.

## Antecedente de planificación (fase 2)

Mantener reglas de PG en su paquete y referenciar conceptos comunes por ID. No copiar umbrales, quórum, actores o documentos desde otra modalidad. En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.

## Paquete dinámico de fase 5

[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.
