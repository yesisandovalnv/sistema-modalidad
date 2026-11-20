from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.postulantes.models import Postulacion, SeguimientoEtapa


class TesisGradoWorkflowOrchestrator:
    """Inicializa el arranque mecánico del flujo oficial de Tesis de Grado."""

    MODALIDAD = "TESIS_GRADO"
    ETAPAS = (
        "INSCRIPCION",
        "TEMATICA_TESIS",
        "PERFIL_TESIS",
        "DOCUMENTO_FINAL",
        "REVISION_TUTOR",
        "REVISION_TRIBUNAL",
        "DEFENSA_PRIVADA",
        "DEFENSA_PUBLICA",
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
    def _inscripcion(cls, postulacion: Postulacion) -> SeguimientoEtapa:
        seguimiento = (
            postulacion.seguimientos_etapa.select_for_update()
            .select_related("etapa", "postulacion__modalidad")
            .filter(etapa__codigo="INSCRIPCION", activo=True)
            .order_by("-numero_intento")
            .first()
        )
        if not seguimiento:
            raise ValidationError("No existe seguimiento activo para INSCRIPCION.")
        return seguimiento

    @classmethod
    @transaction.atomic
    def inicializar_proceso(cls, postulacion: Postulacion, usuario) -> list[SeguimientoEtapa]:
        """Crea el flujo oficial e inicia Inscripción sin aprobarla."""
        from apps.postulantes.workflow import WorkflowService

        seguimientos = WorkflowService.inicializar_flujo(postulacion, usuario)
        postulacion = (
            Postulacion.objects.select_for_update()
            .select_related("modalidad")
            .get(pk=postulacion.pk)
        )
        if not cls._es_flujo_oficial(postulacion):
            return seguimientos

        inscripcion = cls._inscripcion(postulacion)
        if inscripcion.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE:
            WorkflowService.iniciar_etapa(inscripcion, usuario)

        return list(WorkflowService.obtener_seguimientos_ordenados(postulacion))

    @classmethod
    @transaction.atomic
    def autoabrir_siguiente(cls, seguimiento_aprobado: SeguimientoEtapa, usuario):
        """Abre mecánicamente la etapa oficial siguiente después de Inscripción."""
        postulacion = Postulacion.objects.select_for_update().select_related("modalidad").get(
            pk=seguimiento_aprobado.postulacion_id,
        )
        if not cls._es_flujo_oficial(postulacion):
            return None
        try:
            indice = cls.ETAPAS.index(seguimiento_aprobado.etapa.codigo)
        except ValueError:
            return None
        if indice == len(cls.ETAPAS) - 1:
            return None

        siguiente_codigo = cls.ETAPAS[indice + 1]
        siguiente = (
            postulacion.seguimientos_etapa.select_for_update()
            .select_related("etapa", "postulacion__modalidad")
            .filter(etapa__codigo=siguiente_codigo, activo=True)
            .order_by("-numero_intento", "-pk")
            .first()
        )
        if not siguiente:
            raise ValidationError(f"No existe seguimiento activo para {siguiente_codigo}.")
        if siguiente.estado != SeguimientoEtapa.EstadoChoices.PENDIENTE:
            return siguiente

        from apps.postulantes.workflow import WorkflowService

        return WorkflowService.iniciar_etapa(siguiente, usuario)
