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

    def validar_asignacion(self, *, queryset_contexto, tipo_participacion, orden_cargo, **kwargs):
        if tipo_participacion not in {"TRIBUNAL", "PRESIDENTE", "SECRETARIO"}:
            raise ValidationError("Examen de Grado solo admite Tribunal, Presidente y Secretario.")
        if tipo_participacion == "TRIBUNAL" and (orden_cargo is None or not 1 <= orden_cargo <= 3):
            raise ValidationError("El Tribunal del Examen requiere órdenes 1, 2 y 3.")
        if tipo_participacion == "TRIBUNAL" and queryset_contexto.count() >= 3:
            raise ValidationError("El Examen admite tres tribunales.")
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