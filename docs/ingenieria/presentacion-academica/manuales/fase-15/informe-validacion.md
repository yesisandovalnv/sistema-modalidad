# Informe de validación — Fase 15

## Cambios y preservación

- DOCX editado: `../manual-tecnico.docx`.
- DOCX revisado y preservado: `../manual-de-usuario.docx`.
- Copias previas: `copias-seguridad/manual-de-usuario-antes.docx` y `copias-seguridad/manual-tecnico-antes.docx`.
- Los hashes previos de las copias coinciden con los registrados antes de editar. El Manual de Usuario conserva su hash anterior y no fue modificado.
- La comparación del Manual Técnico encontró 19 párrafos de texto distintos de 666; todos corresponden a los apartados enumerados en la matriz. Las demás entradas del paquete DOCX, incluidas imágenes y relaciones, son idénticas byte a byte tras descomprimir. No se modificaron tablas estructurales, índice, encabezados ni pies.

## Comprobaciones ejecutadas

| Control | Resultado |
|---|---|
| Rutas de trabajo | Rama `desarrollo`; destino fase 15 no existía antes de comenzar. |
| Hashes/copias previas | Verificados en fase 15/copias-seguridad antes de editar. |
| SHA-256 antes y copia | Manual Técnico: `9597B68DF52F9BDB540D2BBB10990A4E14E8F28DC5CC0D1A79E286D2D74CCF29`; Manual de Usuario: `4484A33EF629CD53933CAF0300DFA235BD71ACBDD3AADC72804C20DB3EAB22F3`. |
| Paquete DOCX del Manual Técnico | `ZipFile.testzip()` no reportó errores; 27 entradas; todos los XML y `.rels` pudieron analizarse. |
| Contenido/estructura | La comparación del texto confirma modificaciones solo en párrafos objetivo; medios y relaciones quedan preservados. |
| Hash SHA-256 final | Manual Técnico: `71E59570C773A3AD86E007085D16D4D84D35E123A9621C0110E51701BF32B81A`; Manual de Usuario sin cambio: `4484A33EF629CD53933CAF0300DFA235BD71ACBDD3AADC72804C20DB3EAB22F3`. |
| Manual de Usuario | Hash sin cambio; tabla de `ADMINISTRACION` ya indicaba capacidades no asignadas por el servicio; 24 procedimientos y marcadores CAP no fueron editados. |
| Secretos | No se leyó `.env` ni se añadieron credenciales, tokens o datos personales. |
| Word | No abrió el Manual Técnico editado ni su copia previa; presentó el mismo mensaje de error para ambos. La apertura final no queda certificada. |
| Render/páginas/índice | No se pudo ejecutar: no se encontró `python-docx`, LibreOffice ni renderizador documental accesible. El PDF anterior no se usó como validación del archivo nuevo. |
| Servicios/configuración | No se iniciaron servicios ni contenedores; no se ejecutaron migraciones, pruebas, build, backup o restore. |

## Comparación del contenido

El Manual Técnico describe ahora las versiones locales observadas separadas de requisitos históricos/documentados y de imágenes declaradas. `America/La_Paz` está descrita como predeterminado, no como valor runtime comprobado. Los 15 minutos de access se atribuyen a `core/settings/base.py`, y los 60 minutos a un dato histórico de fase 11. El estado de policies se expresa como presencia de clases en el código, sin afirmar validación normativa externa. Los comandos de despliegue/operación se identifican como no ejecutados.

En el Manual de Usuario no se encontró una atribución positiva de permisos a `ADMINISTRACION`: la tabla existente dice que el servicio no le asigna capacidades. La frase procedimental sobre tener permiso de API está condicionada al permiso efectivo y no nombra `ADMINISTRACION`; no justificó cambiar el procedimiento.

## Estado de aceptación

La corrección documental está aplicada con respaldo, pero la validación final solicitada por apertura y render sigue pendiente. En particular, no se puede confirmar que el índice, la paginación y las tablas conservaron el mismo ajuste visual tras los cambios de texto. Los manuales deben continuar como borradores hasta abrir el DOCX corregido, renderizar todas las páginas, actualizar campos si corresponde e inspeccionar el resultado.
