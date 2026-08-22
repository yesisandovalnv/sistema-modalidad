from rest_framework import serializers

from apps.documentos.models import (
    ConfirmacionCorreccionDocumento,
    DocumentoPostulacion,
    EstadoDocumento,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)


class ConfirmacionCorreccionDocumentoSerializer(serializers.ModelSerializer):
    confirmado_por_nombre = serializers.CharField(source="confirmado_por.username", read_only=True)
    asignacion_confirmante_nombre = serializers.CharField(source="asignacion_confirmante.usuario.username", read_only=True)

    class Meta:
        model = ConfirmacionCorreccionDocumento
        fields = ("id", "postulacion", "evento_origen", "version_observada", "version_corregida", "confirmado_por", "confirmado_por_nombre", "asignacion_confirmante", "asignacion_confirmante_nombre", "fecha_confirmacion", "observaciones", "activo")
        read_only_fields = ("id", "confirmado_por", "confirmado_por_nombre", "asignacion_confirmante_nombre", "fecha_confirmacion", "activo")


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

    subido_por_nombre = serializers.SerializerMethodField()

    def get_subido_por_nombre(self, obj: VersionDocumento) -> str | None:
        if not obj.subido_por:
            return None
        return obj.subido_por.nombre_completo or obj.subido_por.username

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
            "subido_por_nombre",
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

    usuario_nombre = serializers.SerializerMethodField()

    def get_usuario_nombre(self, obj: ObservacionDocumento) -> str | None:
        if not obj.usuario:
            return None
        return obj.usuario.nombre_completo or obj.usuario.username

    class Meta:
        model = ObservacionDocumento
        fields = [
            "id",
            "version_documento",
            "usuario",
            "usuario_nombre",
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
    tipo_documento_nombre = serializers.CharField(source="tipo_documento.nombre", read_only=True)
    tipo_documento_codigo = serializers.CharField(source="tipo_documento.codigo", read_only=True)
    estado_codigo = serializers.CharField(source="estado.codigo", read_only=True)
    estado_nombre = serializers.CharField(source="estado.nombre", read_only=True)
    tiene_observaciones_pendientes = serializers.SerializerMethodField()

    def get_tiene_observaciones_pendientes(self, obj: DocumentoPostulacion) -> bool:
        return ObservacionDocumento.objects.filter(
            version_documento__documento=obj,
            version_documento__es_version_actual=True,
            activo=True,
            corregida=False,
        ).exists()

    class Meta:
        model = DocumentoPostulacion
        fields = [
            "id",
            "postulacion",
            "evento_defensa",
            "tipo_documento",
            "tipo_documento_nombre",
            "tipo_documento_codigo",
            "estado",
            "estado_codigo",
            "estado_nombre",
            "fecha_subida",
            "fecha_revision",
            "observacion_general",
            "requiere_correccion",
            "tiene_observaciones_pendientes",
            "versiones",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "evento_defensa",
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
    evento_defensa_id = serializers.IntegerField(required=False, allow_null=True)

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
