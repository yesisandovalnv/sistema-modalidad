# Fase 15 — Corrección documental

## Alcance ejecutado

Se contrastaron los cinco hallazgos de fase 14 con los documentos base, configuraciones y código actuales. Solo se editó el Manual Técnico en los apartados afectados. El Manual de Usuario se revisó y quedó sin cambios: su tabla ya indicaba que el servicio no asigna capacidades al código `ADMINISTRACION`, y sus procedimientos y marcadores CAP-01–CAP-14 se preservaron.

Las copias previas a la edición están en [`copias-seguridad/`](copias-seguridad/). Se registran para preservar el original exacto.

## Entregables

- [Matriz de correcciones](matriz-correcciones.md)
- [Informe de validación](informe-validacion.md)
- [Pendientes](pendientes.md)

## Validación y límites

El archivo editado conserva la estructura ZIP de DOCX y todos los XML del paquete se analizaron. Sin embargo, Word no abrió el documento editado ni la copia previa del Manual Técnico; el mismo error con el original impide atribuirlo a los cambios, pero tampoco permite certificar la apertura final. No se encontró `python-docx`, LibreOffice ni el renderizador documental disponible en esta estación; no se actualizó ni inspeccionó un render final. Paginación e índice deben revisarse en un entorno que abra el DOCX.

No se modificó código/configuración, la base de datos, Docker, servicios, migraciones, datos ni documentos de fases anteriores. No se ejecutaron comandos operativos ni se realizaron commits o push.
