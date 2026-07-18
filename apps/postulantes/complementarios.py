from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.postulantes.models import CondicionPostulacion, EntregaFisica, Postulacion
from apps.usuarios.models import AuditLog


def _audit(usuario, accion, descripcion):
    AuditLog.objects.create(usuario=usuario, accion=accion, modulo="GESTION_COMPLEMENTARIA", descripcion=descripcion)


class CondicionService:
    @staticmethod
    @transaction.atomic
    def crear(postulacion, codigo, nombre, usuario):
        Postulacion.objects.select_for_update().get(pk=postulacion.pk)
        obj=CondicionPostulacion(postulacion=postulacion,codigo=codigo,tipo=codigo,nombre=nombre)
        obj.save(); _audit(usuario,"CREATE_CONDITION",f"Condición {obj.codigo} creada para {postulacion.codigo}."); return obj

    @staticmethod
    @transaction.atomic
    def _resolver(condicion, estado, usuario, observaciones=""):
        obj=CondicionPostulacion.objects.select_for_update().get(pk=condicion.pk)
        if obj.estado != obj.Estado.PENDIENTE: raise ValidationError("La condición ya fue verificada.")
        obj.estado=estado; obj.fecha_verificacion=timezone.now(); obj.verificado_por=usuario; obj.observaciones=observaciones; obj.save()
        _audit(usuario,"VERIFY_CONDITION" if estado==obj.Estado.CUMPLE else "REJECT_CONDITION",f"Condición {obj.pk}: {estado}."); return obj

    verificar=staticmethod(lambda condicion,usuario,observaciones="": CondicionService._resolver(condicion,CondicionPostulacion.Estado.CUMPLE,usuario,observaciones))
    rechazar=staticmethod(lambda condicion,usuario,observaciones="": CondicionService._resolver(condicion,CondicionPostulacion.Estado.NO_CUMPLE,usuario,observaciones))
    listar_pendientes=staticmethod(lambda postulacion: postulacion.condiciones.filter(estado=CondicionPostulacion.Estado.PENDIENTE,activo=True))
    listar_completadas=staticmethod(lambda postulacion: postulacion.condiciones.filter(estado=CondicionPostulacion.Estado.CUMPLE,activo=True))


class EntregaFisicaService:
    @staticmethod
    @transaction.atomic
    def crear(postulacion, codigo, nombre, usuario, cantidad=None):
        Postulacion.objects.select_for_update().get(pk=postulacion.pk)
        obj=EntregaFisica(postulacion=postulacion,codigo=codigo,nombre=nombre,cantidad=cantidad)
        obj.save(); _audit(usuario,"CREATE_PHYSICAL_DELIVERY",f"Entrega {obj.codigo} creada para {postulacion.codigo}."); return obj

    @staticmethod
    @transaction.atomic
    def registrar_entrega(entrega, cantidad_recibida, usuario, observaciones=""):
        obj=EntregaFisica.objects.select_for_update().get(pk=entrega.pk)
        if cantidad_recibida <= 0: raise ValidationError("La cantidad recibida debe ser mayor que cero.")
        obj.cantidad_recibida=cantidad_recibida; obj.fecha_entrega=timezone.now(); obj.recibido_por=usuario; obj.observaciones=observaciones
        obj.estado=obj.Estado.COMPLETA if obj.cantidad is not None and cantidad_recibida>=obj.cantidad else obj.Estado.PARCIAL
        obj.save(); _audit(usuario,"REGISTER_PHYSICAL_DELIVERY",f"Entrega {obj.pk}: {cantidad_recibida} recibidos."); return obj

    @staticmethod
    @transaction.atomic
    def actualizar_cantidad(entrega, cantidad_recibida, usuario, observaciones=""):
        return EntregaFisicaService.registrar_entrega(entrega,cantidad_recibida,usuario,observaciones)

    listar_pendientes=staticmethod(lambda postulacion: postulacion.entregas_fisicas.exclude(estado=EntregaFisica.Estado.COMPLETA).filter(activo=True))
    listar_completadas=staticmethod(lambda postulacion: postulacion.entregas_fisicas.filter(estado=EntregaFisica.Estado.COMPLETA,activo=True))
