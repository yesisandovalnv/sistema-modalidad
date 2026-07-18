import shutil
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import (
    DocumentoPostulacion,
    EstadoDocumento,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)
from apps.postulantes.models import EstadoPostulacion, Postulacion
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class DocumentoAPITestCase(APITestCase):
    """Base de pruebas API para el módulo de documentos."""

    def setUp(self) -> None:
        temp_root = Path(settings.BASE_DIR) / ".tmp_test_media"
        temp_root.mkdir(exist_ok=True)
        self._tmp_media = temp_root / uuid4().hex
        self._tmp_media.mkdir(parents=True, exist_ok=False)
        (self._tmp_media / "documentos" / "versiones").mkdir(parents=True, exist_ok=True)
        self.override_media = override_settings(MEDIA_ROOT=str(self._tmp_media))
        self.override_media.enable()

        self.admin_role = Role.objects.create(codigo="ADMIN", nombre="Administrador")
        self.student_role = Role.objects.create(codigo="EST", nombre="Estudiante")

        self.admin_user = User.objects.create_user(
            username="admin_documentos",
            password="adminpass123",
            role=self.admin_role,
            is_staff=True,
            is_superuser=True,
        )
        self.student_user = User.objects.create_user(
            username="estudiante_documentos",
            password="estudiante123",
            role=self.student_role,
        )
        self.other_student = User.objects.create_user(
            username="estudiante_otro",
            password="estudiante456",
            role=self.student_role,
        )

        self.periodo = Periodo.objects.create(
            nombre="2026-1",
            fecha_inicio="2026-01-01",
            fecha_fin="2026-06-30",
        )
        self.modalidad = Modalidad.objects.create(codigo="MOD1", nombre="Modalidad Test")

        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )

        self.postulacion = Postulacion.objects.create(
            codigo="POST-001",
            estudiante=self.student_user,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        self.other_postulacion = Postulacion.objects.create(
            codigo="POST-002",
            estudiante=self.other_student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        self.estado_env = EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado")
        self.estado_apr = EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado")
        self.estado_rec = EstadoDocumento.objects.create(codigo="REC", nombre="Rechazado")

        self.tipo_pdf = TipoDocumento.objects.create(
            codigo="PDF",
            nombre="Documento PDF",
            extensiones_permitidas="pdf",
            tamano_maximo_mb=1,
        )

    def tearDown(self) -> None:
        for version in VersionDocumento.all_objects.all():
            if version.archivo.name:
                version.archivo.close()
        self.override_media.disable()
        shutil.rmtree(self._tmp_media, ignore_errors=False)

    def authenticate_user(self, user: User) -> None:
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def create_pdf_file(self, name="documento.pdf", content=b"%PDF-1.4", size: int | None = None) -> SimpleUploadedFile:
        if size is None:
            return SimpleUploadedFile(name, content, content_type="application/pdf")
        return SimpleUploadedFile(name, b"x" * size, content_type="application/pdf")

    def upload_document(self, user: User, postulacion_id: int, tipo_documento_id: int, file: SimpleUploadedFile):
        self.authenticate_user(user)
        return self.client.post(
            "/api/v1/documentos/documentos/subir/",
            {
                "postulacion_id": postulacion_id,
                "tipo_documento_id": tipo_documento_id,
                "archivo": file,
            },
            format="multipart",
        )


class TestDocumentoUpload(DocumentoAPITestCase):
    """Pruebas de carga de documentos y validaciones de subida."""

    def test_subida_inicial_crea_documento_version_y_auditlog(self) -> None:
        """La subida inicial debe crear el documento y la primera versión."""
        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        self.assertEqual(documento.estado, self.estado_env)

        version = VersionDocumento.objects.get(documento=documento, numero_version=1)
        self.assertTrue(version.es_version_actual)

        self.assertTrue(
            AuditLog.objects.filter(
                usuario=self.student_user,
                accion="UPLOAD",
                modulo="DOCUMENTOS",
            ).exists()
        )

    def test_nueva_version_actualiza_estados_de_version_y_no_duplica_documento(self) -> None:
        """Una segunda subida debe crear la versión 2 sin duplicar el documento."""
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        response = self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name="documento_v2.pdf"))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        self.assertEqual(DocumentoPostulacion.objects.filter(postulacion=self.postulacion, tipo_documento=self.tipo_pdf).count(), 1)

        versiones = VersionDocumento.objects.filter(documento=documento).order_by("numero_version")
        self.assertEqual(versiones.count(), 2)
        self.assertFalse(versiones[0].es_version_actual)
        self.assertTrue(versiones[1].es_version_actual)

    def test_subida_rechaza_extension_invalida(self) -> None:
        """La subida debe rechazar archivos con extensión no permitida."""
        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            SimpleUploadedFile("documento.jpg", b"JPEG DATA", content_type="image/jpeg"),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("extensión", str(response.data).lower())

    def test_subida_rechaza_archivo_grande(self) -> None:
        """La subida debe rechazar archivos que superan el límite de tamaño."""
        file_too_large = self.create_pdf_file(size=(self.tipo_pdf.tamano_maximo_mb * 1024 * 1024) + 1)
        response = self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, file_too_large)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("supera", str(response.data).lower())

    def test_subida_rechaza_sin_archivo(self) -> None:
        """La subida debe rechazar cuando no se envía archivo."""
        self.authenticate_user(self.student_user)
        response = self.client.post(
            "/api/v1/documentos/documentos/subir/",
            {
                "postulacion_id": self.postulacion.id,
                "tipo_documento_id": self.tipo_pdf.id,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("archivo", str(response.data).lower())

    def test_propietario_puede_subir_documento(self) -> None:
        """El estudiante propietario debe poder subir documentos a su postulación."""
        response = self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_otro_estudiante_no_puede_subir_a_otra_postulacion(self) -> None:
        """Otro estudiante no debe poder subir documentos a una postulación ajena."""
        response = self.upload_document(self.other_student, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_generico_documentos_devuelve_405(self) -> None:
        """El endpoint genérico de creación debe bloquearse en favor de /subir/."""
        self.authenticate_user(self.student_user)
        response = self.client.post(
            "/api/v1/documentos/documentos/",
            {
                "postulacion": self.postulacion.id,
                "tipo_documento": self.tipo_pdf.id,
                "estado": self.estado_env.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertIn("subir", str(response.data).lower())


class TestDocumentoSeguridad(DocumentoAPITestCase):
    """Pruebas de seguridad de acceso a documentos."""

    def _documento_con_observacion(self, postulacion: Postulacion, owner: User, comentario: str) -> DocumentoPostulacion:
        self.upload_document(owner, postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=postulacion, tipo_documento=self.tipo_pdf)
        self.authenticate_user(self.admin_user)
        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": comentario},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return documento

    def test_estudiante_ve_solo_sus_documentos(self) -> None:
        """Un estudiante solo debe ver los documentos de sus postulaciones."""
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.authenticate_user(self.student_user)
        response = self.client.get("/api/v1/documentos/documentos/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIsNone(response.data["next"])
        self.assertIsNone(response.data["previous"])
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["postulacion"], self.postulacion.id)

    def test_admin_ve_todos_los_documentos(self) -> None:
        """El administrador debe poder ver todos los documentos."""
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.authenticate_user(self.admin_user)
        response = self.client.get("/api/v1/documentos/documentos/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertIsNone(response.data["next"])
        self.assertIsNone(response.data["previous"])
        self.assertEqual(len(response.data["results"]), 2)

    def test_estudiante_no_accede_versiones_de_otro_documento(self) -> None:
        """Un estudiante no debe acceder a las versiones de un documento ajeno."""
        response_upload = self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertEqual(response_upload.status_code, status.HTTP_201_CREATED)

        documento_otro = DocumentoPostulacion.objects.get(postulacion=self.other_postulacion, tipo_documento=self.tipo_pdf)
        self.authenticate_user(self.student_user)
        response = self.client.get(f"/api/v1/documentos/documentos/{documento_otro.id}/versiones/", format="json")

        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_estudiante_ve_solo_sus_versiones(self) -> None:
        """El listado global de versiones debe limitarse al propietario."""
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.authenticate_user(self.student_user)
        response = self.client.get("/api/v1/documentos/versiones/", format="json")

        documento_propio = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["documento"], documento_propio.id)

    def test_estudiante_ajeno_no_puede_recuperar_version_por_id(self) -> None:
        """Un estudiante no debe recuperar una versión ajena por ID."""
        self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        version_ajena = VersionDocumento.objects.get(documento__postulacion=self.other_postulacion)

        self.authenticate_user(self.student_user)
        response = self.client.get(f"/api/v1/documentos/versiones/{version_ajena.id}/", format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_ve_todas_las_versiones(self) -> None:
        """El administrador debe poder listar todas las versiones."""
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.authenticate_user(self.admin_user)
        response = self.client.get("/api/v1/documentos/versiones/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_estudiante_ve_solo_sus_observaciones(self) -> None:
        """El listado global de observaciones debe limitarse al propietario."""
        documento_propio = self._documento_con_observacion(self.postulacion, self.student_user, "Observación propia")
        self._documento_con_observacion(self.other_postulacion, self.other_student, "Observación ajena")

        self.authenticate_user(self.student_user)
        response = self.client.get("/api/v1/documentos/observaciones/", format="json")

        version_propia = VersionDocumento.objects.get(documento=documento_propio)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["version_documento"], version_propia.id)

    def test_estudiante_ajeno_no_puede_recuperar_observacion_por_id(self) -> None:
        """Un estudiante no debe recuperar una observación ajena por ID."""
        self._documento_con_observacion(self.other_postulacion, self.other_student, "Observación ajena")
        observacion_ajena = ObservacionDocumento.objects.get(
            version_documento__documento__postulacion=self.other_postulacion
        )

        self.authenticate_user(self.student_user)
        response = self.client.get(f"/api/v1/documentos/observaciones/{observacion_ajena.id}/", format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_ve_todas_las_observaciones(self) -> None:
        """El administrador debe poder listar todas las observaciones."""
        self._documento_con_observacion(self.postulacion, self.student_user, "Observación propia")
        self._documento_con_observacion(self.other_postulacion, self.other_student, "Observación ajena")

        self.authenticate_user(self.admin_user)
        response = self.client.get("/api/v1/documentos/observaciones/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)


class TestDocumentoRevision(DocumentoAPITestCase):
    """Pruebas de revisión, aprobación, rechazo y observaciones de documentos."""

    def _create_documento_con_version(self) -> DocumentoPostulacion:
        upload = self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)
        return DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)

    def test_aprobar_documento_solo_admin(self) -> None:
        """Solo el administrador debe poder aprobar documentos."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)

        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        documento.refresh_from_db()
        self.assertEqual(documento.estado, self.estado_apr)
        self.assertIsNotNone(documento.fecha_revision)
        self.assertFalse(documento.requiere_correccion)
        self.assertEqual(VersionDocumento.objects.filter(documento=documento).count(), 1)
        self.assertTrue(
            AuditLog.objects.filter(usuario=self.admin_user, accion="APPROVE", modulo="DOCUMENTOS").exists()
        )

    def test_rechazar_documento(self) -> None:
        """El rechazo debe actualizar el estado REC y guardar el motivo."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)

        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
            {"motivo": "El documento no tiene firma."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        documento.refresh_from_db()
        self.assertEqual(documento.estado, self.estado_rec)
        self.assertTrue(documento.requiere_correccion)
        self.assertEqual(documento.observacion_general, "El documento no tiene firma.")
        self.assertTrue(
            AuditLog.objects.filter(usuario=self.admin_user, accion="REJECT", modulo="DOCUMENTOS").exists()
        )

    def test_registrar_observacion_documento(self) -> None:
        """Registrar observación debe crear el registro y marcar el documento para corrección."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)

        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": "Falta sello"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        observacion = ObservacionDocumento.objects.get(version_documento__documento=documento)
        self.assertEqual(observacion.version_documento.documento, documento)
        self.assertFalse(observacion.leida_por_estudiante)
        self.assertFalse(observacion.corregida)

        documento.refresh_from_db()
        self.assertTrue(documento.requiere_correccion)
        self.assertTrue(
            AuditLog.objects.filter(usuario=self.admin_user, accion="COMMENT", modulo="DOCUMENTOS").exists()
        )

    def test_marcar_observacion_corregida(self) -> None:
        """Marcar observación como corregida debe actualizar estado y fecha de corrección."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        response_observar = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": "Falta sello"},
            format="json",
        )
        self.assertEqual(response_observar.status_code, status.HTTP_201_CREATED)

        observacion = ObservacionDocumento.objects.get(version_documento__documento=documento)
        response = self.client.post(f"/api/v1/documentos/observaciones/{observacion.id}/marcar-corregida/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        observacion.refresh_from_db()
        self.assertTrue(observacion.corregida)
        self.assertIsNotNone(observacion.fecha_correccion)

        documento.refresh_from_db()
        self.assertFalse(documento.requiere_correccion)

    def test_versiones_devuelve_todas_las_versiones_ordenadas(self) -> None:
        """El endpoint de versiones debe devolver todas las versiones del documento ordenadas."""
        documento = self._create_documento_con_version()
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name="documento_v2.pdf"))

        self.authenticate_user(self.student_user)
        response = self.client.get(f"/api/v1/documentos/documentos/{documento.id}/versiones/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["numero_version"], 2)
        self.assertEqual(response.data[1]["numero_version"], 1)

    def test_aprobar_documento_ya_aprobado_rechaza(self) -> None:
        """Aprobar un documento ya aprobado debe devolver error."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")

        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_documento_ya_rechazado_rechaza(self) -> None:
        """Rechazar un documento ya rechazado debe devolver error."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
            {"motivo": "El documento no tiene firma."},
            format="json",
        )

        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
            {"motivo": "Otro motivo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aprobar_documento_sin_versiones_rechaza(self) -> None:
        """Aprobar un documento sin versiones debe devolver error."""
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
            estado=self.estado_env,
        )
        self.authenticate_user(self.admin_user)

        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_observar_documento_sin_version_actual_rechaza(self) -> None:
        """Observar un documento sin versión actual debe devolver error."""
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
            estado=self.estado_env,
        )
        self.authenticate_user(self.admin_user)

        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": "Falta firma"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_marcar_observacion_corregida_rechaza_si_ya_corregida(self) -> None:
        """Marcar como corregida una observación ya corregida debe devolver error."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": "Falta sello"},
            format="json",
        )
        observacion = ObservacionDocumento.objects.get(version_documento__documento=documento)
        self.client.post(f"/api/v1/documentos/observaciones/{observacion.id}/marcar-corregida/", {}, format="json")

        response = self.client.post(f"/api/v1/documentos/observaciones/{observacion.id}/marcar-corregida/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_estudiante_no_puede_aprobar_documento(self) -> None:
        """Un estudiante no debe poder aprobar un documento."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.student_user)

        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_estudiante_no_puede_rechazar_documento(self) -> None:
        """Un estudiante no debe poder rechazar un documento."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.student_user)

        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
            {"motivo": "Motivo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_estudiante_no_puede_marcar_observacion_corregida(self) -> None:
        """Un estudiante no debe poder marcar una observación como corregida."""
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": "Falta sello"},
            format="json",
        )
        observacion = ObservacionDocumento.objects.get(version_documento__documento=documento)

        self.authenticate_user(self.student_user)
        response = self.client.post(f"/api/v1/documentos/observaciones/{observacion.id}/marcar-corregida/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
