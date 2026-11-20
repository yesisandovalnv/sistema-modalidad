from django.contrib.auth import authenticate, password_validation
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.usuarios.models import CustomUser, Role
from apps.usuarios.services import UserCapabilitiesService
from core.permissions import ADMIN_ROLE_CODE, KNOWN_ROLE_CODES


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
    puede_ver_modalidades = serializers.BooleanField()
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
        if getattr(getattr(user, "role", None), "codigo", "") == "ESTUDIANTE":
            raise serializers.ValidationError("Credenciales inválidas.")
        attrs["user"] = user
        return attrs


class StudentLoginSerializer(serializers.Serializer):
    """RU and identity-card credentials exclusive to student accounts."""

    ru = serializers.CharField(required=True, write_only=True, allow_blank=False, max_length=20)
    ci = serializers.CharField(required=True, write_only=True, allow_blank=False, max_length=20)

    def validate(self, attrs):
        from apps.usuarios.student_auth import authenticate_student

        attrs["tokens"] = authenticate_student(
            ru=attrs["ru"],
            ci=attrs["ci"],
            request=self.context["request"],
        )
        return attrs


class StudentCodeRequestSerializer(serializers.Serializer):
    ru = serializers.CharField(required=True, write_only=True, allow_blank=False, max_length=20)
    ci = serializers.CharField(required=True, write_only=True, allow_blank=False, max_length=20)


class StudentCodeConfirmSerializer(serializers.Serializer):
    ru = serializers.CharField(required=True, write_only=True, allow_blank=False, max_length=20)
    ci = serializers.CharField(required=True, write_only=True, allow_blank=False, max_length=20)
    code = serializers.RegexField(r"^\d{6}$", required=True, write_only=True)
    password = serializers.CharField(required=True, write_only=True, allow_blank=False, trim_whitespace=False)


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
            "is_superuser",
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


class AssignmentCandidateSerializer(serializers.ModelSerializer):
    """Representacion minima; pertenecer al catalogo no acredita elegibilidad para un cargo."""

    nombre_completo = serializers.ReadOnlyField()
    codigo = serializers.SerializerMethodField()
    rol_codigo = serializers.CharField(source="role.codigo", read_only=True)
    rol_nombre = serializers.CharField(source="role.nombre", read_only=True)
    activo = serializers.BooleanField(read_only=True)
    elegible = serializers.SerializerMethodField()
    motivo_bloqueo = serializers.SerializerMethodField()
    asignaciones_vigentes = serializers.SerializerMethodField()
    asignaciones_vigentes_detalle = serializers.SerializerMethodField()

    def get_asignaciones_vigentes_detalle(self, obj):
        return getattr(obj, "asignaciones_vigentes_detalle", [])

    def get_codigo(self, obj) -> str:
        return obj.ru or obj.username

    def get_elegible(self, obj) -> bool:
        return bool(getattr(obj, "elegible", True))

    def get_motivo_bloqueo(self, obj):
        return getattr(obj, "motivo_bloqueo", None)

    def get_asignaciones_vigentes(self, obj):
        value = getattr(obj, "asignaciones_vigentes", [])
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        return list(value)

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "username",
            "nombre_completo",
            "codigo",
            "rol_codigo",
            "rol_nombre",
            "activo",
            "elegible",
            "motivo_bloqueo",
            "asignaciones_vigentes",
            "asignaciones_vigentes_detalle",
        )
        read_only_fields = fields


class RoleAdminSerializer(serializers.ModelSerializer):
    usuarios_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = ("id", "codigo", "nombre", "descripcion", "activo", "usuarios_count")


class UserRoleSerializer(AuthenticatedRoleSerializer):
    id = serializers.IntegerField(read_only=True)


class UserAdminSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    role = UserRoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        source="role", queryset=Role.all_objects.filter(activo=True), required=False, allow_null=True
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=False, style={"input_type": "password"})
    permisos = serializers.SerializerMethodField()

    @extend_schema_field(UserPermissionsSerializer)
    def get_permisos(self, obj):
        return UserCapabilitiesService.resolve(obj)

    def validate_password(self, value):
        password_validation.validate_password(value, self.instance)
        return value

    def validate(self, attrs):
        for field in ("ci", "ru"):
            if attrs.get(field) == "":
                attrs[field] = None
        role = attrs.get("role", getattr(self.instance, "role", None))
        role_code = (getattr(role, "codigo", "") or "").strip().upper()
        if role_code and role_code not in KNOWN_ROLE_CODES:
            raise serializers.ValidationError({"role_id": "El rol debe ser ADMINISTRADOR, ADMINISTRACION, DOCENTE o ESTUDIANTE."})
        requested_staff = attrs.get("is_staff", getattr(self.instance, "is_staff", False))
        if role_code != ADMIN_ROLE_CODE and attrs.get("is_staff"):
            raise serializers.ValidationError({
                "is_staff": "Solo un usuario con rol ADMINISTRADOR puede tener acceso a Django Admin."
            })
        attrs["is_staff"] = bool(requested_staff) if role_code == ADMIN_ROLE_CODE else False
        if self.instance and self.instance.is_superuser:
            if role_code != ADMIN_ROLE_CODE:
                raise serializers.ValidationError({"role_id": "Un superusuario debe conservar el rol ADMINISTRADOR."})
            if "is_staff" in attrs and not attrs["is_staff"]:
                raise serializers.ValidationError({"is_staff": "Un superusuario debe conservar el acceso a Django Admin."})
            if "is_active" in attrs and not attrs["is_active"]:
                raise serializers.ValidationError({"is_active": "Un superusuario debe conservarse activo."})
            attrs["is_staff"] = True
            attrs["is_active"] = True
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        importing_student = self.context.get("student_import", False)
        if not password and not importing_student:
            raise serializers.ValidationError({"password": "La contraseña inicial es obligatoria."})
        validated_data["activo"] = validated_data.get("is_active", True)
        user = CustomUser.all_objects.create(**validated_data)
        if importing_student:
            user.set_unusable_password()
        else:
            user.set_password(password)
        user.save(update_fields=["password"])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if "is_active" in validated_data:
            validated_data["activo"] = validated_data["is_active"]
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
        return instance

    class Meta:
        model = CustomUser
        fields = (
            "id", "username", "nombres", "apellido_paterno", "apellido_materno",
            "nombre_completo", "ci", "expedido", "fecha_nacimiento", "telefono",
            "ru", "correo_personal", "correo_institucional", "role", "role_id",
            "is_active", "is_staff", "is_superuser", "password", "permisos",
        )
        read_only_fields = ("id", "nombre_completo", "role", "is_superuser", "permisos")
