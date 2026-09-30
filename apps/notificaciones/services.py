from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.notificaciones.events import EventTypes
from apps.notificaciones.models import Notificacion
from apps.notificaciones.templates import NotificationTemplateRegistry
from apps.usuarios.models import AuditLog, CustomUser


class NotificationRecipientResolver:
    DEFENSE_EVENTS={EventTypes.DEFENSA_PROGRAMADA,EventTypes.DEFENSA_REPROGRAMADA,EventTypes.DEFENSA_SUSPENDIDA,EventTypes.DEFENSA_CANCELADA,EventTypes.DEFENSA_FINALIZADA,EventTypes.EVALUACION_CONSOLIDADA}
    ASSIGNMENT_EVENTS={EventTypes.ACTOR_ASIGNADO,EventTypes.ACTOR_REEMPLAZADO,EventTypes.ASIGNACION_FINALIZADA}
    REVIEW_EVENTS={EventTypes.INFORME_REVISION_TRIBUNAL_REGISTRADO, EventTypes.INFORME_REVISION_TRIBUNAL_ACTUALIZADO}
    @classmethod
    def resolve(cls,event):
        ids=set(); post=None
        if event.postulacion_id:
            from apps.postulantes.models import Postulacion
            post=Postulacion.objects.select_related("estudiante").filter(pk=event.postulacion_id).first()
            if post and post.estudiante.is_active: ids.add(post.estudiante_id)
        if event.event_type in cls.ASSIGNMENT_EVENTS and event.payload.get("usuario_id"): ids.add(int(event.payload["usuario_id"]))
        if post:
            roles={"TUTOR"}
            if event.event_type in cls.DEFENSE_EVENTS: roles.update({"TRIBUNAL","DOCENTE_MODALIDAD","PRESIDENTE","SECRETARIO"})
            if event.event_type in cls.REVIEW_EVENTS: roles.add("TRIBUNAL")
            ids.update(post.asignaciones.filter(activo=True,usuario__is_active=True,tipo_participacion__in=roles).values_list("usuario_id",flat=True))
        if event.actor_id in ids and not post: ids.discard(event.actor_id)
        return list(CustomUser.objects.filter(pk__in=ids,is_active=True))


class NotificationService:
    @staticmethod
    @transaction.atomic
    def crear_notificacion(*,destinatario,tipo,titulo,mensaje,nivel,event_id,deduplication_key,actor=None,postulacion=None,aggregate_type="",aggregate_id="",metadata=None):
        if not destinatario or not destinatario.is_active: return None,False
        obj,created=Notificacion.objects.get_or_create(destinatario=destinatario,deduplication_key=deduplication_key,
          defaults=dict(tipo=tipo,titulo=titulo,mensaje=mensaje,nivel=nivel,event_id=event_id,actor=actor,postulacion=postulacion,
            aggregate_type=aggregate_type,aggregate_id=str(aggregate_id),metadata=metadata or {}))
        return obj,created

    @classmethod
    def crear_para_usuarios(cls,usuarios,**kwargs):
        result={"creadas":[],"existentes":[],"omitidos":[]}; seen=set()
        for user in usuarios:
            if not user or user.pk in seen: continue
            seen.add(user.pk)
            if not user.is_active: result["omitidos"].append(user.pk); continue
            obj,created=cls.crear_notificacion(destinatario=user,**kwargs)
            result["creadas" if created else "existentes"].append(obj)
        return result

    @staticmethod
    def _own(notificacion,usuario):
        if notificacion.destinatario_id != usuario.pk: raise PermissionDenied("La notificación no pertenece al usuario.")
    @classmethod
    @transaction.atomic
    def marcar_leida(cls,notificacion,usuario):
        obj=Notificacion.objects.select_for_update().get(pk=notificacion.pk); cls._own(obj,usuario)
        if not obj.leida:
            obj.leida=True; obj.fecha_lectura=timezone.now(); obj.save(update_fields=["leida","fecha_lectura","updated_at"])
            AuditLog.objects.create(usuario=usuario,accion="MARK_NOTIFICATION_READ",modulo="NOTIFICACIONES",descripcion=f"Notificación {obj.pk} marcada como leída.")
        return obj
    @classmethod
    @transaction.atomic
    def marcar_no_leida(cls,notificacion,usuario):
        obj=Notificacion.objects.select_for_update().get(pk=notificacion.pk); cls._own(obj,usuario)
        if obj.leida: obj.leida=False; obj.fecha_lectura=None; obj.save(update_fields=["leida","fecha_lectura","updated_at"])
        return obj
    @staticmethod
    @transaction.atomic
    def marcar_todas_leidas(usuario):
        now=timezone.now(); count=Notificacion.objects.filter(destinatario=usuario,leida=False).update(leida=True,fecha_lectura=now,updated_at=now)
        if count: AuditLog.objects.create(usuario=usuario,accion="MARK_ALL_NOTIFICATIONS_READ",modulo="NOTIFICACIONES",descripcion=f"{count} notificaciones marcadas como leídas.")
        return count
    @staticmethod
    def listar_usuario(usuario,filtros=None): return Notificacion.objects.filter(destinatario=usuario).select_related("actor","postulacion")
    @staticmethod
    def contar_no_leidas(usuario): return Notificacion.objects.filter(destinatario=usuario,leida=False).count()
    @staticmethod
    def eliminar_para_usuario(*args,**kwargs): raise PermissionDenied("La eliminación de notificaciones no está habilitada.")
    @classmethod
    def procesar_evento(cls,event):
        users=NotificationRecipientResolver.resolve(event); template=NotificationTemplateRegistry.get(event.event_type)
        title,message=template.render(event.payload)
        actor=CustomUser.objects.filter(pk=event.actor_id).first() if event.actor_id else None
        post=None
        if event.postulacion_id:
            from apps.postulantes.models import Postulacion
            post=Postulacion.objects.filter(pk=event.postulacion_id).first()
        return cls.crear_para_usuarios(users,tipo=event.event_type,titulo=title,mensaje=message,nivel=template.nivel,event_id=event.event_id,
          deduplication_key=event.deduplication_key,actor=actor,postulacion=post,aggregate_type=event.aggregate_type,aggregate_id=event.aggregate_id,
          metadata={k:v for k,v in event.payload.items() if k in {"etapa","documento","tipo_evento","fecha","actor_tipo","estado","resultado"}})
