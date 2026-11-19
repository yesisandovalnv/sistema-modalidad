# Tesis de Grado

Estado: IMPLEMENTADO en código; pruebas NO EJECUTADAS y vigencia normativa no certificada.

- Ámbito: TG; código: TESIS_GRADO.
- Componente: CMP-TG-001.
- Política: [TesisGradoPolicy](../../../../apps/modalidades/tesis_grado.py).
- Pruebas: [apps/modalidades/tests_tesis_e2e.py](../../../../apps/modalidades/tests_tesis_e2e.py).
- Consumidor frontend: [src/pages/postulantes/ExpedientePage.jsx](../../../../src/pages/postulantes/ExpedientePage.jsx).

## Etapas declaradas

| Orden | Código | Nombre |
| --- | --- | --- |
| 1 | INSCRIPCION | Inscripción |
| 2 | TEMATICA_TESIS | Temática de Tesis |
| 3 | PERFIL_TESIS | Perfil de Tesis |
| 4 | DOCUMENTO_FINAL | Documento Final |
| 5 | REVISION_TUTOR | Revisión de Tutor |
| 6 | REVISION_TRIBUNAL | Revisión de Tribunal |
| 7 | DEFENSA_PRIVADA | Defensa Privada |
| 8 | DEFENSA_PUBLICA | Defensa Pública |

## Particularidades y límites

Flujo protegido. Revisiones de tutor/tribunal, ACTA_DEFENSA y conclusión propios; no equiparar al cierre técnico de Proyecto.

Orden extraído de STAGE_DATA. No representa todas las guardas, reintentos y automatismos. Contrastarlo con servicios y configuración persistida.

## Antecedente de planificación (fase 2)

Mantener reglas de TG en su paquete y referenciar conceptos comunes por ID. No copiar umbrales, quórum, actores o documentos desde otra modalidad. En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.

## Paquete dinámico de fase 5

[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.
