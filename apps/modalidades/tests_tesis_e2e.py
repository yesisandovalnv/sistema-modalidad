from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, TipoDocumento
from apps.documentos.services import ConfirmacionCorreccionDocumentoService, DocumentoService
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.dictamenes_revision import DictamenRevisionDocumentoService
from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


@override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}})
class TesisHastaRevisionTribunalE2ETest(TestCase):
    def setUp(self):
        call_command("seed_initial_data", verbosity=0)
        admin_role, _ = Role.objects.get_or_create(codigo="ADMINISTRADOR", defaults={"nombre": "Admin E2E"})
        teacher_role, _ = Role.objects.get_or_create(codigo="DOCENTE", defaults={"nombre": "Docente E2E"})
        student_role, _ = Role.objects.get_or_create(codigo="ESTUDIANTE", defaults={"nombre": "Estudiante E2E"})
        self.admin = CustomUser.objects.create_user(username="e2e-admin", password="x", ci="8800001", ru="RU8800001", role=admin_role, is_staff=True)
        self.student = CustomUser.objects.create_user(username="e2e-student", password="x", ci="8800002", ru="RU8800002", role=student_role)
        self.teachers = [CustomUser.objects.create_user(username=f"e2e-doc-{n}", password="x", ci=f"880001{n}", ru=f"RU880001{n}", role=teacher_role) for n in range(1, 6)]
        self.post = Postulacion.objects.create(codigo="TESIS-E2E-001", estudiante=self.student, modalidad=Modalidad.objects.get(codigo="TESIS_GRADO"), periodo=Periodo.objects.create(nombre="E2E-TESIS", gestion=2026, semestre="II", fecha_inicio="2026-07-01", fecha_fin="2026-12-31"), estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"))
        from apps.postulantes.tesis_grado_workflow import TesisGradoWorkflowOrchestrator
        self.stages = {x.etapa.codigo: x for x in TesisGradoWorkflowOrchestrator.inicializar_proceso(self.post, self.admin)}
        self.docs = DocumentoService()

    def upload_and_approve(self, code):
        version = self.docs.subir_documento(self.post, TipoDocumento.objects.get(codigo=code), SimpleUploadedFile(f"{code}.pdf", b"%PDF-1.4\ncontenido", content_type="application/pdf"), self.student)
        self.docs.aprobar_documento(DocumentoPostulacion.objects.get(pk=version.documento_id), self.admin)
        return version

    def complete_event(self, stage, event_type, evaluation_type):
        event = EventoDefensaService.programar_evento(self.post, stage, event_type, timezone.now() - timedelta(minutes=1), self.admin, lugar="Aula de defensa")
        if event_type == "DEFENSA_TEMATICA":
            return EvaluacionDefensaService.registrar_resultado_directo_proyecto(
                event, self.admin, resultado="SUFICIENTE",
            )
        EventoDefensaService.iniciar_evento(event, self.admin)
        event = EventoDefensaService.finalizar_evento(event, self.admin)
        if evaluation_type == "TEMATICA":
            EvaluacionDefensaService.registrar_evaluacion_tematica(event, self.admin, "SUFICIENTE")
        else:
            EvaluacionDefensaService.registrar_evaluacion_perfil(event, self.admin, "SUFICIENTE")
        EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)

    def complete_inscription(self):
        for code in ("CARTA_SOLICITUD", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"):
            self.upload_and_approve(code)
        self.stages["INSCRIPCION"].refresh_from_db()
        self.stages["PERFIL_TESIS"].refresh_from_db()
        self.assertEqual(self.stages["INSCRIPCION"].estado, "APROBADA")
        self.assertEqual(self.stages["PERFIL_TESIS"].estado, "EN_PROCESO")
        return self.stages["PERFIL_TESIS"]

    def reach_private(self):
        profile = self.complete_inscription()
        self.tribunal_assignments = [
            AsignacionService.asignar_actor(
                self.post, teacher, "TRIBUNAL", self.admin,
                orden_cargo=index, seguimiento_etapa=profile,
            )
            for index, teacher in enumerate(self.teachers[:3], 1)
        ]
        tutor = AsignacionService.asignar_actor(self.post, self.teachers[3], "TUTOR", self.admin)
        self.upload_and_approve("PERFIL_TESIS")
        tutor_evidence = self.upload_and_approve("INFORME_TUTOR_TESIS")
        self.complete_event(profile, "DEFENSA_PERFIL", "PERFIL")
        final_version = self.upload_and_approve("DOCUMENTO_FINAL")
        document_stage = self.stages["DOCUMENTO_FINAL"]
        WorkflowService.iniciar_etapa(document_stage, self.admin)
        WorkflowService.aprobar_etapa(document_stage, self.admin)
        tutor_stage = self.stages["REVISION_TUTOR"]
        WorkflowService.iniciar_etapa(tutor_stage, self.admin)
        DictamenRevisionDocumentoService.registrar(
            seguimiento=tutor_stage, version_documento_revisada=final_version,
            tipo_revision="TUTOR", resultado="SUFICIENTE", evidencia_version=tutor_evidence,
            asignacion_emisora=tutor, usuario=self.admin,
        )
        WorkflowService.aprobar_etapa(tutor_stage, self.admin)
        tribunal_stage = self.stages["REVISION_TRIBUNAL"]
        WorkflowService.iniciar_etapa(tribunal_stage, self.admin)
        tribunal_evidence = self.upload_and_approve("INFORME_TRIB_TESIS")
        DictamenRevisionDocumentoService.registrar(
            seguimiento=tribunal_stage, version_documento_revisada=final_version,
            tipo_revision="TRIBUNAL", resultado="SUFICIENTE", evidencia_version=tribunal_evidence,
            usuario=self.admin,
        )
        WorkflowService.aprobar_etapa(tribunal_stage, self.admin)
        private = WorkflowService.iniciar_etapa(self.stages["DEFENSA_PRIVADA"], self.admin)
        secretary = AsignacionService.asignar_actor(self.post, self.teachers[3], "DOCENTE_MODALIDAD", self.admin)
        return private, final_version, secretary

    def complete_private(self, private, secretary, note=20):
        event = EventoDefensaService.programar_evento(self.post, private, "DEFENSA_PRIVADA", timezone.now() - timedelta(minutes=1), self.admin, lugar="Aula")
        EventoDefensaService.iniciar_evento(event, self.admin)
        for assignment in self.tribunal_assignments + [secretary]:
            participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
            EventoDefensaService.registrar_asistencia(participant, True, self.admin)
        event = EventoDefensaService.finalizar_evento(event, self.admin)
        EvaluacionDefensaService.registrar_evaluacion_privada(event, self.admin, "SUFICIENTE", nota=note, modalidad_registro="CONSENSO")
        EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
        return event

    def test_defensa_perfil_admite_resultado_directo_sin_participantes_ni_quorum(self):
        profile = self.complete_inscription()
        self.tribunal_assignments = [
            AsignacionService.asignar_actor(
                self.post, teacher, "TRIBUNAL", self.admin,
                orden_cargo=index, seguimiento_etapa=profile,
            )
            for index, teacher in enumerate(self.teachers[:3], 1)
        ]
        AsignacionService.asignar_actor(self.post, self.teachers[3], "TUTOR", self.admin)
        self.upload_and_approve("PERFIL_TESIS")
        self.upload_and_approve("INFORME_TUTOR_TESIS")
        event = EventoDefensaService.programar_evento(
            self.post, profile, "DEFENSA_PERFIL", timezone.now() - timedelta(minutes=1),
            self.admin, lugar="Aula de defensa",
        )
        updated = EvaluacionDefensaService.registrar_resultado_directo_proyecto(
            event, self.admin, resultado="SUFICIENTE",
        )

        self.assertEqual(updated.estado, "FINALIZADA")
        self.assertEqual(updated.participantes.count(), 0)
        self.assertTrue(updated.evaluaciones.filter(
            tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE",
        ).exists())
        profile.refresh_from_db()
        self.assertEqual(profile.estado, "APROBADA")

    def test_defensa_publica_admite_resultado_directo_con_gates_y_composicion_formal(self):
        private, _final_version, secretary = self.reach_private()
        private_event = self.complete_private(private, secretary, Decimal("20"))
        president = AsignacionService.asignar_actor(
            self.post, self.teachers[4], "PRESIDENTE", self.admin,
        )
        public_secretary = AsignacionService.asignar_actor(
            self.post, self.teachers[3], "SECRETARIO", self.admin,
        )
        public = WorkflowService.iniciar_etapa(self.stages["DEFENSA_PUBLICA"], self.admin)
        event = EventoDefensaService.programar_evento(
            self.post, public, "DEFENSA_PUBLICA", timezone.now() - timedelta(minutes=1),
            self.admin, lugar="Auditorio",
        )
        updated = EvaluacionDefensaService.registrar_resultado_directo_proyecto(
            event, self.admin, nota=Decimal("90"), semantica_nota="BRUTA_100",
        )

        self.assertTrue(private_event.evaluaciones.filter(
            tipo_evaluacion="RESULTADO_FINAL", resultado_cualitativo="SUFICIENTE",
        ).exists())
        self.assertTrue(president.activo)
        self.assertTrue(public_secretary.activo)
        self.assertEqual(updated.estado, "FINALIZADA")
        self.assertEqual(updated.participantes.count(), 0)
        self.assertEqual(updated.evaluaciones.get(
            tipo_evaluacion="RESULTADO_FINAL",
        ).nota_numerica, Decimal("90.00"))
        public.refresh_from_db()
        self.assertEqual(public.estado, "APROBADA")

    def test_recorrido_real_habilita_defensa_privada_solo_despues_de_revision_tribunal(self):
        profile = self.complete_inscription()
        self.tribunal_assignments = [
            AsignacionService.asignar_actor(self.post, teacher, "TRIBUNAL", self.admin,
                orden_cargo=index, seguimiento_etapa=profile)
            for index, teacher in enumerate(self.teachers[:3], 1)
        ]
        tutor = AsignacionService.asignar_actor(self.post, self.teachers[3], "TUTOR", self.admin)
        self.upload_and_approve("PERFIL_TESIS"); tutor_evidence = self.upload_and_approve("INFORME_TUTOR_TESIS")
        self.complete_event(profile, "DEFENSA_PERFIL", "PERFIL")
        final_version = self.upload_and_approve("DOCUMENTO_FINAL")
        document_stage = self.stages["DOCUMENTO_FINAL"]; WorkflowService.iniciar_etapa(document_stage, self.admin); WorkflowService.aprobar_etapa(document_stage, self.admin)

        tutor_stage = self.stages["REVISION_TUTOR"]; WorkflowService.iniciar_etapa(tutor_stage, self.admin)
        DictamenRevisionDocumentoService.registrar(seguimiento=tutor_stage, version_documento_revisada=final_version, tipo_revision="TUTOR", resultado="SUFICIENTE", evidencia_version=tutor_evidence, asignacion_emisora=tutor, usuario=self.admin)
        WorkflowService.aprobar_etapa(tutor_stage, self.admin)

        tribunal_stage = self.stages["REVISION_TRIBUNAL"]; WorkflowService.iniciar_etapa(tribunal_stage, self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.iniciar_etapa(self.stages["DEFENSA_PRIVADA"], self.admin)
        tribunal_evidence = self.upload_and_approve("INFORME_TRIB_TESIS")
        DictamenRevisionDocumentoService.registrar(seguimiento=tribunal_stage, version_documento_revisada=final_version, tipo_revision="TRIBUNAL", resultado="SUFICIENTE", evidencia_version=tribunal_evidence, usuario=self.admin)
        WorkflowService.aprobar_etapa(tribunal_stage, self.admin)
        self.assertEqual(WorkflowService.iniciar_etapa(self.stages["DEFENSA_PRIVADA"], self.admin).estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)

    def test_e2e_aprobacion_hasta_acta_y_conclusion_academica(self):
        private_stage, final_version, private_secretary = self.reach_private()
        private_event = self.complete_private(private_stage, private_secretary, Decimal("20"))
        document = DocumentoPostulacion.objects.get(pk=final_version.documento_id)
        observation = self.docs.registrar_observacion(document, self.admin, "Corregir forma")
        document.refresh_from_db()
        self.assertEqual(document.estado.codigo, "APR")
        self.assertEqual(observation.version_documento_id, final_version.pk)
        corrected = self.docs.crear_nueva_version(document, SimpleUploadedFile("final-corregido.pdf", b"%PDF-1.4\ncorregido"), self.admin)
        self.docs.marcar_observacion_corregida(observation, self.admin)
        ConfirmacionCorreccionDocumentoService.registrar(
            postulacion=self.post, evento_origen=private_event,
            version_observada=final_version, version_corregida=corrected,
            confirmado_por=self.admin, asignacion_confirmante=self.tribunal_assignments[0],
        )
        public_stage = WorkflowService.iniciar_etapa(self.stages["DEFENSA_PUBLICA"], self.admin)
        president = AsignacionService.asignar_actor(self.post, self.teachers[3], "PRESIDENTE", self.admin)
        secretary = AsignacionService.asignar_actor(self.post, self.teachers[4], "SECRETARIO", self.admin)
        public_event = EventoDefensaService.programar_evento(self.post, public_stage, "DEFENSA_PUBLICA", timezone.now() - timedelta(minutes=1), self.admin, lugar="Auditorio")
        EventoDefensaService.iniciar_evento(public_event, self.admin)
        for assignment in self.tribunal_assignments + [president, secretary]:
            participant = EventoDefensaService.agregar_participante(public_event, assignment, assignment.tipo_participacion, self.admin)
            EventoDefensaService.registrar_asistencia(participant, True, self.admin)
        public_event = EventoDefensaService.finalizar_evento(public_event, self.admin)
        EvaluacionDefensaService.registrar_evaluacion_publica(public_event, self.admin, Decimal("50"), modalidad_registro="CONSENSO")
        EvaluacionDefensaService.consolidar_evaluacion_evento(public_event, self.admin)
        result = EvaluacionDefensaService.calcular_resultado_final(self.post, self.admin)
        self.assertEqual(result["nota_final"], Decimal("55.00"))
        self.assertEqual(result["clasificacion"], "APROBADO")
        acta = self.docs.subir_documento(self.post, TipoDocumento.objects.get(codigo="ACTA_DEFENSA"), SimpleUploadedFile("acta.pdf", b"%PDF-1.4\nacta"), self.admin, evento_defensa=public_event)
        documento_acta = DocumentoPostulacion.objects.get(pk=acta.documento_id)
        self.assertEqual(documento_acta.estado.codigo, "APR")
        self.assertIsNotNone(documento_acta.fecha_revision)
        self.post.refresh_from_db()
        self.assertNotEqual(self.post.estado_actual.codigo, "CONCLUIDA")
        concluded = WorkflowService.concluir_postulacion(self.post, self.admin)
        self.assertEqual(concluded.estado_actual.codigo, "CONCLUIDA")
        history_count = HistorialEstado.objects.filter(
            postulacion=self.post, estado_nuevo=concluded.estado_actual,
        ).count()

        repeated = WorkflowService.concluir_postulacion(self.post, self.admin)

        self.assertEqual(repeated.estado_actual.codigo, "CONCLUIDA")
        self.assertEqual(
            HistorialEstado.objects.filter(
                postulacion=self.post, estado_nuevo=repeated.estado_actual,
            ).count(),
            history_count,
        )

    def test_e2e_publica_postergada_crea_segunda_y_bloquea_tercera(self):
        private_stage, _final_version, private_secretary = self.reach_private()
        self.complete_private(private_stage, private_secretary, Decimal("20"))
        president = AsignacionService.asignar_actor(self.post, self.teachers[3], "PRESIDENTE", self.admin)
        secretary = AsignacionService.asignar_actor(self.post, self.teachers[4], "SECRETARIO", self.admin)

        def complete_public(stage, note):
            event = EventoDefensaService.programar_evento(self.post, stage, "DEFENSA_PUBLICA", timezone.now() - timedelta(minutes=1), self.admin, lugar="Auditorio")
            EventoDefensaService.iniciar_evento(event, self.admin)
            for assignment in self.tribunal_assignments + [president, secretary]:
                participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
                EventoDefensaService.registrar_asistencia(participant, True, self.admin)
            event = EventoDefensaService.finalizar_evento(event, self.admin)
            EvaluacionDefensaService.registrar_evaluacion_publica(event, self.admin, note, modalidad_registro="CONSENSO")
            EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
            return event

        first_stage = WorkflowService.iniciar_etapa(self.stages["DEFENSA_PUBLICA"], self.admin)
        first_event = complete_public(first_stage, Decimal("20"))
        first_stage.refresh_from_db()
        self.assertEqual(first_stage.estado, SeguimientoEtapa.EstadoChoices.RECHAZADA)
        second_stage = SeguimientoEtapa.objects.get(postulacion=self.post, etapa=first_stage.etapa, numero_intento=2)
        self.assertEqual(second_stage.estado, SeguimientoEtapa.EstadoChoices.PENDIENTE)
        self.assertTrue(first_event.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL").exists())
        second_stage = WorkflowService.iniciar_etapa(second_stage, self.admin)
        complete_public(second_stage, Decimal("50"))
        second_stage.refresh_from_db()
        self.assertEqual(second_stage.estado, SeguimientoEtapa.EstadoChoices.APROBADA)
        with self.assertRaises(ValidationError):
            WorkflowService.crear_nuevo_intento(self.post, second_stage.etapa, self.admin)
