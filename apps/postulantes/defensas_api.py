from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_field, extend_schema_view
from rest_framework import filters, serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from core.permissions import is_staff_user
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.models import AsignacionPostulacion, EventoDefensa, ParticipanteEvento, EvaluacionDefensa, SeguimientoEtapa
from apps.postulantes.models import Postulacion
from apps.postulantes.permissions import get_postulacion_in_scope


def _nombre_usuario(usuario):
    if not usuario:
        return None
    return usuario.nombre_completo or usuario.username or f"Usuario {usuario.pk}"


class ParticipanteEventoSerializer(serializers.ModelSerializer):
    """Participación técnica registrada para un evento; no acredita designación formal."""

    usuario_nombre = serializers.SerializerMethodField()
    rol_display = serializers.CharField(source="get_rol_evento_display", read_only=True)
    convocatoria = serializers.BooleanField(source="convocado", read_only=True)
    fecha_asistencia = serializers.DateTimeField(source="fecha_registro_asistencia", read_only=True)

    @extend_schema_field(OpenApiTypes.STR)
    def get_usuario_nombre(self, obj):
        return _nombre_usuario(obj.asignacion.usuario)

    class Meta:
        model = ParticipanteEvento
        fields = (
            "id", "evento", "asignacion", "usuario_nombre", "rol_evento", "rol_display",
            "convocado", "convocatoria", "presente", "fecha_registro_asistencia",
            "fecha_asistencia", "observaciones", "activo",
        )
        read_only_fields = fields


class EvaluacionDefensaSerializer(serializers.ModelSerializer):
    """Evaluación técnica registrada; no equivale por sí sola a un resultado académico oficial."""

    evaluador_nombre = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_evaluacion_display", read_only=True)
    modalidad_registro_display = serializers.CharField(source="get_modalidad_registro_display", read_only=True)
    resultado_consolidado = serializers.BooleanField(source="es_resultado_final_evento", read_only=True)

    @extend_schema_field(OpenApiTypes.STR)
    def get_evaluador_nombre(self, obj):
        participante = obj.evaluador
        return _nombre_usuario(participante.asignacion.usuario) if participante else None

    class Meta:
        model = EvaluacionDefensa
        fields = (
            "id", "evento", "evaluador", "evaluador_nombre", "tipo_evaluacion", "tipo_display",
            "modalidad_registro", "modalidad_registro_display", "resultado_cualitativo",
            "nota_numerica", "ponderacion", "aporte_ponderado", "es_resultado_final_evento",
            "resultado_consolidado", "observaciones", "activo",
        )
        read_only_fields = fields


class EventoDefensaSerializer(serializers.ModelSerializer):
    """Evento técnico de defensa; no acredita convocatoria, acta firmada ni legalización."""

    participantes=ParticipanteEventoSerializer(many=True,read_only=True)
    evaluaciones=EvaluacionDefensaSerializer(many=True,read_only=True)
    resultado_consolidado = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_evento_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    modalidad_display = serializers.CharField(source="get_modalidad_evento_display", read_only=True)
    postulacion_codigo = serializers.CharField(source="postulacion.codigo", read_only=True)
    postulacion_modalidad_codigo = serializers.CharField(source="postulacion.modalidad.codigo", read_only=True)
    etapa_codigo = serializers.CharField(source="seguimiento_etapa.etapa.codigo", read_only=True)
    etapa_nombre = serializers.CharField(source="seguimiento_etapa.etapa.nombre", read_only=True)

    @extend_schema_field(EvaluacionDefensaSerializer(allow_null=True))
    def get_resultado_consolidado(self, obj):
        resultado = next(
            (evaluacion for evaluacion in obj.evaluaciones.all() if evaluacion.es_resultado_final_evento),
            None,
        )
        return EvaluacionDefensaSerializer(resultado, context=self.context).data if resultado else None

    class Meta:
        model = EventoDefensa
        fields = (
            "id", "postulacion", "postulacion_codigo", "postulacion_modalidad_codigo", "seguimiento_etapa", "etapa_codigo",
            "etapa_nombre", "tipo_evento", "tipo_display", "numero_intento", "estado",
            "estado_display", "fecha_programada", "fecha_inicio_real", "fecha_fin_real", "lugar",
            "modalidad_evento", "modalidad_display", "enlace_virtual", "observaciones", "activo",
            "participantes", "evaluaciones", "resultado_consolidado",
        )
        read_only_fields = fields


class QuorumDefensaSerializer(serializers.Serializer):
    """Verificación técnica de presencia; no certifica composición o validez institucional."""

    valido = serializers.BooleanField()
    conteos = serializers.DictField(child=serializers.IntegerField())
    faltantes = serializers.DictField(child=serializers.IntegerField())
    detalle = serializers.DictField(child=serializers.IntegerField())

class ProgramarSerializer(serializers.Serializer):
    seguimiento_etapa=serializers.PrimaryKeyRelatedField(queryset=SeguimientoEtapa.objects.all())
    tipo_evento=serializers.ChoiceField(choices=EventoDefensa.Tipo.choices)
    fecha_programada=serializers.DateTimeField(); lugar=serializers.CharField(required=False,allow_blank=True,default="")
    modalidad_evento=serializers.ChoiceField(choices=EventoDefensa.ModalidadEvento.choices,default="PRESENCIAL")
    enlace_virtual=serializers.URLField(required=False,allow_blank=True,default=""); observaciones=serializers.CharField(required=False,allow_blank=True,default="")
class ParticipantePayload(serializers.Serializer):
    asignacion=serializers.PrimaryKeyRelatedField(queryset=AsignacionPostulacion.objects.all()); rol_evento=serializers.ChoiceField(choices=ParticipanteEvento.Rol.choices)
class AsistenciaPayload(serializers.Serializer):
    participante=serializers.PrimaryKeyRelatedField(queryset=ParticipanteEvento.objects.all()); presente=serializers.BooleanField(); observaciones=serializers.CharField(required=False,allow_blank=True,default="")
class MotivoPayload(serializers.Serializer): motivo=serializers.CharField()
class ReprogramarPayload(MotivoPayload): nueva_fecha=serializers.DateTimeField()
class EvaluarPayload(serializers.Serializer):
    resultado=serializers.ChoiceField(choices=("SUFICIENTE","INSUFICIENTE"),required=False)
    nota_privada=serializers.DecimalField(max_digits=5,decimal_places=2,min_value=0,max_value=30,required=False)
    nota=serializers.DecimalField(max_digits=5,decimal_places=2,required=False)
    # La policy de la modalidad determina el rango: Proyecto 0--70, Tesis 1--100.
    nota_publica=serializers.DecimalField(max_digits=5,decimal_places=2,required=False)
    evaluador=serializers.PrimaryKeyRelatedField(queryset=ParticipanteEvento.objects.all(), required=False, allow_null=True)
    modalidad_registro=serializers.ChoiceField(choices=EvaluacionDefensa.ModalidadRegistro.choices, required=False)
    observaciones=serializers.CharField(required=False,allow_blank=True,default="")
class ResultadoFinalSerializer(serializers.Serializer):
    nota_privada=serializers.DecimalField(max_digits=5,decimal_places=2,allow_null=True)
    nota_publica=serializers.DecimalField(max_digits=5,decimal_places=2,allow_null=True)
    aporte_privada=serializers.DecimalField(max_digits=6,decimal_places=2,allow_null=True)
    aporte_publica=serializers.DecimalField(max_digits=6,decimal_places=2,allow_null=True)
    clasificacion=serializers.CharField(allow_null=True)
    resultado=serializers.CharField(allow_null=True)
    nota_final=serializers.DecimalField(max_digits=6,decimal_places=2,allow_null=True)
    limitacion_normativa=serializers.CharField()

@extend_schema_view(
    list=extend_schema(
        description=(
            "Contrato canónico, paginado y de solo lectura para eventos técnicos de defensa. "
            "Use postulacion para filtrar exactamente un expediente. Una evaluación registrada no "
            "equivale por sí sola al resultado académico oficial y un acta documental vinculada no "
            "implica firma ni legalización."
        ),
        parameters=[
            OpenApiParameter("postulacion", OpenApiTypes.INT, OpenApiParameter.QUERY, description="ID exacto de la postulación."),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Orden seguro: fecha_programada, id, tipo_evento, estado o numero_intento; anteponga - para descendente."),
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Página del resultado paginado."),
        ],
    ),
    retrieve=extend_schema(
        description="Detalle visible de un evento técnico, con participantes, asistencia, evaluaciones y resultado consolidado existente."
    ),
)
class EventoDefensaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=EventoDefensaSerializer; permission_classes=[IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["postulacion", "tipo_evento", "estado"]
    ordering_fields = ["fecha_programada", "id", "tipo_evento", "estado", "numero_intento"]
    ordering = ["-fecha_programada", "-id"]

    def get_queryset(self):
        qs=EventoDefensa.objects.select_related(
            "postulacion__estudiante", "postulacion__modalidad", "seguimiento_etapa__etapa"
        ).prefetch_related(
            "participantes__asignacion__usuario",
            "evaluaciones__evaluador__asignacion__usuario",
        )
        if getattr(self, "swagger_fake_view", False):
            return qs.none()
        u=self.request.user
        if is_staff_user(u): return qs
        postulaciones_asignadas = AsignacionPostulacion.all_objects.filter(usuario=u).values("postulacion_id")
        return qs.filter(
            Q(postulacion__estudiante=u)
            | Q(postulacion_id__in=postulaciones_asignadas)
            | Q(participantes__asignacion__usuario=u)
        ).distinct()
    def _admin(self):
        if not is_staff_user(self.request.user): raise PermissionDenied("Se requiere permiso administrativo.")
    def _call(self,fn,*args,**kwargs):
        try: return fn(*args,**kwargs)
        except DjangoValidationError as e: raise ValidationError(e.message_dict if hasattr(e,"message_dict") else e.messages) from e
    @action(detail=True,methods=["post"])
    def iniciar(self,r,pk=None): self._admin(); return Response(self.get_serializer(self._call(EventoDefensaService.iniciar_evento,self.get_object(),r.user)).data)
    @action(detail=True,methods=["post"])
    def finalizar(self,r,pk=None): self._admin(); return Response(self.get_serializer(self._call(EventoDefensaService.finalizar_evento,self.get_object(),r.user)).data)
    @extend_schema(
        responses={200: QuorumDefensaSerializer},
        description="Verificación exclusivamente técnica de presencia y faltantes; no certifica validez institucional.",
    )
    @action(detail=True,methods=["get"])
    def quorum(self,r,pk=None):
        resultado = EventoDefensaService.validar_quorum(self.get_object(), r.user)
        conteos = resultado.get("conteos", resultado.get("detalle", {}))
        return Response({
            "valido": resultado["valido"],
            "conteos": conteos,
            "faltantes": resultado.get("faltantes", {}),
            "detalle": conteos,
        })
    @action(detail=True,methods=["post"],url_path="participantes/agregar")
    def agregar(self,r,pk=None):
        self._admin(); s=ParticipantePayload(data=r.data); s.is_valid(raise_exception=True); p=self._call(EventoDefensaService.agregar_participante,self.get_object(),s.validated_data["asignacion"],s.validated_data["rol_evento"],r.user); return Response(ParticipanteEventoSerializer(p).data,status=201)
    @extend_schema(
        parameters=[OpenApiParameter("participante_id", OpenApiTypes.INT, OpenApiParameter.PATH)],
    )
    @action(detail=True,methods=["post"],url_path=r"participantes/(?P<participante_id>[^/.]+)/remover")
    def remover(self,r,pk=None,participante_id=None):
        self._admin(); p=ParticipanteEvento._base_manager.filter(pk=participante_id).first()
        if not p: raise ValidationError("El participante no existe.")
        self._call(EventoDefensaService.remover_participante,self.get_object(),p,r.user); return Response(status=204)
    @action(detail=True,methods=["post"])
    def asistencia(self,r,pk=None):
        self._admin(); s=AsistenciaPayload(data=r.data); s.is_valid(raise_exception=True)
        if s.validated_data["participante"].evento_id != self.get_object().pk: raise ValidationError("Participante ajeno al evento.")
        p=self._call(EventoDefensaService.registrar_asistencia,s.validated_data["participante"],s.validated_data["presente"],r.user,s.validated_data["observaciones"]); return Response(ParticipanteEventoSerializer(p).data)
    def _motivo(self,r,fn):
        self._admin(); s=MotivoPayload(data=r.data); s.is_valid(raise_exception=True); return Response(self.get_serializer(self._call(fn,self.get_object(),r.user,s.validated_data["motivo"])).data)
    @action(detail=True,methods=["post"])
    def suspender(self,r,pk=None): return self._motivo(r,EventoDefensaService.suspender_evento)
    @action(detail=True,methods=["post"])
    def cancelar(self,r,pk=None): return self._motivo(r,EventoDefensaService.cancelar_evento)
    @action(detail=True,methods=["post"])
    def reprogramar(self,r,pk=None):
        self._admin(); s=ReprogramarPayload(data=r.data); s.is_valid(raise_exception=True); e=self._call(EventoDefensaService.reprogramar_evento,self.get_object(),s.validated_data["nueva_fecha"],r.user,s.validated_data["motivo"]); return Response(self.get_serializer(e).data)
    @action(detail=True,methods=["post"],url_path="evaluaciones/(?P<tipo>tematica|perfil|privada|publica)")
    def evaluar(self,r,pk=None,tipo=None):
        self._admin(); evento=self.get_object(); s=EvaluarPayload(data=r.data); s.is_valid(raise_exception=True)
        fn={"tematica":EvaluacionDefensaService.registrar_evaluacion_tematica,"perfil":EvaluacionDefensaService.registrar_evaluacion_perfil,"privada":EvaluacionDefensaService.registrar_evaluacion_privada,"publica":EvaluacionDefensaService.registrar_evaluacion_publica}[tipo]
        kwargs=dict(evento=evento,usuario=r.user,observaciones=s.validated_data["observaciones"], evaluador=s.validated_data.get("evaluador"), modalidad_registro=s.validated_data.get("modalidad_registro"))
        if tipo in ("tematica","perfil","privada"): kwargs["resultado"]=s.validated_data.get("resultado")
        if tipo=="privada": kwargs["nota"]=s.validated_data.get("nota", s.validated_data.get("nota_privada"))
        if tipo=="publica": kwargs["nota"]=s.validated_data.get("nota", s.validated_data.get("nota_publica"))
        return Response(EvaluacionDefensaSerializer(self._call(fn,**kwargs)).data,status=201)
    @action(detail=True,methods=["post"],url_path="evaluaciones/consolidar")
    def consolidar(self,r,pk=None): self._admin(); return Response(EvaluacionDefensaSerializer(self._call(EvaluacionDefensaService.consolidar_evaluacion_evento,self.get_object(),r.user)).data)

class PostulacionEventosView(APIView):
    permission_classes=[IsAuthenticated]
    serializer_class=EventoDefensaSerializer
    def _post(self,request,pk):
        return get_postulacion_in_scope(Postulacion.objects.all(), request.user, pk)

    @extend_schema(
        responses={200: EventoDefensaSerializer(many=True)},
        description=(
            "Consulta contextual no paginada conservada por compatibilidad. El contrato principal de HT-004 es "
            "GET /api/v1/eventos-defensa/?postulacion={id}."
        ),
    )
    def get(self,request,pk):
        post = self._post(request, pk)
        queryset = EventoDefensa.objects.filter(postulacion=post).select_related(
            "postulacion__estudiante", "seguimiento_etapa__etapa"
        ).prefetch_related(
            "participantes__asignacion__usuario",
            "evaluaciones__evaluador__asignacion__usuario",
        ).order_by("-fecha_programada", "-id")
        return Response(EventoDefensaSerializer(queryset,many=True,context={"request": request}).data)
    def post(self,request,pk):
        if not is_staff_user(request.user): raise PermissionDenied("Se requiere permiso administrativo.")
        post=self._post(request,pk); s=ProgramarSerializer(data=request.data); s.is_valid(raise_exception=True)
        try: evento=EventoDefensaService.programar_evento(postulacion=post,usuario=request.user,**s.validated_data)
        except DjangoValidationError as e: raise ValidationError(e.message_dict if hasattr(e,"message_dict") else e.messages) from e
        return Response(EventoDefensaSerializer(evento).data,status=201)

class ResultadoFinalView(APIView):
    permission_classes=[IsAuthenticated]
    serializer_class=ResultadoFinalSerializer
    def _resultado(self,request,pk,auditar):
        post=get_postulacion_in_scope(Postulacion.objects.all(),request.user,pk)
        try: data=EvaluacionDefensaService.calcular_resultado_final(post,request.user,auditar=auditar)
        except DjangoValidationError as e: raise ValidationError(e.messages) from e
        return Response(data)
    def get(self,request,pk):
        return self._resultado(request,pk,auditar=False)
    def post(self,request,pk):
        if not is_staff_user(request.user): raise PermissionDenied("Se requiere permiso administrativo.")
        return self._resultado(request,pk,auditar=True)
