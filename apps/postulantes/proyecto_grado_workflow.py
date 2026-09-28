from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.postulantes.models import Postulacion, SeguimientoEtapa


class ProyectoGradoWorkflowOrchestrator:
    """Orquesta solamente las aperturas mecánicas del flujo oficial de PG."""

    MODALIDAD = "PROYECTO_GRADO"
    ETAPAS = (
        "INSCRIPCION",
        "PERFIL_PROYECTO",
        "DOCUMENTO_FINAL",
        "REVISION_TRIBUNAL_PREVIA",
        "DEFENSA_PRIVADA",
        "DEFENSA_PUBLICA",
        "REVISION_FINAL_POST_PUBLICA",
        "CIERRE_DOCUMENTAL",
    )

    @classmethod
    def _es_flujo_oficial(cls, postulacion: Postulacion) -> bool:
        if (
            postulacion.modalidad.codigo != cls.MODALIDAD
            or postulacion.tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO
        ):
            return False
        codigos = tuple(
            postulacion.modalidad.etapas.filter(activo=True)
            .order_by("orden")
            .values_list("codigo", flat=True)
        )
        return codigos == cls.ETAPAS

    @classmethod
    def _seguimiento(cls, postulacion: Postulacion, codigo: str) -> SeguimientoEtapa:
        seguimiento = (
            postulacion.seguimientos_etapa.select_for_update()
            .select_related("etapa", "postulacion__modalidad")
            .filter(etapa__codigo=codigo, activo=True)
            .order_by("-numero_intento")
            .first()
        )
        if not seguimiento:
            raise ValidationError(f"No existe seguimiento activo para {codigo}.")
        return seguimiento

    @classmethod
    def _iniciar_si_pendiente(cls, seguimiento: SeguimientoEtapa, usuario):
        if seguimiento.estado != SeguimientoEtapa.EstadoChoices.PENDIENTE:
            return seguimiento
        from apps.postulantes.workflow import WorkflowService

        return WorkflowService.iniciar_etapa(seguimiento, usuario)

    @classmethod
    @transaction.atomic
    def inicializar_proceso(cls, postulacion: Postulacion, usuario) -> list[SeguimientoEtapa]:
        """Inicializa PG y deja Inscripción aprobada y Perfil en proceso."""
        from apps.postulantes.workflow import WorkflowService

        seguimientos = WorkflowService.inicializar_flujo(postulacion, usuario)
        postulacion = Postulacion.objects.select_for_update().select_related("modalidad").get(pk=postulacion.pk)
        if not cls._es_flujo_oficial(postulacion):
            return seguimientos

        inscripcion = cls._seguimiento(postulacion, "INSCRIPCION")
        inscripcion = cls._iniciar_si_pendiente(inscripcion, usuario)
        if inscripcion.estado in {
            SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            SeguimientoEtapa.EstadoChoices.OBSERVADA,
        }:
            inscripcion = WorkflowService.aprobar_etapa(inscripcion, usuario)
        if inscripcion.estado != SeguimientoEtapa.EstadoChoices.APROBADA:
            raise ValidationError("No se pudo completar la etapa INSCRIPCION.")

        # aprobar_etapa ya intenta esta apertura; esta segunda llamada hace el
        # arranque explícitamente idempotente ante reintentos o estados previos.
        cls._iniciar_si_pendiente(cls._seguimiento(postulacion, "PERFIL_PROYECTO"), usuario)
        return list(WorkflowService.obtener_seguimientos_ordenados(postulacion))

    @classmethod
    def autoabrir_siguiente(cls, seguimiento_aprobado: SeguimientoEtapa, usuario):
        """Abre la etapa oficial siguiente sin ejecutar ninguna acción académica."""
        postulacion = seguimiento_aprobado.postulacion
        if not cls._es_flujo_oficial(postulacion):
            return None
        try:
            indice = cls.ETAPAS.index(seguimiento_aprobado.etapa.codigo)
        except ValueError:
            return None
        if indice == len(cls.ETAPAS) - 1:
            return None
        siguiente = cls._seguimiento(postulacion, cls.ETAPAS[indice + 1])
        return cls._iniciar_si_pendiente(siguiente, usuario)
