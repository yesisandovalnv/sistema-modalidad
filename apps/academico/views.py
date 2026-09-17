import os

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import FileResponse, Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.academico.models import DocumentoOficialModalidad, EtapaModalidad, Modalidad, ModalidadRequisito, Periodo, Requisito
from apps.academico.serializers import (
    DocumentoOficialModalidadSerializer,
    ModalidadRequisitoSerializer,
    ModalidadSerializer,
    ModalidadCapabilitiesSerializer,
    PeriodoSerializer,
    RequisitoSerializer,
)
from apps.usuarios.models import AuditLog
from core.pagination import StandardResultsSetPagination
from core.permissions import IsStaffOrReadOnly


class PeriodoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar los períodos académicos."""

    queryset = Periodo.objects.all()
    serializer_class = PeriodoSerializer
    permission_classes = (permissions.IsAuthenticated, IsStaffOrReadOnly)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo", "gestion", "semestre")
    search_fields = ("nombre", "gestion")
    ordering_fields = ("nombre", "gestion", "semestre", "fecha_inicio", "fecha_fin", "created_at")
    ordering = ("-gestion", "-semestre", "-fecha_inicio")


class ModalidadViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar las modalidades académicas."""

    queryset = Modalidad.objects.all()
    serializer_class = ModalidadSerializer
    permission_classes = (permissions.IsAuthenticated, IsStaffOrReadOnly)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo",)
    search_fields = ("codigo", "nombre")
    ordering_fields = ("codigo", "nombre", "created_at")
    ordering = ("nombre",)

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Las modalidades oficiales no se crean desde esta API.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Las modalidades oficiales no se eliminan desde esta API.")

    def _documento_oficial(self, modalidad, documento_id=None):
        queryset = DocumentoOficialModalidad.objects.filter(modalidad=modalidad)
        if documento_id is not None:
            return queryset.filter(pk=documento_id).first()
        return queryset.order_by("created_at")

    def _guardar_documento_oficial(self, request, modalidad, documento=None):
        serializer = DocumentoOficialModalidadSerializer(
            instance=documento,
            data=request.data,
            partial=bool(documento),
        )
        serializer.is_valid(raise_exception=True)
        archivo_nuevo = serializer.validated_data.get("archivo")
        anterior = documento.archivo.name if documento and archivo_nuevo else None
        with transaction.atomic():
            if documento:
                documento.nombre = serializer.validated_data.get("nombre", documento.nombre)
                if archivo_nuevo:
                    documento.archivo = archivo_nuevo
                documento.actualizado_por = request.user
                update_fields = ["nombre", "actualizado_por", "updated_at"]
                if archivo_nuevo:
                    update_fields.append("archivo")
                documento.save(update_fields=update_fields)
                accion = "ACTUALIZAR_DOCUMENTO_OFICIAL_MODALIDAD"
            else:
                documento = DocumentoOficialModalidad.objects.create(
                    modalidad=modalidad,
                    nombre=serializer.validated_data["nombre"],
                    archivo=serializer.validated_data["archivo"],
                    actualizado_por=request.user,
                )
                accion = "PUBLICAR_DOCUMENTO_OFICIAL_MODALIDAD"
            AuditLog.objects.create(
                usuario=request.user,
                accion=accion,
                modulo="ACADEMICO",
                descripcion=f"{accion}: documento {documento.pk} de modalidad {modalidad.codigo} ({modalidad.pk}).",
                metodo_http=request.method,
                url=request.path,
            )
        if anterior and documento.archivo.name != anterior:
            transaction.on_commit(lambda: documento.archivo.storage.delete(anterior))
        response_status = status.HTTP_200_OK if accion.startswith("ACTUALIZAR") else status.HTTP_201_CREATED
        return Response(DocumentoOficialModalidadSerializer(documento).data, status=response_status)

    @action(detail=True, methods=("get", "post"), url_path="documentos-oficiales", parser_classes=(MultiPartParser, FormParser))
    def documentos_oficiales(self, request, pk=None):
        modalidad = self.get_object()
        if request.method == "GET":
            return Response(DocumentoOficialModalidadSerializer(self._documento_oficial(modalidad), many=True).data)
        return self._guardar_documento_oficial(request, modalidad)

    @action(detail=True, methods=("get", "patch", "put"), url_path=r"documentos-oficiales/(?P<documento_id>[^/.]+)", parser_classes=(MultiPartParser, FormParser))
    def documento_oficial_detalle(self, request, pk=None, documento_id=None):
        modalidad = self.get_object()
        documento = self._documento_oficial(modalidad, documento_id)
        if not documento:
            raise Http404("El documento oficial no pertenece a esta modalidad.")
        if request.method == "GET":
            return Response(DocumentoOficialModalidadSerializer(documento).data)
        return self._guardar_documento_oficial(request, modalidad, documento)

    @action(detail=True, methods=("get",), url_path=r"documentos-oficiales/(?P<documento_id>[^/.]+)/descargar")
    def descargar_documento_oficial(self, request, pk=None, documento_id=None):
        modalidad = self.get_object()
        documento = self._documento_oficial(modalidad, documento_id)
        if not documento:
            raise Http404("El documento oficial no pertenece a esta modalidad.")
        if not documento or not documento.archivo or not documento.archivo.storage.exists(documento.archivo.name):
            raise Http404("El documento oficial no está disponible.")
        try:
            contenido = documento.archivo.storage.open(documento.archivo.name, "rb")
        except (FileNotFoundError, OSError) as exc:
            raise Http404("El documento oficial no está disponible.") from exc
        nombre = os.path.basename(documento.archivo.name).replace("\r", "").replace("\n", "")
        return FileResponse(contenido, as_attachment=True, filename=nombre or "requisitos-oficiales.pdf")

    @extend_schema(responses=ModalidadCapabilitiesSerializer, description="Capacidades académicas configuradas. Cada etapa incluye el ID persistido de EtapaModalidad; id=null indica una definición declarativa no persistida y configuracion_valida=false. Una modalidad sin policy conserva sus etapas persistidas sólo para consulta y se devuelve como soportada=false.")
    @action(detail=True, methods=("get",), url_path="capacidades")
    def capacidades(self, request, pk=None):
        from apps.modalidades.policies import ModalidadPolicyRegistry, unsupported_capabilities
        from apps.modalidades.validators import ModalidadConfigurationValidator
        modalidad = self.get_object()
        persisted = {stage.codigo: stage for stage in EtapaModalidad.objects.filter(modalidad=modalidad).order_by("orden")}
        if not ModalidadPolicyRegistry.has_policy(modalidad):
            capabilities = unsupported_capabilities(modalidad)
            capabilities.etapas = [
                {"id": stage.pk, "codigo": stage.codigo, "nombre": stage.nombre, "orden": stage.orden,
                 "obligatoria": stage.obligatoria, "inicial": False, "final": False}
                for stage in persisted.values()
            ]
        else:
            capabilities = ModalidadPolicyRegistry.get(modalidad).get_capabilities(modalidad)
            validation = ModalidadConfigurationValidator.validate_modalidad(modalidad)
            capabilities.advertencias.extend(validation.advertencias)
            capabilities.advertencias.extend(validation.errores)
            capabilities.configuracion_valida = validation.valida
            for stage in capabilities.etapas:
                stored = persisted.get(stage["codigo"])
                stage["id"] = stored.pk if stored else None
                if stored:
                    stage["nombre"] = stored.nombre
                    stage["orden"] = stored.orden
        return Response(ModalidadCapabilitiesSerializer(capabilities.to_dict()).data)


class RequisitoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar el catálogo de requisitos."""

    queryset = Requisito.objects.all()
    serializer_class = RequisitoSerializer
    permission_classes = (permissions.IsAuthenticated, IsStaffOrReadOnly)
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
    permission_classes = (permissions.IsAuthenticated, IsStaffOrReadOnly)
    pagination_class = StandardResultsSetPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("activo", "modalidad", "requisito")
    search_fields = ("modalidad__nombre", "requisito__nombre")
    ordering_fields = ("modalidad", "requisito", "orden", "created_at")
    ordering = ("modalidad", "orden")
