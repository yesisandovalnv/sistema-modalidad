"""Normativa de Tesis de Grado CIS (Jornadas Académicas 2013).

Este módulo no traslada reglas de Proyecto de Grado. Solo representa los
artículos inequívocos del reglamento de Tesis y deja explícitas las materias
que requieren validación institucional.
"""
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.modalidades.policies import (
    BaseEvaluacionPolicy,
    BaseEventoPolicy,
    BaseModalidadPolicy,
    BaseRequisitosPolicy,
    EtapaDefinition,
)


STAGE_DATA = (
    ("INSCRIPCION", "Inscripción", False),
    ("TEMATICA_TESIS", "Temática de Tesis", False),
    ("PERFIL_TESIS", "Perfil de Tesis", True),
    ("DOCUMENTO_FINAL", "Documento Final", False),
    ("REVISION_TUTOR", "Revisión de Tutor", False),
    ("REVISION_TRIBUNAL", "Revisión de Tribunal", False),
    ("DEFENSA_PRIVADA", "Defensa Privada", True),
    ("DEFENSA_PUBLICA", "Defensa Pública", False),
)
ETAPAS = tuple(
    EtapaDefinition(
        codigo, nombre, orden, inicial=orden == 1,
        permite_reapertura=repetible,
        siguientes_permitidas=(STAGE_DATA[orden][0],) if orden < len(STAGE_DATA) else (),
    )
    for orden, (codigo, nombre, repetible) in enumerate(STAGE_DATA, start=1)
)


def usa_flujo_perfil(postulacion):
    from apps.postulantes.models import Postulacion

    return bool(
        postulacion
        and postulacion.modalidad.codigo == "TESIS_GRADO"
        and postulacion.regimen_workflow == Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2
    )


def etapa_tribunal_tesis(postulacion):
    return "PERFIL_TESIS" if usa_flujo_perfil(postulacion) else "TEMATICA_TESIS"


class TesisGradoEventoPolicy(BaseEventoPolicy):
    """Solo habilita la defensa cualitativa del perfil en este bloque."""

    PUBLIC_REQUIRED_ACTORS = {"TRIBUNAL": 3, "PRESIDENTE": 1, "SECRETARIO": 1}

    @classmethod
    def public_actor_requirements(cls, asignaciones):
        names = {"TRIBUNAL": "Tribunales", "PRESIDENTE": "Presidente", "SECRETARIO": "Secretario"}
        requirements = []
        for role, minimum in cls.PUBLIC_REQUIRED_ACTORS.items():
            actual = asignaciones.filter(tipo_participacion=role).count()
            complete = actual >= minimum
            requirements.append({
                "tipo": "ACTOR", "codigo": role, "nombre": names[role],
                "actual": actual, "minimo": minimum, "cumplido": complete,
                "estado": "CUMPLIDO" if complete else "PENDIENTE",
                "estado_display": "Cumplido" if complete else "Pendiente",
                "destino": "#actores",
            })
        return requirements

    EVENT_STAGE = {
        "DEFENSA_TEMATICA": "TEMATICA_TESIS",
        "DEFENSA_PERFIL": "PERFIL_TESIS",
        "DEFENSA_PRIVADA": "DEFENSA_PRIVADA",
        # La capacidad de evaluación se prepara en este bloque, pero el acto
        # sigue sin poder programarse hasta que se norme la acreditación de
        # correcciones de forma y su quórum definitivo.
        "DEFENSA_PUBLICA": "DEFENSA_PUBLICA",
    }

    DIRECT_RESULT_TYPES = {"DEFENSA_TEMATICA", "DEFENSA_PERFIL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"}


    def get_asignaciones_formales_defensa(self, *, postulacion, tipo_evento, seguimiento):
        """Return the current formal Tesis assignments applicable to this act."""
        from django.db.models import Q
        from apps.postulantes.models import AsignacionPostulacion

        base = AsignacionPostulacion.objects.filter(
            postulacion=postulacion, activo=True,
            usuario__is_active=True, usuario__activo=True,
        )
        tribunal_stage = etapa_tribunal_tesis(postulacion)
        tribunal_followup = postulacion.seguimientos_etapa.filter(
            activo=True, etapa__codigo=tribunal_stage,
        ).order_by("-numero_intento", "-pk").first()
        tribunal_q = (
            Q(tipo_participacion="TRIBUNAL", seguimiento_etapa=tribunal_followup)
            if tribunal_followup else Q(pk__in=[])
        )
        if tipo_evento == "DEFENSA_TEMATICA":
            return base.filter(tribunal_q)
        if tipo_evento == "DEFENSA_PERFIL":
            return base.filter(
                tribunal_q | (
                    Q(tipo_participacion="TUTOR")
                    & (Q(seguimiento_etapa__isnull=True) | Q(seguimiento_etapa=seguimiento))
                ),
            )
        if tipo_evento == "DEFENSA_PRIVADA":
            return base.filter(
                tribunal_q | (
                    Q(tipo_participacion="DOCENTE_MODALIDAD")
                    & (Q(seguimiento_etapa__isnull=True) | Q(seguimiento_etapa=seguimiento))
                ),
            )
        if tipo_evento == "DEFENSA_PUBLICA":
            return base.filter(
                tribunal_q | (
                    Q(tipo_participacion__in=("PRESIDENTE", "SECRETARIO"))
                    & (Q(seguimiento_etapa__isnull=True) | Q(seguimiento_etapa=seguimiento))
                ),
            )
        return base.none()

    def evaluar_composicion_formal(self, *, tipo_evento, asignaciones):
        rows = list(asignaciones)
        roles = {"DEFENSA_TEMATICA": {"TRIBUNAL": 3},
                 "DEFENSA_PERFIL": {"TRIBUNAL": 3, "TUTOR": 1},
                 "DEFENSA_PRIVADA": {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1},
                 "DEFENSA_PUBLICA": dict(self.PUBLIC_REQUIRED_ACTORS)}.get(tipo_evento, {})
        users_by_role = {role: {a.usuario_id for a in rows if a.tipo_participacion == role} for role in roles}
        assignments_by_user = {}
        for assignment in rows:
            if assignment.tipo_participacion not in roles:
                continue
            assignments_by_user.setdefault(assignment.usuario_id, []).append(assignment)
        conflicts = []
        conflict_details = []
        conflicting_roles = set()
        for user_id, assignments_for_user in assignments_by_user.items():
            if len(assignments_for_user) < 2:
                continue
            assigned_roles = [item.tipo_participacion for item in assignments_for_user]
            conflicts.append(sorted(set(assigned_roles)))
            conflicting_roles.update(assigned_roles)
            conflict_details.append({
                "usuario_id": user_id,
                "cargos": [
                    f"{item.get_tipo_participacion_display()} {item.orden_cargo}"
                    if item.orden_cargo else item.get_tipo_participacion_display()
                    for item in sorted(assignments_for_user, key=lambda row: (row.tipo_participacion, row.orden_cargo or 0, row.pk))
                ],
            })
        requirements = {role: {
            "actual": len(users_by_role[role]), "minimo": minimum,
            "cumplido": len(users_by_role[role]) >= minimum,
            "conflicto_identidad": role in conflicting_roles,
        } for role, minimum in roles.items()}
        return {"cumple": all(item["cumplido"] and not item["conflicto_identidad"] for item in requirements.values()),
                "requisitos": requirements, "conflictos": conflicts,
                "conflictos_detalle": conflict_details}

    def validar_resultado_directo(self, *, evento, tipo, resultado, nota, semantica_nota):
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            TesisGradoPolicy.validar_gate_publica(evento.postulacion)
        if evento.tipo_evento in {"DEFENSA_TEMATICA", "DEFENSA_PERFIL", "DEFENSA_PRIVADA"} and not resultado:
            raise ValidationError({"resultado": "La defensa requiere resultado cualitativo."})
        if evento.tipo_evento == "DEFENSA_PUBLICA" and resultado:
            raise ValidationError({"resultado": "La Defensa Pública de Tesis se registra mediante nota numérica."})
        from apps.modalidades.policies import ModalidadPolicyRegistry
        evaluation_policy = ModalidadPolicyRegistry.get(evento.postulacion).evaluacion_policy
        if tipo in {"PRIVADA", "PUBLICA"}:
            semantic = semantica_nota or evaluation_policy.get_semantica_nota(evento=evento, tipo=tipo)
            if not evaluation_policy.admite_semantica_entrada(evento=evento, tipo=tipo, semantica=semantic):
                raise ValidationError({"semantica_nota": "La semántica de nota no está habilitada para esta defensa de Tesis."})
            if nota is None:
                raise ValidationError({"nota": "La defensa requiere una nota numérica."})


    def get_tipos_evento(self):
        return tuple(self.EVENT_STAGE)

    def get_etapa_asociada(self, tipo_evento):
        return self.EVENT_STAGE.get(tipo_evento)

    def validar_correspondencia_evento_etapa(self, evento):
        if self.get_etapa_asociada(evento.tipo_evento) != evento.seguimiento_etapa.etapa.codigo:
            raise ValidationError("El tipo de evento no corresponde a la etapa de Tesis.")

    def validar_programacion(self, *, tipo_evento, seguimiento, fecha_programada=None, **kwargs):
        if tipo_evento not in self.EVENT_STAGE:
            raise ValidationError("Tipo de evento aún no implementado para Tesis de Grado.")
        if seguimiento.etapa.codigo != self.EVENT_STAGE[tipo_evento]:
            raise ValidationError("La etapa no corresponde a la defensa de perfil de Tesis.")
        if tipo_evento == "DEFENSA_PUBLICA":
            TesisGradoPolicy.validar_gate_publica(seguimiento.postulacion)
            asignaciones = kwargs.get("asignaciones")
            missing = [item for item in self.public_actor_requirements(asignaciones) if not item["cumplido"]]
            if missing:
                detail = ", ".join(f'{item["nombre"]}: {item["actual"]} de {item["minimo"]}' for item in missing)
                raise ValidationError({"asignaciones": f"Completa las asignaciones de Defensa Pública de Tesis: {detail}."})
            return
        from apps.postulantes.models import AsignacionPostulacion
        tribunal_stage = etapa_tribunal_tesis(seguimiento.postulacion)
        tribunales = AsignacionPostulacion.objects.filter(
            postulacion=seguimiento.postulacion, tipo_participacion="TRIBUNAL", activo=True,
            seguimiento_etapa__etapa__codigo=tribunal_stage,
        )
        if tribunales.count() != 3:
            raise ValidationError("La defensa de Tesis requiere los tres tribunales designados para la temática.")
        if tipo_evento == "DEFENSA_PERFIL":
            if not AsignacionPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_participacion="TUTOR", activo=True).exists():
                raise ValidationError("La defensa de perfil requiere Tutor activo.")
        if tipo_evento == "DEFENSA_PRIVADA":
            from apps.postulantes.models import EventoDefensa
            if tribunales.count() < 2:
                raise ValidationError("La Defensa Privada de Tesis requiere al menos dos tribunales activos.")
            if not AsignacionPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_participacion="DOCENTE_MODALIDAD", activo=True).exists():
                raise ValidationError("La Defensa Privada de Tesis requiere Docente de Modalidad activo como Secretario.")
            anterior = EventoDefensa.objects.filter(postulacion=seguimiento.postulacion, tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", numero_intento__lt=seguimiento.numero_intento, activo=True).order_by("-numero_intento").first()
            if anterior and fecha_programada > anterior.fecha_fin_real + timedelta(weeks=2):
                raise ValidationError("La nueva Defensa Privada debe programarse dentro de las dos semanas posteriores al intento insuficiente.")

    def validar_participante(self, *, evento, asignacion, rol_evento, **kwargs):
        if evento.tipo_evento == "DEFENSA_TEMATICA":
            raise ValidationError("La Defensa de Temática usa composición formal y no admite participantes manuales.")
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            if rol_evento not in {"TRIBUNAL", "PRESIDENTE", "SECRETARIO"}:
                raise ValidationError("La Defensa Pública de Tesis solo admite Tribunal, Presidente y Secretario.")
            return
        if evento.tipo_evento != "DEFENSA_PRIVADA":
            return
        if rol_evento == "TRIBUNAL":
            tribunal_stage = etapa_tribunal_tesis(evento.postulacion)
            if asignacion.tipo_participacion != "TRIBUNAL" or asignacion.seguimiento_etapa_id != evento.postulacion.seguimientos_etapa.filter(etapa__codigo=tribunal_stage).values_list("id", flat=True).first():
                raise ValidationError("Solo cuentan tribunales activos designados para la temática de esta Tesis.")
        elif rol_evento == "DOCENTE_MODALIDAD":
            if asignacion.tipo_participacion != "DOCENTE_MODALIDAD":
                raise ValidationError("El Secretario de la Defensa Privada debe ser Docente de Modalidad.")
        else:
            raise ValidationError("La Defensa Privada de Tesis no requiere Presidente ni otros participantes.")

    def requiere_vinculo_evento_documento(self, tipo_documento):
        return tipo_documento.codigo == "ACTA_DEFENSA"

    def validar_vinculo_documento(self, *, postulacion, tipo_documento, evento_defensa):
        if tipo_documento.codigo != "ACTA_DEFENSA":
            if evento_defensa is not None:
                raise ValidationError("Solo ACTA_DEFENSA puede vincularse a una defensa.")
            return
        if not evento_defensa or (evento_defensa.postulacion_id != postulacion.pk
                or evento_defensa.tipo_evento != "DEFENSA_PUBLICA"
                or evento_defensa.estado != "FINALIZADA" or not evento_defensa.activo):
            raise ValidationError("ACTA_DEFENSA de Tesis debe vincularse a una Defensa Pública activa y finalizada de la misma postulación.")

    def validar_inicio(self, evento):
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            TesisGradoPolicy.validar_gate_publica(evento.postulacion)

    def validar_finalizacion(self, evento):
        return None

    def validar_quorum(self, evento):
        presentes = evento.participantes.filter(activo=True, presente=True)
        if evento.tipo_evento == "DEFENSA_TEMATICA":
            return {"valido": True, "faltantes": {}, "detalle": {"quorum_tecnico_requerido": False}}
        if evento.tipo_evento == "DEFENSA_PRIVADA":
            tribunales = presentes.filter(rol_evento="TRIBUNAL").count()
            secretario = presentes.filter(rol_evento="DOCENTE_MODALIDAD").count()
            return {"valido": tribunales >= 2 and secretario >= 1, "faltantes": {"TRIBUNAL": max(0, 2-tribunales), "DOCENTE_MODALIDAD": max(0, 1-secretario)}, "detalle": {"TRIBUNAL": tribunales, "DOCENTE_MODALIDAD": secretario}}
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            counts = {
                "TRIBUNAL": presentes.filter(rol_evento="TRIBUNAL").values("asignacion__usuario_id").distinct().count(),
                "PRESIDENTE": presentes.filter(rol_evento="PRESIDENTE").values("asignacion__usuario_id").distinct().count(),
                "SECRETARIO": presentes.filter(rol_evento="SECRETARIO").values("asignacion__usuario_id").distinct().count(),
            }
            missing = {role: required - counts[role] for role, required in {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1}.items() if counts[role] < required}
            return {"valido": not missing, "faltantes": missing, "detalle": counts}
        # El reglamento exige tribunal designado, pero no fija quórum para perfil.
        return {"valido": True, "faltantes": {}, "detalle": {"pendiente_de_validacion_institucional": True}}


class TesisGradoEvaluacionPolicy(BaseEvaluacionPolicy):
    """Reglas de evaluación confirmadas para los actos de Tesis habilitados."""

    def get_tipos_evaluacion(self):
        return ("TEMATICA", "PERFIL", "PRIVADA", "PUBLICA")

    def get_configuracion_numerica(self, tipo):
        if tipo not in ("PRIVADA", "PUBLICA"):
            return None
        return {"minimo": 0 if tipo == "PRIVADA" else 1, "maximo": 100,
                "ponderacion": 30 if tipo == "PRIVADA" else 70, "semantica_nota": "BRUTA_100"}

    def admite_semantica_entrada(self, *, evento, tipo, semantica):
        return (tipo in ("PRIVADA", "PUBLICA") and semantica in ("BRUTA_100", "MODALIDAD_ESPECIFICA")) or super().admite_semantica_entrada(evento=evento, tipo=tipo, semantica=semantica)

    def get_modalidad_registro_por_defecto(self, *, evento, tipo):
        return "CONSENSO"

    def validar_solicitud_registro(self, *, modalidad_registro, evaluador, **kwargs):
        if modalidad_registro not in {"CONSENSO", "INDIVIDUAL"}:
            raise ValidationError("La modalidad de registro no es válida para Tesis.")
        if modalidad_registro == "CONSENSO" and evaluador is not None:
            raise ValidationError("El resultado consensuado no se atribuye a un evaluador individual.")
        if modalidad_registro == "INDIVIDUAL" and evaluador is None:
            raise ValidationError("La evaluación individual requiere evaluador.")
        if modalidad_registro == "INDIVIDUAL":
            evento = kwargs.get("evento")
            if (evaluador.evento_id != evento.pk or evaluador.rol_evento != "TRIBUNAL" or not evaluador.activo
                    or not evaluador.asignacion.activo or evaluador.asignacion.postulacion_id != evento.postulacion_id):
                raise ValidationError("La evaluación individual requiere un tribunal activo y válido del mismo evento.")

    def validar_registro(self, evaluacion):
        from apps.postulantes.models import EvaluacionDefensa, EventoDefensa
        expected = {
            EventoDefensa.Tipo.DEFENSA_TEMATICA: "TEMATICA",
            EventoDefensa.Tipo.DEFENSA_PERFIL: "PERFIL",
            EventoDefensa.Tipo.DEFENSA_PRIVADA: "PRIVADA",
            EventoDefensa.Tipo.DEFENSA_PUBLICA: "PUBLICA",
        }
        if evaluacion.tipo_evaluacion not in {"TEMATICA", "PERFIL", "PRIVADA", "PUBLICA", "RESULTADO_FINAL"} or expected.get(evaluacion.evento.tipo_evento) is None:
            raise ValidationError({"tipo_evaluacion": "Tesis solo habilita evaluación de temática o perfil en este bloque."})
        if evaluacion.tipo_evaluacion == "RESULTADO_FINAL":
            if not evaluacion.es_resultado_final_evento:
                raise ValidationError({"es_resultado_final_evento": "El dictamen consolidado debe provenir del perfil."})
            return
        if evaluacion.tipo_evaluacion != expected[evaluacion.evento.tipo_evento]:
            raise ValidationError({"tipo_evaluacion": "La evaluación no corresponde al acto académico."})
        if evaluacion.tipo_evaluacion != "PUBLICA" and evaluacion.resultado_cualitativo not in {
            EvaluacionDefensa.Resultado.SUFICIENTE,
            EvaluacionDefensa.Resultado.INSUFICIENTE,
        }:
            raise ValidationError({"resultado_cualitativo": "La evaluación de Tesis debe ser SUFICIENTE o INSUFICIENTE."})
        if evaluacion.tipo_evaluacion not in {"PRIVADA", "PUBLICA"} and any(value is not None for value in (evaluacion.nota_numerica, evaluacion.ponderacion, evaluacion.aporte_ponderado)):
            raise ValidationError({"nota_numerica": "Esta evaluación cualitativa no admite nota ni ponderación."})
        if evaluacion.semantica_nota == "BRUTA_100":
            config = self.get_configuracion_numerica(evaluacion.tipo_evaluacion)
            if not config or evaluacion.nota_numerica is None or not Decimal(str(config["minimo"])) <= evaluacion.nota_numerica <= Decimal("100"):
                raise ValidationError({"nota_numerica": "La nota bruta está fuera de la escala de esta defensa."})
            if evaluacion.ponderacion != Decimal(str(config["ponderacion"])) or evaluacion.aporte_ponderado != self.calcular_aporte(evaluacion.nota_numerica, config["ponderacion"]):
                raise ValidationError({"aporte_ponderado": "El aporte debe corresponder a la nota bruta y su ponderación."})
            return
        if evaluacion.tipo_evaluacion == "PRIVADA" and (evaluacion.nota_numerica is None or not Decimal("0") <= evaluacion.nota_numerica <= Decimal("30")):
            raise ValidationError({"nota_numerica": "La escala numérica provisional de la Defensa Privada es 0 a 30; la normativa no la define expresamente."})
        if evaluacion.tipo_evaluacion == "PUBLICA":
            if evaluacion.nota_numerica is None or not Decimal("1") <= evaluacion.nota_numerica <= Decimal("100"):
                raise ValidationError({"nota_numerica": "La Defensa Pública de Tesis admite notas de 1 a 100."})

    def get_valores_registro(self, *, evento, tipo, nota):
        if tipo == "PUBLICA":
            return {"ponderacion": Decimal("70.00"), "aporte_ponderado": (nota * Decimal("0.70")).quantize(Decimal("0.01"))}
        if tipo == "PRIVADA":
            return {"ponderacion": Decimal("30.00"), "aporte_ponderado": nota}
        return {"ponderacion": None, "aporte_ponderado": None}

    def obtener_evaluacion_para_consolidar(self, *, evaluaciones, **kwargs):
        consenso = evaluaciones.filter(modalidad_registro="CONSENSO")
        if consenso.exists():
            if consenso.count() != 1 or evaluaciones.count() != 1: raise ValidationError("La consolidación por consenso requiere una única evaluación.")
            return consenso.first()
        individuales = list(evaluaciones.filter(modalidad_registro="INDIVIDUAL").select_related("evaluador__asignacion"))
        if len(individuales) != 3: raise ValidationError("La consolidación individual requiere las tres evaluaciones del tribunal.")
        if len({item.semantica_nota for item in individuales}) != 1:
            raise ValidationError("No se pueden consolidar evaluaciones con escalas diferentes.")
        evaluadores = {item.evaluador_id for item in individuales}
        if len(evaluadores) != 3 or any(item.evaluador.rol_evento != "TRIBUNAL" or not item.evaluador.activo or not item.evaluador.asignacion.activo or item.nota_numerica is None for item in individuales): raise ValidationError("Las evaluaciones individuales no corresponden a tres tribunales válidos.")
        individuales[0]._tesis_promedio = sum(item.nota_numerica for item in individuales) / Decimal("3")
        return individuales[0]

    def construir_consolidado(self, evaluacion, usuario):
        from apps.postulantes.models import EvaluacionDefensa
        es_publica = evaluacion.tipo_evaluacion == "PUBLICA"
        promedio = getattr(evaluacion, "_tesis_promedio", None)
        nota = promedio if promedio is not None else evaluacion.nota_numerica
        if promedio is not None and evaluacion.semantica_nota == "BRUTA_100":
            from decimal import ROUND_HALF_UP
            nota = nota.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        valores = self.get_valores_para_semantica(evento=evaluacion.evento, tipo=evaluacion.tipo_evaluacion,
                                                  nota=nota, semantica=evaluacion.semantica_nota)
        return EvaluacionDefensa(
            evento=evaluacion.evento, tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO", resultado_cualitativo=evaluacion.resultado_cualitativo,
            nota_numerica=nota,
            ponderacion=Decimal("70.00") if es_publica else (Decimal("30.00") if evaluacion.tipo_evaluacion == "PRIVADA" else None),
            aporte_ponderado=valores["aporte_ponderado"],
            semantica_nota=evaluacion.semantica_nota,
            es_resultado_final_evento=True, registrado_por=usuario,
        )

    def obtener_aprobacion_por_consolidacion(self, *, evento, evaluacion, resultado_final, **kwargs):
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            if resultado_final["clasificacion"] != "POSTERGADO":
                return "Defensa Pública de Tesis aprobada por resultado final conforme a 51 puntos."
            return None
        if evaluacion.resultado_cualitativo == "SUFICIENTE":
            return "Resultado suficiente del acto académico de Tesis."
        return None

    def obtener_rechazo_por_consolidacion(self, *, evento, evaluacion, resultado_final, **kwargs):
        if evento.tipo_evento in {"DEFENSA_PERFIL", "DEFENSA_PRIVADA"} and evaluacion.resultado_cualitativo == "INSUFICIENTE":
            return "Perfil de Tesis insuficiente; se conserva el intento y se habilita un único reintento."
        if evento.tipo_evento == "DEFENSA_PUBLICA" and resultado_final["clasificacion"] == "POSTERGADO":
            return "Defensa Pública postergada: se conserva el intento y se habilita una segunda oportunidad."
        return None

    def clasificar_nota_final(self, nota):
        if nota <= Decimal("50"): return "POSTERGADO"
        if nota <= Decimal("74"): return "APROBADO"
        if nota <= Decimal("89"): return "APROBACION_PLENA"
        return "APROBACION_PLENA_CON_FELICITACION"

    def calcular_resultado_final(self, postulacion):
        from apps.postulantes.models import EvaluacionDefensa
        results = EvaluacionDefensa.objects.filter(evento__postulacion=postulacion, tipo_evaluacion="RESULTADO_FINAL", es_resultado_final_evento=True, activo=True)
        privada = results.filter(evento__tipo_evento="DEFENSA_PRIVADA").order_by("-created_at").first()
        publica = results.filter(evento__tipo_evento="DEFENSA_PUBLICA").order_by("-created_at").first()
        private_note = privada.nota_numerica if privada else None
        public_note = publica.nota_numerica if publica else None
        # Los históricos conservan su interpretación original. Los registros
        # BRUTA_100 ya contienen el aporte calculado y no se ponderan otra vez.
        private_contribution = privada.aporte_ponderado if privada and privada.semantica_nota == "BRUTA_100" else private_note
        public_contribution = (publica.aporte_ponderado if publica.semantica_nota == "BRUTA_100" else (public_note * Decimal("0.70")).quantize(Decimal("0.01"))) if publica and public_note is not None else None
        final = (private_contribution + public_contribution).quantize(Decimal("0.01")) if private_contribution is not None and public_contribution is not None else None
        classification = self.clasificar_nota_final(final) if final is not None else None
        return {"nota_privada": private_note, "nota_publica": public_note, "aporte_privada": private_contribution, "aporte_publica": public_contribution,
                "semantica_privada": privada.semantica_nota if privada else None, "semantica_publica": publica.semantica_nota if publica else None,
                "nota_final": final, "clasificacion": classification, "resultado": classification, "limitacion_normativa": "El artículo 42 contiene la referencia contradictoria a 61; se aplica 51 conforme a los artículos 37–41 y Reglamento General."}


class TesisGradoRequisitosPolicy(BaseRequisitosPolicy):
    INSCRIPCION_DOCUMENTS = (
        "CARTA_SOLICITUD",
        "MATRICULA_VIGENTE",
        "HISTORIAL_PRERREQ",
    )

    DOCUMENTS_BY_STAGE = {
        "INSCRIPCION": INSCRIPCION_DOCUMENTS,
        "TEMATICA_TESIS": (),
        "PERFIL_TESIS": ("PERFIL_TESIS", "INFORME_TUTOR_TESIS"),
        "DOCUMENTO_FINAL": ("DOCUMENTO_FINAL", "INFORME_TUTOR_TESIS"),
        "REVISION_TUTOR": ("DOCUMENTO_FINAL", "INFORME_TUTOR_TESIS"),
        "REVISION_TRIBUNAL": ("DOCUMENTO_FINAL", "INFORME_TRIB_TESIS"),
        "DEFENSA_PRIVADA": (),
        "DEFENSA_PUBLICA": ("ACTA_DEFENSA",),
    }

    def get_documentos_requeridos(self, fase=None):
        if fase is not None:
            return tuple(self.DOCUMENTS_BY_STAGE.get(fase, ()))
        return tuple(dict.fromkeys(codigo for documentos in self.DOCUMENTS_BY_STAGE.values() for codigo in documentos))


class TesisGradoPolicy(BaseModalidadPolicy):
    codigo = "TESIS_GRADO"
    etapas = ETAPAS
    evento_policy = TesisGradoEventoPolicy()
    evaluacion_policy = TesisGradoEvaluacionPolicy()
    requisitos_policy = TesisGradoRequisitosPolicy()

    def get_publicacion_memorandum_designacion(self, codigo_etapa):
        from apps.postulantes.models import Postulacion

        if codigo_etapa != "PERFIL_TESIS":
            return None
        return {
            "tipo_documento": "MEMORANDUM_DESIGNACION_PROYECTO",
            "titulo": "Memorándum oficial de designación",
            "publicacion_independiente": True,
            "regimen_workflow_requerido": Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2,
        }

    def get_codigos_etapas_workflow(self, postulacion):
        from apps.postulantes.tesis_grado_workflow import TesisGradoWorkflowOrchestrator

        return TesisGradoWorkflowOrchestrator.etapas_para(postulacion)

    def resolver_contexto_documental(self, postulacion):
        contexto = super().resolver_contexto_documental(postulacion)
        if contexto or (postulacion.estado_actual and postulacion.estado_actual.codigo == "CONCLUIDA"):
            return contexto
        publica_aprobada = postulacion.seguimientos_etapa.filter(
            activo=True,
            etapa__codigo="DEFENSA_PUBLICA",
            estado="APROBADA",
        ).order_by("-numero_intento").first()
        return publica_aprobada.etapa.codigo if publica_aprobada else None

    @staticmethod
    def _orientation_requirement(code, name, complete, destination=None, display=None):
        return {
            "tipo": "OPERATIVO", "codigo": code, "nombre": name,
            "cumplido": complete, "estado": "CUMPLIDO" if complete else "PENDIENTE",
            "estado_display": display or ("Cumplido" if complete else "Pendiente"),
            "destino": destination,
        }

    @staticmethod
    def _orientation_action(code, title, description, state, destination, label):
        return {
            "codigo": code, "titulo": title, "descripcion": description,
            "estado": state,
            "estado_display": {"DISPONIBLE": "Disponible", "PENDIENTE": "Pendiente"}.get(state, state),
            "destino": destination, "accion_label": label,
        }

    def _document_orientation(self, postulacion, codes):
        from apps.documentos.models import DocumentoPostulacion, VersionDocumento

        requirements = []
        for code in codes:
            document = DocumentoPostulacion.objects.filter(
                postulacion=postulacion, tipo_documento__codigo=code, activo=True,
            ).select_related("estado").first()
            current = document and VersionDocumento.objects.filter(
                documento=document, activo=True, es_version_actual=True,
            ).exists()
            complete = bool(document and document.estado.codigo == "APR" and not document.requiere_correccion and current)
            requirements.append(self._orientation_requirement(
                code, code.replace("_", " ").title(), complete, "#documentos",
                "Aprobado y vigente" if complete else "Pendiente de carga o aprobación",
            ))
        return requirements

    def _event_orientation(self, postulacion, seguimiento, event_type):
        from apps.postulantes.models import EventoDefensa

        destination = "#defensas"
        assignments = postulacion.asignaciones.filter(activo=True)
        if event_type == "DEFENSA_PUBLICA" and not EventoDefensa.objects.filter(
            postulacion=postulacion, seguimiento_etapa=seguimiento,
            tipo_evento=event_type, activo=True,
        ).exists():
            requirements = self.evento_policy.public_actor_requirements(assignments)
            try:
                self.validar_gate_publica(postulacion)
            except ValidationError as error:
                message = error.messages[0]
                # El gate conserva la autoridad sobre la habilitación académica/documental.
                destination = "#defensas" if error.error_list[0].code == "defensa_privada_pendiente" else "#documentos"
                return self._orientation_action(
                    "GESTIONAR_PRECONDICIONES", "Completar precondiciones de defensa",
                    message, "PENDIENTE", destination,
                    "Ir a defensas" if destination == "#defensas" else "Ir a documentos",
                ), requirements + [self._orientation_requirement(
                    "HABILITACION_PUBLICA", "Habilitación de Defensa Pública", False, destination,
                )]
            if any(not item["cumplido"] for item in requirements):
                action = self._orientation_action(
                    "GESTIONAR_PRECONDICIONES", "Actores de la postulación",
                    "Completa las asignaciones requeridas antes de programar la Defensa Pública",
                    "PENDIENTE", "#actores", "Completar autoridades",
                )
                action["requiere_permiso"] = "GESTIONAR_ASIGNACIONES"
                if not any(item["codigo"] in ("PRESIDENTE", "SECRETARIO") and not item["cumplido"] for item in requirements):
                    action["accion_label"] = "Ir a actores"
                return action, requirements
            return self._orientation_action(
                "PROGRAMAR_EVENTO", "Programar Defensa Pública",
                "Programa la defensa correspondiente a esta etapa.",
                "DISPONIBLE", destination, "Ir a programar defensa",
            ), requirements
        try:
            self.evento_policy.validar_programacion(
                tipo_evento=event_type, seguimiento=seguimiento,
                fecha_programada=timezone.now(), asignaciones=assignments,
            )
        except ValidationError as error:
            if not EventoDefensa.objects.filter(
                postulacion=postulacion, seguimiento_etapa=seguimiento,
                tipo_evento=event_type, activo=True,
            ).exists():
                return self._orientation_action(
                    "GESTIONAR_PRECONDICIONES", "Completar precondiciones de defensa",
                    str(error.messages[0] if hasattr(error, "messages") else error),
                    "PENDIENTE", "#actores", "Ir a precondiciones",
                ), [self._orientation_requirement("PRECONDICIONES_DEFENSA", "Precondiciones de defensa", False, "#actores")]
        event = EventoDefensa.objects.filter(
            postulacion=postulacion, seguimiento_etapa=seguimiento,
            tipo_evento=event_type, activo=True,
        ).order_by("-numero_intento").first()
        if event is None:
            return self._orientation_action(
                "PROGRAMAR_EVENTO", "Programar defensa",
                "Programa la defensa correspondiente a esta etapa.",
                "DISPONIBLE", destination, "Ir a programar defensa",
            ), []
        if event.estado == EventoDefensa.Estado.PROGRAMADA:
            return self._orientation_action(
                "GESTIONAR_DEFENSA", "Gestionar defensa",
                "La defensa está programada y debe gestionarse desde la sección de defensas.",
                "PENDIENTE", destination, "Ir a defensas",
            ), [self._orientation_requirement("DEFENSA_PROGRAMADA", "Defensa programada", True, destination, "Programada")]
        if event.estado == EventoDefensa.Estado.EN_CURSO:
            return self._orientation_action(
                "GESTIONAR_DEFENSA", "Gestionar defensa",
                "La defensa se encuentra en curso. Registra la asistencia y las acciones disponibles.",
                "PENDIENTE", destination, "Ir a defensas",
            ), [self._orientation_requirement("DEFENSA_EN_CURSO", "Defensa en curso", True, destination, "En curso")]
        if event.estado == EventoDefensa.Estado.FINALIZADA:
            evaluations = event.evaluaciones.filter(activo=True)
            if not evaluations.exists():
                return self._orientation_action(
                    "REGISTRAR_EVALUACION", "Registrar evaluación",
                    "La defensa finalizó y aún no tiene una evaluación registrada.",
                    "DISPONIBLE", destination, "Ir a registrar evaluación",
                ), [self._orientation_requirement("EVALUACION", "Evaluación de la defensa", False, destination)]
            if not evaluations.filter(es_resultado_final_evento=True).exists():
                return self._orientation_action(
                    "CONSOLIDAR_RESULTADO", "Consolidar resultado",
                    "La evaluación está registrada y requiere consolidación.",
                    "DISPONIBLE", destination, "Ir a consolidar resultado",
                ), [self._orientation_requirement("RESULTADO_CONSOLIDADO", "Resultado consolidado", False, destination)]
            consolidado = evaluations.filter(
                tipo_evaluacion="RESULTADO_FINAL",
                es_resultado_final_evento=True,
            ).first()
            if (
                event_type == "DEFENSA_TEMATICA"
                and consolidado
                and consolidado.resultado_cualitativo == "INSUFICIENTE"
            ):
                return self._orientation_action(
                    "RESOLUCION_ACADEMICA_PENDIENTE", "Resolución académica pendiente",
                    "La Temática obtuvo resultado INSUFICIENTE. La continuación requiere resolución académica conforme al Art. 44 del Reglamento de Tesis.",
                    "PENDIENTE", None, "Pendiente de resolución académica",
                ), [self._orientation_requirement(
                    "RESOLUCION_ACADEMICA", "Resolución académica conforme al Art. 44",
                    False, None, "Pendiente",
                )]
            return self._orientation_action(
                "APROBAR_ETAPA", "Aprobar etapa",
                "La defensa tiene un resultado consolidado. Revisa y aprueba la etapa.",
                "DISPONIBLE", "#resumen", "Ir a aprobar etapa",
            ), [self._orientation_requirement("RESULTADO_CONSOLIDADO", "Resultado consolidado", True, "#resumen")]
        return self._orientation_action(
            "GESTIONAR_DEFENSA", "Gestionar defensa",
            "Revisa el estado de la defensa y las acciones disponibles.",
            "PENDIENTE", destination, "Ir a defensas",
        ), [self._orientation_requirement("DEFENSA", "Estado de la defensa", False, destination)]

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if seguimiento is None:
            return None
        stage = seguimiento.etapa.codigo
        if seguimiento.estado == "PENDIENTE":
            action = self._orientation_action(
                "INICIAR_ETAPA", "Iniciar etapa", "La etapa está lista para iniciarse.",
                "DISPONIBLE", "#resumen", "Ir a iniciar etapa",
            )
            return {"operacion": "ORIENTAR_ETAPA", "mensaje": "Inicia la etapa para continuar el trámite.", "requisitos": [], "siguiente_accion": action, "conflictos_identidad": []}

        requirements = []
        if stage in {"INSCRIPCION", "DOCUMENTO_FINAL"}:
            codes = self.requisitos_policy.DOCUMENTS_BY_STAGE[stage]
            requirements = self._document_orientation(postulacion, codes)
            complete = all(item["cumplido"] for item in requirements)
            title = "Aprobar inscripción" if stage == "INSCRIPCION" else "Aprobar Documento Final"
            description = (
                "Los documentos de inscripción están completos y aprobados."
                if complete and stage == "INSCRIPCION" else
                "El Documento Final y el informe del Tutor están completos y aprobados."
                if complete else
                "Carga y completa la aprobación de los documentos pendientes."
            )
            action = self._orientation_action(
                "APROBAR_ETAPA" if complete else "COMPLETAR_DOCUMENTOS", title if complete else "Completar documentos",
                description, "DISPONIBLE" if complete else "PENDIENTE", "#documentos", "Ir a documentos",
            )
            message = "Completa los documentos requeridos para la etapa."
        elif stage == "TEMATICA_TESIS":
            tribunals = postulacion.asignaciones.filter(
                activo=True, tipo_participacion="TRIBUNAL", seguimiento_etapa=seguimiento,
            ).count()
            requirements = [self._orientation_requirement("TRIBUNALES", "Tribunales", tribunals == 3, "#actores", f"{tribunals}/3")]
            if tribunals < 3:
                action = self._orientation_action("GESTIONAR_ACTORES", "Completar tribunales", "Designa los tres tribunales requeridos para la temática.", "PENDIENTE", "#actores", "Ir a actores")
            else:
                action, event_requirements = self._event_orientation(postulacion, seguimiento, "DEFENSA_TEMATICA")
                requirements.extend(event_requirements)
            message = (
                action["descripcion"]
                if action["codigo"] == "RESOLUCION_ACADEMICA_PENDIENTE"
                else "Completa la composición del tribunal y la evaluación de la temática."
            )
        elif stage == "PERFIL_TESIS":
            tutor = postulacion.asignaciones.filter(activo=True, tipo_participacion="TUTOR").exists()
            requirements = []
            if usa_flujo_perfil(postulacion):
                tribunal_count = postulacion.asignaciones.filter(
                    activo=True, tipo_participacion="TRIBUNAL", seguimiento_etapa=seguimiento,
                ).count()
                requirements.append(self._orientation_requirement(
                    "TRIBUNALES", "Tribunales", tribunal_count == 3, "#actores", f"{tribunal_count}/3",
                ))
            requirements.append(self._orientation_requirement("TUTOR", "Tutor", tutor, "#actores"))
            requirements.extend(self._document_orientation(postulacion, self.requisitos_policy.DOCUMENTS_BY_STAGE[stage]))
            if all(item["cumplido"] for item in requirements):
                action, event_requirements = self._event_orientation(postulacion, seguimiento, "DEFENSA_PERFIL")
                requirements.extend(event_requirements)
            else:
                action = self._orientation_action("COMPLETAR_PERFIL", "Completar perfil de Tesis", "Completa los actores y documentos requeridos del perfil.", "PENDIENTE", "#actores", "Ir a actores")
            message = "Completa el tribunal, el tutor, los documentos y la defensa del perfil segun corresponda."
        elif stage in {"REVISION_TUTOR", "REVISION_TRIBUNAL"}:
            from apps.documentos.models import DocumentoPostulacion, VersionDocumento
            from apps.postulantes.models import DictamenRevisionDocumento

            review_type = "TUTOR" if stage == "REVISION_TUTOR" else "TRIBUNAL"
            title = "Registrar dictamen del Tutor" if review_type == "TUTOR" else "Registrar dictamen del Tribunal"
            description = (
                "Registra el dictamen del Tutor sobre la versión vigente del Documento Final."
                if review_type == "TUTOR" else
                "Registra el dictamen del Tribunal sobre la versión vigente del Documento Final."
            )
            destination = "#dictamen-tutor" if review_type == "TUTOR" else "#dictamen-tribunal"
            dictamen = DictamenRevisionDocumento.objects.filter(
                seguimiento_etapa=seguimiento, tipo_revision=review_type, activo=True,
            ).order_by("-fecha_registro").first()
            documento_final = DocumentoPostulacion.objects.filter(
                postulacion=postulacion, tipo_documento__codigo="DOCUMENTO_FINAL", activo=True,
            ).first()
            version_actual = documento_final and VersionDocumento.objects.filter(
                documento=documento_final, activo=True, es_version_actual=True,
            ).first()
            dictamen_actual = dictamen and version_actual and dictamen.version_documento_revisada_id == version_actual.pk
            if dictamen_actual and dictamen.resultado == "INSUFICIENTE":
                action = self._orientation_action(
                    "CORREGIR_DOCUMENTO_FINAL", "Corregir Documento Final y registrar nuevo dictamen",
                    "El dictamen vigente del Tribunal es insuficiente. Carga una nueva versión corregida del Documento Final y registra un nuevo dictamen del Tribunal sobre esa versión.",
                    "PENDIENTE", "#documentos", "Ir a documentos",
                )
                requirements = [self._orientation_requirement(
                    "DOCUMENTO_FINAL_CORRECCION", "Nueva versión corregida del Documento Final", False,
                    "#documentos", "Pendiente",
                )]
            elif dictamen_actual and dictamen.resultado == "SUFICIENTE":
                action = self._orientation_action(
                    "APROBAR_ETAPA", "Aprobar revisión",
                    "El dictamen está registrado sobre la versión vigente. Revisa y aprueba la etapa.",
                    "DISPONIBLE", "#resumen", "Ir a aprobar etapa",
                )
                requirements = [self._orientation_requirement(
                    "DICTAMEN", title, True, "#resumen", "Suficiente sobre la versión vigente",
                )]
            elif review_type == "TRIBUNAL" and VersionDocumento.objects.filter(
                documento__postulacion=postulacion,
                documento__tipo_documento__codigo="INFORME_TRIB_TESIS",
                documento__activo=True, activo=True, es_version_actual=True,
            ).count() != 1:
                # La evidencia debe ser inequívoca y vigente; su estado de revisión
                # no es una condición de registro del dictamen.
                action = self._orientation_action(
                    "COMPLETAR_DOCUMENTOS", "Cargar Informe del Tribunal de Tesis",
                    "Adjunta el Informe del Tribunal de Tesis requerido para registrar el dictamen correspondiente.",
                    "PENDIENTE", "#documentos", "Gestionar documentos",
                )
                requirements = [self._orientation_requirement(
                    "INFORME_TRIB_TESIS", "Informe del Tribunal de Tesis", False,
                    "#documentos", "Sin evidencia vigente inequívoca",
                )]
            else:
                action = self._orientation_action(
                    "REGISTRAR_DICTAMEN", "Registrar nuevo dictamen del Tribunal" if review_type == "TRIBUNAL" else title,
                    "Registra el dictamen del Tribunal sobre la versión vigente corregida del Documento Final." if review_type == "TRIBUNAL" else description,
                    "DISPONIBLE", destination, "Ir a registrar dictamen",
                )
                requirements = [self._orientation_requirement(
                    "DICTAMEN", title, False, destination, "Pendiente sobre la versión vigente",
                )]
            message = "Registra el dictamen correspondiente sobre la versión vigente del Documento Final."
        elif stage in {"DEFENSA_PRIVADA", "DEFENSA_PUBLICA"}:
            event_type = stage
            action, requirements = self._event_orientation(postulacion, seguimiento, event_type)
            message = f"Completa las precondiciones y gestiona la {stage.replace('_', ' ').title()}."
        else:
            return None
        orientation = {"operacion": "ORIENTAR_ETAPA", "mensaje": message, "requisitos": requirements, "siguiente_accion": action, "conflictos_identidad": []}
        if (
            action["codigo"] == "PROGRAMAR_EVENTO" and action["estado"] == "DISPONIBLE"
            and seguimiento.activo and seguimiento.postulacion_id == postulacion.pk
            and seguimiento.estado in {"EN_PROCESO", "OBSERVADA"}
        ):
            events = [
                event for event in self.evento_policy.get_tipos_evento()
                if self.evento_policy.get_etapa_asociada(event) == stage
            ]
            candidates = postulacion.seguimientos_etapa.filter(
                etapa=seguimiento.etapa, activo=True, estado__in=("EN_PROCESO", "OBSERVADA"),
            )
            if len(events) == 1 and list(candidates.values_list("pk", flat=True)) == [seguimiento.pk]:
                orientation["tipo_evento"] = events[0]
        return orientation

    def get_reglas_asignacion(self):
        return {"TEMATICA_TESIS": {"TRIBUNAL": 3}, "TUTOR": {"precondicion": "TEMATICA_TESIS_APROBADA"}}

    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        """Declara las posiciones gestionables de actores de Tesis."""
        profile_flow = usa_flujo_perfil(postulacion)
        tribunal_stage = etapa_tribunal_tesis(postulacion) if postulacion else "TEMATICA_TESIS"
        tribunal_key = "TRIBUNAL_PERFIL_TESIS" if profile_flow else "TRIBUNAL_TEMATICA_TESIS"
        tribunal_name = "Tribunal de Perfil de Tesis" if profile_flow else "Tribunal de Tematica de Tesis"
        tematica_aprobada = bool(
            postulacion
            and postulacion.seguimientos_etapa.filter(
                etapa__codigo="TEMATICA_TESIS",
                estado="APROBADA",
            ).exists()
        )
        tribunal_group = {
            "clave": tribunal_key,
            "tipo_participacion": "TRIBUNAL",
            "nombre": tribunal_name,
            "ambito": "ETAPA",
            "codigo_etapa": tribunal_stage,
            "minimo": 3,
            "maximo": 3,
            "ordenado": True,
            "ordenes_permitidos": [1, 2, 3],
            "obligatoriedad": True,
            "habilitada": True,
            "precondicion": None,
            "posiciones": [
                {"clave": f"{tribunal_key}_{order}", "orden_cargo": order, "nombre": f"Tribunal {order}"}
                for order in (1, 2, 3)
            ],
        }
        tutor_group = {
            "clave": "TUTOR_TESIS",
            "tipo_participacion": "TUTOR",
            "nombre": "Tutor de Tesis",
            "ambito": "POSTULACION",
            "minimo": 1,
            "maximo": 1,
            "ordenado": False,
            "ordenes_permitidos": [],
            "obligatoriedad": True,
            "habilitada": True,
            "precondicion": None if profile_flow else {
                "codigo": "TEMATICA_TESIS_APROBADA",
                "estado": "CUMPLIDA" if tematica_aprobada else "PENDIENTE",
                "enforcement": "ACTIVO",
            },
            "posiciones": [
                {"clave": "TUTOR_TESIS_1", "orden_cargo": None, "nombre": "Tutor de Tesis"},
            ],
        }
        if not profile_flow:
            tutor_group["bloqueo_precondicion_pendiente"] = {
                "codigo": "TEMATICA_TESIS_NO_APROBADA",
                "mensaje": "El Tutor solo puede designarse después de aprobar la temática de Tesis.",
            }
        grupos = [tribunal_group, tutor_group]
        if seguimiento and seguimiento.etapa.codigo == "DEFENSA_PRIVADA":
            grupos.append({
                "clave": "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS",
                "tipo_participacion": "DOCENTE_MODALIDAD",
                "nombre": "Docente de Modalidad",
                "ambito": "POSTULACION",
                "minimo": 1,
                "maximo": 1,
                "ordenado": False,
                "ordenes_permitidos": [],
                "obligatoriedad": True,
                "habilitada": True,
                "precondicion": None,
                "posiciones": [{
                    "clave": "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1",
                    "orden_cargo": None,
                    "nombre": "Docente de Modalidad",
                }],
            })
        return {
            "grupos": grupos,
            "regimen_workflow": postulacion.regimen_workflow if postulacion else None,
        }

    def validar_asignacion(self, *, queryset_contexto, postulacion, tipo_participacion,
                           seguimiento_etapa, orden_cargo, **kwargs):
        if (
            tipo_participacion == "TRIBUNAL" and seguimiento_etapa
            and seguimiento_etapa.etapa.codigo == etapa_tribunal_tesis(postulacion)
        ):
            if queryset_contexto.count() >= 3:
                raise ValidationError("Tesis requiere exactamente tres docentes afines en el tribunal; no se admite un cuarto tribunal.")
            if orden_cargo is not None and queryset_contexto.filter(orden_cargo=orden_cargo).exists():
                raise ValidationError("Ya existe un miembro del tribunal con ese orden de cargo.")
        if tipo_participacion == "TUTOR" and not usa_flujo_perfil(postulacion):
            from apps.postulantes.models import SeguimientoEtapa
            if not SeguimientoEtapa.objects.filter(
                postulacion=postulacion, etapa__codigo="TEMATICA_TESIS", estado="APROBADA",
            ).exists():
                raise ValidationError("El Tutor solo puede designarse después de aprobar la temática de Tesis.")

    def validar_nuevo_intento(self, *, etapa, ultimo_seguimiento, **kwargs):
        if etapa.codigo == "PERFIL_TESIS" and ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError(
                "No procede un tercer intento de perfil: la consecuencia sobre Metodología II requiere gestión académica externa."
            )
        if etapa.codigo == "DEFENSA_PUBLICA" and ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError("No procede un tercer intento de Defensa Pública de Tesis.")

    @classmethod
    def validar_gate_publica(cls, postulacion):
        """Gate común-documental para el paso Privada suficiente → Pública."""
        from apps.documentos.models import ConfirmacionCorreccionDocumento, DocumentoPostulacion, ObservacionDocumento, VersionDocumento
        from apps.postulantes.models import EventoDefensa

        private = EventoDefensa.objects.filter(postulacion=postulacion, tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", activo=True).order_by("-numero_intento").first()
        if not private or not private.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True).exists():
            raise ValidationError(
                "La Defensa Pública requiere una Defensa Privada finalizada con resultado SUFICIENTE.",
                code="defensa_privada_pendiente",
            )
        document = DocumentoPostulacion.objects.filter(postulacion=postulacion, tipo_documento__codigo="DOCUMENTO_FINAL", activo=True).first()
        if not document:
            raise ValidationError("La Defensa Pública requiere Documento Final vigente.")
        observations = ObservacionDocumento.objects.filter(version_documento__documento=document, activo=True)
        if not observations.exists():
            return
        pending = observations.filter(corregida=False)
        if pending.exists():
            raise ValidationError("La Defensa Pública permanece bloqueada: existen observaciones de forma pendientes.")
        for observation in observations:
            confirmations = ConfirmacionCorreccionDocumento.objects.filter(
                postulacion=postulacion, evento_origen=private,
                version_observada=observation.version_documento, activo=True,
            )
            if not confirmations.exists():
                raise ValidationError("La Defensa Pública permanece bloqueada: falta confirmación técnica trazable de la versión corregida.")
            if not confirmations.filter(version_corregida__documento=document, version_corregida__activo=True).exists():
                raise ValidationError("La confirmación de corrección no apunta al Documento Final de esta postulación.")

    def validar_confirmacion_correccion(self, *, confirmacion, **kwargs):
        from apps.postulantes.models import AsignacionPostulacion, EventoDefensa
        if confirmacion.postulacion.modalidad.codigo != self.codigo:
            raise ValidationError("La confirmación no corresponde a Tesis de Grado.")
        event = confirmacion.evento_origen
        if not event or event.tipo_evento != EventoDefensa.Tipo.DEFENSA_PRIVADA or event.estado != EventoDefensa.Estado.FINALIZADA:
            raise ValidationError("La confirmación de Tesis debe vincularse a una Defensa Privada finalizada.")
        if not event.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True).exists():
            raise ValidationError("Solo una Defensa Privada suficiente admite confirmación de correcciones de forma.")
        assignment = confirmacion.asignacion_confirmante
        if not assignment or not assignment.activo:
            raise ValidationError("La confirmación requiere registrar la asignación académica que respalda la decisión.")
        valid_tribunal = (
            assignment.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL
            and assignment.seguimiento_etapa
            and assignment.seguimiento_etapa.etapa.codigo == etapa_tribunal_tesis(confirmacion.postulacion)
        )
        if not valid_tribunal:
            raise ValidationError("La habilitación de Pública requiere decisión del Tribunal designado de Tesis; el Tutor no puede confirmarla individualmente.")

    def validar_conclusion_academica(self, postulacion):
        """Conclusi\u00f3n de Tesis sobre workflow y documentos comunes."""
        from apps.documentos.models import DocumentoPostulacion
        from apps.postulantes.models import EventoDefensa, SeguimientoEtapa

        public = postulacion.seguimientos_etapa.filter(
            etapa__codigo="DEFENSA_PUBLICA", activo=True,
        ).order_by("-numero_intento").first()
        if not public or public.estado != SeguimientoEtapa.EstadoChoices.APROBADA:
            raise ValidationError("La conclusi\u00f3n acad\u00e9mica requiere Defensa P\u00fablica aprobada.")
        resultado = self.evaluacion_policy.calcular_resultado_final(postulacion)
        if resultado["nota_final"] is None or resultado["clasificacion"] == "POSTERGADO":
            raise ValidationError("La conclusi\u00f3n acad\u00e9mica requiere nota final aprobatoria consolidada.")
        evento = EventoDefensa.objects.filter(
            postulacion=postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado=EventoDefensa.Estado.FINALIZADA,
            activo=True,
        ).order_by("-fecha_fin_real").first()
        acta = DocumentoPostulacion.objects.filter(
            postulacion=postulacion, tipo_documento__codigo="ACTA_DEFENSA",
            evento_defensa=evento, activo=True, estado__codigo="APR",
            requiere_correccion=False, versiones__activo=True,
            versiones__es_version_actual=True,
        ).exists()
        if not acta:
            raise ValidationError("La conclusi\u00f3n acad\u00e9mica requiere ACTA_DEFENSA vigente, aprobada y vinculada a la Defensa P\u00fablica.")

    def permite_observacion_post_aprobacion(self, documento):
        from apps.postulantes.models import EventoDefensa
        if documento.tipo_documento.codigo != "DOCUMENTO_FINAL":
            return False
        return EventoDefensa.objects.filter(
            postulacion=documento.postulacion, tipo_evento="DEFENSA_PRIVADA",
            estado=EventoDefensa.Estado.FINALIZADA, activo=True,
            evaluaciones__tipo_evaluacion="RESULTADO_FINAL",
            evaluaciones__resultado_cualitativo="SUFICIENTE", evaluaciones__activo=True,
        ).exists()

    def validar_inicio_etapa(self, seguimiento):
        if seguimiento.etapa.codigo == "DEFENSA_PUBLICA":
            self.validar_gate_publica(seguimiento.postulacion)

    def validar_aprobacion_etapa(self, seguimiento):
        if seguimiento.etapa.codigo == "INSCRIPCION":
            from apps.documentos.models import DocumentoPostulacion, VersionDocumento
            faltantes = []
            for codigo in self.requisitos_policy.get_documentos_requeridos("INSCRIPCION"):
                documento = DocumentoPostulacion.objects.filter(
                    postulacion=seguimiento.postulacion, tipo_documento__codigo=codigo, activo=True,
                ).select_related("estado").first()
                vigente = documento and VersionDocumento.objects.filter(
                    documento=documento, activo=True, es_version_actual=True,
                ).exists()
                if not (documento and documento.estado.codigo == "APR" and not documento.requiere_correccion and vigente):
                    faltantes.append(codigo)
            if faltantes:
                raise ValidationError({"faltantes": faltantes})
        if seguimiento.etapa.codigo == "TEMATICA_TESIS":
            from apps.postulantes.models import AsignacionPostulacion
            tribunales = AsignacionPostulacion.objects.filter(
                postulacion=seguimiento.postulacion,
                seguimiento_etapa=seguimiento,
                tipo_participacion="TRIBUNAL",
                activo=True,
            )
            if tribunales.count() != 3:
                raise ValidationError("La aprobación de temática exige tres docentes de tribunal designados.")
            evento = seguimiento.eventos_defensa.filter(tipo_evento="DEFENSA_TEMATICA", estado="FINALIZADA", activo=True).first()
            if not evento or not evento.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True).exists():
                raise ValidationError("La temática requiere defensa finalizada y evaluación suficiente consolidada.")
        if seguimiento.etapa.codigo == "PERFIL_TESIS":
            from apps.documentos.models import DocumentoPostulacion, VersionDocumento
            from apps.postulantes.models import AsignacionPostulacion
            if usa_flujo_perfil(seguimiento.postulacion):
                tribunales = AsignacionPostulacion.objects.filter(
                    postulacion=seguimiento.postulacion, seguimiento_etapa=seguimiento,
                    tipo_participacion="TRIBUNAL", activo=True,
                )
                if tribunales.count() != 3:
                    raise ValidationError("El perfil requiere los tres docentes designados para su tribunal.")
            if not AsignacionPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_participacion="TUTOR", activo=True).exists():
                raise ValidationError("El perfil requiere Tutor designado.")
            for codigo in ("PERFIL_TESIS", "INFORME_TUTOR_TESIS"):
                documento = DocumentoPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_documento__codigo=codigo, activo=True).select_related("estado").first()
                if not (documento and documento.estado.codigo == "APR" and VersionDocumento.objects.filter(documento=documento, activo=True, es_version_actual=True).exists()):
                    raise ValidationError(f"El perfil requiere {codigo} activo, aprobado y vigente.")
            evento = seguimiento.eventos_defensa.filter(tipo_evento="DEFENSA_PERFIL", estado="FINALIZADA", activo=True).first()
            if not evento or not evento.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True).exists():
                raise ValidationError("El perfil requiere defensa finalizada y resultado suficiente consolidado.")
        if seguimiento.etapa.codigo == "DOCUMENTO_FINAL":
            from apps.documentos.models import DocumentoPostulacion, VersionDocumento
            from apps.postulantes.models import SeguimientoEtapa
            if not SeguimientoEtapa.objects.filter(postulacion=seguimiento.postulacion, etapa__codigo="PERFIL_TESIS", estado="APROBADA").exists():
                raise ValidationError("El Documento Final requiere Perfil de Tesis aprobado.")
            documento = DocumentoPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_documento__codigo="DOCUMENTO_FINAL", activo=True).select_related("estado").first()
            informe = DocumentoPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_documento__codigo="INFORME_TUTOR_TESIS", activo=True).select_related("estado").first()
            for requerido, nombre in ((documento, "Documento Final"), (informe, "Informe del Tutor")):
                if not (requerido and requerido.estado.codigo == "APR" and not requerido.requiere_correccion and VersionDocumento.objects.filter(documento=requerido, activo=True, es_version_actual=True).exists()):
                    raise ValidationError(f"La etapa DOCUMENTO_FINAL requiere {nombre} activo, aprobado, sin correcciones y vigente.")
        if seguimiento.etapa.codigo in {"REVISION_TUTOR", "REVISION_TRIBUNAL"}:
            from apps.documentos.models import DocumentoPostulacion, VersionDocumento
            from apps.postulantes.models import DictamenRevisionDocumento
            tipo = "TUTOR" if seguimiento.etapa.codigo == "REVISION_TUTOR" else "TRIBUNAL"
            documento = DocumentoPostulacion.objects.filter(postulacion=seguimiento.postulacion, tipo_documento__codigo="DOCUMENTO_FINAL", activo=True).select_related("estado").first()
            version = documento and VersionDocumento.objects.filter(documento=documento, activo=True, es_version_actual=True).first()
            if not (documento and documento.estado.codigo == "APR" and not documento.requiere_correccion and version):
                raise ValidationError("Se requiere Documento Final activo, aprobado, sin correcciones y con versión vigente.")
            dictamen = DictamenRevisionDocumento.objects.filter(seguimiento_etapa=seguimiento, version_documento_revisada=version, tipo_revision=tipo, activo=True).first()
            if not dictamen or dictamen.resultado != "SUFICIENTE":
                raise ValidationError("La revisión requiere dictamen SUFICIENTE de la versión actual del Documento Final.")
        if seguimiento.etapa.codigo == "DEFENSA_PRIVADA":
            evento = seguimiento.eventos_defensa.filter(tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", activo=True).first()
            if not evento or not evento.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True).exists():
                raise ValidationError("La Defensa Privada requiere evento finalizado y resultado SUFICIENTE consolidado.")
        if seguimiento.etapa.codigo == "DEFENSA_PUBLICA":
            self.validar_gate_publica(seguimiento.postulacion)
            from apps.postulantes.models import EventoDefensa
            evento = seguimiento.eventos_defensa.filter(
                tipo_evento="DEFENSA_PUBLICA",
                estado=EventoDefensa.Estado.FINALIZADA,
                activo=True,
            ).first()
            consolidado = evento and evento.evaluaciones.filter(
                tipo_evaluacion="RESULTADO_FINAL",
                es_resultado_final_evento=True,
                activo=True,
            ).first()
            resultado_final = self.evaluacion_policy.calcular_resultado_final(seguimiento.postulacion)
            aprobacion = consolidado and self.evaluacion_policy.obtener_aprobacion_por_consolidacion(
                evento=evento,
                evaluacion=consolidado,
                resultado_final=resultado_final,
            )
            if not evento or not consolidado or resultado_final["nota_final"] is None or not aprobacion:
                raise ValidationError(
                    "La Defensa Pública requiere evento finalizado y resultado consolidado aprobatorio del intento actual."
                )

    def validar_dictamen_revision(self, *, seguimiento, tipo_revision, version_documento_revisada,
                                  evidencia_version, asignacion_emisora, resultado, **kwargs):
        from apps.postulantes.models import AsignacionPostulacion, SeguimientoEtapa
        expected = {"REVISION_TUTOR": "TUTOR", "REVISION_TRIBUNAL": "TRIBUNAL"}
        if expected.get(seguimiento.etapa.codigo) != tipo_revision:
            raise ValidationError("El tipo de dictamen no corresponde a la etapa de Tesis.")
        if seguimiento.estado not in {SeguimientoEtapa.EstadoChoices.EN_PROCESO, SeguimientoEtapa.EstadoChoices.OBSERVADA}:
            raise ValidationError("La etapa de revisión debe estar en proceso u observada.")
        if resultado not in {"SUFICIENTE", "INSUFICIENTE"}:
            raise ValidationError("El resultado debe ser SUFICIENTE o INSUFICIENTE.")
        if version_documento_revisada.documento.postulacion_id != seguimiento.postulacion_id or version_documento_revisada.documento.tipo_documento.codigo != "DOCUMENTO_FINAL":
            raise ValidationError("El dictamen debe revisar el Documento Final de la misma postulación.")
        if not version_documento_revisada.activo:
            raise ValidationError("La versión revisada debe estar activa.")
        if evidencia_version.documento.postulacion_id != seguimiento.postulacion_id:
            raise ValidationError("La evidencia debe pertenecer a la misma postulación.")
        evidence_type = "INFORME_TUTOR_TESIS" if tipo_revision == "TUTOR" else "INFORME_TRIB_TESIS"
        if evidencia_version.documento.tipo_documento.codigo != evidence_type:
            raise ValidationError(f"La evidencia debe corresponder a {evidence_type}.")
        if not evidencia_version.activo or not evidencia_version.es_version_actual:
            raise ValidationError("La evidencia debe ser una versión activa y vigente.")
        if tipo_revision == "TUTOR":
            if not asignacion_emisora or asignacion_emisora.tipo_participacion != AsignacionPostulacion.TipoParticipacionChoices.TUTOR or not asignacion_emisora.activo:
                raise ValidationError("El dictamen de Tutor requiere una asignación activa de Tutor.")
        elif asignacion_emisora is not None:
            raise ValidationError("El dictamen de Tribunal representa al tribunal y no usa un emisor individual.")
        if tipo_revision == "TRIBUNAL":
            tribunales = AsignacionPostulacion.objects.filter(
                postulacion=seguimiento.postulacion, tipo_participacion="TRIBUNAL", activo=True,
                seguimiento_etapa__etapa__codigo=etapa_tribunal_tesis(seguimiento.postulacion),
            )
            if tribunales.count() != 3:
                raise ValidationError("El dictamen de Tribunal requiere los tres tribunales válidos de Tesis.")
