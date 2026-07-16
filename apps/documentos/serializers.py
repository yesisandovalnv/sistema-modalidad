from rest_framework import serializers

from apps.documentos.models import (
    DocumentoPostulacion,
    EstadoDocumento,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)


class EstadoDocumentoSerializer(serializers.ModelSerializer):
    """Serializador para los estados de documento."""

    class Meta:
        model = EstadoDocumento
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "activo", "created_at", "updated_at"]


class TipoDocumentoSerializer(serializers.ModelSerializer):
    """Serializador para los tipos de documento."""

    class Meta:
        model = TipoDocumento
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "obligatorio",
            "permite_multiple_version",
            "tamano_maximo_mb",
            "extensiones_permitidas",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "activo", "created_at", "updated_at"]


class VersionDocumentoSerializer(serializers.ModelSerializer):
    """Serializador para versiones de documento."""

    class Meta:
        model = VersionDocumento
        fields = [
            "id",
            "documento",
            "numero_version",
            "archivo",
            "nombre_original",
            "tamano_bytes",
            "hash_sha256",
            "fecha_subida",
            "subido_por",
            "es_version_actual",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "documento",
            "numero_version",
            "nombre_original",
            "tamano_bytes",
            "hash_sha256",
            "fecha_subida",
            "subido_por",
            "es_version_actual",
            "activo",
            "created_at",
            "updated_at",
        ]


class ObservacionDocumentoSerializer(serializers.ModelSerializer):
    """Serializador para observaciones de documentos."""

    class Meta:
        model = ObservacionDocumento
        fields = [
            "id",
            "version_documento",
            "usuario",
            "comentario",
            "leida_por_estudiante",
            "corregida",
            "fecha_observacion",
            "fecha_correccion",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "usuario",
            "corregida",
            "fecha_observacion",
            "fecha_correccion",
            "activo",
            "created_at",
            "updated_at",
        ]


class DocumentoPostulacionSerializer(serializers.ModelSerializer):
    """Serializador para documentos de postulación, incluyendo sus versiones anidadas."""

    versiones = VersionDocumentoSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentoPostulacion
        fields = [
            "id",
            "postulacion",
            "tipo_documento",
            "estado",
            "fecha_subida",
            "fecha_revision",
            "observacion_general",
            "requiere_correccion",
            "versiones",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "versiones",
            "activo",
            "created_at",
            "updated_at",
        ]


class SubirDocumentoSerializer(serializers.Serializer):
    """Serializador para la solicitud de subida de un documento."""

    postulacion_id = serializers.IntegerField(min_value=1)
    tipo_documento_id = serializers.IntegerField(min_value=1)
    archivo = serializers.FileField()

    def validate_archivo(self, value):
        if value is None:
            raise serializers.ValidationError("El archivo es obligatorio.")
        size = getattr(value, "size", None)
        if size == 0:
            raise serializers.ValidationError("El archivo no puede estar vacío.")
        return value


class AprobarDocumentoSerializer(serializers.Serializer):
    """Serializador para la aprobación de un documento."""

    comentario = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class RechazarDocumentoSerializer(serializers.Serializer):
    """Serializador para el rechazo de un documento."""

    motivo = serializers.CharField()

    def validate_motivo(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El motivo del rechazo no puede estar vacío.")
        return value.strip()


class RegistrarObservacionDocumentoSerializer(serializers.Serializer):
    """Serializador para registrar una observación de un documento."""

    comentario = serializers.CharField()

    def validate_comentario(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El comentario no puede estar vacío.")
        return value.strip()
