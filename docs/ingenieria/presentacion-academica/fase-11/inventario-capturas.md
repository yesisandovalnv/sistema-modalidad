# Inventario de capturas para el Manual de Usuario

No se localizaron capturas funcionales de la aplicación web dentro de la documentación académica de fases 8–10. Las imágenes encontradas son diagramas UML/ER, renderizados de documentos o recursos institucionales; no son evidencia de pantallas de la aplicación y no deben reutilizarse como tales.

| ID | Pantalla/estado que debe capturarse | Procedimientos | Puede obtenerse sin escritura | Datos sensibles a ocultar | Prioridad |
| --- | --- | --- | --- | --- | --- |
| CAP-01 | Acceso general y acceso estudiantil (sin credenciales) | USR-01, USR-02 | Sí, antes de envío; nunca mostrar claves/tokens | Nombre de usuario/correo si se llena | Alta |
| CAP-02 | Inicio/dashboard con filtros y resumen | USR-03 | Sí, si entorno tiene datos autorizados | nombres, códigos, conteos pequeños identificables | Alta |
| CAP-03 | Lista postulantes / Mi proceso con menú acorde al rol | USR-04 | Sí, vista de lectura | identidad, código, periodo si identifica | Alta |
| CAP-04 | Formulario vacío de postulación y ejemplo de error de validación | USR-05 | Formulario vacío sí; error solo reproducir con fixture seguro | PII y cualquier carga enviada | Media |
| CAP-05 | Expediente: resumen, estado, requisitos y orientación | USR-06 | Sí, en lectura | estudiante, asesor/tribunal, código y fechas | Alta |
| CAP-06 | Selector de tipo/archivo en carga documental, sin confirmar | USR-07 | Sí, antes de guardar | nombres de archivo/documento, PII embebida | Alta |
| CAP-07 | Detalle de documento, versiones y observaciones | USR-08 | Sí, si expediente de demostración | contenido, comentarios y nombres | Alta |
| CAP-08 | Revisión/dictamen con campos vacíos | USR-09 | Sí, antes de guardar | personas, observaciones, datos de expediente | Media |
| CAP-09 | Asignaciones/actores y estado de requisitos | USR-10 | Sí, solo lectura | identidad y correo de docentes/estudiante | Alta |
| CAP-10 | Defensa y requisitos de programación (sin programar) | USR-11 | Sí | identidad, fecha/ubicación si no pública | Media |
| CAP-11 | Participantes/quórum y formulario de evaluación vacío | USR-12 | Sí, antes de guardar | identidades, notas, firma o comentarios | Media |
| CAP-12 | Cada panel específico de modalidad | USR-13 | Sí, en lectura; formularios vacíos | identificadores, instituciones, notas/resultados | Alta |
| CAP-13 | Lista de notificaciones con mensajes no identificables | USR-14 | Sí, si muestra datos seguros | asunto/mensaje puede contener PII | Baja |
| CAP-14 | Reportes por filtros, sin exportar datos personales | USR-15 | Sí, con filtros inocuos/datos anonimizados | resultados de grupos pequeños, nombres y códigos | Media |

## Modalidades a cubrir visualmente

CAP-05 debe mostrar diferencias de pestañas/orientación cuando exista expediente seguro para cada modalidad: Proyecto de Grado, Tesis de Grado, Trabajo Dirigido, Examen de Grado, Excelencia Académica y Graduación vía Diplomado. CAP-12 requiere una captura de cada panel específico presente. No forzar una etapa ni crear expedientes reales para completar la galería.

## Herramientas y condiciones

- Node/npm y dependencias del frontend están en el repositorio; Docker CLI y Python 3.12 también estaban disponibles al auditar. Esto no significa que contenedores o puertos estén activos.
- Los comandos globales `soffice`/`libreoffice`, `msedge` y `chrome` no se encontraron mediante PATH. Fase 10 contiene LibreOffice Portable, que sirve para Word, no para capturas del sitio. Playwright/Puppeteer no aparecen en `node_modules`.
- La interfaz de navegador controlada por el entorno del agente puede servir para capturas si existe una sesión viva; no se verificó en esta fase.
- Docker Compose declara Vite con polling cada 300 ms y puertos predeterminados frontend 15174/backend 19001. La lentitud previa es un antecedente reportado, no medida actual. No se iniciaron servicios ni se hicieron pruebas de rendimiento.

## Reglas de privacidad

No modificar registros institucionales para producir evidencia. Preferir cuentas/fixtures de demostración ya existentes. Si una captura de solo lectura muestra datos reales, anonimizar una copia visual local y registrar la operación; ocultar nombres, correos, teléfonos, RU, códigos vinculables, nombres de archivo, notas individualizadas, firmas, JWT y URLs con tokens. Si no se puede demostrar anonimización sin alterar la evidencia original, no usar la captura.
