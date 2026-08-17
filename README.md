# Sistema de Modalidad

Aplicación Django REST Framework + React/Vite para gestión de modalidades de titulación. La única modalidad con política académica completa es **Proyecto de Grado**. Las demás modalidades permanecen bloqueadas para operaciones normativas específicas.

## Desarrollo local

Requisitos: Python 3.12, Node 20 y PostgreSQL. Copie `.env.example` a `.env`, use valores locales y luego ejecute:

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_initial_data
.venv\Scripts\python manage.py createsuperuser
npm ci
npm run dev
```

Para iniciar normalmente con Docker:

```powershell
docker compose up -d
```

URLs predeterminadas: frontend `http://localhost:15174/` y backend `http://localhost:19001/`. La administraciÃ³n de Django estÃ¡ disponible en `http://localhost:19001/admin/`; salud: `GET /api/health/`; OpenAPI: `GET /api/schema/`.

Si otra PC tiene un conflicto de puertos, ajuste solamente su archivo `.env` local, sin modificar `docker-compose.yml` ni el cÃ³digo:

```dotenv
FRONTEND_PORT=15174
BACKEND_PORT=19001
```

## Verificación

```powershell
python manage.py makemigrations --check
python manage.py check
python manage.py test
python manage.py validate_modalidad_policies
npm run lint
npm run test:run
npm run build
docker compose config
```

Consulte [despliegue](docs/DEPLOYMENT.md), [entorno](docs/ENVIRONMENT.md), [pruebas](docs/TESTING.md), [arquitectura](docs/ARCHITECTURE.md) y [checklist de release](docs/RELEASE_CHECKLIST.md).
