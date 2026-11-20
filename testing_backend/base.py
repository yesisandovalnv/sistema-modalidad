from django.db.backends.postgresql.base import DatabaseWrapper as PostgreSQLWrapper

from .creation import DatabaseCreation
from .guard import check_cluster, check_role, refuse, require_owned, state


class DatabaseWrapper(PostgreSQLWrapper):
    creation_class = DatabaseCreation

    def get_new_connection(self, conn_params):
        # settings_dict (including identity records) is passed to spawned workers.
        run = state(self.settings_dict)
        name = self.settings_dict["NAME"]
        if name not in run["records"]:
            refuse("conexión a una base no creada por esta ejecución.")
        for key, expected in (("host", self.settings_dict["HOST"]),
                              ("port", self.settings_dict["PORT"]),
                              ("user", self.settings_dict["USER"]), ("dbname", name)):
            if str(conn_params.get(key)) != str(expected):
                refuse("parámetros efectivos incompatibles con el perfil.")
        if any(key in conn_params for key in ("service", "servicefile", "hostaddr", "options")):
            refuse("routing alternativo no autorizado.")
        raw = super().get_new_connection(conn_params)
        try:
            with raw.cursor() as cursor:
                check_cluster(cursor, run)
                check_role(cursor)
                require_owned(cursor, self.settings_dict, name)
                cursor.execute("SELECT current_database()")
                if cursor.fetchone() != (name,):
                    refuse("base conectada incorrecta.")
            raw.commit()
            return raw
        except BaseException:
            raw.close()
            raise
