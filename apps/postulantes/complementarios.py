from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.postulantes.models import CondicionPostulacion, EntregaFisica, Postulacion
from apps.usuarios.models import AuditLog


def _audit(usuario, accion, descripcion):
    AuditLog.objects.create(usuario=usuario, accion=accion, modulo="GESTION_COMPLEMENTARIA", descripcion=descripcion)


def _validar_postulacion_editable(postulacion):
    if not postulacion.activo or getattr(postulacion.estado_actual, "codigo", None) in {"CONCLUIDA", "RECHAZADA"}:
        raise ValidationError("La postulación no admite modificaciones de condiciones o entregas.")


class CondicionService:
    @staticmethod
    @transaction.atomic
    def crear(postulacion, codigo, nombre, usuario):
        postulacion=Postulacion.objects.select_for_update().get(pk=postulacion.pk); _validar_postulacion_editable(postulacion)
        obj=CondicionPostulacion(postulacion=postulacion,codigo=codigo,tipo=codigo,nombre=nombre)
        obj.save(); _audit(usuario,"CREATE_CONDITION",f"Condición {obj.codigo} creada para {postulacion.codigo}."); return obj

    @staticmethod
    @transaction.atomic
    def _resolver(condicion, estado, usuario, observaciones=""):
        obj=CondicionPostulacion.objects.select_for_update().get(pk=condicion.pk)
        _validar_postulacion_editable(obj.postulacion)
        if obj.estado != obj.Estado.PENDIENTE: raise ValidationError("La condición ya fue verificada.")
        obj.estado=estado; obj.fecha_verificacion=timezone.now(); obj.verificado_por=usuario; obj.observaciones=observaciones; obj.save()
        _audit(usuario,"VERIFY_CONDITION" if estado==obj.Estado.CUMPLE else "REJECT_CONDITION",f"Condición {obj.pk}: {estado}."); return obj

    @staticmethod
    @transaction.atomic
    def verificar_multiples(postulacion, condicion_ids, usuario, observaciones=""):
        ids = list(condicion_ids or ())
        if not ids:
            raise ValidationError("Selecciona al menos una condición para verificar.")
        if len(ids) != len(set(ids)):
            raise ValidationError("La selección contiene condiciones duplicadas.")

        postulacion = Postulacion.objects.select_for_update().get(pk=postulacion.pk)
        _validar_postulacion_editable(postulacion)
        conditions = list(
            CondicionPostulacion.objects.select_for_update()
            .filter(postulacion=postulacion, pk__in=ids, activo=True)
            .order_by("pk")
        )
        if len(conditions) != len(ids):
            raise ValidationError("Una o más condiciones no pertenecen a la postulación o ya no están disponibles.")
        if any(item.estado != CondicionPostulacion.Estado.PENDIENTE for item in conditions):
            raise ValidationError("Solo se pueden verificar condiciones pendientes.")

        by_id = {item.pk: item for item in conditions}
        return [
            CondicionService._resolver(
                by_id[condition_id],
                CondicionPostulacion.Estado.CUMPLE,
                usuario,
                observaciones,
            )
            for condition_id in ids
        ]

    verificar=staticmethod(lambda condicion,usuario,observaciones="": CondicionService._resolver(condicion,CondicionPostulacion.Estado.CUMPLE,usuario,observaciones))
    rechazar=staticmethod(lambda condicion,usuario,observaciones="": CondicionService._resolver(condicion,CondicionPostulacion.Estado.NO_CUMPLE,usuario,observaciones))
    listar_pendientes=staticmethod(lambda postulacion: postulacion.condiciones.filter(estado=CondicionPostulacion.Estado.PENDIENTE,activo=True))
    listar_completadas=staticmethod(lambda postulacion: postulacion.condiciones.filter(estado=CondicionPostulacion.Estado.CUMPLE,activo=True))


class EntregaFisicaService:
    @staticmethod
    @transaction.atomic
    def crear(postulacion, codigo, nombre, usuario, cantidad=None):
        postulacion=Postulacion.objects.select_for_update().get(pk=postulacion.pk); _validar_postulacion_editable(postulacion)
        obj=EntregaFisica(postulacion=postulacion,codigo=codigo,nombre=nombre,cantidad=cantidad)
        obj.save(); _audit(usuario,"CREATE_PHYSICAL_DELIVERY",f"Entrega {obj.codigo} creada para {postulacion.codigo}."); return obj

    @staticmethod
    @transaction.atomic
    def registrar_entrega(entrega, cantidad_recibida, usuario, observaciones=""):
        obj=EntregaFisica.objects.select_for_update().get(pk=entrega.pk)
        _validar_postulacion_editable(obj.postulacion)
        if cantidad_recibida <= 0: raise ValidationError("La cantidad recibida debe ser mayor que cero.")
        obj.cantidad_recibida=cantidad_recibida; obj.fecha_entrega=timezone.now(); obj.recibido_por=usuario; obj.observaciones=observaciones
        # Sin cantidad institucional definida, el registro administrativo explícito
        # completa la entrega; no infiere una cantidad normativa.
        obj.estado=obj.Estado.COMPLETA if obj.cantidad is None or cantidad_recibida>=obj.cantidad else obj.Estado.PARCIAL
        obj.save(); _audit(usuario,"REGISTER_PHYSICAL_DELIVERY",f"Entrega {obj.pk}: {cantidad_recibida} recibidos."); return obj

    @staticmethod
    @transaction.atomic
    def actualizar_cantidad(entrega, cantidad_recibida, usuario, observaciones=""):
        return EntregaFisicaService.registrar_entrega(entrega,cantidad_recibida,usuario,observaciones)

    @staticmethod
    @transaction.atomic
    def registrar_multiples(postulacion, entregas, usuario):
        payload = list(entregas or ())
        if not payload:
            raise ValidationError("Selecciona al menos una entrega para registrar.")

        ids = [entry["id"] for entry in payload]
        if len(ids) != len(set(ids)):
            raise ValidationError("La selección contiene entregas duplicadas.")

        postulacion = Postulacion.objects.select_for_update().get(pk=postulacion.pk)
        _validar_postulacion_editable(postulacion)

        items = list(
            EntregaFisica.objects.select_for_update()
            .filter(postulacion=postulacion, pk__in=ids, activo=True)
            .order_by("pk")
        )
        if len(items) != len(ids):
            raise ValidationError("Una o más entregas no pertenecen a la postulación o ya no están disponibles.")

        by_id = {item.pk: item for item in items}
        if any(item.estado != EntregaFisica.Estado.PENDIENTE for item in items):
            raise ValidationError("Solo se pueden registrar entregas pendientes.")

        by_entry = {entry["id"]: entry for entry in payload}
        return [
            EntregaFisicaService.registrar_entrega(
                by_id[entry_id],
                by_entry[entry_id]["cantidad_recibida"],
                usuario,
                by_entry[entry_id].get("observaciones", ""),
            )
            for entry_id in ids
        ]

    listar_pendientes=staticmethod(lambda postulacion: postulacion.entregas_fisicas.exclude(estado=EntregaFisica.Estado.COMPLETA).filter(activo=True))
    listar_completadas=staticmethod(lambda postulacion: postulacion.entregas_fisicas.filter(estado=EntregaFisica.Estado.COMPLETA,activo=True))
