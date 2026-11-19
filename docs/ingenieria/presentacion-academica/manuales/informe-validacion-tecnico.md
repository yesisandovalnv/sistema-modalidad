# Informe de validación — Manual Técnico

**Fecha:** 5 de noviembre de 2026  
**Documento revisado:** [`manual-tecnico.docx`](manual-tecnico.docx)  
**Trazabilidad:** [`matriz-trazabilidad-manual-tecnico.md`](matriz-trazabilidad-manual-tecnico.md)

## Resultado

Se generó el Manual Técnico en DOCX con portada institucional, control de versiones, índice paginado, encabezado y pie con número de página, capítulos técnicos, tablas, ocho figuras reutilizadas y anexos. El archivo abre con `python-docx` y se convirtió a PDF con LibreOffice Portable 26.2.4.2 para revisión de control. El PDF es auxiliar de QA y no uno de los tres entregables solicitados.

| Comprobación | Resultado |
|---|---|
| Apertura DOCX / contenedor ZIP | Correcta; `python-docx` abrió el archivo y `ZipFile.testzip()` no encontró errores. |
| Estructura | 4 secciones (incluye páginas apaisadas), capítulos 1–28, 30 tablas, 8 imágenes y títulos jerarquizados. |
| Renderizado | Conversión local correcta; PDF de control de 18 páginas: portada, control/índice, cuerpo carta y dos páginas apaisadas para diagramas de modalidad. |
| Revisión visual | Se inspeccionaron las 18 páginas en hoja de contacto y ampliación de páginas de diagramas. Portada, control de versiones, índice, tablas y pies aparecen completos; no se observaron páginas totalmente vacías, superposiciones ni contenido cortado. |
| Índice/paginación | Campo TOC de Word actualizable, con páginas visibles contrastadas contra el render; campos de número de página presentes. |
| Figuras | Ocho PNG del inventario académico de fase 9 incorporados con relación de aspecto preservada; Tesis y Trabajo Dirigido ocupan páginas apaisadas independientes. Los SVG fuente permanecen como ampliación vectorial. |
| Tablas | Encabezados, sombreados y anchos consistentes; tablas extensas continúan en páginas siguientes sin filas huérfanas relevantes. |
| Coherencia técnica | Se contrastaron versiones, endpoints, roles, settings, comandos, modelos y configuración con el código/configuración actual. |
| Comandos | Los comandos de instalación, pruebas, migraciones, Docker, backup y restore se transcribieron de guías existentes. No se ejecutaron. Los comandos con escritura se identifican explícitamente. |
| Secretos/datos | No se leyó `.env` ni se incluyeron credenciales, tokens, datos personales o capturas con registros reales. |
| Manual de Usuario | SHA-256 antes y después: `4484a33ef629cd53933caf0300dfa235bd71acbdd3aadc72804c20db3eab22f3`; no fue modificado. |
| Archivos de referencia | No se modificaron fases 8, 9, 10 u 11 ni documentos previos. No se tocó código, base de datos, Docker o servicios. |

## Contenido incorporado

Los 31 elementos solicitados están cubiertos entre portada/control/índice, 28 capítulos numerados desde Introducción hasta Anexos y referencias técnicas: arquitectura general, tecnologías, requisitos, repositorio, backend, frontend, datos y modelo, API, autenticación/autorización, entornos, instalación, Docker, migraciones, pruebas, logs/diagnóstico, backup/restauración, seguridad, mantenimiento, despliegue, UML, glosario y anexos operativos.

## Tecnologías y discrepancias consignadas

- Python 3.12 y Django 6.0.7; Django REST Framework 3.17.1; Simple JWT 5.5.1.
- React/React DOM ^19.2.7; React Router DOM ^7.18.1; Vite ^8.1.1; Tailwind CSS ^4.3.2.
- PostgreSQL `postgres:15`, psycopg2-binary 2.9.12; Node 20 indicado en README/despliegue y Node 22 declarado por Dockerfile frontend.
- Access JWT: 15 minutos efectivos en `core/settings/base.py`, frente a 60 minutos en auditoría técnica de fase 11.
- Zona horaria: `America/La_Paz` en settings y `.env.example`, `America/Lima` en `docs/ENVIRONMENT.md`.
- README y `docs/ARCHITECTURE.md` contienen afirmaciones previas sobre policies que no reflejan íntegramente módulos policy actuales; prevalece el código inspeccionado.
- La carpeta con documentos de fase 8 está directamente en `presentacion-academica/`; no existe `presentacion-academica/fase-8/`.
- En fase 10, el informe/estado declaran entrega completada mientras JSON de publicación conserva una nota residual pendiente. Se registra, sin alterar esos archivos.

## Limitaciones pendientes

1. No se verificaron versiones runtime, contenedores activos, servidor, PostgreSQL ni esquema aplicado.
2. No se ejecutaron instalación, migraciones, seeds, pruebas, builds, diagnósticos en instancia, backup o restauración.
3. El procedimiento de backup/restauración proviene de `docs/DEPLOYMENT.md` y no está validado operacionalmente ni respaldado aquí por una política institucional aprobada.
4. Compose es para desarrollo: utiliza runserver/Vite dev, `DEBUG=True`, defaults/fallbacks y ejecuta migraciones al arranque. No se certifica aptitud productiva.
5. La guía productiva menciona Gunicorn, no presente en `requirements.txt`; tampoco se encontró manifiesto productivo del proveedor.
6. La fase 10 advierte que siete figuras requieren formato grande para legibilidad física. Los diagramas Tesis y Trabajo Dirigido se ampliaron en páginas apaisadas; el resto conserva referencia SVG. Esta edición no acredita impresión.
7. El formato institucional oficial, autoría, tutores y autoridades no fueron proporcionados; por eso no se inventan.

## Estado académico

**Borrador técnico completo para revisión académica y validación operativa.** El documento es estructuralmente íntegro y fue inspeccionado visualmente en render local. Antes de presentarlo como guía operativa definitiva, confirmar con el responsable técnico la versión Node objetivo, zona horaria, configuración productiva permitida, contrato OpenAPI del release y política aprobada/probada de respaldo y restauración. La inspección documental no constituye certificación del entorno desplegado.
