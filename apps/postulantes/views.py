from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, NotFound, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.academico.models import EtapaModalidad
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.modalidades.validators import ModalidadConfigurationValidator
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import (
    AsignacionPostulacion,
    DecisionAcademicaEtapa,
    EstadoPostulacion,
    DictamenRevisionDocumento,
    HistorialEstado,
    InformeRevisionTribunalPrevia,
    Observacion,
    Postulacion,
    PublicacionMemorandumDesignacion,
)
from apps.postulantes.permissions import (IsAssignmentAdminOrRelatedReadOnly,
    IsStaffOrReadOnly, IsWorkflowAdminOrReadOnlyOwner,
    postulaciones_in_scope)
from apps.postulantes.serializers import (
    AsignacionPostulacionSerializer,
    AsignarActorSerializer,
    DecisionAcademicaEtapaSerializer,
    RegistrarDecisionAcademicaSerializer,
    ActualizarEvidenciaInformeRevisionTribunalSerializer,
    AprobarSeguimientoEtapaSerializer,
    EstadoPostulacionSerializer,
    FinalizarAsignacionSerializer,
    FlujoPostulacionSerializer,
    HistorialEstadoSerializer,
    InformeRevisionTribunalSerializer,
    DictamenRevisionSerializer,
    RegistrarDictamenRevisionSerializer,
    ObservaSeguimientoEtapaSerializer,
    ObservacionSerializer,
    OmitirSeguimientoEtapaSerializer,
    PostulacionSerializer,
    PublicacionMemorandumDesignacionSerializer,
    PublicarMemorandumDesignacionSerializer,
    RegistrarInformeRevisionTribunalSerializer,
    RechazarSeguimientoEtapaSerializer,
    ReemplazarActorSerializer,
    SeguimientoEtapaSerializer,
)
from apps.postulantes.services import PostulacionService
from apps.postulantes.decisiones_academicas import DecisionAcademicaEtapaService
from apps.postulantes.revision_tribunal import RevisionTribunalPreviaService
from apps.postulantes.dictamenes_revision import DictamenRevisionDocumentoService
from apps.postulantes.workflow import WorkflowService
from apps.postulantes.memorandums import MemorandumDesignacionService
from apps.documentos.models import DocumentoPostulacion, TipoDocumento
from apps.documentos.serializers import TipoDocumentoHistoricoSerializer, SubirDocumentoHistoricoSerializer, VersionDocumentoSerializer
from apps.documentos.services import DocumentoService
from apps.postulantes.models import SeguimientoEtapa
from core.pagination import StandardResultsSetPagination
from core.permissions import IsStaff, is_staff_user
from core.responses import error_response


def _assignment_validation_error(exc):
    """Conserva claves Django y usa non_field_errors para reglas de dominio generales."""
    if hasattr(exc, "message_dict"):
        return DRFValidationError(exc.message_dict)
    return DRFValidationError({"non_field_errors": exc.messages})


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
    search_fields = [
        "codigo",
        "estudiante__username",
        "estudiante__ru",
        "estudiante__ci",
        "estudiante__nombres",
        "estudiante__apellido_paterno",
        "estudiante__apellido_materno",
    ]
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
        participa = AsignacionPostulacion.all_objects.filter(
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

        modalidad = serializer.validated_data["modalidad"]
        configuracion = ModalidadConfigurationValidator.validate_modalidad(modalidad)
        if not ModalidadPolicyRegistry.has_policy(modalidad) or not configuracion.valida:
            raise DRFValidationError({
                "modalidad": [
                    "La modalidad seleccionada todavía no tiene soporte académico completo configurado."
                ]
            })

        try:
            with transaction.atomic():
                postulacion = PostulacionService.crear_postulacion(
                    {
                        **serializer.validated_data,
                        "usuario": request.user,
                    }
                )
                if (
                    postulacion.modalidad.codigo == "PROYECTO_GRADO"
                    and postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO
                ):
                    from apps.postulantes.proyecto_grado_workflow import ProyectoGradoWorkflowOrchestrator

                    ProyectoGradoWorkflowOrchestrator.inicializar_proceso(postulacion, request.user)
                    postulacion.refresh_from_db()
                elif (
                    postulacion.modalidad.codigo == "TESIS_GRADO"
                    and postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO
                ):
                    from apps.postulantes.tesis_grado_workflow import TesisGradoWorkflowOrchestrator

                    TesisGradoWorkflowOrchestrator.inicializar_proceso(postulacion, request.user)
                    postulacion.refresh_from_db()
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        response_serializer = self.get_serializer(postulacion)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"], url_path="historicas", permission_classes=[IsAuthenticated, IsStaff])
    def historicas(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        modalidad = serializer.validated_data["modalidad"]
        configuracion = ModalidadConfigurationValidator.validate_modalidad(modalidad)
        if not ModalidadPolicyRegistry.has_policy(modalidad) or not configuracion.valida:
            raise DRFValidationError({
                "modalidad": [
                    "La modalidad seleccionada todavía no tiene soporte académico completo configurado."
                ]
            })

        try:
            historico = PostulacionService.crear_postulacion_historica({
                **serializer.validated_data,
                "usuario": request.user,
            })
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        return Response(self.get_serializer(historico).data, status=status.HTTP_201_CREATED)

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

    @extend_schema(
        request=PublicarMemorandumDesignacionSerializer,
        responses={200: PublicacionMemorandumDesignacionSerializer(many=True), 201: PublicacionMemorandumDesignacionSerializer},
    )
    @action(detail=True, methods=["get", "post"], url_path="memorandums-designacion")
    def memorandums_designacion(self, request, pk=None):
        postulacion = self.get_object()
        queryset = PublicacionMemorandumDesignacion.all_objects.filter(
            postulacion=postulacion,
        ).select_related(
            "seguimiento_etapa__etapa", "version_documento", "publicado_por",
        ).prefetch_related("asignaciones__usuario")
        if request.method == "GET":
            publicaciones = list(queryset)
            if not is_staff_user(request.user):
                publicaciones = [
                    item for item in publicaciones
                    if MemorandumDesignacionService.es_vigente(item)
                ]
            return Response(PublicacionMemorandumDesignacionSerializer(
                publicaciones, many=True, context=self.get_serializer_context(),
            ).data)
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede publicar memorándums.")
        serializer = PublicarMemorandumDesignacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            publicacion = MemorandumDesignacionService.publicar(
                postulacion=postulacion,
                seguimiento=serializer.validated_data["seguimiento_etapa"],
                archivo=serializer.validated_data["archivo"],
                usuario=request.user,
                request=request,
            )
        except DjangoValidationError as exc:
            raise _assignment_validation_error(exc) from exc
        publicacion = queryset.get(pk=publicacion.pk)
        return Response(PublicacionMemorandumDesignacionSerializer(
            publicacion, context=self.get_serializer_context(),
        ).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="documentos-aplicables")
    def documentos_aplicables(self, request, pk=None):
        """Retorna los tipos de documentos que pueden cargarse en la etapa actual de la postulación."""
        postulacion = self.get_object()
        
        etapa_codigo = None
        documentos_aplicables = []
        
        # Si hay policy, consultar documentos aplicables en etapa
        if ModalidadPolicyRegistry.has_policy(postulacion):
            policy = ModalidadPolicyRegistry.get(postulacion)
            etapa_codigo = policy.resolver_contexto_documental(postulacion)
            if etapa_codigo:
                codigos_permitidos = policy.get_documentos_aplicables_para_postulacion(
                    postulacion, etapa_codigo,
                )
                tipos_aplicables = list(
                    TipoDocumento.objects.filter(codigo__in=codigos_permitidos, activo=True)
                )
                codigos_recuperados = {tipo.codigo for tipo in tipos_aplicables}
                codigos_faltantes = list(dict.fromkeys(
                    codigo for codigo in codigos_permitidos if codigo not in codigos_recuperados
                ))
                if codigos_faltantes:
                    return error_response(
                        message=(
                            "Configuración documental incompleta para "
                            f"{postulacion.modalidad.codigo}/{etapa_codigo}; "
                            f"faltan tipos documentales activos: {', '.join(codigos_faltantes)}."
                        ),
                        data={
                            "postulacion_id": postulacion.pk,
                            "modalidad": postulacion.modalidad.codigo,
                            "etapa_actual": etapa_codigo,
                            "codigos_faltantes": codigos_faltantes,
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                documento_service = DocumentoService()
                documentos_existentes = list(
                    DocumentoPostulacion.all_objects.filter(postulacion=postulacion)
                    .select_related("estado", "tipo_documento")
                )
                tipos_aplicables_ids = {tipo.pk for tipo in tipos_aplicables}
                for documento in documentos_existentes:
                    if (
                        documento.activo
                        and documento.tipo_documento.activo
                        and documento.tipo_documento_id not in tipos_aplicables_ids
                    ):
                        capacidad = documento_service.obtener_capacidad_carga(
                            postulacion=postulacion,
                            tipo_documento=documento.tipo_documento,
                            usuario=request.user,
                            documento=documento,
                            policy=policy,
                        )
                        if capacidad.get("excepcion_aplicabilidad", False):
                            tipos_aplicables.append(documento.tipo_documento)
                            tipos_aplicables_ids.add(documento.tipo_documento_id)

                documentos_aplicables = [
                    {"id": tipo.pk, "codigo": tipo.codigo, "nombre": tipo.nombre}
                    for tipo in tipos_aplicables
                ]
                tipos_por_id = {tipo.pk: tipo for tipo in tipos_aplicables}
                documentos_por_tipo = {
                    documento.tipo_documento_id: documento
                    for documento in documentos_existentes
                    if documento.tipo_documento_id in tipos_por_id
                }
                for item in documentos_aplicables:
                    item["capacidad_carga"] = documento_service.obtener_capacidad_carga(
                        postulacion=postulacion,
                        tipo_documento=tipos_por_id[item["id"]],
                        usuario=request.user,
                        documento=documentos_por_tipo.get(item["id"]),
                        policy=policy,
                    )
        
        return Response({
            "postulacion_id": postulacion.pk,
            "modalidad": postulacion.modalidad.codigo,
            "etapa_actual": etapa_codigo,
            "documentos_aplicables": documentos_aplicables,
        })

    @extend_schema(responses=TipoDocumentoHistoricoSerializer(many=True))
    @action(
        detail=True,
        methods=["get"],
        url_path="documentos-historicos/tipos",
        serializer_class=TipoDocumentoHistoricoSerializer,
        permission_classes=[IsAuthenticated, IsStaff],
    )
    def tipos_documentos_historicos(self, request, pk=None):
        postulacion = self.get_object()
        if postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO:
            raise DRFValidationError("La consulta histórica solo admite postulaciones HISTORICO.")
        tipos = DocumentoService.obtener_tipos_documentales_historicos(postulacion.modalidad)
        return Response(TipoDocumentoHistoricoSerializer(tipos, many=True).data)

    @extend_schema(request=SubirDocumentoHistoricoSerializer, responses={201: VersionDocumentoSerializer})
    @action(
        detail=True,
        methods=["post"],
        url_path="documentos-historicos/subir",
        serializer_class=SubirDocumentoHistoricoSerializer,
        permission_classes=[IsAuthenticated, IsStaff],
    )
    def subir_documento_historico(self, request, pk=None):
        postulacion = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tipo_documento = TipoDocumento.objects.filter(
            pk=serializer.validated_data["tipo_documento_id"],
            activo=True,
        ).first()
        if not tipo_documento:
            raise DRFValidationError({"tipo_documento_id": "El tipo de documento no existe o no está activo."})

        try:
            version = DocumentoService().subir_documento_historico(
                postulacion=postulacion,
                tipo_documento=tipo_documento,
                archivo=serializer.validated_data["archivo"],
                usuario=request.user,
                request=request,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc

        return Response(VersionDocumentoSerializer(version, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses={200: PostulacionSerializer})
    @action(detail=True, methods=["post"], url_path="concluir-academicamente")
    def concluir_academicamente(self, request, pk=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede concluir acad\u00e9micamente una postulaci\u00f3n.")
        try:
            postulacion = WorkflowService.concluir_postulacion(
                self.get_object(), request.user, request.data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(str(exc)) from exc
        return Response(self.get_serializer(postulacion).data)

    @extend_schema(request=None, responses={200: FlujoPostulacionSerializer})
    @action(detail=True, methods=["post"], url_path="flujo/inicializar")
    def inicializar_flujo(self, request, pk=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("No tiene permisos para inicializar el flujo.")

        postulacion = self.get_object()
        try:
            if postulacion.modalidad.codigo == "PROYECTO_GRADO":
                from apps.postulantes.proyecto_grado_workflow import ProyectoGradoWorkflowOrchestrator

                ProyectoGradoWorkflowOrchestrator.inicializar_proceso(postulacion, request.user)
            else:
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
        queryset = AsignacionPostulacion.all_objects.filter(postulacion=postulacion).select_related(
            "usuario",
            "usuario__role",
            "designado_por",
            "seguimiento_etapa",
            "seguimiento_etapa__etapa",
        )
        queryset = self._filtrar_asignaciones(queryset.order_by(
            "-activo", "tipo_participacion", "orden_cargo", "fecha_designacion", "id",
        ))
        serializer = AsignacionPostulacionSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @extend_schema(responses={200: AsignacionPostulacionSerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="asignaciones/activas")
    def asignaciones_activas(self, request, pk=None):
        postulacion = self._get_postulacion_for_assignment_access(pk=pk)
        queryset = AsignacionPostulacion.all_objects.filter(postulacion=postulacion, activo=True).select_related(
            "usuario",
            "usuario__role",
            "designado_por",
            "seguimiento_etapa",
            "seguimiento_etapa__etapa",
        )
        queryset = self._filtrar_asignaciones(queryset.order_by(
            "-activo", "tipo_participacion", "orden_cargo", "fecha_designacion", "id",
        ))
        serializer = AsignacionPostulacionSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @extend_schema(
        parameters=[
            OpenApiParameter("posicion", OpenApiTypes.STR, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("accion", OpenApiTypes.STR, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("search", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY),
            OpenApiParameter("page_size", OpenApiTypes.INT, OpenApiParameter.QUERY),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["get"], url_path="candidatos-asignacion")
    def candidatos_asignacion(self, request, pk=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("No tiene permisos para consultar candidatos de asignación.")

        postulacion = self._get_postulacion_for_assignment_access(pk=pk)
        posicion_clave = (request.query_params.get("posicion") or "").strip()
        accion = (request.query_params.get("accion") or "").strip().upper()
        if not posicion_clave:
            raise DRFValidationError({"posicion": "La clave de posición es obligatoria."})
        if accion not in {"ASIGNAR", "REEMPLAZAR"}:
            raise DRFValidationError({"accion": "La acción debe ser ASIGNAR o REEMPLAZAR."})

        contract = FlujoPostulacionSerializer(
            postulacion,
            context=self.get_serializer_context(),
        ).get_gestion_actores(postulacion)
        position = next(
            (item for item in contract.get("posiciones", []) if item["clave"] == posicion_clave),
            None,
        )
        if position is None:
            raise DRFValidationError({"posicion": "La posición no existe en la configuración vigente de esta postulación."})
        if position.get("habilitada") is False or accion not in position.get("acciones_permitidas", []):
            raise DRFValidationError({"accion": "La acción no está permitida para esta posición en su contexto actual."})

        asignacion_actual = None
        if accion == "REEMPLAZAR":
            asignacion_actual = AsignacionPostulacion.objects.filter(
                pk=position.get("asignacion_actual"),
                postulacion=postulacion,
                activo=True,
            ).select_related("usuario").first()
            if asignacion_actual is None:
                raise DRFValidationError({"posicion": "La asignación actual ya no corresponde a esta posición."})

        try:
            queryset = AsignacionService.obtener_candidatos_elegibles(
                postulacion=postulacion,
                tipo_participacion=position["tipo_participacion"],
                orden_cargo=position.get("orden_cargo"),
                seguimiento_etapa=SeguimientoEtapa.objects.filter(
                    pk=position.get("seguimiento_etapa"),
                    postulacion=postulacion,
                ).first() if position.get("seguimiento_etapa") is not None else None,
                asignacion_actual=asignacion_actual,
                regla_ocupacion_actor=position.get("ocupacion_actor"),
            )
        except DjangoValidationError as exc:
            raise _assignment_validation_error(exc) from exc

        from apps.usuarios.serializers import AssignmentCandidateSerializer
        from apps.usuarios.views import AssignmentCandidateViewSet

        queryset = AssignmentCandidateViewSet.apply_catalog_filters(queryset, request)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        ocupaciones_vigentes = list(AsignacionPostulacion.objects.filter(
            postulacion=postulacion, activo=True,
        ).select_related("seguimiento_etapa__etapa").order_by("tipo_participacion", "orden_cargo", "pk"))
        detalles = AsignacionService._detallar_ocupaciones(postulacion, ocupaciones_vigentes)
        for usuario in page or []:
            usuario.asignaciones_vigentes_detalle = detalles.get(usuario.pk, [])
            if all(hasattr(usuario, field) for field in ("elegible", "motivo_bloqueo", "asignaciones_vigentes")):
                continue
            estado = AsignacionService._evaluar_ocupacion_vigente(
                postulacion=postulacion,
                usuario=usuario,
                asignacion_actual=asignacion_actual,
                queryset_activas=ocupaciones_vigentes,
                regla_ocupacion=position.get("ocupacion_actor"),
            )
            usuario.elegible = estado["elegible"]
            usuario.motivo_bloqueo = estado["motivo_bloqueo"]
            usuario.asignaciones_vigentes = estado["asignaciones_vigentes"]
        serializer = AssignmentCandidateSerializer(page, many=True, context=self.get_serializer_context())
        return paginator.get_paginated_response(serializer.data)

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
            raise _assignment_validation_error(exc) from exc

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


class SeguimientoEtapaFilter(django_filters.FilterSet):
    modalidad = django_filters.NumberFilter(field_name="postulacion__modalidad_id")
    estado = django_filters.CharFilter(field_name="estado")
    etapa = django_filters.NumberFilter(field_name="etapa_id")
    periodo = django_filters.NumberFilter(field_name="postulacion__periodo_id")
    gestion = django_filters.NumberFilter(field_name="postulacion__periodo__gestion")
    semestre = django_filters.CharFilter(field_name="postulacion__periodo__semestre")

    class Meta:
        model = SeguimientoEtapa
        fields = ("modalidad", "estado", "etapa", "periodo", "gestion", "semestre")


class SeguimientoEtapaViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar seguimientos y ejecutar acciones del flujo."""

    serializer_class = SeguimientoEtapaSerializer
    permission_classes = [IsAuthenticated, IsWorkflowAdminOrReadOnlyOwner]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SeguimientoEtapaFilter
    search_fields = [
        "postulacion__codigo",
        "postulacion__estudiante__username",
        "postulacion__estudiante__nombres",
        "postulacion__estudiante__apellido_paterno",
        "postulacion__estudiante__apellido_materno",
        "postulacion__estudiante__ru",
        "postulacion__estudiante__ci",
        "postulacion__modalidad__codigo",
        "postulacion__modalidad__nombre",
        "etapa__codigo",
        "etapa__nombre",
    ]
    ordering_fields = ["created_at", "updated_at", "id", "fecha_inicio", "fecha_fin", "numero_intento", "etapa__orden"]
    ordering = ["-updated_at", "-id"]

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

    @extend_schema(
        request=RegistrarDictamenRevisionSerializer,
        responses={200: DictamenRevisionSerializer(many=True), 201: DictamenRevisionSerializer},
    )
    @action(detail=True, methods=["get", "post"], url_path="dictamenes-revision", serializer_class=RegistrarDictamenRevisionSerializer)
    def dictamenes_revision(self, request, pk=None):
        seguimiento = self.get_object()
        if request.method == "GET":
            queryset = DictamenRevisionDocumento.all_objects.filter(seguimiento_etapa=seguimiento).select_related(
                "version_documento_revisada", "evidencia_version", "asignacion_emisora", "registrado_por",
            )
            return Response(DictamenRevisionSerializer(queryset, many=True, context=self.get_serializer_context()).data)
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede registrar el dictamen.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            dictamen = DictamenRevisionDocumentoService.registrar(
                seguimiento=seguimiento, usuario=request.user, **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise _assignment_validation_error(exc) from exc
        return Response(DictamenRevisionSerializer(dictamen, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=RegistrarInformeRevisionTribunalSerializer,
        responses={200: InformeRevisionTribunalSerializer(many=True), 201: InformeRevisionTribunalSerializer},
    )
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="informes-revision-tribunal",
        serializer_class=RegistrarInformeRevisionTribunalSerializer,
    )
    def informes_revision_tribunal(self, request, pk=None):
        seguimiento = self.get_object()
        if request.method == "GET":
            informes = InformeRevisionTribunalPrevia.objects.filter(
                seguimiento_etapa=seguimiento,
            ).select_related(
                "version_documento_revisada",
                "evidencia_version",
                "registrado_por",
            )
            serializer = InformeRevisionTribunalSerializer(
                informes,
                many=True,
                context=self.get_serializer_context(),
            )
            return Response(serializer.data)

        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede registrar el informe.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            informe = RevisionTribunalPreviaService.registrar_informe(
                seguimiento=seguimiento,
                usuario=request.user,
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise _assignment_validation_error(exc) from exc
        response_serializer = InformeRevisionTribunalSerializer(
            informe,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=ActualizarEvidenciaInformeRevisionTribunalSerializer,
        responses={200: InformeRevisionTribunalSerializer},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"informes-revision-tribunal/(?P<informe_id>[^/.]+)/actualizar-evidencia",
        serializer_class=ActualizarEvidenciaInformeRevisionTribunalSerializer,
    )
    def actualizar_evidencia_informe_revision_tribunal(self, request, pk=None, informe_id=None):
        seguimiento = self.get_object()
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede actualizar el informe.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            informe = RevisionTribunalPreviaService.actualizar_evidencia(
                seguimiento=seguimiento,
                informe_id=informe_id,
                evidencia_version=serializer.validated_data["evidencia_version"],
                usuario=request.user,
            )
        except DjangoValidationError as exc:
            raise _assignment_validation_error(exc) from exc
        response_serializer = InformeRevisionTribunalSerializer(
            informe,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(responses={200: DecisionAcademicaEtapaSerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="decisiones-academicas")
    def decisiones_academicas(self, request, pk=None):
        seguimiento = self.get_object()
        decisions = DecisionAcademicaEtapa.all_objects.filter(
            seguimiento_etapa=seguimiento,
        ).select_related("registrado_por").prefetch_related(
            "participaciones__asignacion__usuario",
        ).order_by("fecha_decision", "pk")
        serializer = DecisionAcademicaEtapaSerializer(
            decisions,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @extend_schema(
        request=RegistrarDecisionAcademicaSerializer,
        responses={200: DecisionAcademicaEtapaSerializer, 201: DecisionAcademicaEtapaSerializer},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="registrar-decision",
        serializer_class=RegistrarDecisionAcademicaSerializer,
    )
    def registrar_decision(self, request, pk=None):
        seguimiento = self.get_object()
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede registrar decisiones académicas.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        replacing = bool(validated_data.get("reemplaza_decision"))
        try:
            decision = DecisionAcademicaEtapaService.registrar(
                seguimiento=seguimiento,
                registrado_por=request.user,
                **validated_data,
            )
        except DjangoValidationError as exc:
            raise _assignment_validation_error(exc) from exc
        response_serializer = DecisionAcademicaEtapaSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK if replacing else status.HTTP_201_CREATED,
        )

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


@extend_schema_view(
    list=extend_schema(
        description=(
            "Contrato canónico paginado para consultar asignaciones activas e históricas. "
            "Use postulacion para filtrar exactamente el expediente; si activo se omite, "
            "se incluyen ambos estados."
        ),
        parameters=[
            OpenApiParameter("postulacion", OpenApiTypes.INT, OpenApiParameter.QUERY, description="ID exacto de la postulación."),
            OpenApiParameter("activo", OpenApiTypes.BOOL, OpenApiParameter.QUERY, description="true para vigentes, false para históricas; omitir para todas."),
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Página del resultado paginado."),
        ],
    ),
)
class AsignacionPostulacionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar asignaciones y ejecutar acciones explícitas de gestión."""

    serializer_class = AsignacionPostulacionSerializer
    permission_classes = [IsAuthenticated, IsAssignmentAdminOrRelatedReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["postulacion", "tipo_participacion", "activo", "seguimiento_etapa", "usuario"]
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
        "activo",
        "fecha_designacion",
        "fecha_finalizacion",
        "tipo_participacion",
        "orden_cargo",
        "created_at",
    ]
    ordering = ["-activo", "tipo_participacion", "orden_cargo", "fecha_designacion", "id"]

    def get_queryset(self):
        queryset = AsignacionPostulacion.all_objects.select_related(
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
        postulaciones_relacionadas = AsignacionPostulacion.all_objects.filter(
            usuario=user,
        ).values("postulacion_id")
        return queryset.filter(
            Q(postulacion__estudiante=user) | Q(postulacion_id__in=postulaciones_relacionadas)
        ).distinct()

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
            raise _assignment_validation_error(exc) from exc
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
            raise _assignment_validation_error(exc) from exc
        response_serializer = AsignacionPostulacionSerializer(
            nueva_asignacion,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data)
