import json
import shutil
from io import StringIO
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.academico.models import EtapaModalidad, Modalidad, ModalidadRequisito, Periodo, Requisito
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.academico.management.commands.seed_initial_data import OFFICIAL_TIPOS_DOCUMENTO


class SeedInitialDataCommandTest(TestCase):
    def setUp(self) -> None:
        temp_root = Path(settings.BASE_DIR) / ".tmp_test_seed"
        temp_root.mkdir(exist_ok=True)
        self._tmp_dir = temp_root / uuid4().hex
        self._tmp_dir.mkdir(parents=True, exist_ok=False)
        self.json_path = self._tmp_dir / "requisitos_oficiales.json"
        self.write_json(
            {
                "version": "1.0",
                "fuente": "",
                "fecha_validacion": None,
                "validado_por": "",
                "modalidades": [],
            }
        )
        self.path_patch = patch(
            "apps.academico.management.commands.seed_initial_data.REQUIREMENTS_JSON_PATH",
            self.json_path,
        )
        self.path_patch.start()

    def tearDown(self) -> None:
        self.path_patch.stop()
        shutil.rmtree(self._tmp_dir, ignore_errors=False)

    def write_json(self, payload) -> None:
        self.json_path.write_text(json.dumps(payload), encoding="utf-8")

    def run_seed_command(self) -> tuple[str, str]:
        stdout = StringIO()
        stderr = StringIO()
        call_command("seed_initial_data", stdout=stdout, stderr=stderr)
        return stdout.getvalue(), stderr.getvalue()

    def test_json_vacio_no_crea_requisitos(self) -> None:
        stdout, _ = self.run_seed_command()

        self.assertEqual(Modalidad.objects.count(), 6)
        self.assertEqual(EstadoPostulacion.objects.count(), 8)
        self.assertEqual(EstadoDocumento.objects.count(), 5)
        self.assertEqual(EtapaModalidad.objects.count(), 47)
        self.assertEqual(TipoDocumento.objects.count(), 64)
        self.assertTrue(TipoDocumento.objects.filter(codigo="OBSERVACIONES_DEFENSA_PERFIL").exists())
        self.assertEqual(Requisito.objects.count(), 0)
        self.assertEqual(ModalidadRequisito.objects.count(), 0)
        self.assertIn("Creados: 130", stdout)
        self.assertIn("No existen requisitos oficiales validados para cargar.", stdout)

    def test_json_mal_formado_produce_command_error(self) -> None:
        self.json_path.write_text("{", encoding="utf-8")

        with self.assertRaisesMessage(CommandError, "JSON mal formado"):
            self.run_seed_command()

    def test_estructura_incompleta_produce_command_error(self) -> None:
        self.write_json({"version": "1.0", "modalidades": []})

        with self.assertRaisesMessage(CommandError, "Falta el campo principal 'fuente'"):
            self.run_seed_command()

    def test_modalidad_inexistente_produce_command_error(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Acta oficial",
                "fecha_validacion": None,
                "validado_por": "",
                "modalidades": [
                    {
                        "codigo_modalidad": "NO_EXISTE",
                        "tipos_documento": [],
                    }
                ],
            }
        )

        with self.assertRaisesMessage(CommandError, "no existe en la base de datos"):
            self.run_seed_command()

    def test_orden_cero_o_negativo_produce_command_error(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Acta oficial",
                "fecha_validacion": None,
                "validado_por": "",
                "modalidades": [
                    {
                        "codigo_modalidad": "PROYECTO_GRADO",
                        "tipos_documento": [
                            {
                                "codigo": "FORM-001",
                                "nombre": "Formulario",
                                "descripcion": "",
                                "obligatorio": True,
                                "orden": 0,
                                "extensiones_permitidas": ["pdf"],
                                "tamano_maximo_mb": 5,
                                "permite_multiple_version": False,
                            }
                        ],
                    }
                ],
            }
        )

        with self.assertRaisesMessage(CommandError, "orden"):
            self.run_seed_command()

    def test_codigo_o_nombre_vacio_produce_command_error(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Acta oficial",
                "fecha_validacion": None,
                "validado_por": "",
                "modalidades": [
                    {
                        "codigo_modalidad": "PROYECTO_GRADO",
                        "tipos_documento": [
                            {
                                "codigo": "",
                                "nombre": "Formulario",
                                "descripcion": "",
                                "obligatorio": True,
                                "orden": 1,
                                "extensiones_permitidas": ["pdf"],
                                "tamano_maximo_mb": 5,
                                "permite_multiple_version": False,
                            }
                        ],
                    }
                ],
            }
        )

        with self.assertRaisesMessage(CommandError, "codigo"):
            self.run_seed_command()

    def test_tamano_maximo_invalido_produce_command_error(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Acta oficial",
                "fecha_validacion": None,
                "validado_por": "",
                "modalidades": [
                    {
                        "codigo_modalidad": "PROYECTO_GRADO",
                        "tipos_documento": [
                            {
                                "codigo": "FORM-001",
                                "nombre": "Formulario",
                                "descripcion": "",
                                "obligatorio": True,
                                "orden": 1,
                                "extensiones_permitidas": ["pdf"],
                                "tamano_maximo_mb": 0,
                                "permite_multiple_version": False,
                            }
                        ],
                    }
                ],
            }
        )

        with self.assertRaisesMessage(CommandError, "tamano_maximo_mb"):
            self.run_seed_command()

    def test_primera_ejecucion_crea_datos_validos(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Resolucion HCU",
                "fecha_validacion": "2026-07-17",
                "validado_por": "Secretaria Academica",
                "modalidades": [
                    {
                        "codigo_modalidad": "PROYECTO_GRADO",
                        "tipos_documento": [
                            {
                                "codigo": "PG-FORM-01",
                                "nombre": "Formulario de Proyecto",
                                "descripcion": "Formulario oficial",
                                "obligatorio": True,
                                "orden": 1,
                                "extensiones_permitidas": ["pdf"],
                                "tamano_maximo_mb": 5,
                                "permite_multiple_version": False,
                            },
                            {
                                "codigo": "PG-PLAN-01",
                                "nombre": "Plan de Trabajo",
                                "descripcion": "",
                                "obligatorio": True,
                                "orden": 2,
                                "extensiones_permitidas": ["pdf", "docx"],
                                "tamano_maximo_mb": 10,
                                "permite_multiple_version": True,
                            },
                        ],
                    }
                ],
            }
        )

        stdout, _ = self.run_seed_command()

        self.assertEqual(Modalidad.objects.count(), 6)
        self.assertEqual(EstadoPostulacion.objects.count(), 8)
        self.assertEqual(EstadoDocumento.objects.count(), 5)
        self.assertEqual(EtapaModalidad.objects.count(), 47)
        self.assertEqual(TipoDocumento.objects.count(), 66)
        self.assertTrue(TipoDocumento.objects.filter(codigo="OBSERVACIONES_DEFENSA_PERFIL").exists())
        self.assertEqual(Requisito.objects.count(), 2)
        self.assertEqual(ModalidadRequisito.objects.count(), 2)
        self.assertTrue(TipoDocumento.objects.filter(codigo="PG-FORM-01", nombre="Formulario de Proyecto").exists())
        self.assertTrue(Requisito.objects.filter(codigo="PG-PLAN-01", nombre="Plan de Trabajo").exists())
        self.assertTrue(
            ModalidadRequisito.objects.filter(
                modalidad__codigo="PROYECTO_GRADO",
                requisito__codigo="PG-FORM-01",
                orden=1,
            ).exists()
        )
        self.assertIn("Creados: 136", stdout)

    def test_segunda_ejecucion_con_datos_validos_no_duplica(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Resolucion HCU",
                "fecha_validacion": "2026-07-17",
                "validado_por": "Secretaria Academica",
                "modalidades": [
                    {
                        "codigo_modalidad": "PROYECTO_GRADO",
                        "tipos_documento": [
                            {
                                "codigo": "PG-FORM-01",
                                "nombre": "Formulario de Proyecto",
                                "descripcion": "Formulario oficial",
                                "obligatorio": True,
                                "orden": 1,
                                "extensiones_permitidas": ["pdf"],
                                "tamano_maximo_mb": 5,
                                "permite_multiple_version": False,
                            }
                        ],
                    }
                ],
            }
        )
        self.run_seed_command()

        stdout, _ = self.run_seed_command()

        self.assertEqual(TipoDocumento.objects.count(), 65)
        self.assertTrue(TipoDocumento.objects.filter(codigo="OBSERVACIONES_DEFENSA_PERFIL").exists())
        self.assertEqual(Requisito.objects.count(), 1)
        self.assertEqual(ModalidadRequisito.objects.count(), 1)
        self.assertEqual(EstadoPostulacion.objects.filter(codigo="EN_PROCESO").count(), 1)
        self.assertIn("Creados: 0", stdout)
        self.assertIn("Existentes: 133", stdout)

    def test_mantiene_intactas_modalidades_y_estados_existentes(self) -> None:
        self.write_json(
            {
                "version": "1.0",
                "fuente": "Resolucion HCU",
                "fecha_validacion": "2026-07-17",
                "validado_por": "Secretaria Academica",
                "modalidades": [
                    {
                        "codigo_modalidad": "TRABAJO_DIRIGIDO",
                        "tipos_documento": [
                            {
                                "codigo": "TD-REQ-01",
                                "nombre": "Carta de Solicitud",
                                "descripcion": "",
                                "obligatorio": True,
                                "orden": 1,
                                "extensiones_permitidas": ["pdf"],
                                "tamano_maximo_mb": 3,
                                "permite_multiple_version": False,
                            }
                        ],
                    }
                ],
            }
        )

        self.run_seed_command()

        self.assertEqual(Modalidad.objects.count(), 6)
        self.assertEqual(EstadoPostulacion.objects.count(), 8)
        self.assertEqual(EstadoDocumento.objects.count(), 5)
        self.assertEqual(EtapaModalidad.objects.count(), 47)
        self.assertTrue(Modalidad.objects.filter(codigo="TRABAJO_DIRIGIDO").exists())
        self.assertTrue(EstadoPostulacion.objects.filter(codigo="REGISTRADA").exists())
        self.assertTrue(EstadoPostulacion.objects.filter(codigo="EN_PROCESO", activo=True).exists())
        self.assertTrue(EstadoDocumento.objects.filter(codigo="APR").exists())

    def test_seed_crea_etapas_oficiales_por_modalidad(self) -> None:
        self.run_seed_command()

        etapas = list(
            EtapaModalidad.objects.filter(modalidad__codigo="PROYECTO_GRADO").order_by("orden")
        )

        self.assertEqual(len(etapas), 8)
        self.assertEqual(
            [etapa.codigo for etapa in etapas],
            [
                "INSCRIPCION",
                "PERFIL_PROYECTO",
                "DOCUMENTO_FINAL",
                "REVISION_TRIBUNAL_PREVIA",
                "DEFENSA_PRIVADA",
                "DEFENSA_PUBLICA",
                "REVISION_FINAL_POST_PUBLICA",
                "CIERRE_DOCUMENTAL",
            ],
        )
        self.assertTrue(
            EtapaModalidad.objects.get(
                modalidad__codigo="PROYECTO_GRADO",
                codigo="PERFIL_PROYECTO",
            ).permite_repeticion
        )
        tesis = list(EtapaModalidad.objects.filter(modalidad__codigo="TESIS_GRADO").order_by("orden"))
        self.assertEqual([etapa.codigo for etapa in tesis], [
            "INSCRIPCION", "TEMATICA_TESIS", "PERFIL_TESIS", "DOCUMENTO_FINAL",
            "REVISION_TUTOR", "REVISION_TRIBUNAL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA",
        ])
        self.assertTrue(EtapaModalidad.objects.get(modalidad__codigo="TESIS_GRADO", codigo="PERFIL_TESIS").permite_repeticion)

    def test_command_updates_existing_records_and_reactivates_them(self) -> None:
        Modalidad.all_objects.create(
            codigo="PROYECTO_GRADO",
            nombre="Proyecto antiguo",
            descripcion="Descripcion antigua",
            activo=False,
        )
        EstadoPostulacion.all_objects.create(
            codigo="REGISTRADA",
            nombre="Registro antiguo",
            descripcion="Descripcion antigua",
            activo=False,
        )
        EstadoDocumento.all_objects.create(
            codigo="ENV",
            nombre="Envio antiguo",
            descripcion="Descripcion antigua",
            activo=False,
        )

        stdout, _ = self.run_seed_command()

        self.assertEqual(Modalidad.all_objects.filter(codigo="PROYECTO_GRADO").count(), 1)
        self.assertEqual(EstadoPostulacion.all_objects.filter(codigo="REGISTRADA").count(), 1)
        self.assertEqual(EstadoDocumento.all_objects.filter(codigo="ENV").count(), 1)
        self.assertEqual(Modalidad.all_objects.get(codigo="PROYECTO_GRADO").nombre, "Proyecto de Grado")
        self.assertTrue(Modalidad.all_objects.get(codigo="PROYECTO_GRADO").activo)
        self.assertEqual(EstadoPostulacion.all_objects.get(codigo="REGISTRADA").nombre, "Registrada")
        self.assertTrue(EstadoPostulacion.all_objects.get(codigo="REGISTRADA").activo)
        self.assertEqual(EstadoDocumento.all_objects.get(codigo="ENV").nombre, "Enviado")
        self.assertTrue(EstadoDocumento.all_objects.get(codigo="ENV").activo)
        self.assertIn("Actualizados: 3", stdout)

    def test_command_reuses_modalidad_with_same_name_and_legacy_code(self) -> None:
        Modalidad.all_objects.create(
            codigo="DIPLOMADO",
            nombre="Graduacion Via Diplomado",
            descripcion="Registro legado",
            activo=True,
        )

        self.run_seed_command()

        self.assertFalse(Modalidad.all_objects.filter(codigo="DIPLOMADO").exists())
        self.assertTrue(Modalidad.all_objects.filter(codigo="GRADUACION_VIA_DIPLOMADO").exists())

    def test_command_runs_inside_atomic_transaction(self) -> None:
        with patch(
            "apps.academico.management.commands.seed_initial_data.Command._seed_estados_postulacion",
            side_effect=RuntimeError("fallo controlado"),
        ):
            with self.assertRaisesMessage(RuntimeError, "fallo controlado"):
                self.run_seed_command()

        self.assertEqual(Modalidad.all_objects.count(), 0)
        self.assertEqual(EstadoPostulacion.all_objects.count(), 0)
        self.assertEqual(EstadoDocumento.all_objects.count(), 0)


class OfficialProyectoGradoDocumentTypesSeedTest(TestCase):
    EXPECTED_CODES = {
        "CARTA_SOLICITUD_PROYECTO",
        "DOCUMENTO_FINAL",
        "ACTA_DEFENSA",
        "HOJA_APROBACION",
        "INFORME_FINAL_TUTOR",
        "INFORME_REVISION_TRIBUNAL_PREVIA",
        "OBSERVACIONES_DEFENSA_PERFIL",
    }

    def run_official_seed(self) -> str:
        stdout = StringIO()
        official_path = Path(settings.BASE_DIR) / "apps" / "academico" / "data" / "requisitos_oficiales.json"
        with patch(
            "apps.academico.management.commands.seed_initial_data.REQUIREMENTS_JSON_PATH",
            official_path,
        ):
            call_command("seed_initial_data", stdout=stdout)
        return stdout.getvalue()

    def test_official_seed_creates_required_document_types_idempotently(self) -> None:
        first_stdout = self.run_official_seed()

        tipos = TipoDocumento.objects.filter(codigo__in=self.EXPECTED_CODES)
        self.assertEqual(tipos.count(), 7)
        self.assertFalse(TipoDocumento.objects.filter(codigo="REVISION_FINAL_POST_PUBLICA").exists())
        self.assertFalse(tipos.filter(activo=False).exists())
        self.assertFalse(tipos.exclude(tamano_maximo_mb=10).exists())
        self.assertEqual(tipos.get(codigo="OBSERVACIONES_DEFENSA_PERFIL").extensiones_permitidas, "pdf")
        self.assertFalse(tipos.exclude(codigo="OBSERVACIONES_DEFENSA_PERFIL").exclude(extensiones_permitidas="pdf,doc,docx").exists())
        # El tipo histórico del fólder se conserva; Excelencia ya no crea
        # su requisito digital ni el vínculo ModalidadRequisito.
        self.assertIn("Creados: 244", first_stdout)

        second_stdout = self.run_official_seed()

        self.assertEqual(TipoDocumento.objects.filter(codigo__in=self.EXPECTED_CODES).count(), 7)
        self.assertIn("Creados: 0", second_stdout)
        self.assertIn("Existentes: 274", second_stdout)

    def test_selective_document_type_seed_isolated_and_idempotent(self) -> None:
        user = get_user_model().objects.create_user(username="selective-seed-student")
        modalidad = Modalidad.objects.create(
            codigo="PROYECTO_GRADO",
            nombre="Modalidad centinela",
            descripcion="Descripción que debe preservarse",
        )
        periodo = Periodo.objects.create(
            nombre="2026-SELECTIVE-SEED", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        estado_postulacion = EstadoPostulacion.objects.create(
            codigo="REGISTRADA", nombre="Estado de postulación centinela",
        )
        estado_documento = EstadoDocumento.objects.create(
            codigo="ENV", nombre="Estado documental centinela",
        )
        etapa = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo="INSCRIPCION", nombre="Etapa centinela",
            orden=1, obligatoria=True, origen_normativo="Origen centinela",
        )
        requisito = Requisito.objects.create(
            codigo="REQUISITO_CENTINELA", nombre="Requisito centinela",
            descripcion="Descripción centinela", obligatorio=False,
        )
        ModalidadRequisito.objects.create(modalidad=modalidad, requisito=requisito, orden=7)
        postulation = Postulacion.objects.create(
            codigo="POST-SELECTIVE-SEED", estudiante=user, modalidad=modalidad,
            periodo=periodo, estado_actual=estado_postulacion,
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=postulation, etapa=etapa, estado="EN_PROCESO",
        )
        other_type = TipoDocumento.objects.create(
            codigo="TIPO_CENTINELA", nombre="Nombre centinela", descripcion="Descripción centinela",
            obligatorio=False, permite_multiple_version=False, tamano_maximo_mb=3,
            extensiones_permitidas="zip", activo=False,
        )
        documento = DocumentoPostulacion.objects.create(
            postulacion=postulation, tipo_documento=other_type, estado=estado_documento,
        )

        def snapshot(model):
            return list(model.all_objects.order_by("pk").values())

        untouched_before = {
            "modalidades": snapshot(Modalidad),
            "estados_postulacion": snapshot(EstadoPostulacion),
            "estados_documento": snapshot(EstadoDocumento),
            "etapas": snapshot(EtapaModalidad),
            "requisitos": snapshot(Requisito),
            "modalidad_requisitos": snapshot(ModalidadRequisito),
            "postulaciones": snapshot(Postulacion),
            "seguimientos": snapshot(SeguimientoEtapa),
            "documentos": snapshot(DocumentoPostulacion),
        }
        other_type_before = list(TipoDocumento.all_objects.filter(pk=other_type.pk).values())
        self.assertFalse(TipoDocumento.all_objects.filter(codigo="CARTA_SOLICITUD_PROYECTO").exists())

        call_command("seed_initial_data", tipo_documento_codigo="CARTA_SOLICITUD_PROYECTO", verbosity=0)

        official = next(
            item for item in OFFICIAL_TIPOS_DOCUMENTO
            if item["codigo"] == "CARTA_SOLICITUD_PROYECTO"
        )
        carta = TipoDocumento.all_objects.get(codigo="CARTA_SOLICITUD_PROYECTO")
        self.assertEqual(TipoDocumento.all_objects.filter(codigo="CARTA_SOLICITUD_PROYECTO").count(), 1)
        for field in (
            "nombre", "descripcion", "obligatorio", "permite_multiple_version",
            "tamano_maximo_mb", "extensiones_permitidas",
        ):
            self.assertEqual(getattr(carta, field), official[field])
        self.assertTrue(carta.activo)
        self.assertEqual(list(TipoDocumento.all_objects.filter(pk=other_type.pk).values()), other_type_before)
        self.assertEqual(
            {key: snapshot({
                "modalidades": Modalidad,
                "estados_postulacion": EstadoPostulacion,
                "estados_documento": EstadoDocumento,
                "etapas": EtapaModalidad,
                "requisitos": Requisito,
                "modalidad_requisitos": ModalidadRequisito,
                "postulaciones": Postulacion,
                "seguimientos": SeguimientoEtapa,
                "documentos": DocumentoPostulacion,
            }[key]) for key in untouched_before},
            untouched_before,
        )

        TipoDocumento.all_objects.filter(pk=carta.pk).update(
            nombre="Nombre desalineado",
            descripcion="Descripción desalineada",
            obligatorio=False,
            permite_multiple_version=False,
            tamano_maximo_mb=1,
            extensiones_permitidas="txt",
            activo=False,
        )
        call_command("seed_initial_data", tipo_documento_codigo="CARTA_SOLICITUD_PROYECTO", verbosity=0)
        carta.refresh_from_db()
        for field in (
            "nombre", "descripcion", "obligatorio", "permite_multiple_version",
            "tamano_maximo_mb", "extensiones_permitidas",
        ):
            self.assertEqual(getattr(carta, field), official[field])
        self.assertTrue(carta.activo)

        carta_id = carta.pk
        call_command("seed_initial_data", tipo_documento_codigo="CARTA_SOLICITUD_PROYECTO", verbosity=0)
        self.assertEqual(TipoDocumento.all_objects.filter(codigo="CARTA_SOLICITUD_PROYECTO").count(), 1)
        self.assertEqual(TipoDocumento.all_objects.get(codigo="CARTA_SOLICITUD_PROYECTO").pk, carta_id)
        self.assertEqual(list(TipoDocumento.all_objects.filter(pk=other_type.pk).values()), other_type_before)
        models = {
            "modalidades": Modalidad,
            "estados_postulacion": EstadoPostulacion,
            "estados_documento": EstadoDocumento,
            "etapas": EtapaModalidad,
            "requisitos": Requisito,
            "modalidad_requisitos": ModalidadRequisito,
            "postulaciones": Postulacion,
            "seguimientos": SeguimientoEtapa,
            "documentos": DocumentoPostulacion,
        }
        self.assertEqual({key: snapshot(model) for key, model in models.items()}, untouched_before)


class OfficialTesisGradoSeedTest(TestCase):
    REQUIRED_CODES = {
        "CARTA_SOLICITUD",
        "MATRICULA_VIGENTE",
        "HISTORIAL_PRERREQ",
        "PERFIL_TESIS",
        "INFORME_TUTOR_TESIS",
        "INFORME_TRIB_TESIS",
    }

    def test_official_seed_configura_requisitos_tesis_idempotentemente(self) -> None:
        official_path = Path(settings.BASE_DIR) / "apps" / "academico" / "data" / "requisitos_oficiales.json"
        with patch("apps.academico.management.commands.seed_initial_data.REQUIREMENTS_JSON_PATH", official_path):
            call_command("seed_initial_data")
            call_command("seed_initial_data")
        self.assertEqual(TipoDocumento.objects.filter(codigo__in=self.REQUIRED_CODES).count(), 6)
        self.assertEqual(Requisito.objects.filter(codigo__in=self.REQUIRED_CODES).count(), 6)
        self.assertEqual(ModalidadRequisito.objects.filter(modalidad__codigo="TESIS_GRADO", requisito__codigo__in=self.REQUIRED_CODES).count(), 6)

    def test_documento_final_compartido_tiene_descripcion_neutral(self) -> None:
        official_path = Path(settings.BASE_DIR) / "apps" / "academico" / "data" / "requisitos_oficiales.json"
        with patch("apps.academico.management.commands.seed_initial_data.REQUIREMENTS_JSON_PATH", official_path):
            call_command("seed_initial_data")
        descripcion = TipoDocumento.objects.get(codigo="DOCUMENTO_FINAL").descripcion
        self.assertNotIn("Proyecto de Grado", descripcion)
        self.assertIn("modalidad de graduación", descripcion)
