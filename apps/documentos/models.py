from django.conf import settings
from django.db import models

from apps.postulantes.models import Postulacion
from core.managers import ActiveManager
from core.models import BaseModel


class EstadoDocumento(BaseModel):
    """Catálogo maestro de estados para un documento.

    Este modelo representa los posibles estados por los que puede pasar
    un documento durante su validación, procesamiento y archivo.
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

        verbose_name = "Estado de documento"
        verbose_name_plural = "Estados de documento"
        ordering = ["nombre"]
        app_label = "documentos"

    def __str__(self) -> str:
        """Retorna una representación legible del estado."""
        return self.nombre


class TipoDocumento(BaseModel):
    """Catálogo maestro de tipos de documentos.

    Este modelo define los tipos de documentos que pueden ser cargados
    en el sistema, especificando restricciones como tamaño máximo,
    extensiones permitidas y si permite versiones múltiples.
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
    obligatorio = models.BooleanField(
        default=False,
        verbose_name="Obligatorio",
    )
    permite_multiple_version = models.BooleanField(
        default=False,
        verbose_name="Permite múltiples versiones",
    )
    tamano_maximo_mb = models.PositiveIntegerField(
        default=10,
        verbose_name="Tamaño máximo (MB)",
    )
    extensiones_permitidas = models.CharField(
        max_length=200,
        default="pdf,doc,docx",
        verbose_name="Extensiones permitidas",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Tipo de documento"
        verbose_name_plural = "Tipos de documento"
        ordering = ["nombre"]
        app_label = "documentos"

    def __str__(self) -> str:
        """Retorna una representación legible del tipo de documento."""
        return self.nombre


class DocumentoPostulacion(BaseModel):
    """Documento vinculado a una postulación y su estado de revisión."""

    postulacion = models.ForeignKey(
        Postulacion,
        on_delete=models.CASCADE,
        related_name="documentos",
        verbose_name="Postulación",
    )
    tipo_documento = models.ForeignKey(
        TipoDocumento,
        on_delete=models.PROTECT,
        related_name="documentos",
        verbose_name="Tipo de documento",
    )
    estado = models.ForeignKey(
        EstadoDocumento,
        on_delete=models.PROTECT,
        related_name="documentos",
        verbose_name="Estado",
    )
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de subida",
    )
    fecha_revision = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de revisión",
    )
    observacion_general = models.TextField(
        blank=True,
        null=True,
        verbose_name="Observación general",
    )
    requiere_correccion = models.BooleanField(
        default=False,
        verbose_name="Requiere corrección",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Documento de postulación"
        verbose_name_plural = "Documentos de postulación"
        ordering = ["-fecha_subida"]
        app_label = "documentos"
        constraints = [
            models.UniqueConstraint(
                fields=["postulacion", "tipo_documento"],
                name="unique_postulacion_tipo_documento",
            ),
        ]

    def __str__(self) -> str:
        """Retorna una representación legible del documento de postulación."""
        return f"{self.postulacion} - {self.tipo_documento}"


class VersionDocumento(BaseModel):
    """Versión de un documento de postulación con su archivo y metadatos."""

    documento = models.ForeignKey(
        DocumentoPostulacion,
        on_delete=models.CASCADE,
        related_name="versiones",
        verbose_name="Documento",
    )
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="versiones_documentos",
        verbose_name="Subido por",
    )
    numero_version = models.PositiveIntegerField(
        verbose_name="Número de versión",
    )
    archivo = models.FileField(
        upload_to="documentos/versiones/",
        verbose_name="Archivo",
    )
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre original",
    )
    tamano_bytes = models.BigIntegerField(
        verbose_name="Tamaño en bytes",
    )
    hash_sha256 = models.CharField(
        max_length=64,
        verbose_name="Hash SHA-256",
    )
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de subida",
    )
    es_version_actual = models.BooleanField(
        default=True,
        verbose_name="Es versión actual",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo para administración y consultas."""

        verbose_name = "Versión de documento"
        verbose_name_plural = "Versiones de documento"
        ordering = ["-numero_version"]
        app_label = "documentos"
        constraints = [
            models.UniqueConstraint(
                fields=["documento", "numero_version"],
                name="unique_documento_numero_version",
            ),
        ]

    def __str__(self) -> str:
        """Retorna una representación legible de la versión de documento."""
        return f"{self.documento} - v{self.numero_version}"


class ObservacionDocumento(BaseModel):
    """Observación asociada a una versión de documento."""

    version_documento = models.ForeignKey(
        VersionDocumento,
        on_delete=models.CASCADE,
        related_name="observaciones",
        verbose_name="Versión de documento",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="observaciones_documentos",
        verbose_name="Usuario",
    )
    comentario = models.TextField(
        verbose_name="Comentario",
    )
    leida_por_estudiante = models.BooleanField(
        default=False,
        verbose_name="Leída por estudiante",
    )
    corregida = models.BooleanField(
        default=False,
        verbose_name="Corregida",
    )
    fecha_observacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de observación",
    )
    fecha_correccion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de corrección",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name = "Observación de documento"
        verbose_name_plural = "Observaciones de documentos"
        ordering = ["-fecha_observacion"]
        app_label = "documentos"

    def __str__(self) -> str:
        """Retorna una representación legible de la observación."""
        return f"{self.version_documento.documento} - v{self.version_documento.numero_version} - {self.usuario}"
