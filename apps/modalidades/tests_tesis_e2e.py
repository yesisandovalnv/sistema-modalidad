from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, TipoDocumento
from apps.documentos.services import DocumentoService
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.dictamenes_revision import DictamenRevisionDocumentoService
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


@override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}})
class TesisHastaRevisionTribunalE2ETest(TestCase):
    def setUp(self):
        call_command("seed_initial_data", verbosity=0)
        admin_role, _ = Role.objects.get_or_create(codigo="ADMIN_E2E", defaults={"nombre": "Admin E2E"})
        teacher_role, _ = Role.objects.get_or_create(codigo="DOC_E2E", defaults={"nombre": "Docente E2E"})
        student_role, _ = Role.objects.get_or_create(codigo="EST_E2E", defaults={"nombre": "Estudiante E2E"})
        self.admin = CustomUser.objects.create_user(username="e2e-admin", password="x", ci="8800001", ru="RU8800001", role=admin_role, is_staff=True)
        student = CustomUser.objects.create_user(username="e2e-student", password="x", ci="8800002", ru="RU8800002", role=student_role)
        self.teachers = [CustomUser.objects.create_user(username=f"e2e-doc-{n}", password="x", ci=f"880001{n}", ru=f"RU880001{n}", role=teacher_role) for n in range(1, 5)]
        self.post = Postulacion.objects.create(codigo="TESIS-E2E-001", estudiante=student, modalidad=Modalidad.objects.get(codigo="TESIS_GRADO"), periodo=Periodo.objects.create(nombre="E2E-TESIS", gestion=2026, semestre="II", fecha_inicio="2026-07-01", fecha_fin="2026-12-31"), estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"))
        self.stages = {x.etapa.codigo: x for x in WorkflowService.inicializar_flujo(self.post, self.admin)}
        self.docs = DocumentoService()

    def upload_and_approve(self, code):
        version = self.docs.subir_documento(self.post, TipoDocumento.objects.get(codigo=code), SimpleUploadedFile(f"{code}.pdf", b"%PDF-1.4\ncontenido", content_type="application/pdf"), self.admin)
        self.docs.aprobar_documento(DocumentoPostulacion.objects.get(pk=version.documento_id), self.admin)
        return version

    def complete_event(self, stage, event_type, evaluation_type):
        event = EventoDefensaService.programar_evento(self.post, stage, event_type, timezone.now() - timedelta(minutes=1), self.admin, lugar="Aula de defensa")
        if event_type == "DEFENSA_TEMATICA":
            for assignment in self.tribunal_assignments:
                participant = EventoDefensaService.agregar_participante(event, assignment, "TRIBUNAL", self.admin)
                # asistencia se registra con el evento en curso.
        EventoDefensaService.iniciar_evento(event, self.admin)
        if event_type == "DEFENSA_TEMATICA":
            for participant in event.participantes.all():
                EventoDefensaService.registrar_asistencia(participant, True, self.admin)
        EventoDefensaService.finalizar_evento(event, self.admin)
        if evaluation_type == "TEMATICA":
            EvaluacionDefensaService.registrar_evaluacion_tematica(event, self.admin, "SUFICIENTE")
        else:
            EvaluacionDefensaService.registrar_evaluacion_perfil(event, self.admin, "SUFICIENTE")
        EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)

    def test_recorrido_real_habilita_defensa_privada_solo_despues_de_revision_tribunal(self):
        for code in ("CARTA_SOLICITUD", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"):
            self.upload_and_approve(code)
        WorkflowService.iniciar_etapa(self.stages["INSCRIPCION"], self.admin)
        WorkflowService.aprobar_etapa(self.stages["INSCRIPCION"], self.admin)

        thematic = self.stages["TEMATICA_TESIS"]
        WorkflowService.iniciar_etapa(thematic, self.admin)
        self.tribunal_assignments = [AsignacionService.asignar_actor(self.post, teacher, "TRIBUNAL", self.admin, orden_cargo=index, seguimiento_etapa=thematic) for index, teacher in enumerate(self.teachers[:3], 1)]
        self.complete_event(thematic, "DEFENSA_TEMATICA", "TEMATICA")
        tutor = AsignacionService.asignar_actor(self.post, self.teachers[3], "TUTOR", self.admin)

        self.upload_and_approve("PERFIL_TESIS"); tutor_evidence = self.upload_and_approve("INFORME_TUTOR_TESIS")
        profile = self.stages["PERFIL_TESIS"]; WorkflowService.iniciar_etapa(profile, self.admin); self.complete_event(profile, "DEFENSA_PERFIL", "PERFIL")
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
