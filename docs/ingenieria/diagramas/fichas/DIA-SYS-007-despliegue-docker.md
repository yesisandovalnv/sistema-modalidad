# DIA-SYS-007 — Despliegue Docker de desarrollo declarado

## Objetivo y alcance

Separar navegador, publicaciones de puertos, red implícita y volúmenes

Tipo: Despliegue. Elementos: Tres servicios, red implícita, puertos y montajes.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [Dockerfile.backend](../../../../Dockerfile.backend)
- [Dockerfile.frontend](../../../../Dockerfile.frontend)
- [core/settings/production.py](../../../../core/settings/production.py)
- [docker-compose.yml](../../../../docker-compose.yml)
- [docker/backend/entrypoint.sh](../../../../docker/backend/entrypoint.sh)
- [src/config/env.js](../../../../src/config/env.js)

## Lectura y limitaciones

Infraestructura declarada de desarrollo, no contenedores observados. No se ejecutó Docker ni se leyó .env. Producción no representada como desplegada; no se afirma proxy, TLS terminado o nube.

[Fuente PlantUML](../fuentes/DIA-SYS-007-despliegue-docker.puml). [SVG local](../renderizados/DIA-SYS-007-despliegue-docker.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
