from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.examen_grado import ExamenGradoPolicy
from apps.modalidades.examen_grado_service import ExamenGradoService
from apps.modalidades.models import ExamenEvaluacion
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class ExamenGradoContenidosTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Examen admin")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("examen-admin", password="x", role=admin_role, is_staff=True, ci="EXA-1", ru="EXA-R1")
        cls.student = CustomUser.objects.create_user("examen-student", password="x", role=student_role, ci="EXA-2", ru="EXA-R2")
        cls.post = Postulacion.objects.create(
            codigo="EXAM-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="EXAMEN_GRADO"),
            periodo=Periodo.objects.create(nombre="EXAM-2026", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31"),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.policy = ModalidadPolicyRegistry.get(self.post)
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}
        ExamenGradoService.ensure_areas(self.post)
        self.tribunal_users = []
        for index, role in enumerate(("TRIBUNAL", "TRIBUNAL", "TRIBUNAL", "PRESIDENTE", "SECRETARIO"), start=1):
            user = CustomUser.objects.create_user(f"examen-actor-{self._testMethodName}-{index}", password="x", role=self.teacher_role, ci=f"{self._testMethodName[:5]}{index}", ru=f"{self._testMethodName[:5]}R{index}")
            if role == "TRIBUNAL":
                self.tribunal_users.append(user)
            AsignacionPostulacion.objects.create(postulacion=self.post, usuario=user, tipo_participacion=role, orden_cargo=index if role == "TRIBUNAL" else None, designado_por=self.admin)

    def _approve_stage(self, code):
        stage = self.follow[code]
        WorkflowService.iniciar_etapa(stage, self.admin)
        return WorkflowService.aprobar_etapa(stage, self.admin)

    def _start_area(self, code, attempt=1):
        stage = SeguimientoEtapa.objects.get(postulacion=self.post, etapa__codigo=code, numero_intento=attempt)
        WorkflowService.iniciar_etapa(stage, self.admin)
        return stage

    def _evaluate_area(self, code, notes):
        results = []
        for user, note in zip(self.tribunal_users, notes):
            results.append(ExamenGradoService.registrar_evaluacion(self.post, code, note, self.admin, evaluador_id=user.id))
        return results

    def _evaluate_consensus(self, code, note):
        return ExamenGradoService.registrar_evaluacion(
            self.post, code, note, self.admin, modalidad_registro="CONSENSO",
        )

    def test_policy_etapas_documentos_y_capacidades(self):
        self.assertEqual(self.policy.get_etapa_inicial().codigo, "INSCRIPCION")
        self.assertEqual(len(self.policy.etapas), 8)
        self.assertEqual(self.policy.get_documentos_requeridos("INSCRIPCION"), ("CARTA_SOLICITUD_EXAMEN", "MATRICULA_VIGENTE", "HISTORIAL_ACADEMICO", "FOLDER_AMARILLO"))
        self.assertEqual(self.policy.get_documentos_requeridos("DOCUMENTACION_FINAL"), ("ACTA_EXAMEN", "HOJA_APROBACION_EXAMEN"))
        capabilities = self.policy.get_capabilities(self.post.modalidad)
        self.assertTrue(capabilities.soportada and capabilities.workflow_configurado)

    def test_overview_api_expone_areas_y_reglas(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get(f"/api/v1/postulaciones/{self.post.pk}/examen/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["variante"], "EXAMEN_CONTENIDOS")
        self.assertEqual([area["codigo"] for area in response.data["areas"]], ["AREA_1", "AREA_2", "AREA_3", "AREA_4"])
        self.assertEqual(response.data["reglas"]["nota_minima"], 61)

    def test_bloquea_avance_secuencial_de_areas(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        with self.assertRaises(ValidationError):
            self._start_area("AREA_2")
        self._start_area("AREA_1")

    def test_nota_60_posterga_y_61_aprueba(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        first = self._evaluate_area("AREA_1", (60, 60, 60))[-1]
        self.assertEqual(first.resultado, ExamenEvaluacion.Resultado.INSUFICIENTE)
        area = self.post.examen_areas.get(codigo="AREA_1")
        self.assertEqual(area.intento_actual, 2)
        self.assertEqual(area.estado, "POSTERGADA")
        self.assertIsNotNone(area.reintento_hasta)
        self._start_area("AREA_1", 2)
        second = self._evaluate_area("AREA_1", (61, 61, 61))[-1]
        self.assertEqual(second.resultado, ExamenEvaluacion.Resultado.APROBADA)
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").estado, "APROBADA")

    def test_nota_fuera_de_escala_y_segunda_insuficiencia(self):
        with self.assertRaises(ValidationError):
            ExamenEvaluacion(area=self.post.examen_areas.get(codigo="AREA_1"), intento=1, nota=Decimal("100.01"), resultado="APROBADA").full_clean()
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        self._evaluate_area("AREA_1", (60, 60, 60))
        self._start_area("AREA_1", 2)
        self._evaluate_area("AREA_1", (60, 60, 60))
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").estado, "REPROBADA")

    def test_calcula_ponderacion_normativa(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        for code, note in (("AREA_1", 100), ("AREA_2", 100), ("AREA_3", 100), ("AREA_4", 100)):
            self._start_area(code)
            self._evaluate_area(code, (note, note, note))
        result = ExamenGradoService.calcular_resultado_final(self.post)
        self.assertTrue(result["completo"])
        self.assertEqual(result["nota_final"], Decimal("100.00"))
        self.assertEqual(result["areas"], {"AREA_1": "100.00", "AREA_2": "100.00", "AREA_3": "100.00", "AREA_4": "100.00"})

    def test_resultado_final_promedia_los_tres_tribunales(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        self._evaluate_area("AREA_1", (61, 62, 63))
        result = ExamenGradoService.calcular_resultado_final(self.post)
        self.assertFalse(result["completo"])
        self.assertIsNone(result["nota_final"])
        self.assertEqual(result["areas"]["AREA_1"], "62.00")

    def test_consenso_persiste_una_unica_nota_del_area(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        evaluation = self._evaluate_consensus("AREA_1", 75)
        self.assertEqual(evaluation.modalidad_registro, ExamenEvaluacion.ModalidadRegistro.CONSENSO)
        self.assertIsNone(evaluation.evaluador_id)
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").estado, "APROBADA")
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").evaluaciones.count(), 1)
        self.assertEqual(ExamenGradoService.calcular_resultado_final(self.post)["areas"]["AREA_1"], "75.00")

    def test_conclusion_exige_documentos_y_concluye_con_acta_y_hoja(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        for code in ("AREA_1", "AREA_2", "AREA_3", "AREA_4"):
            self._start_area(code)
            self._evaluate_area(code, (61, 61, 61))

        estado_aprobado = EstadoDocumento.objects.get(codigo="APR")
        for codigo in ("ACTA_EXAMEN", "HOJA_APROBACION_EXAMEN"):
            documento = DocumentoPostulacion.objects.create(
                postulacion=self.post,
                tipo_documento=TipoDocumento.objects.get(codigo=codigo),
                estado=estado_aprobado,
            )
            VersionDocumento.objects.create(
                documento=documento, subido_por=self.admin, numero_version=1,
                archivo=SimpleUploadedFile(f"{codigo}.pdf", b"pdf"),
                nombre_original=f"{codigo}.pdf", tamano_bytes=3,
                hash_sha256="a" * 64, es_version_actual=True,
            )

        documentation = self.follow["DOCUMENTACION_FINAL"]
        WorkflowService.iniciar_etapa(documentation, self.admin)
        WorkflowService.aprobar_etapa(documentation, self.admin)
        ExamenGradoService.concluir(self.post, self.admin)
        self.post.refresh_from_db()
        self.assertEqual(self.post.estado_actual.codigo, "CONCLUIDA")
        self.assertEqual(
            SeguimientoEtapa.objects.get(postulacion=self.post, etapa__codigo="CONCLUSION_ACADEMICA").estado,
            SeguimientoEtapa.EstadoChoices.APROBADA,
        )
