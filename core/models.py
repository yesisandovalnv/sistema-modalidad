from django.db import models


class BaseModel(models.Model):
    """Modelo base abstracto con campos comunes para todas las entidades del sistema."""

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Fecha de actualización",
    )
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo",
    )

    class Meta:
        abstract = True
