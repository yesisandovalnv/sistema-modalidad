from django.test import TestCase
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento
from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Postulacion
from apps.usuarios.models import CustomUser, Role


class SprintZeroSecurityContractTests(TestCase):
    """Contrato de autorización por autoridad real y alcance de datos."""

    @classmethod
    def setUpTestData(cls):
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_superuser("sec-admin", password="x", role=admin_role)
        cls.staff = CustomUser.objects.create_user("sec-staff", password="x", role=admin_role, is_staff=True)
        cls.role_only_admin = CustomUser.objects.create_user("sec-role-admin", password="x", role=admin_role)
        cls.teacher = CustomUser.objects.create_user("sec-teacher", password="x", role=teacher_role)
        cls.student = CustomUser.objects.create_user("sec-student", password="x", role=student_role)
        cls.other_student = CustomUser.objects.create_user("sec-other", password="x", role=student_role)
        cls.period = Periodo.objects.create(
            nombre="2026-I", gestion=2026, semestre="I",
            fecha_inicio="2026-01-01", fecha_fin="2026-06-30",
        )
        cls.modality = Modalidad.objects.create(codigo="SEC", nombre="Modalidad segura")
        cls.application_state = EstadoPostulacion.objects.create(codigo="REG", nombre="Registrada")
        cls.application = Postulacion.objects.create(
            codigo="SEC-OWN", estudiante=cls.student, modalidad=cls.modality,
            periodo=cls.period, estado_actual=cls.application_state,
        )
        cls.other_application = Postulacion.objects.create(
            codigo="SEC-OTHER", estudiante=cls.other_student, modalidad=cls.modality,
            periodo=cls.period, estado_actual=cls.application_state,
        )
        HistorialEstado.objects.create(
            postulacion=cls.application, estado_nuevo=cls.application_state, usuario=cls.staff,
        )
        document_state = EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado")
        document_type = TipoDocumento.objects.create(codigo="SEC", nombre="Documento seguro")
        cls.other_document = DocumentoPostulacion.objects.create(
            postulacion=cls.other_application, tipo_documento=document_type, estado=document_state,
        )

    def request_as(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_catalog_reads_are_authenticated_but_writes_require_admin_role(self):
        self.assertEqual(self.request_as(self.student).get("/api/v1/academico/modalidades/").status_code, 200)
        self.assertEqual(self.request_as(self.teacher).post("/api/v1/academico/modalidades/", {"codigo": "NO", "nombre": "No"}).status_code, 403)
        self.assertEqual(self.request_as(self.role_only_admin).post("/api/v1/academico/modalidades/", {"codigo": "ROLE", "nombre": "Por rol"}).status_code, 201)
        self.assertEqual(self.request_as(self.staff).post("/api/v1/academico/modalidades/", {"codigo": "STAFF", "nombre": "Con staff"}).status_code, 201)

    def test_student_only_lists_and_retrieves_owned_resources(self):
        client = self.request_as(self.student)
        response = client.get("/api/v1/postulaciones/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["codigo"] for item in response.data["results"]], ["SEC-OWN"])
        self.assertEqual(client.get(f"/api/v1/postulaciones/{self.other_application.pk}/").status_code, 404)
        self.assertEqual(client.get(f"/api/v1/documentos/documentos/{self.other_document.pk}/").status_code, 404)

    def test_history_is_read_only_for_every_role(self):
        client = self.request_as(self.admin)
        history_id = HistorialEstado.objects.get(postulacion=self.application).pk
        self.assertEqual(client.post("/api/v1/postulaciones/historial/", {}).status_code, 405)
        self.assertEqual(client.patch(f"/api/v1/postulaciones/historial/{history_id}/", {}).status_code, 405)
        self.assertEqual(client.delete(f"/api/v1/postulaciones/historial/{history_id}/").status_code, 405)

    def test_technical_states_and_applications_cannot_be_physically_deleted(self):
        client = self.request_as(self.admin)
        self.assertEqual(client.delete(f"/api/v1/postulaciones/estados/{self.application_state.pk}/").status_code, 405)
        self.assertEqual(client.delete(f"/api/v1/postulaciones/{self.application.pk}/").status_code, 405)

    def test_workflow_transition_rejects_teacher_before_object_lookup(self):
        response = self.request_as(self.teacher).post("/api/v1/seguimientos-etapa/999999/iniciar/", {})
        self.assertEqual(response.status_code, 403)
