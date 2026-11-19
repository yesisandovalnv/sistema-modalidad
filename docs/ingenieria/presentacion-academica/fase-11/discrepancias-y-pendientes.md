# Discrepancias y pendientes

## Publicación de fase 10

Se observan registros de momentos distintos:

- `fase-10/control-final-pendiente.json` informa `main_final_name_pending_word_lock: true` y pendiente de reemplazo del documento principal mientras Word lo mantenía abierto.
- `fase-10/publicacion-pendiente.json` dice `status: RESUELTO`, indica que el principal fue reemplazado y validado como `revision-analisis-y-diseno.docx`, pero conserva el texto previo de pregunta pendiente sobre cerrar Word.
- `fase-10/estado-entrega.json` marca fase completada y declara hashes de `analisis-y-diseno.docx` y `anexos-uml.docx`.
- `fase-10/informe-fase-10.md` y `revision-visual.json` declaran revisión visual completada de 57 páginas y hashes que coinciden con las copias de revisión.

La lectura más consistente es que se resolvió la publicación del DOCX principal, mientras el campo de pregunta/estado pendiente de `publicacion-pendiente.json` no se actualizó completamente. Sin metadatos temporales adicionales no se prueba el orden causal exacto. Como fase 11 no debe alterar fase 10, registrar esto para aclaración por su responsable; no reescribir Word ni JSON.

## Brechas de evidencia funcional

1. No se abrió una sesión viva; etiquetas/mensajes y pasos no están verificados visualmente.
2. No se comprobaron permisos con cuentas de cada rol ni límites por expediente.
3. No hay evidencia identificada de capturas de pantallas funcionales en la carpeta académica.
4. Las operaciones de escritura no deben ensayarse contra datos institucionales.
5. No se verificó disponibilidad ni latencia actual de Vite; 15174/19001 son defaults configurados, no garantía de puertos actuales.

## Brechas técnicas

1. No se inspeccionaron contenedores, servidor, DB ni versiones runtime.
2. No se consultó estado de migraciones ni esquema instalado.
3. Seguridad de producción no se acredita; la configuración local muestra DEBUG y claves fallback de desarrollo.
4. No se encontró procedimiento operativo verificado de respaldos/restauración; montaje de `backups` en initdb no demuestra un backup.
5. No se ejecutaron pruebas/build; solo se inspeccionaron suites y scripts.
6. Falta validar métodos, cuerpos y errores de API a partir de OpenAPI/instancia; inventario estático es orientativo.

## Decisiones antes de los manuales

- Definir si los manuales cubrirán despliegue solo local o también producción.
- Acordar datos de portada/autores y formato institucional.
- Proveer entorno de demostración no productivo, acceso por roles y capturas sin PII.
- Resolver si se permite obtener capturas de campos vacíos y estados de error en datos descartables.
- Confirmar procedimiento institucional de backup, restauración y soporte.
