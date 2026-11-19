# Auditoría técnica

## Arquitectura y tecnologías declaradas

Arquitectura cliente-servidor: Django/DRF entrega API REST y React/Vite consume endpoints; PostgreSQL es el motor configurado; Docker Compose declara servicios `db`, `backend` y `frontend`.

| Componente | Versión/configuración observada | Evidencia |
| --- | --- | --- |
| Python | entorno local reportó 3.12.7 | intérprete `.venv` |
| Django | 6.0.7 fijado | `requirements.txt` |
| Django REST Framework | 3.17.1 fijado | `requirements.txt` |
| React | ^19.2.7 | `package.json` |
| Vite | ^8.1.1 | `package.json`, `vite.config.js` |
| Tailwind CSS | ^4.3.2, plugin Vite | `package.json`, `vite.config.js` |
| PostgreSQL | `postgres:15` en Compose; driver psycopg2-binary 2.9.12 | `docker-compose.yml`, `requirements.txt` |
| Docker Compose | archivo Compose v2 con servicios y volumen | `docker-compose.yml`; versión CLI no consultada |

Las versiones fijadas en manifiestos no son necesariamente las versiones actualmente ejecutándose. No se inspeccionaron contenedores ni servidores.

## Backend, módulos y API

Proyecto Django `core`; aplicaciones: `usuarios`, `academico`, `postulantes`, `documentos`, `seguimiento`, `modalidades`, `notificaciones`, `reportes`. Enrutamiento principal en `core/urls.py`; módulos usan routers DRF. API raíz: `/api/v1/`. OpenAPI/Swagger se exponen en `/api/schema/` y `/api/docs/`.

Familias de endpoint incluyen auth (`/auth/login`, `student-login`, `refresh`, `logout`, `me`), académicos/catálogos, usuarios, postulaciones, asignaciones, seguimiento por etapa, eventos de defensa, gestión complementaria, documentos, reportes y operaciones específicas de Examen, Excelencia, Diplomado y Trabajo Dirigido. Proyecto de Grado conserva operación compartida de resultado/cierre. Los métodos y permisos exactos se definen en cada vista; consultar `core/urls.py`, `apps/*/urls.py`, vistas API y `core/permissions.py`.

## Frontend

React en `src/`, rutas con React Router (`src/routes/AppRoutes.jsx`), layouts autenticado/entrada, páginas por módulo, servicios Axios y contexto de autenticación. `src/services/api.js` adjunta JWT, renueva access token ante 401 y expira sesión si falla renovación. `src/config/env.js` y Vite configuran URL del backend. Tailwind se integra mediante `@tailwindcss/vite`; `src/index.css`/`src/App.css` contienen estilos.

## Datos y migraciones

PostgreSQL mediante Django ORM, configuración en `core/settings.py`; modelo de usuario propio `apps.usuarios.CustomUser`. Entidades distribuidas entre apps académica, postulantes, documentos, defensas/asignaciones, seguimiento, notificaciones y auditoría. El directorio de migraciones existe en cada app; la inspección identificó seis directorios con diferente cantidad de archivos, sin ejecutar `showmigrations` ni leer base de datos. El esquema instalado y su estado real quedan sin verificar.

## Docker y variables

`docker-compose.yml` declara PostgreSQL `postgres:15`, persistencia nombrada `sistema_modalidad_data`, backend en puerto de contenedor 8000 y Vite en 5173. Valores publicados por defecto: DB 5540, backend 19001, frontend 15174, sobreescribibles con variables. El backend carga `.env`; `DB_HOST=db` dentro Compose. `Dockerfile.backend` y `Dockerfile.frontend` describen imágenes.

Variables documentadas en `.env.example`: `DJANGO_ENV`, `TIME_ZONE`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, puertos, CORS/CSRF, DB, límite de exportación y URL API. `.env` existe localmente y no se leyó ni incluirá en documentación; no divulgar secretos.

## Autenticación, autorización y seguridad

DRF declara JWT como autenticación y `IsAuthenticated` por defecto (`core/settings.py`). SimpleJWT configura access 60 minutos, refresh 7 días, rotación y blacklist posterior; el cliente guarda tokens en localStorage. Roles de negocio en `core/permissions.py`: administrador, administración, docente, estudiante. Vistas añaden permisos de lectura/escritura, propiedad y relación.

Configuración observada incluye `DEBUG=True` y clave fallback `django-insecure-default`; apropiada para desarrollo local, no acredita perfil seguro de producción. Antes del manual técnico definitivo debe describirse despliegue seguro con configuración real aprobada, no recomendar usar esos defaults en producción. También deben verificarse HTTPS, secretos, CORS/hosts, acceso a `/admin/`, protección de archivos media, límites de carga, logs y política de retención. No se infiere que estén cubiertos por solo observar settings.

## Pruebas, mantenimiento, respaldos y recuperación

Hay suites Django por app y pruebas React/Vitest; `package.json` define scripts de desarrollo/build/test/lint. No se ejecutaron. La documentación de despliegue existente es `docs/DEPLOYMENT.md`; Docker monta `./backups` como inicialización de base vacía, pero esa carpeta no constituye por sí misma un procedimiento de respaldo periódico. No se comprobó backup reciente ni se ensayó restauración.

Manual técnico debe recuperar pasos exactos de `README.md`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, Dockerfiles y scripts vigentes, y documentar por separado: respaldo lógico, protección de adjuntos/media, cifrado/retención, restauración en instancia aislada, migraciones controladas y validación posterior. Hasta verificar operativamente, no declarar esos procesos probados.

## Pendientes técnicos para autoría

Confirmar versiones runtime (imágenes, Django/node dentro de contenedores), variables de despliegue reales sin mostrar secretos, estado de migraciones en entorno dedicado, endpoints/contratos desde OpenAPI, alcance de permisos por acción, procedimiento aprobado de backup/restauración, seguridad de producción y estrategia de mantenimiento. No consultar DB ni levantar servicios en fase 11.
