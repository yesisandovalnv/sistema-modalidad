from django.db import models


class RoleChoices(models.TextChoices):
    """Opciones base preparadas para los roles del sistema."""

    pass


class EstadoChoices(models.TextChoices):
    """Opciones base preparadas para los estados generales del sistema."""

    pass


class TipoDocumentoChoices(models.TextChoices):
    """Opciones base preparadas para los tipos de documento."""

    pass


class TipoNotificacionChoices(models.TextChoices):
    """Opciones base preparadas para los tipos de notificación."""

    pass
