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

API: `http://localhost:8000/api/`; frontend: `http://localhost:5173/`; salud: `GET /api/health/`; OpenAPI: `GET /api/schema/`.

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
