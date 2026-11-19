# Informe final — Fase 11

## Resultado y archivos creados

Se completó una auditoría estática documental, funcional y técnica dentro de esta carpeta. Archivos nuevos:

- `README.md`
- `auditoria-funcional.md`
- `inventario-procedimientos-usuario.md`
- `inventario-capturas.md`
- `auditoria-tecnica.md`
- `inventario-diagramas-reutilizables.md`
- `discrepancias-y-pendientes.md`
- `plan-elaboracion-manuales.md`
- `informe-final.md`

No se generaron manuales Word.

## Hallazgos

1. **Módulos:** autenticación/usuarios, académico y catálogos, postulantes/expedientes/workflow, documentos, modalidades, seguimiento/asignaciones, defensas/evaluaciones, notificaciones, reportes y configuración/perfil.
2. **Procedimientos:** 15 identificadores prioritarios (USR-01–USR-15) que cubren acceso, consulta/registro de postulaciones, expediente, documentos, actores, defensas, operación específica de modalidad, notificaciones e informes. Se dejan tareas CRUD administrativas como complemento pendiente de reproducción.
3. **Capturas:** CAP-01–CAP-14, priorizando acceso, dashboard, lista, expediente, documentos y paneles por modalidad. Ninguna captura fue fabricada ni tomada; no se verificó instancia viva. Privacidad exige anonimización y exclusión de tokens/PII.
4. **Diagramas:** se seleccionan 10 reutilizables, priorizando arquitectura, despliegue, especialización por modalidad, expediente, ER lógico documental y ER lógico de defensas. Hay diagramas existentes para ampliación y modalidades; no se regeneraron.
5. **Información técnica:** Django 6.0.7, DRF 3.17.1, React ^19.2.7, Vite ^8.1.1, Tailwind ^4.3.2, PostgreSQL `postgres:15`, driver psycopg2-binary 2.9.12; API bajo `/api/v1/`; JWT y Docker Compose descritos en auditoría. Son valores declarados, no verificación de ejecución.
6. **Discrepancias:** se documenta la nota de bloqueo Word/publicación de fase 10 en relación con los estados y el informe final. La discrepancia parece ser un registro residual de pregunta pendiente, aunque el reemplazo está marcado resuelto; no se modificaron los archivos originales.

## Validación y límites

Se contrastaron referencias de rutas, vistas, servicios, permisos, configuración y artefactos fase 8–10 mediante lectura estática. No se ejecutaron pruebas, build, migraciones, servicios, consultas a PostgreSQL ni operaciones de escritura. No se verificaron mensajes live, permisos en sesión real, esquema instalado, backups/restauración, seguridad de producción, latencia actual ni versiones runtime. Las afirmaciones procedimentales quedan sujetas a reproducción en entorno seguro.

No se incluyó contenido de `.env` ni credenciales. Las capturas pendientes podrían contener datos personales; deben obtenerse de entorno de demostración anonimizados. Los cambios locales preexistentes no se tocaron; las fases 8–10 y los DOCX existentes permanecen sin modificación intencional.

## Preparación de los manuales

- **Manual de Usuario:** parcialmente preparado. Existe catálogo trazable de pantallas/procedimientos y capturas requeridas; falta validar recorridos, textos, roles y capturas reales en la aplicación.
- **Manual Técnico:** parcialmente preparado. Se recuperó arquitectura declarada, configuración, API, autenticación y diagramas; faltan confirmar entorno/runtime, seguridad operativa y procedimientos de respaldo/restauración.

La fase 11 queda documentada con pendientes explícitos. Me detengo aquí y espero autorización para iniciar las fases 12 y 13.
