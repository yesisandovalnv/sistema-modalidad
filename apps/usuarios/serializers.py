from django.contrib.auth import authenticate
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.usuarios.models import CustomUser
from apps.usuarios.services import UserCapabilitiesService


class AuthenticatedRoleSerializer(serializers.Serializer):
    codigo = serializers.CharField(allow_blank=True)
    nombre = serializers.CharField(allow_blank=True)


class UserPermissionsSerializer(serializers.Serializer):
    puede_ver_dashboard = serializers.BooleanField()
    puede_ver_reportes = serializers.BooleanField()
    puede_exportar_reportes = serializers.BooleanField()
    puede_ver_notificaciones = serializers.BooleanField()
    puede_gestionar_postulaciones = serializers.BooleanField()
    puede_gestionar_documentos = serializers.BooleanField()
    puede_gestionar_asignaciones = serializers.BooleanField()
    puede_gestionar_defensas = serializers.BooleanField()
    puede_gestionar_evaluaciones = serializers.BooleanField()
    puede_gestionar_cierre = serializers.BooleanField()
    puede_ver_postulaciones = serializers.BooleanField()
    puede_ver_documentos = serializers.BooleanField()
    puede_cargar_documentos = serializers.BooleanField()
    puede_ver_seguimiento = serializers.BooleanField()
    puede_gestionar_seguimiento = serializers.BooleanField()
    puede_gestionar_catalogos = serializers.BooleanField()
    puede_gestionar_usuarios = serializers.BooleanField()
    puede_ver_configuracion = serializers.BooleanField()


class LogoutSerializer(serializers.Serializer):
    """Serializer para recibir el refresh token en el cierre de sesión."""

    refresh = serializers.CharField(required=True, write_only=True)


class LoginSerializer(serializers.Serializer):
    """Serializer para autenticar usuarios con username y password."""

    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Valida las credenciales y devuelve el usuario autenticado."""
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Usuario inactivo.")
        attrs["user"] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para exponer datos básicos del usuario autenticado."""

    nombre_completo = serializers.ReadOnlyField()
    role = serializers.StringRelatedField(read_only=True)
    nombre = serializers.CharField(source="nombre_completo", read_only=True)
    rol = AuthenticatedRoleSerializer(source="role", read_only=True)
    permisos = serializers.SerializerMethodField()

    @extend_schema_field(UserPermissionsSerializer)
    def get_permisos(self, obj):
        return UserCapabilitiesService.resolve(obj)

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "username",
            "nombres",
            "apellido_paterno",
            "apellido_materno",
            "nombre_completo",
            "nombre",
            "ru",
            "ci",
            "role",
            "rol",
            "permisos",
            "correo_personal",
            "correo_institucional",
        )


class StudentOptionSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    codigo = serializers.SerializerMethodField()

    def get_codigo(self, obj) -> str:
        return obj.ru or obj.ci or obj.username

    class Meta:
        model = CustomUser
        fields = ("id", "codigo", "ru", "ci", "nombre_completo")
        read_only_fields = fields
