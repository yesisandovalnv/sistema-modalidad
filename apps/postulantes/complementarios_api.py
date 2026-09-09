from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from core.permissions import is_staff_user
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.postulantes.complementarios import CondicionService, EntregaFisicaService
from apps.postulantes.models import CondicionPostulacion, EntregaFisica


class CondicionSerializer(serializers.ModelSerializer):
    estado_display=serializers.CharField(source="get_estado_display",read_only=True)
    verificado_por_nombre=serializers.SerializerMethodField()
    def get_verificado_por_nombre(self,obj) -> str | None: return obj.verificado_por.nombre_completo or obj.verificado_por.username if obj.verificado_por else None
    class Meta:
        model=CondicionPostulacion; fields="__all__"; read_only_fields=("estado","fecha_verificacion","verificado_por","activo","created_at","updated_at")

class EntregaSerializer(serializers.ModelSerializer):
    estado_display=serializers.CharField(source="get_estado_display",read_only=True)
    recibido_por_nombre=serializers.SerializerMethodField()
    def get_recibido_por_nombre(self,obj) -> str | None: return obj.recibido_por.nombre_completo or obj.recibido_por.username if obj.recibido_por else None
    class Meta:
        model=EntregaFisica; fields="__all__"; read_only_fields=("cantidad_recibida","estado","fecha_entrega","recibido_por","activo","created_at","updated_at")

class ObservacionPayload(serializers.Serializer): observaciones=serializers.CharField(required=False,allow_blank=True,default="")
class EntregaPayload(ObservacionPayload): cantidad_recibida=serializers.IntegerField(min_value=1)

class RelatedViewSet(viewsets.ModelViewSet):
    permission_classes=[IsAuthenticated]; http_method_names=["get","post","head","options"]
    filter_backends=[DjangoFilterBackend]; filterset_fields=["postulacion","estado"]
    def _admin(self):
        if not is_staff_user(self.request.user): raise PermissionDenied("Se requiere permiso administrativo.")
    def perform_create(self,serializer): self._admin(); serializer.save()
    def create(self,request,*args,**kwargs): self._admin(); return super().create(request,*args,**kwargs)
    def get_queryset(self):
        qs=super().get_queryset(); u=self.request.user
        if is_staff_user(u): return qs
        return qs.filter(Q(postulacion__estudiante=u)|Q(postulacion__asignaciones__usuario=u)).distinct()
    def _call(self,fn,*args):
        try: return fn(*args)
        except DjangoValidationError as exc: raise ValidationError(exc.messages) from exc

class CondicionViewSet(RelatedViewSet):
    queryset=CondicionPostulacion.objects.select_related("postulacion","verificado_por"); serializer_class=CondicionSerializer
    def create(self,r,*args,**kwargs):
        self._admin(); s=self.get_serializer(data=r.data); s.is_valid(raise_exception=True); d=s.validated_data
        obj=self._call(CondicionService.crear,d["postulacion"],d["codigo"],d["nombre"],r.user)
        return Response(self.get_serializer(obj).data,status=status.HTTP_201_CREATED)
    @action(detail=True,methods=["post"])
    def verificar(self,r,pk=None): self._admin(); s=ObservacionPayload(data=r.data); s.is_valid(raise_exception=True); return Response(self.get_serializer(self._call(CondicionService.verificar,self.get_object(),r.user,s.validated_data["observaciones"])).data)
    @action(detail=True,methods=["post"])
    def rechazar(self,r,pk=None): self._admin(); s=ObservacionPayload(data=r.data); s.is_valid(raise_exception=True); return Response(self.get_serializer(self._call(CondicionService.rechazar,self.get_object(),r.user,s.validated_data["observaciones"])).data)
    @action(detail=False,methods=["get"])
    def pendientes(self,r): return Response(self.get_serializer(self.get_queryset().filter(estado="PENDIENTE"),many=True).data)
    @action(detail=False,methods=["get"])
    def completadas(self,r): return Response(self.get_serializer(self.get_queryset().filter(estado="CUMPLE"),many=True).data)

class EntregaFisicaViewSet(RelatedViewSet):
    queryset=EntregaFisica.objects.select_related("postulacion","recibido_por"); serializer_class=EntregaSerializer
    def create(self,r,*args,**kwargs):
        self._admin(); s=self.get_serializer(data=r.data); s.is_valid(raise_exception=True); d=s.validated_data
        obj=self._call(EntregaFisicaService.crear,d["postulacion"],d["codigo"],d["nombre"],r.user,d.get("cantidad"))
        return Response(self.get_serializer(obj).data,status=status.HTTP_201_CREATED)
    @action(detail=True,methods=["post"])
    def registrar(self,r,pk=None): self._admin(); s=EntregaPayload(data=r.data); s.is_valid(raise_exception=True); return Response(self.get_serializer(self._call(EntregaFisicaService.registrar_entrega,self.get_object(),s.validated_data["cantidad_recibida"],r.user,s.validated_data["observaciones"])).data)
    @action(detail=True,methods=["post"],url_path="actualizar-cantidad")
    def actualizar_cantidad(self,r,pk=None): return self.registrar(r,pk)
    @action(detail=False,methods=["get"])
    def pendientes(self,r): return Response(self.get_serializer(self.get_queryset().exclude(estado="COMPLETA"),many=True).data)
    @action(detail=False,methods=["get"])
    def completadas(self,r): return Response(self.get_serializer(self.get_queryset().filter(estado="COMPLETA"),many=True).data)
