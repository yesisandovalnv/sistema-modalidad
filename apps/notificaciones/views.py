from django.utils.dateparse import parse_datetime
from rest_framework import mixins,permissions,status,viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema,extend_schema_view
from apps.notificaciones.models import Notificacion
from apps.notificaciones.serializers import NotificacionSerializer
from apps.notificaciones.services import NotificationService
from core.pagination import StandardResultsSetPagination


@extend_schema_view(list=extend_schema(description="Lista exclusivamente las notificaciones del usuario autenticado. No envía correo ni push."),retrieve=extend_schema(description="Obtiene una notificación propia."))
class NotificacionViewSet(mixins.ListModelMixin,mixins.RetrieveModelMixin,viewsets.GenericViewSet):
    serializer_class=NotificacionSerializer; permission_classes=(permissions.IsAuthenticated,); pagination_class=StandardResultsSetPagination
    def get_queryset(self):
        qs=NotificationService.listar_usuario(self.request.user); p=self.request.query_params
        for field in ("tipo","nivel","postulacion"):
            if p.get(field): qs=qs.filter(**{field:p[field]})
        if p.get("leida") is not None: qs=qs.filter(leida=p["leida"].lower() in ("true","1"))
        if p.get("fecha_desde"): qs=qs.filter(created_at__gte=p["fecha_desde"])
        if p.get("fecha_hasta"): qs=qs.filter(created_at__lte=p["fecha_hasta"])
        return qs.order_by("-created_at")
    @action(detail=True,methods=("post",),url_path="marcar-leida")
    def marcar_leida(self,request,pk=None): return Response(self.get_serializer(NotificationService.marcar_leida(self.get_object(),request.user)).data)
    @action(detail=True,methods=("post",),url_path="marcar-no-leida")
    def marcar_no_leida(self,request,pk=None): return Response(self.get_serializer(NotificationService.marcar_no_leida(self.get_object(),request.user)).data)
    @action(detail=False,methods=("post",),url_path="marcar-todas-leidas")
    def marcar_todas_leidas(self,request): return Response({"actualizadas":NotificationService.marcar_todas_leidas(request.user)})
    @action(detail=False,methods=("get",),url_path="no-leidas/count")
    def no_leidas(self,request): return Response({"count":NotificationService.contar_no_leidas(request.user)})

