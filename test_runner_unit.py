"""Standalone unittest suite: no Django setup, migrations, or network access.

Run only: python -B -m unittest test_runner_unit -v
"""
from contextlib import contextmanager
from copy import deepcopy
import os
import pickle
import unittest
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

if not settings.configured:
    settings.configure(DATABASES={}, TEST_DB_SYSTEM_IDENTIFIER="123")

from testing_backend import guard
from testing_backend.base import DatabaseWrapper
from testing_backend.creation import DatabaseCreation
from test_runner import IsolatedPostgreSQLTestRunner


def config():
    return {
        "ENGINE": "testing_backend", "NAME": "sistema_modalidad_test",
        "USER": "modalidad_test", "PASSWORD": "fake", "HOST": "127.0.0.1",
        "PORT": "5541", "OPTIONS": {}, "TEST": {"NAME": "test_sm_abc"},
        "TEST_GUARD": {"PROFILE": "legacy", "SYSTEM_IDENTIFIER": "123"},
        guard.STATE_KEY: {"token": "secret", "pid": os.getpid(), "cluster": "123",
                          "profile": "legacy", "root": "test_sm_abc", "records": {}},
    }


class Catalog:
    def __init__(self):
        self.databases = {}
        self.statements = []
        self.result = None
        self.fail = None
        self.error = RuntimeError("simulated")
        self.cluster = ("123", 5432)
        self.role = (False, True)

    def execute(self, sql, params=None):
        self.statements.append(sql)
        if self.fail and sql.startswith(self.fail):
            raise self.error
        if "pg_control_system" in sql:
            self.result = self.cluster
        elif "rolsuper" in sql:
            self.result = self.role
        elif "FROM pg_database" in sql:
            self.result = self.databases.get(params[0])
        elif sql.startswith("SELECT oid FROM pg_roles"):
            self.result = (10,)
        elif sql.startswith("CREATE DATABASE"):
            name = sql.split('"')[1]
            if name in self.databases:
                raise RuntimeError("duplicate database")
            self.databases[name] = (100 + len(self.databases), 10, None)
        elif sql.startswith("COMMENT ON DATABASE"):
            name = sql.split('"')[1]
            self.databases[name] = (*self.databases[name][:2], params[0])
        elif sql.startswith("DROP DATABASE"):
            del self.databases[sql.split('"')[1]]

    def fetchone(self):
        return self.result

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class RunnerSafetyTests(unittest.TestCase):
    def setUp(self):
        # Any accidental real psycopg2/Django connection immediately fails.
        self.network = patch("psycopg2.connect", side_effect=AssertionError("NETWORK FORBIDDEN"))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.cfg = config()
        self.catalog = Catalog()

        @contextmanager
        def maintenance(cfg):
            guard.state(cfg, controller=True)
            guard.check_cluster(self.catalog, guard.state(cfg))
            yield self.catalog

        self.maintenance = patch.object(guard, "maintenance", maintenance)
        self.maintenance.start()
        self.addCleanup(self.maintenance.stop)
        self.quote = lambda name: '"' + name + '"'
        self.name = self.cfg[guard.STATE_KEY]["root"]

    def create(self, name=None, template=None):
        guard.create(self.cfg, name or self.name, self.quote, template=template)

    def drop(self, name=None):
        guard.destroy(self.cfg, name or self.name, self.quote)

    def assert_no_drop(self):
        self.assertFalse(any(s.startswith("DROP") for s in self.catalog.statements))

    def test_preexisting_base_untouched(self):
        self.catalog.databases[self.name] = (7, 8, "conserved")
        with self.assertRaises(ImproperlyConfigured):
            self.create()
        self.assertEqual(self.catalog.databases[self.name], (7, 8, "conserved"))
        self.assert_no_drop()

    def test_server_collision_after_precheck_never_retries(self):
        self.catalog.fail = "CREATE DATABASE"
        with self.assertRaises(RuntimeError):
            self.create()
        self.assert_no_drop()
        self.assertEqual(self.cfg[guard.STATE_KEY]["records"], {})

    def test_identity_recorded_and_owned_database_deleted(self):
        self.create()
        self.assertEqual(self.cfg[guard.STATE_KEY]["records"][self.name],
                         self.catalog.databases[self.name])
        self.drop()
        self.assertNotIn(self.name, self.catalog.databases)

    def test_comment_failure_leaves_unclaimed_database(self):
        self.catalog.fail = "COMMENT"
        with self.assertRaises(RuntimeError):
            self.create()
        self.assertIn(self.name, self.catalog.databases)
        with self.assertRaises(ImproperlyConfigured):
            self.drop()
        self.assert_no_drop()

    def test_interruption_does_not_delete_or_adopt(self):
        self.catalog.fail = "COMMENT"
        self.catalog.error = KeyboardInterrupt()
        with self.assertRaises(KeyboardInterrupt):
            self.create()
        self.assertEqual(self.cfg[guard.STATE_KEY]["records"], {})
        self.assert_no_drop()

    def test_cleanup_failure_propagates_without_retry(self):
        self.create()
        self.catalog.fail = "DROP"
        with self.assertRaises(RuntimeError):
            self.drop()
        self.assertEqual(sum(s.startswith("DROP") for s in self.catalog.statements), 1)
        self.assertIn(self.name, self.cfg[guard.STATE_KEY]["records"])

    def test_changed_oid_owner_or_marker_prevents_drop(self):
        self.create()
        original = self.catalog.databases[self.name]
        for changed in [(999, 10, original[2]), (100, 99, original[2]), (100, 10, "foreign")]:
            with self.subTest(changed=changed):
                self.catalog.databases[self.name] = changed
                with self.assertRaises(ImproperlyConfigured):
                    self.drop()
        self.assert_no_drop()

    def test_lost_record_prevents_drop(self):
        self.create()
        self.cfg[guard.STATE_KEY]["records"].clear()
        with self.assertRaises(ImproperlyConfigured):
            self.drop()
        self.assert_no_drop()

    def test_foreign_and_conserved_names_rejected(self):
        for name in ["sistema_modalidad", "sistema_modalidad_test", "test_sistema_modalidad_test",
                     "test_sm_other", self.name + '_1";DROP DATABASE postgres;--']:
            with self.subTest(name=name), self.assertRaises(ImproperlyConfigured):
                self.drop(name)
        self.assert_no_drop()

    def test_clone_created_from_owned_root_and_deleted(self):
        self.create()
        self.create(self.name + "_1", template=self.name)
        self.drop(self.name + "_1")
        self.assertIn(self.name, self.catalog.databases)

    def test_preexisting_clone_is_not_replaced(self):
        self.create()
        self.catalog.databases[self.name + "_1"] = (8, 9, "foreign")
        with self.assertRaises(ImproperlyConfigured):
            self.create(self.name + "_1", template=self.name)
        self.assert_no_drop()

    def test_foreign_clone_source_rejected(self):
        with self.assertRaises(ImproperlyConfigured):
            self.create(self.name + "_1", template="sistema_modalidad_test")

    def test_cluster_changed_before_create_or_cleanup(self):
        self.create()
        self.catalog.cluster = ("different", 5432)
        for operation in [self.drop, lambda: self.create(self.name + "_1", self.name)]:
            with self.assertRaises(ImproperlyConfigured):
                operation()
        self.assert_no_drop()

    def test_other_execution_cannot_delete_owned_database(self):
        self.create()
        other = deepcopy(self.cfg)
        other[guard.STATE_KEY]["token"] = "different-run"
        with self.assertRaises(ImproperlyConfigured):
            guard.destroy(other, self.name, self.quote)
        self.assert_no_drop()

    def test_worker_cannot_issue_ddl(self):
        self.cfg[guard.STATE_KEY]["pid"] = -1
        with self.assertRaises(ImproperlyConfigured):
            self.create()

    def test_worker_settings_pickle_preserves_identity(self):
        self.create()
        worker = pickle.loads(pickle.dumps(self.cfg))
        worker[guard.STATE_KEY]["pid"] = -1
        guard.require_owned(self.catalog, worker, self.name)

    def test_django_worker_selects_registered_clone_after_spawn_copy(self):
        self.create()
        self.create(self.name + "_2", template=self.name)
        worker = pickle.loads(pickle.dumps(self.cfg))
        worker["NAME"] = self.name
        connection = MagicMock(settings_dict=worker)
        DatabaseCreation(connection).setup_worker_connection(2)
        self.assertEqual(worker["NAME"], self.name + "_2")
        guard.require_owned(self.catalog, worker, worker["NAME"])

    def test_clone_api_collision_never_invokes_django_drop_fallback(self):
        self.create()
        self.cfg["NAME"] = self.name
        self.catalog.databases[self.name + "_1"] = (8, 9, "foreign")
        connection = MagicMock(settings_dict=self.cfg)
        creation = DatabaseCreation(connection)
        creation._quote_name = self.quote
        with self.assertRaises(ImproperlyConfigured):
            creation.clone_test_db("1", verbosity=0)
        self.assert_no_drop()

    def test_connection_checks_identity_before_returning_to_django(self):
        self.create()
        self.cfg["NAME"] = self.name
        wrapper = DatabaseWrapper(self.cfg)
        raw = MagicMock()
        cursor = raw.cursor.return_value.__enter__.return_value
        cursor.fetchone.side_effect = [self.catalog.cluster, (False, True),
                                       self.catalog.databases[self.name], (self.name,)]
        with patch("django.db.backends.postgresql.base.DatabaseWrapper.get_new_connection", return_value=raw):
            self.assertIs(wrapper.get_new_connection(self.params()), raw)
        raw.commit.assert_called_once()
        raw.close.assert_not_called()

    def test_replaced_database_connection_closed_before_use(self):
        self.create()
        self.cfg["NAME"] = self.name
        wrapper = DatabaseWrapper(self.cfg)
        raw = MagicMock()
        cursor = raw.cursor.return_value.__enter__.return_value
        cursor.fetchone.side_effect = [self.catalog.cluster, (False, True), (999, 10, "foreign")]
        with patch("django.db.backends.postgresql.base.DatabaseWrapper.get_new_connection", return_value=raw):
            with self.assertRaises(ImproperlyConfigured):
                wrapper.get_new_connection(self.params())
        raw.close.assert_called_once()
        raw.commit.assert_not_called()

    def params(self):
        return {key: self.cfg[value] for key, value in
                (("host", "HOST"), ("port", "PORT"), ("user", "USER"), ("dbname", "NAME"))}

    def test_no_connection_to_unowned_database(self):
        wrapper = DatabaseWrapper(self.cfg)
        with self.assertRaises(ImproperlyConfigured):
            wrapper.get_new_connection({})

    def test_keepdb_rejected_before_any_connection(self):
        runner = IsolatedPostgreSQLTestRunner(keepdb=True, interactive=False)
        with self.assertRaises(ImproperlyConfigured):
            runner.setup_databases()
        creation = DatabaseCreation(MagicMock(settings_dict=self.cfg))
        for operation in [lambda: creation._create_test_db(0, True, True),
                          lambda: creation._clone_test_db("1", 0, True)]:
            with self.assertRaises(ImproperlyConfigured):
                operation()

    def test_noninteractive_creation_uses_no_destructive_django_fallback(self):
        self.catalog.databases[self.name] = (7, 8, "foreign")
        creation = DatabaseCreation(MagicMock(settings_dict=self.cfg))
        creation._quote_name = self.quote
        with patch("builtins.input", side_effect=AssertionError("NO PROMPT")):
            with self.assertRaises(ImproperlyConfigured):
                creation._create_test_db(0, autoclobber=True)
        self.assert_no_drop()

    def test_runner_names_unique_and_setup_interruption_retains(self):
        configs = []
        for _ in range(2):
            cfg = config()
            del cfg[guard.STATE_KEY]
            connection = MagicMock(settings_dict=cfg)
            with patch("test_runner.connections", {"default": connection}), \
                 patch("test_runner.maintenance"), \
                 patch("django.test.runner.DiscoverRunner.setup_databases", side_effect=KeyboardInterrupt), \
                 self.assertRaises(KeyboardInterrupt):
                IsolatedPostgreSQLTestRunner(interactive=False).setup_databases()
            configs.append(cfg)
        self.assertNotEqual(configs[0]["TEST"]["NAME"], configs[1]["TEST"]["NAME"])


class LabRunnerSafetyTests(RunnerSafetyTests):
    """Run the same collision/ownership/clone contract against the lab profile."""
    def setUp(self):
        super().setUp()
        self.cfg.update(PORT="5542", USER="lab_test_executor", NAME="postgres")
        self.cfg["TEST_GUARD"]["PROFILE"] = "runner_lab"
        self.cfg[guard.STATE_KEY]["profile"] = "runner_lab"


class DockerRunnerSafetyTests(RunnerSafetyTests):
    def setUp(self):
        super().setUp()
        self.cfg.update(HOST="postgres-lab", PORT="5432", USER="lab_test_executor", NAME="postgres")
        self.cfg["TEST_GUARD"]["PROFILE"] = "runner_lab_docker"
        self.cfg[guard.STATE_KEY]["profile"] = "runner_lab_docker"


class ProfileTests(unittest.TestCase):
    def test_docker_profile_pins_internal_endpoint_and_checks_identity_and_role(self):
        for cluster, role, accepted in [(("123", 5432), (False, True), True),
                                        (("999", 5432), (False, True), False),
                                        (("123", 5432), (True, True), False),
                                        (("123", 5432), (False, False), False)]:
            with self.subTest(cluster=cluster, role=role):
                cfg = config()
                cfg.update(HOST="postgres-lab", PORT="5432", USER="lab_test_executor")
                cfg["TEST_GUARD"]["PROFILE"] = "runner_lab_docker"
                cfg[guard.STATE_KEY]["profile"] = "runner_lab_docker"
                catalog = Catalog()
                catalog.cluster, catalog.role = cluster, role
                raw = MagicMock()
                raw.cursor.return_value = catalog
                with patch("psycopg2.connect", return_value=raw) as connect:
                    if accepted:
                        with guard.maintenance(cfg):
                            pass
                    else:
                        with self.assertRaises(ImproperlyConfigured):
                            with guard.maintenance(cfg):
                                self.fail("must not yield")
                self.assertEqual(connect.call_args.kwargs["host"], "postgres-lab")
                self.assertEqual(connect.call_args.kwargs["port"], 5432)
                raw.close.assert_called_once()

    def test_runner_rejects_missing_or_inconsistent_expected_identity_before_connect(self):
        for expected in [None, "", "999"]:
            with self.subTest(expected=expected):
                cfg = config()
                del cfg[guard.STATE_KEY]
                connection = MagicMock(settings_dict=cfg)
                with patch("test_runner.connections", {"default": connection}), \
                     patch("test_runner.settings", TEST_DB_SYSTEM_IDENTIFIER=expected), \
                     patch("test_runner.maintenance", side_effect=AssertionError("NETWORK")):
                    with self.assertRaises(ImproperlyConfigured):
                        IsolatedPostgreSQLTestRunner(interactive=False).setup_databases()

    def test_both_profiles_complete_runner_preflight_with_mocked_parent(self):
        for profile, port, user in [("legacy", "5541", "modalidad_test"),
                                    ("runner_lab", "5542", "lab_test_executor")]:
            with self.subTest(profile=profile):
                cfg = config()
                del cfg[guard.STATE_KEY]
                cfg.update(PORT=port, USER=user)
                cfg["TEST_GUARD"]["PROFILE"] = profile
                raw = MagicMock()
                raw.cursor.return_value = Catalog()
                connection = MagicMock(settings_dict=cfg)
                with patch("test_runner.connections", {"default": connection}), \
                     patch("test_runner.settings", TEST_DB_SYSTEM_IDENTIFIER="123"), \
                     patch("psycopg2.connect", return_value=raw), \
                     patch("django.test.runner.DiscoverRunner.setup_databases", return_value="mocked"):
                    result = IsolatedPostgreSQLTestRunner(interactive=False).setup_databases()
                self.assertEqual(result, "mocked")
                self.assertEqual(cfg[guard.STATE_KEY]["profile"], profile)

    def test_both_profiles_use_exact_endpoint_and_cluster(self):
        for profile, port, user, cluster in [
            ("legacy", "5541", "modalidad_test", "123"),
            ("runner_lab", "5542", "lab_test_executor", "456"),
        ]:
            with self.subTest(profile=profile):
                cfg = config()
                cfg.update(PORT=port, USER=user)
                cfg["TEST_GUARD"] = {"PROFILE": profile, "SYSTEM_IDENTIFIER": cluster}
                cfg[guard.STATE_KEY].update(profile=profile, cluster=cluster)
                catalog = Catalog()
                catalog.cluster = (cluster, 5432)
                raw = MagicMock()
                raw.cursor.return_value = catalog
                with patch("psycopg2.connect", return_value=raw) as connect:
                    with guard.maintenance(cfg):
                        pass
                self.assertEqual(connect.call_args.kwargs["port"], int(port))
                self.assertEqual(connect.call_args.kwargs["host"], "127.0.0.1")
                self.assertEqual(connect.call_args.kwargs["user"], user)
                self.assertFalse(any(sql.startswith(("CREATE", "DROP")) for sql in catalog.statements))

    def test_missing_unknown_or_incomplete_profile_never_connects(self):
        for policy in [None, {}, {"PROFILE": "runner_lab"},
                       {"PROFILE": "arbitrary", "SYSTEM_IDENTIFIER": "123"},
                       {"PROFILE": "legacy", "SYSTEM_IDENTIFIER": "123", "DISABLE": True}]:
            with self.subTest(policy=policy):
                cfg = config()
                cfg["TEST_GUARD"] = policy
                with patch("psycopg2.connect", side_effect=AssertionError("NETWORK")):
                    with self.assertRaises(ImproperlyConfigured):
                        with guard.maintenance(cfg):
                            self.fail("must not yield")

    def test_absent_invalid_cluster_never_connects(self):
        for cluster in [None, "", " ", "abc", "0", "１２３", 123]:
            with self.subTest(cluster=cluster):
                cfg = config()
                cfg["TEST_GUARD"]["SYSTEM_IDENTIFIER"] = cluster
                with patch("psycopg2.connect", side_effect=AssertionError("NETWORK")):
                    with self.assertRaises(ImproperlyConfigured):
                        with guard.maintenance(cfg):
                            pass

    def test_principal_unknown_port_and_crossed_profiles_never_connect(self):
        for changes in [dict(PORT="5540"), dict(PORT="5432"), dict(PORT="6543"),
                        dict(NAME="sistema_modalidad"), dict(HOST="db"),
                        dict(HOST="localhost"), dict(PORT="5542"),
                        dict(USER="postgres"), dict(OPTIONS={"service": "principal"}),
                        dict(PASSWORD=""), dict(NAME=""), dict(NAME=None)]:
            with self.subTest(changes=changes):
                cfg = config()
                cfg.update(changes)
                with patch("psycopg2.connect", side_effect=AssertionError("NETWORK")):
                    with self.assertRaises(ImproperlyConfigured):
                        with guard.maintenance(cfg):
                            pass

    def test_cluster_mismatch_for_each_profile_closes_without_ddl(self):
        for profile, port, user in [("legacy", "5541", "modalidad_test"),
                                    ("runner_lab", "5542", "lab_test_executor")]:
            with self.subTest(profile=profile):
                cfg = config()
                cfg.update(PORT=port, USER=user)
                cfg["TEST_GUARD"]["PROFILE"] = profile
                cfg[guard.STATE_KEY]["profile"] = profile
                raw = MagicMock()
                catalog = Catalog()
                catalog.cluster = ("999", 5432)
                raw.cursor.return_value = catalog
                with patch("psycopg2.connect", return_value=raw):
                    with self.assertRaises(ImproperlyConfigured):
                        with guard.maintenance(cfg):
                            self.fail("must not yield")
                raw.close.assert_called_once()
                self.assertEqual(len(catalog.statements), 1)

    def test_superuser_rejected_in_both_profiles(self):
        for profile, port, user in [("legacy", "5541", "modalidad_test"),
                                    ("runner_lab", "5542", "lab_test_executor")]:
            with self.subTest(profile=profile):
                cfg = config()
                cfg.update(PORT=port, USER=user)
                cfg["TEST_GUARD"]["PROFILE"] = profile
                cfg[guard.STATE_KEY]["profile"] = profile
                catalog = Catalog()
                catalog.role = (True, True)
                raw = MagicMock()
                raw.cursor.return_value = catalog
                with patch("psycopg2.connect", return_value=raw):
                    with self.assertRaises(ImproperlyConfigured):
                        with guard.maintenance(cfg):
                            pass
                raw.close.assert_called_once()

    def test_profile_cannot_change_after_run_started(self):
        cfg = config()
        cfg.update(PORT="5542", USER="lab_test_executor")
        cfg["TEST_GUARD"]["PROFILE"] = "runner_lab"
        with patch("psycopg2.connect", side_effect=AssertionError("NETWORK")):
            with self.assertRaises(ImproperlyConfigured):
                with guard.maintenance(cfg):
                    pass

    def test_effective_connection_params_cannot_route_to_principal(self):
        cfg = config()
        cfg["NAME"] = "test_sm_abc"
        cfg[guard.STATE_KEY]["records"][cfg["NAME"]] = (1, 10, "isolated-test:secret")
        wrapper = DatabaseWrapper(cfg)
        params = {"host": "127.0.0.1", "port": "5541", "user": "modalidad_test", "dbname": cfg["NAME"]}
        for changes in [dict(port="5540"), dict(dbname="sistema_modalidad"),
                        dict(hostaddr="127.0.0.1"), dict(service="principal")]:
            with self.subTest(changes=changes):
                with patch("django.db.backends.postgresql.base.DatabaseWrapper.get_new_connection",
                           side_effect=AssertionError("NETWORK")):
                    with self.assertRaises(ImproperlyConfigured):
                        wrapper.get_new_connection({**params, **changes})


class MaintenanceTests(unittest.TestCase):
    def test_interruption_releases_maintenance_session(self):
        raw = MagicMock()
        raw.cursor.return_value = Catalog()
        with patch("psycopg2.connect", return_value=raw):
            with self.assertRaises(KeyboardInterrupt):
                with guard.maintenance(config()):
                    raise KeyboardInterrupt
        raw.close.assert_called_once()

    def test_identity_role_and_session_close(self):
        for cluster, role, error in [(("123", 5432), (False, True), False),
                                     (("bad", 5432), (False, True), True),
                                     (("123", 5432), (True, True), True),
                                     (("123", 5432), (False, False), True)]:
            with self.subTest(cluster=cluster, role=role):
                catalog = Catalog()
                catalog.cluster, catalog.role = cluster, role
                raw = MagicMock()
                raw.cursor.return_value = catalog
                with patch("psycopg2.connect", return_value=raw) as connect:
                    if error:
                        with self.assertRaises(ImproperlyConfigured):
                            with guard.maintenance(config()):
                                self.fail("must not yield")
                    else:
                        with guard.maintenance(config()):
                            pass
                    self.assertEqual(connect.call_args.kwargs["dbname"], "postgres")
                    raw.close.assert_called_once()

    def test_wrong_endpoint_rejected_without_network(self):
        cfg = config()
        cfg["PORT"] = "5540"
        with patch("psycopg2.connect", side_effect=AssertionError("NETWORK")):
            with self.assertRaises(ImproperlyConfigured):
                with guard.maintenance(cfg):
                    pass
