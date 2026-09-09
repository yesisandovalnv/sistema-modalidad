from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.documentos.models import DocumentoPostulacion, VersionDocumento
from apps.notificaciones.events import EventTypes, publish_domain_event
from apps.postulantes.models import (
    AsignacionPostulacion,
    InformeRevisionTribunalPrevia,
    SeguimientoEtapa,
)
from apps.usuarios.models import AuditLog
from apps.modalidades.policies import ModalidadPolicyRegistry
from core.permissions import is_staff_user


class RevisionTribunalPreviaService:
    @staticmethod
    def _policy(seguimiento):
        policy = ModalidadPolicyRegistry.get(seguimiento.postulacion).get_revision_tribunal_previa_policy()
        if not policy:
            raise ValidationError("La modalidad no tiene revisión previa de tribunal configurada.")
        return policy

    @classmethod
    def _validar_seguimiento(cls, seguimiento):
        policy = cls._policy(seguimiento)
        policy.validar_seguimiento(seguimiento)
        if not seguimiento.activo:
            raise ValidationError("El seguimiento de revisión previa no está activo.")
        if seguimiento.estado not in (
            SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            SeguimientoEtapa.EstadoChoices.OBSERVADA,
        ):
            raise ValidationError("La revisión previa debe estar EN_PROCESO u OBSERVADA.")

    @classmethod
    def _validar_tribunales(cls, seguimiento):
        return cls._policy(seguimiento).validar_tribunales(seguimiento)

    @classmethod
    def _documento_final_actual(cls, seguimiento):
        documento = (
            DocumentoPostulacion.objects.select_for_update()
            .select_related("estado", "tipo_documento")
            .filter(
                postulacion=seguimiento.postulacion,
                tipo_documento__codigo=cls._policy(seguimiento).get_documento_final_codigo(),
                activo=True,
            )
            .first()
        )
        version = (
            VersionDocumento.objects.select_for_update()
            .filter(documento=documento, es_version_actual=True, activo=True)
            .first()
            if documento
            else None
        )
        if not documento or documento.estado.codigo != "APR" or documento.requiere_correccion or not version:
            raise ValidationError(
                "Se requiere un Documento Final activo, aprobado, sin correcciones y con versión actual activa."
            )
        return documento, version

    @classmethod
    def _validar_version_revisada(cls, seguimiento, version_revisada, actual):
        if (
            not version_revisada.activo
            or version_revisada.pk != actual.pk
            or not version_revisada.es_version_actual
            or version_revisada.documento.postulacion_id != seguimiento.postulacion_id
            or version_revisada.documento.tipo_documento.codigo != cls._policy(seguimiento).get_documento_final_codigo()
        ):
            raise ValidationError(
                {"version_documento_revisada": ["La versión revisada debe ser la versión actual activa del Documento Final."]}
            )

    @classmethod
    def _validar_evidencia(cls, seguimiento, evidencia):
        archivo = evidencia.archivo
        valida = (
            evidencia.activo
            and evidencia.es_version_actual
            and evidencia.documento.activo
            and evidencia.documento.postulacion_id == seguimiento.postulacion_id
            and evidencia.documento.tipo_documento.codigo == cls._policy(seguimiento).get_tipo_evidencia_codigo()
            and archivo
            and archivo.name
        )
        if valida:
            try:
                valida = archivo.storage.exists(archivo.name)
            except (OSError, ValueError):
                valida = False
        if not valida:
            raise ValidationError(
                {"evidencia_version": ["La evidencia debe ser una versión actual, activa y disponible del Informe de Evaluación del Tribunal."]}
            )

    @staticmethod
    def _validar_administrador(usuario):
        if not usuario or not usuario.is_active or not is_staff_user(usuario):
            raise ValidationError("Se requiere un usuario administrativo activo para registrar el informe.")

    @classmethod
    @transaction.atomic
    def registrar_informe(
        cls,
        seguimiento,
        version_documento_revisada,
        resultado,
        observaciones,
        evidencia_version,
        usuario,
    ):
        cls._validar_administrador(usuario)
        seguimiento = (
            SeguimientoEtapa.objects.select_for_update()
            .select_related("postulacion__modalidad", "etapa")
            .get(pk=seguimiento.pk)
        )
        version_documento_revisada = (
            VersionDocumento.all_objects.select_for_update()
            .select_related("documento__postulacion", "documento__tipo_documento")
            .get(pk=version_documento_revisada.pk)
        )
        evidencia_version = (
            VersionDocumento.all_objects.select_for_update()
            .select_related("documento__postulacion", "documento__tipo_documento")
            .get(pk=evidencia_version.pk)
        )
        cls._validar_seguimiento(seguimiento)
        cls._validar_tribunales(seguimiento)
        _documento, actual = cls._documento_final_actual(seguimiento)
        cls._validar_version_revisada(seguimiento, version_documento_revisada, actual)
        cls._validar_evidencia(seguimiento, evidencia_version)
        observaciones = (observaciones or "").strip()
        if resultado == InformeRevisionTribunalPrevia.Resultado.INSUFICIENTE and not observaciones:
            raise ValidationError({"observaciones": ["Las observaciones son obligatorias para un resultado INSUFICIENTE."]})
        if resultado not in InformeRevisionTribunalPrevia.Resultado.values:
            raise ValidationError({"resultado": ["El resultado debe ser SUFICIENTE o INSUFICIENTE."]})
        if InformeRevisionTribunalPrevia.objects.filter(
            seguimiento_etapa=seguimiento,
            version_documento_revisada=version_documento_revisada,
        ).exists():
            raise ValidationError(
                {"non_field_errors": ["Ya existe un informe activo para esta etapa y versión del Documento Final."]}
            )
        try:
            informe = InformeRevisionTribunalPrevia.objects.create(
                seguimiento_etapa=seguimiento,
                version_documento_revisada=version_documento_revisada,
                resultado=resultado,
                observaciones=observaciones,
                evidencia_version=evidencia_version,
                registrado_por=usuario,
            )
        except IntegrityError as exc:
            raise ValidationError(
                {"non_field_errors": ["Ya existe un informe activo para esta etapa y versión del Documento Final."]}
            ) from exc

        if resultado == InformeRevisionTribunalPrevia.Resultado.INSUFICIENTE:
            seguimiento.estado = SeguimientoEtapa.EstadoChoices.OBSERVADA
            seguimiento.save(update_fields=["estado", "updated_at"])

        AuditLog.objects.create(
            usuario=usuario,
            accion="REGISTER_PRE_REVIEW_REPORT",
            modulo="REVISION_TRIBUNAL",
            descripcion=(
                f"Postulación {seguimiento.postulacion.codigo}; etapa {seguimiento.etapa.codigo}; "
                f"Documento Final v{version_documento_revisada.numero_version}; resultado {resultado}; "
                f"evidencia versión {evidencia_version.pk}."
            ),
        )
        publish_domain_event(
            EventTypes.INFORME_REVISION_TRIBUNAL_REGISTRADO,
            informe,
            usuario,
            seguimiento.postulacion,
            {"etapa": seguimiento.etapa.nombre, "resultado": resultado},
            f"INFORME_REVISION_TRIBUNAL_REGISTRADO:{informe.pk}",
        )
        return informe

    @classmethod
    def validar_aprobacion(cls, seguimiento):
        cls._validar_seguimiento(seguimiento)
        cls._validar_tribunales(seguimiento)
        _documento, actual = cls._documento_final_actual(seguimiento)
        informe = (
            InformeRevisionTribunalPrevia.objects.select_for_update()
            .select_related("evidencia_version__documento__tipo_documento")
            .filter(
                seguimiento_etapa=seguimiento,
                version_documento_revisada=actual,
                activo=True,
            )
            .first()
        )
        if not informe:
            raise ValidationError("No existe un informe activo para la versión actual del Documento Final.")
        cls._validar_evidencia(seguimiento, informe.evidencia_version)
        if informe.resultado != InformeRevisionTribunalPrevia.Resultado.SUFICIENTE:
            raise ValidationError("El informe de la versión actual declara el trabajo INSUFICIENTE.")
        return informe
