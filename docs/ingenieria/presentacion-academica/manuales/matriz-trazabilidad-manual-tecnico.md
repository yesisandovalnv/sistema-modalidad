# Matriz de trazabilidad — Manual Técnico

**Versión:** 1.0 · **Fecha:** 5 de noviembre de 2026  
**Documento:** [`manual-tecnico.docx`](manual-tecnico.docx)

La matriz identifica las fuentes principales de cada capítulo. Los comandos aparecen como procedimientos documentados en el repositorio; se indica en el DOCX cuándo producen escrituras. Ningún servicio, migración, prueba o backup se ejecutó durante la fase 13.

| Capítulo / tema | Afirmación o contenido cubierto | Fuente verificable del repositorio | Tipo de evidencia / límite |
|---|---|---|---|
| Portada, control e índice | Institución, carrera, título, versión y paginación | Instrucciones de fase 13; render final `manual-tecnico.pdf` de control | Se omitieron autores y autoridades no proporcionados; 16 páginas verificadas. |
| 1–4 Introducción, objetivos, alcance y descripción | Alcance cliente-servidor, seis modalidades registradas y límites de verificación | `apps/modalidades/policies.py`; `apps/modalidades/{proyecto_grado,tesis_grado,trabajo_dirigido,examen_grado,excelencia_academica,diplomado}.py`; fase 11 `auditoria-tecnica.md`, `auditoria-funcional.md` | Inspección estática; no confirma disponibilidad de un entorno desplegado. |
| 5 Arquitectura | Capas web/API/dominio/persistencia; flujo cliente-servidor | `docs/ARCHITECTURE.md`; `core/urls.py`; `core/settings/base.py`; figura `DIA-SYS-006` y ficha en `docs/ingenieria/diagramas/fichas/DIA-SYS-006-componentes-general.md` | El documento de arquitectura contiene notas desactualizadas; se contrastó con código actual. |
| 5.1 Policies | Separación del motor común y contratos específicos | `apps/modalidades/policies.py`; archivos policy por modalidad; figura `DIA-MOD-002` | Modelo UML existente; no se universalizan reglas. |
| 6 Tecnologías y versiones | Python, Django, DRF, JWT, React, Vite, Tailwind, PostgreSQL, Node y Compose | `requirements.txt`; `package.json`; `README.md`; `Dockerfile.backend`; `Dockerfile.frontend`; `docker-compose.yml`; `core/settings/base.py` | Versiones declaradas, no todas runtime. Discrepancias README Node 20 / Docker Node 22; TZ `ENVIRONMENT.md` Lima / settings y ejemplo La Paz; auditoría F11 access JWT 60 min / settings 15 min. |
| 7 Requisitos | Herramientas declaradas para desarrollo/Compose/despliegue | `README.md`; `docs/DEPLOYMENT.md`; Dockerfiles; Compose | No hay dimensionamiento CPU/RAM ni requisitos no funcionales de infraestructura. |
| 8 Estructura | Carpetas y responsabilidades por aplicación | `core/settings/base.py` (`INSTALLED_APPS`); árboles `apps/`, `src/`, `docs/` | Inventario del código. `apps/seguimiento/` se presenta con alcance prudente, sin atribuir funciones no comprobadas. |
| 9 Backend | Proyecto Django, apps, vistas, serializers, permisos, servicios y transacciones | `core/settings/`; `core/urls.py`; `apps/usuarios/`; `apps/academico/`; `apps/postulantes/`; `apps/documentos/`; `apps/modalidades/`; `apps/notificaciones/`; `apps/reportes/` | Revisión estática de archivos y funciones. |
| 10 Frontend | React, React Router, layouts, páginas, servicios Axios, sesión | `src/main.jsx`; `src/routes/AppRoutes.jsx`; `src/layouts/`; `src/pages/`; `src/services/api.js`; `src/config/env.js` | El estado runtime y mensajes live no se inspeccionaron. |
| 11–12 Datos/modelo | PostgreSQL, ORM, media, entidades y relaciones representativas | `core/settings/base.py`; `apps/*/models.py`; `apps/*/migrations/`; figuras `DIA-POS-001`, `DIA-DOC-101`, `DIA-POS-105` | ER de fase 10 es lógico; esquema instalado y migraciones aplicadas no fueron consultados. |
| 13 API REST | Prefijo y familias de endpoints, OpenAPI | `core/urls.py`; `apps/*/urls.py`; `drf-spectacular` en `core/settings/base.py` | No se obtuvieron métodos/cuerpos del schema dinámico ni se verificaron permisos en sesión. |
| 14 Autenticación | JWT, access 15 min, refresh 7 días, rotación/blacklist, localStorage e interceptores | `core/settings/base.py`; `apps/usuarios/urls.py`; `apps/usuarios/views.py`; `src/services/api.js` | Configuración declarada y código; runtime no consultado. |
| 15 Autorización | Roles, capabilities UI y permisos de servidor/objeto/policy | `core/permissions.py`; `apps/usuarios/services.py`; `apps/usuarios/views.py`; vistas de dominio; `src/routes/AppRoutes.jsx` | Roles y rutas estáticas; no se autenticó con cada rol. |
| 16 Configuración | Variables sin valores secretos; DB, CORS/CSRF, puertos, API, logging | `.env.example`; `docs/ENVIRONMENT.md`; `core/settings/{__init__,base,development,production}.py`; Compose | `.env` no se leyó. No hay valores de secretos en la matriz/manual. |
| 17 Instalación | Venv, dependencias, .env, migración, seed, superusuario y frontend | `README.md` | Comandos transcritos, no ejecutados. `migrate`, seed y createsuperuser escriben datos/esquema. |
| 18 Docker | Servicios, volúmenes, defaults de puertos y secuencia entrypoint | `docker-compose.yml`; `Dockerfile.backend`; `Dockerfile.frontend`; `docker/backend/entrypoint.sh`; figura `DIA-SYS-007` | No se inició Compose; arrancarlo ejecuta migrate y puede crear superusuario. Desarrollo, no producción. |
| 19 Migraciones | Comandos de comprobación/plan/aplicación | `README.md`; `docs/TESTING.md`; `docker/backend/entrypoint.sh`; `apps/*/migrations/` | No se consultó esquema ni se ejecutó migración. |
| 20 Pruebas | Scripts backend y frontend | `README.md`; `docs/TESTING.md`; `package.json`; `apps/**/tests*`; `src/**/*.test.*` | Suites y scripts enumerados; no corridos ni declarados aprobados. |
| 21 Diagnóstico | Logging Django y ejemplos de consulta de logs Compose | `core/settings/development.py`; `core/settings/production.py`; Compose | No se leyeron logs de ejecución ni se ejecutaron comandos. |
| 22 Backup/restauración | `pg_dump`, `pg_restore`, media, checksums y verificación aislada | `docs/DEPLOYMENT.md`; Compose | Procedimiento documental, no probado; sin evidencia de copia vigente, retención/cifrado aprobados o restauración exitosa. |
| 23 Seguridad | Validadores, JWT, permisos, settings production, archivos, logging y datos personales | `core/settings/base.py`; `core/settings/production.py`; `core/permissions.py`; `apps/usuarios/models.py`; `apps/documentos/models.py`; `apps/documentos/services.py` | No se infieren CSP/HSTS, antivirus, rate limit general, cifrado backup o monitoreo no comprobados. |
| 24 Mantenimiento | Dependencias, release, migraciones, logs, media y respaldos | `docs/TESTING.md`; `docs/DEPLOYMENT.md`; `AGENTS.md`; manifests | Recomendaciones documentales; no se realizaron cambios funcionales. |
| 25 Despliegue | Guía WSGI, estáticos, SPA, variables y faltantes | `docs/DEPLOYMENT.md`; `requirements.txt`; Dockerfiles; Compose | Guía describe opción, pero no hay Gunicorn, manifiesto proveedor ni despliegue validado en repo. |
| 26 Diagramas | Componentes, modalidad, Compose, expediente, ER lógico, Tesis y Trabajo Dirigido | `fase-9/png/`, `fase-9/svg/`, `fase-9/fuentes/`; `fase-9/inventario-adaptaciones.md`; `fase-10/inventario-figuras.md`; fase 11 `inventario-diagramas-reutilizables.md` | Ocho figuras existentes; no se editaron ni regeneraron originales. SVG es fuente ampliable. |
| 27 Glosario / 28 anexos | Términos, mapa API, comandos y diagnóstico | Fuentes citadas arriba; `core/urls.py`; README y DEPLOYMENT | Resumen editorial; revalidar contrato API en release. |
| Referencias | Rutas reales de documentación académica y discrepancia de fase 10 | `docs/ingenieria/presentacion-academica/README.md`; documentos de fase 9, 10 y 11; `control-final-pendiente.json`, `publicacion-pendiente.json`, `estado-entrega.json`, `informe-fase-10.md` | Fase 8 no tiene subcarpeta: archivos principales están en nivel `presentacion-academica/`. La nota residual de publicación de fase 10 queda sin editar. |

## Reglas de lectura

- “Verificado” significa localizado en código/configuración/documentación versionada o renderizado del DOCX; no significa que el sistema esté corriendo.
- “Documentado/no ejecutado” identifica comandos operativos copiados de guías, sin afirmar su resultado.
- Las capturas funcionales del Manual de Usuario son otro entregable y no se reutilizaron ni editaron aquí.
- La documentación de arquitectura/ambiente contiene discrepancias históricas; consultar fuente indicada en cada fila y código actual.
