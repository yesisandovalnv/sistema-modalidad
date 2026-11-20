"""Minimal lab-only settings. No business apps or implicit .env loading."""
from pathlib import Path
import re

from django.core.exceptions import ImproperlyConfigured
from dotenv import dotenv_values

_values = dotenv_values('/run/config/lab.env')
_instance = _values.get('LAB_INSTANCE_ID') or ''
_cluster = _values.get('LAB_SYSTEM_IDENTIFIER') or ''
if not re.fullmatch(r'[a-f0-9]{12}', _instance):
    raise ImproperlyConfigured('Falta la identidad exclusiva del laboratorio.')
if not re.fullmatch(r'[1-9][0-9]{0,19}', _cluster):
    raise ImproperlyConfigured('Falta el identificador acreditado del laboratorio.')
_password = Path('/run/secrets/lab_executor_password').read_text(encoding='utf-8').strip()
if len(_password) < 32:
    raise ImproperlyConfigured('Falta el secreto exclusivo del ejecutor.')

SECRET_KEY = 'disposable-runner-lab-only'
DEBUG = False
INSTALLED_APPS = []
USE_TZ = True
TIME_ZONE = 'America/La_Paz'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DATABASES = {'default': {
    'ENGINE': 'testing_backend', 'NAME': 'postgres',
    'USER': 'lab_test_executor', 'PASSWORD': _password,
    'HOST': 'postgres-lab', 'PORT': '5432', 'CONN_MAX_AGE': 0,
    'OPTIONS': {'connect_timeout': 5}, 'TEST': {'NAME': None},
    'TEST_GUARD': {'PROFILE': 'runner_lab_docker', 'SYSTEM_IDENTIFIER': _cluster},
}}
TEST_DB_SYSTEM_IDENTIFIER = _cluster
TEST_RUNNER = 'test_runner.IsolatedPostgreSQLTestRunner'
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
