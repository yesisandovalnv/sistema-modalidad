from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from apps.academico.models import Modalidad, ModalidadRequisito, Periodo, Requisito
from apps.academico.serializers import (
    ModalidadRequisitoSerializer,
    ModalidadSerializer,
    PeriodoSerializer,
    RequisitoSerializer,
)
from core.pagination import StandardResultsSetPagination


class PeriodoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar los períodos académicos."""

    queryset = Periodo.objects.all()
    serializer_class = PeriodoSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo",)
    search_fields = ("nombre",)
    ordering_fields = ("nombre", "fecha_inicio", "fecha_fin", "created_at")
    ordering = ("-fecha_inicio",)


class ModalidadViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar las modalidades académicas."""

    queryset = Modalidad.objects.all()
    serializer_class = ModalidadSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo",)
    search_fields = ("codigo", "nombre")
    ordering_fields = ("codigo", "nombre", "created_at")
    ordering = ("nombre",)


class RequisitoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar el catálogo de requisitos."""

    queryset = Requisito.objects.all()
    serializer_class = RequisitoSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo", "obligatorio")
    search_fields = ("codigo", "nombre")
    ordering_fields = ("codigo", "nombre", "created_at")
    ordering = ("nombre",)


class ModalidadRequisitoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar los requisitos asociados a una modalidad."""

    queryset = ModalidadRequisito.objects.all()
    serializer_class = ModalidadRequisitoSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo", "modalidad", "requisito")
    search_fields = ("modalidad__nombre", "requisito__nombre")
    ordering_fields = ("modalidad", "requisito", "orden", "created_at")
    ordering = ("modalidad", "orden")
