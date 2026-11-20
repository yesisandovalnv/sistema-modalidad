"""Independent configuration for the disposable runner lab. No business apps.

The runner_lab profile is pinned centrally to its endpoint and login role.
This configuration does not authorize starting containers or running tests.
"""
from pathlib import Path
import re

from django.core.exceptions import ImproperlyConfigured
from dotenv import dotenv_values

_directory = Path(__file__).resolve().parent / "docker" / "runner_lab"
_values = dotenv_values(_directory / "lab.env.local")
_instance = _values.get("LAB_INSTANCE_ID", "")
_cluster = _values.get("LAB_SYSTEM_IDENTIFIER", "")
if not re.fullmatch(r"[a-f0-9]{12}", _instance or ""):
    raise ImproperlyConfigured("Falta una identidad nueva del laboratorio.")
if not (_cluster or "").isdecimal():
    raise ImproperlyConfigured("Falta verificar el identificador del nuevo clúster.")
_password_file = _directory / "secrets.local" / "executor_password"
if not _password_file.is_file():
    raise ImproperlyConfigured("Falta el secreto exclusivo del ejecutor del laboratorio.")
_password = _password_file.read_text(encoding="utf-8").strip()
if len(_password) < 32:
    raise ImproperlyConfigured("El secreto del ejecutor debe tener al menos 32 caracteres.")

SECRET_KEY = "disposable-runner-lab-only"
DEBUG = False
INSTALLED_APPS = []
USE_TZ = True
TIME_ZONE = "America/La_Paz"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
DATABASES = {
    "default": {
        "ENGINE": "testing_backend",
        "NAME": "postgres",
        "USER": "lab_test_executor",
        "PASSWORD": _password,
        "HOST": "127.0.0.1",
        "PORT": "5542",
        "CONN_MAX_AGE": 0,
        "TEST_GUARD": {"PROFILE": "runner_lab", "SYSTEM_IDENTIFIER": _cluster},
        "OPTIONS": {"connect_timeout": 5},
        "TEST": {"NAME": None},
    }
}
TEST_DB_SYSTEM_IDENTIFIER = _cluster
TEST_RUNNER = "test_runner.IsolatedPostgreSQLTestRunner"
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
