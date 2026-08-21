from rest_framework import serializers

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    DictamenRevisionDocumento,
    HistorialEstado,
    InformeRevisionTribunalPrevia,
    Observacion,
    Postulacion,
    SeguimientoEtapa,
)
from apps.documentos.models import VersionDocumento
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
        estudiante = attrs.get("estudiante", getattr(self.instance, "estudiante", None))
        modalidad = attrs.get("modalidad", getattr(self.instance, "modalidad", None))
        periodo = attrs.get("periodo", getattr(self.instance, "periodo", None))

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
    estado_anterior_nombre = serializers.CharField(source="estado_anterior.nombre", read_only=True, allow_null=True)
    estado_nuevo_nombre = serializers.CharField(source="estado_nuevo.nombre", read_only=True)
    actor_nombre = serializers.SerializerMethodField()

    def get_actor_nombre(self, obj: HistorialEstado) -> str | None:
        if not obj.usuario:
            return None
        return obj.usuario.nombre_completo or obj.usuario.username

    class Meta:
        """Configuración del serializer para el modelo HistorialEstado."""

        model = HistorialEstado
        fields = (
            "id",
            "postulacion",
            "estado_anterior",
            "estado_anterior_nombre",
            "estado_nuevo",
            "estado_nuevo_nombre",
            "usuario",
            "actor_nombre",
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


class RegistrarDictamenRevisionSerializer(serializers.Serializer):
    version_documento_revisada = serializers.PrimaryKeyRelatedField(queryset=VersionDocumento.objects.all())
    tipo_revision = serializers.ChoiceField(choices=DictamenRevisionDocumento.TipoRevision.choices)
    resultado = serializers.ChoiceField(choices=DictamenRevisionDocumento.Resultado.choices)
    evidencia_version = serializers.PrimaryKeyRelatedField(queryset=VersionDocumento.objects.all())
    asignacion_emisora = serializers.PrimaryKeyRelatedField(queryset=AsignacionPostulacion.objects.all(), required=False, allow_null=True)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class DictamenRevisionSerializer(serializers.ModelSerializer):
    evidencia_version_nombre = serializers.CharField(source="evidencia_version.nombre_original", read_only=True)
    version_documento_revisada_numero = serializers.IntegerField(source="version_documento_revisada.numero_version", read_only=True)

    class Meta:
        model = DictamenRevisionDocumento
        fields = ("id", "seguimiento_etapa", "version_documento_revisada", "version_documento_revisada_numero", "tipo_revision", "resultado", "evidencia_version", "evidencia_version_nombre", "asignacion_emisora", "observaciones", "registrado_por", "fecha_registro", "activo")
        read_only_fields = ("id", "seguimiento_etapa", "registrado_por", "fecha_registro", "activo")


class RegistrarInformeRevisionTribunalSerializer(serializers.Serializer):
    version_documento_revisada = serializers.PrimaryKeyRelatedField(
        queryset=VersionDocumento.all_objects.all(),
    )
    resultado = serializers.ChoiceField(choices=InformeRevisionTribunalPrevia.Resultado.choices)
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")
    evidencia_version = serializers.PrimaryKeyRelatedField(
        queryset=VersionDocumento.all_objects.all(),
    )

    def validate(self, attrs):
        if (
            attrs.get("resultado") == InformeRevisionTribunalPrevia.Resultado.INSUFICIENTE
            and not attrs.get("observaciones", "").strip()
        ):
            raise serializers.ValidationError(
                {"observaciones": "Las observaciones son obligatorias para un resultado INSUFICIENTE."}
            )
        return attrs


class InformeRevisionTribunalSerializer(serializers.ModelSerializer):
    resultado_display = serializers.CharField(source="get_resultado_display", read_only=True)
    numero_version_revisada = serializers.IntegerField(
        source="version_documento_revisada.numero_version", read_only=True,
    )
    documento_final_nombre = serializers.CharField(
        source="version_documento_revisada.nombre_original", read_only=True,
    )
    evidencia_nombre_original = serializers.CharField(
        source="evidencia_version.nombre_original", read_only=True,
    )
    registrado_por_nombre = serializers.SerializerMethodField()

    def get_registrado_por_nombre(self, obj):
        return obj.registrado_por.nombre_completo or obj.registrado_por.username

    class Meta:
        model = InformeRevisionTribunalPrevia
        fields = (
            "id", "seguimiento_etapa", "version_documento_revisada",
            "numero_version_revisada", "documento_final_nombre", "resultado",
            "resultado_display", "observaciones", "evidencia_version",
            "evidencia_nombre_original", "fecha_registro", "registrado_por",
            "registrado_por_nombre", "activo", "created_at", "updated_at",
        )
        read_only_fields = fields


class AsignacionPostulacionSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para asignaciones de actores en postulaciones."""

    usuario_nombre_completo = serializers.CharField(source="usuario.nombre_completo", read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    designado_por_nombre = serializers.CharField(source="designado_por.nombre_completo", read_only=True)
    tipo_participacion_nombre = serializers.CharField(source="get_tipo_participacion_display", read_only=True)
    tipo_participacion_display = serializers.CharField(source="get_tipo_participacion_display", read_only=True)
    fecha_inicio = serializers.DateTimeField(source="fecha_designacion", read_only=True)
    fecha_fin = serializers.DateTimeField(source="fecha_finalizacion", read_only=True)
    asignado_por = serializers.IntegerField(source="designado_por_id", read_only=True)
    asignado_por_nombre = serializers.SerializerMethodField()
    etapa_id = serializers.IntegerField(source="seguimiento_etapa.etapa_id", read_only=True)
    etapa_codigo = serializers.CharField(source="seguimiento_etapa.etapa.codigo", read_only=True)
    etapa_nombre = serializers.CharField(source="seguimiento_etapa.etapa.nombre", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    @staticmethod
    def _nombre_usuario(usuario) -> str:
        if not usuario:
            return "Usuario no disponible"
        return usuario.nombre_completo or usuario.username or f"Usuario {usuario.pk}"

    def get_usuario_nombre(self, obj: AsignacionPostulacion) -> str:
        return self._nombre_usuario(obj.usuario)

    def get_asignado_por_nombre(self, obj: AsignacionPostulacion) -> str | None:
        return self._nombre_usuario(obj.designado_por) if obj.designado_por_id else None

    class Meta:
        model = AsignacionPostulacion
        fields = (
            "id",
            "postulacion",
            "usuario",
            "usuario_nombre_completo",
            "usuario_nombre",
            "tipo_participacion",
            "tipo_participacion_nombre",
            "tipo_participacion_display",
            "orden_cargo",
            "seguimiento_etapa",
            "etapa_id",
            "etapa_codigo",
            "etapa_nombre",
            "fecha_designacion",
            "fecha_finalizacion",
            "fecha_inicio",
            "fecha_fin",
            "activo",
            "designado_por",
            "designado_por_nombre",
            "asignado_por",
            "asignado_por_nombre",
            "observaciones",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AsignarActorSerializer(serializers.Serializer):
    """Payload para asignar un actor a una postulación."""

    usuario = serializers.PrimaryKeyRelatedField(queryset=CustomUser.all_objects.filter(is_active=True, activo=True))
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

    nuevo_usuario = serializers.PrimaryKeyRelatedField(queryset=CustomUser.all_objects.filter(is_active=True, activo=True))
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")
