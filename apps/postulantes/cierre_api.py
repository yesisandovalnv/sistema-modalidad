from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import NotFound,PermissionDenied,ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.postulantes.cierre import CierrePostulacionService
from apps.postulantes.models import Postulacion

class CierreEstadoSerializer(serializers.Serializer):
    postulacion_id=serializers.IntegerField(); modalidad=serializers.CharField(); estado_general=serializers.CharField(allow_null=True); etapa_actual=serializers.CharField(allow_null=True)
    defensa_publica_aprobada=serializers.BooleanField(); revision_final_aprobada=serializers.BooleanField(); cierre_documental_aprobado=serializers.BooleanField()
    condiciones_requeridas=serializers.ListField(); condiciones_cumplidas=serializers.ListField(); condiciones_faltantes=serializers.ListField()
    entregas_requeridas=serializers.ListField(); entregas_completas=serializers.ListField(); entregas_faltantes=serializers.ListField()
    documentos_requeridos=serializers.ListField(); documentos_aprobados=serializers.ListField(); documentos_faltantes=serializers.ListField(); advertencias_normativas=serializers.ListField()
    puede_aprobar_revision_final=serializers.BooleanField(); puede_aprobar_cierre=serializers.BooleanField(); puede_concluir=serializers.BooleanField(); concluida=serializers.BooleanField()
class CierreObservacionSerializer(serializers.Serializer): observaciones=serializers.CharField(required=False,allow_blank=True,default="")
class MotivoSerializer(serializers.Serializer): motivo=serializers.CharField(allow_blank=False)

class CierreAccessMixin:
    def _post(self,request,pk):
        qs=Postulacion.objects.select_related("modalidad","estado_actual").filter(pk=pk); u=request.user
        if not (u.is_staff or u.is_superuser): qs=qs.filter(estudiante=u) | qs.filter(asignaciones__usuario=u,asignaciones__activo=True)
        obj=qs.distinct().first()
        if not obj: raise NotFound("Postulación no accesible.")
        return obj
    def _admin(self,request):
        if not (request.user.is_staff or request.user.is_superuser): raise PermissionDenied("Se requiere permiso administrativo.")
    def _call(self,fn,*args):
        try:return fn(*args)
        except DjangoValidationError as exc: raise ValidationError(exc.message_dict if hasattr(exc,"message_dict") else exc.messages) from exc

class CierreEstadoView(CierreAccessMixin,APIView):
    permission_classes=[IsAuthenticated]; serializer_class=CierreEstadoSerializer
    def get(self,request,pk):
        post=self._post(request,pk); return Response(CierrePostulacionService.consultar_estado_cierre(post,request.user,auditar=False))

class CierreAccionView(CierreAccessMixin,APIView):
    permission_classes=[IsAuthenticated]; serializer_class=CierreObservacionSerializer
    def post(self,request,pk,action):
        self._admin(request); post=self._post(request,pk)
        if action=="reabrir": s=MotivoSerializer(data=request.data); s.is_valid(raise_exception=True); self._call(CierrePostulacionService.reabrir_cierre,post,request.user,s.validated_data["motivo"])
        else:
            s=CierreObservacionSerializer(data=request.data); s.is_valid(raise_exception=True)
            fn={"aprobar-revision-final":CierrePostulacionService.aprobar_revision_final,"aprobar-cierre-documental":CierrePostulacionService.aprobar_cierre_documental,"concluir":CierrePostulacionService.concluir_postulacion}[action]
            self._call(fn,post,request.user,s.validated_data["observaciones"])
        post.refresh_from_db(); return Response(CierrePostulacionService.consultar_estado_cierre(post))
