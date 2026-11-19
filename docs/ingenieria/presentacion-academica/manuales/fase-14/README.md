# Fase 14 — Revisión académica de manuales

## Propósito

Auditoría documental previa a la presentación del Manual de Usuario y del Manual Técnico del Sistema de Modalidades de Graduación. Esta fase no actualiza los DOCX ni certifica el comportamiento de una instancia en ejecución.

## Alcance y método

- Se leyeron los manuales, sus informes de validación e inventarios previos y la documentación de fases 8–11 referenciada en los entregables.
- Las afirmaciones técnicas se contrastaron con archivos de configuración y código fuente presentes en el repositorio.
- Las versiones instaladas se consultaron de forma local y de solo lectura; no se instalaron dependencias ni se consultaron contenedores o bases de datos en ejecución.
- No hubo inicio de sesión, captura de pantallas, modificación de datos, pruebas, migraciones ni inicio/reinicio de servicios.
- Se preservaron los documentos anteriores. Los únicos archivos nuevos de esta fase son los siete documentos de esta carpeta.

## Entregables

1. [Auditoría del Manual de Usuario](auditoria-manual-usuario.md)
2. [Auditoría del Manual Técnico](auditoria-manual-tecnico.md)
3. [Plan de capturas reales](plan-capturas-reales.md)
4. [Discrepancias técnicas](discrepancias-tecnicas.md)
5. [Checklist para presentación](checklist-presentacion-tribunal.md)
6. [Informe final](informe-final.md)

## Criterio de evidencia

El código y la configuración actuales son fuente principal para describir el sistema. La documentación previa sirve como evidencia de lo elaborado y de sus límites; las guías históricas no prueban que un procedimiento siga siendo ejecutable. Los resultados runtime, datos institucionales y permisos de cuentas reales permanecen pendientes cuando no se verificaron en una instancia.

## Estado

Los dos manuales siguen en borrador. La recomendación es resolver las discrepancias documentales, completar capturas reales y una comprobación visual/de recorrido con cuentas autorizadas en un entorno de demostración, y después autorizar una fase de corrección de los DOCX.
