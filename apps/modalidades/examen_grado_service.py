from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.academico.models import EtapaModalidad
from apps.modalidades.examen_grado import AREA_DATA, ExamenGradoPolicy
from apps.modalidades.models import ExamenArea, ExamenEvaluacion
from apps.postulantes.models import Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService


class ExamenGradoService:
    @staticmethod
    def _validate_postulacion(postulacion):
        if postulacion.modalidad.codigo != "EXAMEN_GRADO":
            raise ValidationError("La postulación no corresponde a Examen de Grado.")

    @classmethod
    def ensure_areas(cls, postulacion):
        cls._validate_postulacion(postulacion)
        areas = []
        for codigo, nombre, ponderacion in AREA_DATA:
            area, _ = ExamenArea.objects.get_or_create(
                postulacion=postulacion, codigo=codigo,
                defaults={"nombre": nombre, "orden": int(codigo[-1]), "ponderacion": ponderacion},
            )
            areas.append(area)
        return areas

    @classmethod
    def overview(cls, postulacion):
        areas = cls.ensure_areas(postulacion)
        result = cls.calcular_resultado_final(postulacion)
        policy = ExamenGradoPolicy()
        current_code = postulacion.seguimientos_etapa.filter(
            activo=True, estado__in=("PENDIENTE", "EN_PROCESO", "OBSERVADA"),
        ).order_by("etapa__orden", "numero_intento").values_list("etapa__codigo", flat=True).first()
        current_area = next((area for area in areas if area.codigo == current_code), None)
        composition = policy.resolver_composicion_activa(postulacion, area=current_area)
        return {
            "modalidad": "EXAMEN_GRADO",
            "variante": "EXAMEN_CONTENIDOS",
            "etapa_actual": current_code,
            "areas": [cls._serialize_area(area) for area in areas],
            "tribunales": [
                {"id": assignment.usuario_id, "nombre": str(assignment.usuario)}
                for assignment in composition["tribunales"]
            ],
            "composicion": cls._serialize_composition(composition),
            "resultado_final": result,
            "reglas": {"nota_minima": 61, "escala": [0, 100], "reintento_dias": 15, "ponderaciones": {code: str(weight) for code, _name, weight in AREA_DATA}},
        }

    @classmethod
    @transaction.atomic
    def registrar_evaluacion(cls, postulacion, codigo_area, nota, usuario, observaciones="", evaluador_id=None, modalidad_registro="INDIVIDUAL"):
        cls._validate_postulacion(postulacion)
        area = cls.ensure_areas(postulacion)[int(codigo_area[-1]) - 1] if codigo_area in {x[0] for x in AREA_DATA} else None
        if area is None:
            raise ValidationError("El área no existe.")
        if area.estado in {ExamenArea.Estado.APROBADA, ExamenArea.Estado.REPROBADA}:
            raise ValidationError("El área ya tiene un resultado definitivo.")
        if modalidad_registro not in {ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL, ExamenEvaluacion.ModalidadRegistro.CONSENSO}:
            raise ValidationError({"modalidad_registro": "La modalidad de registro no es válida."})
        if not 0 <= Decimal(str(nota)) <= 100:
            raise ValidationError({"nota": "La nota del área debe estar entre 0 y 100."})
        if area.intento_actual == 2 and area.reintento_hasta and timezone.now() > area.reintento_hasta:
            raise ValidationError("El nuevo examen debe realizarse dentro de los 15 días calendario.")
        stage = SeguimientoEtapa.objects.select_for_update().get(
            postulacion=postulacion, etapa__codigo=codigo_area, numero_intento=area.intento_actual,
        )
        if stage.estado != SeguimientoEtapa.EstadoChoices.EN_PROCESO:
            raise ValidationError("El área debe estar en proceso para registrar su evaluación.")
        composition = ExamenGradoPolicy().resolver_composicion_activa(postulacion, area=area)
        if not composition["evaluable"]:
            detail = composition["inconsistencias"][0] if composition["inconsistencias"] else "Faltan actores requeridos."
            raise ValidationError(f"La composición del Examen no permite evaluar: {detail}")
        current_evaluations = ExamenEvaluacion.objects.filter(area=area, intento=area.intento_actual)
        if current_evaluations.exclude(modalidad_registro=modalidad_registro).exists():
            raise ValidationError({"modalidad_registro": "No se pueden mezclar evaluaciones individuales y por consenso en el mismo intento."})
        evaluator = None
        if modalidad_registro == ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL:
            evaluator = next((item for item in composition["tribunales"] if item.usuario_id == evaluador_id), None)
            if evaluator is None:
                raise ValidationError({"evaluador": "La evaluación individual requiere un tribunal activo del mismo Examen."})
            if ExamenEvaluacion.objects.filter(area=area, intento=area.intento_actual, evaluador_id=evaluator.usuario_id).exists():
                raise ValidationError({"evaluador": "El tribunal ya registró la evaluación de este intento."})
        elif ExamenEvaluacion.objects.filter(area=area, intento=area.intento_actual, modalidad_registro=ExamenEvaluacion.ModalidadRegistro.CONSENSO).exists():
            raise ValidationError({"modalidad_registro": "El área ya tiene una evaluación consensuada para este intento."})
        note = Decimal(str(nota)).quantize(Decimal("0.01"))
        individual_result = ExamenEvaluacion.Resultado.APROBADA if note >= 61 else ExamenEvaluacion.Resultado.INSUFICIENTE
        evaluation = ExamenEvaluacion.objects.create(area=area, intento=area.intento_actual, nota=note, resultado=individual_result, modalidad_registro=modalidad_registro, evaluador=evaluator.usuario if evaluator else None, observaciones=(observaciones or "").strip())
        if modalidad_registro == ExamenEvaluacion.ModalidadRegistro.CONSENSO:
            if individual_result == ExamenEvaluacion.Resultado.APROBADA:
                area.estado = ExamenArea.Estado.APROBADA
                area.reintento_hasta = None
                area.save(update_fields=["estado", "reintento_hasta", "updated_at"])
                WorkflowService.aprobar_etapa(stage, usuario)
            elif area.intento_actual == 1:
                area.estado = ExamenArea.Estado.POSTERGADA
                area.intento_actual = 2
                area.reintento_hasta = timezone.now() + timedelta(days=15)
                area.save(update_fields=["estado", "intento_actual", "reintento_hasta", "updated_at"])
                WorkflowService.rechazar_etapa(stage, usuario, "Área postergada por nota menor a 61; habilitado un segundo examen dentro de 15 días.")
                WorkflowService.crear_nuevo_intento(postulacion, stage.etapa, usuario)
            else:
                area.estado = ExamenArea.Estado.REPROBADA
                area.save(update_fields=["estado", "updated_at"])
                WorkflowService.rechazar_etapa(stage, usuario, "Segunda nota menor a 61: el postulante debe optar por otra modalidad de graduación.")
            return evaluation
        evaluations = list(ExamenEvaluacion.objects.filter(area=area, intento=area.intento_actual))
        if len(evaluations) < 3:
            return evaluation
        average = sum((item.nota for item in evaluations), Decimal("0")) / Decimal("3")
        result = ExamenEvaluacion.Resultado.APROBADA if average >= 61 else ExamenEvaluacion.Resultado.INSUFICIENTE
        if result == ExamenEvaluacion.Resultado.APROBADA:
            area.estado = ExamenArea.Estado.APROBADA
            area.reintento_hasta = None
            area.save(update_fields=["estado", "reintento_hasta", "updated_at"])
            WorkflowService.aprobar_etapa(stage, usuario)
        elif area.intento_actual == 1:
            area.estado = ExamenArea.Estado.POSTERGADA
            area.intento_actual = 2
            area.reintento_hasta = timezone.now() + timedelta(days=15)
            area.save(update_fields=["estado", "intento_actual", "reintento_hasta", "updated_at"])
            WorkflowService.rechazar_etapa(stage, usuario, "Área postergada por nota menor a 61; habilitado un segundo examen dentro de 15 días.")
            WorkflowService.crear_nuevo_intento(postulacion, stage.etapa, usuario)
        else:
            area.estado = ExamenArea.Estado.REPROBADA
            area.save(update_fields=["estado", "updated_at"])
            WorkflowService.rechazar_etapa(stage, usuario, "Segunda nota menor a 61: el postulante debe optar por otra modalidad de graduación.")
        return evaluation

    @classmethod
    @transaction.atomic
    def concluir(cls, postulacion, usuario):
        cls._validate_postulacion(postulacion)
        policy = ExamenGradoPolicy()
        policy.validar_conclusion_academica(postulacion)
        stage = SeguimientoEtapa.objects.select_for_update().get(
            postulacion=postulacion, etapa__codigo="CONCLUSION_ACADEMICA", numero_intento=1,
        )
        if stage.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE:
            stage = WorkflowService.iniciar_etapa(stage, usuario)
        if stage.estado != SeguimientoEtapa.EstadoChoices.APROBADA:
            stage = WorkflowService.aprobar_etapa(stage, usuario)
        WorkflowService._actualizar_estado_general(postulacion, "CONCLUIDA", usuario, "Examen de Grado por Contenidos concluido.", True)
        return stage

    @classmethod
    def calcular_resultado_final(cls, postulacion):
        areas = ExamenArea.objects.filter(postulacion=postulacion, estado=ExamenArea.Estado.APROBADA)
        values = {}
        for area in areas:
            evaluations = list(area.evaluaciones.filter(intento=area.intento_actual, modalidad_registro=ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL))
            consensus = area.evaluaciones.filter(intento=area.intento_actual, modalidad_registro=ExamenEvaluacion.ModalidadRegistro.CONSENSO).first()
            values[area.codigo] = consensus.nota if consensus else (sum((item.nota for item in evaluations), Decimal("0")) / Decimal("3") if len(evaluations) == 3 else None)
        complete = all(values.get(code) is not None for code, _name, _weight in AREA_DATA)
        weighted = sum((values[code] * weight / Decimal("100") for code, _name, weight in AREA_DATA if values.get(code) is not None), Decimal("0")) if complete else None
        return {"completo": complete, "nota_final": weighted.quantize(Decimal("0.01")) if weighted is not None else None, "clasificacion": cls._classification(weighted) if weighted is not None else None, "areas": {code: (str(values[code].quantize(Decimal("0.01"))) if values.get(code) is not None else None) for code, _name, _weight in AREA_DATA}}

    @staticmethod
    def _classification(note):
        if note <= 60: return "POSTERGADO"
        if note <= 74: return "APROBADO"
        if note <= 89: return "APROBACION_PLENA"
        return "APROBACION_PLENA_CON_FELICITACION"

    @staticmethod
    def _serialize_area(area):
        return {"id": area.id, "codigo": area.codigo, "nombre": area.nombre, "orden": area.orden, "ponderacion": str(area.ponderacion), "estado": area.estado, "intento_actual": area.intento_actual, "reintento_hasta": area.reintento_hasta, "evaluaciones": [{"id": item.id, "intento": item.intento, "nota": str(item.nota), "resultado": item.resultado, "modalidad_registro": item.modalidad_registro, "fecha_evaluacion": item.fecha_evaluacion, "evaluador": item.evaluador_id, "observaciones": item.observaciones} for item in area.evaluaciones.all()]}

    @staticmethod
    def _serialize_composition(composition):
        return {
            "completa": composition["completa"],
            "evaluable": composition["evaluable"],
            "faltantes": composition["faltantes"],
            "inconsistencias": composition["inconsistencias"],
            "presidente": ({"id": composition["presidente"].usuario_id, "nombre": str(composition["presidente"].usuario)} if composition["presidente"] else None),
            "secretario": ({"id": composition["secretario"].usuario_id, "nombre": str(composition["secretario"].usuario)} if composition["secretario"] else None),
        }
