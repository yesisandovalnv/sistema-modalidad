# Infraestructura declarada

Estado: IMPLEMENTADO para archivos; despliegue efectivo PENDIENTE.

Fuentes: [Compose](../../../docker-compose.yml), [backend](../../../Dockerfile.backend), [frontend](../../../Dockerfile.frontend), [arranque](../../../docker/backend/entrypoint.sh), [producción](../../../core/settings/production.py).

Compose declara PostgreSQL 15, Python 3.12 y Node 22. Hay volúmenes de datos y media, dependencias y healthcheck PostgreSQL. Los servidores declarados son Django runserver y Vite.

El arranque ejecuta migraciones y puede crear superusuario: no usarlo para una comprobación de solo lectura. Configuración potencial de producción no demuestra proxy o TLS efectivos. No se confirman correo, firma digital, pagos, SSO o colas externas. No incorporar secretos ni datos personales.
