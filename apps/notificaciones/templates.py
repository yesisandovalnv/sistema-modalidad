from dataclasses import dataclass
from apps.notificaciones.events import EventTypes


@dataclass(frozen=True)
class NotificationTemplate:
    titulo: str; mensaje: str; nivel: str="INFO"
    def render(self,payload):
        safe={k:str(v) for k,v in payload.items() if k in {"etapa","documento","tipo_evento","fecha","actor_tipo","estado","resultado"}}
        try: message=self.mensaje.format_map(_Safe(safe))
        except (KeyError,ValueError): message=self.mensaje
        return self.titulo,message
class _Safe(dict):
    def __missing__(self,key): return ""


class NotificationTemplateRegistry:
    _templates={
      EventTypes.ETAPA_APROBADA:NotificationTemplate("Etapa aprobada","La etapa {etapa} fue aprobada.","SUCCESS"),
      EventTypes.ETAPA_RECHAZADA:NotificationTemplate("Etapa rechazada","La etapa {etapa} fue rechazada.","WARNING"),
      EventTypes.ETAPA_REABIERTA:NotificationTemplate("Etapa reabierta","La etapa {etapa} fue reabierta.","WARNING"),
      EventTypes.POSTULACION_ESTADO_CAMBIADO:NotificationTemplate("Estado actualizado","El estado de la postulación cambió a {estado}."),
      EventTypes.ACTOR_ASIGNADO:NotificationTemplate("Asignación académica","Fue asignado como {actor_tipo}."),
      EventTypes.ACTOR_REEMPLAZADO:NotificationTemplate("Asignación reemplazada","Se actualizó la asignación de {actor_tipo}."),
      EventTypes.ASIGNACION_FINALIZADA:NotificationTemplate("Asignación finalizada","Finalizó la asignación de {actor_tipo}."),
      EventTypes.DOCUMENTO_SUBIDO:NotificationTemplate("Documento recibido","Se recibió una versión de {documento}."),
      EventTypes.DOCUMENTO_NUEVA_VERSION:NotificationTemplate("Nueva versión documental","Se registró una nueva versión de {documento}."),
      EventTypes.DOCUMENTO_OBSERVADO:NotificationTemplate("Documento observado","El documento {documento} tiene observaciones pendientes.","WARNING"),
      EventTypes.DOCUMENTO_APROBADO:NotificationTemplate("Documento aprobado","El documento {documento} fue aprobado.","SUCCESS"),
      EventTypes.DOCUMENTO_RECHAZADO:NotificationTemplate("Documento rechazado","El documento {documento} fue rechazado.","ERROR"),
      EventTypes.DEFENSA_PROGRAMADA:NotificationTemplate("Defensa programada","Se programó {tipo_evento} para {fecha}."),
      EventTypes.DEFENSA_REPROGRAMADA:NotificationTemplate("Defensa reprogramada","Se reprogramó {tipo_evento} para {fecha}.","WARNING"),
      EventTypes.DEFENSA_SUSPENDIDA:NotificationTemplate("Defensa suspendida","La defensa fue suspendida.","WARNING"),
      EventTypes.DEFENSA_CANCELADA:NotificationTemplate("Defensa cancelada","La defensa fue cancelada.","ERROR"),
      EventTypes.DEFENSA_FINALIZADA:NotificationTemplate("Defensa finalizada","La defensa finalizó."),
      EventTypes.EVALUACION_CONSOLIDADA:NotificationTemplate("Evaluación consolidada","Se consolidó el resultado de la evaluación.","SUCCESS"),
      EventTypes.INFORME_REVISION_TRIBUNAL_REGISTRADO:NotificationTemplate("Informe del tribunal registrado","El informe de revisión previa declaró el trabajo {resultado}."),
    EventTypes.INFORME_REVISION_TRIBUNAL_ACTUALIZADO:NotificationTemplate("Informe del tribunal actualizado","Se actualizó la evidencia vigente del informe de revisión previa."),
      EventTypes.REVISION_FINAL_APROBADA:NotificationTemplate("Revisión final aprobada","La revisión final fue aprobada.","SUCCESS"),
      EventTypes.CIERRE_DOCUMENTAL_APROBADO:NotificationTemplate("Cierre documental aprobado","El cierre documental fue aprobado.","SUCCESS"),
      EventTypes.POSTULACION_CONCLUIDA:NotificationTemplate("Postulación concluida","La postulación fue concluida.","SUCCESS"),
      EventTypes.CIERRE_REABIERTO:NotificationTemplate("Cierre reabierto","El cierre documental fue reabierto.","WARNING"),
    }
    @classmethod
    def get(cls,event_type): return cls._templates.get(event_type,NotificationTemplate("Actualización académica","Se registró una actualización académica."))
