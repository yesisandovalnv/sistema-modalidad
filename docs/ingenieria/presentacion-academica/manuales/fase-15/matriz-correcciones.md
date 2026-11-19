# Matriz de correcciones de fase 15

| Hallazgo | Evidencia actual | Histórico/documentado | No verificable en esta fase | Cambio en Manual Técnico | Manual de Usuario |
|---|---|---|---|---|---|
| Node 20 / Node 22 | `Dockerfile.frontend` usa `node:22-alpine`; `package.json` define scripts y rangos de paquetes. CLI de esta estación: Node 25.6.1 y npm 11.9.0. | README y `docs/DEPLOYMENT.md` documentan Node 20. | Versión normativa para desarrollo/CI, versión de imagen ejecutada y entorno productivo. Los tres valores describen contextos distintos; no se infiere una versión objetivo común. | Tabla de tecnologías y requisitos locales ahora distingue guías Node 20, imagen Node 22 y CLI local Node 25.6.1; deja objetivo común pendiente. El apartado de despliegue señala que la receta está documentada, no ejecutada. | No aplica; no se atribuye Node al usuario final. |
| Zona horaria | `core/settings/base.py` usa `America/La_Paz` como predeterminado; `.env.example` propone ese valor. | `docs/ENVIRONMENT.md` dice `America/Lima`. | `.env` real y valor efectivo de procesos activos. | Apartado de entorno expresa que `America/La_Paz` es predeterminado y que el valor efectivo depende del entorno; resumen registra la documentación conflictiva. | Sin cambios. |
| Access JWT 15 / 60 min | `core/settings/base.py`: access 15 min, refresh 7 días; `SimpleJWT` 5.5.1 instalado en `.venv` local. | Fase 11 consignó 60 min; el informe técnico previo ya marcaba ese dato como histórico. | Configuración efectiva de un servidor desplegado. | Tabla de tecnología y resumen distinguen valor del código de cifra histórica, sin afirmar runtime. El texto de autenticación ya tenía 15 min y se mantuvo. | Sin cambios. |
| Policies ausentes en arquitectura | `apps/modalidades/` contiene policies por modalidad; `ModalidadPolicyRegistry` y pruebas de policy están presentes. El texto del manual ya describe decisiones específicas por policy. | `docs/ARCHITECTURE.md` conserva una afirmación de que varias modalidades no tienen normativa implementada. | Alcance normativo externo y configuración/policies del despliegue. | Resumen de discrepancias actualiza el estado del repositorio e identifica el texto antiguo; no se cambiaron diagramas ni archivos de arquitectura. No se equipara policy existente con validación normativa institucional completa. | No afecta las explicaciones diferenciadas por modalidad. |
| Rol `ADMINISTRACION` | `apps/usuarios/services.py`: el conjunto `ADMIN_CODES` contiene solo `ADMINISTRADOR`; `resolve` deja capacidades en falso para `ADMINISTRACION`. `core.permissions.is_staff_user` y pruebas de autoridad de rol distinguen administrador/superusuario. | Auditoría funcional de fase 11 atribuía capacidades de lectura; el informe de validación del Manual de Usuario ya señaló la discrepancia. | Acceso de una cuenta real a endpoints y datos en instalación activa. | Sin cambios necesarios para permisos; el capítulo de autorización ya diferencia capabilities informativas del enforcement del backend. | Se confirmó que la tabla de roles ya declara que `ADMINISTRACION` no recibe capacidades del servicio y no presume acceso por nombre. No se modificó el DOCX ni sus 24 procedimientos. |

## Otras actualizaciones de evidencia local

Se reflejaron versiones que se pudieron consultar sin instalación ni cambios: Python 3.12.7, Django 6.0.7, DRF 3.17.1, SimpleJWT 5.5.1 y psycopg2-binary 2.9.12 en `.venv`; React 19.2.7, React Router DOM 7.18.1, Vite 8.1.4 y Tailwind CSS 4.3.2 en `node_modules`. Se etiquetan como estación local, no como versiones de producción/containers. La imagen PostgreSQL `postgres:15` continúa como tag declarado; no se comprobó servidor activo.

El resumen de límites se ajustó para declarar que instalación, migraciones, pruebas, build, backup y restore no se ejecutaron. La guía de despliegue propuesta también se identifica como documentación no ejecutada y no certifica un despliegue productivo.

## Apartados afectados del Manual Técnico

- Límite de evidencia y versiones (tabla de tecnologías).
- Requisitos de desarrollo local.
- Resumen de discrepancias técnicas.
- Configuración de zona horaria.
- Consideraciones de despliegue y sus advertencias de verificación.

No se modificaron el índice, figuras, diagramas, referencias UML, API, migraciones o procedimientos de restauración. No se aplicó ningún cambio a `docs/` fuera de `manuales/fase-15/` salvo el propio `manual-tecnico.docx` autorizado.
