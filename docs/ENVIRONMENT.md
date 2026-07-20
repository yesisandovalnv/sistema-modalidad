# Variables de entorno

Parta de `.env.example`; `.env` nunca debe versionarse.

| Variable | Uso |
|---|---|
| `DJANGO_ENV` | `development` o `production` |
| `SECRET_KEY` | Obligatoria y secreta en producción |
| `DEBUG` | Debe ser `False` en producción |
| `ALLOWED_HOSTS` | Hosts explícitos separados por comas |
| `CORS_ALLOWED_ORIGINS` | Orígenes frontend completos y explícitos |
| `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS confiables |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL |
| `REPORT_EXPORT_MAX_ROWS` | Límite de exportación CSV |
| `VITE_API_BASE_URL` | Origen público del backend, sin `/api` y sin barra final |

Producción rechaza el arranque sin `SECRET_KEY` y `ALLOWED_HOSTS`. No use comodines. `USE_TZ=True` y la zona configurada es `America/Lima`; el navegador presenta fechas en su zona local.
