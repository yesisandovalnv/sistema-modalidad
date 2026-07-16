from django.db import models
from django.contrib.auth.models import UserManager


class ActiveManager(UserManager):
    """Manager que devuelve únicamente los registros activos por defecto."""

    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(activo=True)
