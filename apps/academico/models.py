from django.core.exceptions import ValidationError
from django.db import models

from core.managers import ActiveManager
from core.models import BaseModel


class Periodo(BaseModel):
    """Período académico con rango de fechas y estado activo."""

    nombre = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Nombre",
    )
    fecha_inicio = models.DateField(
        verbose_name="Fecha de inicio",
    )
    fecha_fin = models.DateField(
        verbose_name="Fecha de fin",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo Periodo para administración y consultas."""

        verbose_name = "Período"
        verbose_name_plural = "Períodos"
        ordering = ["-fecha_inicio"]
        app_label = "academico"

    def clean(self) -> None:
        """Valida que la fecha de fin sea mayor que la fecha de inicio."""
        super().clean()
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin <= self.fecha_inicio:
            raise ValidationError({"fecha_fin": "La fecha de fin debe ser posterior a la fecha de inicio."})

    def save(self, *args, **kwargs) -> None:
        """Guarda el objeto aplicando validaciones antes de persistirlo."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Retorna la representación legible del período."""
        return self.nombre


class Modalidad(BaseModel):
    """Modalidad académica del sistema."""

    codigo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Código",
    )
    nombre = models.CharField(
        max_length=150,
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
        """Configuración del modelo Modalidad para administración y consultas."""

        verbose_name = "Modalidad"
        verbose_name_plural = "Modalidades"
        ordering = ["nombre"]
        app_label = "academico"

    def __str__(self) -> str:
        """Retorna la representación legible de la modalidad."""
        return self.nombre


class Requisito(BaseModel):
    """Catálogo maestro de requisitos académicos."""

    codigo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Código",
    )
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre",
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
    )
    obligatorio = models.BooleanField(
        default=True,
        verbose_name="Obligatorio",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo Requisito para administración y consultas."""

        verbose_name = "Requisito"
        verbose_name_plural = "Requisitos"
        ordering = ["nombre"]
        app_label = "academico"

    def __str__(self) -> str:
        """Retorna la representación legible del requisito."""
        return self.nombre


class ModalidadRequisito(BaseModel):
    """Asocia un requisito a una modalidad de graduación con un orden definido."""

    modalidad = models.ForeignKey(
        Modalidad,
        on_delete=models.CASCADE,
        related_name="requisitos",
        verbose_name="Modalidad",
    )
    requisito = models.ForeignKey(
        Requisito,
        on_delete=models.CASCADE,
        related_name="modalidades",
        verbose_name="Requisito",
    )
    orden = models.PositiveIntegerField(
        verbose_name="Orden",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo ModalidadRequisito para administración y consultas."""

        verbose_name = "Requisito por modalidad"
        verbose_name_plural = "Requisitos por modalidad"
        ordering = ["modalidad", "orden"]
        app_label = "academico"
        constraints = [
            models.UniqueConstraint(fields=["modalidad", "requisito"], name="unique_modalidad_requisito"),
        ]

    def clean(self) -> None:
        """Valida que el orden sea mayor que cero."""
        super().clean()
        if self.orden is not None and self.orden <= 0:
            raise ValidationError({"orden": "El orden debe ser mayor que cero."})

    def save(self, *args, **kwargs) -> None:
        """Guarda el objeto aplicando validaciones antes de persistirlo."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Retorna la representación legible del vínculo entre modalidad y requisito."""
        return f"{self.modalidad} - {self.requisito}"
