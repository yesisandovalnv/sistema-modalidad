from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.models import TrabajoDirigidoExpediente
from apps.modalidades.policies import BaseModalidadPolicy, ModalidadPolicyRegistry
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.modalidades.trabajo_dirigido import TrabajoDirigidoPolicy
from apps.modalidades.trabajo_dirigido_service import TrabajoDirigidoService
from apps.modalidades.validators import ModalidadConfigurationValidator
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.decisiones_academicas import DecisionAcademicaEtapaService
from apps.postulantes.models import (
    AsignacionPostulacion,
    DecisionAcademicaEtapa,
    EstadoPostulacion,
    Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class TrabajoDirigidoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Trabajo Dirigido admin")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.admin = CustomUser.objects.create_user(
            "td-admin", password="x", role=admin_role, is_staff=True, ci="TD-1", ru="TD-R1",
        )
        cls.student = CustomUser.objects.create_user(
            "td-student", password="x", role=student_role, ci="TD-2", ru="TD-R2",
        )
        cls.other = CustomUser.objects.create_user(
            "td-other", password="x", role=student_role, ci="TD-3", ru="TD-R3",
        )
        cls.teachers = [
            CustomUser.objects.create_user(
                f"td-teacher-{index}", password="x", role=teacher_role,
                ci=f"TD-D{index}", ru=f"TD-DR{index}",
            )
            for index in range(1, 5)
        ]
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

    def assign_tribunals(self, amount=3):
        profile = self.follow["PERFIL_TRABAJO_DIRIGIDO"]
        return [
            AsignacionService.asignar_actor(
                self.post, teacher, "TRIBUNAL", self.admin,
                orden_cargo=index, seguimiento_etapa=profile,
            )
            for index, teacher in enumerate(self.teachers[:amount], start=1)
        ]

    def approve_proposal(self, assignments=None):
        assignments = assignments or self.assign_tribunals()
        return DecisionAcademicaEtapaService.registrar(
            seguimiento=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
            codigo=TrabajoDirigidoPolicy.PROPUESTA_APROBADA,
            resultado=TrabajoDirigidoPolicy.RESULTADO_PROPUESTA_APROBADA,
            registrado_por=self.admin,
            participantes=[
                {"asignacion": assignment, "rol": "TRIBUNAL", "orden": assignment.orden_cargo}
                for assignment in assignments
            ],
        )

    def test_registry_identifica_modalidad_y_mantiene_aislamiento(self):
        self.assertIsInstance(ModalidadPolicyRegistry.get(self.post), TrabajoDirigidoPolicy)
        self.assertNotIsInstance(ModalidadPolicyRegistry.get("PROYECTO_GRADO"), TrabajoDirigidoPolicy)

    def test_policy_depende_de_base_y_no_de_proyecto(self):
        self.assertTrue(issubclass(TrabajoDirigidoPolicy, BaseModalidadPolicy))
        self.assertFalse(issubclass(TrabajoDirigidoPolicy, ProyectoGradoPolicy))

    def test_configuracion_declara_tres_tribunales_del_perfil_td(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        groups = policy.get_configuracion_actores(
            self.post, self.follow["PERFIL_TRABAJO_DIRIGIDO"],
        )
        self.assertIn("regimen_workflow", groups)
        groups = groups["grupos"]
        tribunal = next(item for item in groups if item["tipo_participacion"] == "TRIBUNAL")
        self.assertEqual(tribunal["codigo_etapa"], "PERFIL_TRABAJO_DIRIGIDO")
        self.assertEqual((tribunal["minimo"], tribunal["maximo"]), (3, 3))
        self.assertEqual(tribunal["ordenes_permitidos"], [1, 2, 3])
        self.assertNotIn("PERFIL_PROYECTO", str(groups))

        first = AsignacionService.asignar_actor(
            self.post, self.teachers[0], "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
        )
        with self.assertRaisesMessage(ValidationError, "Ya existe un tribunal activo con ese orden"):
            AsignacionService.asignar_actor(
                self.post, self.teachers[1], "TRIBUNAL", self.admin,
                orden_cargo=1, seguimiento_etapa=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
            )
        assignments = [first, *[
            AsignacionService.asignar_actor(
                self.post, teacher, "TRIBUNAL", self.admin,
                orden_cargo=index, seguimiento_etapa=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
            )
            for index, teacher in ((2, self.teachers[1]), (3, self.teachers[2]))
        ]]
        self.assertEqual([item.orden_cargo for item in assignments], [1, 2, 3])
        with self.assertRaisesMessage(ValidationError, "exactamente tres"):
            AsignacionService.asignar_actor(
                self.post, self.teachers[3], "TRIBUNAL", self.admin,
                orden_cargo=1, seguimiento_etapa=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
            )

    def test_decision_exige_composicion_formal_completa(self):
        assignments = self.assign_tribunals(amount=2)
        with self.assertRaises(ValidationError):
            self.approve_proposal(assignments)
        self.assertFalse(DecisionAcademicaEtapa.objects.exists())

        third = AsignacionService.asignar_actor(
            self.post, self.teachers[2], "TRIBUNAL", self.admin,
            orden_cargo=3, seguimiento_etapa=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
        )
        decision = self.approve_proposal([*assignments, third])
        self.assertEqual(decision.codigo, TrabajoDirigidoPolicy.PROPUESTA_APROBADA)
        self.assertEqual(decision.participaciones.count(), 3)

    def test_tutor_se_bloquea_antes_de_decision_y_se_habilita_despues(self):
        with self.assertRaisesMessage(ValidationError, "aprobar formalmente la propuesta"):
            AsignacionService.asignar_actor(
                self.post, self.teachers[3], "TUTOR", self.admin,
            )

        self.approve_proposal()
        tutor = AsignacionService.asignar_actor(
            self.post, self.teachers[3], "TUTOR", self.admin,
        )
        self.assertIsNone(tutor.seguimiento_etapa_id)

    def test_orientacion_recorre_tribunal_decision_tutor_y_documentos(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        profile = self.follow["PERFIL_TRABAJO_DIRIGIDO"]
        orientation = policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=profile)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")

        assignments = self.assign_tribunals()
        orientation = policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=profile)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "REGISTRAR_DECISION")

        self.approve_proposal(assignments)
        orientation = policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=profile)
        self.assertEqual(orientation["siguiente_accion"]["titulo"], "Asignar Tutor de Trabajo Dirigido")

        AsignacionService.asignar_actor(self.post, self.teachers[3], "TUTOR", self.admin)
        orientation = policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=profile)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(
            {item["codigo"] for item in orientation["requisitos"]},
            {
                "TRIBUNAL_PROPUESTA_TD",
                TrabajoDirigidoPolicy.PROPUESTA_APROBADA,
                "TUTOR_TRABAJO_DIRIGIDO",
                "PERFIL_TRABAJO_DIRIGIDO",
                "INFORME_TUTOR_PERFIL_TD",
            },
        )
        with patch.object(policy, "get_orientacion_documental_prioritaria", return_value=None), patch.object(
            policy, "_missing_documents",
            return_value=["PERFIL_TRABAJO_DIRIGIDO", "INFORME_TUTOR_PERFIL_TD"],
        ):
            orientation = policy.get_orientacion_etapa_actual(
                postulacion=self.post, seguimiento=profile,
            )
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_DOCUMENTOS")
        with patch.object(policy, "get_orientacion_documental_prioritaria", return_value=None), patch.object(
            policy, "_missing_documents", return_value=[],
        ):
            orientation = policy.get_orientacion_etapa_actual(
                postulacion=self.post, seguimiento=profile,
            )
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "PROGRAMAR_EVENTO")
        self.assertEqual(
            {item["codigo"] for item in orientation["requisitos"] if item["tipo"] == "DOCUMENTO"},
            {"PERFIL_TRABAJO_DIRIGIDO", "INFORME_TUTOR_PERFIL_TD"},
        )

    def test_tutor_historico_permite_continuidad_sin_crear_decision(self):
        assignments = self.assign_tribunals()
        tutor = AsignacionPostulacion.objects.create(
            postulacion=self.post, usuario=self.teachers[3], tipo_participacion="TUTOR",
            designado_por=self.admin,
        )
        policy = ModalidadPolicyRegistry.get(self.post)
        orientation = policy.get_orientacion_etapa_actual(
            postulacion=self.post, seguimiento=self.follow["PERFIL_TRABAJO_DIRIGIDO"],
        )
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertFalse(DecisionAcademicaEtapa.objects.exists())
        decision_requirement = next(
            item for item in orientation["requisitos"]
            if item["codigo"] == TrabajoDirigidoPolicy.PROPUESTA_APROBADA
        )
        self.assertFalse(decision_requirement["cumplido"])
        self.assertEqual(
            decision_requirement["estado_display"],
            "Sin decisión formal (continuidad histórica)",
        )
        with self.assertRaisesMessage(
            ValidationError, "aprobación formal de la propuesta",
        ):
            policy.validar_aprobacion_etapa(self.follow["PERFIL_TRABAJO_DIRIGIDO"])
        config = policy.get_configuracion_actores(
            self.post, self.follow["PERFIL_TRABAJO_DIRIGIDO"],
        )
        tutor_group = next(item for item in config["grupos"] if item["tipo_participacion"] == "TUTOR")
        self.assertEqual(tutor_group["precondicion"]["estado"], "CONTINUIDAD_HISTORICA")
        self.assertTrue(tutor.activo)
        self.assertEqual(len(assignments), 3)

    def test_perfil_exige_tutor_documentos_y_defensa_suficiente(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        profile = self.follow["PERFIL_TRABAJO_DIRIGIDO"]
        self.approve_proposal()
        with self.assertRaisesMessage(ValidationError, "Tutor de Trabajo Dirigido activo"):
            policy.validar_aprobacion_etapa(profile)

        AsignacionService.asignar_actor(self.post, self.teachers[3], "TUTOR", self.admin)
        with patch.object(policy, "_require_sufficient_event"), patch.object(
            policy, "_missing_documents",
            return_value=["PERFIL_TRABAJO_DIRIGIDO", "INFORME_TUTOR_PERFIL_TD"],
        ):
            with self.assertRaises(ValidationError) as error:
                policy.validar_aprobacion_etapa(profile)
        self.assertEqual(
            set(error.exception.message_dict["faltantes"]),
            {"PERFIL_TRABAJO_DIRIGIDO", "INFORME_TUTOR_PERFIL_TD"},
        )

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
        self.assertEqual(policy.ASSIGNMENTS["DEFENSA_PERFIL"], {"TRIBUNAL": 3})
        self.assertEqual(
            policy.ASSIGNMENTS["DEFENSA_PRIVADA"],
            {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1},
        )
        self.assertEqual(policy.ASSIGNMENTS["DEFENSA_PUBLICA"], {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1})
        self.assertEqual(policy.get_etapa_asociada("DEFENSA_PRIVADA"), "DEFENSA_PRIVADA")
        self.assertEqual(policy.get_etapa_asociada("DEFENSA_PUBLICA"), "DEFENSA_PUBLICA")
        revision = ModalidadPolicyRegistry.get(self.post).get_revision_tribunal_previa_policy()
        self.assertEqual(revision.ETAPA, "REVISION_TRIBUNAL_PREVIA")
        self.assertIn(
            "ACTA_DEFENSA_TD",
            TrabajoDirigidoPolicy.requisitos_policy.get_documentos_requeridos("CIERRE_DOCUMENTAL"),
        )

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
