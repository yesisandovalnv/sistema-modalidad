from django.db.backends.postgresql.creation import DatabaseCreation as PostgreSQLCreation

from .guard import create, destroy, refuse, state


class DatabaseCreation(PostgreSQLCreation):
    def _create_test_db(self, verbosity, autoclobber, keepdb=False):
        if keepdb:
            refuse("--keepdb está prohibido.")
        name = self._get_test_db_name()
        create(self.connection.settings_dict, name, self._quote_name)
        return name

    def _clone_test_db(self, suffix, verbosity, keepdb=False):
        if keepdb:
            refuse("--keepdb está prohibido para clones.")
        config = self.connection.settings_dict
        source = config["NAME"]
        if source != state(config)["root"]:
            refuse("origen del clon incorrecto.")
        self.connection.close()
        self.connection.close_pool()
        name = self.get_test_db_clone_settings(suffix)["NAME"]
        create(config, name, self._quote_name, template=source)

    def _destroy_test_db(self, test_database_name, verbosity):
        self.connection.close_pool()
        destroy(self.connection.settings_dict, test_database_name, self._quote_name)
