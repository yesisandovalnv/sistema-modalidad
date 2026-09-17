from django.core.exceptions import ValidationError
from django.db import models

from core.managers import ActiveManager
from core.models import BaseModel


class Periodo(BaseModel):
    class Semestre(models.TextChoices):
        PRIMERO = "I", "Semestre I"
        SEGUNDO = "II", "Semestre II"

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
    gestion = models.PositiveSmallIntegerField(
        verbose_name="Gestión",
    )
    semestre = models.CharField(
        max_length=2,
        choices=Semestre.choices,
        verbose_name="Semestre",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo Periodo para administración y consultas."""

        verbose_name = "Período"
        verbose_name_plural = "Períodos"
        ordering = ["-gestion", "-semestre"]
        app_label = "academico"
        constraints = [
            models.UniqueConstraint(
                fields=["gestion", "semestre"],
                name="unique_periodo_gestion_semestre",
            )
        ]

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
        max_length=40,
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


def documento_oficial_modalidad_upload_to(instance, filename):
    return f"modalidades/requisitos_oficiales/{instance.modalidad_id}/{filename}"


class DocumentoOficialModalidad(BaseModel):
    """Documento informativo vigente de requisitos oficiales de una modalidad."""

    modalidad = models.ForeignKey(
        Modalidad,
        on_delete=models.PROTECT,
        related_name="documentos_oficiales",
        verbose_name="Modalidad",
    )
    archivo = models.FileField(
        upload_to=documento_oficial_modalidad_upload_to,
        verbose_name="Archivo PDF",
    )
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre del documento",
    )
    actualizado_por = models.ForeignKey(
        "usuarios.CustomUser",
        on_delete=models.PROTECT,
        related_name="documentos_oficiales_modalidad_actualizados",
        verbose_name="Última actualización por",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name = "Documento oficial de modalidad"
        verbose_name_plural = "Documentos oficiales de modalidad"
        app_label = "academico"

    def __str__(self) -> str:
        return f"{self.modalidad} - {self.nombre}"


class EtapaModalidad(BaseModel):
    """Configuración reutilizable de etapas por modalidad de graduación."""

    modalidad = models.ForeignKey(
        Modalidad,
        on_delete=models.PROTECT,
        related_name="etapas",
        verbose_name="Modalidad",
    )
    codigo = models.CharField(
        max_length=50,
        verbose_name="Código",
    )
    nombre = models.CharField(
        max_length=150,
        verbose_name="Nombre",
    )
    orden = models.PositiveIntegerField(
        verbose_name="Orden",
    )
    obligatoria = models.BooleanField(
        default=True,
        verbose_name="Obligatoria",
    )
    permite_repeticion = models.BooleanField(
        default=False,
        verbose_name="Permite repetición",
    )
    origen_normativo = models.TextField(
        verbose_name="Origen normativo",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo EtapaModalidad para administración y consultas."""

        verbose_name = "Etapa de modalidad"
        verbose_name_plural = "Etapas de modalidad"
        ordering = ["modalidad", "orden"]
        app_label = "academico"
        constraints = [
            models.UniqueConstraint(
                fields=["modalidad", "codigo"],
                name="unique_modalidad_etapa_codigo",
            ),
            models.UniqueConstraint(
                fields=["modalidad", "orden"],
                name="unique_modalidad_etapa_orden",
            ),
            models.CheckConstraint(
                condition=models.Q(orden__gte=1),
                name="check_etapa_modalidad_orden_gte_1",
            ),
        ]
        indexes = [
            models.Index(fields=["modalidad", "activo"], name="idx_etapa_modalidad_activo"),
            models.Index(fields=["modalidad", "orden"], name="idx_etapa_modalidad_orden"),
        ]

    def clean(self) -> None:
        """Normaliza y valida los campos base de la etapa."""
        super().clean()
        self.codigo = (self.codigo or "").strip().upper()
        self.nombre = (self.nombre or "").strip()
        self.origen_normativo = (self.origen_normativo or "").strip()

        errors = {}
        if not self.codigo:
            errors["codigo"] = "El código es obligatorio."
        if not self.nombre:
            errors["nombre"] = "El nombre es obligatorio."
        if not self.origen_normativo:
            errors["origen_normativo"] = "El origen normativo es obligatorio."
        if self.orden is not None and self.orden <= 0:
            errors["orden"] = "El orden debe ser mayor que cero."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        """Guarda la etapa aplicando validaciones antes de persistirla."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Retorna la representación legible de la etapa."""
        return f"{self.modalidad.codigo} - {self.codigo}"


class Requisito(BaseModel):
    """Catálogo maestro de requisitos académicos."""

    codigo = models.CharField(
        max_length=50,
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
