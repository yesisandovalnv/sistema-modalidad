# Pendientes después de fase 15

## Antes de cerrar la corrección del Manual Técnico

1. Abrir `../manual-tecnico.docx` en una instalación de Word/LibreOffice que lo pueda leer. Word de esta estación rechazó tanto el archivo editado como la copia previa con el mismo error, por lo que no se determinó si el problema depende del entorno o del paquete.
2. Renderizar todas las páginas del DOCX final a PDF/PNG y revisarlas a tamaño legible. Comprobar índice, paginación, tablas de tecnologías/requisitos, resumen de discrepancias, figuras y páginas apaisadas.
3. Registrar número de páginas y hash final después de la inspección. Si se actualiza el índice/campo, renderizar nuevamente.
4. No tratar los comandos de despliegue, migraciones, pruebas, backup/restore como ejecutados. Cualquier validación operacional debe realizarse luego en un entorno aislado y aprobado; esta fase no ejecutó esas operaciones.

## Antes de presentar ambos manuales

- El Manual de Usuario sigue pendiente de capturas reales CAP-01–CAP-14 y de validar sus recorridos en UI con cuentas autorizadas.
- Confirmar la matriz de acceso en endpoints/instancia para cuentas reales; el servicio de capacidades no asigna capacidades a `ADMINISTRACION`, y el nombre del rol no prueba autorización de API.
- Acordar la versión Node objetivo para desarrollo/CI/despliegue. Los valores disponibles son README/DEPLOYMENT Node 20, Dockerfile Node 22 y CLI local Node 25.6.1.
- Corregir `docs/ENVIRONMENT.md` y `docs/ARCHITECTURE.md` solo en una tarea documental autorizada separada; no fueron modificados por fase 15.
- Confirmar con responsables técnicos cualquier requisito normativo externo a las policies que figuran en código.
- Repetir revisión visual completa después de futuros cambios a ambos DOCX y mantener versiones/capturas de respaldo.

## Riesgo académico

Hasta completar la apertura y revisión visual del Manual Técnico, su índice, número de páginas y ajuste de texto no pueden certificarse. El Manual de Usuario permanece en borrador por falta de capturas reales. No presentar ninguno como validado operacionalmente.
