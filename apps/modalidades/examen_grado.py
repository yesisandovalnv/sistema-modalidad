from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.modalidades.models import ExamenArea
from apps.modalidades.policies import BaseModalidadPolicy, BaseRequisitosPolicy, EtapaDefinition


STAGE_DATA = (
    ("INSCRIPCION", "Inscripción", False, True),
    ("PREPARACION_EXAMEN", "Preparación y habilitación", False, True),
    ("AREA_1", "Área 1: Ciencias Básicas y Matemáticas", True, True),
    ("AREA_2", "Área 2: Ciencias Sociales y Humanísticas", True, True),
    ("AREA_3", "Área 3: Ciencias de la Ingeniería", True, True),
    ("AREA_4", "Área 4: Ingeniería Aplicada", True, True),
    ("DOCUMENTACION_FINAL", "Documentación final", False, True),
    ("CONCLUSION_ACADEMICA", "Conclusión académica", False, True),
)
ETAPAS = tuple(
    EtapaDefinition(
        codigo, nombre, index, inicial=index == 1, final=codigo == "CONCLUSION_ACADEMICA",
        permite_reapertura=repetible, siguientes_permitidas=(STAGE_DATA[index][0],) if index < len(STAGE_DATA) else (),
    )
    for index, (codigo, nombre, repetible, obligatoria) in enumerate(STAGE_DATA, start=1)
)

AREA_DATA = (
    ("AREA_1", "Área 1: Ciencias Básicas y Matemáticas", Decimal("15.00")),
    ("AREA_2", "Área 2: Ciencias Sociales y Humanísticas", Decimal("15.00")),
    ("AREA_3", "Área 3: Ciencias de la Ingeniería", Decimal("30.00")),
    ("AREA_4", "Área 4: Ingeniería Aplicada", Decimal("40.00")),
)


class ExamenGradoRequisitosPolicy(BaseRequisitosPolicy):
    DOCUMENTS_BY_STAGE = {
        "INSCRIPCION": ("CARTA_SOLICITUD_EXAMEN", "MATRICULA_VIGENTE", "HISTORIAL_ACADEMICO", "FOLDER_AMARILLO"),
        "PREPARACION_EXAMEN": (),
        "AREA_1": (), "AREA_2": (), "AREA_3": (), "AREA_4": (),
        "DOCUMENTACION_FINAL": ("ACTA_EXAMEN", "HOJA_APROBACION_EXAMEN"),
        "CONCLUSION_ACADEMICA": ("ACTA_EXAMEN", "HOJA_APROBACION_EXAMEN"),
    }

    def get_documentos_requeridos(self, fase=None):
        if fase is not None:
            return tuple(self.DOCUMENTS_BY_STAGE.get(fase, ()))
        return tuple(dict.fromkeys(code for values in self.DOCUMENTS_BY_STAGE.values() for code in values))


class ExamenGradoPolicy(BaseModalidadPolicy):
    codigo = "EXAMEN_GRADO"
    etapas = ETAPAS
    requisitos_policy = ExamenGradoRequisitosPolicy()

    def validate_configuration(self):
        return [error for error in super().validate_configuration() if "evaluaciones sin eventos compatibles" not in error and "Política de cierre no disponible" not in error]

    def get_capabilities(self, modalidad=None):
        capabilities = super().get_capabilities(modalidad)
        capabilities.evaluaciones_soportadas = True
        capabilities.tipos_evaluacion = ["AREA"]
        return capabilities

    def get_reglas_asignacion(self):
        return {"TRIBUNAL": 3, "PRESIDENTE": 1, "SECRETARIO": 1}

    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        """Declara la composición institucional única del Examen de Grado."""
        identidad = {"grupo": "COMISION_EXAMEN_GRADO", "unica_persona": True}
        ocupacion = {
            "aplica": True,
            "ambito": "POSTULACION",
            "motivo": "YA_TIENE_ASIGNACION_VIGENTE_EN_EXAMEN",
            "relevantes": ["TRIBUNAL", "PRESIDENTE", "SECRETARIO"],
        }
        comun = {
            "ambito": "POSTULACION",
            "ocupacion_actor": ocupacion,
            "restriccion_identidad": identidad,
            "obligatoriedad": True,
            "habilitada": True,
            "precondicion": None,
        }
        return {
            "regimen_workflow": getattr(postulacion, "regimen_workflow", None),
            "grupos": [
                {
                    **comun, "clave": "TRIBUNAL_EXAMEN", "tipo_participacion": "TRIBUNAL",
                    "nombre": "Tribunal evaluador", "minimo": 3, "maximo": 3,
                    "ordenado": True, "ordenes_permitidos": [1, 2, 3],
                    "posiciones": [
                        {"clave": f"TRIBUNAL_EXAMEN_{orden}", "orden_cargo": orden, "nombre": f"Tribunal {orden}"}
                        for orden in (1, 2, 3)
                    ],
                },
                {
                    **comun, "clave": "PRESIDENTE_EXAMEN", "tipo_participacion": "PRESIDENTE",
                    "nombre": "Presidente", "minimo": 1, "maximo": 1,
                    "ordenado": False, "ordenes_permitidos": [],
                    "posiciones": [{"clave": "PRESIDENTE_EXAMEN_1", "orden_cargo": None, "nombre": "Presidente"}],
                },
                {
                    **comun, "clave": "SECRETARIO_EXAMEN", "tipo_participacion": "SECRETARIO",
                    "nombre": "Secretario", "minimo": 1, "maximo": 1,
                    "ordenado": False, "ordenes_permitidos": [],
                    "posiciones": [{"clave": "SECRETARIO_EXAMEN_1", "orden_cargo": None, "nombre": "Secretario"}],
                },
            ],
        }

    def resolver_composicion_activa(self, postulacion, area=None):
        """Resuelve composición e incompatibilidades con notas del intento vigente."""
        from apps.modalidades.models import ExamenEvaluacion

        asignaciones = list(postulacion.asignaciones.filter(
            activo=True, seguimiento_etapa__isnull=True,
            tipo_participacion__in=("TRIBUNAL", "PRESIDENTE", "SECRETARIO"),
        ).select_related("usuario").order_by("tipo_participacion", "orden_cargo", "pk"))
        tribunales = [item for item in asignaciones if item.tipo_participacion == "TRIBUNAL"]
        presidentes = [item for item in asignaciones if item.tipo_participacion == "PRESIDENTE"]
        secretarios = [item for item in asignaciones if item.tipo_participacion == "SECRETARIO"]
        por_orden = {orden: [item for item in tribunales if item.orden_cargo == orden] for orden in (1, 2, 3)}
        faltantes = [
            {"codigo": f"TRIBUNAL_{orden}", "nombre": f"Tribunal {orden}"}
            for orden, items in por_orden.items() if not items
        ]
        if not presidentes:
            faltantes.append({"codigo": "PRESIDENTE", "nombre": "Presidente"})
        if not secretarios:
            faltantes.append({"codigo": "SECRETARIO", "nombre": "Secretario"})

        inconsistencias = []
        if len(tribunales) != 3 or any(len(items) != 1 for items in por_orden.values()):
            inconsistencias.append("El tribunal debe tener exactamente las posiciones 1, 2 y 3 activas.")
        if len(presidentes) > 1:
            inconsistencias.append("Existe más de un Presidente activo.")
        if len(secretarios) > 1:
            inconsistencias.append("Existe más de un Secretario activo.")
        usuarios = [item.usuario_id for item in asignaciones]
        if len(usuarios) != len(set(usuarios)):
            inconsistencias.append("Una misma persona ocupa más de una posición activa.")

        evaluadores_historicos = []
        if area is not None:
            evaluadores_historicos = list(ExamenEvaluacion.objects.filter(
                area=area, intento=area.intento_actual,
                modalidad_registro=ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL,
                evaluador_id__isnull=False,
            ).values_list("evaluador_id", flat=True))
            activos = {item.usuario_id for item in tribunales}
            if set(evaluadores_historicos) - activos:
                inconsistencias.append(
                    "Existen calificaciones individuales de evaluadores que ya no pertenecen al tribunal activo."
                )

        errores_composicion = [
            error for error in inconsistencias
            if not error.startswith("Existen calificaciones individuales")
        ]
        completa = not faltantes and not errores_composicion
        return {
            "tribunales": tribunales,
            "presidente": presidentes[0] if len(presidentes) == 1 else None,
            "secretario": secretarios[0] if len(secretarios) == 1 else None,
            "faltantes": faltantes,
            "inconsistencias": inconsistencias,
            "completa": completa,
            "evaluable": completa and not inconsistencias,
            "evaluadores_historicos": evaluadores_historicos,
        }

    def get_cierre_policy(self):
        return None

    def usa_conclusion_academica_propia(self):
        return True

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if seguimiento is None:
            return None
        stage = seguimiento.etapa.codigo
        requirements = []
        if stage in {"INSCRIPCION", "DOCUMENTACION_FINAL"}:
            from apps.documentos.models import DocumentoPostulacion, VersionDocumento

            codes = self.requisitos_policy.DOCUMENTS_BY_STAGE[stage]
            for code in codes:
                document = DocumentoPostulacion.objects.filter(
                    postulacion=postulacion, tipo_documento__codigo=code, activo=True,
                ).select_related("estado").first()
                valid = bool(document and document.estado.codigo == "APR" and not document.requiere_correccion and VersionDocumento.objects.filter(
                    documento=document, activo=True, es_version_actual=True,
                ).exists())
                requirements.append({
                    "tipo": "DOCUMENTO", "codigo": code, "nombre": code.replace("_", " ").title(),
                    "cumplido": valid, "estado": "CUMPLIDO" if valid else "PENDIENTE",
                    "estado_display": "Aprobado y vigente" if valid else "Pendiente", "destino": "#documentos",
                })
            complete = all(item["cumplido"] for item in requirements)
            action = {
                "codigo": "APROBAR_ETAPA" if complete else "COMPLETAR_DOCUMENTOS",
                "titulo": "Aprobar etapa" if complete else "Completar documentos",
                "descripcion": "Los documentos normativos están completos." if complete else "Carga y aprueba los documentos requeridos por la normativa.",
                "estado": "DISPONIBLE" if complete else "PENDIENTE",
                "estado_display": "Disponible" if complete else "Pendiente", "destino": "#documentos",
                "accion_label": "Ir a documentos",
            }
        elif stage == "PREPARACION_EXAMEN":
            composicion = self.resolver_composicion_activa(postulacion)
            if not composicion["evaluable"]:
                requirements = self._requisitos_composicion(composicion)
                action = self._accion_gestionar_actores(composicion)
            else:
                action = {
                    "codigo": "APROBAR_ETAPA" if seguimiento.estado in ("EN_PROCESO", "OBSERVADA") else "INICIAR_ETAPA",
                    "titulo": "Aprobar preparación" if seguimiento.estado in ("EN_PROCESO", "OBSERVADA") else "Iniciar preparación",
                    "descripcion": "Verifica el cronograma y la habilitación normativa antes de avanzar al Área 1.",
                    "estado": "DISPONIBLE", "estado_display": "Disponible", "destino": "#resumen",
                    "accion_label": "Ir a etapa",
                }
        elif stage.startswith("AREA_"):
            area = self._area(postulacion, stage)
            complete = bool(area and area.estado == ExamenArea.Estado.APROBADA)
            composicion = self.resolver_composicion_activa(postulacion, area=area)
            if not complete and not composicion["evaluable"]:
                requirements = self._requisitos_composicion(composicion)
                action = self._accion_gestionar_actores(composicion)
            else:
                action = {
                    "codigo": "REGISTRAR_EVALUACION_AREA", "titulo": "Registrar evaluación del área",
                    "descripcion": "Registra la nota del área entre 0 y 100.", "estado": "PENDIENTE" if not complete else "DISPONIBLE",
                    "estado_display": "Pendiente" if not complete else "Disponible", "destino": "#examen",
                    "accion_label": "Ir a evaluación",
                }
            requirements.append({"tipo": "EVALUACION", "codigo": stage, "nombre": area.nombre if area else stage, "cumplido": complete, "estado": "CUMPLIDO" if complete else "PENDIENTE", "estado_display": "Aprobada" if complete else "Pendiente", "destino": "#examen"})
        elif stage == "DOCUMENTACION_FINAL":
            action = {"codigo": "CARGAR_DOCUMENTOS", "titulo": "Completar documentación final", "descripcion": "Carga y aprueba el Acta de Examen y la Hoja de Aprobación.", "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#documentos", "accion_label": "Ir a documentos"}
        elif stage == "CONCLUSION_ACADEMICA":
            areas = {area.codigo: area.estado for area in postulacion.examen_areas.filter(codigo__in={code for code, _name, _weight in AREA_DATA})}
            complete = all(areas.get(code) == "APROBADA" for code, _name, _weight in AREA_DATA)
            requirements = [{"tipo": "RESULTADO", "codigo": code, "nombre": name, "cumplido": areas.get(code) == "APROBADA", "estado": "CUMPLIDO" if areas.get(code) == "APROBADA" else "PENDIENTE", "estado_display": "Aprobada" if areas.get(code) == "APROBADA" else "Pendiente", "destino": "#examen"} for code, name, _weight in AREA_DATA]
            action = {"codigo": "CONCLUIR_ACADEMICAMENTE", "titulo": "Concluir académicamente", "descripcion": "Las condiciones normativas del Examen están completas.", "estado": "DISPONIBLE", "estado_display": "Disponible", "destino": "#resumen", "accion_label": "Ir a conclusión"}
        else:
            action = {"codigo": "GESTIONAR_ETAPA", "titulo": "Gestionar etapa", "descripcion": "Completa las condiciones de la etapa actual.", "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#resumen", "accion_label": "Ir a gestionar"}
        return {"operacion": "ORIENTAR_ETAPA", "mensaje": "Sigue las condiciones normativas del Examen de Grado por Contenidos.", "requisitos": requirements, "siguiente_accion": action, "conflictos_identidad": []}

    def _area(self, postulacion, stage):
        return postulacion.examen_areas.filter(codigo=stage).first()

    @staticmethod
    def _requisitos_composicion(composicion):
        requisitos = [{
            "tipo": "ACTOR", "codigo": item["codigo"], "nombre": item["nombre"],
            "cumplido": False, "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#actores",
        } for item in composicion["faltantes"]]
        requisitos.extend({
            "tipo": "ACTOR", "codigo": f"INCONSISTENCIA_{index}", "nombre": mensaje,
            "cumplido": False, "estado": "BLOQUEADO", "estado_display": "Requiere corrección", "destino": "#actores",
        } for index, mensaje in enumerate(composicion["inconsistencias"], start=1))
        return requisitos

    @staticmethod
    def _accion_gestionar_actores(composicion):
        detalle = composicion["inconsistencias"][0] if composicion["inconsistencias"] else "Completa las cinco posiciones requeridas."
        return {
            "codigo": "GESTIONAR_ACTORES", "titulo": "Completar composición del Examen",
            "descripcion": detalle, "estado": "PENDIENTE", "estado_display": "Pendiente",
            "destino": "#actores", "accion_label": "Gestionar actores",
        }

    def validar_inicio_etapa(self, seguimiento):
        if seguimiento.etapa.codigo.startswith("AREA_"):
            order = int(seguimiento.etapa.codigo.split("_")[1])
            if order > 1:
                previous = f"AREA_{order - 1}"
                if not seguimiento.postulacion.seguimientos_etapa.filter(etapa__codigo=previous, estado="APROBADA").exists():
                    raise ValidationError("Las áreas del Examen deben aprobarse secuencialmente.")

    def validar_aprobacion_etapa(self, seguimiento):
        if seguimiento.etapa.codigo.startswith("AREA_"):
            area = self._area(seguimiento.postulacion, seguimiento.etapa.codigo)
            if not area or area.estado != ExamenArea.Estado.APROBADA:
                raise ValidationError("El área requiere una evaluación aprobada.")
        if seguimiento.etapa.codigo == "DOCUMENTACION_FINAL":
            missing = self._missing_documents(seguimiento.postulacion)
            if missing:
                raise ValidationError({"documentos": missing})

    def validar_nuevo_intento(self, *, postulacion, etapa, ultimo_seguimiento):
        if not etapa.codigo.startswith("AREA_"):
            raise ValidationError("Solo las áreas del Examen permiten reintento.")
        if ultimo_seguimiento.numero_intento >= 2:
            raise ValidationError("Una segunda nota insuficiente obliga a optar por otra modalidad de graduación.")
        area = self._area(postulacion, etapa.codigo)
        if area and area.reintento_hasta and timezone.now() > area.reintento_hasta:
            raise ValidationError("El nuevo examen debe realizarse dentro de los 15 días calendario.")

    def validar_asignacion(self, *, queryset_contexto, tipo_participacion, orden_cargo, seguimiento_etapa=None, **kwargs):
        if tipo_participacion not in {"TRIBUNAL", "PRESIDENTE", "SECRETARIO"}:
            raise ValidationError("Examen de Grado solo admite Tribunal, Presidente y Secretario.")
        if seguimiento_etapa is not None:
            raise ValidationError("Los actores del Examen de Grado se asignan en el ámbito de la postulación.")
        if tipo_participacion == "TRIBUNAL" and (orden_cargo is None or not 1 <= orden_cargo <= 3):
            raise ValidationError("El Tribunal del Examen requiere órdenes 1, 2 y 3.")
        if tipo_participacion == "TRIBUNAL" and queryset_contexto.filter(orden_cargo=orden_cargo).exists():
            raise ValidationError("Ya existe un tribunal activo en esa posición.")
        if tipo_participacion == "TRIBUNAL" and queryset_contexto.count() >= 3:
            raise ValidationError("El Examen admite tres tribunales.")
        if tipo_participacion in {"PRESIDENTE", "SECRETARIO"} and orden_cargo is not None:
            raise ValidationError(f"{tipo_participacion.title()} no utiliza orden de cargo.")
        if tipo_participacion in {"PRESIDENTE", "SECRETARIO"} and queryset_contexto.count() >= 1:
            raise ValidationError(f"El Examen admite un único {tipo_participacion.lower()}.")

    def validar_conclusion_academica(self, postulacion):
        if not all(postulacion.seguimientos_etapa.filter(etapa__codigo=code, estado="APROBADA").exists() for code, _, _, _ in STAGE_DATA[:-1]):
            raise ValidationError("Todas las etapas del Examen deben estar aprobadas.")
        if self._missing_documents(postulacion):
            raise ValidationError({"documentos": self._missing_documents(postulacion)})

    def get_documentos_aprobados_finales(self, postulacion):
        return not self._missing_documents(postulacion)

    def _missing_documents(self, postulacion):
        from apps.documentos.models import DocumentoPostulacion
        required = set(self.requisitos_policy.get_documentos_requeridos("DOCUMENTACION_FINAL"))
        existing = set(DocumentoPostulacion.objects.filter(postulacion=postulacion, activo=True, estado__codigo="APR", tipo_documento__codigo__in=required).values_list("tipo_documento__codigo", flat=True))
        return sorted(required - existing)
