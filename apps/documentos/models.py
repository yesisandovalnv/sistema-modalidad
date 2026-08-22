from django.conf import settings
from django.core.exceptions import ValidationError
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
        max_length=50,
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
    evento_defensa = models.ForeignKey(
        "postulantes.EventoDefensa",
        on_delete=models.SET_NULL,
        related_name="documentos_vinculados",
        null=True,
        blank=True,
        verbose_name="Evento de defensa relacionado",
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

    def clean(self):
        super().clean()
        if self.evento_defensa_id and self.evento_defensa.postulacion_id != self.postulacion_id:
            raise ValidationError({"evento_defensa": "El evento debe pertenecer a la misma postulación."})


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


class ConfirmacionCorreccionDocumento(BaseModel):
    """Registro técnico trazable de una subsanación documental.

    No constituye certificación oficial, acta ni aprobación institucional.
    Vincula una versión observada con una versión posterior que la subsana.
    Las reglas sobre quién puede confirmarla pertenecen a la policy de modalidad.
    """

    postulacion = models.ForeignKey(
        Postulacion, on_delete=models.CASCADE, related_name="confirmaciones_correccion",
    )
    evento_origen = models.ForeignKey(
        "postulantes.EventoDefensa", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="confirmaciones_correccion",
    )
    version_observada = models.ForeignKey(
        VersionDocumento, on_delete=models.PROTECT, related_name="confirmaciones_observacion",
    )
    version_corregida = models.ForeignKey(
        VersionDocumento, on_delete=models.PROTECT, related_name="confirmaciones_correccion",
    )
    confirmado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="confirmaciones_correccion_realizadas",
    )
    asignacion_confirmante = models.ForeignKey(
        "postulantes.AsignacionPostulacion", on_delete=models.PROTECT, null=True, blank=True,
        related_name="confirmaciones_correccion_emitidas",
    )
    fecha_confirmacion = models.DateTimeField(auto_now_add=True)
    observaciones = models.TextField(blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["-fecha_confirmacion", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["version_observada", "version_corregida"],
                condition=models.Q(activo=True),
                name="confirmacion_correccion_versiones_activa_unica",
            ),
        ]
        indexes = [
            models.Index(fields=["postulacion", "activo"]),
            models.Index(fields=["evento_origen", "activo"]),
        ]

    def clean(self):
        super().clean()
        errors = {}
        observada = self.version_observada if self.version_observada_id else None
        corregida = self.version_corregida if self.version_corregida_id else None
        if observada and corregida:
            if observada.pk == corregida.pk:
                errors["version_corregida"] = "La versión corregida debe ser distinta de la observada."
            if observada.documento_id != corregida.documento_id:
                errors["version_corregida"] = "Ambas versiones deben pertenecer al mismo documento."
            elif corregida.numero_version <= observada.numero_version:
                errors["version_corregida"] = "La versión corregida debe ser posterior a la observada."
            if self.postulacion_id and observada.documento.postulacion_id != self.postulacion_id:
                errors["version_observada"] = "La versión observada debe pertenecer a la misma postulación."
            if self.postulacion_id and corregida.documento.postulacion_id != self.postulacion_id:
                errors["version_corregida"] = "La versión corregida debe pertenecer a la misma postulación."
        if self.evento_origen_id and self.evento_origen.postulacion_id != self.postulacion_id:
            errors["evento_origen"] = "El evento debe pertenecer a la misma postulación."
        if self.asignacion_confirmante_id and self.asignacion_confirmante.postulacion_id != self.postulacion_id:
            errors["asignacion_confirmante"] = "La asignación debe pertenecer a la misma postulación."
        if self.confirmado_por_id and not self.confirmado_por.is_active:
            errors["confirmado_por"] = "El confirmante debe estar activo."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
