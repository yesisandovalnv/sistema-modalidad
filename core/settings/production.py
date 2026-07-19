from .base import *
from django.core.exceptions import ImproperlyConfigured

DEBUG = False
if not os.getenv('SECRET_KEY') or SECRET_KEY == 'django-insecure-default':
    raise ImproperlyConfigured('SECRET_KEY debe configurarse explícitamente en producción.')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',') if os.getenv('ALLOWED_HOSTS') else []
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured('ALLOWED_HOSTS debe configurarse explícitamente en producción.')

CSRF_TRUSTED_ORIGINS = [value for value in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if value]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    },
}
