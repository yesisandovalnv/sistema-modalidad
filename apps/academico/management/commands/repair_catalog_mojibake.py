import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academico.management.commands.seed_initial_data import (
    OFFICIAL_ETAPAS_MODALIDAD,
    OFFICIAL_TIPOS_DOCUMENTO,
)
from apps.academico.models import EtapaModalidad, Requisito
from apps.documentos.models import TipoDocumento
from apps.modalidades.tesis_grado import TesisGradoRequisitosPolicy


MOJIBAKE_MARKERS = ("├", "Ã", "Â")
EXPECTED_RECORD_COUNTS = {
    "TipoDocumento": 46,
    "EtapaModalidad": 38,
    "Requisito": 43,
}
EXPECTED_FIELD_COUNTS = {
    "TipoDocumento": 75,
    "EtapaModalidad": 66,
    "Requisito": 70,
}

TYPE_DOCUMENT_TARGETS = (
    (47, "ACTA_DEFENSA_DIPL", ("descripcion",)),
    (31, "ACTA_EXCELENCIA", ("nombre", "descripcion")),
    (38, "ADMISION_DIPL", ("nombre", "descripcion")),
    (35, "BOLETA_PROG_DIPL", ("nombre",)),
    (44, "BOLETA_DEFENSA_DIPL", ("nombre", "descripcion")),
    (32, "CARTA_DIPLOMADO", ("nombre", "descripcion")),
    (21, "CARTA_EXCELENCIA", ("nombre", "descripcion")),
    (49, "CARTA_SOLICITUD_TD", ("descripcion",)),
    (37, "CEDULA_IDENTIDAD", ("nombre", "descripcion")),
    (25, "CERT_DIR_CARRERA", ("nombre", "descripcion")),
    (26, "CERT_INST_INVEST", ("nombre", "descripcion")),
    (63, "CERT_ADMISION_TD", ("nombre", "descripcion")),
    (41, "NOTAS_MODULOS_DIPL", ("nombre", "descripcion")),
    (27, "CERT_PLANIFICACION", ("nombre", "descripcion")),
    (52, "FOLDER_AMARILLO_TD", ("descripcion",)),
    (18, "FOLDER_AMARILLO", ("nombre", "descripcion")),
    (24, "FOLDER_EXCELENCIA", ("nombre", "descripcion")),
    (17, "HISTORIAL_ACADEMICO", ("nombre", "descripcion")),
    (23, "HISTORIAL_EXCELENCIA", ("nombre", "descripcion")),
    (61, "HISTORIAL_PLAN_TD", ("nombre", "descripcion")),
    (36, "HISTORIAL_DIPLOMADO", ("nombre",)),
    (51, "HISTORIAL_PRERREQ_TD", ("descripcion",)),
    (6, "HOJA_APROBACION", ("nombre", "descripcion")),
    (20, "HOJA_APROBACION_EXAMEN", ("nombre", "descripcion")),
    (70, "OBSERVACIONES_DEFENSA_PERFIL", ("descripcion",)),
    (62, "INFORME_CONCLUSION_TUTOR_TD", ("nombre", "descripcion")),
    (9, "INFORME_REVISION_TRIBUNAL_PREVIA", ("nombre", "descripcion")),
    (54, "INFORME_TUTOR_PERFIL_TD", ("descripcion",)),
    (7, "INFORME_FINAL_TUTOR", ("descripcion",)),
    (56, "INFORME_SUPERVISION_TD", ("descripcion",)),
    (33, "MATRICULA_DIPLOMADO", ("nombre", "descripcion")),
    (50, "MATRICULA_VIGENTE_TD", ("nombre", "descripcion")),
    (43, "MATR_DEFENSA_DIPL", ("nombre", "descripcion")),
    (66, "MATRICULA_DEFENSA_TD", ("nombre", "descripcion")),
    (40, "MONOGRAFIA_DIPLOMADO", ("nombre", "descripcion")),
    (48, "MONOGRAFIA_EMPAST_D", ("nombre", "descripcion")),
    (60, "OFICIO_PRESENTACION_TD", ("descripcion",)),
    (53, "PERFIL_TRABAJO_DIRIGIDO", ("descripcion",)),
    (22, "RECIBO_MATRICULA_EXC", ("nombre", "descripcion")),
    (34, "SOLICITUD_AREA_DIPL", ("nombre", "descripcion")),
    (65, "SOLVENCIA_BIBLIO_TD", ("descripcion",)),
    (46, "SOLV_POSGRADO_DIPL", ("nombre", "descripcion")),
    (39, "SOLVENCIA_DIPLOMADO", ("descripcion",)),
    (30, "TIMBRE_EXCELENCIA", ("nombre",)),
    (45, "TIMBRE_DEFENSA_DIPL", ("descripcion",)),
    (67, "TIMBRE_DEFENSA_TD", ("descripcion",)),
)

STAGE_TARGETS = (
    (17, "EXAMEN_GRADO", "INSCRIPCION", ("nombre", "origen_normativo")),
    (18, "EXAMEN_GRADO", "PREPARACION_EXAMEN", ("nombre", "origen_normativo")),
    (19, "EXAMEN_GRADO", "AREA_1", ("nombre", "origen_normativo")),
    (20, "EXAMEN_GRADO", "AREA_2", ("nombre", "origen_normativo")),
    (21, "EXAMEN_GRADO", "AREA_3", ("nombre", "origen_normativo")),
    (22, "EXAMEN_GRADO", "AREA_4", ("nombre", "origen_normativo")),
    (23, "EXAMEN_GRADO", "DOCUMENTACION_FINAL", ("nombre", "origen_normativo")),
    (24, "EXAMEN_GRADO", "CONCLUSION_ACADEMICA", ("nombre", "origen_normativo")),
    (25, "EXCELENCIA_ACADEMICA", "INSCRIPCION", ("nombre", "origen_normativo")),
    (26, "EXCELENCIA_ACADEMICA", "REVISION_REQUISITOS", ("nombre", "origen_normativo")),
    (27, "EXCELENCIA_ACADEMICA", "EVALUACION_TRIBUNAL", ("nombre", "origen_normativo")),
    (28, "EXCELENCIA_ACADEMICA", "REGISTRO_ACTA", ("origen_normativo",)),
    (29, "EXCELENCIA_ACADEMICA", "CONCLUSION_ACADEMICA", ("nombre", "origen_normativo")),
    (30, "GRADUACION_VIA_DIPLOMADO", "INSCRIPCION", ("nombre", "origen_normativo")),
    (31, "GRADUACION_VIA_DIPLOMADO", "MODULO_1", ("nombre", "origen_normativo")),
    (32, "GRADUACION_VIA_DIPLOMADO", "MODULO_2", ("nombre", "origen_normativo")),
    (33, "GRADUACION_VIA_DIPLOMADO", "MODULO_3", ("nombre", "origen_normativo")),
    (34, "GRADUACION_VIA_DIPLOMADO", "MODULO_4", ("nombre", "origen_normativo")),
    (35, "GRADUACION_VIA_DIPLOMADO", "TALLER_INVESTIGACION", ("nombre", "origen_normativo")),
    (36, "GRADUACION_VIA_DIPLOMADO", "REVISION_MONOGRAFIA", ("nombre", "origen_normativo")),
    (37, "GRADUACION_VIA_DIPLOMADO", "DEFENSA_PUBLICA", ("nombre", "origen_normativo")),
    (38, "GRADUACION_VIA_DIPLOMADO", "CIERRE_DOCUMENTAL", ("origen_normativo",)),
    (39, "GRADUACION_VIA_DIPLOMADO", "CONCLUSION_ACADEMICA", ("nombre", "origen_normativo")),
    (1, "PROYECTO_GRADO", "INSCRIPCION", ("nombre", "origen_normativo")),
    (2, "PROYECTO_GRADO", "PERFIL_PROYECTO", ("origen_normativo",)),
    (3, "PROYECTO_GRADO", "DOCUMENTO_FINAL", ("origen_normativo",)),
    (4, "PROYECTO_GRADO", "REVISION_TRIBUNAL_PREVIA", ("nombre", "origen_normativo")),
    (5, "PROYECTO_GRADO", "DEFENSA_PRIVADA", ("origen_normativo",)),
    (6, "PROYECTO_GRADO", "DEFENSA_PUBLICA", ("nombre", "origen_normativo")),
    (7, "PROYECTO_GRADO", "REVISION_FINAL_POST_PUBLICA", ("nombre", "origen_normativo")),
    (8, "PROYECTO_GRADO", "CIERRE_DOCUMENTAL", ("origen_normativo",)),
    (40, "TRABAJO_DIRIGIDO", "INSCRIPCION", ("nombre", "origen_normativo")),
    (41, "TRABAJO_DIRIGIDO", "PERFIL_TRABAJO_DIRIGIDO", ("origen_normativo",)),
    (42, "TRABAJO_DIRIGIDO", "DESARROLLO_TRABAJO_DIRIGIDO", ("origen_normativo",)),
    (43, "TRABAJO_DIRIGIDO", "DOCUMENTO_FINAL", ("origen_normativo",)),
    (44, "TRABAJO_DIRIGIDO", "REVISION_TRIBUNAL_PREVIA", ("nombre", "origen_normativo")),
    (45, "TRABAJO_DIRIGIDO", "DEFENSA_PRIVADA", ("origen_normativo",)),
    (46, "TRABAJO_DIRIGIDO", "DEFENSA_PUBLICA", ("nombre", "origen_normativo")),
)

REQUIREMENT_TARGETS = (
    (35, "ACTA_DEFENSA_DIPL", ("descripcion",)),
    (19, "ACTA_EXCELENCIA", ("nombre", "descripcion")),
    (26, "ADMISION_DIPL", ("nombre", "descripcion")),
    (23, "BOLETA_PROG_DIPL", ("nombre",)),
    (32, "BOLETA_DEFENSA_DIPL", ("nombre", "descripcion")),
    (56, "CARTA_CONFORMIDAD_INSTITUCION_TD", ("descripcion",)),
    (20, "CARTA_DIPLOMADO", ("nombre", "descripcion")),
    (9, "CARTA_EXCELENCIA", ("nombre", "descripcion")),
    (37, "CARTA_SOLICITUD_TD", ("descripcion",)),
    (25, "CEDULA_IDENTIDAD", ("nombre", "descripcion")),
    (13, "CERT_DIR_CARRERA", ("nombre", "descripcion")),
    (14, "CERT_INST_INVEST", ("nombre", "descripcion")),
    (51, "CERT_ADMISION_TD", ("nombre", "descripcion")),
    (29, "NOTAS_MODULOS_DIPL", ("nombre", "descripcion")),
    (15, "CERT_PLANIFICACION", ("nombre", "descripcion")),
    (43, "CONVENIO_TRABAJO_DIRIGIDO", ("descripcion",)),
    (45, "DOCUMENTO_FINAL_TD", ("descripcion",)),
    (40, "FOLDER_AMARILLO_TD", ("nombre", "descripcion")),
    (12, "FOLDER_EXCELENCIA", ("nombre", "descripcion")),
    (11, "HISTORIAL_EXCELENCIA", ("nombre", "descripcion")),
    (49, "HISTORIAL_PLAN_TD", ("nombre", "descripcion")),
    (24, "HISTORIAL_DIPLOMADO", ("nombre",)),
    (39, "HISTORIAL_PRERREQ_TD", ("descripcion",)),
    (50, "INFORME_CONCLUSION_TUTOR_TD", ("nombre", "descripcion")),
    (42, "INFORME_TUTOR_PERFIL_TD", ("descripcion",)),
    (47, "INFORME_REVISION_TRIBUNAL_TD", ("nombre",)),
    (44, "INFORME_SUPERVISION_TD", ("nombre", "descripcion")),
    (21, "MATRICULA_DIPLOMADO", ("nombre", "descripcion")),
    (38, "MATRICULA_VIGENTE_TD", ("nombre", "descripcion")),
    (31, "MATR_DEFENSA_DIPL", ("nombre", "descripcion")),
    (54, "MATRICULA_DEFENSA_TD", ("nombre", "descripcion")),
    (28, "MONOGRAFIA_DIPLOMADO", ("nombre", "descripcion")),
    (36, "MONOGRAFIA_EMPAST_D", ("nombre", "descripcion")),
    (48, "OFICIO_PRESENTACION_TD", ("nombre", "descripcion")),
    (41, "PERFIL_TRABAJO_DIRIGIDO", ("descripcion",)),
    (10, "RECIBO_MATRICULA_EXC", ("nombre", "descripcion")),
    (22, "SOLICITUD_AREA_DIPL", ("nombre", "descripcion")),
    (53, "SOLVENCIA_BIBLIO_TD", ("descripcion",)),
    (34, "SOLV_POSGRADO_DIPL", ("nombre", "descripcion")),
    (27, "SOLVENCIA_DIPLOMADO", ("descripcion",)),
    (18, "TIMBRE_EXCELENCIA", ("nombre",)),
    (33, "TIMBRE_DEFENSA_DIPL", ("descripcion",)),
    (55, "TIMBRE_DEFENSA_TD", ("descripcion",)),
)


class Command(BaseCommand):
    help = "Repara etiquetas canónicas allowlisted; dry-run por defecto."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica el plan tras validar códigos, valores y conteos allowlisted.",
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            plans = self._build_plans()
            self._check_counts(plans)
            self._print_plan(plans)
            if not options["apply"]:
                self.stdout.write(self.style.WARNING("Dry-run: no se modificaron filas."))
                return

            self._apply_plans(plans)
            counts = {
                name: sum(plan["model_name"] == name for plan in plans)
                for name in EXPECTED_RECORD_COUNTS
            }
            self.stdout.write(self.style.SUCCESS(f"Reparación aplicada: {counts}; {len(plans)} campos."))

    def _build_plans(self):
        requirements_path = Path(__file__).resolve().parents[2] / "data" / "requisitos_oficiales.json"
        payload = json.loads(requirements_path.read_text(encoding="utf-8"))
        non_thesis_documents = [
            document
            for modality in payload["modalidades"]
            if modality["codigo_modalidad"] != "TESIS_GRADO"
            for document in modality["tipos_documento"]
        ]
        thesis_document_codes = {
            code
            for documents in TesisGradoRequisitosPolicy.DOCUMENTS_BY_STAGE.values()
            for code in documents
        }

        type_sources = {}
        for document in OFFICIAL_TIPOS_DOCUMENTO:
            type_sources.setdefault(document["codigo"], []).append(
                (document, "seed_initial_data.py:OFFICIAL_TIPOS_DOCUMENTO")
            )
        for document in non_thesis_documents:
            type_sources.setdefault(document["codigo"], []).append(
                (document, "requisitos_oficiales.json")
            )

        type_rows = []
        for pk, code, fields in TYPE_DOCUMENT_TARGETS:
            if code in thesis_document_codes:
                raise CommandError(f"Tesis document code is forbidden in allowlist: {code}")
            obj = self._locked(TipoDocumento, pk, "TipoDocumento", code)
            for field in fields:
                sources = [(data[field], source) for data, source in type_sources.get(code, ()) if data.get(field) is not None]
                type_rows.append(self._entry("TipoDocumento", obj, code, field, sources))

        stage_sources = {
            (modality_code, stage["codigo"]): stage
            for modality_code, stages in OFFICIAL_ETAPAS_MODALIDAD.items()
            if modality_code != "TESIS_GRADO"
            for stage in stages
        }
        stage_rows = []
        for pk, modality_code, code, fields in STAGE_TARGETS:
            obj = self._locked(EtapaModalidad, pk, "EtapaModalidad", f"{modality_code}:{code}")
            if obj.modalidad.codigo != modality_code or modality_code == "TESIS_GRADO":
                self._mismatch("EtapaModalidad", pk, f"{modality_code}:{code}", "modalidad", obj.modalidad.codigo)
            canonical = stage_sources.get((modality_code, code))
            if canonical is None:
                self._mismatch("EtapaModalidad", pk, f"{modality_code}:{code}", "codigo", code)
            for field in fields:
                stage_rows.append(self._entry(
                    "EtapaModalidad", obj, f"{modality_code}:{code}", field,
                    [(canonical[field], "seed_initial_data.py:OFFICIAL_ETAPAS_MODALIDAD")],
                ))

        requirement_sources = {}
        for document in non_thesis_documents:
            requirement_sources.setdefault(document["codigo"], []).append(document)
        thesis_requirement_codes = set(
            Requisito.all_objects.filter(
                modalidades__modalidad__codigo="TESIS_GRADO",
            ).values_list("codigo", flat=True)
        )
        requirement_rows = []
        for pk, code, fields in REQUIREMENT_TARGETS:
            if code in thesis_requirement_codes:
                raise CommandError(f"Tesis requirement code is forbidden in allowlist: {code}")
            obj = self._locked(Requisito, pk, "Requisito", code)
            for field in fields:
                sources = [
                    (document[field], "requisitos_oficiales.json")
                    for document in requirement_sources.get(code, ())
                    if document.get(field) is not None
                ]
                requirement_rows.append(self._entry("Requisito", obj, code, field, sources))

        plans = type_rows + stage_rows + requirement_rows
        keys = {(plan["model_name"], plan["pk"], plan["field"]) for plan in plans}
        if len(keys) != len(plans):
            raise CommandError("Allowlist contiene campos duplicados.")
        return plans

    @staticmethod
    def _locked(model, pk, model_name, stable_code):
        try:
            obj = model.all_objects.select_for_update().get(pk=pk)
        except model.DoesNotExist:
            raise CommandError(f"Discrepancia: {model_name} id={pk} code={stable_code} no existe.")

        if obj.codigo != stable_code and model_name != "EtapaModalidad":
            Command._mismatch(model_name, pk, stable_code, "codigo", obj.codigo)
        if model_name == "EtapaModalidad" and obj.codigo != stable_code.split(":", 1)[1]:
            Command._mismatch(model_name, pk, stable_code, "codigo", obj.codigo)
        return obj

    @staticmethod
    def _mismatch(model_name, pk, stable_code, field, actual):
        raise CommandError(
            f"Discrepancia: {model_name} id={pk} code={stable_code} "
            f"field={field}; actual={actual!r}. Transacción cancelada."
        )

    def _entry(self, model_name, obj, stable_code, field, sources):
        source_values = {value for value, _ in sources}
        if len(source_values) != 1:
            self._mismatch(model_name, obj.pk, stable_code, field, "fuentes canónicas discrepantes")
        canonical = next(iter(source_values))
        current = getattr(obj, field)
        if "�" in current or not any(marker in current for marker in MOJIBAKE_MARKERS):
            self._mismatch(model_name, obj.pk, stable_code, field, current)
        if any(marker in canonical for marker in MOJIBAKE_MARKERS) or "�" in canonical:
            self._mismatch(model_name, obj.pk, stable_code, field, "fuente canónica no limpia")
        return {
            "model_name": model_name,
            "pk": obj.pk,
            "code": stable_code,
            "field": field,
            "expected": current,
            "canonical": canonical,
            "source": " + ".join(sorted({source for _, source in sources})),
            "object": obj,
        }

    def _check_counts(self, plans):
        records = {
            name: len({plan["pk"] for plan in plans if plan["model_name"] == name})
            for name in EXPECTED_RECORD_COUNTS
        }
        fields = {
            name: sum(plan["model_name"] == name for plan in plans)
            for name in EXPECTED_FIELD_COUNTS
        }
        if records != EXPECTED_RECORD_COUNTS or fields != EXPECTED_FIELD_COUNTS:
            raise CommandError(
                f"Conteos no coinciden con el dry-run validado; records={records}, fields={fields}. "
                "No se modificó ninguna fila."
            )

    def _print_plan(self, plans):
        record_counts = {
            name: len({plan["pk"] for plan in plans if plan["model_name"] == name})
            for name in EXPECTED_RECORD_COUNTS
        }
        field_counts = {
            name: sum(plan["model_name"] == name for plan in plans)
            for name in EXPECTED_FIELD_COUNTS
        }
        self.stdout.write(f"Registros por modelo: {record_counts}; campos: {field_counts}; total={len(plans)}")
        for plan in plans:
            before = json.dumps(plan["expected"], ensure_ascii=True)
            after = json.dumps(plan["canonical"], ensure_ascii=True)
            self.stdout.write(
                f"{plan['model_name']} id={plan['pk']} code={plan['code']} "
                f"field={plan['field']}: {before} -> {after} "
                f"[{plan['source']}]"
            )

    def _apply_plans(self, plans):
        grouped = {}
        for plan in plans:
            grouped.setdefault((plan["model_name"], plan["pk"]), []).append(plan)

        for (model_name, pk), row_plans in grouped.items():
            obj = row_plans[0]["object"]
            for plan in row_plans:
                if getattr(obj, plan["field"]) != plan["expected"]:
                    self._mismatch(model_name, pk, plan["code"], plan["field"], getattr(obj, plan["field"]))
                setattr(obj, plan["field"], plan["canonical"])
            obj.save(update_fields=[plan["field"] for plan in row_plans])