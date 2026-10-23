from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework import filters, mixins, viewsets
from django.db.models import Count
from django.db.models.deletion import ProtectedError
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view

from apps.usuarios.serializers import AssignmentCandidateSerializer, LoginSerializer, LogoutSerializer, RoleAdminSerializer, StudentLoginSerializer, StudentOptionSerializer, UserAdminSerializer, UserProfileSerializer
from apps.usuarios.models import CustomUser, Role
from apps.postulantes.models import Postulacion
from apps.usuarios.services import UserCapabilitiesService
from core.pagination import StandardResultsSetPagination
from core.permissions import IsActiveUser, IsStaff


class CustomTokenObtainPairView(TokenObtainPairView):
    """Endpoint para autenticación y obtención de tokens JWT."""

    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        """Autentica al usuario y devuelve un par de tokens JWT."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )


class CustomTokenRefreshView(TokenRefreshView):
    """Endpoint para refrescar tokens JWT."""

    def post(self, request, *args, **kwargs):
        """Refresca el access token usando un refresh token válido."""
        return super().post(request, *args, **kwargs)


class StudentTokenObtainPairView(APIView):
    """Emite JWT para una cuenta estudiantil existente mediante R.U. y C.I."""

    authentication_classes = ()
    permission_classes = ()
    serializer_class = StudentLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data["tokens"], status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Endpoint para cerrar sesión invalidando el refresh token."""

    permission_classes = (IsAuthenticated, IsActiveUser)
    serializer_class = LogoutSerializer

    def post(self, request, *args, **kwargs):
        """Revoca el refresh token recibido en el cuerpo de la solicitud."""
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh_token = serializer.validated_data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Sesión cerrada correctamente."}, status=status.HTTP_200_OK)
        except Exception as exc:  # pylint: disable=broad-except
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """Endpoint para obtener el perfil del usuario autenticado."""

    permission_classes = (IsAuthenticated, IsActiveUser)
    serializer_class = UserProfileSerializer

    @extend_schema(
        responses=UserProfileSerializer,
        description="Usuario autenticado con rol.codigo estable y capacidades informativas. Los campos role y nombre_completo se conservan temporalmente por compatibilidad y están deprecados para clientes nuevos.",
    )
    def get(self, request, *args, **kwargs):
        """Devuelve los datos básicos del usuario autenticado."""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CanManageApplications(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and UserCapabilitiesService.resolve(request.user)["puede_gestionar_postulaciones"]
        )


class CanManageUsers(BasePermission):
    message = "No tiene permiso para administrar usuarios y roles."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and UserCapabilitiesService.resolve(request.user)["puede_gestionar_usuarios"]
        )

    def has_object_permission(self, request, view, obj):
        if getattr(obj, "is_superuser", False) and not getattr(request.user, "is_superuser", False):
            return False
        return True


class UserAdminViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = UserAdminSerializer
    permission_classes = (IsAuthenticated, IsActiveUser, CanManageUsers)
    pagination_class = StandardResultsSetPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("username", "nombres", "apellido_paterno", "apellido_materno", "ci", "ru", "correo_institucional", "correo_personal")
    ordering_fields = ("username", "nombres", "apellido_paterno", "apellido_materno", "is_active", "role__nombre")
    ordering = ("apellido_paterno", "apellido_materno", "nombres", "username")

    def get_queryset(self):
        queryset = CustomUser.all_objects.select_related("role")
        role_id = self.request.query_params.get("role")
        active = self.request.query_params.get("is_active")
        if role_id:
            queryset = queryset.filter(role_id=role_id)
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        return queryset


class RoleAdminViewSet(viewsets.ModelViewSet):
    serializer_class = RoleAdminSerializer
    permission_classes = (IsAuthenticated, IsActiveUser, CanManageUsers)
    pagination_class = StandardResultsSetPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("codigo", "nombre", "descripcion")
    ordering_fields = ("codigo", "nombre", "activo")
    ordering = ("nombre", "codigo")

    def get_queryset(self):
        queryset = Role.all_objects.annotate(usuarios_count=Count("usuarios"))
        active = self.request.query_params.get("activo")
        if active in {"true", "false"}:
            queryset = queryset.filter(activo=active == "true")
        return queryset

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError("No se puede eliminar un rol asignado a usuarios; inactívelo en su lugar.") from exc


class StudentOptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentOptionSerializer
    permission_classes = (IsAuthenticated, IsActiveUser, CanManageApplications)
    pagination_class = StandardResultsSetPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("ru", "ci", "username", "nombres", "apellido_paterno", "apellido_materno")
    ordering_fields = ("ru", "ci", "apellido_paterno", "apellido_materno", "nombres")
    ordering = ("apellido_paterno", "apellido_materno", "nombres")

    def get_queryset(self):
        queryset = CustomUser.objects.filter(
            is_active=True,
            role__codigo__in=UserCapabilitiesService.STUDENT_CODES,
        ).select_related("role")
        periodo = self.request.query_params.get("periodo")
        modalidad = self.request.query_params.get("modalidad")
        if periodo and modalidad:
            occupied = Postulacion.vigentes().values("estudiante_id")
            queryset = queryset.exclude(id__in=occupied)
        return queryset


@extend_schema_view(
    list=extend_schema(
        description=(
            "Catalogo paginado y de solo lectura para preparar asignaciones. Solo staff o superusuarios; "
            "usuarios autenticados sin esa autoridad reciben 403 y usuarios anonimos reciben 401. "
            "Incluye usuarios activos, con rol y no estudiantes. La presencia en este catalogo no certifica "
            "elegibilidad institucional para Tutor, Tribunal, Docente de modalidad, Presidente o Secretario."
        ),
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Busca por nombre, username o codigo institucional seguro."),
            OpenApiParameter("rol", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Filtra por codigo exacto de rol."),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Orden permitido: username, nombres, apellidos, role__codigo o sus variantes descendentes."),
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Página del resultado."),
        ],
        responses=AssignmentCandidateSerializer(many=True),
    ),
    retrieve=extend_schema(
        description=(
            "Detalle minimo de un candidato visible para staff. No certifica elegibilidad institucional para un cargo."
        ),
        responses=AssignmentCandidateSerializer,
    ),
)
class AssignmentCandidateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssignmentCandidateSerializer
    permission_classes = (IsAuthenticated, IsActiveUser, IsStaff)
    pagination_class = StandardResultsSetPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("username", "nombres", "apellido_paterno", "apellido_materno", "ru")
    ordering_fields = ("username", "nombres", "apellido_paterno", "apellido_materno", "role__codigo")
    ordering = ("apellido_paterno", "apellido_materno", "nombres", "username", "id")

    def get_queryset(self):
        queryset = CustomUser.all_objects.filter(
            is_active=True,
            activo=True,
            role__isnull=False,
        ).exclude(
            role__codigo__in=UserCapabilitiesService.STUDENT_CODES,
        ).select_related("role")
        role_code = self.request.query_params.get("rol", "").strip()
        if role_code:
            queryset = queryset.filter(role__codigo__iexact=role_code)
        return queryset

    @classmethod
    def apply_catalog_filters(cls, queryset, request):
        view = cls()
        for backend in cls.filter_backends:
            queryset = backend().filter_queryset(request, queryset, view)
        return queryset
