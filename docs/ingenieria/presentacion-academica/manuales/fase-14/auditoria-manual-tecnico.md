# Auditoría académica — Manual Técnico

**Artefacto:** `../manual-tecnico.docx`  
**Estado heredado:** borrador técnico completo para revisión académica y validación operativa.  
**Fuentes auxiliares:** `../informe-validacion-tecnico.md`, `../matriz-trazabilidad-manual-tecnico.md`, `../../fase-8/` (ruta real documentada en fase 13), fases 9–11, código y archivos de configuración.

## Resultado ejecutivo

El informe de fase 13 registra 18 páginas, 28 capítulos, 30 tablas y ocho diagramas/figuras UML reutilizados; declara que las 18 páginas se renderizaron e inspeccionaron visualmente, sin cortes ni superposiciones observados. La estructura técnica es amplia. Continúa siendo borrador: no se ejecutaron instalación, migraciones, pruebas, despliegue, respaldo/restauración ni verificación de runtime/BD. Varios comandos se transcribieron de guías, no se probaron.

## Verificación documental del contenido

| Área | Evidencia/repositorio | Evaluación |
|---|---|---|
| Backend | `requirements.txt`, `core/settings/`, `apps/` | Contrastar versiones bloqueadas con importaciones de `.venv`; el runtime desplegado no fue consultado. |
| Frontend | `package.json`, lockfile y `src/` | Manifest declara rangos; `node_modules` local dio versiones instaladas; no prueba la imagen ni el sitio publicado. |
| Datos | `apps/*/models.py`, migraciones y `docker-compose.yml` | PostgreSQL está declarado como `postgres:15`; no se inspeccionó instancia ni esquema aplicado. |
| API | `apps/*/urls.py`, views/serializers y `src/services/` | El contenido debe presentarse como contrato del código de esta rama; no se comprobó OpenAPI/runtime. |
| Autenticación/permisos | `core/settings/base.py`, `apps/usuarios/`, `src/routes/AppRoutes.jsx` | JWT y controles documentales visibles; el permiso efectivo se decide también en endpoints y alcance de objeto. |
| Docker | `docker-compose.yml`, Dockerfiles | Configuración local/de desarrollo. Leer comandos no acredita ejecución ni aptitud productiva. |
| Tests | archivos `tests*.py`, pruebas React y scripts | Se identifican suites configuradas; no se ejecutaron en fase 14. |
| UML | inventario de fases 9–10 y ocho imágenes incorporadas | Se reutilizaron figuras; inspección previa es la evidencia disponible, la legibilidad de impresión requiere revisión física. |

## Hallazgos que afectan exactitud

1. **Node:** README y despliegue piden Node 20; `Dockerfile.frontend` usa `node:22-alpine`; CLI local consultado indica Node v25.6.1. El manual debe separar requisito local documentado, base de imagen y herramienta observada; fijar una versión objetivo con responsable técnico.
2. **Zona horaria:** `core/settings/base.py` usa `TIME_ZONE` con valor por defecto `America/La_Paz`; `.env.example` también indica esa zona; `docs/ENVIRONMENT.md` afirma `America/Lima`. El valor efectivo del entorno no se leyó.
3. **JWT:** `core/settings/base.py` fija `ACCESS_TOKEN_LIFETIME` a 15 minutos, refresh a 7 días y rotación/blacklist según configuración. La cifra de 60 minutos en fase 11 es histórica y contradice el código actual. El entorno en ejecución no se comprobó.
4. **Arquitectura:** `docs/ARCHITECTURE.md` dice que Tesis, Trabajo Dirigido y otras modalidades no tienen normativa implementada. El árbol actual contiene policies por modalidad y pruebas de registro/comportamiento. Esa afirmación está desactualizada respecto del código de esta rama; revisar el diagrama/descripción con evidencia de cada policy antes de sustituirla.
5. **Docker/despliegue:** `docker-compose.yml` publica backend y frontend para desarrollo, con imagen PostgreSQL 15; no debe describirse como receta productiva. `docs/DEPLOYMENT.md` menciona Gunicorn, que el informe técnico señala ausente de `requirements.txt`, y no se encontró manifiesto productivo.
6. **Respaldo/restauración:** `docs/DEPLOYMENT.md` presenta `pg_dump --format=custom` y `pg_restore --clean --if-exists`. Son instrucciones documentadas, no operaciones ejecutadas ni política institucional probada; `--clean` elimina objetos existentes en destino, por lo que exige destino aislado, autorización y revisión antes de utilizarse.

## Versiones comprobadas sin modificar el entorno

Consulta local de solo lectura: Python global y de `.venv` 3.12.7; Django 6.0.7, Django REST Framework 3.17.1 y SimpleJWT 5.5.1 importados desde `.venv`; CLI Node v25.6.1 y npm 11.9.0; paquetes locales React 19.2.7, Vite 8.1.4 y Tailwind CSS 4.3.2; Docker CLI 29.8.2 y Compose v5.5.1. Estos resultados describen herramientas/paquetes presentes en esta estación, no producción.

PostgreSQL runtime, versiones de paquetes dentro de los contenedores, estado de migraciones aplicadas y zona/JWT efectivos no se comprobaron. `postgres:15` es una etiqueta de imagen declarada, no versión confirmada de servidor iniciado.

## Comandos y ejecución

No se ejecutó ningún comando de instalación, `docker compose up`, migración, test, build, backup o restore. Antes de presentar esos pasos como operativos, comparar cada literal con `README.md`, `docs/DEPLOYMENT.md`, `docker-compose.yml`, Dockerfiles, `package.json` y el manifiesto Python vigente. Marcar explícitamente comandos documentados/no ejecutados y acciones que escriben o reemplazan recursos. No afirmar que se validó restauración o despliegue.

## Calidad académica y dictamen

La revisión previa acredita render de 18 páginas y ocho figuras incorporadas preservando proporción; dos páginas apaisadas se destinan a diagramas. No acredita lectura a tamaño impreso ni versión de Office institucional. Portada evita inventar autoría/autoridades. El índice y paginación fueron revisados en el render anterior; cualquier modificación exige recalcular campos y volver a inspeccionar.

**Borrador técnicamente estructurado, no guía de operación certificada.** Corregir afirmaciones documentales identificadas, mantener configuración real/documentada/histórica/pendiente separada y dejar claros los comandos no ejecutados y los límites del entorno.
