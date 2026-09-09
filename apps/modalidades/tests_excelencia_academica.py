from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.modalidades.excelencia_academica import ExcelenciaAcademicaPolicy
from apps.modalidades.excelencia_academica_service import ExcelenciaAcademicaService
from apps.modalidades.models import ExcelenciaExpediente
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class ExcelenciaAcademicaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Excelencia admin")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("excelencia-admin", password="x", role=admin_role, is_staff=True, ci="EXC-1", ru="EXC-R1")
        cls.student = CustomUser.objects.create_user("excelencia-student", password="x", role=student_role, ci="EXC-2", ru="EXC-R2")
        cls.post = Postulacion.objects.create(
            codigo="EXC-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="EXCELENCIA_ACADEMICA"),
            periodo=Periodo.objects.create(nombre="EXC-2026", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31"),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}
        self.actor_users = []
        for index, role in enumerate(("PRESIDENTE", "SECRETARIO", "TRIBUNAL", "TRIBUNAL", "DIRECTOR_INSTITUTO_INVESTIGACION"), start=1):
            user = CustomUser.objects.create_user(
                f"excelencia-actor-{self._testMethodName}-{index}", password="x",
                role=self.teacher_role, ci=f"EXC-{self._testMethodName[:4]}{index}", ru=f"EXC-R{self._testMethodName[:4]}{index}",
            )
            self.actor_users.append(user)
            AsignacionService.asignar_actor(
                self.post, user, role, self.admin,
                orden_cargo=index - 2 if role == "TRIBUNAL" else None,
            )

    def _configure(self, criterion):
        return ExcelenciaAcademicaService.configurar_criterio(self.post, criterion)

    def _documents(self, codes):
        approved = EstadoDocumento.objects.get(codigo="APR")
        for code in codes:
            document = DocumentoPostulacion.objects.create(
                postulacion=self.post, tipo_documento=TipoDocumento.objects.get(codigo=code), estado=approved,
            )
            VersionDocumento.objects.create(
                documento=document, subido_por=self.admin, numero_version=1,
                archivo=SimpleUploadedFile(f"{code}.pdf", b"pdf"), nombre_original=f"{code}.pdf",
                tamano_bytes=3, hash_sha256="a" * 64, es_version_actual=True,
            )

    def _approve(self, code):
        stage = SeguimientoEtapa.objects.get(postulacion=self.post, etapa__codigo=code, numero_intento=1)
        WorkflowService.iniciar_etapa(stage, self.admin)
        return WorkflowService.aprobar_etapa(stage, self.admin)

    def _prepare_evaluation(self, criterion):
        self._configure(criterion)
        self._documents([
            "CARTA_EXCELENCIA", "RECIBO_MATRICULA_EXC",
            "HISTORIAL_EXCELENCIA", "FOLDER_EXCELENCIA",
            "CERT_PLANIFICACION", "SOLVENCIA_UNIV",
            "SOLVENCIA_BIBLIO", "TIMBRE_EXCELENCIA",
        ] + (["CERT_DIR_CARRERA", "CERT_INST_INVEST"] if criterion == ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD else []))
        self._approve("INSCRIPCION")
        self._approve("REVISION_REQUISITOS")
        stage = self.follow["EVALUACION_TRIBUNAL"]
        WorkflowService.iniciar_etapa(stage, self.admin)
        return stage

    def test_policy_declara_cinco_etapas_y_actores_normativos(self):
        policy = ExcelenciaAcademicaPolicy()
        self.assertEqual([stage.codigo for stage in policy.etapas], ["INSCRIPCION", "REVISION_REQUISITOS", "EVALUACION_TRIBUNAL", "REGISTRO_ACTA", "CONCLUSION_ACADEMICA"])
        self.assertEqual(policy.get_reglas_asignacion()["DIRECTOR_INSTITUTO_INVESTIGACION"], 1)
        self.assertEqual(policy.get_documentos_requeridos("REGISTRO_ACTA"), ("ACTA_EXCELENCIA",))

    def test_criterio_inmutable_al_iniciar_flujo(self):
        self._configure(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        self._documents(["CARTA_EXCELENCIA", "RECIBO_MATRICULA_EXC", "HISTORIAL_EXCELENCIA", "FOLDER_EXCELENCIA"])
        self._approve("INSCRIPCION")
        with self.assertRaises(ValidationError):
            ExcelenciaAcademicaService.configurar_criterio(self.post, ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD)

    def test_rendimiento_requiere_80_y_no_inventa_kardex(self):
        self._prepare_evaluation(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        with self.assertRaisesMessage(ValidationError, "igual o superior a 80"):
            ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE", Decimal("79.99"))
        result = ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE", Decimal("80.00"))
        self.assertEqual(result.promedio_general, Decimal("80.00"))
        self.assertEqual(result.resultado, ExcelenciaExpediente.Resultado.FAVORABLE)

    def test_calidad_es_cualitativa_y_exige_certificaciones(self):
        self._configure(ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD)
        self._documents(["CARTA_EXCELENCIA", "RECIBO_MATRICULA_EXC", "HISTORIAL_EXCELENCIA", "FOLDER_EXCELENCIA"])
        self._approve("INSCRIPCION")
        self._documents(["CERT_PLANIFICACION", "SOLVENCIA_UNIV", "SOLVENCIA_BIBLIO", "TIMBRE_EXCELENCIA"])
        review = self.follow["REVISION_REQUISITOS"]
        WorkflowService.iniciar_etapa(review, self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(review, self.admin)
        self._documents(["CERT_DIR_CARRERA", "CERT_INST_INVEST"])
        WorkflowService.aprobar_etapa(review, self.admin)
        stage = self.follow["EVALUACION_TRIBUNAL"]
        WorkflowService.iniciar_etapa(stage, self.admin)
        result = ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE")
        self.assertEqual(result.promedio_general, None)

    def test_conclusion_bloqueada_hasta_acta_aprobada(self):
        self._prepare_evaluation(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE", Decimal("80"))
        acta_stage = self.follow["REGISTRO_ACTA"]
        WorkflowService.iniciar_etapa(acta_stage, self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(acta_stage, self.admin)
        self._documents(["ACTA_EXCELENCIA"])
        WorkflowService.aprobar_etapa(acta_stage, self.admin)
        ExcelenciaAcademicaService.concluir(self.post, self.admin)
        self.post.refresh_from_db()
        self.assertEqual(self.post.estado_actual.codigo, "CONCLUIDA")
