# Auditoría académica — Manual de Usuario

**Artefacto:** `../manual-de-usuario.docx`  
**Estado heredado:** borrador pendiente de validación visual en la aplicación.  
**Fuentes auxiliares:** `../informe-validacion-usuario.md`, `../inventario-capturas-usuario.md`, `../../fase-11/auditoria-funcional.md` e `../../fase-11/inventario-procedimientos-usuario.md`.

## Resultado ejecutivo

El documento cubre la estructura didáctica prevista y conserva los 24 procedimientos reportados, incluida la explicación separada de las seis modalidades. La revisión visual previa informa 11 páginas inspeccionadas, portada, índice, paginación y tablas legibles. Sin embargo, el DOCX incorpora **cero capturas** y sus recorridos son de inspección estática, no de una sesión real. Debe permanecer como borrador hasta comprobar rutas, etiquetas, permisos y resultados en una instalación autorizada.

## Cobertura y fidelidad funcional

El informe previo mapea los 15 identificadores USR-01–USR-15 de fase 11 a procedimientos del manual y agrega navegación, consulta de modalidades, seguimiento, gestión de usuarios y catálogos. Las 24 secciones de procedimiento se componen de acceso general/estudiantil, tareas comunes y seis variantes por modalidad; el detalle de trazabilidad está en el informe de validación y el manual.

La cobertura temática incluye acceso, dashboard, postulantes, creación de postulación, expediente, documentos, revisión/dictamen, actores/asignaciones, defensas, participantes/evaluación, operaciones de modalidad, notificaciones, reportes, usuarios y catálogos/seguimiento. Las diferencias declaradas abarcan Proyecto de Grado, Tesis de Grado, Trabajo Dirigido, Examen de Grado, Excelencia Académica y Graduación vía Diplomado. Para evitar afirmar equivalencia de flujos, los procedimientos específicos deben seguir ligados a la pantalla y policy propia de cada modalidad.

Las rutas visibles en `src/routes/AppRoutes.jsx` incluyen `/login`, `/dashboard`, `/reportes/postulaciones`, `/reportes/resultados`, `/notificaciones`, `/postulantes`, `/postulaciones/:id`, `/documentos`, `/modalidades`, `/seguimiento`, `/usuarios` y `/configuracion`. Son rutas de frontend protegidas con claves de permiso; no implican que todas estén disponibles para cualquier rol o instalación.

## Roles y permisos

La interfaz y el backend combinan capacidades (`apps/usuarios/services.py`), protecciones de ruta (`src/routes/AppRoutes.jsx`) y permisos/alcances particulares en API. Por ello, la guía acierta al condicionar acciones a permiso y relación con el expediente y al advertir que el nombre del rol no basta.

Hay una discrepancia heredada que debe resolverse antes de presentar una tabla de roles como autorización definitiva: fase 11 atribuye capacidades de lectura a `ADMINISTRACION` en `auditoria-funcional.md`, mientras el informe de validación del Manual de Usuario dice que `UserCapabilitiesService` no le asigna capacidades. El código actual de `apps/usuarios/services.py` debe tomarse como referencia junto a permisos de endpoint y pruebas. No se encontró verificación de una cuenta `ADMINISTRACION` en vivo. Recomendación: no afirmar una matriz completa por rol hasta reconciliar esa evidencia; especificar que el acceso efectivo depende del permiso y alcance.

## Procedimientos que requieren captura obligatoria

Como el manual explica interacción con una interfaz y actualmente carece de imágenes, para una guía académica operativa se recomienda exigir al menos una captura real para cada una de estas familias:

| Prioridad | Procedimiento/familia | Evidencia visual mínima |
|---|---|---|
| Esencial | Acceso (CAP-01) | Selector de acceso y campos vacíos, sin credenciales. |
| Esencial | Inicio/navegación (CAP-02) | Pantalla principal y menú de un rol autorizado. |
| Esencial | Postulantes/Mi proceso (CAP-03) | Lista o vista del estudiante con datos anonimizados. |
| Esencial | Expediente y variantes de modalidad (CAP-05, CAP-12) | Pestañas/estado/orientación; una vista por cada modalidad que el manual describe. |
| Esencial | Gestión documental (CAP-06, CAP-07, CAP-08) | Diálogo vacío antes de guardar, detalle/versiones y formulario de revisión sin registrar cambios. |
| Esencial | Asignaciones y defensas (CAP-09, CAP-10, CAP-11) | Vista de actores, requisitos/evento y participantes/evaluación sin guardar operaciones. |
| Esencial | Reportes y notificaciones (CAP-13, CAP-14) | Lista con contenido seguro y reporte filtrado sin exportar. |
| Según procedimiento narrado | Creación de postulación, usuarios, catálogos/seguimiento | Pantalla/formulario vacío que permita entender los campos; no enviar. |

CAP-05 y CAP-12 son categorías, no una sola imagen: si se afirman comportamientos de seis modalidades, se necesita evidencia de seis pantallas diferenciadas para cada familia relevante. Esto produce más de 14 archivos de captura. Las acciones de guardar, emitir dictamen, asignar, programar, evaluar, activar usuario o exportar no se deben ejecutar para obtener imágenes.

## Claridad, mensajes y controles

`src/pages/auth/LoginPage.jsx` contiene los mensajes de autenticación citados por el informe previo: “No se pudo conectar con el servidor.”, “Usuario o contraseña incorrectos.” y “No tienes permiso para acceder.” Los campos de acceso estudiantil están rotulados `R.U.` y `C.I.` y el botón dice `Iniciar Sesión`. Es evidencia del código; el diseño renderizado y su coincidencia con el navegador actual no fueron observados en esta auditoría.

No generalizar estos mensajes a otros formularios. Las respuestas de servicios/API pueden variar por módulo y campos. Las validaciones y mensajes de creación, carga documental, dictámenes, asignaciones, defensa, evaluación, reportes y administración deben cotejarse en la vista y servicio correspondientes antes de citarlos literalmente.

## Calidad académica y pendientes

- Presentación: el informe previo declara legibles 11 páginas, jerarquía de secciones, tablas, paginación y ausencia de cortes en el render de entonces. Esta revisión no volvió a renderizar el DOCX.
- Índice: es estático según el informe previo; se desactualiza si cambia la paginación. Actualizar y comprobarlo cuando se autorice editar.
- Figuras: no hay imágenes embebidas; por tanto no hay leyendas/correspondencia visual que validar.
- Ortografía: revisar en la corrección final contra la terminología exacta de interfaz. No se hizo una corrección de estilo dentro del DOCX.
- Procedimientos: pasos y permisos aún necesitan validación de recorrido por rol, sin ejecutar acciones persistentes.
- Datos: cualquier evidencia futura debe usar registros de demostración aprobados o anonimización que no altere la base institucional.

## Dictamen

**Borrador didáctico aprovechable; no listo para presentación como manual operativo final.** Bloqueadores: capturas reales ausentes, recorrido de UI no verificado y discrepancia de permisos `ADMINISTRACION`. La fase de corrección debe incorporar evidencia y actualizar el índice/render completo, sin cambiar reglas académicas.
