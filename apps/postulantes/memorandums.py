from django.core.exceptions import ValidationError
from django.db import transaction

from apps.documentos.models import TipoDocumento
from apps.documentos.services import DocumentoService
from apps.postulantes.models import (
    AsignacionPostulacion,
    Postulacion,
    PublicacionMemorandumDesignacion,
    SeguimientoEtapa,
)
from apps.usuarios.models import AuditLog
from core.permissions import is_staff_user


class MemorandumDesignacionService:
    TIPO_DOCUMENTO = "MEMORANDUM_DESIGNACION_PROYECTO"

    @staticmethod
    def composicion_actual(postulacion, seguimiento):
        tribunales = list(AsignacionPostulacion.objects.filter(
            postulacion=postulacion, seguimiento_etapa=seguimiento,
            tipo_participacion="TRIBUNAL", orden_cargo__in=(1, 2, 3), activo=True,
        ).select_related("usuario").order_by("orden_cargo"))
        if len(tribunales) != 3 or {item.orden_cargo for item in tribunales} != {1, 2, 3}:
            raise ValidationError({"asignaciones": ["Se requieren los tres tribunales oficiales con órdenes 1, 2 y 3."]})
        if len({item.usuario_id for item in tribunales}) != 3:
            raise ValidationError({"asignaciones": ["Los tres tribunales oficiales deben ser personas diferentes."]})
        return tribunales

    @classmethod
    def es_vigente(cls, publicacion):
        try:
            actuales = cls.composicion_actual(publicacion.postulacion, publicacion.seguimiento_etapa)
        except ValidationError:
            return False
        actuales_ids = {item.pk for item in actuales}
        publicados = list(publicacion.asignaciones.all())
        publicados_ids = {item.pk for item in publicados}
        legacy_tutores = [
            item for item in publicados
            if item.pk not in actuales_ids
            and item.tipo_participacion == "TUTOR"
            and item.postulacion_id == publicacion.postulacion_id
            and item.seguimiento_etapa_id is None
        ]
        return (
            publicacion.activo
            and actuales_ids.issubset(publicados_ids)
            and len(publicados_ids - actuales_ids) == len(legacy_tutores)
            and len(legacy_tutores) in (0, 1)
        )

    @classmethod
    @transaction.atomic
    def publicar(cls, *, postulacion, seguimiento, archivo, usuario, request=None):
        if not usuario or not usuario.is_active or not is_staff_user(usuario):
            raise ValidationError("Solo un usuario administrativo activo puede publicar el memorándum.")
        postulacion = Postulacion.objects.select_for_update().select_related("modalidad").get(pk=postulacion.pk)
        if postulacion.modalidad.codigo != "PROYECTO_GRADO":
            raise ValidationError("El memorándum de designación solo aplica a Proyecto de Grado.")
        seguimiento = SeguimientoEtapa.objects.select_for_update().select_related("etapa").get(pk=seguimiento.pk)
        if seguimiento.postulacion_id != postulacion.pk or seguimiento.etapa.codigo != "PERFIL_PROYECTO":
            raise ValidationError({"seguimiento_etapa": ["Debe corresponder al Perfil de Proyecto de la postulación."]})
        asignaciones = cls.composicion_actual(postulacion, seguimiento)
        tipo = TipoDocumento.objects.filter(codigo=cls.TIPO_DOCUMENTO, activo=True).first()
        if not tipo:
            raise ValidationError({"archivo": ["El tipo documental del memorándum no está configurado."]})
        version = DocumentoService().subir_documento(postulacion, tipo, archivo, usuario, request=request)
        documento = version.documento
        documento.refresh_from_db()
        if documento.estado.codigo != "APR":
            DocumentoService().aprobar_documento(documento, usuario, request=request)
        PublicacionMemorandumDesignacion.objects.select_for_update().filter(
            postulacion=postulacion, activo=True,
        ).update(activo=False)
        publicacion = PublicacionMemorandumDesignacion.objects.create(
            postulacion=postulacion, seguimiento_etapa=seguimiento,
            version_documento=version, publicado_por=usuario,
        )
        publicacion.asignaciones.set(asignaciones)
        AuditLog.objects.create(
            usuario=usuario, accion="PUBLISH_ASSIGNMENT_MEMORANDUM", modulo="ASIGNACIONES",
            descripcion=f"Memorándum {publicacion.pk} publicado para {postulacion.codigo} con versión {version.pk}.",
        )
        return publicacion
