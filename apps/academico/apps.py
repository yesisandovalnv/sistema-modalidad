from django.apps import AppConfig


class AcademicoConfig(AppConfig):
    """Configuración de la aplicación académica."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.academico"
    verbose_name = "Académico"
