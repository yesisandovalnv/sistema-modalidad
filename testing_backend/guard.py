"""No fallback connections, DROP retries, or adoption of previous databases."""
from contextlib import contextmanager
import logging
import os
import re

import psycopg2
from django.core.exceptions import ImproperlyConfigured

STATE_KEY = "_ISOLATED_TEST_RUN"
logger = logging.getLogger(__name__)

# Closed allowlist. A profile cannot supply its own endpoint or login role.
PROFILES = {
    "legacy": ("127.0.0.1", "5541", "modalidad_test"),
    "runner_lab": ("127.0.0.1", "5542", "lab_test_executor"),
    "runner_lab_docker": ("postgres-lab", "5432", "lab_test_executor"),
}


def refuse(message):
    raise ImproperlyConfigured("Testing cancelado: " + message)


def validate_profile(config):
    policy = config.get("TEST_GUARD")
    if not isinstance(policy, dict) or set(policy) != {"PROFILE", "SYSTEM_IDENTIFIER"}:
        refuse("perfil e identificador esperado obligatorios.")
    profile = policy["PROFILE"]
    if not isinstance(profile, str) or profile not in PROFILES:
        refuse("perfil no autorizado.")
    cluster = policy["SYSTEM_IDENTIFIER"]
    if not isinstance(cluster, str) or not re.fullmatch(r"[1-9][0-9]{0,19}", cluster):
        refuse("identificador esperado ausente o inválido.")
    if (config.get("HOST"), str(config.get("PORT")), config.get("USER")) != PROFILES[profile]:
        refuse("endpoint o usuario incompatible con el perfil.")
    name = config.get("NAME")
    if (config.get("ENGINE") != "testing_backend" or not isinstance(name, str)
            or not name.strip() or name == "sistema_modalidad"):
        refuse("backend o base principal no autorizados.")
    if not isinstance(config.get("PASSWORD"), str) or not config["PASSWORD"].strip():
        refuse("faltan credenciales exclusivas.")
    if set(config.get("OPTIONS", {})) - {"connect_timeout"}:
        refuse("opciones de conexión no autorizadas.")
    return profile, cluster


def state(config, *, controller=False):
    profile, cluster = validate_profile(config)
    run = config.get(STATE_KEY)
    if not run or not run.get("token") or not run.get("cluster"):
        refuse("falta identidad de ejecución.")
    if run.get("profile") != profile or run["cluster"] != cluster:
        refuse("el perfil o clúster cambió durante la ejecución.")
    if controller and run.get("pid") != os.getpid():
        refuse("solo el proceso creador puede administrar bases.")
    return run


def check_cluster(cursor, run):
    cursor.execute("SELECT system_identifier::text, inet_server_port() FROM pg_control_system()")
    if cursor.fetchone() != (run["cluster"], 5432):
        refuse("identidad del clúster incorrecta.")


def check_role(cursor):
    cursor.execute("SELECT rolsuper, rolcreatedb FROM pg_roles WHERE rolname=current_user")
    if cursor.fetchone() != (False, True):
        refuse("se requiere un rol NOSUPERUSER CREATEDB.")


@contextmanager
def maintenance(config):
    run = state(config, controller=True)
    host, port, user = PROFILES[run["profile"]]
    # Never use Django's _nodb_cursor(), which can fall back to an existing DB.
    raw = psycopg2.connect(dbname="postgres", user=user,
                           password=config["PASSWORD"], host=host, port=int(port),
                           connect_timeout=5, application_name="isolated_test_maintenance")
    try:
        raw.autocommit = True
        with raw.cursor() as cursor:
            check_cluster(cursor, run)
            check_role(cursor)
            cursor.execute("SELECT pg_advisory_lock(741103, 11)")
            yield cursor
    finally:
        # Also releases the session advisory lock after interruption.
        raw.close()


def identity(cursor, name):
    cursor.execute("SELECT oid, datdba, shobj_description(oid, 'pg_database') "
                   "FROM pg_database WHERE datname=%s", [name])
    return cursor.fetchone()


def require_owned(cursor, config, name):
    run = state(config)
    record = run["records"].get(name)
    if not record or identity(cursor, name) != tuple(record):
        refuse("propiedad ausente o identidad alterada; se conserva " + str(name))
    if record[2] != "isolated-test:" + run["token"]:
        refuse("marca de ejecución incorrecta.")


def validate_name(config, name):
    root = state(config)["root"]
    if not re.fullmatch(re.escape(root) + r"(?:_[1-9][0-9]*)?", name) or len(name) > 63:
        refuse("nombre fuera de la ejecución.")


def create(config, name, quote, *, template=None):
    run = state(config, controller=True)
    validate_name(config, name)
    if template is not None and template != run["root"]:
        refuse("template ajeno.")
    with maintenance(config) as cursor:
        if identity(cursor, name) is not None:
            refuse("colisión con base preexistente: " + name)
        if template:
            require_owned(cursor, config, template)
        # PostgreSQL CREATE itself is the second collision barrier.
        sql = "CREATE DATABASE " + quote(name)
        sql += " TEMPLATE " + quote(template) if template else " TEMPLATE template0"
        cursor.execute(sql)
        created = identity(cursor, name)
        cursor.execute("SELECT oid FROM pg_roles WHERE rolname=current_user")
        if not created or created[1] != cursor.fetchone()[0]:
            refuse("no se pudo acreditar la creación; requiere revisión manual.")
        marker = "isolated-test:" + run["token"]
        cursor.execute("COMMENT ON DATABASE " + quote(name) + " IS %s", [marker])
        record = identity(cursor, name)
        if record != (created[0], created[1], marker):
            refuse("no se pudo registrar propiedad; se conserva la base.")
        run["records"][name] = record
        logger.warning("testing_database_created name=%s oid=%s owner=%s cluster=%s pid=%s",
                       name, record[0], record[1], run["cluster"], run["pid"])


def destroy(config, name, quote):
    run = state(config, controller=True)
    validate_name(config, name)
    with maintenance(config) as cursor:
        require_owned(cursor, config, name)
        cursor.execute("DROP DATABASE " + quote(name))
        del run["records"][name]
        logger.warning("testing_database_deleted name=%s cluster=%s", name, run["cluster"])
