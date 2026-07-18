from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.models import AsignacionPostulacion, EventoDefensa, ParticipanteEvento, EvaluacionDefensa, SeguimientoEtapa
from apps.postulantes.models import Postulacion


class ParticipanteEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model=ParticipanteEvento; fields="__all__"
class EvaluacionDefensaSerializer(serializers.ModelSerializer):
    class Meta:
        model=EvaluacionDefensa; fields="__all__"
class EventoDefensaSerializer(serializers.ModelSerializer):
    participantes=ParticipanteEventoSerializer(many=True,read_only=True)
    evaluaciones=EvaluacionDefensaSerializer(many=True,read_only=True)
    class Meta:
        model=EventoDefensa; fields="__all__"

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
    resultado=serializers.CharField(required=False,allow_blank=True); nota=serializers.DecimalField(max_digits=5,decimal_places=2,required=False); evaluador=serializers.PrimaryKeyRelatedField(queryset=ParticipanteEvento.objects.all(),required=False,allow_null=True); modalidad_registro=serializers.ChoiceField(choices=EvaluacionDefensa.ModalidadRegistro.choices,default="CONSENSO"); observaciones=serializers.CharField(required=False,allow_blank=True,default="")
class ResultadoFinalSerializer(serializers.Serializer):
    nota_publica=serializers.DecimalField(max_digits=5,decimal_places=2,allow_null=True)
    aporte_publica=serializers.DecimalField(max_digits=6,decimal_places=2,allow_null=True)
    resultado=serializers.CharField()
    nota_final=serializers.DecimalField(max_digits=6,decimal_places=2,allow_null=True)
    limitacion_normativa=serializers.CharField()

class EventoDefensaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=EventoDefensaSerializer; permission_classes=[IsAuthenticated]
    def get_queryset(self):
        qs=EventoDefensa.objects.select_related("postulacion__estudiante","seguimiento_etapa__etapa").prefetch_related("participantes__asignacion__usuario","evaluaciones")
        u=self.request.user
        if u.is_staff or u.is_superuser: return qs
        return qs.filter(Q(postulacion__estudiante=u)|Q(participantes__asignacion__usuario=u)).distinct()
    def _admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser): raise PermissionDenied("Se requiere permiso administrativo.")
    def _call(self,fn,*args,**kwargs):
        try: return fn(*args,**kwargs)
        except DjangoValidationError as e: raise ValidationError(e.message_dict if hasattr(e,"message_dict") else e.messages) from e
    @action(detail=True,methods=["post"])
    def iniciar(self,r,pk=None): self._admin(); return Response(self.get_serializer(self._call(EventoDefensaService.iniciar_evento,self.get_object(),r.user)).data)
    @action(detail=True,methods=["post"])
    def finalizar(self,r,pk=None): self._admin(); return Response(self.get_serializer(self._call(EventoDefensaService.finalizar_evento,self.get_object(),r.user)).data)
    @action(detail=True,methods=["get"])
    def quorum(self,r,pk=None): return Response(EventoDefensaService.validar_quorum(self.get_object(),r.user))
    @action(detail=True,methods=["post"],url_path="participantes/agregar")
    def agregar(self,r,pk=None):
        self._admin(); s=ParticipantePayload(data=r.data); s.is_valid(raise_exception=True); p=self._call(EventoDefensaService.agregar_participante,self.get_object(),s.validated_data["asignacion"],s.validated_data["rol_evento"],r.user); return Response(ParticipanteEventoSerializer(p).data,status=201)
    @action(detail=True,methods=["post"],url_path=r"participantes/(?P<participante_id>[^/.]+)/remover")
    def remover(self,r,pk=None,participante_id=None):
        self._admin(); p=ParticipanteEvento.objects.filter(pk=participante_id).first()
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
    @action(detail=True,methods=["post"],url_path="evaluaciones/(?P<tipo>perfil|privada|publica)")
    def evaluar(self,r,pk=None,tipo=None):
        evento=self.get_object(); s=EvaluarPayload(data=r.data); s.is_valid(raise_exception=True); ev=s.validated_data.get("evaluador")
        if not (r.user.is_staff or r.user.is_superuser):
            if not ev or ev.asignacion.usuario_id != r.user.id: raise PermissionDenied("Solo puede registrar su evaluación individual.")
            s.validated_data["modalidad_registro"]="INDIVIDUAL"
        fn={"perfil":EvaluacionDefensaService.registrar_evaluacion_perfil,"privada":EvaluacionDefensaService.registrar_evaluacion_privada,"publica":EvaluacionDefensaService.registrar_evaluacion_publica}[tipo]
        kwargs=dict(evento=evento,usuario=r.user,evaluador=ev,modalidad_registro=s.validated_data["modalidad_registro"],observaciones=s.validated_data["observaciones"])
        kwargs["nota" if tipo=="publica" else "resultado"]=s.validated_data.get("nota" if tipo=="publica" else "resultado")
        return Response(EvaluacionDefensaSerializer(self._call(fn,**kwargs)).data,status=201)
    @action(detail=True,methods=["post"],url_path="evaluaciones/consolidar")
    def consolidar(self,r,pk=None): self._admin(); return Response(EvaluacionDefensaSerializer(self._call(EvaluacionDefensaService.consolidar_evaluacion_evento,self.get_object(),r.user)).data)

class PostulacionEventosView(APIView):
    permission_classes=[IsAuthenticated]
    serializer_class=EventoDefensaSerializer
    def _post(self,request,pk):
        qs=Postulacion.objects.filter(pk=pk); u=request.user
        if not (u.is_staff or u.is_superuser): qs=qs.filter(estudiante=u)
        obj=qs.first()
        if not obj: raise PermissionDenied("No tiene acceso a la postulación.")
        return obj
    def get(self,request,pk): return Response(EventoDefensaSerializer(self._post(request,pk).eventos_defensa.all(),many=True).data)
    def post(self,request,pk):
        if not (request.user.is_staff or request.user.is_superuser): raise PermissionDenied("Se requiere permiso administrativo.")
        post=self._post(request,pk); s=ProgramarSerializer(data=request.data); s.is_valid(raise_exception=True)
        try: evento=EventoDefensaService.programar_evento(postulacion=post,usuario=request.user,**s.validated_data)
        except DjangoValidationError as e: raise ValidationError(e.message_dict if hasattr(e,"message_dict") else e.messages) from e
        return Response(EventoDefensaSerializer(evento).data,status=201)

class ResultadoFinalView(APIView):
    permission_classes=[IsAuthenticated]
    serializer_class=ResultadoFinalSerializer
    def get(self,request,pk):
        post=Postulacion.objects.filter(pk=pk).first()
        if not post or not (request.user.is_staff or request.user.is_superuser or post.estudiante_id==request.user.id): raise PermissionDenied("No tiene acceso.")
        try: data=EvaluacionDefensaService.calcular_resultado_final(post,request.user)
        except DjangoValidationError as e: raise ValidationError(e.messages) from e
        return Response(data)
    def post(self,request,pk):
        if not (request.user.is_staff or request.user.is_superuser): raise PermissionDenied("Se requiere permiso administrativo.")
        return self.get(request,pk)
