from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.diplomado import DiplomadoPolicy
from apps.modalidades.diplomado_service import DiplomadoService
from apps.modalidades.models import DiplomadoModulo
from apps.postulantes.models import EstadoPostulacion, Postulacion
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class DiplomadoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Diplomado admin")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("diplomado-admin", password="x", role=admin_role, is_staff=True, ci="DIP-1", ru="DIP-R1")
        cls.student = CustomUser.objects.create_user("diplomado-student", password="x", role=student_role, ci="DIP-2", ru="DIP-R2")
        cls.post = Postulacion.objects.create(
            codigo="DIP-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="GRADUACION_VIA_DIPLOMADO"),
            periodo=Periodo.objects.create(nombre="DIP-2026", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31"),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}

    def test_policy_declara_quinto_taller_y_reglas_normativas(self):
        policy = DiplomadoPolicy()
        self.assertEqual(policy.etapas[5].codigo, "TALLER_INVESTIGACION")
        self.assertEqual(policy.get_reglas_asignacion()["TRIBUNAL"], 2)
        self.assertEqual(policy.get_documentos_requeridos("DEFENSA_PUBLICA")[0], "CARTA_DEFENSA_DIPL")

    def test_crea_exactamente_cinco_modulos_y_no_permite_sexto(self):
        modules = DiplomadoService.ensure_modules(self.post)
        self.assertEqual(len(modules), 5)
        self.assertEqual(modules[4].nombre, "Taller de Investigación")
        with self.assertRaises(ValidationError):
            DiplomadoService.set_module_result(self.post, 6, 80, self.admin)

    def test_modulo_aprobado_sobre_65(self):
        module = DiplomadoService.set_module_result(self.post, 5, Decimal("66"), self.admin)
        self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)
        module = DiplomadoService.set_module_result(self.post, 4, Decimal("65"), self.admin)
        self.assertEqual(module.estado, DiplomadoModulo.Estado.REPROBADO)

    def test_policy_de_defensa_conserva_nota_1_a_100_y_ponderacion_total(self):
        policy = DiplomadoPolicy().evaluacion_policy
        values = policy.get_valores_registro(evento=None, tipo="PUBLICA", nota=Decimal("95.00"))
        self.assertEqual(values, {"ponderacion": Decimal("100.00"), "aporte_ponderado": Decimal("95.00")})
        self.assertEqual(policy.get_semantica_nota(evento=None, tipo="PUBLICA"), "MODALIDAD_ESPECIFICA")

    def test_no_puede_iniciar_defensa_sin_cinco_modulos_aprobados(self):
        stage = self.follow["DEFENSA_PUBLICA"]
        with self.assertRaises(ValidationError):
            WorkflowService.iniciar_etapa(stage, self.admin)

    def test_overview_expone_horas_creditos_y_modulos(self):
        data = DiplomadoService.overview(self.post)
        self.assertEqual(len(data["modulos"]), 5)
        self.assertEqual(data["reglas"]["horas_totales"], 800)
        self.assertEqual(data["reglas"]["creditos"], 20)
        self.assertEqual(data["reglas"]["reintento_dias"], 30)
