from django.db import models

from apps.academico.models import Modalidad, Periodo
from apps.usuarios.models import CustomUser
from core.managers import ActiveManager
from core.models import BaseModel


class EstadoPostulacion(BaseModel):
    """Catálogo maestro de estados para una postulación.

    Este modelo representa los posibles estados por los que puede pasar
    una postulación durante su ciclo de evaluación y seguimiento.
    """

    codigo = models.CharField(
        max_length=30,
        unique=True,
        verbose_name="Código",
    )
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre",
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Estado de postulación"
        verbose_name_plural = "Estados de postulación"
        ordering = ["nombre"]
        app_label = "postulantes"

    def __str__(self) -> str:
        """Retorna una representación legible del estado."""
        return self.nombre


class HistorialEstado(BaseModel):
    """Registra los cambios de estado de una postulación.

    Este modelo permite mantener una trazabilidad completa del trámite,
    indicando qué estado anterior tenía la postulación, a qué estado
    nuevo pasó, quién realizó el cambio y en qué momento.
    """

    postulacion = models.ForeignKey(
        "Postulacion",
        on_delete=models.CASCADE,
        related_name="historial_estados",
        verbose_name="Postulación",
    )
    estado_anterior = models.ForeignKey(
        EstadoPostulacion,
        on_delete=models.PROTECT,
        related_name="historial_estado_anterior",
        verbose_name="Estado anterior",
        blank=True,
        null=True,
    )
    estado_nuevo = models.ForeignKey(
        EstadoPostulacion,
        on_delete=models.PROTECT,
        related_name="historial_estado_nuevo",
        verbose_name="Estado nuevo",
    )
    usuario = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        related_name="historial_estados",
        verbose_name="Usuario",
    )
    fecha_cambio = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de cambio",
    )
    comentario = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comentario",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Historial de estado"
        verbose_name_plural = "Historiales de estado"
        ordering = ["-fecha_cambio"]
        app_label = "postulantes"

    def __str__(self) -> str:
        """Retorna una representación legible del registro de cambio."""
        return f"{self.postulacion} - {self.estado_anterior or 'Sin estado'} -> {self.estado_nuevo}"


class Observacion(BaseModel):
    """Registra observaciones realizadas sobre una postulación.

    Este modelo permite conservar comentarios o anotaciones realizadas
    durante el proceso de revisión, además de indicar si el estudiante
    ya ha leído la observación.
    """

    postulacion = models.ForeignKey(
        "Postulacion",
        on_delete=models.CASCADE,
        related_name="observaciones",
        verbose_name="Postulación",
    )
    usuario = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        related_name="observaciones",
        verbose_name="Usuario",
    )
    comentario = models.TextField(
        verbose_name="Comentario",
    )
    leida_estudiante = models.BooleanField(
        default=False,
        verbose_name="Leída por el estudiante",
    )
    fecha_observacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de observación",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Observación"
        verbose_name_plural = "Observaciones"
        ordering = ["-fecha_observacion"]
        app_label = "postulantes"

    def __str__(self) -> str:
        """Retorna una representación legible de la observación."""
        return f"{self.postulacion} - {self.usuario}"


class Postulacion(BaseModel):
    """Representa la solicitud de graduación realizada por un estudiante.

    Esta entidad centraliza la información básica de una postulación,
    incluyendo la relación con el estudiante, la modalidad solicitada,
    el período asociado y las observaciones generales registradas al
    momento de crear la solicitud.
    """

    codigo = models.CharField(
        max_length=30,
        unique=True,
        verbose_name="Código",
    )
    estudiante = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        related_name="postulaciones",
        verbose_name="Estudiante",
    )
    modalidad = models.ForeignKey(
        Modalidad,
        on_delete=models.PROTECT,
        related_name="postulaciones",
        verbose_name="Modalidad",
    )
    periodo = models.ForeignKey(
        Periodo,
        on_delete=models.PROTECT,
        related_name="postulaciones",
        verbose_name="Período",
    )
    fecha_postulacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de postulación",
    )
    observaciones_generales = models.TextField(
        blank=True,
        null=True,
        verbose_name="Observaciones generales",
    )
    estado_actual = models.ForeignKey(
        EstadoPostulacion,
        on_delete=models.PROTECT,
        related_name="postulaciones",
        verbose_name="Estado actual",
        null=True,
        blank=True,
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Postulación"
        verbose_name_plural = "Postulaciones"
        ordering = ["-fecha_postulacion"]
        app_label = "postulantes"

    def __str__(self) -> str:
        """Retorna una representación legible de la postulación."""
        return f"{self.codigo} - {self.estudiante}"
