from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.notificaciones.events import EventTypes, publish_domain_event
from apps.postulantes.models import DictamenRevisionDocumento, SeguimientoEtapa
from apps.documentos.models import VersionDocumento
from apps.usuarios.models import AuditLog
from core.permissions import is_staff_user


class DictamenRevisionDocumentoService:
    """Registro genérico de dictámenes; la policy define sus reglas académicas."""

    @classmethod
    @transaction.atomic
    def registrar(cls, *, seguimiento, version_documento_revisada, tipo_revision,
                  resultado, evidencia_version, usuario, asignacion_emisora=None,
                  observaciones=""):
        if not usuario or not usuario.is_active or not is_staff_user(usuario):
            raise ValidationError("Se requiere un usuario administrativo activo para registrar el dictamen.")
        seguimiento = SeguimientoEtapa.objects.select_for_update().select_related("postulacion__modalidad", "etapa").get(pk=seguimiento.pk)
        version_documento_revisada = VersionDocumento.all_objects.select_for_update().select_related("documento__postulacion", "documento__tipo_documento").get(pk=version_documento_revisada.pk)
        evidencia_version = VersionDocumento.all_objects.select_for_update().select_related("documento__postulacion", "documento__tipo_documento").get(pk=evidencia_version.pk)
        policy = ModalidadPolicyRegistry.get(seguimiento.postulacion)
        policy.validar_dictamen_revision(
            seguimiento=seguimiento, tipo_revision=tipo_revision,
            version_documento_revisada=version_documento_revisada,
            evidencia_version=evidencia_version, asignacion_emisora=asignacion_emisora,
            resultado=resultado,
        )
        try:
            dictamen = DictamenRevisionDocumento.objects.create(
                seguimiento_etapa=seguimiento, version_documento_revisada=version_documento_revisada,
                tipo_revision=tipo_revision, resultado=resultado,
                evidencia_version=evidencia_version, asignacion_emisora=asignacion_emisora,
                observaciones=(observaciones or "").strip(), registrado_por=usuario,
            )
        except IntegrityError as exc:
            raise ValidationError("Ya existe un dictamen activo para esta etapa, versión y tipo de revisión.") from exc
        if resultado == DictamenRevisionDocumento.Resultado.INSUFICIENTE:
            seguimiento.estado = SeguimientoEtapa.EstadoChoices.OBSERVADA
            seguimiento.save(update_fields=["estado", "updated_at"])
        AuditLog.objects.create(usuario=usuario, accion="REGISTER_DOCUMENT_REVIEW", modulo="REVISION_DOCUMENTAL",
            descripcion=f"Dictamen {tipo_revision} {resultado} para {seguimiento.postulacion.codigo}, versión {version_documento_revisada.numero_version}.")
        publish_domain_event(EventTypes.INFORME_REVISION_TRIBUNAL_REGISTRADO, dictamen, usuario, seguimiento.postulacion,
            {"etapa": seguimiento.etapa.codigo, "tipo_revision": tipo_revision, "resultado": resultado}, f"DICTAMEN_REVISION:{dictamen.pk}")
        return dictamen
