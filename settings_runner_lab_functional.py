"""Prepared functional-test settings. Requires separate database authorization."""
import os

os.environ['PYTHON_DOTENV_DISABLED'] = '1'
os.environ['DJANGO_ENV'] = 'development'
from settings_runner_lab_container import DATABASES as _lab_databases
from settings_runner_lab_container import TEST_DB_SYSTEM_IDENTIFIER

# Set every DB value before importing shared defaults. No production .env mount.
for _key, _value in {'DB_HOST': 'postgres-lab', 'DB_PORT': '5432',
                     'DB_NAME': 'postgres', 'DB_USER': 'lab_test_executor',
                     'DB_PASSWORD': _lab_databases['default']['PASSWORD'],
                     'SECRET_KEY': 'disposable-functional-lab-only',
                     'DEBUG': 'False', 'ALLOWED_HOSTS': 'testserver,localhost'}.items():
    os.environ[_key] = _value

from core.settings import *  # noqa: E402,F403

DATABASES = _lab_databases
TEST_DB_SYSTEM_IDENTIFIER = DATABASES['default']['TEST_GUARD']['SYSTEM_IDENTIFIER']
TEST_RUNNER = 'test_runner.IsolatedPostgreSQLTestRunner'
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
DEFAULT_FROM_EMAIL = 'no-reply@example.test'
MEDIA_ROOT = '/tmp/lab_media'
DEBUG = False
ALLOWED_HOSTS = ['testserver', 'localhost']
