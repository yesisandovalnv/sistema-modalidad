import gc
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

from apps.academico.models import EtapaModalidad, Modalidad, ModalidadRequisito, Periodo, Requisito
from apps.modalidades.policies import (
    ActorCargaDocumento,
    BaseModalidadPolicy,
    BaseRequisitosPolicy,
    EtapaDefinition,
    ModalidadPolicyRegistry,
)
from apps.notificaciones.models import Notificacion
from apps.documentos.models import (
    DocumentoPostulacion,
    EstadoDocumento,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)
from apps.documentos.services import DocumentoService
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, EvaluacionDefensa, EventoDefensa, Postulacion, SeguimientoEtapa
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class TestDocumentRequirementsPolicy(BaseRequisitosPolicy):
    def get_documentos_requeridos(self, fase=None):
        return ("PDF",) if fase == "TEST_DOCUMENTAL" else ()


class TestDocumentPolicy(BaseModalidadPolicy):
    codigo = "MOD1"
    etapas = (EtapaDefinition("TEST_DOCUMENTAL", "Etapa documental de prueba", 1, inicial=True),)
    requisitos_policy = TestDocumentRequirementsPolicy()


ModalidadPolicyRegistry.register("MOD1", TestDocumentPolicy)


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

        self.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        self.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        self.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")

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
        self.test_stage = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="TEST_DOCUMENTAL",
            nombre="Etapa documental de prueba",
            orden=1,
            origen_normativo="Fixture de pruebas",
        )

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
        self.test_follow = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=self.test_stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        self.other_test_follow = SeguimientoEtapa.objects.create(
            postulacion=self.other_postulacion,
            etapa=self.test_stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
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
        gc.collect()
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


class TestDocumentUploadActorAuthorization(DocumentoAPITestCase):
    def actor_policy(self):
        return patch.object(
            TestDocumentRequirementsPolicy,
            "get_actores_carga_permitidos",
            return_value=(ActorCargaDocumento.ADMINISTRACION,),
        )

    def test_estudiante_recibe_capacidad_denegada_sin_ocultar_documento_aplicable(self):
        with self.actor_policy():
            capacidad = DocumentoService().obtener_capacidad_carga(
                postulacion=self.postulacion,
                tipo_documento=self.tipo_pdf,
                usuario=self.student_user,
            )
            self.authenticate_user(self.student_user)
            response = self.client.get(
                f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/"
            )

        self.assertFalse(capacidad["permitida"])
        self.assertEqual(capacidad["codigo"], "ACTOR_CARGA_NO_AUTORIZADO")
        self.assertEqual(
            capacidad["actores_carga_permitidos"],
            [ActorCargaDocumento.ADMINISTRACION],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["documentos_aplicables"]), 1)
        self.assertEqual(
            response.data["documentos_aplicables"][0]["capacidad_carga"],
            capacidad,
        )

    def test_estudiante_no_puede_realizar_primera_carga_directa(self):
        with self.actor_policy():
            response = self.upload_document(
                self.student_user,
                self.postulacion.pk,
                self.tipo_pdf.pk,
                self.create_pdf_file(name="institucional.pdf"),
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(DocumentoPostulacion.objects.filter(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        ).exists())

    def test_rechazo_o_correccion_no_elevan_privilegios_del_estudiante(self):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
            estado=self.estado_rec,
            requiere_correccion=True,
        )

        with self.actor_policy():
            rechazada = self.upload_document(
                self.student_user,
                self.postulacion.pk,
                self.tipo_pdf.pk,
                self.create_pdf_file(name="rechazada.pdf"),
            )
            documento.estado = self.estado_env
            documento.save(update_fields=["estado"])
            correccion = self.upload_document(
                self.student_user,
                self.postulacion.pk,
                self.tipo_pdf.pk,
                self.create_pdf_file(name="correccion.pdf"),
            )

        self.assertEqual(rechazada.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(correccion.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(VersionDocumento.objects.filter(documento=documento).exists())

    def test_administracion_conserva_primera_carga_y_nueva_version(self):
        with self.actor_policy():
            primera = self.upload_document(
                self.admin_user,
                self.postulacion.pk,
                self.tipo_pdf.pk,
                self.create_pdf_file(name="institucional-v1.pdf"),
            )
            segunda = self.upload_document(
                self.admin_user,
                self.postulacion.pk,
                self.tipo_pdf.pk,
                self.create_pdf_file(name="institucional-v2.pdf"),
            )

        self.assertEqual(primera.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        self.assertEqual(documento.versiones.count(), 2)
        self.assertEqual(documento.versiones.filter(es_version_actual=True).count(), 1)


class TestProyectoGradoHojaAprobacionActorAuthorization(DocumentoAPITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.pg_student = User.objects.create_user(
            username="estudiante-hoja-aprobacion",
            password="estudiante123",
            role=self.student_role,
        )
        self.pg_modalidad = Modalidad.objects.create(
            codigo="PROYECTO_GRADO",
            nombre="Proyecto de Grado hoja de aprobación",
        )
        self.pg_stage = EtapaModalidad.objects.create(
            modalidad=self.pg_modalidad,
            codigo="REVISION_FINAL_POST_PUBLICA",
            nombre="Revisión Final Post Pública",
            orden=7,
            origen_normativo="Fixture de autorización documental",
        )
        self.pg_postulacion = Postulacion.objects.create(
            codigo="POST-PG-HOJA-001",
            estudiante=self.pg_student,
            modalidad=self.pg_modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        SeguimientoEtapa.objects.create(
            postulacion=self.pg_postulacion,
            etapa=self.pg_stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        self.hoja_aprobacion = TipoDocumento.objects.create(
            codigo="HOJA_APROBACION",
            nombre="Hoja de Aprobación",
            extensiones_permitidas="pdf,doc,docx",
            permite_multiple_version=False,
        )

    def upload_hoja(self, user, name):
        return self.upload_document(
            user,
            self.pg_postulacion.pk,
            self.hoja_aprobacion.pk,
            self.create_pdf_file(name=name),
        )

    def test_estudiante_recibe_hoja_aplicable_pero_no_cargable_y_post_directo_403(self):
        self.authenticate_user(self.pg_student)
        applicable = self.client.get(
            f"/api/v1/postulaciones/{self.pg_postulacion.pk}/documentos-aplicables/"
        )
        upload = self.upload_hoja(self.pg_student, "hoja-estudiante.pdf")

        self.assertEqual(applicable.status_code, status.HTTP_200_OK)
        self.assertEqual(len(applicable.data["documentos_aplicables"]), 1)
        item = applicable.data["documentos_aplicables"][0]
        self.assertEqual(item["codigo"], "HOJA_APROBACION")
        self.assertEqual(item["capacidad_carga"], {
            "permitida": False,
            "codigo": "ACTOR_CARGA_NO_AUTORIZADO",
            "mensaje": "Este documento debe ser cargado por un actor autorizado.",
            "actores_carga_permitidos": [ActorCargaDocumento.ADMINISTRACION],
        })
        self.assertEqual(upload.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(DocumentoPostulacion.objects.filter(
            postulacion=self.pg_postulacion,
            tipo_documento=self.hoja_aprobacion,
        ).exists())

    def test_rechazo_y_correccion_no_conceden_permiso_al_estudiante(self):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.pg_postulacion,
            tipo_documento=self.hoja_aprobacion,
            estado=self.estado_rec,
            requiere_correccion=True,
        )

        rechazada = self.upload_hoja(self.pg_student, "hoja-rechazada.pdf")
        documento.estado = self.estado_env
        documento.save(update_fields=["estado"])
        correccion = self.upload_hoja(self.pg_student, "hoja-correccion.pdf")

        self.assertEqual(rechazada.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(correccion.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(VersionDocumento.objects.filter(documento=documento).exists())

    def test_administracion_conserva_capacidad_primera_carga_y_versionado(self):
        capacidad = DocumentoService().obtener_capacidad_carga(
            postulacion=self.pg_postulacion,
            tipo_documento=self.hoja_aprobacion,
            usuario=self.admin_user,
        )
        primera = self.upload_hoja(self.admin_user, "hoja-admin-v1.pdf")
        segunda = self.upload_hoja(self.admin_user, "hoja-admin-v2.pdf")

        self.assertTrue(capacidad["permitida"])
        self.assertEqual(primera.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.pg_postulacion,
            tipo_documento=self.hoja_aprobacion,
        )
        self.assertEqual(documento.versiones.count(), 2)
        self.assertEqual(documento.versiones.filter(subido_por=self.admin_user).count(), 2)


class TestHistoricalDocumentUpload(DocumentoAPITestCase):
    def setUp(self) -> None:
        super().setUp()
        requisito = Requisito.objects.create(
            codigo="PDF",
            nombre="Documento PDF",
            obligatorio=True,
        )
        ModalidadRequisito.objects.create(
            modalidad=self.modalidad,
            requisito=requisito,
            orden=1,
        )
        estado_concluida = EstadoPostulacion.objects.create(codigo="CONCLUIDA", nombre="Concluida")
        self.historico = Postulacion.objects.create(
            codigo="HIST-2022-001",
            estudiante=self.other_student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=estado_concluida,
            vigencia=Postulacion.VigenciaChoices.CERRADA,
            tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
        )

    def historical_upload(self, user, postulacion_id=None, tipo_documento_id=None, file=None):
        self.authenticate_user(user)
        return self.client.post(
            f"/api/v1/postulaciones/{postulacion_id or self.historico.id}/documentos-historicos/subir/",
            {
                "tipo_documento_id": tipo_documento_id or self.tipo_pdf.id,
                "archivo": file or self.create_pdf_file(),
            },
            format="multipart",
        )

    def test_admin_carga_historico_sin_seguimiento_y_reutiliza_versionado(self):
        file = self.create_pdf_file(content=b"%PDF-historico")

        response = self.historical_upload(self.admin_user, file=file)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(postulacion=self.historico, tipo_documento=self.tipo_pdf)
        version = documento.versiones.get()
        self.assertEqual(version.subido_por, self.admin_user)
        self.assertEqual(version.numero_version, 1)
        self.assertEqual(version.hash_sha256, __import__("hashlib").sha256(b"%PDF-historico").hexdigest())
        self.assertFalse(SeguimientoEtapa.objects.filter(postulacion=self.historico).exists())
        self.assertTrue(AuditLog.objects.filter(accion="UPLOAD", modulo="DOCUMENTOS", usuario=self.admin_user).exists())

    def test_admin_obtiene_tipos_historicos_de_la_modalidad(self):
        self.authenticate_user(self.admin_user)

        response = self.client.get(f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/tipos/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [{"id": self.tipo_pdf.id, "codigo": "PDF", "nombre": "Documento PDF"}])

    def test_estudiante_no_puede_consultar_tipos_historicos(self):
        self.authenticate_user(self.student_user)

        response = self.client.get(f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/tipos/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seguimiento_no_puede_consultar_tipos_historicos(self):
        self.authenticate_user(self.admin_user)

        response = self.client.get(f"/api/v1/postulaciones/{self.postulacion.id}/documentos-historicos/tipos/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_postulacion_inexistente_devuelve_404(self):
        self.authenticate_user(self.admin_user)

        response = self.client.get("/api/v1/postulaciones/999999/documentos-historicos/tipos/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_excluye_tipos_y_requisitos_inactivos(self):
        requisito_inactivo = Requisito.objects.create(codigo="INACTIVO_REQ", nombre="Requisito inactivo")
        ModalidadRequisito.objects.create(modalidad=self.modalidad, requisito=requisito_inactivo, orden=2, activo=False)
        tipo_inactivo = TipoDocumento.objects.create(codigo="INACTIVO_REQ", nombre="Tipo inactivo", activo=False)
        requisito_activo_tipo_inactivo = Requisito.objects.create(codigo="TIPO_INACTIVO", nombre="Tipo inactivo")
        ModalidadRequisito.objects.create(modalidad=self.modalidad, requisito=requisito_activo_tipo_inactivo, orden=3)
        TipoDocumento.objects.create(codigo="TIPO_INACTIVO", nombre="Tipo inactivo catalogo", activo=False)
        self.authenticate_user(self.admin_user)

        response = self.client.get(f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/tipos/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["codigo"] for item in response.data], ["PDF"])
        self.assertNotIn(tipo_inactivo.id, [item["id"] for item in response.data])

    def test_modalidad_sin_configuracion_devuelve_lista_vacia(self):
        modalidad_sin_requisitos = Modalidad.objects.create(codigo="MOD_SIN_REQ", nombre="Sin requisitos")
        self.historico.modalidad = modalidad_sin_requisitos
        self.historico.save(update_fields=["modalidad"])
        self.authenticate_user(self.admin_user)

        response = self.client.get(f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/tipos/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_tipo_retornado_por_get_es_aceptado_por_upload_historico(self):
        self.authenticate_user(self.admin_user)
        tipos = self.client.get(f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/tipos/")
        tipo_id = tipos.data[0]["id"]

        response = self.client.post(
            f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/subir/",
            {"tipo_documento_id": tipo_id, "archivo": self.create_pdf_file(content=b"%PDF-consistencia")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_tipo_ajeno_no_aparece_y_upload_lo_rechaza(self):
        ajeno = TipoDocumento.objects.create(codigo="AJENO", nombre="Ajeno", extensiones_permitidas="pdf")
        self.authenticate_user(self.admin_user)
        tipos = self.client.get(f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/tipos/")
        self.assertNotIn(ajeno.id, [item["id"] for item in tipos.data])

        response = self.client.post(
            f"/api/v1/postulaciones/{self.historico.id}/documentos-historicos/subir/",
            {"tipo_documento_id": ajeno.id, "archivo": self.create_pdf_file()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_historico_solo_usa_ruta_historica(self):
        response = self.upload_document(self.admin_user, self.historico.id, self.tipo_pdf.id, self.create_pdf_file())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(DocumentoPostulacion.objects.filter(postulacion=self.historico).exists())

    def test_estudiante_no_puede_cargar_documento_historico(self):
        response = self.historical_upload(self.student_user)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seguimiento_no_puede_usar_ruta_historica(self):
        response = self.historical_upload(self.admin_user, postulacion_id=self.postulacion.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_ordinario_seguimiento_sin_contexto_continua_rechazado(self):
        self.postulacion.seguimientos_etapa.all().update(activo=False)

        response = self.upload_document(self.admin_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contexto académico válido", str(response.data))

    def test_tipo_no_asociado_a_modalidad_es_rechazado(self):
        otro_tipo = TipoDocumento.objects.create(codigo="OTRO", nombre="Otro", extensiones_permitidas="pdf")

        response = self.historical_upload(self.admin_user, tipo_documento_id=otro_tipo.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_archivo_invalido_conserva_validacion(self):
        response = self.historical_upload(
            self.admin_user,
            file=SimpleUploadedFile("invalido.pdf", b"NO ES PDF", content_type="application/pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("PDF", str(response.data))


class TestPerfilObservationDocument(DocumentoAPITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.test_follow.activo = False
        self.test_follow.save(update_fields=["activo"])
        self.other_test_follow.activo = False
        self.other_test_follow.save(update_fields=["activo"])

        self.modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado")
        self.postulacion.modalidad = self.modalidad
        self.postulacion.save(update_fields=["modalidad"])
        self.other_postulacion.modalidad = self.modalidad
        self.other_postulacion.save(update_fields=["modalidad"])

        profile_stage = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="PERFIL_PROYECTO", nombre="Perfil de Proyecto", orden=1, origen_normativo="Prueba",
        )
        private_stage = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="DEFENSA_PRIVADA", nombre="Defensa Privada", orden=3, origen_normativo="Prueba",
        )
        public_stage = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="DEFENSA_PUBLICA", nombre="Defensa Pública", orden=4, origen_normativo="Prueba",
        )
        document_stage = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="DOCUMENTO_FINAL", nombre="Documento Final", orden=2, origen_normativo="Prueba",
        )
        self.profile_follow = SeguimientoEtapa.objects.create(postulacion=self.postulacion, etapa=profile_stage, estado="APROBADA")
        other_profile_follow = SeguimientoEtapa.objects.create(postulacion=self.other_postulacion, etapa=profile_stage, estado="APROBADA")
        SeguimientoEtapa.objects.create(postulacion=self.postulacion, etapa=document_stage, estado="EN_PROCESO")
        private_follow = SeguimientoEtapa.objects.create(postulacion=self.postulacion, etapa=private_stage, estado="PENDIENTE")
        public_follow = SeguimientoEtapa.objects.create(postulacion=self.postulacion, etapa=public_stage, estado="PENDIENTE")
        self.profile_event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=self.profile_follow,
            tipo_evento="DEFENSA_PERFIL", estado="FINALIZADA", fecha_programada="2026-06-01T10:00:00Z",
            fecha_fin_real="2026-06-01T11:00:00Z", lugar="Sala", programado_por=self.admin_user,
        )
        self.private_event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=private_follow,
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", fecha_programada="2026-06-02T10:00:00Z",
            fecha_fin_real="2026-06-02T11:00:00Z", lugar="Sala", programado_por=self.admin_user,
        )
        self.public_event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public_follow,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", fecha_programada="2026-06-03T10:00:00Z",
            fecha_fin_real="2026-06-03T11:00:00Z", lugar="Sala", programado_por=self.admin_user,
        )
        self.other_profile_event = EventoDefensa.objects.create(
            postulacion=self.other_postulacion, seguimiento_etapa=other_profile_follow,
            tipo_evento="DEFENSA_PERFIL", estado="FINALIZADA", fecha_programada="2026-06-04T10:00:00Z",
            fecha_fin_real="2026-06-04T11:00:00Z", lugar="Sala", programado_por=self.admin_user,
        )
        self.observation_type = TipoDocumento.objects.create(
            codigo="OBSERVACIONES_DEFENSA_PERFIL", nombre="Hoja de observaciones de Defensa de Perfil",
            extensiones_permitidas="pdf", permite_multiple_version=True,
        )

    def upload_observation(self, event_id, user=None, post_id=None, name="observaciones.pdf"):
        self.authenticate_user(user or self.admin_user)
        payload = {
            "postulacion_id": post_id or self.postulacion.id,
            "tipo_documento_id": self.observation_type.id,
            "archivo": self.create_pdf_file(name=name),
        }
        if event_id is not None:
            payload["evento_defensa_id"] = event_id
        return self.client.post(
            "/api/v1/documentos/documentos/subir/",
            payload,
            format="multipart",
        )

    def test_admin_carga_hoja_vinculada_a_perfil_finalizado_y_versiona(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            response = self.upload_observation(self.profile_event.id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(tipo_documento=self.observation_type)
        self.assertEqual(documento.evento_defensa_id, self.profile_event.id)
        self.assertEqual(documento.estado, self.estado_apr)
        self.assertIsNotNone(documento.fecha_revision)
        self.assertEqual(VersionDocumento.objects.filter(documento=documento).count(), 1)
        self.assertEqual(
            list(AuditLog.objects.filter(usuario=self.admin_user, modulo="DOCUMENTOS")
                 .order_by("id").values_list("accion", flat=True)),
            ["UPLOAD", "APPROVE"],
        )
        self.assertEqual(
            set(Notificacion.objects.filter(postulacion=self.postulacion).values_list("tipo", flat=True)),
            {"DOCUMENTO_SUBIDO", "DOCUMENTO_APROBADO"},
        )
        self.profile_event.refresh_from_db()
        self.profile_follow.refresh_from_db()
        self.assertEqual(self.profile_event.estado, "FINALIZADA")
        self.assertEqual(self.profile_follow.estado, "APROBADA")
        self.assertEqual(self.profile_event.participantes.count(), 0)
        self.assertEqual(EvaluacionDefensa.objects.filter(evento=self.profile_event).count(), 0)

        with self.captureOnCommitCallbacks(execute=True):
            second = self.upload_observation(self.profile_event.id, name="observaciones-v2.pdf")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VersionDocumento.objects.filter(documento=documento).count(), 2)
        self.assertEqual(VersionDocumento.objects.filter(documento=documento, es_version_actual=True).count(), 1)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, self.estado_env)
        self.assertIsNone(documento.fecha_revision)
        self.assertEqual(
            list(AuditLog.objects.filter(usuario=self.admin_user, modulo="DOCUMENTOS")
                 .order_by("id").values_list("accion", flat=True)),
            ["UPLOAD", "APPROVE", "UPLOAD"],
        )
        self.assertEqual(
            set(Notificacion.objects.filter(postulacion=self.postulacion).values_list("tipo", flat=True)),
            {"DOCUMENTO_SUBIDO", "DOCUMENTO_APROBADO", "DOCUMENTO_NUEVA_VERSION"},
        )

    def test_rechaza_vinculos_de_privada_publica_y_otra_postulacion(self) -> None:
        for event_id in (None, self.private_event.id, self.public_event.id, self.other_profile_event.id):
            with self.subTest(event_id=event_id):
                response = self.upload_observation(event_id)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_sin_autorizacion_administrativa_no_carga_ni_autoaprueba(self) -> None:
        teacher = User.objects.create_user(
            username="docente_sin_permiso_hoja",
            role=self.teacher_role,
        )

        response = self.upload_observation(self.profile_event.id, user=teacher)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            DocumentoPostulacion.objects.filter(
                postulacion=self.postulacion,
                tipo_documento=self.observation_type,
            ).exists()
        )
        self.assertFalse(Notificacion.objects.filter(postulacion=self.postulacion).exists())

    def test_fallo_de_autoaprobacion_revierte_registros_y_elimina_archivo(self) -> None:
        with patch.object(
            DocumentoService,
            "aprobar_documento",
            side_effect=RuntimeError("Fallo simulado al aprobar la Hoja."),
        ):
            with self.assertRaisesMessage(RuntimeError, "Fallo simulado"):
                DocumentoService().subir_documento(
                    postulacion=self.postulacion,
                    tipo_documento=self.observation_type,
                    archivo=self.create_pdf_file(name="observaciones-fallo.pdf"),
                    usuario=self.admin_user,
                    evento_defensa=self.profile_event,
                )

        self.assertFalse(
            DocumentoPostulacion.objects.filter(
                postulacion=self.postulacion,
                tipo_documento=self.observation_type,
            ).exists()
        )
        self.assertFalse(VersionDocumento.objects.filter(documento__postulacion=self.postulacion).exists())
        self.assertFalse(AuditLog.objects.filter(usuario=self.admin_user, modulo="DOCUMENTOS").exists())
        self.assertFalse(Notificacion.objects.filter(postulacion=self.postulacion).exists())
        self.assertEqual(list((self._tmp_media / "documentos" / "versiones").iterdir()), [])

    def test_estudiante_no_carga_pero_propietario_descarga_y_ajeno_no_accede(self) -> None:
        denied = self.upload_observation(self.profile_event.id, user=self.student_user)
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            DocumentoPostulacion.objects.filter(
                postulacion=self.postulacion,
                tipo_documento=self.observation_type,
            ).exists()
        )
        self.upload_observation(self.profile_event.id)
        version = VersionDocumento.objects.get(documento__tipo_documento=self.observation_type)

        self.authenticate_user(self.student_user)
        downloaded = self.client.get(f"/api/v1/documentos/versiones/{version.id}/descargar/")
        self.assertEqual(downloaded.status_code, status.HTTP_200_OK)

        self.authenticate_user(self.other_student)
        self.assertEqual(self.client.get(f"/api/v1/documentos/versiones/{version.id}/descargar/").status_code, status.HTTP_404_NOT_FOUND)

    def test_acta_defensa_conserva_restriccion_a_defensa_publica(self) -> None:
        acta_type = TipoDocumento.objects.create(codigo="ACTA_DEFENSA", nombre="Acta de Defensa")
        self.authenticate_user(self.admin_user)
        response = self.client.post(
            "/api/v1/documentos/documentos/subir/",
            {"postulacion_id": self.postulacion.id, "tipo_documento_id": acta_type.id, "evento_defensa_id": self.profile_event.id, "archivo": self.create_pdf_file("acta.pdf")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(STORAGES={
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
})
class TestActaTrabajoDirigidoAutoApproval(DocumentoAPITestCase):
    def setUp(self):
        super().setUp()
        self.test_follow.activo = False
        self.test_follow.save(update_fields=["activo"])
        self.modalidad = Modalidad.objects.create(codigo="TRABAJO_DIRIGIDO", nombre="Trabajo Dirigido")
        self.postulacion.modalidad = self.modalidad
        self.postulacion.save(update_fields=["modalidad"])
        stage = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="DEFENSA_PUBLICA", nombre="Defensa Pública",
            orden=1, origen_normativo="Prueba",
        )
        self.public_follow = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=stage, estado="APROBADA",
        )
        self.public_event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=self.public_follow,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA",
            fecha_programada="2026-06-01T10:00:00Z", fecha_fin_real="2026-06-01T11:00:00Z",
            lugar="Sala", programado_por=self.admin_user,
        )
        self.acta_type = TipoDocumento.objects.create(
            codigo="ACTA_DEFENSA_TD", nombre="Acta de Defensa de Trabajo Dirigido",
            permite_multiple_version=True,
        )
        # La autorización proviene del rol, no de los flags de Django Admin.
        self.admin_user.is_superuser = False
        self.admin_user.is_staff = False
        self.admin_user.save(update_fields=["is_superuser", "is_staff"])

    def upload_acta(self, user=None):
        self.authenticate_user(user or self.admin_user)
        return self.client.post("/api/v1/documentos/documentos/subir/", {
            "postulacion_id": self.postulacion.pk,
            "tipo_documento_id": self.acta_type.pk,
            "evento_defensa_id": self.public_event.pk,
            "archivo": self.create_pdf_file("acta-td.pdf"),
        }, format="multipart")

    def test_primera_carga_autoaprueba_con_auditoria_sin_cambiar_defensa(self):
        with patch("apps.documentos.services.publish_domain_event") as publish:
            response = self.upload_acta()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(tipo_documento=self.acta_type)
        self.assertEqual(documento.estado.codigo, "APR")
        self.assertIsNotNone(documento.fecha_revision)
        self.assertEqual(documento.evento_defensa_id, self.public_event.pk)
        self.assertEqual(list(AuditLog.objects.filter(modulo="DOCUMENTOS").order_by("id")
                              .values_list("accion", flat=True)), ["UPLOAD", "APPROVE"])
        self.assertEqual([call.args[0] for call in publish.call_args_list],
                         ["DOCUMENTO_SUBIDO", "DOCUMENTO_APROBADO"])
        self.public_event.refresh_from_db()
        self.public_follow.refresh_from_db()
        self.assertEqual(self.public_event.estado, "FINALIZADA")
        self.assertEqual(self.public_follow.estado, "APROBADA")
        self.assertFalse(EvaluacionDefensa.objects.filter(evento=self.public_event).exists())

    def test_segunda_version_requiere_aprobacion_manual(self):
        self.assertEqual(self.upload_acta().status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.upload_acta().status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(tipo_documento=self.acta_type)
        self.assertEqual(documento.estado.codigo, "ENV")
        self.assertIsNone(documento.fecha_revision)
        self.assertEqual(documento.versiones.count(), 2)
        self.assertEqual(documento.versiones.filter(es_version_actual=True).count(), 1)
        self.assertEqual(AuditLog.objects.filter(modulo="DOCUMENTOS", accion="APPROVE").count(), 1)
        response = self.client.post(f"/api/v1/documentos/documentos/{documento.pk}/aprobar/",
                                    {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documento.refresh_from_db()
        self.assertEqual(documento.estado.codigo, "APR")

    def test_is_staff_sin_rol_administrativo_no_autoaprueba(self):
        self.student_user.is_staff = True
        self.student_user.save(update_fields=["is_staff"])
        response = self.upload_acta(self.student_user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(tipo_documento=self.acta_type)
        self.assertEqual(documento.estado.codigo, "ENV")
        self.assertIsNone(documento.fecha_revision)
        self.assertFalse(AuditLog.objects.filter(modulo="DOCUMENTOS", accion="APPROVE").exists())
        response = self.client.post(f"/api/v1/documentos/documentos/{documento.pk}/aprobar/",
                                    {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_fallo_de_aprobacion_revierte_carga_auditoria_y_archivo(self):
        from django.core.files.storage import default_storage

        approve = DocumentoService.aprobar_documento

        def fail_after_approval(service, *args, **kwargs):
            approve(service, *args, **kwargs)
            raise RuntimeError("fallo después de aprobar acta")

        with patch.object(DocumentoService, "aprobar_documento", fail_after_approval), \
                self.assertRaisesMessage(RuntimeError, "fallo después de aprobar acta"):
            self.upload_acta()
        self.assertFalse(DocumentoPostulacion.objects.filter(tipo_documento=self.acta_type).exists())
        self.assertFalse(VersionDocumento.objects.exists())
        self.assertFalse(AuditLog.objects.filter(modulo="DOCUMENTOS").exists())
        self.assertEqual(default_storage.listdir("documentos/versiones")[1], [])

    def test_otras_actas_especiales_conservan_aprobacion_manual(self):
        self.acta_type.codigo = "ACTA_DEFENSA"
        self.acta_type.save(update_fields=["codigo"])
        self.assertEqual(self.upload_acta().status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(tipo_documento=self.acta_type)
        self.assertEqual(documento.estado.codigo, "ENV")
        self.assertIsNone(documento.fecha_revision)
        response = self.client.post(f"/api/v1/documentos/documentos/{documento.pk}/aprobar/",
                                    {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_acta_td_no_se_habilita_en_proyecto_ni_tesis(self):
        for codigo in ("PROYECTO_GRADO", "TESIS_GRADO"):
            with self.subTest(modalidad=codigo):
                self.modalidad.codigo = codigo
                self.modalidad.save(update_fields=["codigo"])
                response = self.upload_acta()
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertFalse(DocumentoPostulacion.objects.filter(tipo_documento=self.acta_type).exists())
                self.assertFalse(AuditLog.objects.filter(modulo="DOCUMENTOS").exists())


class TestActaTesisAutoApproval(DocumentoAPITestCase):
    def setUp(self):
        super().setUp()
        self.test_follow.activo = False
        self.test_follow.save(update_fields=["activo"])
        self.modalidad = Modalidad.objects.create(codigo="TESIS_GRADO", nombre="Tesis")
        self.postulacion.modalidad = self.modalidad
        self.postulacion.save(update_fields=["modalidad"])
        stage = EtapaModalidad.objects.create(modalidad=self.modalidad, codigo="DEFENSA_PUBLICA",
            nombre="Defensa Pública", orden=1, origen_normativo="Prueba")
        self.public_follow = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=stage, estado="APROBADA")
        self.public_event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=self.public_follow,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA",
            fecha_programada="2026-06-01T10:00:00Z", fecha_fin_real="2026-06-01T11:00:00Z",
            lugar="Sala", programado_por=self.admin_user)
        self.acta_type = TipoDocumento.objects.create(
            codigo="ACTA_DEFENSA", nombre="Acta Tesis", permite_multiple_version=True)
        self.admin_user.is_superuser = False
        self.admin_user.is_staff = False
        self.admin_user.save(update_fields=["is_superuser", "is_staff"])
        # Los gates reales se cubren en tests_tesis_grado.
        gate = patch("apps.modalidades.tesis_grado.TesisGradoPolicy.validar_aprobacion_etapa")
        self.validate = gate.start()
        self.addCleanup(gate.stop)

    upload_acta = TestActaTrabajoDirigidoAutoApproval.upload_acta
    test_version_posterior = TestActaTrabajoDirigidoAutoApproval.test_segunda_version_requiere_aprobacion_manual
    test_estudiante = TestActaTrabajoDirigidoAutoApproval.test_is_staff_sin_rol_administrativo_no_autoaprueba
    test_rollback = TestActaTrabajoDirigidoAutoApproval.test_fallo_de_aprobacion_revierte_carga_auditoria_y_archivo

    def assert_enviado(self):
        self.assertEqual(self.upload_acta().status_code, 201)
        doc = DocumentoPostulacion.objects.get(tipo_documento=self.acta_type)
        self.assertEqual(doc.estado.codigo, "ENV")
        self.assertIsNone(doc.fecha_revision)
        self.assertFalse(AuditLog.objects.filter(accion="APPROVE").exists())

    def test_admin_autoaprueba_con_auditoria_y_notificaciones(self):
        with patch("apps.documentos.services.publish_domain_event") as publish:
            self.assertEqual(self.upload_acta().status_code, 201)
        doc = DocumentoPostulacion.objects.get(tipo_documento=self.acta_type)
        self.assertEqual(doc.estado.codigo, "APR")
        self.assertIsNotNone(doc.fecha_revision)
        self.assertEqual(doc.versiones.get().subido_por, self.admin_user)
        audits = AuditLog.objects.filter(modulo="DOCUMENTOS").order_by("pk")
        self.assertEqual(list(audits.values_list("accion", flat=True)), ["UPLOAD", "APPROVE"])
        self.assertEqual(list(audits.values_list("usuario_id", flat=True)), [self.admin_user.pk] * 2)
        self.assertEqual([c.args[0] for c in publish.call_args_list], ["DOCUMENTO_SUBIDO", "DOCUMENTO_APROBADO"])
        self.validate.assert_called_once()
        self.public_follow.refresh_from_db()
        self.public_event.refresh_from_db()
        self.postulacion.refresh_from_db()
        self.assertEqual(self.public_follow.estado, "APROBADA")
        self.assertEqual(self.public_event.estado, "FINALIZADA")
        self.assertNotEqual(self.postulacion.estado_actual.codigo, "CONCLUIDA")

    def test_seguimiento_no_aprobado(self):
        for estado in ("PENDIENTE", "RECHAZADA"):
            with self.subTest(estado=estado):
                self.public_follow.estado = estado
                self.public_follow.save(update_fields=["estado"])
                self.assert_enviado()

    def test_intento_anterior(self):
        SeguimientoEtapa.objects.create(postulacion=self.postulacion, etapa=self.public_follow.etapa,
                                       numero_intento=2, estado="APROBADA")
        self.assert_enviado()

    def test_intento_incompatible(self):
        self.public_event.numero_intento = 2
        self.public_event.save(update_fields=["numero_intento"])
        self.assert_enviado()

    def test_seguimiento_ambiguo(self):
        other = Modalidad.objects.create(codigo="AMBIGUA", nombre="Ambigua")
        stage = EtapaModalidad.objects.create(modalidad=other, codigo="DEFENSA_PUBLICA",
                                             nombre="Duplicada", orden=1, origen_normativo="Prueba")
        # Datos inconsistentes heredados: el guard debe ser conservador aun
        # cuando una importación haya omitido la validación del modelo.
        SeguimientoEtapa.objects.bulk_create([
            SeguimientoEtapa(postulacion=self.postulacion, etapa=stage, estado="APROBADA")])
        self.assert_enviado()

    def test_historico(self):
        self.postulacion.tipo_registro = "HISTORICO"
        self.postulacion.save(update_fields=["tipo_registro"])
        self.assert_enviado()

    def test_vinculos_invalidos_conservan_rechazo(self):
        self.other_postulacion.modalidad = self.modalidad
        self.other_postulacion.save(update_fields=["modalidad"])
        other_public = SeguimientoEtapa.objects.create(postulacion=self.other_postulacion,
            etapa=self.public_follow.etapa, estado="APROBADA")
        for field, value in (("estado", "PROGRAMADA"), ("activo", False),
                             ("postulacion", self.other_postulacion)):
            with self.subTest(field=field):
                previous = getattr(self.public_event, field)
                if field == "postulacion":
                    self.public_event.seguimiento_etapa = other_public
                setattr(self.public_event, field, value)
                self.public_event.save(update_fields=[field, "seguimiento_etapa"])
                self.assertEqual(self.upload_acta().status_code, 400)
                self.assertFalse(DocumentoPostulacion.objects.filter(tipo_documento=self.acta_type).exists())
                setattr(self.public_event, field, previous)
                self.public_event.seguimiento_etapa = self.public_follow
                self.public_event.save(update_fields=[field, "seguimiento_etapa"])

    def test_usuario_ajeno(self):
        self.assertEqual(self.upload_acta(self.other_student).status_code, 403)

    def test_proyecto_conserva_aprobacion_manual(self):
        self.modalidad.codigo = "PROYECTO_GRADO"
        self.modalidad.save(update_fields=["codigo"])
        self.assert_enviado()

    def test_documento_existente_sin_version_no_autoaprueba(self):
        DocumentoPostulacion.objects.create(postulacion=self.postulacion,
            tipo_documento=self.acta_type, estado=self.estado_env, evento_defensa=self.public_event)
        self.assert_enviado()


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
        del response

    def test_actor_asignado_descarga_dentro_de_su_alcance(self) -> None:
        version = self._create_version()
        actor = User.objects.create_user(username="actor-descarga", role=self.teacher_role)
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=actor,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            designado_por=self.admin_user,
        )

        response = self._download(version, actor)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        del response

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

    def test_subida_ordinaria_rechaza_modalidad_sin_policy(self) -> None:
        self.modalidad.codigo = "MOD_SIN_POLICY"
        self.modalidad.save(update_fields=["codigo"])
        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            DocumentoPostulacion.all_objects.filter(
                postulacion=self.postulacion,
                tipo_documento=self.tipo_pdf,
            ).exists()
        )

    def test_subida_ordinaria_rechaza_postulacion_sin_contexto_de_etapa(self) -> None:
        self.test_follow.activo = False
        self.test_follow.save(update_fields=["activo"])

        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            DocumentoPostulacion.all_objects.filter(
                postulacion=self.postulacion,
                tipo_documento=self.tipo_pdf,
            ).exists()
        )

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

    def test_admin_autoriza_carga_inicial_y_la_autoaprueba_con_trazabilidad(self) -> None:
        with patch("apps.documentos.services.publish_domain_event") as publish:
            response = self.upload_document(
                self.admin_user,
                self.postulacion.id,
                self.tipo_pdf.id,
                self.create_pdf_file(name="carga-admin.pdf"),
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        version = VersionDocumento.objects.get(documento=documento)
        self.assertEqual(documento.estado, self.estado_apr)
        self.assertIsNotNone(documento.fecha_revision)
        self.assertEqual(version.numero_version, 1)
        self.assertEqual(version.subido_por, self.admin_user)
        self.assertEqual(
            list(
                AuditLog.objects.filter(usuario=self.admin_user, modulo="DOCUMENTOS")
                .order_by("id")
                .values_list("accion", flat=True)
            ),
            ["UPLOAD", "APPROVE"],
        )
        self.assertEqual(
            [call.args[0] for call in publish.call_args_list],
            ["DOCUMENTO_SUBIDO", "DOCUMENTO_APROBADO"],
        )
        self.test_follow.refresh_from_db()
        self.assertEqual(self.test_follow.estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)

    def test_superusuario_autoriza_carga_inicial_y_la_autoaprueba(self) -> None:
        superusuario = User.objects.create_user(
            username="superuser-carga",
            role=self.teacher_role,
            is_superuser=True,
        )

        response = self.upload_document(
            superusuario,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="carga-superuser.pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        self.assertEqual(documento.estado, self.estado_apr)
        self.assertIsNotNone(documento.fecha_revision)

    def test_is_staff_sin_autorizacion_real_no_autoaprueba(self) -> None:
        self.student_user.is_staff = True
        self.student_user.save(update_fields=["is_staff"])

        response = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="carga-staff-estudiante.pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        self.assertEqual(documento.estado, self.estado_env)
        self.assertIsNone(documento.fecha_revision)
        self.assertFalse(
            AuditLog.objects.filter(usuario=self.student_user, accion="APPROVE").exists()
        )

    def test_segunda_version_administrativa_permanece_enviada(self) -> None:
        first = self.upload_document(
            self.admin_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(),
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.upload_document(
            self.admin_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="documento-v2.pdf"),
        )

        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        self.assertEqual(documento.estado, self.estado_env)
        self.assertIsNone(documento.fecha_revision)
        self.assertEqual(documento.versiones.count(), 2)
        self.assertEqual(
            AuditLog.objects.filter(usuario=self.admin_user, accion="APPROVE").count(),
            1,
        )

    def test_version_administrativa_posterior_a_rechazo_permanece_enviada(self) -> None:
        self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(),
        )
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
        )
        self.authenticate_user(self.admin_user)
        rejected = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
            {"motivo": "Corregir"},
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_200_OK)

        response = self.upload_document(
            self.admin_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="correccion-admin.pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, self.estado_env)
        self.assertIsNone(documento.fecha_revision)

    def test_fallo_de_autoaprobacion_revierte_bd_y_elimina_archivo(self) -> None:
        with patch.object(
            DocumentoService,
            "aprobar_documento",
            side_effect=RuntimeError("fallo de autoaprobacion"),
        ):
            with self.assertRaises(RuntimeError):
                self.upload_document(
                    self.admin_user,
                    self.postulacion.id,
                    self.tipo_pdf.id,
                    self.create_pdf_file(name="autoaprobacion-fallida.pdf"),
                )

        self.assertFalse(
            DocumentoPostulacion.all_objects.filter(
                postulacion=self.postulacion,
                tipo_documento=self.tipo_pdf,
            ).exists()
        )
        self.assertFalse(VersionDocumento.all_objects.exists())
        self.assertFalse(AuditLog.objects.filter(modulo="DOCUMENTOS").exists())
        self.assertEqual(list(self._tmp_media.rglob("*.pdf")), [])

    def test_nueva_version_actualiza_estados_de_version_y_no_duplica_documento(self) -> None:
        """Una segunda subida debe crear la versión 2 sin duplicar el documento."""
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        documento.estado = self.estado_rec
        documento.requiere_correccion = True
        documento.save(update_fields=["estado", "requiere_correccion"])
        response = self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(name="documento_v2.pdf"))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(DocumentoPostulacion.objects.filter(postulacion=self.postulacion, tipo_documento=self.tipo_pdf).count(), 1)

        versiones = VersionDocumento.objects.filter(documento=documento).order_by("numero_version")
        self.assertEqual(versiones.count(), 2)
        self.assertFalse(versiones[0].es_version_actual)
        self.assertTrue(versiones[1].es_version_actual)

    def test_fallo_posterior_al_guardado_revierte_registros_y_elimina_solo_archivo_nuevo(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        documento.estado = self.estado_rec
        documento.requiere_correccion = True
        documento.save(update_fields=["estado", "requiere_correccion"])
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

    def test_estudiante_no_puede_subir_segunda_version_enviada_sin_correccion(self) -> None:
        first = self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id,
            self.create_pdf_file(name="documento-v2.pdf"),
        )

        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pendiente de revisión", str(second.data))

    def test_estudiante_puede_subir_nueva_version_rechazada(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        documento.estado = self.estado_rec
        documento.requiere_correccion = True
        documento.save(update_fields=["estado", "requiere_correccion"])

        response = self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id,
            self.create_pdf_file(name="corregido.pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_estudiante_no_puede_subir_aprobado_sin_correccion(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        documento.estado = self.estado_apr
        documento.requiere_correccion = False
        documento.save(update_fields=["estado", "requiere_correccion"])

        response = self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id,
            self.create_pdf_file(name="aprobado-v2.pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("aprobado", str(response.data))

    def test_estudiante_no_puede_subir_aprobado_con_flag_no_autorizado(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion, tipo_documento=self.tipo_pdf)
        documento.estado = self.estado_apr
        documento.requiere_correccion = True
        documento.save(update_fields=["estado", "requiere_correccion"])

        capacidad = DocumentoService().obtener_capacidad_carga(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_pdf,
            usuario=self.student_user,
            documento=documento,
        )
        response = self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id,
            self.create_pdf_file(name="aprobado-inconsistente-v2.pdf"),
        )

        self.assertEqual(capacidad["codigo"], "DOCUMENTO_APROBADO")
        self.assertFalse(capacidad["permitida"])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_conserva_nueva_version_sobre_documento_aprobado(self) -> None:
        self.upload_document(self.admin_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())

        response = self.upload_document(
            self.admin_user, self.postulacion.id, self.tipo_pdf.id,
            self.create_pdf_file(name="admin-v2.pdf"),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_documentos_aplicables_expone_capacidad_sin_ocultar_el_tipo(self) -> None:
        self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.authenticate_user(self.student_user)

        response = self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["documentos_aplicables"]), 1)
        item = response.data["documentos_aplicables"][0]
        self.assertEqual(item["codigo"], "PDF")
        self.assertEqual(item["capacidad_carga"]["codigo"], "ESPERANDO_REVISION")
        self.assertFalse(item["capacidad_carga"]["permitida"])

    def test_documento_inactivo_se_anuncia_y_rechaza_sin_reactivarlo_ni_duplicarlo(self) -> None:
        first = self.upload_document(
            self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file(),
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(
            postulacion=self.postulacion, tipo_documento=self.tipo_pdf,
        )
        documento.activo = False
        documento.save(update_fields=["activo"])

        self.authenticate_user(self.student_user)
        applicable = self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/"
        )
        item = applicable.data["documentos_aplicables"][0]
        self.assertEqual(item["capacidad_carga"]["codigo"], "DOCUMENTO_INACTIVO")
        self.assertFalse(item["capacidad_carga"]["permitida"])

        for user, filename in (
            (self.student_user, "inactivo-estudiante.pdf"),
            (self.admin_user, "inactivo-admin.pdf"),
        ):
            with self.subTest(user=user.username):
                response = self.upload_document(
                    user, self.postulacion.id, self.tipo_pdf.id,
                    self.create_pdf_file(name=filename),
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        documento.refresh_from_db()
        self.assertFalse(documento.activo)
        self.assertEqual(
            DocumentoPostulacion.all_objects.filter(
                postulacion=self.postulacion, tipo_documento=self.tipo_pdf,
            ).count(),
            1,
        )
        self.assertEqual(VersionDocumento.all_objects.filter(documento=documento).count(), 1)

    def test_fallo_en_primera_version_no_deja_documento_ni_archivo(self) -> None:
        with patch("apps.documentos.services.DocumentoService._registrar_auditoria", side_effect=RuntimeError("fallo posterior")):
            with self.assertRaises(RuntimeError):
                self.upload_document(self.student_user, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertFalse(DocumentoPostulacion.all_objects.filter(postulacion=self.postulacion, tipo_documento=self.tipo_pdf).exists())
        self.assertEqual(list(self._tmp_media.rglob("*.pdf")), [])

    def test_staff_puede_subir_y_actor_asignado_no_staff_no_puede(self) -> None:
        staff = User.objects.create_user(username="staff-carga", is_staff=True, role=self.admin_role)
        response = self.upload_document(staff, self.postulacion.id, self.tipo_pdf.id, self.create_pdf_file())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        tipo_otro = TipoDocumento.objects.create(
            codigo="PDF2", nombre="Segundo PDF", extensiones_permitidas="pdf", tamano_maximo_mb=1,
        )
        actor = User.objects.create_user(username="actor-asignado", role=self.teacher_role)
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
        active = User.objects.create_user(username="revisor-activo", role=self.teacher_role)
        historical = User.objects.create_user(username="revisor-historico", role=self.teacher_role)
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
        staff = User.objects.create_user(username="staff-documentos", is_staff=True, role=self.admin_role)
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
        primera = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(),
        )
        self.assertEqual(primera.status_code, status.HTTP_201_CREATED)
        documento = DocumentoPostulacion.objects.get(postulacion=self.postulacion)
        for index in range(1, 22):
            self.authenticate_user(self.admin_user)
            rechazada = self.client.post(
                f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
                {"motivo": f"Corrección requerida para la versión {index + 1}"},
                format="json",
            )
            self.assertEqual(rechazada.status_code, status.HTTP_200_OK)
            correccion = self.upload_document(
                self.student_user,
                self.postulacion.id,
                self.tipo_pdf.id,
                self.create_pdf_file(name=f"v{index + 1}.pdf"),
            )
            self.assertEqual(correccion.status_code, status.HTTP_201_CREATED)

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
        self.authenticate_user(self.admin_user)
        rechazo = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/rechazar/",
            {"motivo": "Se requiere una corrección antes de consultar el historial."},
            format="json",
        )
        self.assertEqual(rechazo.status_code, status.HTTP_200_OK)
        correccion = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="documento_v2.pdf"),
        )
        self.assertEqual(correccion.status_code, status.HTTP_201_CREATED)

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
        actor = User.objects.create_user(username="actor-revisor", role=self.teacher_role)
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

        superuser = User.objects.create_user(username="super-revisor", is_superuser=True, role=self.admin_role)
        self.authenticate_user(superuser)
        observado = self.client.post(
            f"/api/v1/documentos/documentos/{documento.id}/observar/", {"comentario": "Revisión autorizada"}, format="json",
        )
        self.assertEqual(observado.status_code, status.HTTP_201_CREATED)

        correccion = self.upload_document(
            self.student_user,
            self.postulacion.id,
            self.tipo_pdf.id,
            self.create_pdf_file(name="documento-v2.pdf"),
        )
        self.assertEqual(correccion.status_code, status.HTTP_201_CREATED)

        staff = User.objects.create_user(username="staff-revisor", is_staff=True, role=self.admin_role)
        self.authenticate_user(staff)
        aprobado = self.client.post(f"/api/v1/documentos/documentos/{documento.id}/aprobar/", {}, format="json")
        self.assertEqual(aprobado.status_code, status.HTTP_200_OK)
