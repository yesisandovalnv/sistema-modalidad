from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.modalidades.models import DiplomadoDefensa, DiplomadoModulo
from apps.modalidades.policies import (
    BaseEvaluacionPolicy,
    BaseEventoPolicy,
    BaseModalidadPolicy,
    BaseRequisitosPolicy,
    EtapaDefinition,
    ReintentoNoElegibleError,
)

STAGE_DATA = (
    ("INSCRIPCION", "Inscripción"),
    ("MODULO_1", "Módulo 1"),
    ("MODULO_2", "Módulo 2"),
    ("MODULO_3", "Módulo 3"),
    ("MODULO_4", "Módulo 4"),
    ("TALLER_INVESTIGACION", "Taller de Investigación"),
    ("REVISION_MONOGRAFIA", "Revisión de Monografía"),
    ("DEFENSA_PUBLICA", "Defensa Pública"),
    ("CIERRE_DOCUMENTAL", "Cierre documental"),
    ("CONCLUSION_ACADEMICA", "Conclusión académica"),
)
ETAPAS = tuple(
    EtapaDefinition(
        code, name, order, inicial=order == 1, final=code == "CONCLUSION_ACADEMICA",
        permite_reapertura=code == "DEFENSA_PUBLICA",
        siguientes_permitidas=(STAGE_DATA[order][0],) if order < len(STAGE_DATA) else (),
    )
    for order, (code, name) in enumerate(STAGE_DATA, start=1)
)

DOCUMENTS_BY_STAGE = {
    "INSCRIPCION": (
        "CARTA_DIPLOMADO", "MATRICULA_DIPLOMADO", "SOLICITUD_AREA_DIPL",
        "BOLETA_PROG_DIPL", "HISTORIAL_DIPLOMADO", "CEDULA_IDENTIDAD",
        "ADMISION_DIPL", "SOLVENCIA_DIPLOMADO",
    ),
    "REVISION_MONOGRAFIA": ("MONOGRAFIA_DIPLOMADO",),
    "DEFENSA_PUBLICA": (
        "CARTA_DEFENSA_DIPL", "MONOGRAFIA_DIPLOMADO", "NOTAS_MODULOS_DIPL",
        "MATR_DEFENSA_DIPL", "BOLETA_DEFENSA_DIPL", "TIMBRE_DEFENSA_DIPL",
        "SOLV_POSGRADO_DIPL",
    ),
    "CIERRE_DOCUMENTAL": ("ACTA_DEFENSA_DIPL", "MONOGRAFIA_EMPAST_D"),
    "CONCLUSION_ACADEMICA": ("ACTA_DEFENSA_DIPL", "MONOGRAFIA_EMPAST_D"),
}

MODULE_ORDER_BY_STAGE = {
    "MODULO_1": 1,
    "MODULO_2": 2,
    "MODULO_3": 3,
    "MODULO_4": 4,
    "TALLER_INVESTIGACION": 5,
}


class DiplomadoRequisitosPolicy(BaseRequisitosPolicy):
    def get_documentos_requeridos(self, fase=None):
        if fase is not None:
            return DOCUMENTS_BY_STAGE.get(fase, ())
        return tuple(dict.fromkeys(code for values in DOCUMENTS_BY_STAGE.values() for code in values))


class DiplomadoEventoPolicy(BaseEventoPolicy):
    EVENT_STAGE = {"DEFENSA_PUBLICA": "DEFENSA_PUBLICA"}

    def get_tipos_evento(self):
        return tuple(self.EVENT_STAGE)

    def get_etapa_asociada(self, tipo_evento):
        return self.EVENT_STAGE.get(tipo_evento)

    def validar_correspondencia_evento_etapa(self, evento):
        if self.get_etapa_asociada(evento.tipo_evento) != evento.seguimiento_etapa.etapa.codigo:
            raise ValidationError("La defensa no corresponde a la etapa de Diplomado.")

    def _tribunal_roles(self, postulacion):
        return postulacion.asignaciones.filter(activo=True)

    def validar_programacion(self, *, seguimiento, asignaciones, **kwargs):
        if seguimiento.etapa.codigo != "DEFENSA_PUBLICA":
            raise ValidationError("Diplomado solo admite defensa pública.")
        roles = set(asignaciones.values_list("tipo_participacion", flat=True))
        if "DECANO_FACULTAD" not in roles or roles.intersection({"VICERRECTOR_POSGRADO"}) and "DECANO_FACULTAD" not in roles:
            raise ValidationError("La defensa requiere Vicerrector o Decano y la representación institucional correspondiente.")
        if "VICERRECTOR_POSGRADO" not in roles and "DIRECTOR_CARRERA" not in roles:
            raise ValidationError("Si preside el Decano, debe integrar el Director de Carrera.")
        if asignaciones.filter(tipo_participacion="TRIBUNAL").count() < 2:
            raise ValidationError("La defensa requiere dos docentes del tribunal.")

    def validar_participante(self, *, evento, asignacion, rol_evento, **kwargs):
        if rol_evento not in {"VICERRECTOR_POSGRADO", "DECANO_FACULTAD", "DIRECTOR_CARRERA", "TRIBUNAL"}:
            raise ValidationError("El participante no corresponde al tribunal de Diplomado.")

    def validar_quorum(self, evento):
        presentes = evento.participantes.filter(activo=True, presente=True)
        total = presentes.count()
        return {"valido": total >= 3, "faltantes": {"TRIBUNAL": max(0, 3 - total)}, "detalle": {"presentes": total, "minimo": 3}}


class DiplomadoEvaluacionPolicy(BaseEvaluacionPolicy):
    def get_tipos_evaluacion(self):
        return ("PUBLICA",)

    def get_modalidad_registro_por_defecto(self, *, evento, tipo):
        return "CONSENSO"

    def validar_solicitud_registro(self, *, modalidad_registro, evaluador, evento, **kwargs):
        if modalidad_registro not in {"CONSENSO", "INDIVIDUAL"}:
            raise ValidationError("La evaluación debe ser por consenso o individual.")
        if modalidad_registro == "CONSENSO" and evaluador is not None:
            raise ValidationError("La evaluación consensuada no tiene evaluador individual.")
        if modalidad_registro == "INDIVIDUAL":
            if evaluador is None or evaluador.rol_evento != "TRIBUNAL":
                raise ValidationError("La evaluación individual requiere un docente del tribunal.")

    def validar_registro(self, evaluacion):
        if evaluacion.tipo_evaluacion not in {"PUBLICA", "RESULTADO_FINAL"}:
            raise ValidationError({"tipo_evaluacion": "Diplomado solo registra evaluación de defensa pública."})
        if evaluacion.nota_numerica is None or not Decimal("1") <= evaluacion.nota_numerica <= Decimal("100"):
            raise ValidationError({"nota_numerica": "La nota de Diplomado debe estar entre 1 y 100."})

    def get_valores_registro(self, *, evento, tipo, nota):
        return {"ponderacion": Decimal("100.00"), "aporte_ponderado": nota}

    def obtener_evaluacion_para_consolidar(self, *, evaluaciones, **kwargs):
        consensus = evaluaciones.filter(modalidad_registro="CONSENSO")
        if consensus.count() == 1 and evaluaciones.count() == 1:
            return consensus.first()
        individuals = list(evaluaciones.filter(modalidad_registro="INDIVIDUAL"))
        if len(individuals) != 2 or len({item.evaluador_id for item in individuals}) != 2:
            raise ValidationError("La evaluación individual requiere las dos calificaciones docentes.")
        individuals[0]._diplomado_average = sum(item.nota_numerica for item in individuals) / Decimal("2")
        return individuals[0]

    def construir_consolidado(self, evaluacion, usuario):
        from apps.postulantes.models import EvaluacionDefensa
        nota = getattr(evaluacion, "_diplomado_average", None) or evaluacion.nota_numerica
        return EvaluacionDefensa(
            evento=evaluacion.evento, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            nota_numerica=nota, ponderacion=Decimal("100.00"), aporte_ponderado=nota,
            semantica_nota=evaluacion.semantica_nota,
            es_resultado_final_evento=True, registrado_por=usuario,
        )

    def calcular_resultado_final(self, postulacion):
        from apps.postulantes.models import EvaluacionDefensa
        evaluation = EvaluacionDefensa.objects.filter(
            evento__postulacion=postulacion, tipo_evaluacion="RESULTADO_FINAL",
        ).order_by("-id").first()
        note = evaluation.nota_numerica if evaluation else None
        if note is None:
            return {"nota_final": None, "clasificacion": None}
        if note <= 65:
            classification = "POSTERGADO"
        elif note <= 70:
            classification = "APROBADO"
        elif note <= 80:
            classification = "BUENO"
        elif note <= 90:
            classification = "MUY_BUENO"
        else:
            classification = "EXCELENTE"
        return {"nota_final": note, "clasificacion": classification}

    @staticmethod
    def es_resultado_aprobatorio(nota):
        return nota is not None and nota > 65

    def obtener_aprobacion_por_consolidacion(self, *, evento, evaluacion, resultado_final, **kwargs):
        if self.es_resultado_aprobatorio(resultado_final["nota_final"]):
            return "Defensa de Monografía aprobada conforme a la escala del Artículo 26."
        return None

    def obtener_rechazo_por_consolidacion(self, *, evento, evaluacion, resultado_final, **kwargs):
        if resultado_final["nota_final"] is not None and resultado_final["nota_final"] <= 65:
            return "Defensa reprobada o postergada; se habilita una nueva defensa dentro de 30 días calendario."
        return None

    def conservar_rechazo_sin_reintento(self, *, evento, error):
        return isinstance(error, ReintentoNoElegibleError)


class DiplomadoPolicy(BaseModalidadPolicy):
    codigo = "GRADUACION_VIA_DIPLOMADO"
    etapas = ETAPAS
    evento_policy = DiplomadoEventoPolicy()
    evaluacion_policy = DiplomadoEvaluacionPolicy()
    requisitos_policy = DiplomadoRequisitosPolicy()

    def get_reglas_asignacion(self):
        return {"VICERRECTOR_POSGRADO": 1, "DECANO_FACULTAD": 1, "TRIBUNAL": 2}

    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        """Declara la composicion efectiva de la defensa publica de Diplomado."""
        identidad = {"grupo": "COMISION_DEFENSA_DIPLOMADO", "unica_persona": True}
        ocupacion = {
            "aplica": True,
            "ambito": "POSTULACION",
            "motivo": "YA_TIENE_ASIGNACION_VIGENTE_EN_DEFENSA_DIPLOMADO",
            "relevantes": [
                "DECANO_FACULTAD",
                "VICERRECTOR_POSGRADO",
                "DIRECTOR_CARRERA",
                "TRIBUNAL",
            ],
        }
        comun = {
            "ambito": "POSTULACION",
            "restriccion_identidad": identidad,
            "ocupacion_actor": ocupacion,
            "habilitada": True,
            "precondicion": None,
        }
        return {
            "regimen_workflow": getattr(postulacion, "regimen_workflow", None),
            "grupos": [
                {
                    **comun,
                    "clave": "DECANO_DIPLOMADO",
                    "tipo_participacion": "DECANO_FACULTAD",
                    "nombre": "Decano de Facultad",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "obligatoriedad": True,
                    "posiciones": [{
                        "clave": "DECANO_DIPLOMADO_1",
                        "orden_cargo": None,
                        "nombre": "Decano de Facultad",
                    }],
                },
                {
                    **comun,
                    "clave": "VICERRECTOR_POSGRADO_DIPLOMADO",
                    "tipo_participacion": "VICERRECTOR_POSGRADO",
                    "nombre": "Vicerrector de Posgrado",
                    "minimo": 0,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "obligatoriedad": False,
                    "posiciones": [{
                        "clave": "VICERRECTOR_POSGRADO_DIPLOMADO_1",
                        "orden_cargo": None,
                        "nombre": "Vicerrector de Posgrado",
                    }],
                },
                {
                    **comun,
                    "clave": "DIRECTOR_CARRERA_DIPLOMADO",
                    "tipo_participacion": "DIRECTOR_CARRERA",
                    "nombre": "Director de Carrera",
                    "minimo": 0,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "obligatoriedad": False,
                    "posiciones": [{
                        "clave": "DIRECTOR_CARRERA_DIPLOMADO_1",
                        "orden_cargo": None,
                        "nombre": "Director de Carrera",
                    }],
                },
                {
                    **comun,
                    "clave": "TRIBUNAL_DIPLOMADO",
                    "tipo_participacion": "TRIBUNAL",
                    "nombre": "Tribunal docente",
                    "minimo": 2,
                    "maximo": 2,
                    "ordenado": True,
                    "ordenes_permitidos": [1, 2],
                    "obligatoriedad": True,
                    "posiciones": [
                        {"clave": "TRIBUNAL_DIPLOMADO_1", "orden_cargo": 1, "nombre": "Tribunal docente 1"},
                        {"clave": "TRIBUNAL_DIPLOMADO_2", "orden_cargo": 2, "nombre": "Tribunal docente 2"},
                    ],
                },
            ],
        }

    def get_cierre_policy(self):
        return None

    def usa_conclusion_academica_propia(self):
        return True

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if seguimiento is None:
            return None
        if seguimiento.etapa.codigo in {"INSCRIPCION", "REVISION_MONOGRAFIA", "DEFENSA_PUBLICA"}:
            stage_code = seguimiento.etapa.codigo
            stage_name = seguimiento.etapa.nombre
            orientacion_documental = self.get_orientacion_documental_prioritaria(
                postulacion=postulacion,
                seguimiento=seguimiento,
            )
            if orientacion_documental is not None:
                requisitos = orientacion_documental["requisitos"]
                orientacion_documental["requisitos_cumplidos"] = sum(
                    item["cumplido"] is True for item in requisitos
                )
                orientacion_documental["requisitos_totales"] = len(requisitos)
                accion = orientacion_documental["siguiente_accion"]
                if stage_code == "INSCRIPCION" and accion["codigo"] == "COMPLETAR_DOCUMENTOS":
                    accion.update({
                        "titulo": "Gestionar documentos",
                        "descripcion": "Completa los documentos requeridos para continuar con la inscripción.",
                        "accion_label": "Gestionar documentos",
                    })
                return orientacion_documental

            codigos = self.requisitos_policy.get_documentos_requeridos(stage_code)
            if not missing_documents(postulacion, codigos):
                from apps.documentos.models import TipoDocumento
                from apps.postulantes.models import EvaluacionDefensa, EventoDefensa
                from apps.postulantes.workflow import WorkflowService

                nombres = dict(
                    TipoDocumento.objects.filter(codigo__in=codigos, activo=True)
                    .values_list("codigo", "nombre")
                )
                requisitos = [{
                    "tipo": "DOCUMENTO",
                    "codigo": codigo,
                    "nombre": nombres.get(codigo, codigo.replace("_", " ").title()),
                    "cumplido": True,
                    "estado": "APROBADO",
                    "estado_display": "Aprobado",
                    "destino": None,
                } for codigo in codigos]
                if stage_code == "DEFENSA_PUBLICA":
                    evento = EventoDefensa.objects.filter(
                        postulacion=postulacion,
                        seguimiento_etapa=seguimiento,
                        tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
                        numero_intento=seguimiento.numero_intento,
                        activo=True,
                    ).order_by("-id").first()
                    if evento is None:
                        try:
                            self.evento_policy.validar_programacion(
                                seguimiento=seguimiento,
                                asignaciones=postulacion.asignaciones.filter(activo=True),
                            )
                        except ValidationError:
                            accion = {
                                "codigo": "GESTIONAR_ACTORES",
                                "titulo": "Actores de la defensa",
                                "descripcion": "Completa la composición requerida antes de programar la defensa.",
                                "estado": "PENDIENTE",
                                "estado_display": "Pendiente",
                                "destino": "#actores",
                                "accion_label": "Gestionar actores",
                            }
                        else:
                            accion = {
                                "codigo": "PROGRAMAR_EVENTO",
                                "titulo": "Programar defensa pública",
                                "descripcion": "Los requisitos documentales y de actores permiten programar la defensa.",
                                "estado": "DISPONIBLE",
                                "estado_display": "Disponible",
                                "destino": "#defensas",
                                "accion_label": "Programar defensa",
                            }
                    elif evento.estado == EventoDefensa.Estado.PROGRAMADA:
                        accion = {
                            "codigo": "INICIAR_DEFENSA", "titulo": "Iniciar defensa pública",
                            "descripcion": "La defensa está programada y debe gestionarse en Defensas.",
                            "estado": "DISPONIBLE", "estado_display": "Disponible",
                            "destino": "#defensas", "accion_label": "Gestionar defensa",
                        }
                    elif evento.estado == EventoDefensa.Estado.EN_CURSO:
                        accion = {
                            "codigo": "FINALIZAR_DEFENSA", "titulo": "Finalizar defensa pública",
                            "descripcion": "Registra la asistencia y finaliza la defensa cuando se cumpla el quórum.",
                            "estado": "PENDIENTE", "estado_display": "Pendiente",
                            "destino": "#defensas", "accion_label": "Gestionar defensa",
                        }
                    elif evento.estado == EventoDefensa.Estado.FINALIZADA:
                        evaluaciones = evento.evaluaciones.filter(activo=True)
                        consolidado = evaluaciones.filter(
                            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
                            es_resultado_final_evento=True,
                        ).first()
                        if consolidado is not None:
                            accion = None
                        elif evaluaciones.exclude(
                            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
                        ).exists():
                            accion = {
                                "codigo": "CONSOLIDAR_RESULTADO", "titulo": "Consolidar resultado",
                                "descripcion": "La evaluación registrada debe consolidarse para resolver la defensa.",
                                "estado": "DISPONIBLE", "estado_display": "Disponible",
                                "destino": "#defensas", "accion_label": "Consolidar resultado",
                            }
                        else:
                            accion = {
                                "codigo": "REGISTRAR_EVALUACION", "titulo": "Registrar evaluación",
                                "descripcion": "Registra la calificación de la defensa finalizada.",
                                "estado": "PENDIENTE", "estado_display": "Pendiente",
                                "destino": "#defensas", "accion_label": "Registrar evaluación",
                            }
                    else:
                        accion = {
                            "codigo": "PROGRAMAR_EVENTO", "titulo": "Gestionar defensa pública",
                            "descripcion": "Revisa el estado del evento antes de continuar.",
                            "estado": "PENDIENTE", "estado_display": "Pendiente",
                            "destino": "#defensas", "accion_label": "Gestionar defensa",
                        }
                    return {
                        "operacion": "PROGRAMAR_EVENTO",
                        "tipo_evento": EventoDefensa.Tipo.DEFENSA_PUBLICA,
                        "mensaje": "Los siete requisitos documentales de la defensa pública están aprobados.",
                        "requisitos": requisitos,
                        "requisitos_cumplidos": len(requisitos),
                        "requisitos_totales": len(requisitos),
                        "siguiente_accion": accion,
                        "conflictos_identidad": [],
                    }
                return {
                    "operacion": "ORIENTAR_ETAPA",
                    "mensaje": f"Los documentos requeridos de {stage_name} están aprobados.",
                    "requisitos": requisitos,
                    "requisitos_cumplidos": len(requisitos),
                    "requisitos_totales": len(requisitos),
                    "siguiente_accion": {
                        "codigo": "APROBAR_ETAPA",
                        "titulo": f"Aprobar {stage_name}",
                        "descripcion": f"Los requisitos documentales de {stage_name} están aprobados.",
                        "estado": "DISPONIBLE",
                        "estado_display": "Disponible",
                        "destino": "#resumen",
                        "accion_label": "Aprobar etapa",
                    } if "aprobar" in WorkflowService.obtener_acciones_permitidas(seguimiento) else None,
                    "conflictos_identidad": [],
                }
        module_order = MODULE_ORDER_BY_STAGE.get(seguimiento.etapa.codigo)
        if module_order is not None:
            module = postulacion.diplomado_modulos.filter(
                activo=True,
                orden=module_order,
            ).first()
            module_name = "Taller de Investigación" if module_order == 5 else f"Módulo {module_order}"
            approved = module is not None and module.estado == DiplomadoModulo.Estado.APROBADO
            failed = module is not None and module.estado == DiplomadoModulo.Estado.REPROBADO
            note = module.nota if module is not None else None
            requirement = {
                "tipo": "RESULTADO_ACADEMICO",
                "codigo": seguimiento.etapa.codigo,
                "nombre": f"Resultado de {module_name}",
                "cumplido": approved,
                "estado": module.estado if module is not None else DiplomadoModulo.Estado.PENDIENTE,
                "estado_display": (
                    f"{module.get_estado_display()} · Nota: {note}"
                    if module is not None and note is not None
                    else "Pendiente de registro"
                ),
                "destino": None if approved else "#diplomado",
            }
            if approved:
                from apps.postulantes.workflow import WorkflowService

                action = {
                    "codigo": "APROBAR_ETAPA",
                    "titulo": f"Aprobar {module_name}",
                    "descripcion": f"El resultado académico de {module_name} está aprobado.",
                    "estado": "DISPONIBLE",
                    "estado_display": "Disponible",
                    "destino": "#resumen",
                    "accion_label": "Aprobar etapa",
                } if "aprobar" in WorkflowService.obtener_acciones_permitidas(seguimiento) else None
                message = f"El resultado académico de {module_name} está aprobado."
            else:
                action = {
                    "codigo": "REGISTRAR_RESULTADO_MODULO",
                    "titulo": f"{'Actualizar' if failed else 'Registrar'} resultado de {module_name}",
                    "descripcion": (
                        f"{module_name} está reprobado. Registra el resultado académico real que corresponda."
                        if failed
                        else f"Registra la calificación real de {module_name} para continuar."
                    ),
                    "estado": "PENDIENTE",
                    "estado_display": "Pendiente",
                    "destino": "#diplomado",
                    "accion_label": "Gestionar resultado",
                }
                message = (
                    f"El resultado académico de {module_name} está reprobado y bloquea la aprobación de la etapa."
                    if failed
                    else f"Falta registrar el resultado académico de {module_name}."
                )
            return {
                "operacion": "ORIENTAR_ETAPA",
                "mensaje": message,
                "requisitos": [requirement],
                "requisitos_cumplidos": int(approved),
                "requisitos_totales": 1,
                "siguiente_accion": action,
                "conflictos_identidad": [],
            }
        return {
            "operacion": "ORIENTAR_ETAPA", "mensaje": "Completa el seguimiento documental y académico del Diplomado.",
            "requisitos": [{"tipo": "DOCUMENTO", "codigo": code, "nombre": code.replace("_", " ").title(), "cumplido": None, "estado": "PENDIENTE", "destino": "#documentos"} for code in self.requisitos_policy.get_documentos_requeridos(seguimiento.etapa.codigo)],
            "siguiente_accion": {"codigo": "GESTIONAR_ETAPA", "titulo": seguimiento.etapa.nombre, "descripcion": "Completa las condiciones documentales o académicas de la etapa.", "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#resumen"},
            "conflictos_identidad": [],
        }

    def validar_inicio_etapa(self, seguimiento):
        if seguimiento.etapa.codigo == "DEFENSA_PUBLICA":
            previous = postulacion_modulos(seguimiento.postulacion)
            if len(previous) != 5 or any(item.estado != DiplomadoModulo.Estado.APROBADO for item in previous):
                raise ValidationError("Los cinco módulos deben estar aprobados antes de la defensa.")

    def validar_aprobacion_etapa(self, seguimiento):
        module_order = MODULE_ORDER_BY_STAGE.get(seguimiento.etapa.codigo)
        if module_order is not None:
            module = seguimiento.postulacion.diplomado_modulos.filter(
                activo=True,
                orden=module_order,
            ).first()
            if module is None or module.estado != DiplomadoModulo.Estado.APROBADO:
                raise ValidationError({
                    "faltantes": [f"RESULTADO_{seguimiento.etapa.codigo}"],
                })
        if seguimiento.etapa.codigo == "DEFENSA_PUBLICA":
            from apps.postulantes.models import EvaluacionDefensa, EventoDefensa

            evento = EventoDefensa.objects.filter(
                postulacion=seguimiento.postulacion,
                seguimiento_etapa=seguimiento,
                tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
                numero_intento=seguimiento.numero_intento,
                activo=True,
            ).order_by("-id").first()
            if evento is None:
                raise ValidationError({"faltantes": ["EVENTO_DEFENSA_PUBLICA"]})
            if evento.estado != EventoDefensa.Estado.FINALIZADA:
                raise ValidationError({"faltantes": ["DEFENSA_PUBLICA_FINALIZADA"]})
            consolidado = evento.evaluaciones.filter(
                activo=True,
                tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
                es_resultado_final_evento=True,
            ).first()
            if consolidado is None:
                raise ValidationError({"faltantes": ["RESULTADO_FINAL_DEFENSA_PUBLICA"]})
            if not self.evaluacion_policy.es_resultado_aprobatorio(consolidado.nota_numerica):
                raise ValidationError("El resultado consolidado de la defensa pública no es aprobatorio.")
        if seguimiento.etapa.codigo in DOCUMENTS_BY_STAGE:
            missing = missing_documents(seguimiento.postulacion, DOCUMENTS_BY_STAGE[seguimiento.etapa.codigo])
            if missing:
                raise ValidationError({"faltantes": missing})

    def validar_nuevo_intento(self, *, postulacion, etapa, ultimo_seguimiento):
        if etapa.codigo != "DEFENSA_PUBLICA" or ultimo_seguimiento.numero_intento >= 2:
            raise ReintentoNoElegibleError("Solo se permite una nueva defensa de Diplomado.")
        defensa = DiplomadoDefensa.objects.filter(postulacion=postulacion, numero_intento=1).first()
        if not defensa or not defensa.reintento_hasta or timezone.now() > defensa.reintento_hasta:
            raise ReintentoNoElegibleError("La nueva defensa debe realizarse dentro de 30 días calendario.")

    def validar_asignacion(
        self,
        *,
        queryset_contexto,
        tipo_participacion,
        orden_cargo,
        seguimiento_etapa=None,
        **kwargs,
    ):
        if tipo_participacion not in {"VICERRECTOR_POSGRADO", "DECANO_FACULTAD", "DIRECTOR_CARRERA", "TRIBUNAL"}:
            raise ValidationError("El actor no corresponde a Diplomado.")
        if seguimiento_etapa is not None:
            raise ValidationError("Los actores de Defensa Pública deben asignarse en el contexto de postulación.")
        if tipo_participacion == "TRIBUNAL" and orden_cargo not in {1, 2}:
            raise ValidationError("Los docentes del tribunal requieren órdenes 1 y 2.")
        if tipo_participacion == "TRIBUNAL" and queryset_contexto.filter(
            seguimiento_etapa__isnull=True,
            orden_cargo=orden_cargo,
        ).exists():
            raise ValidationError("Ya existe un tribunal activo en esa posición.")
        if tipo_participacion != "TRIBUNAL" and queryset_contexto.exists():
            raise ValidationError("El actor institucional ya está asignado.")

    def validar_conclusion_academica(self, postulacion):
        previous = {code for code, _name in STAGE_DATA[:-1]}
        approved = set(postulacion.seguimientos_etapa.filter(etapa__codigo__in=previous, estado="APROBADA").values_list("etapa__codigo", flat=True))
        if approved != previous:
            raise ValidationError("Todas las etapas previas de Diplomado deben estar aprobadas.")
        if missing_documents(postulacion, DOCUMENTS_BY_STAGE["CONCLUSION_ACADEMICA"]):
            raise ValidationError({"faltantes": missing_documents(postulacion, DOCUMENTS_BY_STAGE["CONCLUSION_ACADEMICA"])})


def postulacion_modulos(postulacion):
    return list(postulacion.diplomado_modulos.filter(activo=True).order_by("orden"))


def missing_documents(postulacion, codes):
    from apps.documentos.models import DocumentoPostulacion, VersionDocumento
    valid = set(DocumentoPostulacion.objects.filter(
        postulacion=postulacion, activo=True, estado__codigo="APR", tipo_documento__codigo__in=codes,
        versiones__activo=True, versiones__es_version_actual=True,
    ).values_list("tipo_documento__codigo", flat=True))
    return sorted(set(codes) - valid)
