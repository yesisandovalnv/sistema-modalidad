from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from decimal import Decimal

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
                condition=models.Q(numero_intento__gte=1),
                name="check_seguimiento_numero_intento_gte_1",
            ),
            models.CheckConstraint(
                condition=(
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
        DIRECTOR_INSTITUTO_INVESTIGACION = "DIRECTOR_INSTITUTO_INVESTIGACION", "Director del Instituto de Investigación"
        VICERRECTOR_POSGRADO = "VICERRECTOR_POSGRADO", "Vicerrector de Posgrado"
        DECANO_FACULTAD = "DECANO_FACULTAD", "Decano de Facultad"
        DIRECTOR_CARRERA = "DIRECTOR_CARRERA", "Director de Carrera"
        SUPERVISOR_INSTITUCIONAL = "SUPERVISOR_INSTITUCIONAL", "Supervisor institucional"

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
        max_length=40,
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
                condition=models.Q(orden_cargo__isnull=True) | models.Q(orden_cargo__gte=1),
                name="check_asignacion_orden_cargo_gte_1",
            ),
            models.CheckConstraint(
                condition=(
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


class CondicionPostulacion(BaseModel):
    """Verificación administrativa no representable como archivo digital."""

    class Tipo(models.TextChoices):
        PLAN_ESTUDIOS = "PLAN_ESTUDIOS", "Plan de estudios"
        ADMISION_COMPLETA = "ADMISION_COMPLETA", "Admisión completa"
        SOLVENCIA_UNIVERSITARIA = "SOLVENCIA_UNIVERSITARIA", "Solvencia universitaria"
        SOLVENCIA_BIBLIOTECA = "SOLVENCIA_BIBLIOTECA", "Solvencia de biblioteca"
        MATRICULA_VIGENTE = "MATRICULA_VIGENTE", "Matrícula vigente"
        PLAZO_MAXIMO = "PLAZO_MAXIMO", "Plazo máximo"

    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        CUMPLE = "CUMPLE", "Cumple"
        NO_CUMPLE = "NO_CUMPLE", "No cumple"

    postulacion = models.ForeignKey(Postulacion, models.CASCADE, related_name="condiciones")
    codigo = models.CharField(max_length=40, choices=Tipo.choices)
    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=40, choices=Tipo.choices)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    fecha_verificacion = models.DateTimeField(null=True, blank=True)
    verificado_por = models.ForeignKey(CustomUser, models.PROTECT, null=True, blank=True, related_name="condiciones_verificadas")
    observaciones = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["postulacion", "codigo"], name="condicion_codigo_postulacion_unico")]
        ordering = ["postulacion", "codigo"]

    def clean(self):
        super().clean(); errors = {}
        self.codigo = (self.codigo or "").strip().upper(); self.tipo = (self.tipo or "").strip().upper(); self.nombre = (self.nombre or "").strip()
        if self.codigo != self.tipo: errors["tipo"] = "El tipo debe corresponder al código normativo."
        if not self.nombre: errors["nombre"] = "El nombre es obligatorio."
        if self.verificado_por_id and not self.verificado_por.is_active: errors["verificado_por"] = "El usuario verificador debe estar activo."
        if self.estado == self.Estado.PENDIENTE and (self.fecha_verificacion or self.verificado_por_id): errors["estado"] = "Una condición pendiente no puede figurar como verificada."
        if self.estado != self.Estado.PENDIENTE and (not self.fecha_verificacion or not self.verificado_por_id): errors["estado"] = "La verificación requiere fecha y responsable."
        if errors: raise ValidationError(errors)

    def save(self, *args, **kwargs): self.full_clean(); return super().save(*args, **kwargs)


class EntregaFisica(BaseModel):
    """Control administrativo de elementos físicos entregados."""

    class Tipo(models.TextChoices):
        FOLDER_AMARILLO = "FOLDER_AMARILLO", "Folder amarillo"
        CD_RESPALDO = "CD_RESPALDO", "CD de respaldo"
        EJEMPLARES_IMPRESOS = "EJEMPLARES_IMPRESOS", "Ejemplares impresos"
        TIMBRE_UNIVERSITARIO = "TIMBRE_UNIVERSITARIO", "Timbre universitario"

    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        PARCIAL = "PARCIAL", "Parcial"
        COMPLETA = "COMPLETA", "Completa"

    postulacion = models.ForeignKey(Postulacion, models.CASCADE, related_name="entregas_fisicas")
    codigo = models.CharField(max_length=40, choices=Tipo.choices)
    nombre = models.CharField(max_length=150)
    cantidad = models.PositiveIntegerField(null=True, blank=True)
    cantidad_recibida = models.PositiveIntegerField(default=0)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    recibido_por = models.ForeignKey(CustomUser, models.PROTECT, null=True, blank=True, related_name="entregas_fisicas_recibidas")
    observaciones = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["postulacion", "codigo"], name="entrega_codigo_postulacion_unico")]
        ordering = ["postulacion", "codigo"]

    def clean(self):
        super().clean(); errors = {}
        self.codigo = (self.codigo or "").strip().upper(); self.nombre = (self.nombre or "").strip()
        if not self.nombre: errors["nombre"] = "El nombre es obligatorio."
        if self.recibido_por_id and not self.recibido_por.is_active: errors["recibido_por"] = "El usuario receptor debe estar activo."
        if self.estado == self.Estado.PENDIENTE and self.cantidad_recibida: errors["estado"] = "Una entrega pendiente no puede tener cantidad recibida."
        if self.estado != self.Estado.PENDIENTE and (not self.fecha_entrega or not self.recibido_por_id): errors["estado"] = "La entrega requiere fecha y responsable."
        if errors: raise ValidationError(errors)

    def save(self, *args, **kwargs): self.full_clean(); return super().save(*args, **kwargs)


class EventoDefensa(BaseModel):
    """Evento académico genérico; sus estados son técnicos del sistema."""

    class Tipo(models.TextChoices):
        DEFENSA_TEMATICA = "DEFENSA_TEMATICA", "Defensa de temática"
        DEFENSA_PERFIL = "DEFENSA_PERFIL", "Defensa de perfil"
        DEFENSA_PRIVADA = "DEFENSA_PRIVADA", "Defensa privada"
        DEFENSA_PUBLICA = "DEFENSA_PUBLICA", "Defensa pública"
    class Estado(models.TextChoices):
        PROGRAMADA = "PROGRAMADA", "Programada"
        EN_CURSO = "EN_CURSO", "En curso"
        FINALIZADA = "FINALIZADA", "Finalizada"
        SUSPENDIDA = "SUSPENDIDA", "Suspendida"
        CANCELADA = "CANCELADA", "Cancelada"
    class ModalidadEvento(models.TextChoices):
        PRESENCIAL = "PRESENCIAL", "Presencial"
        VIRTUAL = "VIRTUAL", "Virtual"
        MIXTA = "MIXTA", "Mixta"

    postulacion = models.ForeignKey(Postulacion, models.CASCADE, related_name="eventos_defensa")
    seguimiento_etapa = models.ForeignKey(SeguimientoEtapa, models.PROTECT, related_name="eventos_defensa")
    tipo_evento = models.CharField(max_length=30, choices=Tipo.choices)
    numero_intento = models.PositiveIntegerField(default=1)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PROGRAMADA)
    fecha_programada = models.DateTimeField()
    fecha_inicio_real = models.DateTimeField(null=True, blank=True)
    fecha_fin_real = models.DateTimeField(null=True, blank=True)
    lugar = models.CharField(max_length=250, blank=True)
    modalidad_evento = models.CharField(max_length=15, choices=ModalidadEvento.choices, default=ModalidadEvento.PRESENCIAL)
    enlace_virtual = models.URLField(blank=True)
    programado_por = models.ForeignKey(CustomUser, models.SET_NULL, null=True, related_name="eventos_programados")
    iniciado_por = models.ForeignKey(CustomUser, models.SET_NULL, null=True, blank=True, related_name="eventos_iniciados")
    cerrado_por = models.ForeignKey(CustomUser, models.SET_NULL, null=True, blank=True, related_name="eventos_cerrados")
    observaciones = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(numero_intento__gte=1), name="evento_intento_gte_1"),
            models.UniqueConstraint(fields=["postulacion", "tipo_evento", "numero_intento"], condition=models.Q(activo=True), name="evento_defensa_activo_unico"),
        ]

    def clean(self):
        super().clean(); errors = {}
        if self.seguimiento_etapa_id and self.postulacion_id and self.seguimiento_etapa.postulacion_id != self.postulacion_id:
            errors["seguimiento_etapa"] = "El seguimiento debe pertenecer a la postulación."
        if self.numero_intento < 1: errors["numero_intento"] = "El intento debe ser mayor o igual a 1."
        if self.fecha_inicio_real and self.fecha_fin_real and self.fecha_fin_real < self.fecha_inicio_real: errors["fecha_fin_real"] = "La fecha final no puede ser anterior al inicio."
        if self.modalidad_evento in (self.ModalidadEvento.VIRTUAL, self.ModalidadEvento.MIXTA) and not self.enlace_virtual: errors["enlace_virtual"] = "El enlace virtual es obligatorio."
        if self.modalidad_evento == self.ModalidadEvento.PRESENCIAL and not self.lugar.strip(): errors["lugar"] = "El lugar es obligatorio."
        if errors: raise ValidationError(errors)
        if self.seguimiento_etapa_id:
            from apps.modalidades.policies import ModalidadPolicyRegistry
            ModalidadPolicyRegistry.get(self.postulacion).evento_policy.validar_correspondencia_evento_etapa(self)

    def save(self, *args, **kwargs): self.full_clean(); return super().save(*args, **kwargs)


class ParticipanteEvento(BaseModel):
    class Rol(models.TextChoices):
        TUTOR="TUTOR", "Tutor"; TRIBUNAL="TRIBUNAL", "Tribunal"; DOCENTE_MODALIDAD="DOCENTE_MODALIDAD", "Docente de modalidad"; PRESIDENTE="PRESIDENTE", "Presidente"; SECRETARIO="SECRETARIO", "Secretario"; VICERRECTOR_POSGRADO="VICERRECTOR_POSGRADO", "Vicerrector de Posgrado"; DECANO_FACULTAD="DECANO_FACULTAD", "Decano de Facultad"; DIRECTOR_CARRERA="DIRECTOR_CARRERA", "Director de Carrera"; SUPERVISOR_INSTITUCIONAL="SUPERVISOR_INSTITUCIONAL", "Supervisor institucional"
    evento = models.ForeignKey(EventoDefensa, models.CASCADE, related_name="participantes")
    asignacion = models.ForeignKey(AsignacionPostulacion, models.PROTECT, related_name="participaciones_evento")
    rol_evento = models.CharField(max_length=30, choices=Rol.choices)
    convocado = models.BooleanField(default=True)
    presente = models.BooleanField(null=True, blank=True)
    fecha_registro_asistencia = models.DateTimeField(null=True, blank=True)
    registrado_por = models.ForeignKey(CustomUser, models.SET_NULL, null=True, blank=True, related_name="asistencias_registradas")
    observaciones = models.TextField(blank=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["evento", "asignacion"], name="participante_evento_asignacion_unica")]
    def clean(self):
        super().clean(); errors={}
        if self.evento_id and self.asignacion_id and self.asignacion.postulacion_id != self.evento.postulacion_id: errors["asignacion"]="La asignación no pertenece a la postulación."
        if self.asignacion_id and not self.asignacion.activo: errors["asignacion"]="La asignación debe estar activa al agregarla al evento."
        if self.asignacion_id and self.asignacion.tipo_participacion != self.rol_evento: errors["rol_evento"]="El rol no es compatible con la asignación."
        if self.presente is not None and self.evento_id and self.evento.estado != EventoDefensa.Estado.EN_CURSO: errors["presente"]="La asistencia solo se registra con el evento en curso."
        if errors: raise ValidationError(errors)
    def save(self,*args,**kwargs): self.full_clean(); return super().save(*args,**kwargs)


class EvaluacionDefensa(BaseModel):
    class Tipo(models.TextChoices): TEMATICA="TEMATICA","Temática"; PERFIL="PERFIL","Perfil"; PRIVADA="PRIVADA","Privada"; PUBLICA="PUBLICA","Pública"; RESULTADO_FINAL="RESULTADO_FINAL","Resultado final"
    class ModalidadRegistro(models.TextChoices): INDIVIDUAL="INDIVIDUAL","Individual"; CONSENSO="CONSENSO","Consenso"
    class Resultado(models.TextChoices): SUFICIENTE="SUFICIENTE","Suficiente"; INSUFICIENTE="INSUFICIENTE","Insuficiente"; POSTERGADO="POSTERGADO","Postergado"; APROBADO="APROBADO","Aprobado"; APROBACION_PLENA="APROBACION_PLENA","Aprobación plena"; APROBACION_PLENA_CON_FELICITACION="APROBACION_PLENA_CON_FELICITACION","Aprobación plena con felicitación"
    evento=models.ForeignKey(EventoDefensa,models.CASCADE,related_name="evaluaciones")
    evaluador=models.ForeignKey(ParticipanteEvento,models.PROTECT,null=True,blank=True,related_name="evaluaciones")
    tipo_evaluacion=models.CharField(max_length=20,choices=Tipo.choices)
    modalidad_registro=models.CharField(max_length=15,choices=ModalidadRegistro.choices)
    resultado_cualitativo=models.CharField(max_length=45,choices=Resultado.choices,blank=True)
    nota_numerica=models.DecimalField(max_digits=5,decimal_places=2,null=True,blank=True)
    ponderacion=models.DecimalField(max_digits=5,decimal_places=2,null=True,blank=True)
    aporte_ponderado=models.DecimalField(max_digits=6,decimal_places=2,null=True,blank=True)
    es_resultado_final_evento=models.BooleanField(default=False)
    observaciones=models.TextField(blank=True)
    registrado_por=models.ForeignKey(CustomUser,models.SET_NULL,null=True,blank=True,related_name="evaluaciones_registradas")
    class Meta:
        constraints=[models.UniqueConstraint(fields=["evento","evaluador","tipo_evaluacion"],condition=models.Q(evaluador__isnull=False),name="evaluacion_individual_unica")]
    def clean(self):
        super().clean(); errors={}; cual={self.Resultado.SUFICIENTE,self.Resultado.INSUFICIENTE}
        if self.evaluador_id and self.evaluador.evento_id != self.evento_id: errors["evaluador"]="El evaluador no pertenece al evento."
        if self.modalidad_registro==self.ModalidadRegistro.INDIVIDUAL and not self.evaluador_id: errors["evaluador"]="La evaluación individual requiere evaluador."
        if self.tipo_evaluacion == self.Tipo.RESULTADO_FINAL and not self.es_resultado_final_evento: errors["es_resultado_final_evento"]="El resultado final debe provenir de la consolidación."
        if errors: raise ValidationError(errors)
        if self.evento_id:
            from apps.modalidades.policies import ModalidadPolicyRegistry
            ModalidadPolicyRegistry.get(self.evento.postulacion).evaluacion_policy.validar_registro(self)
    def save(self,*args,**kwargs): self.full_clean(); return super().save(*args,**kwargs)


class DictamenRevisionDocumento(BaseModel):
    """Dictamen formal, reusable y trazable sobre una versión documental."""

    class TipoRevision(models.TextChoices):
        TUTOR = "TUTOR", "Tutor"
        TRIBUNAL = "TRIBUNAL", "Tribunal"

    class Resultado(models.TextChoices):
        SUFICIENTE = "SUFICIENTE", "Suficiente"
        INSUFICIENTE = "INSUFICIENTE", "Insuficiente"

    seguimiento_etapa = models.ForeignKey(
        SeguimientoEtapa, models.PROTECT, related_name="dictamenes_revision",
    )
    version_documento_revisada = models.ForeignKey(
        "documentos.VersionDocumento", models.PROTECT, related_name="dictamenes_recibidos",
    )
    tipo_revision = models.CharField(max_length=20, choices=TipoRevision.choices)
    resultado = models.CharField(max_length=20, choices=Resultado.choices)
    evidencia_version = models.ForeignKey(
        "documentos.VersionDocumento", models.PROTECT, related_name="evidencias_dictamen_revision",
    )
    asignacion_emisora = models.ForeignKey(
        AsignacionPostulacion, models.PROTECT, null=True, blank=True,
        related_name="dictamenes_emitidos",
    )
    observaciones = models.TextField(blank=True)
    registrado_por = models.ForeignKey(
        CustomUser, models.SET_NULL, null=True, blank=True,
        related_name="dictamenes_revision_registrados",
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["-fecha_registro", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["seguimiento_etapa", "version_documento_revisada", "tipo_revision"],
                condition=models.Q(activo=True),
                name="unique_dictamen_revision_activo_version_tipo",
            ),
        ]
        indexes = [models.Index(fields=["seguimiento_etapa", "tipo_revision", "activo"])]

    def clean(self):
        super().clean()
        errors = {}
        if self.seguimiento_etapa_id and self.version_documento_revisada_id:
            if self.version_documento_revisada.documento.postulacion_id != self.seguimiento_etapa.postulacion_id:
                errors["version_documento_revisada"] = "La versión revisada debe pertenecer a la misma postulación de la etapa."
        if self.seguimiento_etapa_id and self.evidencia_version_id:
            if self.evidencia_version.documento.postulacion_id != self.seguimiento_etapa.postulacion_id:
                errors["evidencia_version"] = "La evidencia debe pertenecer a la misma postulación de la etapa."
        if self.asignacion_emisora_id and self.seguimiento_etapa_id:
            if self.asignacion_emisora.postulacion_id != self.seguimiento_etapa.postulacion_id:
                errors["asignacion_emisora"] = "La asignación emisora debe pertenecer a la misma postulación."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class InformeRevisionTribunalPrevia(BaseModel):
    """Consenso documentado del tribunal sobre una versión del Documento Final."""

    class Resultado(models.TextChoices):
        SUFICIENTE = "SUFICIENTE", "Suficiente"
        INSUFICIENTE = "INSUFICIENTE", "Insuficiente"

    seguimiento_etapa = models.ForeignKey(
        SeguimientoEtapa,
        models.PROTECT,
        related_name="informes_revision_tribunal",
    )
    version_documento_revisada = models.ForeignKey(
        "documentos.VersionDocumento",
        models.PROTECT,
        related_name="informes_revision_tribunal",
    )
    resultado = models.CharField(max_length=20, choices=Resultado.choices)
    observaciones = models.TextField(blank=True)
    evidencia_version = models.ForeignKey(
        "documentos.VersionDocumento",
        models.PROTECT,
        related_name="evidencias_revision_tribunal",
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)
    registrado_por = models.ForeignKey(
        CustomUser,
        models.PROTECT,
        related_name="informes_revision_tribunal_registrados",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["-fecha_registro", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["seguimiento_etapa", "version_documento_revisada"],
                condition=models.Q(activo=True),
                name="unique_informe_revision_activo_version",
            ),
        ]

    def clean(self):
        super().clean()
        self.observaciones = (self.observaciones or "").strip()
        errors = {}
        if self.seguimiento_etapa_id:
            from apps.modalidades.policies import ModalidadPolicyRegistry
            try:
                policy = ModalidadPolicyRegistry.get(self.seguimiento_etapa.postulacion).get_revision_tribunal_previa_policy()
                if not policy:
                    errors["seguimiento_etapa"] = "La modalidad no tiene revisión previa de tribunal configurada."
                else:
                    policy.validar_seguimiento(self.seguimiento_etapa)
            except ValidationError as exc:
                errors["seguimiento_etapa"] = exc.messages
        if self.resultado == self.Resultado.INSUFICIENTE and not self.observaciones:
            errors["observaciones"] = "Las observaciones son obligatorias para un resultado INSUFICIENTE."
        if self.registrado_por_id and not self.registrado_por.is_active:
            errors["registrado_por"] = "El usuario que registra debe estar activo."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.seguimiento_etapa} - {self.resultado}"
