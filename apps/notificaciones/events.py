from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from types import MappingProxyType
from uuid import UUID, uuid4

from django.db import transaction
from django.utils import timezone


class EventTypes:
    POSTULACION_CREADA="POSTULACION_CREADA"; POSTULACION_ESTADO_CAMBIADO="POSTULACION_ESTADO_CAMBIADO"
    ETAPA_INICIADA="ETAPA_INICIADA"; ETAPA_APROBADA="ETAPA_APROBADA"; ETAPA_RECHAZADA="ETAPA_RECHAZADA"; ETAPA_REABIERTA="ETAPA_REABIERTA"
    ACTOR_ASIGNADO="ACTOR_ASIGNADO"; ACTOR_REEMPLAZADO="ACTOR_REEMPLAZADO"; ASIGNACION_FINALIZADA="ASIGNACION_FINALIZADA"
    DOCUMENTO_SUBIDO="DOCUMENTO_SUBIDO"; DOCUMENTO_NUEVA_VERSION="DOCUMENTO_NUEVA_VERSION"; DOCUMENTO_OBSERVADO="DOCUMENTO_OBSERVADO"; DOCUMENTO_APROBADO="DOCUMENTO_APROBADO"; DOCUMENTO_RECHAZADO="DOCUMENTO_RECHAZADO"
    DEFENSA_PROGRAMADA="DEFENSA_PROGRAMADA"; DEFENSA_REPROGRAMADA="DEFENSA_REPROGRAMADA"; DEFENSA_SUSPENDIDA="DEFENSA_SUSPENDIDA"; DEFENSA_CANCELADA="DEFENSA_CANCELADA"; DEFENSA_FINALIZADA="DEFENSA_FINALIZADA"
    EVALUACION_REGISTRADA="EVALUACION_REGISTRADA"; EVALUACION_CONSOLIDADA="EVALUACION_CONSOLIDADA"
    INFORME_REVISION_TRIBUNAL_REGISTRADO="INFORME_REVISION_TRIBUNAL_REGISTRADO"
    INFORME_REVISION_TRIBUNAL_ACTUALIZADO="INFORME_REVISION_TRIBUNAL_ACTUALIZADO"
    CONDICION_VERIFICADA="CONDICION_VERIFICADA"; CONDICION_RECHAZADA="CONDICION_RECHAZADA"; ENTREGA_REGISTRADA="ENTREGA_REGISTRADA"
    REVISION_FINAL_APROBADA="REVISION_FINAL_APROBADA"; CIERRE_DOCUMENTAL_APROBADO="CIERRE_DOCUMENTAL_APROBADO"; POSTULACION_CONCLUIDA="POSTULACION_CONCLUIDA"; CIERRE_REABIERTO="CIERRE_REABIERTO"


@dataclass(frozen=True)
class DomainEvent:
    event_type: str
    aggregate_type: str
    aggregate_id: str
    deduplication_key: str
    actor_id: int | None = None
    postulacion_id: int | None = None
    modalidad_codigo: str = ""
    payload: dict = field(default_factory=dict)
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=timezone.now)

    def __post_init__(self):
        object.__setattr__(self, "payload", MappingProxyType(dict(self.payload)))


class DomainEventPublisher:
    _handlers = []

    @classmethod
    def register(cls, handler):
        if handler not in cls._handlers: cls._handlers.append(handler)

    @classmethod
    def publish(cls, event):
        if not cls._handlers:
            from apps.notificaciones.services import NotificationService
            cls.register(NotificationService.procesar_evento)
        return [handler(event) for handler in cls._handlers]

    @classmethod
    def publish_after_commit(cls, event):
        transaction.on_commit(lambda: cls.publish(event), robust=True)


def build_event(event_type, aggregate, actor=None, postulacion=None, payload=None, deduplication_key=None):
    post = postulacion or getattr(aggregate, "postulacion", None)
    modalidad = getattr(post, "modalidad", None)
    aggregate_id = str(aggregate.pk)
    return DomainEvent(event_type=event_type, actor_id=getattr(actor,"pk",None), aggregate_type=aggregate.__class__.__name__,
        aggregate_id=aggregate_id, postulacion_id=getattr(post,"pk",None), modalidad_codigo=getattr(modalidad,"codigo","") or "",
        payload=payload or {}, deduplication_key=deduplication_key or f"{event_type}:{aggregate_id}")


def publish_domain_event(event_type, aggregate, actor=None, postulacion=None, payload=None, deduplication_key=None):
    event = build_event(event_type, aggregate, actor, postulacion, payload, deduplication_key)
    DomainEventPublisher.publish_after_commit(event)
    return event
