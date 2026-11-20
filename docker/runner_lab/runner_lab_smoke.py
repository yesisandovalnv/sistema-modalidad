"""Prepared real lifecycle smoke. DO NOT run without specific DDL authorization.

Django will create/drop owned disposable databases even though test SQL is SELECT.
Two classes permit a later --parallel=2 clone/worker check.
"""
from django.conf import settings
from django.db import connection
from django.test import TestCase


def assert_owned_test_connection(case):
    case.assertEqual(connection.settings_dict['TEST_GUARD']['PROFILE'], 'runner_lab_docker')
    with connection.cursor() as cursor:
        cursor.execute('SELECT current_database(), system_identifier::text FROM pg_control_system()')
        name, cluster = cursor.fetchone()
    case.assertNotIn(name, {'postgres', 'sistema_modalidad', 'sistema_modalidad_test'})
    case.assertTrue(name.startswith('test_sm_'))
    case.assertEqual(cluster, settings.TEST_DB_SYSTEM_IDENTIFIER)


class OwnedConnectionSmoke(TestCase):
    def test_runner_selected_its_own_database(self):
        assert_owned_test_connection(self)


class WorkerConnectionSmoke(TestCase):
    def test_worker_selected_its_own_database(self):
        assert_owned_test_connection(self)
