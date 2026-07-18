from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
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


class SeguimientoEtapa(BaseModel):
    """Representa la ejecución de una etapa configurada dentro de una postulación."""

    class EstadoChoices(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        OBSERVADA = "OBSERVADA", "Observada"
        APROBADA = "APROBADA", "Aprobada"
        RECHAZADA = "RECHAZADA", "Rechazada"
        OMITIDA = "OMITIDA", "Omitida"

    postulacion = models.ForeignKey(
        Postulacion,
        on_delete=models.CASCADE,
        related_name="seguimientos_etapa",
        verbose_name="Postulación",
    )
    etapa = models.ForeignKey(
        EtapaModalidad,
        on_delete=models.PROTECT,
        related_name="seguimientos",
        verbose_name="Etapa",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name="Estado",
        help_text="Estado técnico del sistema; no corresponde a nombres oficiales del reglamento.",
    )
    numero_intento = models.PositiveIntegerField(
        default=1,
        verbose_name="Número de intento",
    )
    fecha_inicio = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de inicio",
    )
    fecha_fin = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de fin",
    )
    abierta_por = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="seguimientos_etapa_abiertos",
        verbose_name="Abierta por",
    )
    cerrada_por = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="seguimientos_etapa_cerrados",
        verbose_name="Cerrada por",
    )
    observaciones = models.TextField(
        blank=True,
        verbose_name="Observaciones",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo SeguimientoEtapa para administración y consultas."""

        verbose_name = "Seguimiento de etapa"
        verbose_name_plural = "Seguimientos de etapa"
        ordering = ["postulacion", "etapa__orden", "numero_intento"]
        app_label = "postulantes"
        constraints = [
            models.UniqueConstraint(
                fields=["postulacion", "etapa", "numero_intento"],
                name="unique_postulacion_etapa_intento",
            ),
            models.CheckConstraint(
                check=models.Q(numero_intento__gte=1),
                name="check_seguimiento_numero_intento_gte_1",
            ),
            models.CheckConstraint(
                check=(
                    models.Q(fecha_inicio__isnull=True)
                    | models.Q(fecha_fin__isnull=True)
                    | models.Q(fecha_fin__gte=models.F("fecha_inicio"))
                ),
                name="check_seguimiento_fechas_validas",
            ),
        ]
        indexes = [
            models.Index(fields=["postulacion", "estado"], name="idx_seg_post_estado"),
            models.Index(fields=["postulacion", "etapa"], name="idx_seg_post_etapa"),
            models.Index(fields=["etapa", "estado"], name="idx_seg_etapa_estado"),
        ]

    def clean(self) -> None:
        """Valida coherencia básica entre la etapa y la postulación."""
        super().clean()
        self.observaciones = (self.observaciones or "").strip()

        errors = {}
        if self.numero_intento is not None and self.numero_intento <= 0:
            errors["numero_intento"] = "El número de intento debe ser mayor que cero."
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            errors["fecha_fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio."
        if self.postulacion_id and self.etapa_id and self.postulacion.modalidad_id != self.etapa.modalidad_id:
            errors["etapa"] = "La etapa debe pertenecer a la misma modalidad que la postulación."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        """Guarda el seguimiento aplicando validaciones antes de persistirlo."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Retorna una representación legible del seguimiento."""
        return f"{self.postulacion.codigo} - {self.etapa.codigo} - intento {self.numero_intento}"


class AsignacionPostulacion(BaseModel):
    """Representa la asignación histórica de actores dentro de una postulación."""

    class TipoParticipacionChoices(models.TextChoices):
        TUTOR = "TUTOR", "Tutor"
        TRIBUNAL = "TRIBUNAL", "Tribunal"
        DOCENTE_MODALIDAD = "DOCENTE_MODALIDAD", "Docente de modalidad"
        PRESIDENTE = "PRESIDENTE", "Presidente"
        SECRETARIO = "SECRETARIO", "Secretario"

    postulacion = models.ForeignKey(
        Postulacion,
        on_delete=models.CASCADE,
        related_name="asignaciones",
        verbose_name="Postulación",
    )
    usuario = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        related_name="asignaciones_postulacion",
        verbose_name="Usuario asignado",
    )
    tipo_participacion = models.CharField(
        max_length=30,
        choices=TipoParticipacionChoices.choices,
        verbose_name="Tipo de participación",
        help_text=(
            "Código técnico del sistema fundamentado en los actores del reglamento y el diagrama oficial."
        ),
    )
    orden_cargo = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Orden del cargo",
    )
    fecha_designacion = models.DateTimeField(
        default=timezone.now,
        verbose_name="Fecha de designación",
    )
    fecha_finalizacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de finalización",
    )
    designado_por = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="asignaciones_realizadas",
        verbose_name="Designado por",
    )
    seguimiento_etapa = models.ForeignKey(
        SeguimientoEtapa,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="asignaciones_actor",
        verbose_name="Seguimiento de etapa",
    )
    observaciones = models.TextField(
        blank=True,
        verbose_name="Observaciones",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo AsignacionPostulacion para administración y consultas."""

        verbose_name = "Asignación de postulación"
        verbose_name_plural = "Asignaciones de postulación"
        ordering = ["postulacion", "tipo_participacion", "orden_cargo", "-fecha_designacion"]
        app_label = "postulantes"
        constraints = [
            models.CheckConstraint(
                check=models.Q(orden_cargo__isnull=True) | models.Q(orden_cargo__gte=1),
                name="check_asignacion_orden_cargo_gte_1",
            ),
            models.CheckConstraint(
                check=(
                    models.Q(fecha_finalizacion__isnull=True)
                    | models.Q(fecha_finalizacion__gte=models.F("fecha_designacion"))
                ),
                name="check_asignacion_fechas_validas",
            ),
            models.UniqueConstraint(
                fields=["postulacion", "usuario", "tipo_participacion", "orden_cargo"],
                condition=models.Q(activo=True, orden_cargo__isnull=False),
                name="unique_asignacion_activa_con_orden",
            ),
            models.UniqueConstraint(
                fields=["postulacion", "usuario", "tipo_participacion"],
                condition=models.Q(activo=True, orden_cargo__isnull=True),
                name="unique_asignacion_activa_sin_orden",
            ),
        ]
        indexes = [
            models.Index(
                fields=["postulacion", "tipo_participacion", "activo"],
                name="idx_asig_post_tipo_act",
            ),
            models.Index(fields=["usuario", "activo"], name="idx_asig_usuario_act"),
            models.Index(fields=["postulacion", "activo"], name="idx_asig_post_act"),
            models.Index(fields=["tipo_participacion", "activo"], name="idx_asig_tipo_act"),
        ]

    def clean(self) -> None:
        """Valida la consistencia entre postulación, contexto y fechas de la asignación."""
        super().clean()
        self.tipo_participacion = (self.tipo_participacion or "").strip().upper()
        self.observaciones = (self.observaciones or "").strip()

        errors = {}
        if not self.tipo_participacion:
            errors["tipo_participacion"] = "El tipo de participación es obligatorio."
        if self.orden_cargo is not None and self.orden_cargo <= 0:
            errors["orden_cargo"] = "El orden del cargo debe ser mayor o igual a 1."
        if self.fecha_finalizacion and self.fecha_designacion and self.fecha_finalizacion < self.fecha_designacion:
            errors["fecha_finalizacion"] = "La fecha de finalización no puede ser anterior a la designación."
        if self.postulacion_id and self.seguimiento_etapa_id and self.seguimiento_etapa.postulacion_id != self.postulacion_id:
            errors["seguimiento_etapa"] = "El seguimiento de etapa debe pertenecer a la misma postulación."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        """Guarda la asignación aplicando validaciones antes de persistirla."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Retorna una representación legible de la asignación."""
        return f"{self.postulacion.codigo} - {self.tipo_participacion} - {self.usuario}"
