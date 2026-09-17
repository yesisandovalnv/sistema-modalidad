import tempfile

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.academico.models import DocumentoOficialModalidad, Modalidad
from apps.usuarios.models import AuditLog, CustomUser, Role


@override_settings(MEDIA_ROOT=tempfile.mkdtemp(prefix="modalidad-docs-"))
class DocumentoOficialModalidadApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("modalidad-doc-admin", role=cls.admin_role, is_staff=True)
        cls.superuser = CustomUser.objects.create_superuser("modalidad-doc-superuser")
        cls.teacher = CustomUser.objects.create_user("modalidad-doc-teacher", role=cls.teacher_role)
        cls.student = CustomUser.objects.create_user("modalidad-doc-student", role=cls.student_role)
        cls.modalidad = Modalidad.objects.create(codigo="MODALIDAD_DOCUMENTO", nombre="Modalidad documento", descripcion="Inicial")
        cls.otra_modalidad = Modalidad.objects.create(codigo="MODALIDAD_DOCUMENTO_2", nombre="Modalidad documento 2")

    def client_as(self, user=None):
        client = APIClient()
        if user:
            client.force_authenticate(user)
        return client

    def pdf(self, name="requisitos.pdf", content=b"%PDF-1.7\ncontenido"):
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def collection_url(self, modalidad=None):
        return f"/api/v1/academico/modalidades/{(modalidad or self.modalidad).pk}/documentos-oficiales/"

    def detail_url(self, document_id, modalidad=None):
        return f"{self.collection_url(modalidad)}{document_id}/"

    def download_url(self, document_id, modalidad=None):
        return f"{self.detail_url(document_id, modalidad)}descargar/"

    def add(self, user=None, modalidad=None, name="Requisitos oficiales"):
        response = self.client_as(user or self.admin).post(self.collection_url(modalidad), {"archivo": self.pdf(name=f"{name}.pdf"), "nombre": name}, format="multipart")
        self.assertEqual(response.status_code, 201)
        return DocumentoOficialModalidad.objects.get(pk=response.data["id"])

    def test_modalidad_can_have_zero_one_or_multiple_documents(self):
        self.assertEqual(self.client_as(self.student).get(self.collection_url()).json(), [])
        first = self.add(name="Requisitos A")
        self.assertEqual(self.client_as(self.student).get(self.collection_url()).json()[0]["id"], first.pk)
        second = self.add(name="Requisitos B")
        self.assertEqual(DocumentoOficialModalidad.objects.filter(modalidad=self.modalidad).count(), 2)
        self.assertEqual({item["id"] for item in self.client_as(self.student).get(self.collection_url()).json()}, {first.pk, second.pk})

    def test_examen_like_modality_needs_no_special_logic_for_two_documents(self):
        exam = Modalidad.objects.create(codigo="EXAMEN_GRADO", nombre="Examen de Grado")
        self.add(modalidad=exam, name="Contenidos")
        self.add(modalidad=exam, name="Reglamento")
        self.assertEqual(DocumentoOficialModalidad.objects.filter(modalidad=exam).count(), 2)

    def test_documents_of_different_modalities_are_isolated(self):
        first = self.add(name="A")
        other = self.add(modalidad=self.otra_modalidad, name="B")
        self.assertEqual(self.client_as(self.student).get(self.detail_url(first.pk, self.otra_modalidad)).status_code, 404)
        self.assertEqual(self.client_as(self.student).get(self.download_url(first.pk, self.otra_modalidad)).status_code, 404)
        self.assertEqual(self.client_as(self.admin).patch(self.detail_url(first.pk, self.otra_modalidad), {"archivo": self.pdf("wrong.pdf")}, format="multipart").status_code, 404)
        self.assertNotEqual(first.modalidad_id, other.modalidad_id)

    def test_student_can_list_and_download_each_document_but_cannot_mutate(self):
        first = self.add(name="A")
        second = self.add(name="B")
        client = self.client_as(self.student)
        self.assertEqual(client.get(self.collection_url()).status_code, 200)
        for document in (first, second):
            response = client.get(self.download_url(document.pk))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(b"".join(response.streaming_content)[:5], b"%PDF-")
        self.assertEqual(client.post(self.collection_url(), {"archivo": self.pdf()}, format="multipart").status_code, 403)
        self.assertEqual(client.patch(self.detail_url(first.pk), {"archivo": self.pdf("new.pdf")}, format="multipart").status_code, 403)

    def test_teacher_can_read_but_cannot_add_or_update(self):
        document = self.add()
        client = self.client_as(self.teacher)
        self.assertEqual(client.get(self.collection_url()).status_code, 200)
        self.assertEqual(client.get(self.download_url(document.pk)).status_code, 200)
        self.assertEqual(client.post(self.collection_url(), {"archivo": self.pdf()}, format="multipart").status_code, 403)
        self.assertEqual(client.patch(self.detail_url(document.pk), {"archivo": self.pdf("new.pdf")}, format="multipart").status_code, 403)

    def test_admin_can_add_multiple_and_update_only_selected_document(self):
        first = self.add(name="A")
        second = self.add(name="B")
        old_name = second.archivo.name
        response = self.client_as(self.admin).patch(self.detail_url(first.pk), {"archivo": self.pdf("updated.pdf"), "nombre": "A actualizado"}, format="multipart")
        self.assertEqual(response.status_code, 200)
        first.refresh_from_db(); second.refresh_from_db()
        self.assertEqual(first.nombre, "A actualizado")
        self.assertEqual(second.nombre, "B")
        self.assertEqual(second.archivo.name, old_name)
        self.assertEqual(AuditLog.objects.filter(accion="PUBLICAR_DOCUMENTO_OFICIAL_MODALIDAD", descripcion__contains=f"documento {first.pk}").count(), 1)
        self.assertEqual(AuditLog.objects.filter(accion="PUBLICAR_DOCUMENTO_OFICIAL_MODALIDAD", descripcion__contains=f"documento {second.pk}").count(), 1)
        self.assertEqual(AuditLog.objects.filter(accion="ACTUALIZAR_DOCUMENTO_OFICIAL_MODALIDAD", descripcion__contains=f"documento {first.pk}").count(), 1)

    def test_create_requires_a_non_blank_name(self):
        response = self.client_as(self.admin).post(self.collection_url(), {"archivo": self.pdf()}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("nombre", response.data)
        response = self.client_as(self.admin).post(self.collection_url(), {"archivo": self.pdf(), "nombre": "   "}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_patch_only_name_preserves_file_and_audits_update(self):
        document = self.add(name="Nombre anterior")
        old_file = document.archivo.name
        response = self.client_as(self.admin).patch(self.detail_url(document.pk), {"nombre": "Nombre corregido"}, format="multipart")
        self.assertEqual(response.status_code, 200)
        document.refresh_from_db()
        self.assertEqual(document.nombre, "Nombre corregido")
        self.assertEqual(document.archivo.name, old_file)
        self.assertTrue(document.archivo.storage.exists(old_file))
        self.assertEqual(AuditLog.objects.filter(accion="ACTUALIZAR_DOCUMENTO_OFICIAL_MODALIDAD", descripcion__contains=f"documento {document.pk}").count(), 1)

    def test_patch_only_file_preserves_name_and_replaces_old_file(self):
        document = self.add(name="Nombre estable")
        old_file = document.archivo.name
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client_as(self.admin).patch(self.detail_url(document.pk), {"archivo": self.pdf("reemplazo.pdf")}, format="multipart")
        self.assertEqual(response.status_code, 200)
        document.refresh_from_db()
        self.assertEqual(document.nombre, "Nombre estable")
        self.assertNotEqual(document.archivo.name, old_file)
        self.assertFalse(document.archivo.storage.exists(old_file))

    def test_rejects_non_pdf_and_oversized_file(self):
        client = self.client_as(self.admin)
        self.assertEqual(client.post(self.collection_url(), {"archivo": SimpleUploadedFile("x.txt", b"texto")}, format="multipart").status_code, 400)
        oversized = self.pdf("grande.pdf", b"%PDF-" + b"x" * (10 * 1024 * 1024))
        self.assertEqual(client.post(self.collection_url(), {"archivo": oversized}, format="multipart").status_code, 400)

    def test_missing_document_collection_is_empty_and_unauthenticated_download_is_denied(self):
        self.assertEqual(self.client_as(self.student).get(self.collection_url()).json(), [])
        self.assertEqual(self.client_as().get(self.download_url(999)).status_code, 401)

    def test_admin_and_superuser_keep_modality_protections(self):
        for user in (self.admin, self.superuser):
            url = f"/api/v1/academico/modalidades/{self.modalidad.pk}/"
            self.assertEqual(self.client_as(user).post("/api/v1/academico/modalidades/", {"codigo": "NEW", "nombre": "New"}).status_code, 405)
            self.assertEqual(self.client_as(user).delete(url).status_code, 405)
            self.assertEqual(self.client_as(user).patch(url, {"codigo": "NEW"}, format="json").status_code, 400)
            self.assertEqual(self.client_as(user).patch(url, {"nombre": "New"}, format="json").status_code, 400)
        self.assertEqual(self.client_as(self.admin).patch(f"/api/v1/academico/modalidades/{self.modalidad.pk}/", {"descripcion": "Actualizada"}, format="json").status_code, 200)
