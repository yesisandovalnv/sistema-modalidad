import shutil
from pathlib import Path
from unittest.mock import patch
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
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion
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
            gestion=2026,
            semestre="I",
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


class TestVersionDocumentoDownload(DocumentoAPITestCase):
    def _create_version(self, content=b"%PDF-1.4 contenido protegido") -> VersionDocumento:
        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="documento-final.pdf", content=content),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return VersionDocumento.objects.get(pk=response.data["id"])

    def _download(self, version: VersionDocumento, user: User):
        self.authenticate_user(user)
        return self.client.get(f"/api/v1/documentos/versiones/{version.pk}/descargar/")

    def test_staff_descarga_archivo_con_nombre_y_contenido_correctos(self) -> None:
        content = b"%PDF-1.4 contenido exacto"
        version = self._create_version(content)

        response = self._download(version, self.admin_user)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Disposition"], 'attachment; filename="documento-final.pdf"')
        self.assertEqual(b"".join(response.streaming_content), content)
        self.assertNotIn(str(self._tmp_media), response["Content-Disposition"])

    def test_estudiante_propietario_descarga(self) -> None:
        version = self._create_version()
        response = self._download(version, self.student_user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_actor_asignado_descarga_dentro_de_su_alcance(self) -> None:
        version = self._create_version()
        actor = User.objects.create_user(username="actor-descarga")
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=actor,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            designado_por=self.admin_user,
        )

        response = self._download(version, actor)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_usuario_ajeno_no_descarga(self) -> None:
        version = self._create_version()
        response = self._download(version, self.other_student)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requiere_autenticacion(self) -> None:
        version = self._create_version()
        self.client.credentials()
        response = self.client.get(f"/api/v1/documentos/versiones/{version.pk}/descargar/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_version_inexistente_o_inactiva_no_descarga(self) -> None:
        version = self._create_version()
        self.authenticate_user(self.admin_user)
        missing = self.client.get("/api/v1/documentos/versiones/999999/descargar/")
        self.assertEqual(missing.status_code, status.HTTP_404_NOT_FOUND)

        version.activo = False
        version.save(update_fields=["activo"])
        inactive = self.client.get(f"/api/v1/documentos/versiones/{version.pk}/descargar/")
        self.assertEqual(inactive.status_code, status.HTTP_404_NOT_FOUND)

    def test_archivo_fisico_faltante_responde_404(self) -> None:
        version = self._create_version()
        version.archivo.storage.delete(version.archivo.name)
        response = self._download(version, self.admin_user)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


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

    def test_fallo_posterior_al_guardado_revierte_registros_y_elimina_solo_archivo_nuevo(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        anterior = VersionDocumento.objects.get(documento=documento)
        ruta_anterior = Path(anterior.archivo.path)
        archivos_antes = set(self._tmp_media.rglob("*.pdf"))

        with patch("apps.documentos.services.DocumentoService._registrar_auditoria", side_effect=RuntimeError("fallo posterior")):
            with self.assertRaises(RuntimeError):
                self.upload_document(
                    self.student_user, self.postulacion.id, self.tipo_pdf.id,
                    self.create_pdf_file(name="version-fallida.pdf"),
                )

        self.assertEqual(VersionDocumento.objects.filter(documento=documento).count(), 1)
        anterior.refresh_from_db()
        self.assertTrue(anterior.es_version_actual)
        self.assertTrue(ruta_anterior.exists())
        self.assertEqual(set(self._tmp_media.rglob("*.pdf")), archivos_antes)

    def test_fallo_en_primera_version_no_deja_documento_ni_archivo(self) -> None:
        with patch("apps.documentos.services.DocumentoService._registrar_auditoria", side_effect=RuntimeError("fallo posterior")):
            with self.assertRaises(RuntimeError):
                self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertFalse(DocumentoPostulacion.all_objects.filter(postulacion=self.postulacion, tipo_documento=self.tipo_pdf).exists())
        self.assertEqual(list(self._tmp_media.rglob("*.pdf")), [])

    def test_staff_puede_subir_y_actor_asignado_no_staff_no_puede(self) -> None:
        staff = User.objects.create_user(username="staff-carga", is_staff=True)
        response = self.upload_document(staff, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        tipo_otro = TipoDocumento.objects.create(
            codigo="PDF2", nombre="Segundo PDF", extensiones_permitidas="pdf", tamano_maximo_mb=1,
        )
        actor = User.objects.create_user(username="actor-asignado")
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=actor,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin_user,
        )
        denied = self.upload_document(actor, self.postulacion.id, tipo_otro.id, self.create_pdf_file())
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

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

    def test_subida_rechaza_pdf_disfrazado(self) -> None:
        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            SimpleUploadedFile("documento.pdf", b"contenido ejecutable", content_type="application/pdf"),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contenido", str(response.data).lower())

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

    def test_filtros_exactos_y_campos_legibles_conservan_ids(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.upload_document(self.other_student, self.other_postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion)
        version = VersionDocumento.objects.get(documento=documento)
        self.authenticate_user(self.admin_user)
        observation = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/",
            {"comentario": "Observación exacta"}, format="json",
        )
        self.assertEqual(observation.status_code, 201)

        documents = self.client.get("/api/v1/documentos/documentos/", {"postulacion": self.postulacion.id})
        versions = self.client.get("/api/v1/documentos/versiones/", {"documento": documento.id})
        observations = self.client.get("/api/v1/documentos/observaciones/", {"version_documento": version.id})
        self.assertEqual(documents.data["count"], 1)
        self.assertEqual(documents.data["results"][0]["postulacion"], self.postulacion.id)
        self.assertEqual(documents.data["results"][0]["tipo_documento"], self.tipo_pdf.id)
        self.assertEqual(documents.data["results"][0]["tipo_documento_nombre"], "Documento PDF")
        self.assertEqual(documents.data["results"][0]["estado"], self.estado_env.id)
        self.assertEqual(documents.data["results"][0]["estado_nombre"], "Enviado")
        self.assertEqual(versions.data["count"], 1)
        self.assertEqual(versions.data["results"][0]["documento"], documento.id)
        self.assertEqual(versions.data["results"][0]["subido_por_nombre"], "estudiante_documentos")
        self.assertEqual(observations.data["count"], 1)
        self.assertEqual(observations.data["results"][0]["version_documento"], version.id)
        self.assertEqual(observations.data["results"][0]["usuario_nombre"], "admin_documentos")

    def test_actores_activo_e_historico_consultan_documentos_y_archivo_autorizado(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion)
        version = VersionDocumento.objects.get(documento=documento)
        active = User.objects.create_user(username="revisor-activo")
        historical = User.objects.create_user(username="revisor-historico")
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=active,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            designado_por=self.admin_user,
        )
        old = AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=historical,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin_user,
        )
        old.activo = False
        old.save(update_fields=["activo"])
        for user in (active, historical):
            with self.subTest(user=user.username):
                self.authenticate_user(user)
                listing = self.client.get("/api/v1/documentos/documentos/", {"postulacion": self.postulacion.id})
                detail = self.client.get(f"/api/v1/documentos/versiones/{version.id}/")
                self.assertEqual(listing.data["count"], 1)
                self.assertEqual(detail.status_code, 200)
                self.assertTrue(detail.data["archivo"])
        self.authenticate_user(self.other_student)
        self.assertEqual(self.client.get(f"/api/v1/documentos/versiones/{version.id}/").status_code, 404)

    def test_staff_y_anonimo_conservan_alcance_de_consulta(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        staff = User.objects.create_user(username="staff-documentos", is_staff=True)
        self.authenticate_user(staff)
        self.assertEqual(
            self.client.get("/api/v1/documentos/documentos/", {"postulacion": self.postulacion.id}).data["count"],
            1,
        )
        self.client.credentials()
        for url in (
            "/api/v1/documentos/documentos/",
            "/api/v1/documentos/versiones/",
            "/api/v1/documentos/observaciones/",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 401)

    def test_consultas_no_auditan_y_metodos_base_siguen_bloqueados(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion)
        version = VersionDocumento.objects.get(documento=documento)
        self.authenticate_user(self.admin_user)
        before = AuditLog.objects.count()
        self.client.get("/api/v1/documentos/documentos/", {"postulacion": self.postulacion.id})
        self.client.get("/api/v1/documentos/versiones/", {"documento": documento.id})
        self.client.get("/api/v1/documentos/observaciones/", {"version_documento": version.id})
        self.assertEqual(AuditLog.objects.count(), before)
        detail = f"/api/v1/documentos/documentos/{documento.id}/"
        self.assertEqual(self.client.post("/api/v1/documentos/documentos/", {}).status_code, 405)
        self.assertEqual(self.client.put(detail, {}).status_code, 405)
        self.assertEqual(self.client.patch(detail, {}).status_code, 405)
        self.assertEqual(self.client.delete(detail).status_code, 405)

    def test_versiones_y_observaciones_paginan_sin_perder_registros(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        for index in range(1, 22):
            self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name=f"v{index + 1}.pdf"))
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion)
        versions = VersionDocumento.objects.filter(documento=documento).order_by("numero_version")
        self.assertEqual(versions.count(), 22)
        self.assertEqual(versions.filter(es_version_actual=True).count(), 1)
        self.authenticate_user(self.admin_user)
        first = self.client.get("/api/v1/documentos/versiones/", {"documento": documento.id, "ordering": "numero_version"})
        second = self.client.get("/api/v1/documentos/versiones/", {"documento": documento.id, "ordering": "numero_version", "page": 2})
        self.assertEqual((len(first.data["results"]), len(second.data["results"])), (20, 2))
        current = versions.get(es_version_actual=True)
        ObservacionDocumento.objects.bulk_create([
            ObservacionDocumento(version_documento=current, usuario=self.admin_user, comentario=f"Observación {index}")
            for index in range(21)
        ])
        observations = self.client.get("/api/v1/documentos/observaciones/", {"version_documento": current.id})
        observations_2 = self.client.get("/api/v1/documentos/observaciones/", {"version_documento": current.id, "page": 2})
        self.assertEqual((len(observations.data["results"]), len(observations_2.data["results"])), (20, 1))

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

    def test_apr_no_puede_rechazarse_ni_observarse(self) -> None:
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        rechazo = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/", {"motivo": "Cambio"}, format="json",
        )
        observacion = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Cambio"}, format="json",
        )
        self.assertEqual(rechazo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(observacion.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rec_no_puede_aprobarse_sin_nueva_version(self) -> None:
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/", {"motivo": "Incompleto"}, format="json",
        )
        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aprobar_falla_con_observaciones_pendientes_actuales(self) -> None:
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Corregir"}, format="json",
        )
        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, self.estado_env)

    def test_observaciones_historicas_no_bloquean_nueva_version_ni_aprobacion(self) -> None:
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Corregir v1"}, format="json",
        )
        self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name="documento-v2.pdf"),
        )
        documento.refresh_from_db()
        self.assertFalse(documento.requiere_correccion)
        self.authenticate_user(self.admin_user)
        response = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(ObservacionDocumento.objects.filter(corregida=False).exists())

    def test_corregir_recalcula_todas_las_observaciones_de_version_actual(self) -> None:
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        for comentario in ("Primera", "Segunda"):
            self.client.post(
                f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": comentario}, format="json",
            )
        observaciones = list(ObservacionDocumento.objects.order_by("pk"))
        first = self.client.post(
            f"/api/v1/documentos/observaciones/{observaciones[0].id}/marcar-corregida/", {}, format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        documento.refresh_from_db()
        self.assertTrue(documento.requiere_correccion)
        second = self.client.post(
            f"/api/v1/documentos/observaciones/{observaciones[1].id}/marcar-corregida/", {}, format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        documento.refresh_from_db()
        self.assertFalse(documento.requiere_correccion)
        self.assertTrue(AuditLog.objects.filter(usuario=self.admin_user, accion="CORRECT", modulo="DOCUMENTOS").exists())

    def test_corregir_observacion_historica_no_altera_pendientes_actuales(self) -> None:
        documento = self._create_documento_con_version()
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Histórica"}, format="json",
        )
        historica = ObservacionDocumento.objects.get(comentario="Histórica")
        self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name="documento-v2.pdf"),
        )
        self.authenticate_user(self.admin_user)
        self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Actual"}, format="json",
        )
        response = self.client.post(
            f"/api/v1/documentos/observaciones/{historica.id}/marcar-corregida/", {}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documento.refresh_from_db()
        self.assertTrue(documento.requiere_correccion)

    def test_observar_rechaza_postulacion_concluida(self) -> None:
        documento = self._create_documento_con_version()
        concluida = EstadoPostulacion.objects.create(codigo="CONCLUIDA", nombre="Concluida")
        self.postulacion.estado_actual = concluida
        self.postulacion.save(update_fields=["estado_actual"])
        self.authenticate_user(self.admin_user)
        response = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Fuera de flujo"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_y_superuser_pueden_revisar_pero_actor_asignado_no(self) -> None:
        documento = self._create_documento_con_version()
        staff = User.objects.create_user(username="staff-revisor", is_staff=True)
        self.authenticate_user(staff)
        aprobado = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(aprobado.status_code, status.HTTP_200_OK)

        self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name="documento-v2.pdf"),
        )
        actor = User.objects.create_user(username="actor-revisor")
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=actor,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            designado_por=self.admin_user,
        )
        self.authenticate_user(actor)
        denegado = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Sin autoridad"}, format="json",
        )
        self.assertEqual(denegado.status_code, status.HTTP_403_FORBIDDEN)

        superuser = User.objects.create_user(username="super-revisor", is_superuser=True)
        self.authenticate_user(superuser)
        observado = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Revisión autorizada"}, format="json",
        )
        self.assertEqual(observado.status_code, status.HTTP_201_CREATED)
