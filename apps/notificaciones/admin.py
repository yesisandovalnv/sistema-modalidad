from django.contrib import admin
from apps.notificaciones.models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display=("destinatario","tipo","nivel","leida","postulacion","created_at")
    list_filter=("leida","nivel","tipo","created_at"); search_fields=("destinatario__username","titulo","tipo")
    readonly_fields=("destinatario","tipo","titulo","mensaje","nivel","leida","fecha_lectura","actor","postulacion","aggregate_type","aggregate_id","event_id","deduplication_key","metadata","created_at","updated_at")
    def has_add_permission(self,request): return False
    def has_delete_permission(self,request,obj=None): return False

