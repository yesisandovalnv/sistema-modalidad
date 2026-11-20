"""Fail-closed runner for the two explicit isolated testing profiles."""
import logging
import os
import secrets

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import connections
from django.test.runner import DiscoverRunner

from testing_backend.guard import STATE_KEY, maintenance, validate_profile

logger = logging.getLogger(__name__)


class IsolatedPostgreSQLTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        if self.keepdb or kwargs.get("keepdb"):
            raise ImproperlyConfigured("--keepdb está prohibido.")
        if set(connections) != {"default"}:
            raise ImproperlyConfigured("Solo se admite default, sin mirrors.")
        connection = connections["default"]
        config = connection.settings_dict
        profile, cluster = validate_profile(config)
        if cluster != getattr(settings, "TEST_DB_SYSTEM_IDENTIFIER", None):
            raise ImproperlyConfigured("Identificador esperado incompleto o inconsistente.")
        if config["ENGINE"] != "testing_backend":
            raise ImproperlyConfigured("Se requiere el backend protegido.")
        if STATE_KEY in config:
            raise ImproperlyConfigured("No se permite reutilizar una ejecución.")
        if config["TEST"].get("MIRROR") or config["TEST"].get("TEMPLATE"):
            raise ImproperlyConfigured("No se permiten mirrors ni templates externos.")
        connection.close()
        config[STATE_KEY] = {
            "token": secrets.token_hex(32), "pid": os.getpid(),
            "cluster": cluster, "profile": profile, "records": {},
            "root": "test_sm_" + secrets.token_hex(16),
        }
        config["TEST"]["NAME"] = config[STATE_KEY]["root"]
        with maintenance(config):
            pass
        logger.warning("testing_run_started database=%s cluster=%s pid=%s",
                       config["TEST"]["NAME"], config[STATE_KEY]["cluster"], os.getpid())
        try:
            return super().setup_databases(**kwargs)
        except BaseException:
            # Uncertain CREATEs are never automatically adopted or destroyed.
            logger.exception("testing_setup_interrupted; retained=%s",
                             list(config[STATE_KEY]["records"]))
            raise
