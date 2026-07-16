from django.core.exceptions import ValidationError as DjangoValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Observacion, Postulacion
from apps.postulantes.serializers import (
    EstadoPostulacionSerializer,
    HistorialEstadoSerializer,
    ObservacionSerializer,
    PostulacionSerializer,
)
from apps.postulantes.services import PostulacionService


class EstadoPostulacionViewSet(viewsets.ModelViewSet):
    """ViewSet para administrar el catálogo de estados de postulación."""

    queryset = EstadoPostulacion.objects.all()
    serializer_class = EstadoPostulacionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nombre"]
    ordering_fields = ["codigo", "nombre", "created_at"]


class PostulacionViewSet(viewsets.ModelViewSet):
    """ViewSet para administrar las postulaciones y su estado actual."""

    queryset = Postulacion.objects.all()
    serializer_class = PostulacionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "estudiante__username"]
    ordering_fields = ["codigo", "fecha_postulacion", "created_at"]

    def create(self, request, *args, **kwargs):
        """Crea una postulación usando la lógica de negocio del servicio."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            postulacion = PostulacionService.crear_postulacion(
                {
                    **serializer.validated_data,
                    "usuario": request.user,
                }
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = self.get_serializer(postulacion)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        """Actualiza el estado de una postulación usando el servicio de negocio."""
        postulacion = self.get_object()

        if "estado_actual" in request.data:
            nuevo_estado = EstadoPostulacion.objects.filter(pk=request.data["estado_actual"]).first()
            if not nuevo_estado:
                raise DRFValidationError({"estado_actual": "El estado no existe."})

            try:
                postulacion_actualizada = PostulacionService.cambiar_estado(
                    {
                        "postulacion": postulacion,
                        "nuevo_estado": nuevo_estado,
                        "usuario": request.user,
                        "comentario": request.data.get("comentario"),
                    }
                )
            except DjangoValidationError as exc:
                raise DRFValidationError(str(exc)) from exc

            response_serializer = self.get_serializer(postulacion_actualizada)
            return Response(response_serializer.data)

        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Mantiene el comportamiento estándar de actualización del modelo."""
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Mantiene el comportamiento estándar de eliminación del modelo."""
        return super().destroy(request, *args, **kwargs)


class HistorialEstadoViewSet(viewsets.ModelViewSet):
    """ViewSet para consultar y gestionar el historial de cambios de estado."""

    queryset = HistorialEstado.objects.all()
    serializer_class = HistorialEstadoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["postulacion__codigo"]
    ordering_fields = ["fecha_cambio", "created_at"]


class ObservacionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar las observaciones registradas sobre postulaciones."""

    queryset = Observacion.objects.all()
    serializer_class = ObservacionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["postulacion__codigo", "comentario"]
    ordering_fields = ["fecha_observacion", "created_at"]

    def create(self, request, *args, **kwargs):
        """Crea una observación usando la lógica de negocio del servicio."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            observacion = PostulacionService.agregar_observacion(
                {
                    **serializer.validated_data,
                    "usuario": request.user,
                }
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = self.get_serializer(observacion)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
