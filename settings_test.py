"""Django settings guarded for the dedicated local PostgreSQL test instance."""

import os
from pathlib import Path

from dotenv import dotenv_values
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent
TEST_ENV_FILE = BASE_DIR / ".env.test"
if not TEST_ENV_FILE.is_file():
    raise ImproperlyConfigured(
        "Falta .env.test. Crea ese archivo desde .env.test.example y define "
        "una contraseña exclusiva para testing."
    )

_test_file_values = dotenv_values(TEST_ENV_FILE)


def _required_test_value(name):
    value = os.environ.get(name) or _test_file_values.get(name)
    if not value or not value.strip():
        raise ImproperlyConfigured(f"Falta la variable obligatoria {name} de .env.test.")
    return value.strip()


_db_name = _required_test_value("TEST_DB_NAME")
_db_user = _required_test_value("TEST_DB_USER")
_db_password = _required_test_value("TEST_DB_PASSWORD")
_db_system_identifier = _required_test_value("TEST_DB_SYSTEM_IDENTIFIER")

if _db_name != "sistema_modalidad_test":
    raise ImproperlyConfigured("TEST_DB_NAME debe ser exactamente sistema_modalidad_test.")
if _db_user != "modalidad_test":
    raise ImproperlyConfigured("TEST_DB_USER debe ser exactamente modalidad_test.")
if not _db_system_identifier.isdecimal():
    raise ImproperlyConfigured("TEST_DB_SYSTEM_IDENTIFIER debe ser el identificador del clúster de pruebas.")

# Prevent the shared settings package from reading the production .env file.
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
os.environ["DJANGO_ENV"] = "development"
os.environ["DB_NAME"] = _db_name
os.environ["DB_USER"] = _db_user
os.environ["DB_PASSWORD"] = _db_password
os.environ["DB_HOST"] = "127.0.0.1"
os.environ["DB_PORT"] = "5541"
os.environ["SECRET_KEY"] = "test-only-not-a-production-secret"
os.environ["DEBUG"] = "False"
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1"
os.environ["TIME_ZONE"] = "America/La_Paz"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost"
os.environ["REPORT_EXPORT_MAX_ROWS"] = "5000"

from core.settings import *  # noqa: E402,F403


if DATABASES["default"]["HOST"] != "127.0.0.1" or DATABASES["default"]["PORT"] != "5541":
    raise ImproperlyConfigured("El runner solo puede apuntar a 127.0.0.1:5541.")
if DATABASES["default"]["NAME"] == "sistema_modalidad":
    raise ImproperlyConfigured("Se rechazó la base PostgreSQL principal.")

DATABASES["default"].update(
    {
        "ENGINE": "testing_backend",
        "NAME": _db_name,
        "USER": _db_user,
        "PASSWORD": _db_password,
        "HOST": "127.0.0.1",
        "PORT": "5541",
        "CONN_MAX_AGE": 0,
        "TEST_GUARD": {"PROFILE": "legacy", "SYSTEM_IDENTIFIER": _db_system_identifier},
        # Assigned once per execution by the protected runner.
        "TEST": {"NAME": None},
    }
)

TEST_DB_SYSTEM_IDENTIFIER = _db_system_identifier
TEST_RUNNER = "test_runner.IsolatedPostgreSQLTestRunner"
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_FROM_EMAIL = "no-reply@example.test"
