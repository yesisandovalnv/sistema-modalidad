# Despliegue y operación

## Render

Backend: Python 3.12, `pip install -r requirements.txt`, `python manage.py migrate && python manage.py collectstatic --noinput`, y un servidor WSGI como Gunicorn. Configure PostgreSQL y todas las variables de `ENVIRONMENT.md`. El healthcheck es `/api/health/`. El repositorio actual no incluye Gunicorn ni un manifiesto Render; deben configurarse antes de promover la RC.

Frontend: Node 20, `npm ci && npm run build`, directorio publicado `dist`, `VITE_API_BASE_URL=https://<backend>/api` y rewrite SPA de `/*` a `/index.html`.

Docker Compose incluido está orientado a desarrollo: monta el repositorio, usa `runserver` y Vite dev server. No debe tratarse como imagen productiva sin servidor WSGI, servidor estático y almacenamiento persistente de media.

## Backup y restauración

Base y media forman una unidad consistente:

```sh
pg_dump --format=custom --file=backup.dump "$DATABASE_URL"
pg_restore --clean --if-exists --dbname="$RESTORE_DATABASE_URL" backup.dump
```

Respalde `MEDIA_ROOT` en el mismo punto temporal, almacene checksums y pruebe periódicamente la restauración en un ambiente aislado. Nunca restaure sobre producción o desarrollo sin una ventana aprobada. Verifique conteos, migraciones, archivos descargables y healthcheck después de restaurar.
