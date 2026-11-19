# Informe de validación del Manual de Usuario

**Estado: BORRADOR PENDIENTE DE VALIDACIÓN VISUAL EN LA APLICACIÓN.** Se creó y renderizó el DOCX, pero no se pudieron obtener capturas de la interfaz real. No presentar como edición final aprobada.

## Artefacto y revisión

- Documento: `manual-de-usuario.docx`.
- Render local de control: 11 páginas tamaño carta, LibreOffice Portable 26.2.4 y Poppler a 100 dpi.
- Se revisaron visualmente las 11 páginas completas. La portada, tablas, saltos, encabezado/pie, títulos, listas numeradas, márgenes y ajuste de texto se ven legibles; no se observaron recortes, solapamientos o imágenes rotas. La última página contiene el cierre de anexos y espacio en blanco normal.
- Se corrigió la numeración para reiniciar los pasos en cada procedimiento y se añadió paginación estática al índice según el render revisado.
- No se insertaron capturas ni diagramas (0 imágenes incorporadas). Por ello, la verificación de integridad de imágenes queda como no aplicable.
- El paquete DOCX se abre mediante LibreOffice y produce PDF/PNG. `python-docx` no está instalado; no se instalaron dependencias. El renderizador del plugin falló por falta de `pdf2image` y por permisos de perfiles temporales; se usó una conversión directa con perfil explícito.

## Cobertura de procedimientos

Los 15 procedimientos de fase 11 se trazan así: USR-01/02 a 5.1/5.2; USR-03 a 7.1; USR-04 a 7.2; USR-05 a 7.3; USR-06 a 7.4; USR-07 a 7.6; USR-08 a 7.7; USR-09 a 7.8; USR-10 a 7.10; USR-11 a 7.11; USR-12 a 7.12; USR-13 a 7.13.1–7.13.6; USR-14 a 7.14; USR-15 a 7.15.

Se añadieron navegación, consulta de modalidades, seguimiento académico y gestión de usuarios/catálogos (secciones 6, 7.5, 7.9 y 7.16–7.17). El registro en el sistema se denomina postulación y se distingue de matrícula/inscripción externa. Se describen Proyecto de Grado, Tesis de Grado, Trabajo Dirigido, Examen de Grado, Excelencia Académica y Graduación vía Diplomado con diferencias verificadas en los componentes y servicios.

## Roles y discrepancia encontrada

Los roles/acciones se redactaron condicionados al permiso y relación del expediente. Al contrastar fase 11 con `apps/usuarios/services.py`, se observó que el servicio `UserCapabilitiesService` no asigna capacidades al código `ADMINISTRACION`, aunque el resumen funcional de fase 11 le atribuía capacidades comunes. El manual informa explícitamente que su acceso no debe inferirse por el nombre del rol y que debe confirmarse. No se modificó código ni permiso.

## Capturas

No se pudo inspeccionar la aplicación en navegador: Computer Use detuvo la operación al no poder determinar con confianza la URL activa de Chrome. No se iniciaron servicios, no se ingresaron credenciales y no se modificaron datos. Están pendientes las 14 categorías CAP-01–CAP-14 del inventario adjunto; algunas requieren varias capturas, especialmente CAP-05 y CAP-12 para las seis modalidades. CAP-01 puede capturarse sin autenticación; el resto requiere sesión segura, roles y datos de demostración/anonimizados.

## Validaciones realizadas

| Control | Resultado |
| --- | --- |
| Apertura/render del DOCX | Correcto con LibreOffice Portable; PDF generado. |
| Paginación | 11 páginas tamaño carta. |
| Inspección visual | 11/11 páginas inspeccionadas a 100 dpi. |
| Estructura | Portada, control de versiones, índice, objetivos, alcance, acceso, roles, login, navegación, procedimientos, diferencias, problemas frecuentes, glosario y anexos. |
| Procedimientos | 24 secciones de procedimiento (incluye accesos y seis variantes de modalidad); cobertura de los 15 identificadores de fase 11. |
| Roles/modalidades | Cuatro roles del código considerados; seis modalidades diferenciadas. Rol `ADMINISTRACION` señalado para confirmación. |
| Capturas | 0 incorporadas; 14 categorías pendientes. El documento se mantiene como borrador. |
| Datos sensibles | Sin credenciales ni datos personales incorporados; se verificará de nuevo cuando se añadan capturas. |
| Pruebas funcionales en vivo | No ejecutadas; no hubo sesión accesible. |

## Limitaciones para aprobación académica

1. Los pasos se basan en código/documentación, no en reproducción en una sesión real. Verificar etiquetas y mensajes de todos los formularios antes de aprobación.
2. Requiere capturas reales, legibles y anonimizadas, sobre todo expediente/documentos y paneles específicos de modalidad.
3. El índice estático refleja la paginación renderizada actual; debe revisarse si se modifica el documento.
4. No se verificaron datos normativos, nombres de autoridades, autoría ni trámites institucionales externos.

Para convertirlo en edición final, completar las capturas en un entorno de demostración y repetir la inspección visual de todas las páginas.
