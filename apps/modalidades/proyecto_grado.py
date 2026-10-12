from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.modalidades.policies import (BaseEvaluacionPolicy, BaseEventoPolicy,
    BaseModalidadPolicy, BaseRequisitosPolicy, BaseRevisionTribunalPreviaPolicy,
    ActorCargaDocumento, DecisionAcademicaDefinition, EtapaDefinition)


STAGE_DATA = (
    ("INSCRIPCION", "Inscripción"), ("PERFIL_PROYECTO", "Perfil de Proyecto"),
    ("DOCUMENTO_FINAL", "Documento Final"), ("REVISION_TRIBUNAL_PREVIA", "Revisión de Tribunal Previa"),
    ("DEFENSA_PRIVADA", "Defensa Privada"), ("DEFENSA_PUBLICA", "Defensa Pública"),
    ("REVISION_FINAL_POST_PUBLICA", "Revisión Final Post Pública"), ("CIERRE_DOCUMENTAL", "Cierre Documental"),
)
ETAPAS = tuple(EtapaDefinition(code, name, i + 1, inicial=i == 0, final=i == len(STAGE_DATA)-1,
    permite_reapertura=code == "CIERRE_DOCUMENTAL", siguientes_permitidas=(STAGE_DATA[i+1][0],) if i+1 < len(STAGE_DATA) else ())
    for i, (code, name) in enumerate(STAGE_DATA))


class ProyectoGradoEventoPolicy(BaseEventoPolicy):
    EVENT_STAGE = {"DEFENSA_PERFIL": "PERFIL_PROYECTO", "DEFENSA_PRIVADA": "DEFENSA_PRIVADA", "DEFENSA_PUBLICA": "DEFENSA_PUBLICA"}
    ASSIGNMENTS = {"DEFENSA_PERFIL": {"TRIBUNAL": 2}, "DEFENSA_PRIVADA": {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1}, "DEFENSA_PUBLICA": {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1}}
    ASSIGNMENT_NAMES = {"TRIBUNAL": "Tribunales"}
    MINIMUM_NOTICE_HOURS = {"DEFENSA_PUBLICA": 48}
    PUBLIC_ROLES = ("TRIBUNAL", "PRESIDENTE", "SECRETARIO")
    def get_tipos_evento(self): return tuple(self.EVENT_STAGE)
    def get_etapa_asociada(self, tipo_evento): return self.EVENT_STAGE.get(tipo_evento)
    def get_precondiciones_programacion(self, codigo_etapa):
        tipo_evento = next((tipo for tipo, etapa in self.EVENT_STAGE.items() if etapa == codigo_etapa), None)
        if not tipo_evento:
            return None
        return {
            "tipo_evento": tipo_evento,
            "asignaciones_minimas": dict(self.ASSIGNMENTS.get(tipo_evento, {})),
            "nombres_asignaciones": dict(self.ASSIGNMENT_NAMES),
            "anticipacion_minima_horas": self.MINIMUM_NOTICE_HOURS.get(tipo_evento),
        }
    def _asignaciones_composicion_publica(self, asignaciones, seguimiento):
        contexto_autoridades = Q(seguimiento_etapa__isnull=True)
        if seguimiento is not None:
            contexto_autoridades |= Q(seguimiento_etapa=seguimiento)
        return asignaciones.filter(
            Q(tipo_participacion="TRIBUNAL")
            | (Q(tipo_participacion__in=("PRESIDENTE", "SECRETARIO")) & contexto_autoridades)
        )
    def evaluar_requisitos_programacion(self, *, tipo_evento, seguimiento, asignaciones):
        if tipo_evento != "DEFENSA_PUBLICA":
            return super().evaluar_requisitos_programacion(
                tipo_evento=tipo_evento, seguimiento=seguimiento, asignaciones=asignaciones,
            )
        candidatas = self._asignaciones_composicion_publica(asignaciones, seguimiento)
        identidades = {rol: set(candidatas.filter(tipo_participacion=rol).values_list("usuario_id", flat=True)) for rol in self.PUBLIC_ROLES}
        roles_por_usuario = {}
        for rol, usuarios in identidades.items():
            for usuario_id in usuarios:
                roles_por_usuario.setdefault(usuario_id, set()).add(rol)
        conflictos = [
            {"usuario_id": usuario_id, "roles": sorted(roles)}
            for usuario_id, roles in roles_por_usuario.items() if len(roles) > 1
        ]
        roles_en_conflicto = {rol for conflicto in conflictos for rol in conflicto["roles"]}
        requisitos = {}
        for rol, minimo in self.ASSIGNMENTS[tipo_evento].items():
            actual = len(identidades[rol])
            conflicto = rol in roles_en_conflicto
            requisitos[rol] = {
                "actual": actual, "minimo": minimo,
                "cumplido": actual >= minimo and not conflicto,
                "conflicto_identidad": conflicto,
            }
        return {"cumple": all(item["cumplido"] for item in requisitos.values()), "requisitos": requisitos, "conflictos": conflictos}
    def validar_programacion(self, *, tipo_evento, seguimiento, fecha_programada, asignaciones, **kwargs):
        if tipo_evento not in self.EVENT_STAGE: raise ValidationError("Tipo de evento no soportado por Proyecto de Grado.")
        if seguimiento.etapa.codigo != self.EVENT_STAGE[tipo_evento]: raise ValidationError("La etapa no corresponde al tipo de evento.")
        evaluacion = self.evaluar_requisitos_programacion(tipo_evento=tipo_evento, seguimiento=seguimiento, asignaciones=asignaciones)
        if evaluacion["conflictos"]:
            raise ValidationError("La composición de la Defensa Pública contiene una persona con cargos incompatibles. Presidente, Secretario y tribunales deben ser personas distintas.")
        missing = {rol:item["minimo"]-item["actual"] for rol,item in evaluacion["requisitos"].items() if item["actual"] < item["minimo"]}
        if missing: raise ValidationError(f"No existen asignaciones mínimas activas: {missing}.")
        anticipacion = self.MINIMUM_NOTICE_HOURS.get(tipo_evento)
        if anticipacion and fecha_programada < timezone.now()+timedelta(hours=anticipacion): raise ValidationError(f"La defensa pública debe programarse con al menos {anticipacion} horas de anticipación (diagrama oficial).")
    def validar_quorum(self, evento):
        presentes = evento.participantes.filter(presente=True, activo=True)
        counts = {r: presentes.filter(rol_evento=r).values("asignacion__usuario_id").distinct().count() for r in ("TRIBUNAL","DOCENTE_MODALIDAD","PRESIDENTE","SECRETARIO")}
        req = self.ASSIGNMENTS[evento.tipo_evento]
        missing = {r:n-counts.get(r,0) for r,n in req.items() if counts.get(r,0)<n}
        conflictos = []
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            roles_por_usuario = {}
            for usuario_id, rol in presentes.filter(rol_evento__in=self.PUBLIC_ROLES).values_list("asignacion__usuario_id", "rol_evento"):
                roles_por_usuario.setdefault(usuario_id, set()).add(rol)
            conflictos = [
                {"usuario_id": usuario_id, "roles": sorted(roles)}
                for usuario_id, roles in roles_por_usuario.items() if len(roles) > 1
            ]
        return {"valido": not missing and not conflictos, "faltantes": missing, "detalle": counts, "conflictos_identidad": conflictos}

    def validar_asignacion_publica(self, *, queryset_activas, usuario_asignado, tipo_participacion, seguimiento_etapa):
        if tipo_participacion not in self.PUBLIC_ROLES:
            return
        etapa_publica = seguimiento_etapa is None or seguimiento_etapa.etapa.codigo == "DEFENSA_PUBLICA"
        if not etapa_publica:
            return
        candidatas = self._asignaciones_composicion_publica(queryset_activas, seguimiento_etapa)
        incompatibles = candidatas.filter(usuario=usuario_asignado).exclude(tipo_participacion=tipo_participacion)
        if incompatibles.exists():
            raise ValidationError("La persona ya tiene un cargo incompatible para la misma Defensa Pública. Presidente, Secretario y tribunales deben ser personas distintas.")
    def validar_vinculo_documento(self, *, postulacion, tipo_documento, evento_defensa):
        if tipo_documento.codigo == "OBSERVACIONES_DEFENSA_PERFIL":
            if not evento_defensa or evento_defensa.postulacion_id != postulacion.pk:
                raise ValidationError("La hoja de observaciones debe vincularse a una Defensa de Perfil de la misma postulación.")
            if evento_defensa.tipo_evento != "DEFENSA_PERFIL" or evento_defensa.estado != "FINALIZADA" or not evento_defensa.activo:
                raise ValidationError("La hoja de observaciones solo puede vincularse a una Defensa de Perfil finalizada y activa.")
            return
        if tipo_documento.codigo != "ACTA_DEFENSA":
            if evento_defensa is not None:
                raise ValidationError("Solo ACTA_DEFENSA puede vincularse a una defensa.")
            return
        if not evento_defensa:
            raise ValidationError("ACTA_DEFENSA debe vincularse a una Defensa Pública finalizada.")
        if (evento_defensa.postulacion_id != postulacion.pk or evento_defensa.tipo_evento != "DEFENSA_PUBLICA"
                or evento_defensa.estado != "FINALIZADA" or not evento_defensa.activo):
            raise ValidationError("ACTA_DEFENSA debe vincularse a una Defensa Pública activa y finalizada de la misma postulación.")
    def requiere_vinculo_evento_documento(self, tipo_documento): return tipo_documento.codigo in {"ACTA_DEFENSA", "OBSERVACIONES_DEFENSA_PERFIL"}
    def validar_correspondencia_evento_etapa(self, evento):
        if self.get_etapa_asociada(evento.tipo_evento) != evento.seguimiento_etapa.etapa.codigo:
            raise ValidationError("El tipo de evento no corresponde a la etapa.")
    def validar_reprogramacion(self, evento, nueva_fecha):
        anticipacion = self.MINIMUM_NOTICE_HOURS.get(evento.tipo_evento)
        if anticipacion and nueva_fecha < timezone.now() + timedelta(hours=anticipacion):
            raise ValidationError(f"La defensa pública requiere {anticipacion} horas de anticipación.")


class ProyectoGradoLegacyEvaluacionPolicy(BaseEvaluacionPolicy):
    def get_tipos_evaluacion(self): return ("PERFIL", "PRIVADA", "PUBLICA", "RESULTADO_FINAL")
    def clasificar_nota_final(self, nota_final):
        if nota_final <= 50: return "POSTERGADO"
        if nota_final <= 74: return "APROBADO"
        if nota_final <= 89: return "APROBACION_PLENA"
        return "APROBACION_PLENA_CON_FELICITACION"
    def validar_registro(self, evaluacion):
        from decimal import Decimal
        from apps.postulantes.models import EvaluacionDefensa, EventoDefensa
        cual = {EvaluacionDefensa.Resultado.SUFICIENTE, EvaluacionDefensa.Resultado.INSUFICIENTE}
        if evaluacion.tipo_evaluacion in ("PERFIL", "PRIVADA", "PUBLICA") and evaluacion.modalidad_registro != "CONSENSO":
            raise ValidationError({"modalidad_registro": "La evaluaci\u00f3n de Proyecto de Grado debe registrarse por consenso."})
        if evaluacion.tipo_evaluacion in ("PERFIL", "PRIVADA", "PUBLICA") and evaluacion.evaluador_id:
            raise ValidationError({"evaluador": "La evaluaci\u00f3n consensuada no se atribuye a un evaluador individual."})
        if evaluacion.tipo_evaluacion == "PERFIL" and (evaluacion.resultado_cualitativo not in cual or evaluacion.nota_numerica is not None or evaluacion.ponderacion is not None):
            raise ValidationError({"tipo_evaluacion": "El perfil es cualitativo y sin ponderaci\u00f3n."})
        if evaluacion.tipo_evaluacion == "PRIVADA":
            if evaluacion.resultado_cualitativo not in cual: raise ValidationError({"resultado_cualitativo": "La privada requiere SUFICIENTE o INSUFICIENTE."})
            if evaluacion.nota_numerica is None or not 0 <= evaluacion.nota_numerica <= 30: raise ValidationError({"nota_numerica": "La nota privada debe estar entre 0 y 30."})
            if evaluacion.ponderacion not in (None, Decimal("30.00")): raise ValidationError({"ponderacion": "La referencia normativa privada es 30 puntos."})
            if evaluacion.aporte_ponderado != evaluacion.nota_numerica: raise ValidationError({"aporte_ponderado": "El aporte privado debe coincidir con la nota privada."})
        if evaluacion.tipo_evaluacion == "PUBLICA":
            if evaluacion.nota_numerica is None or not 0 <= evaluacion.nota_numerica <= 70: raise ValidationError({"nota_numerica": "La nota p\u00fablica debe estar entre 0 y 70."})
            if evaluacion.aporte_ponderado != evaluacion.nota_numerica: raise ValidationError({"aporte_ponderado": "El aporte p\u00fablico debe coincidir con la nota p\u00fablica."})
        expected = {EventoDefensa.Tipo.DEFENSA_PERFIL: "PERFIL", EventoDefensa.Tipo.DEFENSA_PRIVADA: "PRIVADA", EventoDefensa.Tipo.DEFENSA_PUBLICA: "PUBLICA"}
        if evaluacion.tipo_evaluacion != "RESULTADO_FINAL" and expected.get(evaluacion.evento.tipo_evento) != evaluacion.tipo_evaluacion:
            raise ValidationError({"tipo_evaluacion": "La evaluaci\u00f3n no corresponde al tipo de evento."})
    def validar_solicitud_registro(self, *, modalidad_registro, evaluador, **kwargs):
        if modalidad_registro != "CONSENSO" or evaluador is not None:
            raise ValidationError("La evaluaci\u00f3n debe ser un consenso \u00fanico del Tribunal.")
    def get_modalidad_registro_por_defecto(self, *, evento, tipo): return "CONSENSO"
    def get_valores_registro(self, *, evento, tipo, nota):
        from decimal import Decimal, ROUND_HALF_UP
        ponderacion = Decimal("70.00") if tipo == "PUBLICA" else (Decimal("30.00") if tipo == "PRIVADA" else None)
        aporte = Decimal(nota).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if nota is not None else None
        return {"ponderacion": ponderacion, "aporte_ponderado": aporte}
    def obtener_evaluacion_para_consolidar(self, *, evento, evaluaciones):
        if evaluaciones.count() != 1:
            raise ValidationError("Debe existir una única evaluación consensuada para consolidar.")
        return evaluaciones.first()
    def obtener_aprobacion_por_consolidacion(self, *, evento, evaluacion, resultado_final):
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            if resultado_final["nota_final"] is not None and resultado_final["clasificacion"] != "POSTERGADO":
                return "Aprobada automáticamente por consolidación pública válida."
        elif evaluacion.resultado_cualitativo == "SUFICIENTE":
            return "Aprobada por evaluación de defensa."
        return None
    def construir_consolidado(self, evaluacion, usuario):
        from decimal import Decimal
        from apps.postulantes.models import EvaluacionDefensa
        data = {"evento": evaluacion.evento, "tipo_evaluacion": "RESULTADO_FINAL", "modalidad_registro": "CONSENSO", "semantica_nota": evaluacion.semantica_nota, "es_resultado_final_evento": True, "registrado_por": usuario}
        if evaluacion.tipo_evaluacion == "PUBLICA": data.update(nota_numerica=evaluacion.nota_numerica, ponderacion=Decimal("70.00"), aporte_ponderado=evaluacion.nota_numerica)
        elif evaluacion.tipo_evaluacion == "PRIVADA": data.update(resultado_cualitativo=evaluacion.resultado_cualitativo, nota_numerica=evaluacion.nota_numerica, ponderacion=Decimal("30.00"), aporte_ponderado=evaluacion.nota_numerica)
        else: data.update(resultado_cualitativo=evaluacion.resultado_cualitativo)
        return EvaluacionDefensa(**data)
    def calcular_resultado_final(self, postulacion):
        from decimal import Decimal
        from apps.postulantes.models import EvaluacionDefensa
        resultados = EvaluacionDefensa.objects.filter(evento__postulacion=postulacion, tipo_evaluacion="RESULTADO_FINAL", es_resultado_final_evento=True)
        privada = resultados.filter(evento__tipo_evento="DEFENSA_PRIVADA").order_by("-created_at").first()
        publica = resultados.filter(evento__tipo_evento="DEFENSA_PUBLICA").order_by("-created_at").first()
        privada_nota, publica_nota = (privada.nota_numerica if privada else None), (publica.nota_numerica if publica else None)
        nota = (privada_nota + publica_nota).quantize(Decimal("0.01")) if privada_nota is not None and publica_nota is not None else None
        clasificacion = None if nota is None else self.clasificar_nota_final(nota)
        return {"nota_privada": privada_nota, "nota_publica": publica_nota, "aporte_privada": privada_nota, "aporte_publica": publica_nota, "nota_final": nota, "clasificacion": clasificacion, "resultado": clasificacion, "limitacion_normativa": "" if nota is not None else "La nota final requiere resultados consolidados de defensa privada y p\u00fablica."}


class ProyectoGradoEvaluacionPolicy(ProyectoGradoLegacyEvaluacionPolicy):
    def get_semantica_nota(self, *, evento, tipo):
        from apps.postulantes.models import EvaluacionDefensa
        if tipo in ("PRIVADA", "PUBLICA"):
            return EvaluacionDefensa.SemanticaNota.BRUTA_100
        return EvaluacionDefensa.SemanticaNota.MODALIDAD_ESPECIFICA

    def get_valores_registro(self, *, evento, tipo, nota):
        from decimal import Decimal, ROUND_HALF_UP
        if tipo not in ("PRIVADA", "PUBLICA"):
            return {"ponderacion": None, "aporte_ponderado": None}
        ponderacion = Decimal("30.00") if tipo == "PRIVADA" else Decimal("70.00")
        if nota is None:
            return {"ponderacion": ponderacion, "aporte_ponderado": None}
        aporte = (Decimal(str(nota)) * ponderacion / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP,
        )
        return {"ponderacion": ponderacion, "aporte_ponderado": aporte}

    def validar_registro(self, evaluacion):
        from decimal import Decimal, ROUND_HALF_UP
        from apps.postulantes.models import EvaluacionDefensa, EventoDefensa
        if evaluacion.tipo_evaluacion not in ("PRIVADA", "PUBLICA"):
            return super().validar_registro(evaluacion)

        cual = {EvaluacionDefensa.Resultado.SUFICIENTE, EvaluacionDefensa.Resultado.INSUFICIENTE}
        if evaluacion.modalidad_registro != "CONSENSO":
            raise ValidationError({"modalidad_registro": "La evaluación de Proyecto de Grado debe registrarse por consenso."})
        if evaluacion.evaluador_id:
            raise ValidationError({"evaluador": "La evaluación consensuada no se atribuye a un evaluador individual."})
        if evaluacion.tipo_evaluacion == "PRIVADA" and evaluacion.resultado_cualitativo not in cual:
            raise ValidationError({"resultado_cualitativo": "La privada requiere SUFICIENTE o INSUFICIENTE."})
        expected = {
            EventoDefensa.Tipo.DEFENSA_PRIVADA: "PRIVADA",
            EventoDefensa.Tipo.DEFENSA_PUBLICA: "PUBLICA",
        }
        if expected.get(evaluacion.evento.tipo_evento) != evaluacion.tipo_evaluacion:
            raise ValidationError({"tipo_evaluacion": "La evaluación no corresponde al tipo de evento."})

        if evaluacion.semantica_nota == EvaluacionDefensa.SemanticaNota.LEGACY_PONDERADA:
            return super().validar_registro(evaluacion)
        if evaluacion.semantica_nota != EvaluacionDefensa.SemanticaNota.BRUTA_100:
            raise ValidationError({"semantica_nota": "La evaluación numérica de Proyecto de Grado debe declarar su semántica."})
        if evaluacion.nota_numerica is None or not Decimal("0") <= evaluacion.nota_numerica <= Decimal("100"):
            raise ValidationError({"nota_numerica": "La calificación bruta debe estar entre 0 y 100."})

        ponderacion = Decimal("30.00") if evaluacion.tipo_evaluacion == "PRIVADA" else Decimal("70.00")
        expected_aporte = (evaluacion.nota_numerica * ponderacion / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP,
        )
        if evaluacion.ponderacion != ponderacion:
            raise ValidationError({"ponderacion": "La ponderación no coincide con la defensa."})
        if evaluacion.aporte_ponderado != expected_aporte:
            raise ValidationError({"aporte_ponderado": "El aporte debe ser calculado por el dominio a partir de la nota bruta."})

    def construir_consolidado(self, evaluacion, usuario):
        consolidado = super().construir_consolidado(evaluacion, usuario)
        if evaluacion.semantica_nota == "BRUTA_100":
            consolidado.aporte_ponderado = evaluacion.aporte_ponderado
        return consolidado

    def calcular_resultado_final(self, postulacion):
        from decimal import Decimal, ROUND_HALF_UP
        from apps.postulantes.models import EvaluacionDefensa
        resultados = EvaluacionDefensa.objects.filter(
            evento__postulacion=postulacion,
            tipo_evaluacion="RESULTADO_FINAL",
            es_resultado_final_evento=True,
        )
        privada = resultados.filter(evento__tipo_evento="DEFENSA_PRIVADA").order_by("-created_at").first()
        publica = resultados.filter(evento__tipo_evento="DEFENSA_PUBLICA").order_by("-created_at").first()

        def get_contribution(evaluacion):
            if not evaluacion:
                return None
            if evaluacion.semantica_nota == EvaluacionDefensa.SemanticaNota.LEGACY_PONDERADA:
                return evaluacion.nota_numerica
            if evaluacion.semantica_nota == EvaluacionDefensa.SemanticaNota.BRUTA_100:
                return evaluacion.aporte_ponderado
            return None

        privada_nota = privada.nota_numerica if privada else None
        publica_nota = publica.nota_numerica if publica else None
        aporte_privada = get_contribution(privada)
        aporte_publica = get_contribution(publica)
        nota = (
            (aporte_privada + aporte_publica).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if aporte_privada is not None and aporte_publica is not None else None
        )
        clasificacion = None if nota is None else self.clasificar_nota_final(nota)
        return {
            "nota_privada": privada_nota,
            "nota_publica": publica_nota,
            "aporte_privada": aporte_privada,
            "aporte_publica": aporte_publica,
            "semantica_privada": privada.semantica_nota if privada else None,
            "semantica_publica": publica.semantica_nota if publica else None,
            "nota_final": nota,
            "clasificacion": clasificacion,
            "resultado": clasificacion,
            "limitacion_normativa": "" if nota is not None else "La nota final requiere resultados consolidados de defensa privada y pública.",
        }


class ProyectoGradoRevisionTribunalPreviaPolicy(BaseRevisionTribunalPreviaPolicy):
    ETAPA, DOCUMENTO_FINAL, TIPO_EVIDENCIA, ORDENES_TRIBUNAL = "REVISION_TRIBUNAL_PREVIA", "DOCUMENTO_FINAL", "INFORME_REVISION_TRIBUNAL_PREVIA", {1, 2, 3}
    def validar_seguimiento(self, seguimiento):
        if seguimiento.etapa.codigo != self.ETAPA: raise ValidationError("El seguimiento debe corresponder a REVISION_TRIBUNAL_PREVIA.")
    def validar_tribunales(self, seguimiento):
        from apps.postulantes.models import AsignacionPostulacion
        queryset = AsignacionPostulacion.objects.select_related("usuario").filter(postulacion=seguimiento.postulacion, tipo_participacion="TRIBUNAL", activo=True, usuario__is_active=True, usuario__activo=True)
        if transaction.get_connection().in_atomic_block:
            queryset = queryset.select_for_update()
        tribunales = list(queryset)
        if len(tribunales) != 3 or {x.orden_cargo for x in tribunales} != self.ORDENES_TRIBUNAL or len({x.usuario_id for x in tribunales}) != 3: raise ValidationError("REVISION_TRIBUNAL_PREVIA requiere tres tribunales activos distintos con \u00f3rdenes 1, 2 y 3.")
        return tribunales
    def get_documento_final_codigo(self): return self.DOCUMENTO_FINAL
    def get_tipo_evidencia_codigo(self): return self.TIPO_EVIDENCIA


class ProyectoGradoRequisitosPolicy(BaseRequisitosPolicy):
    INSCRIPTION_DOCUMENTS = (
        "CARTA_SOLICITUD_PROYECTO", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ",
    )
    INSCRIPTION_DELIVERIES = ("FOLDER_AMARILLO",)
    CONDITIONS = ("PLAN_ESTUDIOS", "ADMISION_COMPLETA", "SOLVENCIA_UNIVERSITARIA", "SOLVENCIA_BIBLIOTECA", "MATRICULA_VIGENTE", "PLAZO_MAXIMO")
    DELIVERIES = ("CD_RESPALDO", "EJEMPLARES_IMPRESOS", "TIMBRE_UNIVERSITARIO")
    DOCUMENTS = ("DOCUMENTO_FINAL", "ACTA_DEFENSA", "HOJA_APROBACION", "INFORME_FINAL_TUTOR")
    ACTORES_CARGA_POR_ETAPA = {
        "REVISION_TRIBUNAL_PREVIA": {
            "INFORME_REVISION_TRIBUNAL_PREVIA": (ActorCargaDocumento.ADMINISTRACION,),
        },
        "REVISION_FINAL_POST_PUBLICA": {
            "HOJA_APROBACION": (ActorCargaDocumento.ADMINISTRACION,),
        },
    }
    def get_condiciones_requeridas(self, fase=None):
        if fase == "INSCRIPCION":
            return ()
        return self.CONDITIONS
    def get_entregas_requeridas(self, fase=None):
        if fase == "INSCRIPCION":
            return self.INSCRIPTION_DELIVERIES
        return self.DELIVERIES
    def get_documentos_requeridos(self, fase=None):
        if fase == "INSCRIPCION":
            return self.INSCRIPTION_DOCUMENTS
        # Si se especifica etapa, retorna solo documentos aplicables en esa etapa
        if fase == "DOCUMENTO_FINAL":
            return ("DOCUMENTO_FINAL",)
        if fase == "REVISION_TRIBUNAL_PREVIA":
            return ("INFORME_REVISION_TRIBUNAL_PREVIA",)
        # Para compatibilidad, si no se especifica fase retorna todos los documentos requeridos
        # Otras etapas: no permiten carga de documentos
        return self.DOCUMENTS if fase is None else ()
    def get_actores_carga_permitidos(self, fase, codigo_documento):
        return self.ACTORES_CARGA_POR_ETAPA.get(fase, {}).get(codigo_documento)


class ProyectoGradoPolicy(BaseModalidadPolicy):
    codigo = "PROYECTO_GRADO"
    PROPUESTA_APROBADA = "PROPUESTA_APROBADA"
    RESULTADO_PROPUESTA_APROBADA = "APROBADA"
    etapas = ETAPAS
    evento_policy = ProyectoGradoEventoPolicy()
    evaluacion_policy = ProyectoGradoEvaluacionPolicy()
    requisitos_policy = ProyectoGradoRequisitosPolicy()

    def get_decisiones_academicas_permitidas(self, codigo_etapa):
        if codigo_etapa != "PERFIL_PROYECTO":
            return ()
        return (
            DecisionAcademicaDefinition(
                codigo=self.PROPUESTA_APROBADA,
                resultados=(self.RESULTADO_PROPUESTA_APROBADA,),
                nombre="Propuesta aprobada",
                roles_participantes=("TRIBUNAL",),
                participantes_minimos=3,
                participantes_maximos=3,
                ordenes_requeridos=(1, 2, 3),
                regimen_workflow_requerido="PG_HITOS_V1",
                validar_composicion_asignaciones=True,
            ),
        )

    @staticmethod
    def _seguimiento_perfil_activo(postulacion):
        return postulacion.seguimientos_etapa.filter(
            activo=True,
            etapa__codigo="PERFIL_PROYECTO",
        ).order_by("-numero_intento", "-pk").first()

    def _propuesta_aprobada(self, postulacion, seguimiento=None):
        if not postulacion or postulacion.regimen_workflow != "PG_HITOS_V1":
            return False
        if not seguimiento or seguimiento.etapa.codigo != "PERFIL_PROYECTO":
            seguimiento = self._seguimiento_perfil_activo(postulacion)
        if (
            not seguimiento
            or not seguimiento.activo
            or seguimiento.postulacion_id != postulacion.pk
            or seguimiento.etapa.codigo != "PERFIL_PROYECTO"
        ):
            return False
        from apps.postulantes.models import DecisionAcademicaEtapa

        definition = self.get_decisiones_academicas_permitidas("PERFIL_PROYECTO")[0]
        return DecisionAcademicaEtapa.objects.filter(
            seguimiento_etapa=seguimiento,
            codigo=definition.codigo,
            resultado=definition.resultados[0],
            activo=True,
        ).exists()

    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        """Fuente canónica del contrato formal de actores para Proyecto de Grado.

        El Tribunal de Perfil se define por composición formal (3 posiciones). En el régimen
        PG_HITOS_V1, la precondición del Tutor refleja exclusivamente una decisión académica
        activa del seguimiento de Perfil; los expedientes legacy preservan su comportamiento.
        """
        regimen_workflow = getattr(postulacion, "regimen_workflow", None)
        precondicion_tutor = None
        if regimen_workflow == "PG_HITOS_V1":
            perfil_aprobado = self._propuesta_aprobada(postulacion, seguimiento)
            precondicion_tutor = {
                "codigo": self.PROPUESTA_APROBADA,
                "nombre": "Propuesta aprobada",
                "requerido": True,
                "estado": "CUMPLIDA" if perfil_aprobado else "PENDIENTE",
                "enforcement": "ACTIVO",
                "mensaje": "El Tutor se designa después de aprobar la propuesta.",
            }
        restriccion_identidad_tribunal = (
            {"grupo": "TRIBUNAL_PERFIL", "unica_persona": True}
            if self.codigo == "PROYECTO_GRADO" else None
        )
        ocupacion_actor = (
            {
                "aplica": True,
                "ambito": "POSTULACION",
                "motivo": "YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION",
                "relevantes": [
                    "TUTOR", "TRIBUNAL", "DOCENTE_MODALIDAD", "PRESIDENTE", "SECRETARIO",
                    "DIRECTOR_INSTITUTO_INVESTIGACION", "VICERRECTOR_POSGRADO", "DECANO_FACULTAD",
                    "DIRECTOR_CARRERA", "SUPERVISOR_INSTITUCIONAL",
                ],
            }
            if self.codigo == "PROYECTO_GRADO" else None
        )

        return {
            "regimen_workflow": regimen_workflow,
            "grupos": [
                {
                    "clave": "TRIBUNAL_PERFIL",
                    "tipo_participacion": "TRIBUNAL",
                    "nombre": "Tribunal de Perfil",
                    "ambito": "ETAPA",
                    "codigo_etapa": "PERFIL_PROYECTO",
                    "minimo": 3,
                    "maximo": 3,
                    "ordenado": True,
                    "ordenes_permitidos": [1, 2, 3],
                    "restriccion_identidad": restriccion_identidad_tribunal,
                    "ocupacion_actor": ocupacion_actor,
                    "obligatoriedad": True,
                    "habilitada": True,
                    "precondicion": None,
                    "posiciones": [
                        {"clave": "TRIBUNAL_PERFIL_1", "orden_cargo": 1, "nombre": "Tribunal 1"},
                        {"clave": "TRIBUNAL_PERFIL_2", "orden_cargo": 2, "nombre": "Tribunal 2"},
                        {"clave": "TRIBUNAL_PERFIL_3", "orden_cargo": 3, "nombre": "Tribunal 3"},
                    ],
                },
                {
                    "clave": "TUTOR_PROYECTO",
                    "tipo_participacion": "TUTOR",
                    "nombre": "Tutor",
                    "ambito": "POSTULACION",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "ocupacion_actor": ocupacion_actor,
                    "obligatoriedad": True,
                    "habilitada": True,
                    "precondicion": precondicion_tutor,
                    "bloqueo_precondicion_pendiente": {
                        "codigo": "PROPUESTA_NO_APROBADA",
                        "mensaje": "El Tutor se designa después de aprobar la propuesta.",
                    },
                    "posiciones": [{"clave": "TUTOR_PROYECTO_1", "orden_cargo": None, "nombre": "Tutor"}],
                },
                *([{
                    "clave": "DOCENTE_MODALIDAD_DEFENSA_PRIVADA",
                    "tipo_participacion": "DOCENTE_MODALIDAD",
                    "nombre": "Docente de modalidad",
                    "ambito": "ETAPA",
                    "codigo_etapa": "DEFENSA_PRIVADA",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "ocupacion_actor": ocupacion_actor,
                    "obligatoriedad": True,
                    "habilitada": True,
                    "precondicion": None,
                    "posiciones": [{
                        "clave": "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1",
                        "orden_cargo": None,
                        "nombre": "Docente de modalidad",
                    }],
                }] if self.codigo == "PROYECTO_GRADO" else []),
            ]
        }

    def get_reglas_asignacion(self): return self.evento_policy.ASSIGNMENTS
    def get_documentos_aplicables_en_etapa(self, codigo_etapa: str) -> tuple:
        documentos = super().get_documentos_aplicables_en_etapa(codigo_etapa)
        if codigo_etapa == "DOCUMENTO_FINAL":
            return (*documentos, "OBSERVACIONES_DEFENSA_PERFIL")
        if codigo_etapa == "REVISION_FINAL_POST_PUBLICA":
            return (*documentos, "HOJA_APROBACION")
        if codigo_etapa == "CIERRE_DOCUMENTAL":
            return (*documentos, "ACTA_DEFENSA", "INFORME_FINAL_TUTOR")
        return documentos
    def get_revision_tribunal_previa_policy(self): return ProyectoGradoRevisionTribunalPreviaPolicy()
    def _evaluar_requisitos_inscripcion(self, postulacion):
        from apps.postulantes.models import EntregaFisica

        document_names = {
            "CARTA_SOLICITUD_PROYECTO": "Carta de solicitud",
            "MATRICULA_VIGENTE": "Matrícula vigente",
            "HISTORIAL_PRERREQ": "Historial académico de prerrequisitos",
        }
        requirements = []
        for code in self.requisitos_policy.get_documentos_requeridos("INSCRIPCION"):
            document = postulacion.documentos.filter(
                tipo_documento__codigo=code,
                activo=True,
            ).select_related("estado").first()
            current_version = document.versiones.filter(
                activo=True,
                es_version_actual=True,
            ).first() if document else None
            approved = bool(
                document
                and document.estado.codigo == "APR"
                and not document.requiere_correccion
                and current_version
            )
            if not document:
                status_display = "No presentado"
            elif document.requiere_correccion or document.estado.codigo in {"OBS", "REC"}:
                status_display = "Requiere corrección"
            elif document.estado.codigo != "APR":
                status_display = "Pendiente de revisión administrativa"
            elif not current_version:
                status_display = "Sin versión vigente"
            else:
                status_display = "Aprobado"
            requirements.append({
                "tipo": "DOCUMENTO",
                "codigo": code,
                "nombre": document_names[code],
                "cumplido": approved,
                "presentado": bool(document and current_version),
                "estado": "CUMPLIDO" if approved else "PENDIENTE",
                "estado_display": status_display,
                "destino": "#documentos",
            })

        delivery = postulacion.entregas_fisicas.filter(
            codigo=EntregaFisica.Tipo.FOLDER_AMARILLO,
            activo=True,
        ).first()
        delivery_complete = bool(delivery and delivery.estado == EntregaFisica.Estado.COMPLETA)
        requirements.append({
            "tipo": "ENTREGA_FISICA",
            "codigo": EntregaFisica.Tipo.FOLDER_AMARILLO,
            "nombre": "Fólder amarillo rotulado con nombre y modalidad",
            "cumplido": delivery_complete,
            "estado": "CUMPLIDO" if delivery_complete else "PENDIENTE",
            "estado_display": "Recepción registrada" if delivery_complete else "Pendiente de recepción",
            "destino": "#inscripcion-entregas",
        })
        return requirements

    def _orientar_inscripcion(self, postulacion):
        requirements = self._evaluar_requisitos_inscripcion(postulacion)
        completed = sum(item["cumplido"] for item in requirements)
        missing_documents = [
            item for item in requirements
            if item["tipo"] == "DOCUMENTO" and not item["presentado"]
        ]
        documents_needing_correction = [
            item for item in requirements
            if item["tipo"] == "DOCUMENTO" and item["estado_display"] == "Requiere corrección"
        ]
        pending_document_review = [
            item for item in requirements
            if item["tipo"] == "DOCUMENTO"
            and item["presentado"]
            and not item["cumplido"]
            and item not in documents_needing_correction
        ]
        folder_complete = requirements[-1]["cumplido"]

        if missing_documents or documents_needing_correction:
            action = {
                "codigo": "COMPLETAR_DOCUMENTOS",
                "titulo": "Completar documentos de Inscripción",
                "descripcion": "Presenta o corrige los documentos obligatorios de Inscripción.",
                "estado": "PENDIENTE",
                "estado_display": "Pendiente",
                "destino": "#documentos",
                "accion_label": "Ir a documentos",
            }
            message = f"{completed}/4 requisitos de Inscripción cumplidos. Completa los documentos pendientes."
        elif pending_document_review:
            action = {
                "codigo": "GESTIONAR_DOCUMENTOS",
                "titulo": "Revisión administrativa de documentos",
                "descripcion": "Los documentos presentados deben ser aprobados por personal administrativo.",
                "estado": "PENDIENTE",
                "estado_display": "Pendiente de revisión",
                "destino": "#documentos",
                "accion_label": "Revisar documentos",
            }
            message = f"{completed}/4 requisitos de Inscripción cumplidos. Los documentos están pendientes de revisión administrativa."
        elif not folder_complete:
            action = {
                "codigo": "GESTIONAR_ENTREGA_FISICA",
                "titulo": "Registrar recepción del fólder amarillo",
                "descripcion": "El personal administrativo debe registrar la recepción del fólder rotulado.",
                "estado": "PENDIENTE",
                "estado_display": "Pendiente",
                "destino": "#inscripcion-entregas",
                "accion_label": "Ir a recepción física",
            }
            message = f"{completed}/4 requisitos de Inscripción cumplidos. Falta registrar la recepción del fólder amarillo."
        else:
            action = {
                "codigo": "APROBAR_ETAPA",
                "titulo": "Aprobar Inscripción",
                "descripcion": "Los cuatro requisitos de Inscripción están aprobados y recibidos.",
                "estado": "DISPONIBLE",
                "estado_display": "Disponible",
                "destino": "#resumen",
                "accion_label": "Aprobar etapa",
            }
            message = "Los cuatro requisitos de Inscripción están cumplidos. La etapa puede aprobarse."

        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": message,
            "requisitos": requirements,
            "requisitos_cumplidos": completed,
            "requisitos_totales": len(requirements),
            "permite_aprobar_etapa": completed == len(requirements),
            "siguiente_accion": action,
            "conflictos_identidad": [],
        }

    def _documento_final_y_version_actual(self, seguimiento):
        from apps.documentos.models import DocumentoPostulacion, VersionDocumento

        documento = DocumentoPostulacion.objects.filter(
            postulacion=seguimiento.postulacion,
            tipo_documento__codigo=self.requisitos_policy.DOCUMENTS[0],
            activo=True,
        ).first()
        version_actual = VersionDocumento.objects.filter(
            documento=documento,
            es_version_actual=True,
            activo=True,
        ).first() if documento else None
        return documento, version_actual

    def _documento_final_aprobable(self, seguimiento):
        documento, version_actual = self._documento_final_y_version_actual(seguimiento)
        return bool(
            documento
            and documento.estado.codigo == "APR"
            and not documento.requiere_correccion
            and version_actual
        )

    def _orientar_revision_final_post_publica(self, postulacion, seguimiento):
        from apps.documentos.models import DocumentoPostulacion
        from apps.postulantes.cierre import ProyectoGradoCierrePolicy

        evaluacion = ProyectoGradoCierrePolicy.evaluar_revision_final(postulacion)
        hoja = DocumentoPostulacion.objects.filter(
            postulacion=postulacion,
            tipo_documento__codigo="HOJA_APROBACION",
            activo=True,
        ).select_related("estado").first()
        hoja_aprobada = "HOJA_APROBACION" in evaluacion["detalle"]["documentos_aprobados"]

        if hoja_aprobada:
            estado_hoja = "CUMPLIDO"
            estado_hoja_display = "Aprobada"
        elif not hoja:
            estado_hoja = "PENDIENTE"
            estado_hoja_display = "Pendiente de carga"
        elif hoja.requiere_correccion or hoja.estado.codigo in {"OBS", "REC"}:
            estado_hoja = "OBSERVADO"
            estado_hoja_display = "Observada; requiere corrección"
        else:
            estado_hoja = "PENDIENTE_REVISION"
            estado_hoja_display = "Cargada; pendiente de aprobación"

        requisitos = [{
            "tipo": "DOCUMENTO",
            "codigo": "HOJA_APROBACION",
            "nombre": "Hoja de Aprobación",
            "cumplido": hoja_aprobada,
            "estado": estado_hoja,
            "estado_display": estado_hoja_display,
            "destino": None if hoja_aprobada else "#documentos",
        }]
        nombres_faltantes = {
            "DEFENSA_PUBLICA_APROBADA": "Defensa Pública aprobada",
            "EVENTO_DEFENSA_PUBLICA_FINALIZADO": "Defensa Pública finalizada",
            "EVALUACION_PUBLICA_CONSOLIDADA_VALIDA": "Evaluación pública consolidada válida",
            "RESULTADO_FINAL_COMPLETO": "Resultado final completo",
            "RESULTADO_FINAL_APROBATORIO": "Resultado final aprobatorio",
            "CORRECCIONES_DOCUMENTALES_PENDIENTES": "Correcciones documentales resueltas",
            "DOCUMENTO:DOCUMENTO_FINAL": "Documento Final aprobado y vigente",
        }
        for codigo in evaluacion["faltantes"]:
            if codigo == "DOCUMENTO:HOJA_APROBACION":
                continue
            requisitos.append({
                "tipo": "DOCUMENTO" if codigo.startswith("DOCUMENTO:") or codigo == "CORRECCIONES_DOCUMENTALES_PENDIENTES" else "ACADEMICO",
                "codigo": codigo,
                "nombre": nombres_faltantes.get(codigo, codigo.replace("_", " ").title()),
                "cumplido": False,
                "estado": "PENDIENTE",
                "estado_display": "Pendiente",
                "destino": "#documentos" if codigo.startswith("DOCUMENTO:") or codigo == "CORRECCIONES_DOCUMENTALES_PENDIENTES" else "#defensas",
            })

        if evaluacion["cumple"]:
            mensaje = "La Hoja de Aprobación y los demás requisitos de la revisión final están cumplidos. La etapa está lista para aprobación administrativa."
            accion = {
                "codigo": "APROBAR_ETAPA",
                "titulo": "Aprobar Revisión Final Post Pública",
                "descripcion": "Todos los requisitos académicos y documentales fueron validados.",
                "estado": "DISPONIBLE",
                "estado_display": "Disponible",
                "destino": "#resumen",
                "accion_label": "Aprobar etapa",
            }
        elif not hoja:
            mensaje = "Carga la Hoja de Aprobación correspondiente a la Defensa Pública para continuar."
            accion = {
                "codigo": "CARGAR_HOJA_APROBACION",
                "titulo": "Cargar Hoja de Aprobación",
                "descripcion": "La Hoja de Aprobación debe ser cargada por el personal administrativo.",
                "estado": "PENDIENTE", "estado_display": "Pendiente",
                "destino": "#documentos", "accion_label": "Ir a documentos",
            }
        elif hoja.requiere_correccion or hoja.estado.codigo in {"OBS", "REC"}:
            mensaje = "La Hoja de Aprobación está observada y requiere una nueva versión antes de aprobar la etapa."
            accion = {
                "codigo": "CORREGIR_HOJA_APROBACION",
                "titulo": "Corregir Hoja de Aprobación",
                "descripcion": "Revisa las observaciones y carga una nueva versión desde Documentos.",
                "estado": "PENDIENTE", "estado_display": "Observada",
                "destino": "#documentos", "accion_label": "Ir a documentos",
            }
        elif not hoja_aprobada:
            mensaje = "La Hoja de Aprobación fue cargada y está pendiente de revisión administrativa."
            accion = {
                "codigo": "GESTIONAR_HOJA_APROBACION",
                "titulo": "Revisar Hoja de Aprobación",
                "descripcion": "Revisa el documento cargado y apruébalo o registra las observaciones correspondientes.",
                "estado": "PENDIENTE", "estado_display": "Pendiente de revisión",
                "destino": "#documentos", "accion_label": "Ir a documentos",
            }
        else:
            mensaje = "La Hoja de Aprobación está aprobada, pero aún existen otros requisitos pendientes para completar la revisión final."
            accion = {
                "codigo": "RESOLVER_REQUISITOS_REVISION_FINAL",
                "titulo": "Completar requisitos de la revisión final",
                "descripcion": "Revisa los requisitos pendientes indicados antes de aprobar la etapa.",
                "estado": "PENDIENTE", "estado_display": "Pendiente",
                "destino": requisitos[1]["destino"] if len(requisitos) > 1 else "#resumen",
                "accion_label": "Ir a gestionar",
            }

        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": mensaje,
            "requisitos": requisitos,
            "siguiente_accion": accion,
            "conflictos_identidad": [],
        }

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if not seguimiento:
            return None
        if seguimiento.etapa.codigo == "REVISION_FINAL_POST_PUBLICA":
            return self._orientar_revision_final_post_publica(postulacion, seguimiento)
        if seguimiento.etapa.codigo == "PERFIL_PROYECTO" and postulacion.regimen_workflow == "PG_HITOS_V1":
            tribunales = postulacion.asignaciones.filter(
                activo=True,
                tipo_participacion="TRIBUNAL",
                seguimiento_etapa=seguimiento,
                orden_cargo__in=(1, 2, 3),
            )
            ordenes = set(tribunales.values_list("orden_cargo", flat=True))
            if ordenes != {1, 2, 3}:
                return {
                    "operacion": "ORIENTAR_ETAPA",
                    "mensaje": "Completa la composición formal del Tribunal de Perfil.",
                    "requisitos": [{
                        "tipo": "ACTOR", "codigo": "TRIBUNAL_FORMAL", "nombre": "Tribunal de Perfil",
                        "actual": len(ordenes), "minimo": 3, "cumplido": False,
                        "estado": "PENDIENTE", "estado_display": f"{len(ordenes)}/3 pendiente", "destino": "#actores",
                    }],
                    "siguiente_accion": {
                        "codigo": "GESTIONAR_ACTORES", "titulo": "Completar Tribunal de Perfil",
                        "descripcion": "Asigna las posiciones formales pendientes.", "estado": "PENDIENTE",
                        "estado_display": "Pendiente", "destino": "#actores", "accion_label": "Gestionar actores",
                    },
                    "conflictos_identidad": [],
                }
            if not self._propuesta_aprobada(postulacion, seguimiento):
                return {
                    "operacion": "ORIENTAR_ETAPA",
                    "mensaje": "Registra la decisión académica de la propuesta.",
                    "requisitos": [{
                        "tipo": "DECISION_ACADEMICA", "codigo": self.PROPUESTA_APROBADA,
                        "nombre": "Propuesta aprobada", "cumplido": False,
                        "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#decisiones-academicas",
                    }],
                    "siguiente_accion": {
                        "codigo": "REGISTRAR_DECISION", "titulo": "Registrar decisión académica",
                        "descripcion": "Registra el resultado de la propuesta con la composición formal del tribunal.",
                        "estado": "PENDIENTE", "estado_display": "Pendiente",
                        "destino": "#decisiones-academicas", "accion_label": "Registrar decisión",
                    },
                    "conflictos_identidad": [],
                }
            tutor = postulacion.asignaciones.filter(
                activo=True, tipo_participacion="TUTOR", seguimiento_etapa__isnull=True,
            ).exists()
            if not tutor:
                return {
                    "operacion": "ORIENTAR_ETAPA",
                    "mensaje": "Asigna el Tutor después de la aprobación de la propuesta.",
                    "requisitos": [{
                        "tipo": "ACTOR", "codigo": "TUTOR", "nombre": "Tutor", "actual": 0,
                        "minimo": 1, "cumplido": False, "estado": "PENDIENTE",
                        "estado_display": "0/1 pendiente", "destino": "#actores",
                    }],
                    "siguiente_accion": {
                        "codigo": "GESTIONAR_ACTORES", "titulo": "Asignar Tutor",
                        "descripcion": "La propuesta está aprobada. Asigna el Tutor.", "estado": "PENDIENTE",
                        "estado_display": "Pendiente", "destino": "#actores", "accion_label": "Gestionar actores",
                    },
                    "conflictos_identidad": [],
                }
        if seguimiento.etapa.codigo == "INSCRIPCION":
            return self._orientar_inscripcion(postulacion)
        if seguimiento.etapa.codigo == "REVISION_TRIBUNAL_PREVIA":
            if not seguimiento.activo or seguimiento.estado not in {"EN_PROCESO", "OBSERVADA"}:
                return None
            documento, version_actual = self._documento_final_y_version_actual(seguimiento)
            if not documento or documento.estado.codigo != "APR" or documento.requiere_correccion or not version_actual:
                return None
            from apps.postulantes.models import InformeRevisionTribunalPrevia
            informe = InformeRevisionTribunalPrevia.objects.filter(
                seguimiento_etapa=seguimiento,
                version_documento_revisada=version_actual,
                activo=True,
            ).select_related("evidencia_version__documento__tipo_documento").first()
            if not informe:
                return None
            from apps.postulantes.revision_tribunal import RevisionTribunalPreviaService
            if not RevisionTribunalPreviaService.evidencia_requiere_actualizacion(seguimiento, informe):
                return None
            return {
                "operacion": "ORIENTAR_ETAPA",
                "mensaje": "El informe del tribunal utiliza una versión anterior de la evidencia. Actualiza el informe con la versión vigente.",
                "requisitos": [{
                    "tipo": "DOCUMENTO",
                    "codigo": "EVIDENCIA_INFORME_TRIBUNAL_VIGENTE",
                    "nombre": "Evidencia vigente vinculada al informe del tribunal",
                    "cumplido": False,
                    "estado": "REQUIERE_ACTUALIZACION",
                    "estado_display": "Requiere actualización",
                    "destino": "#informes-etapa",
                }],
                "siguiente_accion": {
                    "codigo": "ACTUALIZAR_INFORME_TRIBUNAL",
                    "titulo": "Actualizar informe del tribunal",
                    "descripcion": "Selecciona la versión vigente del Informe de Evaluación del Tribunal. El resultado académico existente se conservará.",
                    "estado": "PENDIENTE",
                    "estado_display": "Requiere actualización",
                    "destino": "#informes-etapa",
                    "accion_label": "Actualizar informe del tribunal",
                },
                "conflictos_identidad": [],
            }
        if seguimiento.etapa.codigo != "DOCUMENTO_FINAL":
            return None

        documento, version_actual = self._documento_final_y_version_actual(seguimiento)
        if not documento:
            action = {
                "codigo": "COMPLETAR_DOCUMENTOS",
                "titulo": "Cargar Documento Final",
                "descripcion": "Carga el Documento Final para que pueda ser revisado por la administración.",
                "estado": "PENDIENTE",
                "estado_display": "Pendiente",
                "destino": "#documentos",
                "accion_label": "Ir a documentos",
            }
            message = "Carga el Documento Final requerido para esta etapa."
        elif documento.requiere_correccion or documento.estado.codigo in {"OBS", "REC"} or (documento.estado.codigo == "APR" and not version_actual):
            action = {
                "codigo": "COMPLETAR_DOCUMENTOS",
                "titulo": "Corregir Documento Final",
                "descripcion": "Carga una nueva versión del Documento Final para continuar la revisión.",
                "estado": "PENDIENTE",
                "estado_display": "Pendiente",
                "destino": "#documentos",
                "accion_label": "Ir a documentos",
            }
            message = "El Documento Final requiere una corrección o una versión actual válida."
        elif documento.estado.codigo != "APR":
            action = {
                "codigo": "GESTIONAR_DOCUMENTOS",
                "titulo": "Documento Final pendiente de revisión",
                "descripcion": "La administración debe revisar y aprobar el Documento Final.",
                "estado": "PENDIENTE",
                "estado_display": "Pendiente",
                "destino": "#documentos",
                "accion_label": "Ir a documentos",
            }
            message = "El Documento Final fue enviado y está pendiente de revisión administrativa."
        else:
            action = {
                "codigo": "APROBAR_ETAPA",
                "titulo": "Aprobar Documento Final",
                "descripcion": "El Documento Final está aprobado y cumple las condiciones para aprobar esta etapa.",
                "estado": "DISPONIBLE",
                "estado_display": "Disponible",
                "destino": "#resumen",
                "accion_label": "Ir a aprobar etapa",
            }
            message = "El Documento Final está aprobado y la etapa está lista para aprobarse."
        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": message,
            "requisitos": [],
            "siguiente_accion": action,
            "conflictos_identidad": [],
        }
    def validar_asignacion(self, *, queryset_contexto, postulacion, tipo_participacion, seguimiento_etapa, orden_cargo, queryset_activas, usuario_asignado, **kwargs):
        self.evento_policy.validar_asignacion_publica(
            queryset_activas=queryset_activas, usuario_asignado=usuario_asignado,
            tipo_participacion=tipo_participacion, seguimiento_etapa=seguimiento_etapa,
        )
        if (
            tipo_participacion == "TUTOR"
            and postulacion.regimen_workflow == "PG_HITOS_V1"
            and not self._propuesta_aprobada(postulacion)
        ):
            raise ValidationError(
                "No se puede asignar Tutor antes de registrar PROPUESTA_APROBADA.",
                code="propuesta_no_aprobada",
            )
        if tipo_participacion == "TRIBUNAL" and seguimiento_etapa and seguimiento_etapa.etapa.codigo == "PERFIL_PROYECTO":
            if queryset_contexto.count() >= 3: raise ValidationError("Proyecto de Grado admite como m\u00e1ximo tres miembros activos de tribunal en el perfil.")
            if orden_cargo is not None and queryset_contexto.filter(orden_cargo=orden_cargo).exists(): raise ValidationError("Ya existe un miembro activo del tribunal con ese orden de cargo.")
    def validar_aprobacion_etapa(self, seguimiento):
        if seguimiento.etapa.codigo == "INSCRIPCION":
            requirements = self._evaluar_requisitos_inscripcion(seguimiento.postulacion)
            missing = [item["codigo"] for item in requirements if not item["cumplido"]]
            if missing:
                raise ValidationError({"faltantes": missing})
            return None
        if seguimiento.etapa.codigo == "PERFIL_PROYECTO":
            evento = seguimiento.eventos_defensa.filter(
                tipo_evento="DEFENSA_PERFIL",
                estado="FINALIZADA",
                activo=True,
                evaluaciones__tipo_evaluacion="RESULTADO_FINAL",
                evaluaciones__es_resultado_final_evento=True,
                evaluaciones__resultado_cualitativo="SUFICIENTE",
                evaluaciones__activo=True,
            ).first()
            if not evento:
                raise ValidationError(
                    "No se puede aprobar PERFIL_PROYECTO sin una Defensa de Perfil "
                    "finalizada y un resultado consolidado SUFICIENTE."
                )
            return None
        if seguimiento.etapa.codigo == "CIERRE_DOCUMENTAL":
            from apps.postulantes.cierre import ProyectoGradoCierrePolicy
            resultado = ProyectoGradoCierrePolicy.evaluar_cierre_documental(seguimiento.postulacion)
            if not resultado["cumple"]:
                raise ValidationError({"faltantes": resultado["faltantes"], "advertencias": resultado["advertencias"]})
            return None
        if seguimiento.etapa.codigo == "REVISION_FINAL_POST_PUBLICA":
            from apps.postulantes.cierre import ProyectoGradoCierrePolicy

            resultado = ProyectoGradoCierrePolicy.evaluar_revision_final(
                seguimiento.postulacion,
            )
            if not resultado["cumple"]:
                raise ValidationError(
                    {"faltantes": resultado["faltantes"], "advertencias": resultado["advertencias"]}
                )
            return None
        if seguimiento.etapa.codigo == "DEFENSA_PUBLICA":
            from apps.postulantes.defensas import EvaluacionDefensaService
            from apps.postulantes.models import EvaluacionDefensa

            evento = seguimiento.eventos_defensa.filter(
                tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", activo=True,
            ).order_by("-fecha_fin_real", "-pk").first()
            if not evento:
                raise ValidationError(
                    "No se puede aprobar DEFENSA_PUBLICA sin un evento público finalizado."
                )
            consolidada = evento.evaluaciones.filter(
                tipo_evaluacion="RESULTADO_FINAL",
                es_resultado_final_evento=True,
                nota_numerica__isnull=False,
                activo=True,
            ).exists()
            if not consolidada:
                raise ValidationError(
                    "No se puede aprobar DEFENSA_PUBLICA sin un resultado público consolidado válido."
                )
            resultado = EvaluacionDefensaService.calcular_resultado_final(
                seguimiento.postulacion, None, auditar=False,
            )
            if resultado["nota_final"] is None or resultado["clasificacion"] == EvaluacionDefensa.Resultado.POSTERGADO:
                raise ValidationError(
                    "No se puede aprobar DEFENSA_PUBLICA sin un resultado final completo y aprobatorio."
                )
            return None
        if seguimiento.etapa.codigo == "REVISION_TRIBUNAL_PREVIA":
            from apps.postulantes.revision_tribunal import RevisionTribunalPreviaService

            RevisionTribunalPreviaService.validar_aprobacion(seguimiento)
            return None
        if seguimiento.etapa.codigo != "DOCUMENTO_FINAL":
            return None

        if not self._documento_final_aprobable(seguimiento):
            raise ValidationError(
                "No se puede aprobar la etapa DOCUMENTO_FINAL: se requiere un Documento Final activo, "
                "aprobado, sin correcciones pendientes y con una versión actual activa."
            )
        return None

    def get_cierre_policy(self):
        from apps.postulantes.cierre import ProyectoGradoCierrePolicy
        return ProyectoGradoCierrePolicy
