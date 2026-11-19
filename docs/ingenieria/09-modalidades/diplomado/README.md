# Vía Diplomado

Estado: IMPLEMENTADO en código; pruebas NO EJECUTADAS y vigencia normativa no certificada.

- Ámbito: DIP; código: GRADUACION_VIA_DIPLOMADO.
- Componente: CMP-DIP-001.
- Política: [DiplomadoPolicy](../../../../apps/modalidades/diplomado.py).
- Pruebas: [apps/modalidades/tests_diplomado.py](../../../../apps/modalidades/tests_diplomado.py).
- Consumidor frontend: [src/pages/postulantes/Diplomado.jsx](../../../../src/pages/postulantes/Diplomado.jsx).

## Etapas declaradas

| Orden | Código | Nombre |
| --- | --- | --- |
| 1 | INSCRIPCION | Inscripción |
| 2 | MODULO_1 | Módulo 1 |
| 3 | MODULO_2 | Módulo 2 |
| 4 | MODULO_3 | Módulo 3 |
| 5 | MODULO_4 | Módulo 4 |
| 6 | TALLER_INVESTIGACION | Taller de Investigación |
| 7 | REVISION_MONOGRAFIA | Revisión de Monografía |
| 8 | DEFENSA_PUBLICA | Defensa Pública |
| 9 | CIERRE_DOCUMENTAL | Cierre documental |
| 10 | CONCLUSION_ACADEMICA | Conclusión académica |

## Particularidades y límites

Cinco módulos: cuatro nominales y taller de investigación. Monografía y defensa pública según su política.

Orden extraído de STAGE_DATA. No representa todas las guardas, reintentos y automatismos. Contrastarlo con servicios y configuración persistida.

## Antecedente de planificación (fase 2)

Mantener reglas de DIP en su paquete y referenciar conceptos comunes por ID. No copiar umbrales, quórum, actores o documentos desde otra modalidad. En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.

## Paquete dinámico de fase 5

[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.
