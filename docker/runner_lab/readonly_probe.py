"""Live SELECT-only preflight. Never invokes Django setup_databases or tests."""
import json
import os
from pathlib import Path
import secrets
import socket

import psycopg2
from django.core.exceptions import ImproperlyConfigured
import settings_runner_lab_container as lab
from testing_backend.guard import STATE_KEY, check_cluster, maintenance, validate_profile


def main():
    config = lab.DATABASES['default']
    profile, cluster = validate_profile(config)
    if profile != 'runner_lab_docker':
        raise RuntimeError('Unexpected profile')
    if os.getuid() == 0 or Path('/var/run/docker.sock').exists():
        raise RuntimeError('Runner must be non-root without Docker socket')
    # No external default route may be present.
    routes = Path('/proc/net/route').read_text().splitlines()[1:]
    if any(line.split()[1] == '00000000' for line in routes):
        raise RuntimeError('Unexpected default route')
    blocked = []
    targets = [('172.21.0.3', 5432), ('172.22.0.2', 5432),
               ('172.21.0.1', 5540), ('172.22.0.1', 5541),
               ('172.23.0.1', 5540), ('172.23.0.1', 5541),
               ('host.docker.internal', 5540), ('host.docker.internal', 5541),
               ('gateway.docker.internal', 5540), ('gateway.docker.internal', 5541),
               ('sistema-modalidad-db-1', 5432),
               ('sistema-modalidad-test-postgres-test-1', 5432)]
    for host, port in targets:
        try:
            channel = socket.create_connection((host, port), timeout=1)
        except OSError:
            blocked.append(f'{host}:{port}')
        else:
            channel.close()
            raise RuntimeError(f'Unexpected access to {host}:{port}; stop')
    raw = psycopg2.connect(host='postgres-lab', port=5432, dbname='postgres',
                           user=config['USER'], password=config['PASSWORD'],
                           connect_timeout=5,
                           options='-c default_transaction_read_only=on')
    try:
        raw.autocommit = True
        with raw.cursor() as cursor:
            check_cluster(cursor, {'cluster': cluster})
            cursor.execute('SELECT current_user, rolsuper, rolcreatedb, rolcreaterole, '
                           'rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user')
            role = cursor.fetchone()
            if role != ('lab_test_executor', False, False, False, False, False):
                raise RuntimeError('Unexpected executor privileges')
            cursor.execute('SELECT datname, oid, datdba FROM pg_database ORDER BY datname')
            databases = cursor.fetchall()
            if [row[0] for row in databases] != ['postgres', 'template0', 'template1']:
                raise RuntimeError('Unexpected database inventory')
        config[STATE_KEY] = {'profile': profile, 'cluster': cluster, 'pid': os.getpid(),
                             'token': secrets.token_hex(32), 'records': {},
                             'root': 'test_sm_readonly_probe'}
        try:
            with maintenance(config):
                raise RuntimeError('Runner gate unexpectedly open')
        except ImproperlyConfigured as exc:
            if 'NOSUPERUSER CREATEDB' not in str(exc):
                raise
        with raw.cursor() as cursor:
            cursor.execute('SELECT datname, oid, datdba FROM pg_database ORDER BY datname')
            if cursor.fetchall() != databases:
                raise RuntimeError('Database inventory changed')
        print(json.dumps({'status': 'READ_ONLY_PREFLIGHT_PASSED', 'profile': profile,
                          'system_identifier': cluster, 'uid': os.getuid(),
                          'executor_superuser': False, 'executor_createdb': False,
                          'runner_gate': 'NOCREATEDB_REJECTED_AS_EXPECTED',
                          'databases_before_after': databases, 'blocked_targets': blocked}))
    finally:
        raw.close()


if __name__ == '__main__':
    main()
