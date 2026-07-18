from rest_framework import serializers
from apps.notificaciones.models import Notificacion


class ActorResumenSerializer(serializers.Serializer):
    id=serializers.IntegerField(); nombre=serializers.CharField(source="nombre_completo"); username=serializers.CharField()
class NotificacionSerializer(serializers.ModelSerializer):
    actor=ActorResumenSerializer(read_only=True); postulacion_id=serializers.IntegerField(read_only=True)
    class Meta:
        model=Notificacion
        fields=("id","tipo","titulo","mensaje","nivel","leida","fecha_lectura","actor","postulacion_id","aggregate_type","aggregate_id","metadata","created_at")
        read_only_fields=fields

