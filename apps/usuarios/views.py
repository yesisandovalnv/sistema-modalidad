from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.usuarios.serializers import LoginSerializer, LogoutSerializer, UserProfileSerializer


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

    permission_classes = (IsAuthenticated,)
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

    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer

    def get(self, request, *args, **kwargs):
        """Devuelve los datos básicos del usuario autenticado."""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
