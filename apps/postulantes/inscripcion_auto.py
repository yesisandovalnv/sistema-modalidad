"""Finalización automática de Inscripción para Proyecto y Tesis de Grado."""

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.postulantes.models import Postulacion, SeguimientoEtapa


class InscripcionAutoFinalizacionService:
    """Completa Inscripción solo cuando la policy vigente ya permite aprobarla."""

    MODALIDADES = {"PROYECTO_GRADO", "TESIS_GRADO"}

    @classmethod
    @transaction.atomic
    def intentar_finalizar(cls, postulacion, usuario):
        if not postulacion or postulacion.modalidad.codigo not in cls.MODALIDADES:
            return None

        # El lock del expediente serializa disparadores por documento y entrega.
        postulacion = (
            Postulacion.objects.select_for_update()
            .select_related("modalidad")
            .get(pk=postulacion.pk)
        )
        if (
            postulacion.modalidad.codigo not in cls.MODALIDADES
            or postulacion.tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO
        ):
            return None

        if postulacion.modalidad.codigo == "PROYECTO_GRADO":
            from apps.postulantes.proyecto_grado_workflow import ProyectoGradoWorkflowOrchestrator

            orchestrator = ProyectoGradoWorkflowOrchestrator
        else:
            from apps.postulantes.tesis_grado_workflow import TesisGradoWorkflowOrchestrator

            orchestrator = TesisGradoWorkflowOrchestrator
        if not orchestrator._es_flujo_oficial(postulacion):
            return None

        seguimiento = (
            SeguimientoEtapa.objects.select_for_update()
            .select_related("etapa", "postulacion__modalidad")
            .filter(
                postulacion=postulacion,
                etapa__codigo="INSCRIPCION",
                activo=True,
            )
            .order_by("-numero_intento", "-pk")
            .first()
        )
        if not seguimiento or seguimiento.estado != SeguimientoEtapa.EstadoChoices.EN_PROCESO:
            return None

        from apps.modalidades.policies import ModalidadPolicyRegistry
        from apps.documentos.models import DocumentoPostulacion
        from apps.postulantes.models import EntregaFisica

        policy = ModalidadPolicyRegistry.get(postulacion)
        document_codes = policy.requisitos_policy.get_documentos_requeridos("INSCRIPCION")
        delivery_codes = policy.requisitos_policy.get_entregas_requeridas("INSCRIPCION")
        # Bloquear los insumos que la policy evaluará, con orden estable, para que
        # aprobaciones/cargas/recepciones concurrentes no cambien el gate a mitad.
        list(
            DocumentoPostulacion.objects.select_for_update()
            .filter(
                postulacion=postulacion,
                tipo_documento__codigo__in=document_codes,
                activo=True,
            )
            .order_by("pk")
        )
        list(
            EntregaFisica.objects.select_for_update()
            .filter(
                postulacion=postulacion,
                codigo__in=delivery_codes,
                activo=True,
            )
            .order_by("pk")
        )
        try:
            # La policy es la fuente única para los requisitos documentales y físicos.
            policy.validar_aprobacion_etapa(seguimiento)
        except ValidationError:
            return None

        from apps.postulantes.workflow import WorkflowService

        aprobado = WorkflowService.aprobar_etapa(seguimiento, usuario)
        if postulacion.modalidad.codigo == "TESIS_GRADO":
            # Proyecto abre la siguiente etapa dentro de aprobar_etapa; Tesis usa su orquestador.
            orchestrator.autoabrir_siguiente(aprobado, usuario)
        return aprobado
