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


class TesisGradoEventoPolicy(BaseEventoPolicy):
    """Solo habilita la defensa cualitativa del perfil en este bloque."""

    EVENT_STAGE = {
        "DEFENSA_TEMATICA": "TEMATICA_TESIS",
        "DEFENSA_PERFIL": "PERFIL_TESIS",
        "DEFENSA_PRIVADA": "DEFENSA_PRIVADA",
        # La capacidad de evaluación se prepara en este bloque, pero el acto
        # sigue sin poder programarse hasta que se norme la acreditación de
        # correcciones de forma y su quórum definitivo.
        "DEFENSA_PUBLICA": "DEFENSA_PUBLICA",
    }

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
            required = {"TRIBUNAL": 3, "PRESIDENTE": 1, "SECRETARIO": 1}
            missing = {role: count - asignaciones.filter(tipo_participacion=role).count()
                       for role, count in required.items()
                       if asignaciones.filter(tipo_participacion=role).count() < count}
            if missing:
                raise ValidationError({"asignaciones": f"La Defensa Pública de Tesis requiere: {missing}."})
            return
        from apps.postulantes.models import AsignacionPostulacion
        tribunales = AsignacionPostulacion.objects.filter(
            postulacion=seguimiento.postulacion, tipo_participacion="TRIBUNAL", activo=True,
            seguimiento_etapa__etapa__codigo="TEMATICA_TESIS",
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
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            if rol_evento not in {"TRIBUNAL", "PRESIDENTE", "SECRETARIO"}:
                raise ValidationError("La Defensa Pública de Tesis solo admite Tribunal, Presidente y Secretario.")
            return
        if evento.tipo_evento != "DEFENSA_PRIVADA":
            return
        if rol_evento == "TRIBUNAL":
            if asignacion.tipo_participacion != "TRIBUNAL" or asignacion.seguimiento_etapa_id != evento.postulacion.seguimientos_etapa.filter(etapa__codigo="TEMATICA_TESIS").values_list("id", flat=True).first():
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
            tribunales = presentes.filter(rol_evento="TRIBUNAL").count()
            return {"valido": tribunales == 3, "faltantes": {"TRIBUNAL": max(0, 3-tribunales)}, "detalle": {"TRIBUNAL": tribunales}}
        if evento.tipo_evento == "DEFENSA_PRIVADA":
            tribunales = presentes.filter(rol_evento="TRIBUNAL").count()
            secretario = presentes.filter(rol_evento="DOCENTE_MODALIDAD").count()
            return {"valido": tribunales >= 2 and secretario >= 1, "faltantes": {"TRIBUNAL": max(0, 2-tribunales), "DOCENTE_MODALIDAD": max(0, 1-secretario)}, "detalle": {"TRIBUNAL": tribunales, "DOCENTE_MODALIDAD": secretario}}
        if evento.tipo_evento == "DEFENSA_PUBLICA":
            counts = {role: presentes.filter(rol_evento=role).count() for role in ("TRIBUNAL", "PRESIDENTE", "SECRETARIO")}
            missing = {role: required - counts[role] for role, required in {"TRIBUNAL": 3, "PRESIDENTE": 1, "SECRETARIO": 1}.items() if counts[role] < required}
            return {"valido": not missing, "faltantes": missing, "detalle": counts}
        # El reglamento exige tribunal designado, pero no fija quórum para perfil.
        return {"valido": True, "faltantes": {}, "detalle": {"pendiente_de_validacion_institucional": True}}


class TesisGradoEvaluacionPolicy(BaseEvaluacionPolicy):
    """Reglas de evaluación confirmadas para los actos de Tesis habilitados."""

    def get_tipos_evaluacion(self):
        return ("TEMATICA", "PERFIL", "PRIVADA", "PUBLICA")

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
        if evaluacion.tipo_evaluacion == "PRIVADA" and (evaluacion.nota_numerica is None or not Decimal("0") <= evaluacion.nota_numerica <= Decimal("30")):
            raise ValidationError({"nota_numerica": "La evaluación individual requiere nota para calcular el promedio normativo."})
        if evaluacion.tipo_evaluacion == "PUBLICA":
            if evaluacion.nota_numerica is None or not Decimal("0") <= evaluacion.nota_numerica <= Decimal("70"):
                raise ValidationError({"nota_numerica": "La Defensa Pública de Tesis admite notas de 1 a 100."})

    def get_valores_registro(self, *, evento, tipo, nota):
        if tipo == "PUBLICA":
            return {"ponderacion": Decimal("70.00"), "aporte_ponderado": nota}
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
        evaluadores = {item.evaluador_id for item in individuales}
        if len(evaluadores) != 3 or any(item.evaluador.rol_evento != "TRIBUNAL" or not item.evaluador.activo or not item.evaluador.asignacion.activo or item.nota_numerica is None for item in individuales): raise ValidationError("Las evaluaciones individuales no corresponden a tres tribunales válidos.")
        individuales[0]._tesis_promedio = sum(item.nota_numerica for item in individuales) / Decimal("3")
        return individuales[0]

    def construir_consolidado(self, evaluacion, usuario):
        from apps.postulantes.models import EvaluacionDefensa
        es_publica = evaluacion.tipo_evaluacion == "PUBLICA"
        promedio = getattr(evaluacion, "_tesis_promedio", None)
        nota = promedio if promedio is not None else evaluacion.nota_numerica
        return EvaluacionDefensa(
            evento=evaluacion.evento, tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO", resultado_cualitativo=evaluacion.resultado_cualitativo,
            nota_numerica=nota,
            ponderacion=Decimal("70.00") if es_publica else (Decimal("30.00") if evaluacion.tipo_evaluacion == "PRIVADA" else None),
            aporte_ponderado=nota,
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
        private_contribution = private_note
        public_contribution = public_note
        final = (private_contribution + public_contribution).quantize(Decimal("0.01")) if private_contribution is not None and public_contribution is not None else None
        classification = self.clasificar_nota_final(final) if final is not None else None
        return {"nota_privada": private_note, "nota_publica": public_note, "aporte_privada": private_contribution, "aporte_publica": public_contribution, "nota_final": final, "clasificacion": classification, "resultado": classification, "limitacion_normativa": "El artículo 42 contiene la referencia contradictoria a 61; se aplica 51 conforme a los artículos 37–41 y Reglamento General."}


class TesisGradoRequisitosPolicy(BaseRequisitosPolicy):
    INSCRIPCION_DOCUMENTS = (
        "CARTA_SOLICITUD",
        "MATRICULA_VIGENTE",
        "HISTORIAL_PRERREQ",
    )

    def get_documentos_requeridos(self, fase=None):
        return self.INSCRIPCION_DOCUMENTS if fase in (None, "INSCRIPCION") else ()


class TesisGradoPolicy(BaseModalidadPolicy):
    codigo = "TESIS_GRADO"
    etapas = ETAPAS
    evento_policy = TesisGradoEventoPolicy()
    evaluacion_policy = TesisGradoEvaluacionPolicy()
    requisitos_policy = TesisGradoRequisitosPolicy()

    def get_reglas_asignacion(self):
        return {"TEMATICA_TESIS": {"TRIBUNAL": 3}, "TUTOR": {"precondicion": "TEMATICA_TESIS_APROBADA"}}

    def validar_asignacion(self, *, queryset_contexto, postulacion, tipo_participacion,
                           seguimiento_etapa, orden_cargo, **kwargs):
        if tipo_participacion == "TRIBUNAL" and seguimiento_etapa and seguimiento_etapa.etapa.codigo == "TEMATICA_TESIS":
            if queryset_contexto.count() >= 3:
                raise ValidationError("La temática de Tesis requiere exactamente tres docentes afines; no se admite un cuarto tribunal.")
            if orden_cargo is not None and queryset_contexto.filter(orden_cargo=orden_cargo).exists():
                raise ValidationError("Ya existe un miembro del tribunal con ese orden de cargo.")
        if tipo_participacion == "TUTOR":
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
        if etapa.codigo == "DEFENSA_PRIVADA" and ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError("La nueva oportunidad posterior a una segunda Defensa Privada requiere decisión académica institucional.")
        if etapa.codigo == "DEFENSA_PUBLICA" and ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError("No procede un tercer intento de Defensa Pública de Tesis.")

    @classmethod
    def validar_gate_publica(cls, postulacion):
        """Gate común-documental para el paso Privada suficiente → Pública."""
        from apps.documentos.models import ConfirmacionCorreccionDocumento, DocumentoPostulacion, ObservacionDocumento, VersionDocumento
        from apps.postulantes.models import EventoDefensa

        private = EventoDefensa.objects.filter(postulacion=postulacion, tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", activo=True).order_by("-numero_intento").first()
        if not private or not private.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True).exists():
            raise ValidationError("La Defensa Pública requiere una Defensa Privada finalizada con resultado SUFICIENTE.")
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
        valid_tribunal = assignment.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL and assignment.seguimiento_etapa and assignment.seguimiento_etapa.etapa.codigo == "TEMATICA_TESIS"
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
                seguimiento_etapa__etapa__codigo="TEMATICA_TESIS",
            )
            if tribunales.count() != 3:
                raise ValidationError("El dictamen de Tribunal requiere los tres tribunales válidos de Tesis.")
