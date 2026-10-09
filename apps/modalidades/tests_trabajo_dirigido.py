from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.models import TrabajoDirigidoExpediente
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.modalidades.trabajo_dirigido import TrabajoDirigidoPolicy
from apps.modalidades.trabajo_dirigido_service import TrabajoDirigidoService
from apps.modalidades.validators import ModalidadConfigurationValidator
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class TrabajoDirigidoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Trabajo Dirigido admin")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user(
            "td-admin", password="x", role=admin_role, is_staff=True, ci="TD-1", ru="TD-R1",
        )
        cls.student = CustomUser.objects.create_user(
            "td-student", password="x", role=student_role, ci="TD-2", ru="TD-R2",
        )
        cls.other = CustomUser.objects.create_user(
            "td-other", password="x", role=student_role, ci="TD-3", ru="TD-R3",
        )
        cls.post = Postulacion.objects.create(
            codigo="TD-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="TRABAJO_DIRIGIDO"),
            periodo=Periodo.objects.create(
                nombre="TD-2026", gestion=2026, semestre="II",
                fecha_inicio="2026-01-01", fecha_fin="2026-12-31",
            ),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}

    def institution_data(self, **overrides):
        data = {
            "tipo_ejecucion": "EXTERNO", "institucion_nombre": "Entidad Pública",
            "institucion_tipo": "PUBLICA", "constituida_legalmente": True,
            "actividad_permanente": True, "proporciona_recursos": True,
            "supervisor_nombre": "Ing. Supervisora", "supervisor_profesion": "Ingeniería de Sistemas",
            "convenio_vigente": True, "fecha_firma_convenio": "2026-08-01",
        }
        data.update(overrides)
        return data

    def test_registry_identifica_modalidad_y_mantiene_aislamiento(self):
        self.assertIsInstance(ModalidadPolicyRegistry.get(self.post), TrabajoDirigidoPolicy)
        self.assertNotIsInstance(ModalidadPolicyRegistry.get("PROYECTO_GRADO"), TrabajoDirigidoPolicy)

    def test_capacidades_y_configuracion_estan_habilitadas(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        self.assertTrue(policy.get_capabilities(self.post.modalidad).soportada)
        self.assertTrue(ModalidadConfigurationValidator.validate_modalidad(self.post.modalidad).valida)

    def test_flujo_de_inscripcion_expone_orientacion_de_documentos_de_trabajo_dirigido(self):
        client = APIClient()
        client.force_authenticate(user=self.student)

        response = client.get(f"/api/v1/postulaciones/{self.post.id}/flujo/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["modalidad"]["codigo"], "TRABAJO_DIRIGIDO")
        orientation = response.data["orientacion_etapa_actual"]
        requirements = orientation["requisitos"]
        document_requirements = [
            item for item in requirements if item["tipo"] == "DOCUMENTO"
        ]
        self.assertEqual(
            {item["codigo"] for item in document_requirements},
            set(TrabajoDirigidoPolicy.requisitos_policy.get_documentos_requeridos("INSCRIPCION")),
        )
        self.assertTrue(all(item["nombre"] for item in document_requirements))
        self.assertTrue(all(item["estado_display"] == "No presentado" for item in document_requirements))
        self.assertEqual(
            [item["codigo"] for item in requirements if item["tipo"] == "ENTREGA_FISICA"],
            ["FOLDER_AMARILLO"],
        )
        self.assertEqual(orientation["requisitos_cumplidos"], 0)
        self.assertEqual(orientation["requisitos_totales"], len(requirements))
        self.assertFalse(orientation["permite_aprobar_etapa"])
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_etapas_normativas_y_reintentos(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        self.assertEqual([item.codigo for item in policy.etapas], [
            "INSCRIPCION", "PERFIL_TRABAJO_DIRIGIDO", "DESARROLLO_TRABAJO_DIRIGIDO",
            "DOCUMENTO_FINAL", "REVISION_TRIBUNAL_PREVIA", "DEFENSA_PRIVADA",
            "DEFENSA_PUBLICA", "CIERRE_DOCUMENTAL",
        ])
        self.assertTrue(policy.etapas[1].permite_reapertura)
        self.assertTrue(policy.etapas[5].permite_reapertura)
        self.assertTrue(policy.etapas[6].permite_reapertura)

    def test_requisitos_incluyen_convenio_condicional_y_defensa(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        self.assertNotIn("CONVENIO_TRABAJO_DIRIGIDO", policy.get_documentos_requeridos("INSCRIPCION"))
        self.assertIn("CARTA_CONFORMIDAD_INSTITUCION_TD", policy.get_documentos_requeridos("DEFENSA_PUBLICA"))
        self.assertIn("ACTA_DEFENSA_TD", policy.get_documentos_requeridos("CIERRE_DOCUMENTAL"))

    def test_externo_exige_convenio_y_supervisor(self):
        with self.assertRaises(ValidationError):
            TrabajoDirigidoService.configurar_institucion(
                self.post, self.institution_data(convenio_vigente=False, fecha_firma_convenio=None),
            )
        expediente = TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.assertEqual(expediente.supervisor_nombre, "Ing. Supervisora")
        self.assertTrue(expediente.convenio_vigente)

    def test_desarrollo_exige_institucion_e_informe_periodico(self):
        stage = self.follow["DESARROLLO_TRABAJO_DIRIGIDO"]
        with self.assertRaises(ValidationError):
            ModalidadPolicyRegistry.get(self.post).validar_inicio_etapa(stage)
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        ModalidadPolicyRegistry.get(self.post).validar_inicio_etapa(stage)
        TrabajoDirigidoService.registrar_informe(self.post, {
            "periodo": "Agosto 2026", "descripcion_desempeno": "Desarrollo satisfactorio",
            "evaluacion_cualitativa": "Suficiente", "aporte_laboral": "Automatización institucional",
            "sugerencias_recomendaciones": "Continuar seguimiento",
        }, self.admin)
        self.assertEqual(TrabajoDirigidoService.overview(self.post)["informes"][0]["periodo"], "Agosto 2026")

    def test_segundo_perfil_insuficiente_bloquea_tercer_intento(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        rejected = SeguimientoEtapa.objects.create(
            postulacion=self.post, etapa=self.follow["PERFIL_TRABAJO_DIRIGIDO"].etapa,
            estado="RECHAZADA", numero_intento=2, fecha_fin=timezone.now(),
        )
        with self.assertRaisesMessage(ValidationError, "reinscribirse"):
            policy.validar_nuevo_intento(etapa=rejected.etapa, ultimo_seguimiento=rejected)

    def test_primer_reintento_de_perfil_vence_en_cinco_dias_habiles(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        rejected = self.follow["PERFIL_TRABAJO_DIRIGIDO"]
        rejected.estado = "RECHAZADA"
        rejected.fecha_fin = timezone.now() - timedelta(days=10)
        with self.assertRaisesMessage(ValidationError, "5 días hábiles"):
            policy.validar_nuevo_intento(etapa=rejected.etapa, ultimo_seguimiento=rejected)

    def test_evaluacion_reutiliza_ponderacion_30_70_y_escala(self):
        policy = ModalidadPolicyRegistry.get(self.post).evaluacion_policy
        private = policy.get_valores_registro(evento=None, tipo="PRIVADA", nota=Decimal("21"))
        public = policy.get_valores_registro(evento=None, tipo="PUBLICA", nota=Decimal("55"))
        self.assertEqual(private, {"ponderacion": Decimal("30.00"), "aporte_ponderado": Decimal("21.00")})
        self.assertEqual(public, {"ponderacion": Decimal("70.00"), "aporte_ponderado": Decimal("55.00")})
        self.assertEqual(policy.get_semantica_nota(evento=None, tipo="PRIVADA"), "MODALIDAD_ESPECIFICA")
        self.assertNotEqual(policy.get_semantica_nota(evento=None, tipo="PRIVADA"), "BRUTA_100")
        self.assertEqual(policy.clasificar_nota_final(Decimal("50")), "POSTERGADO")
        self.assertEqual(policy.clasificar_nota_final(Decimal("51")), "APROBADO")
        self.assertEqual(policy.clasificar_nota_final(Decimal("75")), "APROBACION_PLENA")
        self.assertEqual(policy.clasificar_nota_final(Decimal("90")), "APROBACION_PLENA_CON_FELICITACION")

    def test_copia_material_de_proyecto_se_resuelve_con_quorum_de_trabajo_dirigido(self):
        policy = ModalidadPolicyRegistry.get(self.post).evento_policy
        self.assertEqual(policy.ASSIGNMENTS["DEFENSA_PUBLICA"], {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1})
        self.assertEqual(policy.get_etapa_asociada("DEFENSA_PUBLICA"), "DEFENSA_PUBLICA")

    def test_api_respeta_propietario_y_permisos_de_escritura(self):
        client = APIClient()
        client.force_authenticate(self.student)
        self.assertEqual(client.get(f"/api/v1/postulaciones/{self.post.id}/trabajo-dirigido/").status_code, 200)
        self.assertEqual(client.post(f"/api/v1/postulaciones/{self.post.id}/trabajo-dirigido/institucion/", self.institution_data(), format="json").status_code, 403)
        client.force_authenticate(self.other)
        self.assertEqual(client.get(f"/api/v1/postulaciones/{self.post.id}/trabajo-dirigido/").status_code, 404)

    def test_modelo_no_admite_otra_modalidad(self):
        project_post = Postulacion.objects.create(
            codigo="TD-ISO-PG", estudiante=self.other,
            modalidad=Modalidad.objects.get(codigo="PROYECTO_GRADO"), periodo=self.post.periodo,
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )
        with self.assertRaises(ValidationError):
            TrabajoDirigidoExpediente.objects.create(
                postulacion=project_post, **self.institution_data(),
            )
