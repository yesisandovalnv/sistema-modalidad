from datetime import timedelta
from decimal import Decimal
import tempfile
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.documentos.services import DocumentoService
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
    EvaluacionDefensa,
    EventoDefensa,
    ParticipanteEvento,
    Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.defensas import EvaluacionDefensaService
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
            for index in range(1, 6)
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
        self._media_temp = tempfile.TemporaryDirectory()
        self.override_media = override_settings(MEDIA_ROOT=self._media_temp.name)
        self.override_media.enable()
        self.addCleanup(self.override_media.disable)
        self.addCleanup(self._media_temp.cleanup)
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

    def assign_public_team(self, tribunal_count=3):
        assignments = [
            AsignacionPostulacion.objects.create(
                postulacion=self.post, usuario=teacher, tipo_participacion="TRIBUNAL",
                designado_por=self.admin,
            )
            for teacher in self.teachers[:tribunal_count]
        ]
        assignments.extend([
            AsignacionPostulacion.objects.create(
                postulacion=self.post, usuario=self.teachers[3], tipo_participacion="PRESIDENTE",
                designado_por=self.admin,
            ),
            AsignacionPostulacion.objects.create(
                postulacion=self.post, usuario=self.teachers[4], tipo_participacion="SECRETARIO",
                designado_por=self.admin,
            ),
        ])
        return assignments

    def public_event(self, tribunal_count=2, assignments=None):
        assignments = assignments or self.assign_public_team()
        event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PUBLICA"],
            tipo_evento="DEFENSA_PUBLICA",
            estado="EN_CURSO",
            fecha_programada=timezone.now() - timedelta(minutes=1),
            lugar="Sala",
            programado_por=self.admin,
        )
        attendees = [
            assignment for assignment in assignments
            if assignment.tipo_participacion == "TRIBUNAL"
        ][:tribunal_count]
        attendees.extend(
            assignment for assignment in assignments
            if assignment.tipo_participacion in {"PRESIDENTE", "SECRETARIO"}
        )
        for assignment in attendees:
            ParticipanteEvento.objects.create(
                evento=event,
                asignacion=assignment,
                rol_evento=assignment.tipo_participacion,
                presente=True,
            )
        return event, assignments

    def create_public_event(self, seguimiento, *, estado="FINALIZADA", activo=True):
        now = timezone.now()
        return EventoDefensa.objects.create(
            postulacion=seguimiento.postulacion,
            seguimiento_etapa=seguimiento,
            tipo_evento="DEFENSA_PUBLICA",
            numero_intento=seguimiento.numero_intento,
            estado=estado,
            fecha_programada=now - timedelta(hours=1),
            fecha_inicio_real=now - timedelta(minutes=30),
            fecha_fin_real=now if estado == "FINALIZADA" else None,
            lugar="Auditorio",
            programado_por=self.admin,
            activo=activo,
        )

    def create_closure_document(
        self, codigo, *, evento=None, estado="APR", incluir_version=True,
        version_activa=True, version_actual=True, requiere_correccion=False,
    ):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.post,
            tipo_documento=TipoDocumento.objects.get(codigo=codigo),
            estado=EstadoDocumento.objects.get(codigo=estado),
            evento_defensa=evento,
            requiere_correccion=requiere_correccion,
        )
        if incluir_version:
            VersionDocumento.objects.create(
                documento=documento,
                subido_por=self.admin,
                numero_version=1,
                archivo=SimpleUploadedFile(f"{codigo.lower()}.pdf", b"%PDF-1.4 test"),
                nombre_original=f"{codigo.lower()}.pdf",
                tamano_bytes=13,
                hash_sha256="a" * 64,
                activo=version_activa,
                es_version_actual=version_actual,
            )
        return documento

    def activate_development(self):
        for code, seguimiento in self.follow.items():
            seguimiento.estado = (
                SeguimientoEtapa.EstadoChoices.EN_PROCESO
                if code == "DESARROLLO_TRABAJO_DIRIGIDO"
                else SeguimientoEtapa.EstadoChoices.APROBADA
            )
            seguimiento.save(update_fields=["estado"])

    def activate_private_defense(self):
        for code, seguimiento in self.follow.items():
            seguimiento.estado = (
                SeguimientoEtapa.EstadoChoices.EN_PROCESO
                if code == "DEFENSA_PRIVADA"
                else SeguimientoEtapa.EstadoChoices.APROBADA
                if seguimiento.etapa.orden < self.follow["DEFENSA_PRIVADA"].etapa.orden
                else SeguimientoEtapa.EstadoChoices.PENDIENTE
            )
            seguimiento.save(update_fields=["estado"])

    def activate_public_defense(self):
        public_order = self.follow["DEFENSA_PUBLICA"].etapa.orden
        for seguimiento in self.follow.values():
            seguimiento.estado = (
                SeguimientoEtapa.EstadoChoices.EN_PROCESO
                if seguimiento.etapa.codigo == "DEFENSA_PUBLICA"
                else SeguimientoEtapa.EstadoChoices.APROBADA
                if seguimiento.etapa.orden < public_order
                else SeguimientoEtapa.EstadoChoices.PENDIENTE
            )
            seguimiento.save(update_fields=["estado"])

    def prepare_conclusion_documents(
        self, *, public_follow=None, acta_event=None, link_acta=True,
        acta_state="APR", acta_version=True,
    ):
        public_follow = public_follow or self.follow["DEFENSA_PUBLICA"]
        public_follow.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        public_follow.save(update_fields=["estado"])
        public_event = self.create_public_event(public_follow)
        acta_event = acta_event if acta_event is not None else public_event

        private_event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="FINALIZADA",
            fecha_programada=timezone.now() - timedelta(days=1),
            fecha_inicio_real=timezone.now() - timedelta(days=1),
            fecha_fin_real=timezone.now(),
            lugar="Sala",
            programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=private_event,
            tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",
            nota_numerica=Decimal("21"),
            ponderacion=Decimal("30.00"),
            aporte_ponderado=Decimal("21.00"),
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=public_event,
            tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO",
            nota_numerica=Decimal("95"),
            ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("66.50"),
            semantica_nota=EvaluacionDefensa.SemanticaNota.BRUTA_100,
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        self.create_closure_document("DOCUMENTO_FINAL_TD")
        self.create_closure_document(
            "ACTA_DEFENSA_TD", evento=acta_event if link_acta else None,
            estado=acta_state, incluir_version=acta_version,
        )
        return public_event

    def approve_prior_stages_for_closure(self):
        self.post.seguimientos_etapa.exclude(
            etapa__codigo__in=("DEFENSA_PUBLICA", "CIERRE_DOCUMENTAL"),
        ).update(estado=SeguimientoEtapa.EstadoChoices.APROBADA)

    def test_registry_identifica_modalidad_y_mantiene_aislamiento(self):
        self.assertIsInstance(ModalidadPolicyRegistry.get(self.post), TrabajoDirigidoPolicy)
        self.assertNotIsInstance(ModalidadPolicyRegistry.get("PROYECTO_GRADO"), TrabajoDirigidoPolicy)

    def test_policy_depende_de_base_y_no_de_proyecto(self):
        self.assertTrue(issubclass(TrabajoDirigidoPolicy, BaseModalidadPolicy))
        self.assertFalse(issubclass(TrabajoDirigidoPolicy, ProyectoGradoPolicy))

    def test_desarrollo_orienta_al_registro_institucional_con_contrato_comun(self):
        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        action = orientation["siguiente_accion"]
        self.assertEqual(action["codigo"], "GESTIONAR_INSTITUCION")
        self.assertEqual(action["titulo"], "Registrar institución y supervisor")
        self.assertEqual(
            action["descripcion"],
            "Completa y guarda los datos institucionales necesarios para iniciar Desarrollo",
        )
        self.assertEqual(action["destino"], "#trabajo-dirigido")
        self.assertEqual(action["accion_label"], "Gestionar institución")

    def test_desarrollo_con_institucion_valida_orienta_al_documento_de_supervision(self):
        TrabajoDirigidoService.configurar_institucion(
            self.post,
            self.institution_data(tipo_ejecucion="INTERNO", convenio_vigente=False),
        )

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        action = orientation["siguiente_accion"]
        self.assertEqual(action["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(
            action["titulo"],
            "Completar documento: Informe periódico de supervisión",
        )
        self.assertEqual(
            action["descripcion"],
            "Presenta el documento requerido para su revisión y aprobación",
        )
        self.assertEqual(action["destino"], "#documentos")
        self.assertEqual(action["accion_label"], "Gestionar documentos")

    def test_desarrollo_distingue_informe_estructurado_del_documento_aprobado(self):
        TrabajoDirigidoService.configurar_institucion(
            self.post,
            self.institution_data(tipo_ejecucion="INTERNO", convenio_vigente=False),
        )
        self.create_closure_document("INFORME_SUPERVISION_TD")
        development = self.follow["DESARROLLO_TRABAJO_DIRIGIDO"]
        development.estado = SeguimientoEtapa.EstadoChoices.EN_PROCESO
        development.save(update_fields=["estado"])

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=development,
        )

        self.assertEqual(
            orientation["siguiente_accion"]["codigo"],
            "REGISTRAR_INFORME_PERIODICO",
        )
        self.assertEqual(orientation["siguiente_accion"]["destino"], "#trabajo-dirigido")
        self.assertEqual(orientation["requisitos"][0]["codigo"], "INFORME_PERIODICO_TD")

    def test_desarrollo_con_documento_presentado_mantiene_espera_de_revision(self):
        TrabajoDirigidoService.configurar_institucion(
            self.post,
            self.institution_data(tipo_ejecucion="INTERNO", convenio_vigente=False),
        )
        self.create_closure_document("INFORME_SUPERVISION_TD", estado="ENV")

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        self.assertNotEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_INSTITUCION")
        self.assertNotEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_desarrollo_externo_orienta_al_convenio_documental_faltante(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.create_closure_document("INFORME_SUPERVISION_TD")

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        action = orientation["siguiente_accion"]
        self.assertEqual(action["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(action["titulo"], "Completar documento: Convenio de Trabajo Dirigido")
        self.assertEqual(
            action["descripcion"],
            "La ejecución externa requiere presentar y obtener la aprobación del convenio para completar Desarrollo.",
        )
        self.assertEqual(action["destino"], "#documentos")
        self.assertEqual(action["accion_label"], "Gestionar documentos")
        convenio = next(
            item for item in orientation["requisitos"]
            if item["codigo"] == "CONVENIO_TRABAJO_DIRIGIDO"
        )
        self.assertEqual(convenio["estado"], "NO_PRESENTADO")
        self.assertNotEqual(orientation["mensaje"], action["descripcion"])

    def test_desarrollo_externo_con_convenio_presentado_orienta_a_esperar_revision(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.create_closure_document("INFORME_SUPERVISION_TD")
        self.create_closure_document("CONVENIO_TRABAJO_DIRIGIDO", estado="ENV")

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        self.assertEqual(orientation["siguiente_accion"]["codigo"], "ESPERAR_REVISION_DOCUMENTOS")
        self.assertEqual(
            orientation["siguiente_accion"]["titulo"],
            "Convenio de Trabajo Dirigido pendiente de revisión",
        )
        convenio = next(
            item for item in orientation["requisitos"]
            if item["codigo"] == "CONVENIO_TRABAJO_DIRIGIDO"
        )
        self.assertEqual(convenio["estado"], "PENDIENTE_REVISION")
        self.assertNotEqual(
            orientation["mensaje"],
            orientation["siguiente_accion"]["descripcion"],
        )

    def test_desarrollo_externo_con_convenio_observado_orienta_a_corregir(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.create_closure_document("INFORME_SUPERVISION_TD")
        convenio = self.create_closure_document(
            "CONVENIO_TRABAJO_DIRIGIDO",
            estado="ENV",
        )
        DocumentoService().registrar_observacion(
            convenio,
            self.admin,
            "Completar la información del convenio.",
        )

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        convenio = next(
            item for item in orientation["requisitos"]
            if item["codigo"] == "CONVENIO_TRABAJO_DIRIGIDO"
        )
        self.assertEqual(convenio["estado"], "REQUIERE_CORRECCION")
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(
            orientation["siguiente_accion"]["titulo"],
            "Corregir documento: Convenio de Trabajo Dirigido",
        )

    def test_desarrollo_externo_con_convenio_aprobado_continua_orientacion(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.create_closure_document("INFORME_SUPERVISION_TD")
        self.create_closure_document("CONVENIO_TRABAJO_DIRIGIDO")
        development = self.follow["DESARROLLO_TRABAJO_DIRIGIDO"]
        development.estado = SeguimientoEtapa.EstadoChoices.EN_PROCESO
        development.save(update_fields=["estado"])

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=development,
        )

        self.assertEqual(orientation["siguiente_accion"]["codigo"], "REGISTRAR_INFORME_PERIODICO")
        self.assertEqual(orientation["requisitos"][0]["codigo"], "INFORME_PERIODICO_TD")

    def test_orientacion_muestra_convenio_aprobado_mientras_falta_otro_documento(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.create_closure_document("CONVENIO_TRABAJO_DIRIGIDO")

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

        convenio = next(
            item for item in orientation["requisitos"]
            if item["codigo"] == "CONVENIO_TRABAJO_DIRIGIDO"
        )
        self.assertEqual(convenio["estado"], "APROBADO")
        self.assertTrue(convenio["cumplido"])
        self.assertEqual(
            orientation["siguiente_accion"]["titulo"],
            "Completar documento: Informe periódico de supervisión",
        )

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

    def test_defensa_publica_expone_y_asigna_autoridades_por_el_endpoint_existente(self):
        self.assign_tribunals()
        self.activate_public_defense()
        url = f"/api/v1/postulaciones/{self.post.pk}/flujo/"
        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.get(url)

        self.assertEqual(response.status_code, 200)
        action = response.data["orientacion_etapa_actual"]["siguiente_accion"]
        self.assertEqual(action["codigo"], "GESTIONAR_ACTORES")
        self.assertEqual(action["capacidades"]["modal"], "PUBLIC_AUTHORITIES")
        self.assertEqual(action["titulo"], "Completar autoridades")
        positions = response.data["gestion_actores"]["posiciones"]
        public_positions = {
            item["tipo_participacion"]: item
            for item in positions
            if item["tipo_participacion"] in {"PRESIDENTE", "SECRETARIO"}
        }
        self.assertEqual(set(public_positions), {"PRESIDENTE", "SECRETARIO"})
        for role, position in public_positions.items():
            self.assertEqual(position["ambito"], "ETAPA")
            self.assertEqual(position["seguimiento_etapa"], self.follow["DEFENSA_PUBLICA"].pk)
            self.assertEqual(position["acciones_permitidas"], ["ASIGNAR"])

        assignment_url = f"/api/v1/postulaciones/{self.post.pk}/asignaciones/asignar/"
        president_response = client.post(assignment_url, {
            "usuario": self.teachers[3].pk,
            "tipo_participacion": "PRESIDENTE",
            "seguimiento_etapa": self.follow["DEFENSA_PUBLICA"].pk,
        })
        self.assertEqual(president_response.status_code, 201)
        duplicate_authority_response = client.post(assignment_url, {
            "usuario": self.teachers[3].pk,
            "tipo_participacion": "SECRETARIO",
            "seguimiento_etapa": self.follow["DEFENSA_PUBLICA"].pk,
        })
        self.assertEqual(duplicate_authority_response.status_code, 400)
        secretary_response = client.post(assignment_url, {
            "usuario": self.teachers[4].pk,
            "tipo_participacion": "SECRETARIO",
            "seguimiento_etapa": self.follow["DEFENSA_PUBLICA"].pk,
        })
        self.assertEqual(secretary_response.status_code, 201)

        student_client = APIClient()
        student_client.force_authenticate(user=self.student)
        student_response = student_client.get(url)
        self.assertEqual(student_response.status_code, 200)
        student_action = student_response.data["orientacion_etapa_actual"]["siguiente_accion"]
        self.assertEqual(student_action["codigo"], "PROGRAMAR_EVENTO")
        student_positions = student_response.data["gestion_actores"]["posiciones"]
        self.assertTrue(
            {"PRESIDENTE", "SECRETARIO"}.issubset(
                {item["tipo_participacion"] for item in student_positions}
            )
        )
        self.assertTrue(all(not item["acciones_permitidas"] for item in student_positions))
        forbidden_assignment = student_client.post(assignment_url, {
            "usuario": self.teachers[0].pk,
            "tipo_participacion": "PRESIDENTE",
            "seguimiento_etapa": self.follow["DEFENSA_PUBLICA"].pk,
        })
        self.assertEqual(forbidden_assignment.status_code, 403)

        requirements = response.data["orientacion_etapa_actual"]["requisitos"]
        after_assignment = client.get(url).data["orientacion_etapa_actual"]
        document_requirements = [
            item for item in after_assignment["requisitos"]
            if item["tipo"] == "DOCUMENTO"
        ]
        self.assertEqual(len(document_requirements), 9)
        self.assertTrue(all(
            item["bloquea_siguiente_accion"] is False
            and item["cumplido"] is False
            for item in document_requirements
        ))
        self.assertEqual(after_assignment["siguiente_accion"]["codigo"], "PROGRAMAR_EVENTO")
        self.assertEqual(
            {item["codigo"] for item in requirements if item["tipo"] == "DOCUMENTO"},
            set(TrabajoDirigidoPolicy.requisitos_policy.get_documentos_requeridos("DEFENSA_PUBLICA")),
        )

    def test_checklist_defensa_publica_conserva_documentos_aprobados(self):
        self.activate_public_defense()
        codes = TrabajoDirigidoPolicy.requisitos_policy.get_documentos_requeridos(
            "DEFENSA_PUBLICA",
        )
        for code in codes:
            self.create_closure_document(code)

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DEFENSA_PUBLICA"],
        )
        documents = [
            item for item in orientation["requisitos"]
            if item["tipo"] == "DOCUMENTO"
        ]

        self.assertEqual({item["codigo"] for item in documents}, set(codes))
        self.assertTrue(all(item["cumplido"] for item in documents))
        self.assertTrue(all(item["estado"] == "APROBADO" for item in documents))
        self.assertTrue(all(
            item["bloquea_siguiente_accion"] is False
            for item in documents
        ))

    def test_orientacion_no_aplica_un_limite_de_tribunales_que_el_gate_no_exige(self):
        self.activate_public_defense()
        self.assign_public_team()
        extra_teacher = CustomUser.objects.create_user(
            "td-public-extra",
            role=self.teachers[0].role,
            ci="TD-EXTRA",
            ru="TD-R-EXTRA",
        )
        AsignacionPostulacion.objects.create(
            postulacion=self.post,
            usuario=extra_teacher,
            tipo_participacion="TRIBUNAL",
            designado_por=self.admin,
        )

        orientation = ModalidadPolicyRegistry.get(self.post).get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DEFENSA_PUBLICA"],
        )

        tribunal = next(
            item for item in orientation["requisitos"]
            if item["codigo"] == "TRIBUNAL"
        )
        self.assertEqual(tribunal["actual"], 4)
        self.assertTrue(tribunal["cumplido"])
        self.assertEqual(
            orientation["siguiente_accion"]["codigo"],
            "PROGRAMAR_EVENTO",
        )

    def test_orientacion_defensa_publica_sigue_el_estado_del_evento(self):
        self.activate_public_defense()
        policy = ModalidadPolicyRegistry.get(self.post)

        for state in (EventoDefensa.Estado.PROGRAMADA, EventoDefensa.Estado.EN_CURSO):
            with self.subTest(state=state):
                event = self.create_public_event(self.follow["DEFENSA_PUBLICA"], estado=state)
                orientation = policy.get_orientacion_etapa_actual(
                    postulacion=self.post,
                    seguimiento=self.follow["DEFENSA_PUBLICA"],
                )
                self.assertEqual(
                    orientation["siguiente_accion"]["codigo"],
                    "GESTIONAR_DEFENSA",
                )
                self.assertEqual(orientation["siguiente_accion"]["destino"], "#defensas")
                event.delete()

    def test_orientacion_defensa_publica_pide_evaluar_y_consolidar_en_orden(self):
        self.activate_public_defense()
        policy = ModalidadPolicyRegistry.get(self.post)
        event = self.create_public_event(
            self.follow["DEFENSA_PUBLICA"],
            estado=EventoDefensa.Estado.FINALIZADA,
        )
        orientation = policy.get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DEFENSA_PUBLICA"],
        )
        self.assertEqual(
            orientation["siguiente_accion"]["codigo"],
            "REGISTRAR_EVALUACION",
        )
        event.delete()

        event, _ = self.public_event()
        EvaluacionDefensaService.registrar_evaluacion_publica(
            event,
            self.admin,
            Decimal("85"),
            modalidad_registro="CONSENSO",
        )
        event.estado = EventoDefensa.Estado.FINALIZADA
        event.fecha_fin_real = timezone.now()
        event.save(update_fields=["estado", "fecha_fin_real"])
        orientation = policy.get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DEFENSA_PUBLICA"],
        )
        self.assertEqual(
            orientation["siguiente_accion"]["codigo"],
            "CONSOLIDAR_RESULTADO",
        )

    def test_orientacion_defensa_publica_ofrece_aprobacion_solo_si_workflow_la_permite(self):
        self.activate_public_defense()
        policy = ModalidadPolicyRegistry.get(self.post)
        event, _ = self.public_event()
        EvaluacionDefensaService.registrar_evaluacion_publica(
            event,
            self.admin,
            Decimal("95"),
            modalidad_registro="CONSENSO",
        )
        private_event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PRIVADA,
            estado=EventoDefensa.Estado.FINALIZADA,
            fecha_programada=timezone.now(),
            lugar="Sala",
            programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=private_event,
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
            modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
            resultado_cualitativo=EvaluacionDefensa.Resultado.SUFICIENTE,
            nota_numerica=Decimal("21"),
            ponderacion=Decimal("30.00"),
            aporte_ponderado=Decimal("21.00"),
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        event.estado = EventoDefensa.Estado.FINALIZADA
        event.fecha_fin_real = timezone.now()
        event.save(update_fields=["estado", "fecha_fin_real"])
        with patch("apps.postulantes.workflow.WorkflowService.aprobar_etapa"):
            EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)

        orientation = policy.get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["DEFENSA_PUBLICA"],
        )
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertIn(
            "aprobar",
            WorkflowService.obtener_acciones_permitidas(self.follow["DEFENSA_PUBLICA"]),
        )

    def test_defensa_privada_proyecta_docente_vacante_y_conserva_actores_existentes(self):
        self.assign_tribunals()
        self.approve_proposal(self.post.asignaciones.filter(tipo_participacion="TRIBUNAL"))
        tutor = AsignacionService.asignar_actor(
            self.post, self.teachers[3], "TUTOR", self.admin,
        )
        self.activate_private_defense()
        url = f"/api/v1/postulaciones/{self.post.pk}/flujo/"

        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)
        admin_response = admin_client.get(url)

        self.assertEqual(admin_response.status_code, 200)
        requisitos = {
            item["codigo"]: item
            for item in admin_response.data["orientacion_etapa_actual"]["requisitos"]
        }
        posiciones = admin_response.data["gestion_actores"]["posiciones"]
        docente = next(
            item for item in posiciones
            if item["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )
        tutor_position = next(
            item for item in posiciones if item["tipo_participacion"] == "TUTOR"
        )

        self.assertEqual(requisitos["TRIBUNAL"]["actual"], 3)
        self.assertTrue(requisitos["TRIBUNAL"]["cumplido"])
        self.assertEqual(requisitos["DOCENTE_MODALIDAD"]["actual"], 0)
        self.assertFalse(requisitos["DOCENTE_MODALIDAD"]["cumplido"])
        self.assertEqual(docente["clave"], "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD_1")
        self.assertEqual(docente["ambito"], "ETAPA")
        self.assertEqual(docente["seguimiento_etapa"], self.follow["DEFENSA_PRIVADA"].pk)
        self.assertEqual(docente["estado_ocupacion"], "VACANTE")
        self.assertEqual(docente["acciones_permitidas"], ["ASIGNAR"])
        self.assertFalse(any(item["tipo_participacion"] == "TRIBUNAL" for item in posiciones))
        self.assertEqual(tutor_position["ambito"], "POSTULACION")
        self.assertEqual(tutor_position["asignacion_actual"], tutor.pk)

        student_client = APIClient()
        student_client.force_authenticate(user=self.student)
        student_response = student_client.get(url)

        self.assertEqual(student_response.status_code, 200)
        student_docente = next(
            item for item in student_response.data["gestion_actores"]["posiciones"]
            if item["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )
        self.assertEqual(student_docente["estado_ocupacion"], "VACANTE")
        self.assertEqual(student_docente["acciones_permitidas"], [])

    def test_asignar_docente_privado_cumple_requisito_de_orientacion(self):
        self.assign_tribunals()
        self.activate_private_defense()
        privada = self.follow["DEFENSA_PRIVADA"]

        AsignacionService.asignar_actor(
            self.post,
            self.teachers[3],
            "DOCENTE_MODALIDAD",
            self.admin,
            seguimiento_etapa=privada,
        )

        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.get(f"/api/v1/postulaciones/{self.post.pk}/flujo/")

        self.assertEqual(response.status_code, 200)
        requisitos = {
            item["codigo"]: item
            for item in response.data["orientacion_etapa_actual"]["requisitos"]
        }
        self.assertEqual(requisitos["DOCENTE_MODALIDAD"]["actual"], 1)
        self.assertTrue(requisitos["DOCENTE_MODALIDAD"]["cumplido"])
        self.assertEqual(
            response.data["orientacion_etapa_actual"]["siguiente_accion"]["codigo"],
            "PROGRAMAR_EVENTO",
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
        self.assertEqual(orientation["tipo_evento"], "DEFENSA_PERFIL")
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

    def test_documentos_aplicables_de_desarrollo_incluyen_convenio_solo_para_ejecucion_externa(self):
        policy = ModalidadPolicyRegistry.get(self.post)
        development = "DESARROLLO_TRABAJO_DIRIGIDO"

        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.assertEqual(
            policy.get_documentos_aplicables_para_postulacion(self.post, development),
            ("INFORME_SUPERVISION_TD", "CONVENIO_TRABAJO_DIRIGIDO"),
        )

        TrabajoDirigidoService.configurar_institucion(
            self.post,
            self.institution_data(tipo_ejecucion="INTERNO", convenio_vigente=False),
        )
        self.assertEqual(
            policy.get_documentos_aplicables_para_postulacion(self.post, development),
            ("INFORME_SUPERVISION_TD",),
        )

    def test_documentos_aplicables_y_carga_de_convenio_externo_comparten_contexto(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        self.activate_development()
        tipo_convenio = TipoDocumento.objects.get(codigo="CONVENIO_TRABAJO_DIRIGIDO")

        for usuario in (self.student, self.admin):
            client = APIClient()
            client.force_authenticate(user=usuario)
            response = client.get(
                f"/api/v1/postulaciones/{self.post.pk}/documentos-aplicables/"
            )

            self.assertEqual(response.status_code, 200)
            convenio = next(
                item for item in response.data["documentos_aplicables"]
                if item["codigo"] == "CONVENIO_TRABAJO_DIRIGIDO"
            )
            self.assertTrue(convenio["capacidad_carga"]["permitida"])

        client = APIClient()
        client.force_authenticate(user=self.student)
        response = client.post(
            "/api/v1/documentos/documentos/subir/",
            {
                "postulacion_id": self.post.pk,
                "tipo_documento_id": tipo_convenio.pk,
                "archivo": SimpleUploadedFile(
                    "convenio.pdf", b"%PDF-1.4 convenio", content_type="application/pdf",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.post,
            tipo_documento=tipo_convenio,
        )
        self.assertEqual(documento.estado.codigo, "ENV")

    def test_endpoint_documentos_aplicables_omite_convenio_para_ejecucion_interna(self):
        TrabajoDirigidoService.configurar_institucion(
            self.post,
            self.institution_data(tipo_ejecucion="INTERNO", convenio_vigente=False),
        )
        self.activate_development()
        client = APIClient()
        client.force_authenticate(user=self.student)

        response = client.get(
            f"/api/v1/postulaciones/{self.post.pk}/documentos-aplicables/"
        )

        self.assertEqual(response.status_code, 200)
        codigos = {
            item["codigo"] for item in response.data["documentos_aplicables"]
        }
        self.assertIn("INFORME_SUPERVISION_TD", codigos)
        self.assertNotIn("CONVENIO_TRABAJO_DIRIGIDO", codigos)

    def test_gates_de_aprobacion_de_desarrollo_siguen_exigiendo_convenio_externo(self):
        TrabajoDirigidoService.configurar_institucion(self.post, self.institution_data())
        TrabajoDirigidoService.registrar_informe(
            self.post,
            {
                "periodo": "Agosto 2026",
                "descripcion_desempeno": "Desarrollo satisfactorio",
                "evaluacion_cualitativa": "Suficiente",
                "aporte_laboral": "Automatización institucional",
                "sugerencias_recomendaciones": "Continuar seguimiento",
            },
            self.admin,
        )
        self.create_closure_document("INFORME_SUPERVISION_TD")

        with self.assertRaises(ValidationError) as error:
            ModalidadPolicyRegistry.get(self.post).validar_aprobacion_etapa(
                self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
            )

        self.assertIn(
            "CONVENIO_TRABAJO_DIRIGIDO",
            error.exception.message_dict["faltantes"],
        )

    def test_gate_de_aprobacion_de_desarrollo_interno_no_exige_convenio_externo(self):
        TrabajoDirigidoService.configurar_institucion(
            self.post,
            self.institution_data(tipo_ejecucion="INTERNO", convenio_vigente=False),
        )
        TrabajoDirigidoService.registrar_informe(
            self.post,
            {
                "periodo": "Agosto 2026",
                "descripcion_desempeno": "Desarrollo satisfactorio",
                "evaluacion_cualitativa": "Suficiente",
                "aporte_laboral": "Automatización institucional",
                "sugerencias_recomendaciones": "Continuar seguimiento",
            },
            self.admin,
        )
        self.create_closure_document("INFORME_SUPERVISION_TD")

        ModalidadPolicyRegistry.get(self.post).validar_aprobacion_etapa(
            self.follow["DESARROLLO_TRABAJO_DIRIGIDO"],
        )

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

    def test_evaluacion_usa_notas_brutas_y_ponderacion_30_70(self):
        policy = ModalidadPolicyRegistry.get(self.post).evaluacion_policy
        private = policy.get_valores_registro(evento=None, tipo="PRIVADA", nota=Decimal("85"))
        public = policy.get_valores_registro(evento=None, tipo="PUBLICA", nota=Decimal("55"))
        self.assertEqual(private, {"ponderacion": Decimal("30.00"), "aporte_ponderado": Decimal("25.50")})
        self.assertEqual(public, {"ponderacion": Decimal("70.00"), "aporte_ponderado": Decimal("38.50")})
        self.assertEqual(policy.get_semantica_nota(evento=None, tipo="PRIVADA"), "BRUTA_100")
        self.assertEqual(policy.clasificar_nota_final(Decimal("50")), "POSTERGADO")
        self.assertEqual(policy.clasificar_nota_final(Decimal("51")), "APROBADO")
        self.assertEqual(policy.clasificar_nota_final(Decimal("75")), "APROBACION_PLENA")
        self.assertEqual(policy.clasificar_nota_final(Decimal("90")), "APROBACION_PLENA_CON_FELICITACION")

    def test_defensa_privada_bruta_valida_rango_y_no_deriva_resultado_cualitativo(self):
        policy = TrabajoDirigidoPolicy.evaluacion_policy
        event = EventoDefensa(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="EN_CURSO",
            fecha_programada=timezone.now(),
            programado_por=self.admin,
        )

        for note in (Decimal("0"), Decimal("85"), Decimal("100")):
            with self.subTest(note=note):
                values = policy.get_valores_registro(evento=event, tipo="PRIVADA", nota=note)
                evaluation = EvaluacionDefensa(
                    evento=event,
                    tipo_evaluacion="PRIVADA",
                    modalidad_registro="CONSENSO",
                    resultado_cualitativo="INSUFICIENTE",
                    nota_numerica=note,
                    ponderacion=values["ponderacion"],
                    aporte_ponderado=values["aporte_ponderado"],
                    semantica_nota=EvaluacionDefensa.SemanticaNota.BRUTA_100,
                )
                policy.validar_registro(evaluation)
                self.assertEqual(evaluation.resultado_cualitativo, "INSUFICIENTE")

        for note in (Decimal("-0.01"), Decimal("100.01")):
            with self.subTest(note=note), self.assertRaises(ValidationError):
                values = policy.get_valores_registro(evento=event, tipo="PRIVADA", nota=note)
                policy.validar_registro(EvaluacionDefensa(
                    evento=event,
                    tipo_evaluacion="PRIVADA",
                    modalidad_registro="CONSENSO",
                    resultado_cualitativo="SUFICIENTE",
                    nota_numerica=note,
                    ponderacion=values["ponderacion"],
                    aporte_ponderado=values["aporte_ponderado"],
                    semantica_nota=EvaluacionDefensa.SemanticaNota.BRUTA_100,
                ))

    def test_servicio_registra_nota_privada_bruta_y_aporte_ponderado(self):
        self.activate_private_defense()
        assignments = [
            AsignacionPostulacion.objects.create(
                postulacion=self.post,
                usuario=self.teachers[index],
                tipo_participacion=role,
                designado_por=self.admin,
                seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            )
            for index, role in enumerate(("TRIBUNAL", "TRIBUNAL", "DOCENTE_MODALIDAD"))
        ]
        event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="EN_CURSO",
            fecha_programada=timezone.now() - timedelta(minutes=1),
            lugar="Sala",
            programado_por=self.admin,
        )
        for assignment in assignments:
            ParticipanteEvento.objects.create(
                evento=event,
                asignacion=assignment,
                rol_evento=assignment.tipo_participacion,
                presente=True,
            )

        evaluation = EvaluacionDefensaService.registrar_evaluacion_privada(
            event,
            self.admin,
            EvaluacionDefensa.Resultado.INSUFICIENTE,
            nota=Decimal("85"),
            modalidad_registro="CONSENSO",
        )

        self.assertEqual(evaluation.nota_numerica, Decimal("85"))
        self.assertEqual(evaluation.semantica_nota, EvaluacionDefensa.SemanticaNota.BRUTA_100)
        self.assertEqual(evaluation.ponderacion, Decimal("30.00"))
        self.assertEqual(evaluation.aporte_ponderado, Decimal("25.50"))
        self.assertEqual(evaluation.resultado_cualitativo, EvaluacionDefensa.Resultado.INSUFICIENTE)

    def test_defensa_privada_historica_conserva_aporte_directo(self):
        policy = TrabajoDirigidoPolicy.evaluacion_policy
        private_event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="FINALIZADA",
            fecha_programada=timezone.now(),
            lugar="Sala",
            programado_por=self.admin,
        )
        historical = EvaluacionDefensa.objects.create(
            evento=private_event,
            tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",
            nota_numerica=Decimal("21"),
            ponderacion=Decimal("30.00"),
            aporte_ponderado=Decimal("21.00"),
            semantica_nota=EvaluacionDefensa.SemanticaNota.MODALIDAD_ESPECIFICA,
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )

        result = policy.calcular_resultado_final(self.post)

        historical.refresh_from_db()
        self.assertEqual(historical.nota_numerica, Decimal("21"))
        self.assertEqual(historical.aporte_ponderado, Decimal("21.00"))
        self.assertEqual(historical.semantica_nota, EvaluacionDefensa.SemanticaNota.MODALIDAD_ESPECIFICA)
        self.assertEqual(result["aporte_privada"], Decimal("21.00"))

    def test_defensa_publica_consensuada_pondera_una_vez_y_conserva_clasificacion(self):
        event, _ = self.public_event()
        evaluation = EvaluacionDefensaService.registrar_evaluacion_publica(
            event, self.admin, Decimal("95"), modalidad_registro="CONSENSO",
        )

        self.assertEqual(evaluation.nota_numerica, Decimal("95"))
        self.assertEqual(evaluation.semantica_nota, EvaluacionDefensa.SemanticaNota.BRUTA_100)
        self.assertEqual(evaluation.ponderacion, Decimal("70.00"))
        self.assertEqual(evaluation.aporte_ponderado, Decimal("66.50"))

        private_event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="FINALIZADA",
            fecha_programada=timezone.now(),
            lugar="Sala",
            programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=private_event,
            tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",
            nota_numerica=Decimal("21"),
            ponderacion=Decimal("30.00"),
            aporte_ponderado=Decimal("21.00"),
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        event.estado = "FINALIZADA"
        event.fecha_fin_real = timezone.now()
        event.save()
        with patch("apps.postulantes.workflow.WorkflowService.aprobar_etapa"):
            consolidated = EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)

        self.assertEqual(consolidated.aporte_ponderado, Decimal("66.50"))
        result = TrabajoDirigidoPolicy.evaluacion_policy.calcular_resultado_final(self.post)
        self.assertEqual(result["nota_final"], Decimal("87.50"))
        self.assertEqual(result["clasificacion"], "APROBACION_PLENA")

    def test_defensa_publica_rechaza_notas_fuera_de_escala_y_evaluacion_individual(self):
        event, _ = self.public_event()
        for note in (Decimal("0"), Decimal("100.01")):
            with self.subTest(note=note), self.assertRaises(ValidationError):
                EvaluacionDefensaService.registrar_evaluacion_publica(
                    event, self.admin, note, modalidad_registro="CONSENSO",
                )

        tribunal = event.participantes.filter(rol_evento="TRIBUNAL").first()
        with self.assertRaisesMessage(ValidationError, "individual de Trabajo Dirigido está pendiente"):
            EvaluacionDefensaService.registrar_evaluacion_publica(
                event, self.admin, Decimal("75"), evaluador=tribunal,
                modalidad_registro="INDIVIDUAL",
            )
        self.assertFalse(event.evaluaciones.exists())

    def test_composicion_publica_exige_tres_designados_sin_elevar_quorum(self):
        policy = TrabajoDirigidoPolicy.evento_policy
        follow = self.follow["DEFENSA_PUBLICA"]
        date = timezone.now() + timedelta(days=3)
        two_assignments = self.assign_public_team(tribunal_count=2)
        with self.assertRaisesMessage(ValidationError, "exactamente tres docentes evaluadores"):
            policy.validar_programacion(
                tipo_evento="DEFENSA_PUBLICA", seguimiento=follow,
                fecha_programada=date,
                asignaciones=AsignacionPostulacion.objects.filter(postulacion=self.post, activo=True),
            )

        event, _ = self.public_event(tribunal_count=2, assignments=two_assignments)
        quorum = policy.validar_quorum(event)
        self.assertTrue(quorum["valido"])
        self.assertEqual(quorum["detalle"]["TRIBUNAL"], 2)
        self.assertEqual(len(two_assignments), 4)

        president = event.participantes.get(rol_evento="PRESIDENTE")
        president.presente = False
        president.save(update_fields=["presente"])
        quorum_without_president = policy.validar_quorum(event)
        self.assertFalse(quorum_without_president["valido"])
        self.assertEqual(quorum_without_president["faltantes"], {"PRESIDENTE": 1})

        AsignacionPostulacion.objects.create(
            postulacion=self.post, usuario=self.teachers[2], tipo_participacion="TRIBUNAL",
            designado_por=self.admin,
        )
        policy.validar_programacion(
            tipo_evento="DEFENSA_PUBLICA", seguimiento=follow,
            fecha_programada=date,
            asignaciones=AsignacionPostulacion.objects.filter(postulacion=self.post, activo=True),
        )

    def test_umbral_y_rangos_de_clasificacion_se_conservan(self):
        policy = TrabajoDirigidoPolicy.evaluacion_policy
        cases = {
            "50": "POSTERGADO",
            "51": "APROBADO",
            "75": "APROBACION_PLENA",
            "90": "APROBACION_PLENA_CON_FELICITACION",
        }
        for note, expected in cases.items():
            with self.subTest(note=note):
                self.assertEqual(policy.clasificar_nota_final(Decimal(note)), expected)

    def test_copia_material_de_proyecto_se_resuelve_con_quorum_de_trabajo_dirigido(self):
        policy = ModalidadPolicyRegistry.get(self.post).evento_policy
        self.assertEqual(policy.ASSIGNMENTS["DEFENSA_PERFIL"], {"TRIBUNAL": 3})
        self.assertEqual(
            policy.ASSIGNMENTS["DEFENSA_PRIVADA"],
            {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1},
        )
        self.assertEqual(policy.ASSIGNMENTS["DEFENSA_PUBLICA"], {"TRIBUNAL": 3, "PRESIDENTE": 1, "SECRETARIO": 1})
        self.assertEqual(policy.QUORUM["DEFENSA_PUBLICA"], {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1})
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

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_acta_td_se_carga_vinculada_a_defensa_publica_del_intento_vigente(self):
        seguimiento = self.follow["DEFENSA_PUBLICA"]
        seguimiento.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        seguimiento.save(update_fields=["estado"])
        evento = self.create_public_event(seguimiento)

        version = DocumentoService().subir_documento(
            self.post,
            TipoDocumento.objects.get(codigo="ACTA_DEFENSA_TD"),
            SimpleUploadedFile("acta-td.pdf", b"%PDF-1.4 acta TD"),
            self.admin,
            evento_defensa=evento,
        )

        self.assertEqual(version.documento.evento_defensa_id, evento.pk)

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_acta_td_rechaza_evento_ausente_ajeno_o_no_valido(self):
        seguimiento = self.follow["DEFENSA_PUBLICA"]
        seguimiento.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        seguimiento.save(update_fields=["estado"])
        self.create_public_event(seguimiento)
        pending_event = self.create_public_event(
            seguimiento, estado="PROGRAMADA", activo=False,
        )
        inactive_event = self.create_public_event(seguimiento, activo=False)
        private_event = EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=self.follow["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="FINALIZADA",
            fecha_programada=timezone.now() - timedelta(days=1),
            fecha_inicio_real=timezone.now() - timedelta(days=1),
            fecha_fin_real=timezone.now(),
            lugar="Sala",
            programado_por=self.admin,
        )
        foreign_post = Postulacion.objects.create(
            codigo="TD-ACTA-FOREIGN", estudiante=self.other,
            modalidad=self.post.modalidad, periodo=self.post.periodo,
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )
        foreign_stages = WorkflowService.inicializar_flujo(foreign_post, self.admin)
        foreign_public = next(
            item for item in foreign_stages if item.etapa.codigo == "DEFENSA_PUBLICA"
        )
        foreign_public.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        foreign_public.save(update_fields=["estado"])
        foreign_event = self.create_public_event(foreign_public)

        invalid_events = (
            ("sin evento", None),
            ("otra postulación", foreign_event),
            ("evento privado", private_event),
            ("evento no finalizado", pending_event),
            ("evento inactivo", inactive_event),
        )
        for label, evento in invalid_events:
            with self.subTest(evento=label), self.assertRaises(ValidationError):
                DocumentoService().subir_documento(
                    self.post,
                    TipoDocumento.objects.get(codigo="ACTA_DEFENSA_TD"),
                    SimpleUploadedFile(f"acta-{label}.pdf", b"%PDF-1.4 acta TD"),
                    self.admin,
                    evento_defensa=evento,
                )
        self.assertFalse(DocumentoPostulacion.objects.filter(
            postulacion=self.post, tipo_documento__codigo="ACTA_DEFENSA_TD",
        ).exists())

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_acta_td_rechaza_evento_publico_de_intento_anterior(self):
        first_follow = self.follow["DEFENSA_PUBLICA"]
        old_event = self.create_public_event(first_follow)
        first_follow.estado = SeguimientoEtapa.EstadoChoices.RECHAZADA
        first_follow.save(update_fields=["estado"])
        current_follow = SeguimientoEtapa.objects.create(
            postulacion=self.post,
            etapa=first_follow.etapa,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
            numero_intento=2,
        )
        self.create_public_event(current_follow)

        with self.assertRaisesMessage(ValidationError, "intento vigente"):
            DocumentoService().subir_documento(
                self.post,
                TipoDocumento.objects.get(codigo="ACTA_DEFENSA_TD"),
                SimpleUploadedFile("acta-anterior.pdf", b"%PDF-1.4 acta TD"),
                self.admin,
                evento_defensa=old_event,
            )

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_conclusion_td_acepta_acta_aprobada_vinculada_al_intento_vigente(self):
        self.prepare_conclusion_documents()

        self.assertIsNone(TrabajoDirigidoPolicy().validar_conclusion_academica(self.post))

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_conclusion_td_rechaza_acta_sin_evento_o_de_otro_intento(self):
        self.prepare_conclusion_documents(link_acta=False)
        with self.assertRaisesMessage(ValidationError, "ACTA_DEFENSA_TD aprobada y vinculada"):
            TrabajoDirigidoPolicy().validar_conclusion_academica(self.post)

        self.post.documentos.all().delete()
        self.post.eventos_defensa.all().delete()
        self.post.seguimientos_etapa.filter(etapa__codigo="DEFENSA_PUBLICA").delete()
        self.follow = {
            item.etapa.codigo: item
            for item in WorkflowService.inicializar_flujo(self.post, self.admin)
        }
        first_follow = self.follow["DEFENSA_PUBLICA"]
        old_event = self.create_public_event(first_follow)
        first_follow.estado = SeguimientoEtapa.EstadoChoices.RECHAZADA
        first_follow.save(update_fields=["estado"])
        current_follow = SeguimientoEtapa.objects.create(
            postulacion=self.post,
            etapa=first_follow.etapa,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
            numero_intento=2,
        )
        self.prepare_conclusion_documents(public_follow=current_follow, acta_event=old_event)
        with self.assertRaisesMessage(ValidationError, "ACTA_DEFENSA_TD aprobada y vinculada"):
            TrabajoDirigidoPolicy().validar_conclusion_academica(self.post)

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_conclusion_td_rechaza_acta_no_aprobada_o_sin_version_vigente(self):
        self.prepare_conclusion_documents()
        acta = DocumentoPostulacion.objects.get(
            postulacion=self.post, tipo_documento__codigo="ACTA_DEFENSA_TD",
        )
        invalid_states = (
            ("ENV", False, True, True),
            ("REC", False, True, True),
            ("APR", True, True, True),
            ("APR", False, False, True),
            ("APR", False, True, False),
        )
        for state, correction, version_active, version_current in invalid_states:
            with self.subTest(state=state, correction=correction, version_active=version_active, version_current=version_current):
                DocumentoPostulacion.objects.filter(pk=acta.pk).update(
                    estado=EstadoDocumento.objects.get(codigo=state),
                    requiere_correccion=correction,
                )
                VersionDocumento.objects.filter(documento=acta).update(
                    activo=version_active,
                    es_version_actual=version_current,
                )
                with self.assertRaises(ValidationError):
                    TrabajoDirigidoPolicy().validar_conclusion_academica(self.post)

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_conclusion_td_conserva_requisitos_documentales(self):
        self.prepare_conclusion_documents()
        DocumentoPostulacion.objects.filter(
            postulacion=self.post, tipo_documento__codigo="DOCUMENTO_FINAL_TD",
        ).update(activo=False)

        with self.assertRaises(ValidationError) as error:
            TrabajoDirigidoPolicy().validar_conclusion_academica(self.post)

        self.assertIn("DOCUMENTO_FINAL_TD", error.exception.message_dict["faltantes"])

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_endpoint_concluye_td_con_acta_vigente_y_respeta_permisos(self):
        self.prepare_conclusion_documents()
        self.approve_prior_stages_for_closure()
        client = APIClient()
        url = f"/api/v1/postulaciones/{self.post.pk}/trabajo-dirigido/concluir/"

        client.force_authenticate(self.student)
        self.assertEqual(client.post(url, {}, format="json").status_code, 403)

        client.force_authenticate(self.admin)
        response = client.post(url, {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"etapa": "CIERRE_DOCUMENTAL", "estado": "APROBADA"})
        self.post.refresh_from_db()
        self.assertEqual(self.post.estado_actual.codigo, "CONCLUIDA")
        self.assertEqual(
            self.post.seguimientos_etapa.get(etapa__codigo="CIERRE_DOCUMENTAL").estado,
            SeguimientoEtapa.EstadoChoices.APROBADA,
        )

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_endpoint_no_concluye_si_acta_no_tiene_evento_y_revierte_cierre(self):
        self.prepare_conclusion_documents(link_acta=False)
        self.approve_prior_stages_for_closure()
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            f"/api/v1/postulaciones/{self.post.pk}/trabajo-dirigido/concluir/",
            {}, format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("ACTA_DEFENSA_TD aprobada y vinculada", str(response.data))
        self.post.refresh_from_db()
        self.assertNotEqual(self.post.estado_actual.codigo, "CONCLUIDA")
        self.assertEqual(
            self.post.seguimientos_etapa.get(etapa__codigo="CIERRE_DOCUMENTAL").estado,
            SeguimientoEtapa.EstadoChoices.PENDIENTE,
        )

    @override_settings(STORAGES={
        "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    })
    def test_endpoint_no_concluye_si_acta_pertenece_a_intento_publico_anterior(self):
        first_follow = self.follow["DEFENSA_PUBLICA"]
        old_event = self.create_public_event(first_follow)
        first_follow.estado = SeguimientoEtapa.EstadoChoices.RECHAZADA
        first_follow.save(update_fields=["estado"])
        current_follow = SeguimientoEtapa.objects.create(
            postulacion=self.post,
            etapa=first_follow.etapa,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
            numero_intento=2,
        )
        self.prepare_conclusion_documents(public_follow=current_follow, acta_event=old_event)
        self.approve_prior_stages_for_closure()
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            f"/api/v1/postulaciones/{self.post.pk}/trabajo-dirigido/concluir/",
            {}, format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("ACTA_DEFENSA_TD aprobada y vinculada", str(response.data))
        self.post.refresh_from_db()
        self.assertNotEqual(self.post.estado_actual.codigo, "CONCLUIDA")
        self.assertEqual(
            self.post.seguimientos_etapa.get(
                etapa__codigo="CIERRE_DOCUMENTAL", numero_intento=1,
            ).estado,
            SeguimientoEtapa.EstadoChoices.PENDIENTE,
        )
