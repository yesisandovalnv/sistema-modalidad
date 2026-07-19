from rest_framework import serializers

from apps.academico.models import Modalidad, ModalidadRequisito, Periodo, Requisito
from apps.modalidades.policies import ModalidadCapabilities


class PeriodoSerializer(serializers.ModelSerializer):
    """Serializer para exponer y validar los períodos académicos."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Periodo
        fields = ("id", "nombre", "fecha_inicio", "fecha_fin", "created_at", "updated_at", "activo")
        read_only_fields = ("created_at", "updated_at", "activo")

    def validate(self, attrs):
        """Valida que la fecha de fin sea posterior a la fecha de inicio."""
        fecha_inicio = attrs.get("fecha_inicio")
        fecha_fin = attrs.get("fecha_fin")

        if fecha_inicio and fecha_fin and fecha_fin <= fecha_inicio:
            raise serializers.ValidationError({"fecha_fin": "La fecha de fin debe ser posterior a la fecha de inicio."})
        return attrs


class ModalidadSerializer(serializers.ModelSerializer):
    """Serializer para exponer y validar las modalidades académicas."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Modalidad
        fields = ("id", "codigo", "nombre", "descripcion", "created_at", "updated_at", "activo")
        read_only_fields = ("created_at", "updated_at", "activo")


class EtapaCapabilitiesSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True, help_text="ID persistido de EtapaModalidad; null indica inconsistencia de configuración.")
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    orden = serializers.IntegerField()
    obligatoria = serializers.BooleanField()
    inicial = serializers.BooleanField()
    final = serializers.BooleanField()
    permite_reapertura = serializers.BooleanField(required=False)
    siguientes_permitidas = serializers.ListField(child=serializers.CharField(), required=False)
    capacidades_requeridas = serializers.ListField(child=serializers.CharField(), required=False)


class ModalidadCapabilitiesSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    soportada = serializers.BooleanField()
    workflow_configurado = serializers.BooleanField()
    eventos_soportados = serializers.BooleanField()
    evaluaciones_soportadas = serializers.BooleanField()
    asignaciones_soportadas = serializers.BooleanField()
    condiciones_soportadas = serializers.BooleanField()
    entregas_soportadas = serializers.BooleanField()
    cierre_soportado = serializers.BooleanField()
    tipos_evento = serializers.ListField(child=serializers.CharField())
    tipos_evaluacion = serializers.ListField(child=serializers.CharField())
    etapas = EtapaCapabilitiesSerializer(many=True)
    advertencias = serializers.ListField(child=serializers.CharField())
    configuracion_valida = serializers.BooleanField()


class RequisitoSerializer(serializers.ModelSerializer):
    """Serializer para exponer y validar el catálogo de requisitos."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Requisito
        fields = ("id", "codigo", "nombre", "descripcion", "obligatorio", "created_at", "updated_at", "activo")
        read_only_fields = ("created_at", "updated_at", "activo")


class ModalidadRequisitoSerializer(serializers.ModelSerializer):
    """Serializer para exponer y validar la relación entre modalidad y requisito."""

    modalidad = serializers.PrimaryKeyRelatedField(queryset=Modalidad.objects.all())
    requisito = serializers.PrimaryKeyRelatedField(queryset=Requisito.objects.all())
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = ModalidadRequisito
        fields = ("id", "modalidad", "requisito", "orden", "created_at", "updated_at", "activo")
        read_only_fields = ("created_at", "updated_at", "activo")

    def validate_orden(self, value):
        """Valida que el orden sea mayor que cero."""
        if value <= 0:
            raise serializers.ValidationError("El orden debe ser mayor que cero.")
        return value

    def validate(self, attrs):
        """Evita duplicar un requisito dentro de la misma modalidad."""
        modalidad = attrs.get("modalidad")
        requisito = attrs.get("requisito")

        if modalidad and requisito:
            exists = ModalidadRequisito.objects.filter(modalidad=modalidad, requisito=requisito).exists()
            if exists:
                raise serializers.ValidationError("Ya existe un requisito registrado para esta modalidad.")
        return attrs
