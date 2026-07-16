#!/bin/sh
set -e

echo "Esperando PostgreSQL..."
until python - <<'PY'
import os
import psycopg2
conn = psycopg2.connect(
    dbname=os.environ.get('DB_NAME', 'sistema_modalidad'),
    user=os.environ.get('DB_USER', 'postgres'),
    password=os.environ.get('DB_PASSWORD', 'postgres'),
    host=os.environ.get('DB_HOST', 'db'),
    port=os.environ.get('DB_PORT', '5432'),
)
conn.close()
PY

do
  sleep 2
done

echo "Aplicando migraciones..."
python manage.py migrate

echo "Creando administrador si no existe..."
python - <<'PY'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if username and password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(
        username=username,
        email=email or '',
        password=password,
        ci=(os.environ.get('DJANGO_SUPERUSER_CI') or f"AUTO-{username}")[:20],
        ru=(os.environ.get('DJANGO_SUPERUSER_RU') or f"AUTO-RU-{username}")[:20],
    )
PY

echo "Iniciando backend..."
exec python manage.py runserver 0.0.0.0:8000
