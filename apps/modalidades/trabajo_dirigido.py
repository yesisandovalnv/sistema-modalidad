from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.modalidades.models import TrabajoDirigidoExpediente
from apps.modalidades.policies import (
    BaseModalidadPolicy,
    BaseRequisitosPolicy,
    DecisionAcademicaDefinition,
    EtapaDefinition,
)
from apps.modalidades.proyecto_grado import (
    ProyectoGradoEventoPolicy,
    ProyectoGradoLegacyEvaluacionPolicy,
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


class TrabajoDirigidoPolicy(BaseModalidadPolicy):
    codigo = "TRABAJO_DIRIGIDO"
    PROPUESTA_APROBADA = "PROPUESTA_TRABAJO_DIRIGIDO_APROBADA"
    RESULTADO_PROPUESTA_APROBADA = "APROBADA"
    etapas = ETAPAS
    evento_policy = TrabajoDirigidoEventoPolicy()
    evaluacion_policy = ProyectoGradoLegacyEvaluacionPolicy()
    requisitos_policy = TrabajoDirigidoRequisitosPolicy()

    def get_decisiones_academicas_permitidas(self, codigo_etapa):
        if codigo_etapa != "PERFIL_TRABAJO_DIRIGIDO":
            return ()
        return (
            DecisionAcademicaDefinition(
                codigo=self.PROPUESTA_APROBADA,
                resultados=(self.RESULTADO_PROPUESTA_APROBADA,),
                nombre="Propuesta de Trabajo Dirigido aprobada",
                roles_participantes=("TRIBUNAL",),
                participantes_minimos=3,
                participantes_maximos=3,
                ordenes_requeridos=(1, 2, 3),
                validar_composicion_asignaciones=True,
            ),
        )

    @staticmethod
    def _seguimiento_perfil(postulacion):
        return postulacion.seguimientos_etapa.filter(
            activo=True,
            etapa__codigo="PERFIL_TRABAJO_DIRIGIDO",
        ).order_by("-numero_intento", "-pk").first()

    def _propuesta_aprobada(self, postulacion, seguimiento=None):
        from apps.postulantes.models import DecisionAcademicaEtapa

        if not seguimiento or seguimiento.etapa.codigo != "PERFIL_TRABAJO_DIRIGIDO":
            seguimiento = self._seguimiento_perfil(postulacion)
        return bool(
            seguimiento
            and DecisionAcademicaEtapa.objects.filter(
                seguimiento_etapa=seguimiento,
                codigo=self.PROPUESTA_APROBADA,
                resultado=self.RESULTADO_PROPUESTA_APROBADA,
                activo=True,
            ).exists()
        )

    @staticmethod
    def _tutor_activo(postulacion):
        return bool(
            postulacion
            and postulacion.asignaciones.filter(
                activo=True,
                tipo_participacion="TUTOR",
                seguimiento_etapa__isnull=True,
            ).exists()
        )

    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        propuesta_aprobada = bool(postulacion and self._propuesta_aprobada(postulacion, seguimiento))
        tutor_preexistente = self._tutor_activo(postulacion)
        tutor_habilitado = propuesta_aprobada or tutor_preexistente
        precondicion_tutor = {
            "codigo": self.PROPUESTA_APROBADA,
            "estado": "CUMPLIDA" if propuesta_aprobada else (
                "CONTINUIDAD_HISTORICA" if tutor_preexistente else "PENDIENTE"
            ),
            "enforcement": "INFORMATIVO" if tutor_preexistente and not propuesta_aprobada else "ACTIVO",
        }
        return {
            "regimen_workflow": getattr(postulacion, "regimen_workflow", None),
            "grupos": [
                {
                    "clave": "TRIBUNAL_PROPUESTA_TRABAJO_DIRIGIDO",
                    "tipo_participacion": "TRIBUNAL",
                    "nombre": "Tribunal de propuesta de Trabajo Dirigido",
                    "ambito": "ETAPA",
                    "codigo_etapa": "PERFIL_TRABAJO_DIRIGIDO",
                    "minimo": 3,
                    "maximo": 3,
                    "ordenado": True,
                    "ordenes_permitidos": [1, 2, 3],
                    "obligatoriedad": True,
                    "habilitada": True,
                    "precondicion": None,
                    "posiciones": [
                        {"clave": "TRIBUNAL_PROPUESTA_TD_1", "orden_cargo": 1, "nombre": "Tribunal 1"},
                        {"clave": "TRIBUNAL_PROPUESTA_TD_2", "orden_cargo": 2, "nombre": "Tribunal 2"},
                        {"clave": "TRIBUNAL_PROPUESTA_TD_3", "orden_cargo": 3, "nombre": "Tribunal 3"},
                    ],
                },
                {
                    "clave": "TUTOR_TRABAJO_DIRIGIDO",
                    "tipo_participacion": "TUTOR",
                    "nombre": "Tutor de Trabajo Dirigido",
                    "ambito": "POSTULACION",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "obligatoriedad": True,
                    "habilitada": tutor_habilitado,
                    "precondicion": precondicion_tutor,
                    "bloqueo_precondicion_pendiente": {
                        "codigo": "PROPUESTA_TRABAJO_DIRIGIDO_NO_APROBADA",
                        "mensaje": "El Tutor solo puede designarse después de aprobar formalmente la propuesta de Trabajo Dirigido.",
                    },
                    "posiciones": [{
                        "clave": "TUTOR_TRABAJO_DIRIGIDO_1",
                        "orden_cargo": None,
                        "nombre": "Tutor de Trabajo Dirigido",
                    }],
                },
            ],
        }

    def get_reglas_asignacion(self):
        return self.evento_policy.ASSIGNMENTS

    def usa_conclusion_academica_propia(self):
        return True

    def get_revision_tribunal_previa_policy(self):
        return TrabajoDirigidoRevisionPolicy()

    def get_cierre_policy(self):
        return None

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if not seguimiento:
            return None
        if seguimiento.etapa.codigo == "INSCRIPCION":
            return self._orientar_inscripcion(postulacion)
        if seguimiento.etapa.codigo == "PERFIL_TRABAJO_DIRIGIDO":
            return self._orientar_perfil(postulacion, seguimiento)
        return self.get_orientacion_documental_prioritaria(
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
        requirements = self._evaluar_requisitos_inscripcion(postulacion)
        completed = sum(item["cumplido"] for item in requirements)
        missing_documents = [
            item for item in requirements
            if item["tipo"] == "DOCUMENTO" and not item["presentado"]
        ]
        corrections = [
            item for item in requirements
            if item["tipo"] == "DOCUMENTO" and item["estado_display"] == "Requiere corrección"
        ]
        pending_review = [
            item for item in requirements
            if item["tipo"] == "DOCUMENTO" and item["presentado"]
            and not item["cumplido"] and item not in corrections
        ]
        folder_complete = requirements[-1]["cumplido"]
        if missing_documents or corrections:
            code, title, description, destination, label = (
                "COMPLETAR_DOCUMENTOS", "Completar documentos de Inscripción",
                "Presenta o corrige los documentos obligatorios de Inscripción.",
                "#documentos", "Ir a documentos",
            )
        elif pending_review:
            code, title, description, destination, label = (
                "GESTIONAR_DOCUMENTOS", "Revisión administrativa de documentos",
                "Los documentos presentados deben ser aprobados por personal administrativo.",
                "#documentos", "Revisar documentos",
            )
        elif not folder_complete:
            code, title, description, destination, label = (
                "GESTIONAR_ENTREGA_FISICA", "Registrar recepción del fólder amarillo",
                "El personal administrativo debe registrar la recepción del fólder rotulado.",
                "#inscripcion-entregas", "Ir a recepción física",
            )
        else:
            code, title, description, destination, label = (
                "APROBAR_ETAPA", "Aprobar Inscripción",
                "Los requisitos de Inscripción están aprobados y recibidos.",
                "#resumen", "Aprobar etapa",
            )
        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": f"{completed}/{len(requirements)} requisitos de Inscripción cumplidos.",
            "requisitos": requirements,
            "requisitos_cumplidos": completed,
            "requisitos_totales": len(requirements),
            "permite_aprobar_etapa": completed == len(requirements),
            "siguiente_accion": {
                "codigo": code, "titulo": title, "descripcion": description,
                "estado": "DISPONIBLE" if code == "APROBAR_ETAPA" else "PENDIENTE",
                "estado_display": "Disponible" if code == "APROBAR_ETAPA" else "Pendiente",
                "destino": destination, "accion_label": label,
            },
            "conflictos_identidad": [],
        }

    @staticmethod
    def _requisito_orientacion(tipo, codigo, nombre, cumplido, destino, estado_display=None):
        return {
            "tipo": tipo,
            "codigo": codigo,
            "nombre": nombre,
            "cumplido": cumplido,
            "estado": "CUMPLIDO" if cumplido else "PENDIENTE",
            "estado_display": estado_display or ("Cumplido" if cumplido else "Pendiente"),
            "destino": None if cumplido else destino,
        }

    @staticmethod
    def _accion_orientacion(codigo, titulo, descripcion, destino, label, disponible=False):
        return {
            "codigo": codigo,
            "titulo": titulo,
            "descripcion": descripcion,
            "estado": "DISPONIBLE" if disponible else "PENDIENTE",
            "estado_display": "Disponible" if disponible else "Pendiente",
            "destino": destino,
            "accion_label": label,
        }

    def _orientar_perfil(self, postulacion, seguimiento):
        tribunales = postulacion.asignaciones.filter(
            activo=True,
            tipo_participacion="TRIBUNAL",
            seguimiento_etapa=seguimiento,
            orden_cargo__in=(1, 2, 3),
        )
        ordenes = set(tribunales.values_list("orden_cargo", flat=True))
        tribunal_completo = ordenes == {1, 2, 3} and tribunales.count() == 3
        requisitos = [self._requisito_orientacion(
            "ACTOR", "TRIBUNAL_PROPUESTA_TD", "Tribunal de propuesta",
            tribunal_completo, "#actores", f"{len(ordenes)}/3",
        )]
        if not tribunal_completo:
            accion = self._accion_orientacion(
                "GESTIONAR_ACTORES", "Completar Tribunal de propuesta",
                "Asigna las tres posiciones del Tribunal de propuesta de Trabajo Dirigido.",
                "#actores", "Gestionar actores",
            )
            mensaje = "Completa la composición formal del Tribunal antes de registrar la decisión académica."
            return self._respuesta_orientacion(mensaje, requisitos, accion)

        propuesta_aprobada = self._propuesta_aprobada(postulacion, seguimiento)
        requisitos.append(self._requisito_orientacion(
            "DECISION_ACADEMICA", self.PROPUESTA_APROBADA,
            "Propuesta de Trabajo Dirigido aprobada", propuesta_aprobada,
            "#decisiones-academicas",
            "Sin decisión formal (continuidad histórica)"
            if not propuesta_aprobada and self._tutor_activo(postulacion)
            else None,
        ))
        tutor_activo = self._tutor_activo(postulacion)
        if not propuesta_aprobada and not tutor_activo:
            accion = self._accion_orientacion(
                "REGISTRAR_DECISION", "Registrar aprobación de la propuesta",
                "Registra la decisión formal de los tres tribunales sobre la propuesta.",
                "#decisiones-academicas", "Registrar decisión", disponible=True,
            )
            return self._respuesta_orientacion(
                "El Tribunal está completo. Registra la aprobación formal de la propuesta.",
                requisitos, accion,
            )

        requisitos.append(self._requisito_orientacion(
            "ACTOR", "TUTOR_TRABAJO_DIRIGIDO", "Tutor de Trabajo Dirigido",
            tutor_activo, "#actores",
            "Asignado" if tutor_activo else "Pendiente",
        ))
        if not tutor_activo:
            accion = self._accion_orientacion(
                "GESTIONAR_ACTORES", "Asignar Tutor de Trabajo Dirigido",
                "La propuesta está aprobada. Asigna al Tutor para elaborar el Perfil.",
                "#actores", "Gestionar actores",
            )
            return self._respuesta_orientacion(
                "La propuesta fue aprobada. Corresponde designar al Tutor de Trabajo Dirigido.",
                requisitos, accion,
            )

        codigos_documentales = self.get_documentos_requeridos("PERFIL_TRABAJO_DIRIGIDO")
        documentos_pendientes = set(self._missing_documents(postulacion, codigos_documentales))
        orientacion_documental = self.get_orientacion_documental_prioritaria(
            postulacion=postulacion,
            seguimiento=seguimiento,
        )
        if orientacion_documental is not None:
            documentos_orientados = {
                item["codigo"] for item in orientacion_documental.get("requisitos", [])
                if item.get("tipo") == "DOCUMENTO"
            }
            orientacion_documental.setdefault("requisitos", []).extend(
                self._requisito_orientacion(
                    "DOCUMENTO",
                    codigo,
                    codigo,
                    codigo not in documentos_pendientes,
                    "#documentos",
                    "Pendiente de presentación o aprobación"
                    if codigo in documentos_pendientes else "Aprobado",
                )
                for codigo in codigos_documentales
                if codigo not in documentos_orientados
            )
            orientacion_documental["requisitos"] = (
                requisitos + orientacion_documental.get("requisitos", [])
            )
            orientacion_documental["mensaje"] = (
                "Completa el Perfil de Trabajo Dirigido y el informe del Tutor antes de la defensa."
            )
            return orientacion_documental

        if documentos_pendientes:
            requisitos.extend(
                self._requisito_orientacion(
                    "DOCUMENTO",
                    codigo,
                    codigo,
                    False,
                    "#documentos",
                    "Pendiente de presentación o aprobación",
                )
                for codigo in codigos_documentales
            )
            accion = self._accion_orientacion(
                "GESTIONAR_DOCUMENTOS", "Completar documentos del Perfil",
                "Gestiona la presentación y aprobación del Perfil y del informe del Tutor.",
                "#documentos", "Gestionar documentos",
            )
            return self._respuesta_orientacion(
                "El Perfil y el informe del Tutor deben estar presentados y aprobados antes de programar la defensa.",
                requisitos, accion,
            )

        requisitos.extend(
            self._requisito_orientacion("DOCUMENTO", codigo, codigo, True, "#documentos", "Aprobado")
            for codigo in codigos_documentales
        )
        evento = seguimiento.eventos_defensa.filter(
            tipo_evento="DEFENSA_PERFIL", activo=True,
        ).order_by("-numero_intento", "-pk").first()
        if evento is None:
            accion = self._accion_orientacion(
                "PROGRAMAR_EVENTO", "Programar Defensa de Perfil",
                "El Tutor y los documentos están completos. Programa la Defensa de Perfil.",
                "#defensas", "Ir a programar defensa", disponible=True,
            )
        elif evento.estado != "FINALIZADA":
            accion = self._accion_orientacion(
                "GESTIONAR_DEFENSA", "Gestionar Defensa de Perfil",
                "Completa la gestión de la Defensa de Perfil programada.",
                "#defensas", "Ir a defensas",
            )
        elif not evento.evaluaciones.filter(
            tipo_evaluacion="RESULTADO_FINAL", activo=True,
        ).exists():
            accion = self._accion_orientacion(
                "CONSOLIDAR_RESULTADO", "Consolidar resultado del Perfil",
                "Registra y consolida la evaluación de la Defensa de Perfil.",
                "#defensas", "Ir a defensas", disponible=True,
            )
        else:
            if propuesta_aprobada:
                accion = self._accion_orientacion(
                    "APROBAR_ETAPA", "Aprobar Perfil de Trabajo Dirigido",
                    "La Defensa de Perfil tiene un resultado consolidado. Revisa y aprueba la etapa.",
                    "#resumen", "Aprobar etapa", disponible=True,
                )
            else:
                accion = self._accion_orientacion(
                    "REGISTRAR_DECISION", "Registrar aprobación de la propuesta",
                    "La continuidad histórica no sustituye la decisión académica formal de los tribunales.",
                    "#decisiones-academicas", "Registrar decisión", disponible=True,
                )
        return self._respuesta_orientacion(
            "Gestiona la Defensa de Perfil para completar esta etapa.", requisitos, accion,
        )

    @staticmethod
    def _respuesta_orientacion(mensaje, requisitos, accion):
        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": mensaje,
            "requisitos": requisitos,
            "siguiente_accion": accion,
            "conflictos_identidad": [],
        }

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
        if tipo_participacion == "TUTOR" and not self._propuesta_aprobada(postulacion, seguimiento_etapa):
            raise ValidationError(
                "El Tutor solo puede designarse después de aprobar formalmente la propuesta de Trabajo Dirigido."
            )
        if tipo_participacion == "TRIBUNAL" and stage == "PERFIL_TRABAJO_DIRIGIDO":
            if queryset_contexto.count() >= 3:
                raise ValidationError("El perfil requiere exactamente tres docentes de tribunal.")
            if orden_cargo not in {1, 2, 3}:
                raise ValidationError("Los tribunales del perfil requieren órdenes 1, 2 y 3.")
            if queryset_contexto.filter(orden_cargo=orden_cargo).exists():
                raise ValidationError("Ya existe un tribunal activo con ese orden de cargo.")

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
            if not self._propuesta_aprobada(seguimiento.postulacion, seguimiento):
                raise ValidationError("La etapa requiere la aprobación formal de la propuesta de Trabajo Dirigido.")
            if not self._tutor_activo(seguimiento.postulacion):
                raise ValidationError("La etapa requiere un Tutor de Trabajo Dirigido activo.")
            self._require_sufficient_event(seguimiento, "DEFENSA_PERFIL")
        if stage == "DEFENSA_PRIVADA":
            self._require_sufficient_event(seguimiento, "DEFENSA_PRIVADA")
            return
        if stage == "DEFENSA_PUBLICA":
            self._validar_aprobacion_defensa_publica(seguimiento)
            return
        missing = self._missing_documents(seguimiento.postulacion, self.get_documentos_requeridos(stage))
        if stage == "DESARROLLO_TRABAJO_DIRIGIDO":
            expediente = self._validar_institucion(seguimiento.postulacion)
            if expediente.tipo_ejecucion == TrabajoDirigidoExpediente.TipoEjecucion.EXTERNO:
                missing.extend(self._missing_documents(seguimiento.postulacion, ("CONVENIO_TRABAJO_DIRIGIDO",)))
        if missing:
            raise ValidationError({"faltantes": sorted(set(missing))})

    @staticmethod
    def _validar_aprobacion_defensa_publica(seguimiento):
        from apps.postulantes.defensas import EvaluacionDefensaService
        from apps.postulantes.models import EvaluacionDefensa

        evento = seguimiento.eventos_defensa.filter(
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", activo=True,
        ).order_by("-fecha_fin_real", "-pk").first()
        if not evento:
            raise ValidationError("No se puede aprobar DEFENSA_PUBLICA sin un evento público finalizado.")
        if not evento.evaluaciones.filter(
            tipo_evaluacion="RESULTADO_FINAL",
            es_resultado_final_evento=True,
            nota_numerica__isnull=False,
            activo=True,
        ).exists():
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
