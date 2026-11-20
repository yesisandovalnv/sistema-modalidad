#!/bin/sh
# Run by the official entrypoint ONLY on a new lab PGDATA. No remote parameters.
set -eu
[ "${LAB_INIT_SCOPE:-}" = runner-lab-11a1 ] || exit 71
[ "${POSTGRES_USER:-}" = lab_infra_admin ] || exit 72
[ "${POSTGRES_DB:-}" = postgres ] || exit 73
[ "${PGDATA:-}" = /var/lib/postgresql/data ] || exit 74
[ -S /var/run/postgresql/.s.PGSQL.5432 ] || exit 75
[ -r /run/secrets/lab_executor_password ] || exit 76

# Remove inherited libpq routing/configuration. Use only the local Unix socket.
unset PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER PGSERVICE PGSERVICEFILE
unset PGOPTIONS PGPASSWORD PGPASSFILE PGREQUIRESSL PGSSLMODE
export LAB_EXECUTOR_PASSWORD="$(cat /run/secrets/lab_executor_password)"
[ "${#LAB_EXECUTOR_PASSWORD}" -ge 32 ] || exit 77
psql -X --no-password --host=/var/run/postgresql --port=5432 \
  --username=lab_infra_admin --dbname=postgres --set=ON_ERROR_STOP=1 <<'SQL'
\getenv executor_password LAB_EXECUTOR_PASSWORD
DO $$ BEGIN
  IF current_user <> 'lab_infra_admin' OR current_database() <> 'postgres'
     OR inet_server_addr() IS NOT NULL
     OR current_setting('data_directory') <> '/var/lib/postgresql/data' THEN
    RAISE EXCEPTION 'Refusing non-local/non-lab initialization';
  END IF;
END $$;
CREATE ROLE lab_test_executor LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS PASSWORD :'executor_password';
REVOKE ALL ON DATABASE postgres FROM PUBLIC;
GRANT CONNECT ON DATABASE postgres TO lab_test_executor;
REVOKE ALL ON DATABASE template1 FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON FUNCTION pg_catalog.pg_control_system() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO lab_test_executor;
-- Function ACLs are per database. New roots use template0, clones inherit them.
ALTER DATABASE template0 ALLOW_CONNECTIONS true;
\connect template0 lab_infra_admin /var/run/postgresql 5432
DO $$ BEGIN
  IF current_user <> 'lab_infra_admin' OR current_database() <> 'template0'
     OR inet_server_addr() IS NOT NULL
     OR current_setting('data_directory') <> '/var/lib/postgresql/data' THEN
    RAISE EXCEPTION 'Refusing non-local template initialization';
  END IF;
END $$;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON FUNCTION pg_catalog.pg_control_system() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO lab_test_executor;
\connect postgres lab_infra_admin /var/run/postgresql 5432
ALTER DATABASE template0 ALLOW_CONNECTIONS false;
-- CREATEDB remains disabled until a separately authorized validation window.
SQL
unset LAB_EXECUTOR_PASSWORD
