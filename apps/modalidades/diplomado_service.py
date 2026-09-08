from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.academico.models import EtapaModalidad
from apps.modalidades.diplomado import DiplomadoPolicy, postulacion_modulos
from apps.modalidades.models import DiplomadoDefensa, DiplomadoModulo
from apps.postulantes.models import Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService

MODULE_NAMES = (
    "Módulo 1",
    "Módulo 2",
    "Módulo 3",
    "Módulo 4",
    "Taller de Investigación",
)


class DiplomadoService:
    @staticmethod
    def _validate(postulacion):
        if postulacion.modalidad.codigo != "GRADUACION_VIA_DIPLOMADO":
            raise ValidationError("La postulación no corresponde a Graduación Vía Diplomado.")

    @classmethod
    @transaction.atomic
    def ensure_modules(cls, postulacion):
        cls._validate(postulacion)
        return [DiplomadoModulo.objects.get_or_create(
            postulacion=postulacion, orden=order,
            defaults={"nombre": name},
        )[0] for order, name in enumerate(MODULE_NAMES, start=1)]

    @classmethod
    @transaction.atomic
    def set_module_result(cls, postulacion, order, nota, usuario, observaciones=""):
        modules = cls.ensure_modules(postulacion)
        if not 1 <= int(order) <= 5:
            raise ValidationError({"modulo": "El Diplomado tiene como máximo cinco módulos."})
        module = modules[int(order) - 1]
        module.nota = Decimal(str(nota)).quantize(Decimal("0.01"))
        module.estado = DiplomadoModulo.Estado.APROBADO if module.nota > 65 else DiplomadoModulo.Estado.REPROBADO
        module.observaciones = (observaciones or "").strip()
        module.save()
        return module

    @classmethod
    def overview(cls, postulacion):
        cls._validate(postulacion)
        modules = cls.ensure_modules(postulacion)
        defense = DiplomadoDefensa.objects.filter(postulacion=postulacion).order_by("-numero_intento").first()
        return {
            "modalidad": "GRADUACION_VIA_DIPLOMADO",
            "etapa_actual": postulacion.seguimientos_etapa.filter(estado__in=("PENDIENTE", "EN_PROCESO", "OBSERVADA")).order_by("etapa__orden").values_list("etapa__codigo", flat=True).first(),
            "modulos": [{"id": item.id, "orden": item.orden, "nombre": item.nombre, "horas": item.horas, "estado": item.estado, "nota": str(item.nota) if item.nota is not None else None} for item in modules],
            "defensa": {"intento": defense.numero_intento, "nota": str(defense.nota_consenso) if defense and defense.nota_consenso is not None else None, "resultado": defense.resultado, "reintento_hasta": defense.reintento_hasta} if defense else None,
            "reglas": {"modulos_maximos": 5, "taller_investigacion_orden": 5, "horas_totales": 800, "creditos": 20, "nota_minima": 66, "reintento_dias": 30, "quorum_minimo": 3},
        }

    @classmethod
    @transaction.atomic
    def conclude(cls, postulacion, usuario):
        cls._validate(postulacion)
        DiplomadoPolicy().validar_conclusion_academica(postulacion)
        stage = SeguimientoEtapa.objects.select_for_update().get(postulacion=postulacion, etapa__codigo="CONCLUSION_ACADEMICA", numero_intento=1)
        if stage.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE:
            stage = WorkflowService.iniciar_etapa(stage, usuario)
        if stage.estado != SeguimientoEtapa.EstadoChoices.APROBADA:
            stage = WorkflowService.aprobar_etapa(stage, usuario)
        WorkflowService._actualizar_estado_general(postulacion, "CONCLUIDA", usuario, "Graduación Vía Diplomado concluida.", True)
        return stage
