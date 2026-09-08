from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.modalidades.excelencia_academica import ACTA_DOCUMENT, ExcelenciaAcademicaPolicy
from apps.modalidades.models import ExcelenciaExpediente
from apps.postulantes.models import Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService


class ExcelenciaAcademicaService:
    @staticmethod
    def _validate_postulacion(postulacion):
        if postulacion.modalidad.codigo != "EXCELENCIA_ACADEMICA":
            raise ValidationError("La postulación no corresponde a Excelencia Académica.")

    @classmethod
    @transaction.atomic
    def configurar_criterio(cls, postulacion, criterio):
        cls._validate_postulacion(postulacion)
        if criterio not in ExcelenciaExpediente.Criterio.values:
            raise ValidationError({"criterio": "El criterio de Excelencia Académica no es válido."})
        existing = ExcelenciaExpediente.objects.select_for_update().filter(postulacion=postulacion).first()
        started = postulacion.seguimientos_etapa.exclude(estado=SeguimientoEtapa.EstadoChoices.PENDIENTE).exists()
        if existing:
            if existing.criterio != criterio:
                raise ValidationError({"criterio": "El criterio no puede cambiar después de ser seleccionado."})
            return existing
        if started:
            raise ValidationError("El criterio debe seleccionarse antes de iniciar el flujo.")
        return ExcelenciaExpediente.objects.create(postulacion=postulacion, criterio=criterio)

    @classmethod
    def overview(cls, postulacion):
        cls._validate_postulacion(postulacion)
        policy = ExcelenciaAcademicaPolicy()
        expediente = ExcelenciaExpediente.objects.filter(postulacion=postulacion).first()
        stage = postulacion.seguimientos_etapa.filter(
            activo=True, estado__in=("PENDIENTE", "EN_PROCESO", "OBSERVADA"),
        ).order_by("etapa__orden", "numero_intento").first()
        return {
            "modalidad": "EXCELENCIA_ACADEMICA",
            "criterio": expediente.criterio if expediente else None,
            "criterios": [{"codigo": code, "nombre": label} for code, label in ExcelenciaExpediente.Criterio.choices],
            "resultado": {
                "estado": expediente.resultado if expediente else "PENDIENTE",
                "promedio_general": str(expediente.promedio_general) if expediente and expediente.promedio_general is not None else None,
                "observaciones": expediente.observaciones if expediente else "",
            },
            "etapa_actual": stage.etapa.codigo if stage else None,
            "actores_requeridos": policy.get_reglas_asignacion(),
            "actores": {
                role: postulacion.asignaciones.filter(activo=True, tipo_participacion=role).count()
                for role in policy.get_reglas_asignacion()
            },
            "documentos_requeridos": list(policy._required_documents(expediente, stage.etapa.codigo)) if expediente and stage else [],
            "reglas": {
                "promedio_minimo": "80.00",
                "promedio_primera_instancia_minimo": "70.00",
                "criterio_calidad_sin_escala_numerica": True,
                "acta": ACTA_DOCUMENT,
            },
        }

    @classmethod
    @transaction.atomic
    def registrar_evaluacion(cls, postulacion, usuario, resultado, promedio_general=None, observaciones=""):
        cls._validate_postulacion(postulacion)
        expediente = ExcelenciaExpediente.objects.select_for_update().filter(postulacion=postulacion).first()
        if not expediente:
            raise ValidationError("Debe seleccionar un criterio antes de evaluar.")
        if resultado not in {ExcelenciaExpediente.Resultado.FAVORABLE, ExcelenciaExpediente.Resultado.DESFAVORABLE}:
            raise ValidationError({"resultado": "El resultado debe ser favorable o desfavorable."})
        stage = SeguimientoEtapa.objects.select_for_update().get(
            postulacion=postulacion, etapa__codigo="EVALUACION_TRIBUNAL", numero_intento=1,
        )
        if stage.estado != SeguimientoEtapa.EstadoChoices.EN_PROCESO:
            raise ValidationError("La evaluación debe registrarse con la etapa en proceso.")
        ExcelenciaAcademicaPolicy()._validate_tribunal(postulacion)
        missing = ExcelenciaAcademicaPolicy()._missing_documents(postulacion, expediente, "REVISION_REQUISITOS")
        if missing:
            raise ValidationError({"faltantes": missing})
        note = None
        if expediente.criterio == ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO:
            if promedio_general in (None, ""):
                raise ValidationError({"promedio_general": "El rendimiento académico requiere el promedio general documentado."})
            note = Decimal(str(promedio_general)).quantize(Decimal("0.01"))
            if note < Decimal("80"):
                raise ValidationError({"promedio_general": "El promedio general debe ser igual o superior a 80."})
        elif promedio_general not in (None, ""):
            raise ValidationError({"promedio_general": "Reconocimiento a la calidad no admite nota numérica."})
        expediente.resultado = resultado
        expediente.promedio_general = note
        expediente.observaciones = (observaciones or "").strip()
        expediente.evaluado_por = usuario
        expediente.fecha_evaluacion = timezone.now()
        expediente.save()
        if resultado == ExcelenciaExpediente.Resultado.FAVORABLE:
            WorkflowService.aprobar_etapa(stage, usuario)
        return expediente

    @classmethod
    @transaction.atomic
    def concluir(cls, postulacion, usuario):
        cls._validate_postulacion(postulacion)
        policy = ExcelenciaAcademicaPolicy()
        policy.validar_conclusion_academica(postulacion)
        stage = SeguimientoEtapa.objects.select_for_update().get(
            postulacion=postulacion, etapa__codigo="CONCLUSION_ACADEMICA", numero_intento=1,
        )
        if stage.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE:
            stage = WorkflowService.iniciar_etapa(stage, usuario)
        if stage.estado != SeguimientoEtapa.EstadoChoices.APROBADA:
            stage = WorkflowService.aprobar_etapa(stage, usuario)
        WorkflowService._actualizar_estado_general(
            postulacion, "CONCLUIDA", usuario,
            "Excelencia Académica concluida con evaluación favorable y acta aprobada.", True,
        )
        return stage