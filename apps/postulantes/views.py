from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, NotFound, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.academico.models import EtapaModalidad
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, HistorialEstado, Observacion, Postulacion
from apps.postulantes.permissions import (IsAssignmentAdminOrRelatedReadOnly,
    IsStaffOrReadOnly, IsWorkflowAdminOrReadOnlyOwner,
    postulaciones_in_scope)
from core.permissions import is_staff_user
from apps.postulantes.serializers import (
    AsignacionPostulacionSerializer,
    AsignarActorSerializer,
    AprobarSeguimientoEtapaSerializer,
    EstadoPostulacionSerializer,
    FinalizarAsignacionSerializer,
    FlujoPostulacionSerializer,
    HistorialEstadoSerializer,
    ObservaSeguimientoEtapaSerializer,
    ObservacionSerializer,
    OmitirSeguimientoEtapaSerializer,
    PostulacionSerializer,
    RechazarSeguimientoEtapaSerializer,
    ReemplazarActorSerializer,
    SeguimientoEtapaSerializer,
)
from apps.postulantes.services import PostulacionService
from apps.postulantes.workflow import WorkflowService
from apps.postulantes.models import SeguimientoEtapa


class EstadoPostulacionViewSet(viewsets.ModelViewSet):
    """ViewSet para administrar el catálogo de estados de postulación."""

    queryset = EstadoPostulacion.objects.all()
    serializer_class = EstadoPostulacionSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nombre"]
    ordering_fields = ["codigo", "nombre", "created_at"]

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Los estados técnicos deben desactivarse, no eliminarse.")


class PostulacionViewSet(viewsets.ModelViewSet):
    """ViewSet para administrar las postulaciones y su estado actual."""

    queryset = Postulacion.objects.all()
    serializer_class = PostulacionSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "estudiante__username"]
    ordering_fields = ["codigo", "fecha_postulacion", "created_at"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = Postulacion.objects.select_related(
            "estudiante",
            "modalidad",
            "periodo",
            "estado_actual",
        )
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return queryset.none()
        return postulaciones_in_scope(queryset, user)

    def _get_postulacion_for_assignment_access(self, pk=None) -> Postulacion:
        queryset = Postulacion.objects.select_related(
            "estudiante",
            "modalidad",
            "periodo",
            "estado_actual",
        )
        postulacion = queryset.filter(pk=pk).first()
        if not postulacion:
            raise NotFound("La postulación no existe.")

        user = self.request.user
        if is_staff_user(user):
            return postulacion
        if postulacion.estudiante_id == user.id:
            return postulacion
        participa = AsignacionPostulacion.objects.filter(
            postulacion=postulacion,
            usuario=user,
        ).exists()
        if participa:
            return postulacion
        raise NotFound("La postulación no existe.")

    def _filtrar_asignaciones(self, queryset):
        tipo_participacion = self.request.query_params.get("tipo_participacion")
        activo = self.request.query_params.get("activo")
        seguimiento_etapa = self.request.query_params.get("seguimiento_etapa")
        usuario = self.request.query_params.get("usuario")

        if tipo_participacion:
            queryset = queryset.filter(tipo_participacion=tipo_participacion.strip().upper())
        if activo is not None:
            activo_normalizado = activo.strip().lower()
            if activo_normalizado in {"true", "1", "si", "sí"}:
                queryset = queryset.filter(activo=True)
            elif activo_normalizado in {"false", "0", "no"}:
                queryset = queryset.filter(activo=False)
        if seguimiento_etapa:
            queryset = queryset.filter(seguimiento_etapa_id=seguimiento_etapa)
        if usuario:
            queryset = queryset.filter(usuario_id=usuario)
        return queryset

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

    @extend_schema(responses={200: FlujoPostulacionSerializer})
    @action(detail=True, methods=["get"], url_path="flujo")
    def flujo(self, request, pk=None):
        postulacion = self.get_object()
        postulacion._prefetched_flujo = list(
            WorkflowService.obtener_seguimientos_ordenados(postulacion)
        )
        serializer = FlujoPostulacionSerializer(postulacion, context=self.get_serializer_context())
        return Response(serializer.data)

    @extend_schema(request=None, responses={200: FlujoPostulacionSerializer})
    @action(detail=True, methods=["post"], url_path="flujo/inicializar")
    def inicializar_flujo(self, request, pk=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("No tiene permisos para inicializar el flujo.")

        postulacion = self.get_object()
        try:
            WorkflowService.inicializar_flujo(postulacion, request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        postulacion._prefetched_flujo = list(
            WorkflowService.obtener_seguimientos_ordenados(postulacion)
        )
        serializer = FlujoPostulacionSerializer(postulacion, context=self.get_serializer_context())
        return Response(serializer.data)

    @extend_schema(request=None, responses={201: SeguimientoEtapaSerializer})
    @action(
        detail=True,
        methods=["post"],
        url_path=r"etapas/(?P<etapa_id>[^/.]+)/nuevo-intento",
    )
    def nuevo_intento(self, request, pk=None, etapa_id=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("No tiene permisos para crear un nuevo intento.")

        postulacion = self.get_object()
        etapa = EtapaModalidad.objects.filter(pk=etapa_id, activo=True).first()
        if not etapa:
            raise DRFValidationError({"etapa_id": "La etapa no existe."})

        try:
            seguimiento = WorkflowService.crear_nuevo_intento(postulacion, etapa, request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        serializer = SeguimientoEtapaSerializer(seguimiento, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={200: AsignacionPostulacionSerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="asignaciones")
    def asignaciones(self, request, pk=None):
        postulacion = self._get_postulacion_for_assignment_access(pk=pk)
        queryset = AsignacionPostulacion.objects.filter(postulacion=postulacion).select_related(
            "usuario",
            "usuario__role",
            "designado_por",
            "seguimiento_etapa",
            "seguimiento_etapa__etapa",
        )
        queryset = self._filtrar_asignaciones(queryset.order_by("tipo_participacion", "orden_cargo", "-fecha_designacion"))
        serializer = AsignacionPostulacionSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @extend_schema(responses={200: AsignacionPostulacionSerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="asignaciones/activas")
    def asignaciones_activas(self, request, pk=None):
        postulacion = self._get_postulacion_for_assignment_access(pk=pk)
        queryset = AsignacionPostulacion.objects.filter(postulacion=postulacion, activo=True).select_related(
            "usuario",
            "usuario__role",
            "designado_por",
            "seguimiento_etapa",
            "seguimiento_etapa__etapa",
        )
        queryset = self._filtrar_asignaciones(queryset.order_by("tipo_participacion", "orden_cargo", "-fecha_designacion"))
        serializer = AsignacionPostulacionSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @extend_schema(request=AsignarActorSerializer, responses={201: AsignacionPostulacionSerializer})
    @action(detail=True, methods=["post"], url_path="asignaciones/asignar", serializer_class=AsignarActorSerializer)
    def asignar(self, request, pk=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("No tiene permisos para asignar actores.")

        postulacion = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            asignacion = AsignacionService.asignar_actor(
                postulacion=postulacion,
                usuario_asignado=serializer.validated_data["usuario"],
                tipo_participacion=serializer.validated_data["tipo_participacion"],
                designado_por=request.user,
                orden_cargo=serializer.validated_data.get("orden_cargo"),
                seguimiento_etapa=serializer.validated_data.get("seguimiento_etapa"),
                observaciones=serializer.validated_data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = AsignacionPostulacionSerializer(asignacion, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Mantiene el comportamiento estándar de actualización del modelo."""
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE",
            detail="La postulación no admite eliminación física; use una transición trazable.",
        )


class HistorialEstadoViewSet(viewsets.ReadOnlyModelViewSet):
    """Historial inmutable, generado exclusivamente por servicios de dominio."""

    serializer_class = HistorialEstadoSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["postulacion__codigo"]
    ordering_fields = ["fecha_cambio", "created_at"]
    filterset_fields = ["postulacion"]

    def get_queryset(self):
        queryset = HistorialEstado.objects.select_related(
            "postulacion",
            "estado_anterior",
            "estado_nuevo",
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
            Q(postulacion__estudiante=user) | Q(postulacion__asignaciones__usuario=user)
        ).distinct()


class ObservacionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar las observaciones registradas sobre postulaciones."""

    serializer_class = ObservacionSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["postulacion__codigo", "comentario"]
    ordering_fields = ["fecha_observacion", "created_at"]

    def get_queryset(self):
        queryset = Observacion.objects.select_related("postulacion", "usuario")
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


class SeguimientoEtapaViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar seguimientos y ejecutar acciones del flujo."""

    serializer_class = SeguimientoEtapaSerializer
    permission_classes = [IsAuthenticated, IsWorkflowAdminOrReadOnlyOwner]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "postulacion__codigo",
        "postulacion__estudiante__username",
        "etapa__codigo",
        "etapa__nombre",
    ]
    ordering_fields = ["created_at", "fecha_inicio", "fecha_fin", "numero_intento", "etapa__orden"]

    def get_queryset(self):
        queryset = SeguimientoEtapa.objects.select_related(
            "postulacion",
            "postulacion__estudiante",
            "postulacion__modalidad",
            "etapa",
            "abierta_por",
            "cerrada_por",
        )
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

    @extend_schema(request=None, responses={200: SeguimientoEtapaSerializer})
    @action(detail=True, methods=["post"], url_path="iniciar")
    def iniciar(self, request, pk=None):
        seguimiento = self.get_object()
        try:
            actualizado = WorkflowService.iniciar_etapa(seguimiento, request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        serializer = self.get_serializer(actualizado)
        return Response(serializer.data)

    @extend_schema(request=ObservaSeguimientoEtapaSerializer, responses={200: SeguimientoEtapaSerializer})
    @action(detail=True, methods=["post"], url_path="observar", serializer_class=ObservaSeguimientoEtapaSerializer)
    def observar(self, request, pk=None):
        seguimiento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            actualizado = WorkflowService.observar_etapa(
                seguimiento,
                request.user,
                serializer.validated_data["observaciones"],
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        response_serializer = SeguimientoEtapaSerializer(actualizado, context=self.get_serializer_context())
        return Response(response_serializer.data)


class AsignacionPostulacionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar asignaciones y ejecutar acciones explícitas de gestión."""

    serializer_class = AsignacionPostulacionSerializer
    permission_classes = [IsAuthenticated, IsAssignmentAdminOrRelatedReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["tipo_participacion", "activo", "seguimiento_etapa", "usuario"]
    search_fields = [
        "postulacion__codigo",
        "postulacion__estudiante__username",
        "postulacion__estudiante__ru",
        "usuario__username",
        "usuario__nombres",
        "usuario__apellido_paterno",
        "usuario__apellido_materno",
        "usuario__correo_institucional",
        "usuario__correo_personal",
        "tipo_participacion",
    ]
    ordering_fields = [
        "fecha_designacion",
        "fecha_finalizacion",
        "tipo_participacion",
        "orden_cargo",
        "created_at",
    ]

    def get_queryset(self):
        queryset = AsignacionPostulacion.objects.select_related(
            "postulacion",
            "postulacion__estudiante",
            "postulacion__modalidad",
            "usuario",
            "usuario__role",
            "designado_por",
            "seguimiento_etapa",
            "seguimiento_etapa__etapa",
        )
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return queryset.none()
        if is_staff_user(user):
            return queryset
        return queryset.filter(Q(postulacion__estudiante=user) | Q(usuario=user)).distinct()

    @extend_schema(request=FinalizarAsignacionSerializer, responses={200: AsignacionPostulacionSerializer})
    @action(detail=True, methods=["post"], url_path="finalizar", serializer_class=FinalizarAsignacionSerializer)
    def finalizar(self, request, pk=None):
        asignacion = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            actualizada = AsignacionService.finalizar_asignacion(
                asignacion=asignacion,
                usuario=request.user,
                observaciones=serializer.validated_data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        response_serializer = AsignacionPostulacionSerializer(actualizada, context=self.get_serializer_context())
        return Response(response_serializer.data)

    @extend_schema(request=ReemplazarActorSerializer, responses={200: AsignacionPostulacionSerializer})
    @action(detail=True, methods=["post"], url_path="reemplazar", serializer_class=ReemplazarActorSerializer)
    def reemplazar(self, request, pk=None):
        asignacion = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            nueva_asignacion = AsignacionService.reemplazar_actor(
                asignacion_actual=asignacion,
                nuevo_usuario=serializer.validated_data["nuevo_usuario"],
                usuario_responsable=request.user,
                observaciones=serializer.validated_data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        response_serializer = AsignacionPostulacionSerializer(
            nueva_asignacion,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data)

    @extend_schema(request=AprobarSeguimientoEtapaSerializer, responses={200: SeguimientoEtapaSerializer})
    @action(detail=True, methods=["post"], url_path="aprobar", serializer_class=AprobarSeguimientoEtapaSerializer)
    def aprobar(self, request, pk=None):
        seguimiento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            actualizado = WorkflowService.aprobar_etapa(
                seguimiento,
                request.user,
                serializer.validated_data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        response_serializer = SeguimientoEtapaSerializer(actualizado, context=self.get_serializer_context())
        return Response(response_serializer.data)

    @extend_schema(request=RechazarSeguimientoEtapaSerializer, responses={200: SeguimientoEtapaSerializer})
    @action(detail=True, methods=["post"], url_path="rechazar", serializer_class=RechazarSeguimientoEtapaSerializer)
    def rechazar(self, request, pk=None):
        seguimiento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            actualizado = WorkflowService.rechazar_etapa(
                seguimiento,
                request.user,
                serializer.validated_data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        response_serializer = SeguimientoEtapaSerializer(actualizado, context=self.get_serializer_context())
        return Response(response_serializer.data)

    @extend_schema(request=OmitirSeguimientoEtapaSerializer, responses={200: SeguimientoEtapaSerializer})
    @action(detail=True, methods=["post"], url_path="omitir", serializer_class=OmitirSeguimientoEtapaSerializer)
    def omitir(self, request, pk=None):
        seguimiento = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            actualizado = WorkflowService.omitir_etapa(
                seguimiento,
                request.user,
                serializer.validated_data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        response_serializer = SeguimientoEtapaSerializer(actualizado, context=self.get_serializer_context())
        return Response(response_serializer.data)
