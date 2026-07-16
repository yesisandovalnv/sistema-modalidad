from rest_framework import serializers

from apps.academico.models import Modalidad, Periodo
from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Observacion, Postulacion
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
            "fecha_postulacion",
            "observaciones_generales",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = ("id", "fecha_postulacion", "created_at", "updated_at", "activo")

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
