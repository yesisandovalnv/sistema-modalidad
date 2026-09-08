from django.core.exceptions import ValidationError
from django.db import transaction

from apps.modalidades.models import InformeSeguimientoTrabajoDirigido, TrabajoDirigidoExpediente
from apps.postulantes.models import SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService


class TrabajoDirigidoService:
    @staticmethod
    def _validate(postulacion):
        if postulacion.modalidad.codigo != "TRABAJO_DIRIGIDO":
            raise ValidationError("La postulación no corresponde a Trabajo Dirigido.")

    @classmethod
    @transaction.atomic
    def configurar_institucion(cls, postulacion, data):
        cls._validate(postulacion)
        fields = {
            "tipo_ejecucion": data.get("tipo_ejecucion"),
            "institucion_nombre": (data.get("institucion_nombre") or "").strip(),
            "institucion_tipo": data.get("institucion_tipo"),
            "constituida_legalmente": bool(data.get("constituida_legalmente")),
            "actividad_permanente": bool(data.get("actividad_permanente")),
            "proporciona_recursos": bool(data.get("proporciona_recursos")),
            "supervisor_nombre": (data.get("supervisor_nombre") or "").strip(),
            "supervisor_profesion": (data.get("supervisor_profesion") or "").strip(),
            "convenio_vigente": bool(data.get("convenio_vigente")),
            "fecha_firma_convenio": data.get("fecha_firma_convenio") or None,
            "observaciones": (data.get("observaciones") or "").strip(),
        }
        expediente, _ = TrabajoDirigidoExpediente.all_objects.update_or_create(
            postulacion=postulacion, defaults={**fields, "activo": True},
        )
        expediente.full_clean()
        expediente.save()
        return expediente

    @classmethod
    @transaction.atomic
    def registrar_informe(cls, postulacion, data, usuario):
        cls._validate(postulacion)
        expediente = TrabajoDirigidoExpediente.objects.filter(postulacion=postulacion).first()
        if not expediente:
            raise ValidationError("Primero debe registrar la institución de Trabajo Dirigido.")
        report = InformeSeguimientoTrabajoDirigido(
            expediente=expediente,
            periodo=(data.get("periodo") or "").strip(),
            descripcion_desempeno=(data.get("descripcion_desempeno") or "").strip(),
            evaluacion_cualitativa=(data.get("evaluacion_cualitativa") or "").strip(),
            aporte_laboral=(data.get("aporte_laboral") or "").strip(),
            sugerencias_recomendaciones=(data.get("sugerencias_recomendaciones") or "").strip(),
            registrado_por=usuario,
        )
        report.save()
        return report

    @classmethod
    def overview(cls, postulacion):
        cls._validate(postulacion)
        expediente = TrabajoDirigidoExpediente.objects.filter(postulacion=postulacion).first()
        reports = expediente.informes_seguimiento.filter(activo=True) if expediente else []
        return {
            "modalidad": "TRABAJO_DIRIGIDO",
            "etapa_actual": postulacion.seguimientos_etapa.filter(
                estado__in=("PENDIENTE", "EN_PROCESO", "OBSERVADA"), activo=True,
            ).order_by("etapa__orden", "numero_intento").values_list("etapa__codigo", flat=True).first(),
            "institucion": None if not expediente else {
                "tipo_ejecucion": expediente.tipo_ejecucion,
                "institucion_nombre": expediente.institucion_nombre,
                "institucion_tipo": expediente.institucion_tipo,
                "constituida_legalmente": expediente.constituida_legalmente,
                "actividad_permanente": expediente.actividad_permanente,
                "proporciona_recursos": expediente.proporciona_recursos,
                "supervisor_nombre": expediente.supervisor_nombre,
                "supervisor_profesion": expediente.supervisor_profesion,
                "convenio_requerido": expediente.tipo_ejecucion == TrabajoDirigidoExpediente.TipoEjecucion.EXTERNO,
                "convenio_vigente": expediente.convenio_vigente,
                "fecha_firma_convenio": expediente.fecha_firma_convenio,
                "observaciones": expediente.observaciones,
            },
            "informes": [{
                "id": item.id, "periodo": item.periodo,
                "descripcion_desempeno": item.descripcion_desempeno,
                "evaluacion_cualitativa": item.evaluacion_cualitativa,
                "aporte_laboral": item.aporte_laboral,
                "sugerencias_recomendaciones": item.sugerencias_recomendaciones,
                "fecha": item.created_at,
            } for item in reports],
            "reglas": {
                "perfil_reintento_dias_habiles": 5,
                "documento_final_gestiones_maximas": 2,
                "informe_tutor_dias_calendario": 10,
                "correccion_tribunal_dias_calendario": 10,
                "segunda_revision_dias_habiles": 5,
                "correccion_privada_semanas": 2,
                "ponderacion_privada": 30,
                "ponderacion_publica": 70,
                "nota_minima": 51,
            },
        }

    @classmethod
    @transaction.atomic
    def concluir(cls, postulacion, usuario):
        cls._validate(postulacion)
        stage = SeguimientoEtapa.objects.select_for_update().get(
            postulacion=postulacion, etapa__codigo="CIERRE_DOCUMENTAL", numero_intento=1,
        )
        if stage.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE:
            stage = WorkflowService.iniciar_etapa(stage, usuario)
        if stage.estado != SeguimientoEtapa.EstadoChoices.APROBADA:
            stage = WorkflowService.aprobar_etapa(stage, usuario, actualizar_estado_general=False)
        WorkflowService.concluir_postulacion(postulacion, usuario, "Trabajo Dirigido concluido conforme a reglamento.")
        return stage
