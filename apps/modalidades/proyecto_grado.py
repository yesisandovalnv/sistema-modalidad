from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.modalidades.policies import (BaseEvaluacionPolicy, BaseEventoPolicy,
    BaseModalidadPolicy, BaseRequisitosPolicy, BaseRevisionTribunalPreviaPolicy,
    EtapaDefinition)


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


class ProyectoGradoEvaluacionPolicy(BaseEvaluacionPolicy):
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
        data = {"evento": evaluacion.evento, "tipo_evaluacion": "RESULTADO_FINAL", "modalidad_registro": "CONSENSO", "es_resultado_final_evento": True, "registrado_por": usuario}
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
    CONDITIONS = ("PLAN_ESTUDIOS", "ADMISION_COMPLETA", "SOLVENCIA_UNIVERSITARIA", "SOLVENCIA_BIBLIOTECA", "MATRICULA_VIGENTE", "PLAZO_MAXIMO")
    DELIVERIES = ("CD_RESPALDO", "EJEMPLARES_IMPRESOS", "TIMBRE_UNIVERSITARIO")
    DOCUMENTS = ("DOCUMENTO_FINAL", "ACTA_DEFENSA", "HOJA_APROBACION", "INFORME_FINAL_TUTOR")
    def get_condiciones_requeridas(self, fase=None): return self.CONDITIONS
    def get_entregas_requeridas(self, fase=None): return self.DELIVERIES
    def get_documentos_requeridos(self, fase=None):
        # Si se especifica etapa, retorna solo documentos aplicables en esa etapa
        if fase == "DOCUMENTO_FINAL":
            return ("DOCUMENTO_FINAL",)
        if fase == "REVISION_TRIBUNAL_PREVIA":
            return ("INFORME_REVISION_TRIBUNAL_PREVIA",)
        # Para compatibilidad, si no se especifica fase retorna todos los documentos requeridos
        # Otras etapas: no permiten carga de documentos
        return self.DOCUMENTS if fase is None else ()


class ProyectoGradoPolicy(BaseModalidadPolicy):
    codigo = "PROYECTO_GRADO"
    etapas = ETAPAS
    evento_policy = ProyectoGradoEventoPolicy()
    evaluacion_policy = ProyectoGradoEvaluacionPolicy()
    requisitos_policy = ProyectoGradoRequisitosPolicy()
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

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if not seguimiento or seguimiento.etapa.codigo != "DOCUMENTO_FINAL":
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
    def validar_asignacion(self, *, queryset_contexto, tipo_participacion, seguimiento_etapa, orden_cargo, queryset_activas, usuario_asignado, **kwargs):
        self.evento_policy.validar_asignacion_publica(
            queryset_activas=queryset_activas, usuario_asignado=usuario_asignado,
            tipo_participacion=tipo_participacion, seguimiento_etapa=seguimiento_etapa,
        )
        if tipo_participacion == "TRIBUNAL" and seguimiento_etapa and seguimiento_etapa.etapa.codigo == "PERFIL_PROYECTO":
            if queryset_contexto.count() >= 3: raise ValidationError("Proyecto de Grado admite como m\u00e1ximo tres miembros activos de tribunal en el perfil.")
            if orden_cargo is not None and queryset_contexto.filter(orden_cargo=orden_cargo).exists(): raise ValidationError("Ya existe un miembro activo del tribunal con ese orden de cargo.")
    def validar_aprobacion_etapa(self, seguimiento):
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
