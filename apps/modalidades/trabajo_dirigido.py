from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.modalidades.models import TrabajoDirigidoExpediente
from apps.modalidades.policies import BaseRequisitosPolicy, EtapaDefinition
from apps.modalidades.proyecto_grado import (
    ProyectoGradoEventoPolicy,
    ProyectoGradoLegacyEvaluacionPolicy,
    ProyectoGradoPolicy,
    ProyectoGradoRevisionTribunalPreviaPolicy,
)


STAGE_DATA = (
    ("INSCRIPCION", "Inscripción"),
    ("PERFIL_TRABAJO_DIRIGIDO", "Perfil de Trabajo Dirigido"),
    ("DESARROLLO_TRABAJO_DIRIGIDO", "Desarrollo y seguimiento institucional"),
    ("DOCUMENTO_FINAL", "Documento Final"),
    ("REVISION_TRIBUNAL_PREVIA", "Revisión de Tribunal Previa"),
    ("DEFENSA_PRIVADA", "Defensa Privada"),
    ("DEFENSA_PUBLICA", "Defensa Pública"),
    ("CIERRE_DOCUMENTAL", "Cierre Documental"),
)
ETAPAS = tuple(
    EtapaDefinition(
        code, name, index + 1, inicial=index == 0, final=index == len(STAGE_DATA) - 1,
        permite_reapertura=code in {"PERFIL_TRABAJO_DIRIGIDO", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"},
        siguientes_permitidas=(STAGE_DATA[index + 1][0],) if index + 1 < len(STAGE_DATA) else (),
    )
    for index, (code, name) in enumerate(STAGE_DATA)
)


class TrabajoDirigidoEventoPolicy(ProyectoGradoEventoPolicy):
    # Las menciones a "Proyecto de Grado" en los artículos de quórum y definición
    # de la defensa pública son errores materiales: todo el capítulo regula Trabajo Dirigido.
    EVENT_STAGE = {
        "DEFENSA_PERFIL": "PERFIL_TRABAJO_DIRIGIDO",
        "DEFENSA_PRIVADA": "DEFENSA_PRIVADA",
        "DEFENSA_PUBLICA": "DEFENSA_PUBLICA",
    }
    ASSIGNMENTS = {
        "DEFENSA_PERFIL": {"TRIBUNAL": 3},
        "DEFENSA_PRIVADA": {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1},
        "DEFENSA_PUBLICA": {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1},
    }

    def validar_programacion(self, *, tipo_evento, seguimiento, fecha_programada, asignaciones, **kwargs):
        if tipo_evento not in self.EVENT_STAGE:
            raise ValidationError("Tipo de evento no soportado por Trabajo Dirigido.")
        return super().validar_programacion(
            tipo_evento=tipo_evento, seguimiento=seguimiento,
            fecha_programada=fecha_programada, asignaciones=asignaciones, **kwargs,
        )


class TrabajoDirigidoRevisionPolicy(ProyectoGradoRevisionTribunalPreviaPolicy):
    ETAPA = "REVISION_TRIBUNAL_PREVIA"
    DOCUMENTO_FINAL = "DOCUMENTO_FINAL_TD"
    TIPO_EVIDENCIA = "INFORME_REVISION_TRIBUNAL_TD"


class TrabajoDirigidoRequisitosPolicy(BaseRequisitosPolicy):
    DOCUMENTS_BY_STAGE = {
        "INSCRIPCION": ("CARTA_SOLICITUD_TD", "MATRICULA_VIGENTE_TD", "HISTORIAL_PRERREQ_TD", "FOLDER_AMARILLO_TD"),
        "PERFIL_TRABAJO_DIRIGIDO": ("PERFIL_TRABAJO_DIRIGIDO", "INFORME_TUTOR_PERFIL_TD"),
        "DESARROLLO_TRABAJO_DIRIGIDO": ("INFORME_SUPERVISION_TD",),
        "DOCUMENTO_FINAL": ("DOCUMENTO_FINAL_TD", "INFORME_FINAL_TUTOR_TD"),
        "REVISION_TRIBUNAL_PREVIA": ("INFORME_REVISION_TRIBUNAL_TD",),
        "DEFENSA_PRIVADA": (),
        "DEFENSA_PUBLICA": (
            "OFICIO_PRESENTACION_TD", "HISTORIAL_PLAN_TD", "INFORME_CONCLUSION_TUTOR_TD",
            "CERT_ADMISION_TD", "SOLVENCIA_UNIV_TD", "SOLVENCIA_BIBLIO_TD",
            "MATRICULA_DEFENSA_TD", "TIMBRE_DEFENSA_TD", "CARTA_CONFORMIDAD_INSTITUCION_TD",
        ),
        "CIERRE_DOCUMENTAL": ("DOCUMENTO_FINAL_TD", "ACTA_DEFENSA_TD"),
    }

    def get_documentos_requeridos(self, fase=None):
        if fase is not None:
            return tuple(self.DOCUMENTS_BY_STAGE.get(fase, ()))
        return tuple(dict.fromkeys(code for values in self.DOCUMENTS_BY_STAGE.values() for code in values))


class TrabajoDirigidoPolicy(ProyectoGradoPolicy):
    codigo = "TRABAJO_DIRIGIDO"
    etapas = ETAPAS
    evento_policy = TrabajoDirigidoEventoPolicy()
    evaluacion_policy = ProyectoGradoLegacyEvaluacionPolicy()
    requisitos_policy = TrabajoDirigidoRequisitosPolicy()

    def usa_conclusion_academica_propia(self):
        return True

    def get_revision_tribunal_previa_policy(self):
        return TrabajoDirigidoRevisionPolicy()

    def get_cierre_policy(self):
        return None

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if seguimiento and seguimiento.etapa.codigo == "INSCRIPCION":
            return self._orientar_inscripcion(postulacion)
        return super().get_orientacion_etapa_actual(
            postulacion=postulacion,
            seguimiento=seguimiento,
        )

    def _evaluar_requisitos_inscripcion(self, postulacion):
        from apps.documentos.models import TipoDocumento
        from apps.postulantes.models import EntregaFisica

        document_codes = self.get_documentos_requeridos("INSCRIPCION")
        document_names = dict(
            TipoDocumento.objects.filter(codigo__in=document_codes)
            .values_list("codigo", "nombre")
        )
        requirements = []
        for code in document_codes:
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
                "nombre": document_names.get(code, code),
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
        delivery_complete = bool(
            delivery and delivery.estado == EntregaFisica.Estado.COMPLETA
        )
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
        orientation = super()._orientar_inscripcion(postulacion)
        completed = orientation["requisitos_cumplidos"]
        total = orientation["requisitos_totales"]
        message_by_action = {
            "COMPLETAR_DOCUMENTOS": "Completa los documentos pendientes.",
            "GESTIONAR_DOCUMENTOS": "Los documentos están pendientes de revisión administrativa.",
            "GESTIONAR_ENTREGA_FISICA": "Falta registrar la recepción del fólder amarillo.",
            "APROBAR_ETAPA": "Los requisitos están cumplidos. La etapa puede aprobarse.",
        }
        action_code = orientation["siguiente_accion"]["codigo"]
        message = message_by_action.get(action_code)
        if message:
            orientation["mensaje"] = (
                f"{completed}/{total} requisitos de Inscripción cumplidos. {message}"
            )
        if action_code == "APROBAR_ETAPA":
            orientation["siguiente_accion"]["descripcion"] = (
                "Los requisitos de Inscripción están aprobados y recibidos."
            )
        return orientation

    def validar_asignacion(self, *, queryset_contexto, tipo_participacion, seguimiento_etapa,
                           orden_cargo, postulacion, queryset_activas, usuario_asignado, **kwargs):
        allowed = {"TUTOR", "TRIBUNAL", "DOCENTE_MODALIDAD", "PRESIDENTE", "SECRETARIO", "SUPERVISOR_INSTITUCIONAL"}
        if tipo_participacion not in allowed:
            raise ValidationError("El actor no corresponde al flujo de Trabajo Dirigido.")
        self.evento_policy.validar_asignacion_publica(
            queryset_activas=queryset_activas, usuario_asignado=usuario_asignado,
            tipo_participacion=tipo_participacion, seguimiento_etapa=seguimiento_etapa,
        )
        stage = seguimiento_etapa.etapa.codigo if seguimiento_etapa else None
        if tipo_participacion == "TUTOR" and not postulacion.seguimientos_etapa.filter(
            etapa__codigo="PERFIL_TRABAJO_DIRIGIDO", estado="APROBADA",
        ).exists():
            raise ValidationError("El Tutor se designa después de aprobar la propuesta de Trabajo Dirigido.")
        if tipo_participacion == "TRIBUNAL" and stage == "PERFIL_TRABAJO_DIRIGIDO":
            if queryset_contexto.count() >= 3:
                raise ValidationError("El perfil requiere exactamente tres docentes de tribunal.")
            if orden_cargo not in {1, 2, 3}:
                raise ValidationError("Los tribunales del perfil requieren órdenes 1, 2 y 3.")

    def validar_inicio_etapa(self, seguimiento):
        if seguimiento.etapa.codigo == "DESARROLLO_TRABAJO_DIRIGIDO":
            self._validar_institucion(seguimiento.postulacion)
        if seguimiento.etapa.codigo == "DEFENSA_PUBLICA":
            self._validar_gate_publica(seguimiento.postulacion)

    def validar_aprobacion_etapa(self, seguimiento):
        stage = seguimiento.etapa.codigo
        if stage == "DESARROLLO_TRABAJO_DIRIGIDO":
            expediente = self._validar_institucion(seguimiento.postulacion)
            if not expediente.informes_seguimiento.filter(activo=True).exists():
                raise ValidationError("Debe existir al menos un informe periódico del supervisor institucional.")
        if stage == "REVISION_TRIBUNAL_PREVIA":
            from apps.postulantes.revision_tribunal import RevisionTribunalPreviaService
            RevisionTribunalPreviaService.validar_aprobacion(seguimiento)
            return
        if stage == "PERFIL_TRABAJO_DIRIGIDO":
            self._require_sufficient_event(seguimiento, "DEFENSA_PERFIL")
        if stage == "DEFENSA_PRIVADA":
            self._require_sufficient_event(seguimiento, "DEFENSA_PRIVADA")
            return
        if stage == "DEFENSA_PUBLICA":
            return super().validar_aprobacion_etapa(seguimiento)
        missing = self._missing_documents(seguimiento.postulacion, self.get_documentos_requeridos(stage))
        if stage == "DESARROLLO_TRABAJO_DIRIGIDO":
            expediente = self._validar_institucion(seguimiento.postulacion)
            if expediente.tipo_ejecucion == TrabajoDirigidoExpediente.TipoEjecucion.EXTERNO:
                missing.extend(self._missing_documents(seguimiento.postulacion, ("CONVENIO_TRABAJO_DIRIGIDO",)))
        if missing:
            raise ValidationError({"faltantes": sorted(set(missing))})

    def validar_nuevo_intento(self, *, etapa, ultimo_seguimiento, **kwargs):
        if etapa.codigo == "PERFIL_TRABAJO_DIRIGIDO":
            if ultimo_seguimiento.numero_intento >= 2:
                raise ValidationError("Tras el segundo perfil insuficiente corresponde reinscribirse en Metodología de la Investigación II.")
            deadline = self._add_business_days(ultimo_seguimiento.fecha_fin, 5)
            if deadline and timezone.now() > deadline:
                raise ValidationError("El nuevo perfil debe presentarse dentro de 5 días hábiles.")
        if etapa.codigo == "DEFENSA_PRIVADA" and ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError("No procede un tercer intento automático de Defensa Privada sin resolución del Consejo de Carrera.")
        if etapa.codigo == "DEFENSA_PUBLICA" and ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError("Tras la segunda oportunidad con nota menor a 51, el postulante queda reprobado.")

    def validar_conclusion_academica(self, postulacion):
        result = self.evaluacion_policy.calcular_resultado_final(postulacion)
        if result["nota_final"] is None or result["nota_final"] < 51:
            raise ValidationError("Trabajo Dirigido requiere una nota final mínima de 51 puntos.")
        missing = self._missing_documents(postulacion, self.get_documentos_requeridos("CIERRE_DOCUMENTAL"))
        if missing:
            raise ValidationError({"faltantes": missing})

    @staticmethod
    def _validar_institucion(postulacion):
        expediente = TrabajoDirigidoExpediente.objects.filter(postulacion=postulacion).first()
        if not expediente:
            raise ValidationError("Debe registrar la institución y el supervisor de Trabajo Dirigido.")
        expediente.full_clean()
        if not expediente.constituida_legalmente or not expediente.actividad_permanente:
            raise ValidationError("La institución debe estar legalmente constituida y desarrollar actividad permanente.")
        return expediente

    @staticmethod
    def _require_sufficient_event(seguimiento, event_type):
        event = seguimiento.eventos_defensa.filter(
            tipo_evento=event_type, estado="FINALIZADA", activo=True,
        ).order_by("-fecha_fin_real", "-id").first()
        if not event or not event.evaluaciones.filter(
            tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE", activo=True,
        ).exists():
            raise ValidationError("La etapa requiere una defensa finalizada con resultado SUFICIENTE.")

    @staticmethod
    def _validar_gate_publica(postulacion):
        from apps.documentos.models import DocumentoPostulacion
        private = postulacion.eventos_defensa.filter(
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", activo=True,
            evaluaciones__tipo_evaluacion="RESULTADO_FINAL",
            evaluaciones__resultado_cualitativo="SUFICIENTE",
            evaluaciones__activo=True,
        ).exists()
        if not private:
            raise ValidationError("La Defensa Pública requiere una Defensa Privada suficiente.")
        document = DocumentoPostulacion.objects.filter(
            postulacion=postulacion, tipo_documento__codigo="DOCUMENTO_FINAL_TD",
            activo=True, estado__codigo="APR", requiere_correccion=False,
            versiones__activo=True, versiones__es_version_actual=True,
        ).exists()
        if not document:
            raise ValidationError("La Defensa Pública requiere el Documento Final corregido, aprobado y vigente.")

    @staticmethod
    def _add_business_days(start, days):
        if not start:
            return None
        current = start
        remaining = days
        while remaining:
            current += timedelta(days=1)
            if current.weekday() < 5:
                remaining -= 1
        return current

    @staticmethod
    def _missing_documents(postulacion, codes):
        if not codes:
            return []
        from apps.documentos.models import DocumentoPostulacion
        valid = set(DocumentoPostulacion.objects.filter(
            postulacion=postulacion, activo=True, estado__codigo="APR",
            tipo_documento__codigo__in=codes, requiere_correccion=False,
            versiones__activo=True, versiones__es_version_actual=True,
        ).values_list("tipo_documento__codigo", flat=True))
        return sorted(set(codes) - valid)
