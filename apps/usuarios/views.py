from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework import filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view

from apps.usuarios.serializers import AssignmentCandidateSerializer, LoginSerializer, LogoutSerializer, StudentOptionSerializer, UserProfileSerializer
from apps.usuarios.models import CustomUser
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


class StudentOptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentOptionSerializer
    permission_classes = (IsAuthenticated, IsActiveUser, CanManageApplications)
    pagination_class = StandardResultsSetPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("ru", "ci", "username", "nombres", "apellido_paterno", "apellido_materno")
    ordering_fields = ("ru", "ci", "apellido_paterno", "apellido_materno", "nombres")
    ordering = ("apellido_paterno", "apellido_materno", "nombres")

    def get_queryset(self):
        return CustomUser.objects.filter(
            is_active=True,
            role__codigo__in=UserCapabilitiesService.STUDENT_CODES,
        ).select_related("role")


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
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, description="PÃ¡gina del resultado."),
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
