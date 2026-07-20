from rest_framework import serializers

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    HistorialEstado,
    Observacion,
    Postulacion,
    SeguimientoEtapa,
)
from apps.usuarios.models import CustomUser


class EstadoPostulacionSerializer(serializers.ModelSerializer):
    """Serializer para exponer el catálogo maestro de estados de postulación."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo EstadoPostulacion."""

        model = EstadoPostulacion
        fields = ("id", "codigo", "nombre", "descripcion", "created_at", "updated_at", "activo")
        read_only_fields = ("id", "created_at", "updated_at", "activo")

    def validate_codigo(self, value: str) -> str:
        """Valida que el código no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El código es obligatorio.")
        return value.strip()

    def validate_nombre(self, value: str) -> str:
        """Valida que el nombre no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value.strip()


class PostulacionSerializer(serializers.ModelSerializer):
    """Serializer para representar una postulación y su estado actual."""

    estudiante_detalle = serializers.SerializerMethodField()
    modalidad_detalle = serializers.SerializerMethodField()
    periodo_detalle = serializers.SerializerMethodField()
    estado_actual_detalle = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo Postulacion."""

        model = Postulacion
        fields = (
            "id",
            "codigo",
            "estudiante",
            "modalidad",
            "periodo",
            "estado_actual",
            "estudiante_detalle",
            "modalidad_detalle",
            "periodo_detalle",
            "estado_actual_detalle",
            "fecha_postulacion",
            "observaciones_generales",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = ("id", "fecha_postulacion", "created_at", "updated_at", "activo")

    def get_estudiante_detalle(self, obj: Postulacion) -> dict:
        return {
            "id": obj.estudiante_id,
            "username": obj.estudiante.username,
            "nombre_completo": obj.estudiante.nombre_completo,
            "ru": obj.estudiante.ru,
        }

    def get_modalidad_detalle(self, obj: Postulacion) -> dict:
        return {
            "id": obj.modalidad_id,
            "codigo": obj.modalidad.codigo,
            "nombre": obj.modalidad.nombre,
        }

    def get_periodo_detalle(self, obj: Postulacion) -> dict:
        return {
            "id": obj.periodo_id,
            "nombre": obj.periodo.nombre,
            "gestion": obj.periodo.gestion,
            "semestre": obj.periodo.semestre,
        }

    def get_estado_actual_detalle(self, obj: Postulacion) -> dict | None:
        if not obj.estado_actual_id:
            return None
        return {
            "id": obj.estado_actual_id,
            "codigo": obj.estado_actual.codigo,
            "nombre": obj.estado_actual.nombre,
        }

    def validate_codigo(self, value: str) -> str:
        """Valida que el código no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El código es obligatorio.")
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        """Valida que la postulación cuente con los datos base necesarios."""
        estudiante = attrs.get("estudiante")
        modalidad = attrs.get("modalidad")
        periodo = attrs.get("periodo")

        if not estudiante:
            raise serializers.ValidationError({"estudiante": "El estudiante es obligatorio."})
        if not modalidad:
            raise serializers.ValidationError({"modalidad": "La modalidad es obligatoria."})
        if not periodo:
            raise serializers.ValidationError({"periodo": "El período es obligatorio."})

        return attrs


class HistorialEstadoSerializer(serializers.ModelSerializer):
    """Serializer para registrar el historial de cambios de estado de una postulación."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo HistorialEstado."""

        model = HistorialEstado
        fields = (
            "id",
            "postulacion",
            "estado_anterior",
            "estado_nuevo",
            "usuario",
            "fecha_cambio",
            "comentario",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = ("id", "fecha_cambio", "created_at", "updated_at", "activo")

    def validate(self, attrs: dict) -> dict:
        """Valida que el cambio de estado cuente con un estado nuevo y un usuario."""
        estado_nuevo = attrs.get("estado_nuevo")
        usuario = attrs.get("usuario")

        if not estado_nuevo:
            raise serializers.ValidationError({"estado_nuevo": "El estado nuevo es obligatorio."})
        if not usuario:
            raise serializers.ValidationError({"usuario": "El usuario es obligatorio."})

        return attrs


class ObservacionSerializer(serializers.ModelSerializer):
    """Serializer para representar observaciones registradas sobre una postulación."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo Observacion."""

        model = Observacion
        fields = (
            "id",
            "postulacion",
            "usuario",
            "comentario",
            "leida_estudiante",
            "fecha_observacion",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = ("id", "fecha_observacion", "created_at", "updated_at", "activo")

    def validate_comentario(self, value: str) -> str:
        """Valida que el comentario no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El comentario es obligatorio.")
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        """Valida que la observación tenga una postulación y un usuario asociados."""
        postulacion = attrs.get("postulacion")
        usuario = attrs.get("usuario")

        if not postulacion:
            raise serializers.ValidationError({"postulacion": "La postulación es obligatoria."})
        if not usuario:
            raise serializers.ValidationError({"usuario": "El usuario es obligatorio."})

        return attrs


class EtapaModalidadSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para etapas configuradas por modalidad."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = EtapaModalidad
        fields = (
            "id",
            "modalidad",
            "codigo",
            "nombre",
            "orden",
            "obligatoria",
            "permite_repeticion",
            "origen_normativo",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = fields


class SeguimientoEtapaSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para el seguimiento de etapas."""

    etapa_id = serializers.IntegerField(source="etapa.id", read_only=True)
    codigo = serializers.CharField(source="etapa.codigo", read_only=True)
    nombre = serializers.CharField(source="etapa.nombre", read_only=True)
    orden = serializers.IntegerField(source="etapa.orden", read_only=True)
    obligatoria = serializers.BooleanField(source="etapa.obligatoria", read_only=True)
    permite_repeticion = serializers.BooleanField(source="etapa.permite_repeticion", read_only=True)
    modalidad_id = serializers.IntegerField(source="etapa.modalidad_id", read_only=True)
    abierta_por_nombre = serializers.CharField(source="abierta_por.username", read_only=True)
    cerrada_por_nombre = serializers.CharField(source="cerrada_por.username", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = SeguimientoEtapa
        fields = (
            "id",
            "postulacion",
            "etapa_id",
            "codigo",
            "nombre",
            "orden",
            "obligatoria",
            "permite_repeticion",
            "modalidad_id",
            "estado",
            "numero_intento",
            "fecha_inicio",
            "fecha_fin",
            "abierta_por",
            "abierta_por_nombre",
            "cerrada_por",
            "cerrada_por_nombre",
            "observaciones",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = fields


class FlujoPostulacionSerializer(serializers.ModelSerializer):
    """Serializer agregado para exponer el flujo de una postulación."""

    modalidad = serializers.SerializerMethodField()
    etapa_actual = serializers.SerializerMethodField()
    porcentaje_avance = serializers.SerializerMethodField()
    etapas = serializers.SerializerMethodField()

    class Meta:
        model = Postulacion
        fields = (
            "id",
            "codigo",
            "modalidad",
            "etapa_actual",
            "porcentaje_avance",
            "etapas",
        )
        read_only_fields = fields

    def get_modalidad(self, obj: Postulacion) -> dict:
        return {
            "id": obj.modalidad_id,
            "codigo": obj.modalidad.codigo,
            "nombre": obj.modalidad.nombre,
        }

    def get_etapas(self, obj: Postulacion) -> list[dict]:
        seguimientos = self._obtener_seguimientos(obj)
        return SeguimientoEtapaSerializer(seguimientos, many=True, context=self.context).data

    def get_etapa_actual(self, obj: Postulacion) -> dict | None:
        seguimientos = self._obtener_seguimientos(obj)
        actual = next(
            (
                seguimiento
                for seguimiento in seguimientos
                if seguimiento.estado in (
                    SeguimientoEtapa.EstadoChoices.EN_PROCESO,
                    SeguimientoEtapa.EstadoChoices.OBSERVADA,
                )
            ),
            None,
        )
        if actual is None:
            actual = next(
                (
                    seguimiento
                    for seguimiento in seguimientos
                    if seguimiento.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE
                ),
                None,
            )
        if actual is None and seguimientos:
            actual = seguimientos[-1]
        if actual is None:
            return None
        return SeguimientoEtapaSerializer(actual, context=self.context).data

    def get_porcentaje_avance(self, obj: Postulacion) -> float:
        seguimientos = self._obtener_seguimientos(obj)
        etapas_obligatorias_ids = {
            seguimiento.etapa_id
            for seguimiento in seguimientos
            if seguimiento.etapa.obligatoria and seguimiento.etapa.activo
        }
        if not etapas_obligatorias_ids:
            return 0.0

        etapas_aprobadas_ids = {
            seguimiento.etapa_id
            for seguimiento in seguimientos
            if seguimiento.estado == SeguimientoEtapa.EstadoChoices.APROBADA
            and seguimiento.etapa.obligatoria
            and seguimiento.etapa.activo
        }
        return round((len(etapas_aprobadas_ids) / len(etapas_obligatorias_ids)) * 100, 2)

    def _obtener_seguimientos(self, obj: Postulacion) -> list[SeguimientoEtapa]:
        seguimientos = getattr(obj, "_prefetched_flujo", None)
        if seguimientos is not None:
            return list(seguimientos)
        queryset = obj.seguimientos_etapa.select_related("etapa", "abierta_por", "cerrada_por").order_by(
            "etapa__orden",
            "numero_intento",
        )
        return list(queryset)


class ObservaSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para observar una etapa."""

    observaciones = serializers.CharField(required=True, allow_blank=False)


class AprobarSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para aprobar una etapa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class RechazarSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para rechazar una etapa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class OmitirSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para omitir una etapa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class AsignacionPostulacionSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para asignaciones de actores en postulaciones."""

    usuario_nombre_completo = serializers.CharField(source="usuario.nombre_completo", read_only=True)
    designado_por_nombre = serializers.CharField(source="designado_por.nombre_completo", read_only=True)
    tipo_participacion_nombre = serializers.CharField(source="get_tipo_participacion_display", read_only=True)
    etapa_id = serializers.IntegerField(source="seguimiento_etapa.etapa_id", read_only=True)
    etapa_codigo = serializers.CharField(source="seguimiento_etapa.etapa.codigo", read_only=True)
    etapa_nombre = serializers.CharField(source="seguimiento_etapa.etapa.nombre", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = AsignacionPostulacion
        fields = (
            "id",
            "postulacion",
            "usuario",
            "usuario_nombre_completo",
            "tipo_participacion",
            "tipo_participacion_nombre",
            "orden_cargo",
            "seguimiento_etapa",
            "etapa_id",
            "etapa_codigo",
            "etapa_nombre",
            "fecha_designacion",
            "fecha_finalizacion",
            "activo",
            "designado_por",
            "designado_por_nombre",
            "observaciones",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AsignarActorSerializer(serializers.Serializer):
    """Payload para asignar un actor a una postulación."""

    usuario = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    tipo_participacion = serializers.ChoiceField(choices=AsignacionPostulacion.TipoParticipacionChoices.choices)
    orden_cargo = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    seguimiento_etapa = serializers.PrimaryKeyRelatedField(
        queryset=SeguimientoEtapa.objects.all(),
        required=False,
        allow_null=True,
    )
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class FinalizarAsignacionSerializer(serializers.Serializer):
    """Payload para finalizar una asignación activa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class ReemplazarActorSerializer(serializers.Serializer):
    """Payload para reemplazar un actor manteniendo historial."""

    nuevo_usuario = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")
