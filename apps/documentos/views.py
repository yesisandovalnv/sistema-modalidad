import os

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, Http404
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.documentos.models import ConfirmacionCorreccionDocumento, EstadoDocumento, ObservacionDocumento, TipoDocumento, VersionDocumento, DocumentoPostulacion
from apps.documentos.serializers import (
    AprobarDocumentoSerializer,
    ConfirmacionCorreccionDocumentoSerializer,
    DocumentoPostulacionSerializer,
    ObservacionDocumentoSerializer,
    RechazarDocumentoSerializer,
    RegistrarObservacionDocumentoSerializer,
    SubirDocumentoSerializer,
    TipoDocumentoSerializer,
    VersionDocumentoSerializer,
    EstadoDocumentoSerializer,
)
from apps.documentos.services import ConfirmacionCorreccionDocumentoService, DocumentoService
from apps.postulantes.models import EventoDefensa, Postulacion
from core.permissions import IsStaffOrReadOnly
from core.permissions import is_staff_user


class EstadoDocumentoViewSet(viewsets.ModelViewSet):
    """ViewSet para administrar el catálogo de estados de documento."""

    queryset = EstadoDocumento.objects.all()
    serializer_class = EstadoDocumentoSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nombre"]
    ordering_fields = ["codigo", "nombre", "created_at"]

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Los estados técnicos deben desactivarse, no eliminarse.")


class TipoDocumentoViewSet(viewsets.ModelViewSet):
    """ViewSet para administrar los tipos de documento."""

    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nombre"]
    ordering_fields = ["codigo", "nombre", "created_at"]


class DocumentoPostulacionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar documentos de postulación y acciones de revisión."""

    queryset = DocumentoPostulacion.objects.select_related(
        "postulacion", "tipo_documento", "estado"
    ).prefetch_related("versiones")
    serializer_class = DocumentoPostulacionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "postulacion__codigo",
        "tipo_documento__nombre",
        "estado__codigo",
    ]
    ordering_fields = [
        "postulacion__codigo",
        "tipo_documento__nombre",
        "fecha_subida",
        "fecha_revision",
        "created_at",
    ]
    filterset_fields = ["postulacion"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return queryset.none()
        if is_staff_user(user):
            return queryset
        return queryset.filter(
            Q(postulacion__estudiante=user) | Q(postulacion__asignaciones__usuario=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Los documentos deben subirse mediante la acción /subir/." )

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Los documentos se modifican mediante acciones del workflow.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Los documentos no se eliminan desde la API operativa.")

    @extend_schema(
        request=SubirDocumentoSerializer,
        responses={201: VersionDocumentoSerializer},
    )
    @action(detail=False, methods=["post"], url_path="subir", serializer_class=SubirDocumentoSerializer)
    def subir(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        postulacion = Postulacion.objects.filter(pk=serializer.validated_data["postulacion_id"]).first()
        if not postulacion:
            raise DRFValidationError({"postulacion_id": "La postulación no existe."})

        tipo_documento = TipoDocumento.objects.filter(pk=serializer.validated_data["tipo_documento_id"]).first()
        if not tipo_documento:
            raise DRFValidationError({"tipo_documento_id": "El tipo de documento no existe."})
        evento_defensa = None
        if serializer.validated_data.get("evento_defensa_id") is not None:
            evento_defensa = EventoDefensa.objects.filter(pk=serializer.validated_data["evento_defensa_id"]).first()
            if not evento_defensa:
                raise DRFValidationError({"evento_defensa_id": "El evento de defensa no existe."})

        try:
            version = DocumentoService().subir_documento(
                postulacion=postulacion,
                tipo_documento=tipo_documento,
                archivo=serializer.validated_data["archivo"],
                usuario=request.user,
                request=request,
                evento_defensa=evento_defensa,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = VersionDocumentoSerializer(
            version,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="versiones", serializer_class=VersionDocumentoSerializer)
    def versiones(self, request, pk=None):
        documento = self.get_object()
        versiones = documento.versiones.order_by("-numero_version").select_related("subido_por")
        serializer = self.get_serializer(versiones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="aprobar", serializer_class=AprobarDocumentoSerializer)
    def aprobar(self, request, pk=None):
        documento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            documento_aprobado = DocumentoService().aprobar_documento(
                documento=documento,
                usuario=request.user,
                comentario=serializer.validated_data.get("comentario"),
                request=request,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = DocumentoPostulacionSerializer(
            documento_aprobado,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data)

    @action(detail=True, methods=["post"], url_path="rechazar", serializer_class=RechazarDocumentoSerializer)
    def rechazar(self, request, pk=None):
        documento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            documento_rechazado = DocumentoService().rechazar_documento(
                documento=documento,
                usuario=request.user,
                motivo=serializer.validated_data["motivo"],
                request=request,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = DocumentoPostulacionSerializer(
            documento_rechazado,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="observar",
        serializer_class=RegistrarObservacionDocumentoSerializer,
    )
    def observar(self, request, pk=None):
        documento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            observacion = DocumentoService().registrar_observacion(
                documento=documento,
                usuario=request.user,
                comentario=serializer.validated_data["comentario"],
                request=request,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = ObservacionDocumentoSerializer(
            observacion,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class VersionDocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar versiones de documento."""

    serializer_class = VersionDocumentoSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "documento__postulacion__codigo",
        "documento__tipo_documento__nombre",
        "subido_por__username",
    ]
    ordering_fields = ["numero_version", "fecha_subida", "created_at"]
    filterset_fields = ["documento"]

    def get_queryset(self):
        queryset = VersionDocumento.objects.select_related(
            "documento",
            "documento__postulacion",
            "documento__tipo_documento",
            "subido_por",
        )
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return queryset.none()
        if is_staff_user(user):
            return queryset
        return queryset.filter(
            Q(documento__postulacion__estudiante=user)
            | Q(documento__postulacion__asignaciones__usuario=user)
        ).distinct()

    @action(detail=True, methods=["get"], url_path="descargar")
    def descargar(self, request, pk=None):
        version = self.get_object()
        archivo = version.archivo
        if not archivo or not archivo.name or not archivo.storage.exists(archivo.name):
            raise Http404("El archivo de esta versión no está disponible.")

        try:
            contenido = archivo.storage.open(archivo.name, "rb")
        except (FileNotFoundError, OSError) as exc:
            raise Http404("El archivo de esta versión no está disponible.") from exc

        nombre_original = (version.nombre_original or archivo.name).replace("\\", "/")
        nombre_descarga = os.path.basename(nombre_original).replace("\r", "").replace("\n", "").strip()
        if not nombre_descarga:
            nombre_descarga = f"documento-version-{version.pk}"
        return FileResponse(contenido, as_attachment=True, filename=nombre_descarga)


class ObservacionDocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar observaciones sobre versiones de documento."""

    serializer_class = ObservacionDocumentoSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "version_documento__documento__postulacion__codigo",
        "usuario__username",
        "comentario",
    ]
    ordering_fields = ["fecha_observacion", "fecha_correccion", "created_at"]
    filterset_fields = ["version_documento"]

    def get_queryset(self):
        queryset = ObservacionDocumento.objects.select_related(
            "version_documento",
            "version_documento__documento",
            "version_documento__documento__postulacion",
            "usuario",
        )
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return queryset.none()
        if is_staff_user(user):
            return queryset
        return queryset.filter(
            Q(version_documento__documento__postulacion__estudiante=user)
            | Q(version_documento__documento__postulacion__asignaciones__usuario=user)
        ).distinct()

    @action(detail=True, methods=["post"], url_path="marcar-corregida")
    def marcar_corregida(self, request, pk=None):
        observacion = self.get_object()

        try:
            observacion_corregida = DocumentoService().marcar_observacion_corregida(
                observacion=observacion,
                usuario=request.user,
                request=request,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        serializer = self.get_serializer(observacion_corregida)
        return Response(serializer.data)


class ConfirmacionCorreccionDocumentoViewSet(viewsets.ModelViewSet):
    """Consulta y registro de confirmaciones técnicas del motor documental."""
    serializer_class = ConfirmacionCorreccionDocumentoSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filterset_fields = ["postulacion", "evento_origen", "version_observada", "version_corregida"]

    def get_queryset(self):
        qs = ConfirmacionCorreccionDocumento.objects.select_related("postulacion", "evento_origen", "version_observada", "version_corregida", "confirmado_por", "asignacion_confirmante__usuario")
        if is_staff_user(self.request.user): return qs
        return qs.filter(Q(postulacion__estudiante=self.request.user) | Q(postulacion__asignaciones__usuario=self.request.user)).distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data); serializer.is_valid(raise_exception=True)
        try:
            item = ConfirmacionCorreccionDocumentoService.registrar(confirmado_por=request.user, **serializer.validated_data)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc
        return Response(self.get_serializer(item).data, status=status.HTTP_201_CREATED)
